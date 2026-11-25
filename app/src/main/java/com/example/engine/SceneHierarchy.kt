package com.example.engine

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

data class PhysicsPresetSpec(
    val id: PhysicsPresetId,
    val label: String,
    val desc: String,
    val config: EntityPhysicsProps
)

object SceneHierarchy {
    val PHYSICS_PRESETS: Map<PhysicsPresetId, PhysicsPresetSpec> = mapOf(
        PhysicsPresetId.NORMAL to PhysicsPresetSpec(PhysicsPresetId.NORMAL, "NORMAL", "Balanced hero gravity & friction", EntityPhysicsProps(PhysicsPresetId.NORMAL, 1f, 0.6f, 0.2f, 1f, 0.08f, false, false)),
        PhysicsPresetId.BOUNCY to PhysicsPresetSpec(PhysicsPresetId.BOUNCY, "BOUNCY", "High restitution spring bounce", EntityPhysicsProps(PhysicsPresetId.BOUNCY, 0.8f, 0.35f, 0.88f, 0.9f, 0.04f, false, false)),
        PhysicsPresetId.HEAVY to PhysicsPresetSpec(PhysicsPresetId.HEAVY, "HEAVY", "Armored boss inertia & low bounce", EntityPhysicsProps(PhysicsPresetId.HEAVY, 4.5f, 0.85f, 0.05f, 1.4f, 0.2f, false, false)),
        PhysicsPresetId.GHOST to PhysicsPresetSpec(PhysicsPresetId.GHOST, "GHOST", "Sensor trigger pass-through", EntityPhysicsProps(PhysicsPresetId.GHOST, 0.2f, 0.05f, 0f, 0f, 0.02f, true, false)),
        PhysicsPresetId.SLIPPERY to PhysicsPresetSpec(PhysicsPresetId.SLIPPERY, "SLIPPERY", "Low ice friction glide", EntityPhysicsProps(PhysicsPresetId.SLIPPERY, 1f, 0.08f, 0.15f, 1f, 0.01f, false, false)),
        PhysicsPresetId.BALL to PhysicsPresetSpec(PhysicsPresetId.BALL, "BALL", "Continuous collision detection projectile", EntityPhysicsProps(PhysicsPresetId.BALL, 0.6f, 0.2f, 0.72f, 0.75f, 0.02f, false, true))
    )

    fun createDefaultSceneEntities(level: Int = 1): List<SceneEntityNode> = listOf(
        SceneEntityNode("ent_bowo", "Bowo Guardian", "player", x = 90f, y = 148f, collider = ColliderShapeSpec(ColliderShapeKind.BOX, 32f, 44f, 20f)),
        SceneEntityNode("ent_luma", "Luma Companion", "companion", x = 58f, y = 110f, physics = PHYSICS_PRESETS.getValue(PhysicsPresetId.GHOST).config, collider = ColliderShapeSpec(ColliderShapeKind.CIRCLE, 24f, 24f, 13f)),
        SceneEntityNode("ent_enemy_1", if (level == 3) "Boss Kala" else "Shadow Slime", "enemy", x = 236f, y = 148f, physics = PHYSICS_PRESETS.getValue(if (level == 3) PhysicsPresetId.HEAVY else PhysicsPresetId.BOUNCY).config, collider = ColliderShapeSpec(ColliderShapeKind.CIRCLE, 36f, 36f, if (level == 3) 26f else 18f)),
        SceneEntityNode("ent_shard_1", "Light Shard #1", "pickup", x = 165f, y = 92f, physics = PHYSICS_PRESETS.getValue(PhysicsPresetId.GHOST).config, collider = ColliderShapeSpec(ColliderShapeKind.POLYGON, 24f, 24f, 14f)),
        SceneEntityNode("ent_platform_1", "Stone Bridge", "platform", x = 180f, y = 196f, physics = PHYSICS_PRESETS.getValue(PhysicsPresetId.HEAVY).config, collider = ColliderShapeSpec(ColliderShapeKind.BOX, 240f, 22f, 20f))
    )

