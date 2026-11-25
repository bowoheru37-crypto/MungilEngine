package com.example.engine

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

class GameWorld(
    val level: Int,
    val def: LevelDefinition,
    val genreId: String,
    val simKind: GenreSimulationKind,
    val customCharacter: GeneratedCharacterSpec? = null
) {
    val player = SimPlayer(
        x = def.playerSpawnX,
        y = def.playerSpawnY,
        w = if (simKind == GenreSimulationKind.SHOOTER) 16f else 26f,
        h = if (simKind == GenreSimulationKind.SHOOTER) 16f else 36f,
        hp = 100 + (customCharacter?.hpBonus ?: 0),
        maxHp = 100 + (customCharacter?.hpBonus ?: 0)
    )
    val enemies = def.enemies.mapIndexed { idx, e ->
        SimEnemy(
            id = idx,
            archetype = e.archetype,
            x = e.x,
            y = e.y,
            w = if (e.archetype == "boss_kala") 46f else if (e.archetype == "sentinel") 34f else 28f,
            h = if (e.archetype == "boss_kala") 56f else if (e.archetype == "sentinel") 42f else 28f,
            patrolMinX = e.patrolMinX,
            patrolMaxX = e.patrolMaxX,
            hp = e.hp,
            maxHp = e.hp
        )
    }.toMutableList()

    val shards = def.shards.mapIndexed { i, p -> SimPickup(i, p.first, p.second) }.toMutableList()
    val coins = def.coins.mapIndexed { i, p -> SimPickup(i, p.first, p.second) }.toMutableList()
    val switches = def.switches.mapIndexed { i, p -> SimSwitch(i, p.first, p.second) }.toMutableList()
    val projectiles = mutableListOf<SimProjectile>()
    val obstacles: List<SimRect> = if (simKind == GenreSimulationKind.TOPDOWN) {
        listOf(
            SimRect(240f, 160f, 56f, 56f),
            SimRect(420f, 220f, 64f, 48f),
            SimRect(620f, 140f, 56f, 64f),
            SimRect(780f, 230f, 54f, 54f)
        )
    } else emptyList()
    val beatNotes = if (simKind == GenreSimulationKind.RHYTHM) {
        MutableList(8) { i -> SimBeatNote(i, 360f + i * 110f, i % 3) }
    } else mutableListOf()
    val turrets = mutableListOf<SimTurret>()
    val particles = ParticlePool(160)
    val spatial = SpatialHashGrid(32f)
    val companion = AiCompanionState(x = def.playerSpawnX - 28f, y = def.playerSpawnY - 26f)

    var lane = 1
    var trackDist = 0f
    var speedKmh = 120f
    var comboCount = 0
    var waveNumber = 1
    var doubleJumpsLeft = if (genreId == "metroidvania") 1 else 0
    var vnStep = 0
    var status = "playing"
    var time = 0f
    var cameraX = 0f
    var shakeTimer = 0f
    var hitstopTimer = 0f
    var coinsTotal = 0
    var shardsTotal = 0
    var kills = 0
    var score = 0
    var potions = 2
    var gateUnlocked = false
    var nextProjId = 1
    var aiTickAccum = 0f
    var laneSwitchCd = 0f
}

object GameSimulation {
    fun createLevelWorld(
        level: Int,
        customChar: GeneratedCharacterSpec? = null,
        genreId: String = "platformer"
    ): GameWorld {
        val lvl = level.coerceIn(1, 3)
        val def = GameSimulationData.LEVEL_DEFINITIONS.getValue(lvl)
        val simKind = GameSimulationData.simKindForGenre(genreId)
        return GameWorld(lvl, def, genreId, simKind, customChar)
    }

    fun usePotion(world: GameWorld): Boolean {
        if (world.potions <= 0 || world.player.hp >= world.player.maxHp || world.status != "playing") return false
        world.potions--
        world.player.hp = min(world.player.maxHp, world.player.hp + 40)
        return true
    }

    fun selectVisualNovelChoice(world: GameWorld, choiceIndex: Int): Boolean {
        if (world.simKind != GenreSimulationKind.VISUAL_NOVEL || world.status != "playing") return false
        val nodes = GameSimulationData.VN_STORY_NODES
        val node = nodes.getOrNull(world.vnStep) ?: return false
        val bonus = node.choices.getOrNull(choiceIndex)?.second ?: 100
        world.score += bonus
        if (world.vnStep < world.shards.size && !world.shards[world.vnStep].collected) {
            world.shards[world.vnStep].collected = true
            world.shardsTotal++
        }
        world.vnStep++
        if (world.vnStep >= nodes.size) {
            world.gateUnlocked = true
        }
        return true
    }

    fun stepAi15Hz(
        world: GameWorld,
        mode: AiPlayMode,
        dt: Float
    ): SimInput? {
        if (mode == AiPlayMode.OFF) {
            world.companion.active = false
            return null
        }
        world.companion.active = true
        world.companion.healCooldown = max(0f, world.companion.healCooldown - dt)
        world.companion.thinkTimer += dt
        if (world.companion.thinkTimer < 1f / 15f) return null
        world.companion.thinkTimer = 0f

        val tx = world.player.x - world.player.facing * 26f
        val ty = world.player.y - 22f
        world.companion.x += (tx - world.companion.x) * 0.35f
        world.companion.y += (ty - world.companion.y) * 0.35f

        if (mode == AiPlayMode.COOP) {
            if (world.player.hp <= 40 && world.companion.healCooldown <= 0f) {
                world.player.hp = min(world.player.maxHp, world.player.hp + 15)
                world.companion.healCooldown = 6f
                world.companion.lastActionText = "Luma Auto-Heal (+15 HP)"
            } else {
                val threat = world.projectiles.firstOrNull { !it.fromPlayer && hypot(it.x - world.player.x, it.y - world.player.y) < 88f }
                if (threat != null) {
                    threat.fromPlayer = true
                    threat.vx = -threat.vx * 1.3f
                    world.companion.lastActionText = "Luma Reflected Bolt"
                } else {
                    world.companion.lastActionText = "Luma Escorting Bowo"
                }
            }
            return null
        }

        // Autopilot mode
        val incoming = world.projectiles.any { !it.fromPlayer && hypot(it.x - world.player.x, it.y - world.player.y) < 60f }
        val targetShard = world.shards.firstOrNull { !it.collected }
        val targetSwitch = world.switches.firstOrNull { !it.active }
        val targetEnemy = world.enemies.firstOrNull { !it.dead }
        val goalX = when {
            world.gateUnlocked -> world.def.gate.x + 12f
            targetSwitch != null -> targetSwitch.x
            targetShard != null -> targetShard.x
            targetEnemy != null -> targetEnemy.x
            else -> world.def.gate.x + 12f
        }
        val dx = goalX - world.player.x
        val moveX = when {
            dx > 12f -> 1f
            dx < -12f -> -1f
            else -> 0f
        }
        val needJump = ((targetShard != null && targetShard.y < world.player.y - 28f) || incoming) && world.player.grounded
        val needAttack = targetEnemy != null && abs(targetEnemy.x - world.player.x) < 64f
        world.companion.lastActionText = if (incoming) "Autopilot Dash Parry!" else "Autopilot -> Gate"
        return SimInput(
            moveX = moveX,
            moveY = if (world.simKind == GenreSimulationKind.TOPDOWN) -0.2f else 0f,
            jumpPressed = needJump,
            jumpHeld = needJump,
            attackPressed = needAttack,
            dashPressed = incoming,
            burstPressed = world.player.energy >= 80f && needAttack
        )
    }