    fun groupEntitiesIntoContainer(
        entities: List<SceneEntityNode>,
        selectedIds: List<String>,
        containerName: String = "Group Container"
    ): Pair<List<SceneEntityNode>, String?> {
        val valid = entities.filter { it.id in selectedIds && it.kind != "container" }
        if (valid.size < 2) return entities to null
        val cx = valid.map { it.x }.average().toFloat()
        val cy = valid.map { it.y }.average().toFloat()
        val containerId = "grp_${System.currentTimeMillis().toString(36)}"
        val container = SceneEntityNode(
            id = containerId,
            name = containerName.ifBlank { "Group Container" },
            kind = "container",
            children = valid.map { it.id },
            x = cx,
            y = cy,
            collider = ColliderShapeSpec(ColliderShapeKind.BOX, 90f, 64f, 40f)
        )
        val updated = entities.map { node ->
            if (node.id in selectedIds && node.kind != "container") {
                node.copy(
                    parentId = containerId,
                    localX = node.x - cx,
                    localY = node.y - cy,
                    localScaleX = node.scaleX,
                    localScaleY = node.scaleY,
                    localRotationDeg = node.rotationDeg
                )
            } else node
        } + container
        return updated to containerId
    }

    fun ungroupContainer(entities: List<SceneEntityNode>, containerId: String): List<SceneEntityNode> {
        return entities.filter { it.id != containerId }.map { node ->
            if (node.parentId == containerId) {
                node.copy(
                    parentId = null,
                    localX = 0f,
                    localY = 0f,
                    localScaleX = 1f,
                    localScaleY = 1f,
                    localRotationDeg = 0f
                )
            } else node
        }
    }

    fun updateEntityTransform(
        entities: List<SceneEntityNode>,
        id: String,
        newX: Float? = null,
        newY: Float? = null,
        newScaleX: Float? = null,
        newScaleY: Float? = null,
        newRotDeg: Float? = null
    ): List<SceneEntityNode> {
        val target = entities.find { it.id == id } ?: return entities
        val tx = (newX ?: target.x).coerceIn(10f, 350f)
        val ty = (newY ?: target.y).coerceIn(10f, 230f)
        val tsx = (newScaleX ?: target.scaleX).coerceIn(0.4f, 2.5f)
        val tsy = (newScaleY ?: target.scaleY).coerceIn(0.4f, 2.5f)
        val trot = newRotDeg ?: target.rotationDeg

        return entities.map { node ->
            when {
                node.id == id -> node.copy(x = tx, y = ty, scaleX = tsx, scaleY = tsy, rotationDeg = trot)
                node.parentId == id -> {
                    val rad = (trot * PI.toFloat()) / 180f
                    val cosA = cos(rad)
                    val sinA = sin(rad)
                    val lx = node.localX * tsx
                    val ly = node.localY * tsy
                    val wx = (tx + lx * cosA - ly * sinA).coerceIn(10f, 350f)
                    val wy = (ty + lx * sinA + ly * cosA).coerceIn(10f, 230f)
                    node.copy(
                        x = wx,
                        y = wy,
                        scaleX = node.localScaleX * tsx,
                        scaleY = node.localScaleY * tsy,
                        rotationDeg = node.localRotationDeg + trot
                    )
                }
                else -> node
            }
        }
    }

    fun applyPhysicsPreset(entities: List<SceneEntityNode>, id: String, presetId: PhysicsPresetId): List<SceneEntityNode> {
        val preset = PHYSICS_PRESETS[presetId] ?: return entities
        return entities.map { if (it.id == id) it.copy(physics = preset.config) else it }
    }

    fun updateEntityCollider(
        entities: List<SceneEntityNode>,
        id: String,
        kind: ColliderShapeKind? = null,
        width: Float? = null,
        height: Float? = null,
        radius: Float? = null
    ): List<SceneEntityNode> {
        return entities.map { node ->
            if (node.id != id) node
            else node.copy(
                collider = node.collider.copy(
                    kind = kind ?: node.collider.kind,
                    width = (width ?: node.collider.width).coerceIn(12f, 280f),
                    height = (height ?: node.collider.height).coerceIn(12f, 180f),
                    radius = (radius ?: node.collider.radius).coerceIn(8f, 96f)
                )
            )
        }
    }