    fun stepGameWorld(
        world: GameWorld,
        rawInput: SimInput,
        rawDt: Float,
        cfg: SimConfig,
        aiMode: AiPlayMode = AiPlayMode.OFF
    ): List<SimEvent> {
        val events = mutableListOf<SimEvent>()
        if (world.status != "playing") return events
        val dt = fastClampDt(rawDt)
        if (world.hitstopTimer > 0f) {
            world.hitstopTimer = max(0f, world.hitstopTimer - dt)
            return events
        }

        val aiOverride = stepAi15Hz(world, aiMode, dt)
        val input = aiOverride ?: rawInput

        world.time += dt
        world.shakeTimer = max(0f, world.shakeTimer - dt)
        world.laneSwitchCd = max(0f, world.laneSwitchCd - dt)

        val p = world.player
        p.attackTimer = max(0f, p.attackTimer - dt)
        p.attackCooldown = max(0f, p.attackCooldown - dt)
        p.dashTimer = max(0f, p.dashTimer - dt)
        p.dashCooldown = max(0f, p.dashCooldown - dt)
        p.parryTimer = max(0f, p.parryTimer - dt)
        p.invulnTimer = max(0f, p.invulnTimer - dt)
        p.hurtFlash = max(0f, p.hurtFlash - dt)
        p.energy = min(p.maxEnergy, p.energy + 12f * dt)

        val speedBase = 215f * cfg.speedMul * (world.customCharacter?.speedMul ?: 1f)

        when (world.simKind) {
            GenreSimulationKind.RUNNER -> {
                if (world.laneSwitchCd <= 0f && abs(input.moveY) > 0.45f) {
                    world.lane = (world.lane + if (input.moveY > 0f) 1 else -1).coerceIn(0, 2)
                    world.laneSwitchCd = 0.18f
                }
                world.trackDist += (180f * cfg.speedMul) * dt
                world.speedKmh = (120f + world.trackDist * 0.04f).toInt().toFloat().coerceAtMost(320f)
                p.x = (p.x + (95f + input.moveX * 140f) * dt).coerceIn(36f, world.def.worldWidth - 48f)
                p.y = 220f + world.lane * 48f
            }
            GenreSimulationKind.RHYTHM -> {
                if (world.laneSwitchCd <= 0f && abs(input.moveY) > 0.45f) {
                    world.lane = (world.lane + if (input.moveY > 0f) 1 else -1).coerceIn(0, 2)
                    world.laneSwitchCd = 0.16f
                }
                p.y = 200f + world.lane * 52f
                p.x = (p.x + input.moveX * 120f * dt).coerceIn(48f, world.def.worldWidth - 64f)
                for (note in world.beatNotes) {
                    if (note.hit || note.missed) continue
                    note.x -= 155f * dt
                    if (input.attackPressed && note.lane == world.lane && abs(note.x - p.x) < 42f) {
                        note.hit = true
                        world.comboCount++
                        world.score += 160 + world.comboCount * 20
                        events.add(SimEvent("parry", p.x - world.cameraX))
                    } else if (note.x < p.x - 48f) {
                        note.missed = true
                        world.comboCount = 0
                    }
                }
            }
            GenreSimulationKind.TOPDOWN, GenreSimulationKind.SHOOTER, GenreSimulationKind.BRAWLER, GenreSimulationKind.DEFENSE -> {
                p.vx = input.moveX * speedBase
                p.vy = input.moveY * speedBase
                val nx = (p.x + p.vx * dt).coerceIn(16f, world.def.worldWidth - p.w - 16f)
                val ny = (p.y + p.vy * dt).coerceIn(48f, world.def.groundY - p.h)
                p.x = nx
                p.y = ny
                for (obs in world.obstacles) {
                    if (rectsOverlap(p.x, p.y, p.w, p.h, obs.x, obs.y, obs.w, obs.h)) {
                        val cx = p.x + p.w * 0.5f; val cy = p.y + p.h * 0.5f
                        val ox = obs.x + obs.w * 0.5f; val oy = obs.y + obs.h * 0.5f
                        val dx = cx - ox; val dy = cy - oy
                        val pxOverlap = (p.w + obs.w) * 0.5f - abs(dx)
                        val pyOverlap = (p.h + obs.h) * 0.5f - abs(dy)
                        if (pxOverlap < pyOverlap) {
                            p.x += if (dx >= 0f) pxOverlap else -pxOverlap
                        } else {
                            p.y += if (dy >= 0f) pyOverlap else -pyOverlap
                        }
                    }
                }
                if (input.moveX > 0.1f) p.facing = 1 else if (input.moveX < -0.1f) p.facing = -1
            }
            else -> {
                // Platformer / Collector / Visual Novel horizontal + gravity physics
                val prevX = p.x
                val prevY = p.y
                if (abs(input.moveX) > 0.08f) {
                    p.facing = if (input.moveX > 0f) 1 else -1
                }
                if (p.dashTimer > 0f) {
                    p.vx = p.facing * 420f
                } else {
                    val accel = if (cfg.physicsMode == PhysicsMode.REALISTIC) 0.18f else 0.35f
                    p.vx += (input.moveX * speedBase - p.vx) * accel
                }

                val grav = when {
                    cfg.physicsMode == PhysicsMode.ZERO_G -> 180f * cfg.gravityMul
                    cfg.physicsMode == PhysicsMode.REALISTIC -> 980f * cfg.gravityMul
                    else -> 860f * cfg.gravityMul
                }
                p.vy += grav * dt

                if (p.grounded) {
                    p.coyoteTimer = 0.11f
                    if (world.genreId == "metroidvania") world.doubleJumpsLeft = 1
                } else {
                    p.coyoteTimer = max(0f, p.coyoteTimer - dt)
                }

                if (input.jumpPressed) {
                    p.jumpBufferTimer = 0.12f
                } else {
                    p.jumpBufferTimer = max(0f, p.jumpBufferTimer - dt)
                }

                if (p.jumpBufferTimer > 0f && (p.coyoteTimer > 0f || world.doubleJumpsLeft > 0)) {
                    if (p.coyoteTimer <= 0f) world.doubleJumpsLeft = max(0, world.doubleJumpsLeft - 1)
                    p.vy = -375f
                    p.grounded = false
                    p.coyoteTimer = 0f
                    p.jumpBufferTimer = 0f
                    events.add(SimEvent("jump", p.x - world.cameraX))
                }
                if (!input.jumpHeld && p.vy < -150f) {
                    p.vy *= 0.85f
                }

                val candX = (p.x + p.vx * dt).coerceIn(12f, world.def.worldWidth - p.w - 12f)
                val candY = p.y + p.vy * dt
                val validated = validateMoveBounds(prevX, prevY, candX, candY)
                p.x = validated.first
                p.y = validated.second

                p.grounded = false
                if (p.y + p.h >= world.def.groundY) {
                    p.y = world.def.groundY - p.h
                    p.vy = 0f
                    p.grounded = true
                }
                for (plat in world.def.platforms) {
                    val prevBottom = prevY + p.h
                    val curBottom = p.y + p.h
                    if (p.vy >= 0f && prevBottom <= plat.y + 8f && curBottom >= plat.y &&
                        p.x + p.w > plat.x + 4f && p.x < plat.x + plat.w - 4f
                    ) {
                        p.y = plat.y - p.h
                        p.vy = 0f
                        p.grounded = true
                    }
                }
            }
        }

        // Actions: Dash & Attack & Burst
        if (input.dashPressed && p.dashCooldown <= 0f) {
            p.dashTimer = 0.18f
            p.dashCooldown = 0.65f
            p.parryTimer = 0.24f
            p.invulnTimer = 0.22f
            events.add(SimEvent("dash", p.x - world.cameraX))
        }

        if (input.attackPressed && p.attackCooldown <= 0f) {
            p.attackTimer = 0.22f
            p.attackCooldown = 0.34f
            events.add(SimEvent("attack", p.x - world.cameraX))
            if (world.simKind == GenreSimulationKind.SHOOTER) {
                for (ang in listOf(-0.22f, 0f, 0.22f)) {
                    world.projectiles.add(
                        SimProjectile(
                            id = world.nextProjId++,
                            x = p.x + p.w * 0.5f,
                            y = p.y + p.h * 0.5f,
                            vx = cos(ang) * 380f * p.facing,
                            vy = sin(ang) * 240f,
                            fromPlayer = true,
                            damage = 18,
                            life = 1.4f
                        )
                    )
                }
            }
        }

        if (input.burstPressed && p.energy >= 45f) {
            p.energy -= 45f
            world.shakeTimer = 0.28f
            events.add(SimEvent("burst", p.x - world.cameraX))
            for (i in 0 until 10) {
                val a = (i / 10f) * (2f * PI.toFloat())
                world.particles.spawn(p.x + p.w * 0.5f, p.y + p.h * 0.5f, cos(a) * 140f, sin(a) * 140f, 0.45f, 4f, 1)
            }
            for (e in world.enemies) {
                if (!e.dead && hypot(e.x - p.x, e.y - p.y) < 120f) {
                    damageEnemy(world, e, 36, events, cfg)
                }
            }
        }

        if (world.simKind == GenreSimulationKind.DEFENSE && input.burstPressed && world.turrets.size < 4) {
            world.turrets.add(SimTurret(world.turrets.size + 1, p.x, p.y))
        }

        // Melee hit check
        if (p.attackTimer > 0.12f) {
            val atkX = if (p.facing > 0) p.x + p.w * 0.5f else p.x - 42f
            val atkY = p.y - 6f
            for (e in world.enemies) {
                if (!e.dead && e.hurtFlash <= 0f && rectsOverlap(atkX, atkY, 46f, p.h + 12f, e.x - e.w * 0.5f, e.y - e.h * 0.5f, e.w, e.h)) {
                    damageEnemy(world, e, 22, events, cfg)
                }
            }
        }

        // Pickups: Shards & Coins
        for (sh in world.shards) {
            if (!sh.collected && hypot(sh.x - (p.x + p.w * 0.5f), sh.y - (p.y + p.h * 0.5f)) < 28f) {
                sh.collected = true
                world.shardsTotal++
                world.score += 100
                events.add(SimEvent("shard", sh.x - world.cameraX))
                applyEventRule(world, "shard_collect", cfg)
            }
        }
        for (coin in world.coins) {
            if (coin.collected) continue
            if (world.simKind == GenreSimulationKind.COLLECTOR) {
                val dx = (p.x + p.w * 0.5f) - coin.x
                val dy = (p.y + p.h * 0.5f) - coin.y
                val d = hypot(dx, dy)
                if (d < 160f && d > 1f) {
                    coin.x += (dx / d) * 170f * dt
                    coin.y += (dy / d) * 170f * dt
                }
            }
            if (hypot(coin.x - (p.x + p.w * 0.5f), coin.y - (p.y + p.h * 0.5f)) < 24f) {
                coin.collected = true
                world.coinsTotal++
                world.score += 25
                events.add(SimEvent("coin", coin.x - world.cameraX))
            }
        }

        // Switches
        for (sw in world.switches) {
            if (!sw.active && hypot(sw.x - (p.x + p.w * 0.5f), sw.y - (p.y + p.h)) < 30f) {
                sw.active = true
                world.score += 75
                events.add(SimEvent("switch", sw.x - world.cameraX))
                applyEventRule(world, "switch_activated", cfg)
            }
        }

        // Turrets (Defense)
        for (t in world.turrets) {
            t.cooldown -= dt
            if (t.cooldown <= 0f) {
                t.cooldown = 0.9f
                val target = world.enemies.firstOrNull { !it.dead }
                if (target != null) {
                    val dx = target.x - t.x; val dy = target.y - t.y
                    val d = hypot(dx, dy).coerceAtLeast(1f)
                    world.projectiles.add(SimProjectile(world.nextProjId++, t.x, t.y, (dx / d) * 260f, (dy / d) * 260f, true, 16, 1.5f))
                }
            }
        }

        // Enemies update
        for (e in world.enemies) {
            if (e.dead) {
                e.koProgress = min(1f, e.koProgress + dt * 2.5f)
                continue
            }
            e.hurtFlash = max(0f, e.hurtFlash - dt)
            if (e.archetype == "boss_kala") {
                val hpRatio = e.hp.toFloat() / e.maxHp
                val newPhase = when {
                    hpRatio <= 0.34f -> 3
                    hpRatio <= 0.67f -> 2
                    else -> 1
                }
                if (newPhase != e.bossPhase) {
                    e.bossPhase = newPhase
                    events.add(SimEvent("boss_phase", e.x - world.cameraX))
                }
            }

            val spd = when (e.archetype) {
                "boss_kala" -> 58f + e.bossPhase * 18f
                "sentinel" -> 64f
                else -> 48f
            }
            if (e.vx == 0f) e.vx = spd
            e.x += e.vx * dt
            if (e.x < e.patrolMinX) { e.x = e.patrolMinX; e.vx = spd }
            if (e.x > e.patrolMaxX) { e.x = e.patrolMaxX; e.vx = -spd }

            e.attackTimer -= dt
            e.telegraphTimer = if (e.attackTimer < 0.45f) 1f else 0f
            if (e.attackTimer <= 0f && (e.archetype == "wisp" || e.archetype == "boss_kala")) {
                e.attackTimer = if (e.archetype == "boss_kala") max(1.1f, 2.2f - e.bossPhase * 0.35f) else 2.2f
                val dx = (p.x + p.w * 0.5f) - e.x
                val dy = (p.y + p.h * 0.5f) - e.y
                val d = hypot(dx, dy).coerceAtLeast(1f)
                val count = if (e.archetype == "boss_kala") e.bossPhase else 1
                for (c in 0 until count) {
                    val spread = (c - (count - 1) * 0.5f) * 0.25f
                    val baseAngle = kotlin.math.atan2(dy, dx) + spread
                    world.projectiles.add(
                        SimProjectile(
                            world.nextProjId++,
                            e.x,
                            e.y,
                            cos(baseAngle) * 185f,
                            sin(baseAngle) * 185f,
                            fromPlayer = false,
                            damage = if (e.archetype == "boss_kala") 16 else 12,
                            life = 2.6f
                        )
                    )
                }
            }

            // Enemy contact damage
            if (!cfg.practiceMode && p.invulnTimer <= 0f && rectsOverlap(p.x, p.y, p.w, p.h, e.x - e.w * 0.5f, e.y - e.h * 0.5f, e.w, e.h)) {
                if (p.parryTimer > 0f) {
                    damageEnemy(world, e, 16, events, cfg)
                    events.add(SimEvent("parry", p.x - world.cameraX))
                } else {
                    damagePlayer(world, if (e.archetype == "boss_kala") 22 else 14, events)
                }
            }
        }

        // Projectiles update
        val itProj = world.projectiles.iterator()
        while (itProj.hasNext()) {
            val pr = itProj.next()
            pr.x += pr.vx * dt
            pr.y += pr.vy * dt
            pr.life -= dt
            if (pr.life <= 0f) {
                itProj.remove()
                continue
            }
            if (pr.fromPlayer) {
                val hitEnemy = world.enemies.firstOrNull { !it.dead && hypot(it.x - pr.x, it.y - pr.y) < it.w * 0.6f + pr.r }
                if (hitEnemy != null) {
                    damageEnemy(world, hitEnemy, pr.damage, events, cfg)
                    itProj.remove()
                }
            } else if (rectsOverlap(pr.x - pr.r, pr.y - pr.r, pr.r * 2f, pr.r * 2f, p.x, p.y, p.w, p.h)) {
                if (p.parryTimer > 0f) {
                    pr.fromPlayer = true
                    pr.vx = -pr.vx * 1.4f
                    pr.vy = -pr.vy * 1.4f
                    world.score += 60
                    events.add(SimEvent("parry", p.x - world.cameraX))
                } else if (!cfg.practiceMode && p.invulnTimer <= 0f) {
                    damagePlayer(world, pr.damage, events)
                    itProj.remove()
                }
            }
        }

        // Unlock Gate check
        val bossAlive = world.def.hasBoss && world.enemies.any { it.archetype == "boss_kala" && !it.dead }
        val activeSwitches = world.switches.count { it.active }
        val wasUnlocked = world.gateUnlocked
        if (world.shardsTotal >= world.def.requiredShards && activeSwitches >= world.def.requiredSwitches && !bossAlive) {
            world.gateUnlocked = true
        }
        if (!wasUnlocked && world.gateUnlocked) {
            events.add(SimEvent("gate", world.def.gate.x - world.cameraX))
        }

        // Gate enter -> Level Clear / Victory
        if (world.gateUnlocked && rectsOverlap(p.x, p.y, p.w, p.h, world.def.gate.x, world.def.gate.y, world.def.gate.w, world.def.gate.h)) {
            if (world.level >= 3) {
                world.status = "victory"
                world.score += 500
                events.add(SimEvent("victory", 0f))
            } else {
                world.status = "level_clear"
                world.score += 300
                events.add(SimEvent("level_clear", 0f))
            }
        }

        // Animation FSM + Cloak Spring
        p.animState = when {
            p.hp <= 0 -> CharacterAnimState.KO
            p.hurtFlash > 0f -> CharacterAnimState.HURT
            p.dashTimer > 0f -> CharacterAnimState.DASH
            p.attackTimer > 0f -> CharacterAnimState.ATTACK
            !p.grounded && p.vy < -20f -> CharacterAnimState.JUMP
            !p.grounded && p.vy > 20f -> CharacterAnimState.FALL
            abs(p.vx) > 22f || abs(p.vy) > 22f -> CharacterAnimState.WALK
            else -> CharacterAnimState.IDLE
        }
        val fsmTarget = QolbuCore.CHARACTER_FSM_TABLE.find { it.state == p.animState }?.cloakTargetAngle ?: -0.1f
        QolbuCore.stepCloakSpring(p.cloakSpring, fsmTarget, p.vx, dt)
        world.particles.step(dt)
        world.cameraX = (p.x - 220f).coerceIn(0f, max(0f, world.def.worldWidth - 520f))
        return events
    }

    private fun damageEnemy(
        world: GameWorld,
        e: SimEnemy,
        dmg: Int,
        events: MutableList<SimEvent>,
        cfg: SimConfig
    ) {
        e.hp = max(0, e.hp - dmg)
        e.hurtFlash = 0.16f
        world.hitstopTimer = 0.035f
        world.shakeTimer = max(world.shakeTimer, 0.12f)
        events.add(SimEvent("hit", e.x - world.cameraX))
        if (e.hp <= 0 && !e.dead) {
            e.dead = true
            world.kills++
            world.score += if (e.archetype == "boss_kala") 400 else 100
            applyEventRule(world, "enemy_defeated", cfg)
        }
    }

    private fun damagePlayer(world: GameWorld, dmg: Int, events: MutableList<SimEvent>) {
        world.player.hp = max(0, world.player.hp - dmg)
        world.player.invulnTimer = 0.65f
        world.player.hurtFlash = 0.2f
        world.shakeTimer = 0.2f
        events.add(SimEvent("hurt", 0f))
        if (world.player.hp <= 0) {
            world.status = "gameover"
            events.add(SimEvent("gameover", 0f))
        }
    }

    private fun applyEventRule(world: GameWorld, condition: String, cfg: SimConfig) {
        for (rule in cfg.eventRules) {
            if (!rule.enabled || rule.condition != condition) continue
            when (rule.action) {
                "score_100" -> world.score += 100
                "heal_10" -> world.player.hp = min(world.player.maxHp, world.player.hp + 10)
                "bonus_coin" -> world.coinsTotal += 5
            }
        }
    }