    fun detectEntityOverlaps(entities: List<SceneEntityNode>): List<CollisionOverlapInfo> {
        val active = entities.filter { it.visible && it.kind != "container" }
        val results = mutableListOf<CollisionOverlapInfo>()
        for (i in active.indices) {
            for (j in i + 1 until active.size) {
                val a = active[i]
                val b = active[j]
                val aw = (if (a.collider.kind == ColliderShapeKind.CIRCLE) a.collider.radius * 2f else a.collider.width) * a.scaleX
                val ah = (if (a.collider.kind == ColliderShapeKind.CIRCLE) a.collider.radius * 2f else a.collider.height) * a.scaleY
                val bw = (if (b.collider.kind == ColliderShapeKind.CIRCLE) b.collider.radius * 2f else b.collider.width) * b.scaleX
                val bh = (if (b.collider.kind == ColliderShapeKind.CIRCLE) b.collider.radius * 2f else b.collider.height) * b.scaleY

                val pen: Float
                val near: Boolean
                if (a.collider.kind == ColliderShapeKind.CIRCLE && b.collider.kind == ColliderShapeKind.CIRCLE) {
                    val dist = hypot(a.x - b.x, a.y - b.y)
                    val sumR = a.collider.radius * a.scaleX + b.collider.radius * b.scaleX
                    pen = sumR - dist
                    near = pen <= 0f && pen >= -8f
                } else {
                    val dx = abs(a.x - b.x)
                    val dy = abs(a.y - b.y)
                    val px = (aw + bw) * 0.5f - dx
                    val py = (ah + bh) * 0.5f - dy
                    pen = min(px, py)
                    near = pen <= 0f && pen >= -8f
                }
                if (pen > 0f || near) {
                    results.add(
                        CollisionOverlapInfo(
                            aId = a.id,
                            aName = a.name,
                            bId = b.id,
                            bName = b.name,
                            penetrationPx = max(0f, pen),
                            isTriggerOverlap = a.physics.isTrigger || b.physics.isTrigger,
                            near = near
                        )
                    )
                }
            }
        }
        return results
    }
}

// Qolbu Arena AI Simulation (Solo Utility AI / Co-Play Companion / VS Boss Kala Adaptif)
data class ArenaActor(
    var x: Float,
    var y: Float,
    var hp: Int,
    var maxHp: Int,
    var fsm: String = "idle",
    var name: String = "Bowo",
    var attackCd: Float = 0f,
    var dashCd: Float = 0f,
    var invuln: Float = 0f
)

data class ArenaEnemy(
    val id: String,
    val name: String,
    var x: Float,
    var y: Float,
    var hp: Int,
    var maxHp: Int,
    val isBoss: Boolean = false,
    var phase: Int = 1,
    var dead: Boolean = false,
    var hurtFlash: Float = 0f,
    var telegraph: Float = 0f,
    var cooldown: Float = 1.2f
)

data class ArenaItem(
    val id: String,
    val kind: String,
    val x: Float,
    val y: Float,
    var collected: Boolean = false
)