    private fun rectsOverlap(ax: Float, ay: Float, aw: Float, ah: Float, bx: Float, by: Float, bw: Float, bh: Float): Boolean {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
    }

    fun extractWorldSaveProgress(world: GameWorld): WorldSaveProgress {
        return WorldSaveProgress(
            genreId = world.genreId,
            playerX = world.player.x,
            playerY = world.player.y,
            facing = world.player.facing,
            time = world.time,
            collectedShards = world.shards.filter { it.collected }.map { it.id },
            collectedCoins = world.coins.filter { it.collected }.map { it.id },
            activeSwitches = world.switches.filter { it.active }.map { it.id },
            defeatedEnemies = world.enemies.filter { it.dead }.map { it.id },
            vnStep = world.vnStep
        )
    }

    fun restoreWorldFromSave(save: SaveSlotData, customChar: GeneratedCharacterSpec? = null): GameWorld {
        val genreId = save.worldState?.genreId ?: "platformer"
        val world = createLevelWorld(save.level, customChar, genreId)
        world.player.hp = save.hp.coerceIn(1, world.player.maxHp)
        world.player.energy = save.energy.toFloat().coerceIn(0f, world.player.maxEnergy)
        world.coinsTotal = save.coins
        world.score = save.score
        world.kills = save.kills
        world.potions = save.potions
        val ws = save.worldState ?: return world
        world.player.x = ws.playerX
        world.player.y = ws.playerY
        world.player.facing = ws.facing
        world.time = ws.time
        world.vnStep = ws.vnStep
        ws.collectedShards.forEach { id -> world.shards.find { it.id == id }?.collected = true }
        ws.collectedCoins.forEach { id -> world.coins.find { it.id == id }?.collected = true }
        ws.activeSwitches.forEach { id -> world.switches.find { it.id == id }?.active = true }
        ws.defeatedEnemies.forEach { id ->
            world.enemies.find { it.id == id }?.let { it.dead = true; it.hp = 0 }
        }
        world.shardsTotal = world.shards.count { it.collected }
        val bossAlive = world.def.hasBoss && world.enemies.any { it.archetype == "boss_kala" && !it.dead }
        if (world.shardsTotal >= world.def.requiredShards && world.switches.count { it.active } >= world.def.requiredSwitches && !bossAlive) {
            world.gateUnlocked = true
        }
        return world
    }