class ArenaWorld(
    var mode: ArenaMode,
    var difficulty: ArenaDifficulty = ArenaDifficulty.NORMAL,
    var autoDifficulty: Boolean = true
) {
    var player = ArenaActor(92f, 130f, 100, 100, "idle", "Bowo")
    var companion = ArenaActor(62f, 112f, 100, 100, "idle", "Qolbu")
    var companionReviveLeft = 1
    var enemies = mutableListOf<ArenaEnemy>()
    var items = mutableListOf<ArenaItem>()
    var score = 0
    var status = "playing"
    var aiThinkText = "Scanning arena..."
    var adaptiveRule = "Balanced pattern"
    var lastPlayerMoves = mutableListOf<String>()
    var logText = "Arena Qolbu aktif!"
    var hitFlashTimer = 0f
    var aiPath = mutableListOf<Pair<Float, Float>>()
    private var aiAccum = 0f

    fun step(
        dt: Float,
        moveX: Float,
        moveY: Float,
        coachDirective: ArenaCoachDirective,
        companionOrder: ArenaCompanionOrder,
        speedMul: Int
    ) {
        if (status != "playing") return
        val stepDt = fastClampDt(dt) * speedMul
        hitFlashTimer = max(0f, hitFlashTimer - stepDt)
        player.attackCd = max(0f, player.attackCd - stepDt)
        player.dashCd = max(0f, player.dashCd - stepDt)
        player.invuln = max(0f, player.invuln - stepDt)

        var mx = moveX
        var my = moveY
        if (mode == ArenaMode.SOLO) {
            val targetItem = items.firstOrNull { !it.collected }
            val targetEnemy = enemies.firstOrNull { !it.dead }
            val goal = when {
                player.hp < 45 && targetItem?.kind == "potion" -> targetItem.x to targetItem.y
                coachDirective == ArenaCoachDirective.FARMING && targetItem != null -> targetItem.x to targetItem.y
                coachDirective == ArenaCoachDirective.BERTAHAN && targetEnemy != null -> (player.x - (targetEnemy.x - player.x)) to player.y
                targetEnemy != null -> targetEnemy.x to targetEnemy.y
                else -> 180f to 120f
            }
            val dx = goal.first - player.x
            val dy = goal.second - player.y
            val dist = hypot(dx, dy).coerceAtLeast(1f)
            mx = if (dist > 14f) dx / dist else 0f
            my = if (dist > 14f) dy / dist else 0f
            aiPath.clear()
            aiPath.add(player.x to player.y)
            aiPath.add(goal)
            if (targetEnemy != null && hypot(targetEnemy.x - player.x, targetEnemy.y - player.y) < 42f && player.attackCd <= 0f) {
                triggerPlayerAction("attack")
            }
        }

        val speed = 118f
        val nextX = (player.x + mx * speed * stepDt).coerceIn(24f, 336f)
        val nextY = (player.y + my * speed * stepDt).coerceIn(24f, 216f)
        if (isValidMove(player.x, player.y, nextX, nextY)) {
            player.x = nextX
            player.y = nextY
        }
        player.fsm = if (player.attackCd > 0.15f) "attack" else if (abs(mx) + abs(my) > 0.1f) "walk" else "idle"

        // Items
        for (it in items) {
            if (!it.collected && hypot(it.x - player.x, it.y - player.y) < 20f) {
                it.collected = true
                if (it.kind == "potion") {
                    player.hp = min(player.maxHp, player.hp + 25)
                    logText = "Potion diambil (+25 HP)"
                } else {
                    score += 100
                    logText = "Relic Coin (+100)"
                }
            }
        }

        // 15Hz AI decimation
        aiAccum += stepDt
        if (aiAccum >= 1f / 15f) {
            aiAccum = 0f
            val aliveEnemy = enemies.firstOrNull { !it.dead }
            if (mode == ArenaMode.COPLAY && aliveEnemy != null) {
                val tx: Float
                val ty: Float
                when (companionOrder) {
                    ArenaCompanionOrder.SERANG -> {
                        tx = aliveEnemy.x; ty = aliveEnemy.y
                        if (hypot(tx - companion.x, ty - companion.y) < 34f) {
                            aliveEnemy.hp = max(0, aliveEnemy.hp - 6)
                            aliveEnemy.hurtFlash = 0.14f
                            if (aliveEnemy.hp == 0) { aliveEnemy.dead = true; score += 150 }
                        }
                        aiThinkText = "Qolbu attacking ${aliveEnemy.name}"
                    }
                    ArenaCompanionOrder.HEAL -> {
                        tx = player.x - 24f; ty = player.y - 12f
                        if (player.hp < player.maxHp) {
                            player.hp = min(player.maxHp, player.hp + 4)
                            aiThinkText = "Qolbu healing Bowo"
                        } else {
                            aiThinkText = "Qolbu guarding Bowo"
                        }
                    }
                    else -> {
                        tx = player.x - 28f; ty = player.y - 16f
                        aiThinkText = "Qolbu formation: ${companionOrder.label}"
                    }
                }
                val dx = tx - companion.x
                val dy = ty - companion.y
                val d = hypot(dx, dy).coerceAtLeast(1f)
                companion.x = (companion.x + (dx / d) * 14f).coerceIn(22f, 338f)
                companion.y = (companion.y + (dy / d) * 14f).coerceIn(22f, 218f)
                if (player.hp < 40 && player.hp > 0) {
                    player.hp = min(player.maxHp, player.hp + 15)
                    logText = "Qolbu Auto-Heal darurat (+15 HP)!"
                }
            } else if (mode == ArenaMode.SOLO) {
                aiThinkText = "Solo Utility AI [${coachDirective.label}]"
            } else if (mode == ArenaMode.VS) {
                val attackSpam = lastPlayerMoves.count { it == "Attack" }
                adaptiveRule = when {
                    attackSpam >= 4 -> "Counter-Dash: Player sering Attack -> Boss Kala jaga jarak!"
                    autoDifficulty && player.hp > 80 -> "Adaptive Enrage: HP Bowo tinggi -> Boss cepat!"
                    else -> "Reading 10 last player moves (${lastPlayerMoves.size}/10)"
                }
                aiThinkText = "Boss Kala reading player pattern"
            }
        }

        // Enemies step
        for (e in enemies) {
            if (e.dead) continue
            e.hurtFlash = max(0f, e.hurtFlash - stepDt)
            e.cooldown -= stepDt
            val dx = player.x - e.x
            val dy = player.y - e.y
            val dist = hypot(dx, dy).coerceAtLeast(1f)
            val spd = (if (e.isBoss) 56f else 42f) * when (difficulty) {
                ArenaDifficulty.EASY -> 0.8f
                ArenaDifficulty.HARD -> 1.25f
                else -> 1f
            }
            if (dist > 26f) {
                e.x = (e.x + (dx / dist) * spd * stepDt).coerceIn(24f, 336f)
                e.y = (e.y + (dy / dist) * spd * stepDt).coerceIn(24f, 216f)
            }
            e.telegraph = if (e.cooldown < 0.45f && dist < 52f) 1f else 0f
            if (e.cooldown <= 0f) {
                e.cooldown = if (e.isBoss) 1.3f else 1.7f
                if (dist < 42f && player.invuln <= 0f) {
                    val dmg = if (e.isBoss) 16 else 10
                    player.hp = max(0, player.hp - dmg)
                    player.invuln = 0.65f
                    hitFlashTimer = 0.14f
                    logText = "${e.name} menyerang (-$dmg HP)"
                    if (player.hp <= 0) {
                        if (mode == ArenaMode.COPLAY && companionReviveLeft > 0) {
                            companionReviveLeft--
                            player.hp = 60
                            logText = "Qolbu Revive aktif! HP dipulihkan ke 60."
                        } else {
                            status = "gameover"
                            logText = "Bowo tumbang di Arena."
                        }
                    }
                }
            }
        }
        if (enemies.all { it.dead }) {
            status = "victory"
            score += 300
            logText = "Semua lawan Arena dikalahkan (+300)!"
        }
    }

    fun triggerPlayerAction(action: String): Boolean {
        if (status != "playing") return false
        lastPlayerMoves.add(action.replaceFirstChar { it.uppercase() })
        if (lastPlayerMoves.size > 10) lastPlayerMoves.removeAt(0)
        return when (action) {
            "attack" -> {
                if (player.attackCd > 0f) return false
                player.attackCd = 0.36f
                var hitAny = false
                for (e in enemies) {
                    if (!e.dead && hypot(e.x - player.x, e.y - player.y) < 48f) {
                        e.hp = max(0, e.hp - 22)
                        e.hurtFlash = 0.18f
                        hitAny = true
                        if (e.hp == 0) {
                            e.dead = true
                            score += if (e.isBoss) 400 else 120
                        } else if (e.isBoss) {
                            e.phase = if (e.hp <= e.maxHp * 0.34f) 3 else if (e.hp <= e.maxHp * 0.67f) 2 else 1
                        }
                    }
                }
                logText = if (hitAny) "Serangan telak mengenai lawan!" else "Ayunan pedang cahaya!"
                true
            }
            "dash" -> {
                if (player.dashCd > 0f) return false
                player.dashCd = 0.7f
                player.invuln = 0.4f
                player.x = (player.x + 36f).coerceIn(24f, 336f)
                logText = "Dash invulnerable!"
                true
            }
            "heal" -> {
                player.hp = min(player.maxHp, player.hp + 25)
                logText = "Lantern Heal (+25 HP)"
                true
            }
            else -> false
        }
    }

    companion object {
        fun create(mode: ArenaMode, spec: WizardGameSpec? = null): ArenaWorld {
            val diff = when (spec?.difficulty) {
                "Easy" -> ArenaDifficulty.EASY
                "Hard" -> ArenaDifficulty.HARD
                else -> ArenaDifficulty.NORMAL
            }
            return ArenaWorld(mode, diff, true).apply {
                if (spec != null) {
                    player.name = spec.characterName.ifBlank { "Bowo" }
                }
                if (mode == ArenaMode.VS) {
                    enemies.add(ArenaEnemy("kala", "Boss Kala", 268f, 120f, 160, 160, isBoss = true))
                } else {
                    val count = (spec?.enemies ?: 3).coerceIn(1, 5)
                    for (i in 0 until count) {
                        enemies.add(
                            ArenaEnemy(
                                "mob_$i",
                                if (i == count - 1) "Dark Wisp" else "Shadow Slime #${i + 1}",
                                210f + (i % 3) * 44f,
                                58f + i * 36f,
                                60,
                                60
                            )
                        )
                    }
                }
                val itemCount = (spec?.items ?: 3).coerceIn(2, 5)
                for (i in 0 until itemCount) {
                    items.add(
                        ArenaItem(
                            "item_$i",
                            if (i == 0) "potion" else "coin",
                            130f + i * 48f,
                            if (i % 2 == 0) 64f else 182f
                        )
                    )
                }
            }
        }
    }
}