    fun toHudSnapshot(world: GameWorld, fps: Int, dynamicScale: Float, aiMode: AiPlayMode): HudSnapshot {
        val boss = world.enemies.firstOrNull { it.archetype == "boss_kala" && !it.dead }
        val vnNode = if (world.simKind == GenreSimulationKind.VISUAL_NOVEL) {
            GameSimulationData.VN_STORY_NODES.getOrNull(world.vnStep)
        } else null
        val obj = when {
            world.gateUnlocked -> "Masuk ke Gerbang Cahaya Timur!"
            world.def.hasBoss && boss != null -> "Kalahkan Boss Kala & kumpulkan Light Shard (${world.shardsTotal}/${world.def.requiredShards})"
            world.def.requiredSwitches > 0 -> "Aktifkan ${world.def.requiredSwitches} saklar & ambil ${world.def.requiredShards} Shard"
            else -> "Kumpulkan ${world.def.requiredShards} Light Shard untuk buka Gerbang"
        }
        return HudSnapshot(
            level = world.level,
            levelName = world.def.name,
            hp = world.player.hp,
            maxHp = world.player.maxHp,
            energy = world.player.energy.toInt(),
            maxEnergy = world.player.maxEnergy.toInt(),
            coins = world.coinsTotal,
            shards = world.shardsTotal,
            requiredShards = world.def.requiredShards,
            switchesActive = world.switches.count { it.active },
            requiredSwitches = world.def.requiredSwitches,
            potions = world.potions,
            score = world.score,
            kills = world.kills,
            gateUnlocked = world.gateUnlocked,
            fps = fps,
            dynamicScale = dynamicScale,
            drawCalls = 11 + world.enemies.count { !it.dead } + world.projectiles.size,
            culledCount = 0,
            activeEntities = 4 + world.enemies.size + world.projectiles.size,
            heapMb = 16.4f + world.projectiles.size * 0.08f,
            bossHp = boss?.hp ?: 0,
            bossMaxHp = boss?.maxHp ?: 0,
            bossPhase = boss?.bossPhase ?: 1,
            objective = obj,
            parryFlash = world.player.parryTimer > 0f,
            genreId = world.genreId,
            simKind = world.simKind,
            aiMode = aiMode,
            aiCompanionActive = world.companion.active,
            aiStatusText = world.companion.lastActionText,
            comboCount = world.comboCount,
            waveNumber = world.waveNumber,
            trackDist = world.trackDist.toInt(),
            speedKmh = world.speedKmh.toInt(),
            vnDialog = vnNode?.let {
                VnDialogView(
                    speaker = it.speaker,
                    text = it.text,
                    step = world.vnStep + 1,
                    totalSteps = GameSimulationData.VN_STORY_NODES.size,
                    choices = it.choices.map { c -> c.first }
                )
            }
        )
    }
}
