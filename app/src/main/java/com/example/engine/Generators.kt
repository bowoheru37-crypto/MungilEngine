package com.example.engine

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.floatOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.math.abs
import kotlin.math.roundToInt
import kotlin.math.sin

object Generators {
    private val ATELIER_PRESETS: Map<String, AtelierSetupSpec> = mapOf(
        "guardian_mint" to AtelierSetupSpec("guardian_mint", "Guardian Mint", "#b3ffe0", 1.0f, 1.0f, 0.25f, mapOf("bone_1" to 0f, "bone_2" to 4f, "bone_3" to -6f), """{"app":"CharacterAtelier","settings":{"tint":"#b3ffe0","sy":1.0,"animSpeed":1.0}}"""),
        "cobalt_knight" to AtelierSetupSpec("cobalt_knight", "Cobalt Knight", "#b9c8ff", 1.05f, 0.9f, 0.30f, mapOf("bone_1" to 2f, "bone_2" to -8f, "bone_3" to 8f), """{"app":"CharacterAtelier","settings":{"tint":"#b9c8ff","sy":1.05,"animSpeed":0.9}}"""),
        "amber_rogue" to AtelierSetupSpec("amber_rogue", "Amber Rogue", "#fde68a", 0.95f, 1.25f, 0.20f, mapOf("bone_1" to -5f, "bone_2" to 10f, "bone_3" to -12f), """{"app":"CharacterAtelier","settings":{"tint":"#fde68a","sy":0.95,"animSpeed":1.25}}""")
    )

    fun listAtelierPresets(): List<AtelierSetupSpec> = ATELIER_PRESETS.values.toList()

    fun generateCharacter(seed: Int, dimension: String, archetype: String): GeneratedCharacterSpec {
        val rng = BytecodeVm.createSeedRng(seed)
        val palettes = listOf(
            Triple("#38bdf8", "#0284c7", "#fde047"),
            Triple("#34d399", "#059669", "#fbbf24"),
            Triple("#f472b6", "#be185d", "#38bdf8"),
            Triple("#a78bfa", "#6d28d9", "#fde047")
        )
        val pick = palettes[(rng() * palettes.size).toInt().coerceIn(0, palettes.lastIndex)]
        val weapons = listOf("Light Blade", "Lantern Spear", "Rune Staff", "Twin Sai")
        val weapon = weapons[(rng() * weapons.size).toInt().coerceIn(0, weapons.lastIndex)]
        val grid = MutableList(12) { row ->
            val chars = CharArray(12) { '.' }
            for (col in 0 until 6) {
                val filled = when {
                    row in 1..3 && col in 3..5 -> true
                    row in 4..8 && col in 2..5 -> rng() > 0.22f
                    row in 9..10 && col in 3..4 -> true
                    else -> false
                }
                val ch = if (!filled) '.' else if (row <= 3) 'H' else if (col == 2) 'C' else 'B'
                chars[col] = ch
                chars[11 - col] = ch
            }
            String(chars)
        }
        return GeneratedCharacterSpec(
            id = "char_${seed}_$archetype",
            name = "$archetype #${seed % 1000}",
            seed = seed,
            dimension = dimension,
            archetype = archetype,
            primaryColor = pick.first,
            cloakColor = pick.second,
            accentColor = pick.third,
            weapon = weapon,
            hpBonus = ((rng() * 30).toInt() / 5) * 5,
            speedMul = 0.95f + rng() * 0.25f,
            spriteGrid = grid
        )
    }

    fun generateRig3DFromPrompt(seed: Int, prompt: String, presetId: String = "guardian_mint"): GeneratedRig3DSpec {
        val arch = when {
            prompt.lowercase().contains("ksatria") || prompt.lowercase().contains("knight") -> "Knight"
            prompt.lowercase().contains("mage") || prompt.lowercase().contains("penyihir") -> "Mage"
            prompt.lowercase().contains("rogue") || prompt.lowercase().contains("ninja") -> "Rogue"
            else -> "Guardian"
        }
        val atelier = ATELIER_PRESETS[presetId] ?: ATELIER_PRESETS.getValue("guardian_mint")
        val base = generateCharacter(seed, "3D-Stack", arch)
        return GeneratedRig3DSpec(
            character = base.copy(name = prompt.ifBlank { base.name }, cloakColor = atelier.tint),
            atelier = atelier
        )
    }

    fun parseAtelierSetupJson(rawJson: String): Pair<Boolean, GeneratedCharacterSpec?> {
        return try {
            val root = Json.parseToJsonElement(rawJson).jsonObject
            val settings = root["settings"]?.jsonObject ?: return false to null
            val tint = settings["tint"]?.jsonPrimitive?.content ?: "#b3ffe0"
            val sy = settings["sy"]?.jsonPrimitive?.floatOrNull ?: 1f
            val base = generateCharacter(777, "3D-Stack", "Guardian")
            true to base.copy(cloakColor = tint, speedMul = (1f / sy.coerceIn(0.6f, 1.5f)))
        } catch (_: Throwable) {
            false to null
        }
    }

    fun generateImageSpriteFromPrompt(seed: Int, prompt: String, styleId: ArtStyleId): GeneratedImageSpriteSpec {
        val rng = BytecodeVm.createSeedRng(seed + prompt.hashCode())
        val spec = ArtStyles.getStyleSpec(styleId)
        val palette = listOf(spec.palette[1], spec.palette[2], spec.palette[3], spec.palette[6])
        val grid = List(16) { r ->
            val chars = CharArray(16) { '.' }
            for (c in 0 until 8) {
                val inside = (r in 2..13 && c in 2..7) && (rng() > 0.28f || c >= 5)
                val token = if (!inside) '.' else when {
                    r < 5 -> '1'
                    c == 3 -> '2'
                    else -> '3'
                }
                chars[c] = token
                chars[15 - c] = token
            }
            String(chars)
        }
        return GeneratedImageSpriteSpec(seed, prompt, 16, palette, grid)
    }

    fun generateMusicTrack(seed: Int, scale: String, bpm: Int): GeneratedTrackSpec {
        val rng = BytecodeVm.createSeedRng(seed)
        val notes = when (scale) {
            "dorian" -> listOf(220f, 246.94f, 261.63f, 293.66f, 329.63f, 369.99f, 392f, 440f)
            "phrygian" -> listOf(196f, 207.65f, 246.94f, 261.63f, 293.66f, 311.13f, 349.23f, 392f)
            else -> listOf(261.63f, 293.66f, 329.63f, 392f, 440f, 523.25f)
        }
        val lead = List(16) { i ->
            if (i % 4 == 3 && rng() < 0.35f) 0f
            else notes[(rng() * notes.size).toInt().coerceIn(0, notes.lastIndex)]
        }
        val bass = List(16) { i ->
            if (i % 2 == 1 && rng() < 0.4f) 0f else notes[i % 3] * 0.5f
        }
        val perc = List(16) { i -> if (i % 4 == 0) 1 else if (i % 2 == 1) 2 else 0 }
        return GeneratedTrackSpec(seed, "Proc ${scale.replaceFirstChar { it.uppercase() }} #$seed", scale, bpm.coerceIn(85, 180), lead, bass, perc)
    }

    fun generateSfxSpec(seed: Int, preset: String): GeneratedSfxSpec {
        val rng = BytecodeVm.createSeedRng(seed)
        val j = 0.9f + rng() * 0.2f
        return when (preset) {
            "slash" -> GeneratedSfxSpec(seed, "Slash", preset, "sawtooth", 480f * j, 150f * j, 0.11f, 0.2f)
            "coin" -> GeneratedSfxSpec(seed, "Coin", preset, "sine", 660f * j, 1080f * j, 0.12f, 0.2f)
            "laser" -> GeneratedSfxSpec(seed, "Laser", preset, "square", 920f * j, 220f * j, 0.15f, 0.18f)
            "impact" -> GeneratedSfxSpec(seed, "Impact", preset, "sawtooth", 180f * j, 55f * j, 0.18f, 0.24f)
            "ui_chime" -> GeneratedSfxSpec(seed, "UI Chime", preset, "triangle", 520f * j, 780f * j, 0.09f, 0.15f)
            else -> GeneratedSfxSpec(seed, "Jump", preset, "triangle", 300f * j, 590f * j, 0.12f, 0.2f)
        }
    }

    fun generateCutsceneSpec(seed: Int, weather: WeatherKind): GeneratedCutsceneSpec {
        return GeneratedCutsceneSpec(
            seed = seed,
            title = "Babak Lentera #$seed",
            durationSec = 6f,
            weather = weather,
            keyframes = listOf(
                CutsceneKeyframe(0f, CharacterAnimState.IDLE, 0.18f, 0.72f, "Bowo mengamati cakrawala.", "none"),
                CutsceneKeyframe(1.2f, CharacterAnimState.WALK, 0.35f, 0.72f, "Melangkah menuju Jembatan Badai.", "dust"),
                CutsceneKeyframe(2.4f, CharacterAnimState.JUMP, 0.50f, 0.48f, "Melompati jurang bayangan!", "spark"),
                CutsceneKeyframe(3.6f, CharacterAnimState.DASH, 0.68f, 0.65f, "Dash Parry menembus proyektil!", "flash"),
                CutsceneKeyframe(4.8f, CharacterAnimState.ATTACK, 0.80f, 0.70f, "Tebasan Lentera Cahaya!", "shake"),
                CutsceneKeyframe(6.0f, CharacterAnimState.IDLE, 0.84f, 0.72f, "Gerbang Timur bersinar terang.", "glow")
            )
        )
    }

    fun composeMovieFromPrompt(prompt: String, seed: Int, weather: WeatherKind): GeneratedCutsceneSpec {
        val verbs = prompt.lowercase().split(Regex("\\s+")).filter { it.isNotBlank() }
        if (verbs.isEmpty()) return generateCutsceneSpec(seed, weather)
        val keyframes = verbs.take(8).mapIndexed { i, v ->
            val pose = when {
                v.contains("lompat") || v.contains("jump") -> CharacterAnimState.JUMP
                v.contains("dash") -> CharacterAnimState.DASH
                v.contains("serang") || v.contains("attack") || v.contains("burst") -> CharacterAnimState.ATTACK
                v.contains("jalan") || v.contains("walk") -> CharacterAnimState.WALK
                else -> CharacterAnimState.IDLE
            }
            val effect = when (pose) {
                CharacterAnimState.ATTACK -> "shake"
                CharacterAnimState.DASH -> "flash"
                CharacterAnimState.JUMP -> "spark"
                else -> "glow"
            }
            CutsceneKeyframe(
                timeSec = i * 1.1f,
                pose = pose,
                xNorm = (0.16f + i * 0.1f).coerceAtMost(0.86f),
                yNorm = if (pose == CharacterAnimState.JUMP) 0.48f else 0.72f,
                caption = "Action: ${v.uppercase()}",
                effect = effect
            )
        }
        return GeneratedCutsceneSpec(seed, "Movie: ${prompt.take(28)}", (keyframes.size * 1.1f).coerceAtLeast(2f), weather, keyframes)
    }

    fun generateTerrainSpec(seed: Int, mode: String, biome: String): GeneratedTerrainSpec {
        val rng = BytecodeVm.createSeedRng(seed)
        val heights = List(48) { i ->
            val wave = sin(i * 0.24 + seed * 0.1) * 28.0 + sin(i * 0.55) * 14.0
            (64 + wave + (rng() - 0.5f) * 18f).roundToInt().coerceIn(22, 132)
        }
        val platforms = listOf(
            GeneratedTerrainPlatform(90, 210, 120),
            GeneratedTerrainPlatform(250, 165, 130),
            GeneratedTerrainPlatform(400, 195, 110)
        )
        return GeneratedTerrainSpec(seed, "${biome.replaceFirstChar { it.uppercase() }} Ridge #$seed", mode, biome, heights, platforms)
    }

    fun generatePropAsset(seed: Int, kind: String): GeneratedPropSpec {
        val color = when (kind) {
            "potion" -> "#f43f5e"
            "chest" -> "#fbbf24"
            "crystal" -> "#38bdf8"
            else -> "#f97316"
        }
        val grid = listOf(
            "....##....",
            "...####...",
            "..######..",
            "..######..",
            ".########.",
            ".########.",
            "..######..",
            "..######..",
            "...####...",
            "....##...."
        )
        return GeneratedPropSpec(seed, "${kind.replaceFirstChar { it.uppercase() }} #$seed", kind, color, grid)
    }

    fun generateStateMachineSpec(seed: Int, kind: String, prompt: String = "Hero"): GeneratedStateMachineSpec {
        return if (kind == "behavior") {
            GeneratedStateMachineSpec(
                seed, "behavior", "patrol",
                listOf("patrol", "alert", "chase", "telegraph", "attack", "retreat"),
                listOf(
                    FsmTransitionSpec("patrol", "player_in_180px", "alert", "hp > 0"),
                    FsmTransitionSpec("alert", "los_confirmed", "chase", "cooldown <= 0"),
                    FsmTransitionSpec("chase", "dist < 48px", "telegraph", "grounded"),
                    FsmTransitionSpec("telegraph", "windup_done", "attack", "true"),
                    FsmTransitionSpec("attack", "hp < 30%", "retreat", "isBoss == false")
                ),
                "SET 1\nSPAWN 2\nSAY 10\nEND"
            )
        } else {
            GeneratedStateMachineSpec(
                seed, "movement", "idle",
                listOf("idle", "walk", "jump", "fall", "dash", "attack"),
                listOf(
                    FsmTransitionSpec("idle", "moveX != 0", "walk", "grounded"),
                    FsmTransitionSpec("walk", "jumpPressed", "jump", "coyote > 0"),
                    FsmTransitionSpec("jump", "vy > 0", "fall", "!grounded"),
                    FsmTransitionSpec("fall", "dashPressed", "dash", "dashCd <= 0"),
                    FsmTransitionSpec("walk", "attackPressed", "attack", "atkCd <= 0")
                ),
                "SET 8\nADD 4\nSAY 1\nEND"
            )
        }
    }

    fun generateGameplaySceneAndRules(seed: Int, prompt: String): GeneratedGameplayBundleSpec {
        val q = prompt.lowercase()
        val genreId = when {
            q.contains("space") || q.contains("shooter") -> "shooter"
            q.contains("race") || q.contains("mode-7") || q.contains("turbo") -> "racing"
            q.contains("iso") || q.contains("rpg") -> "rpg"
            q.contains("rhythm") || q.contains("beat") -> "rhythm"
            q.contains("defense") || q.contains("tower") -> "tower_defense"
            else -> "platformer"
        }
        val simKind = GameSimulationData.simKindForGenre(genreId)
        val phys = if (genreId == "shooter") PhysicsMode.ZERO_G else PhysicsMode.ARCADE
        val render = if (q.contains("2d")) RenderMode.MODE_2D else RenderMode.MODE_2_5D
        val weather = if (q.contains("badai") || q.contains("storm") || q.contains("rain")) WeatherKind.HUJAN else WeatherKind.CERAH
        return GeneratedGameplayBundleSpec(
            seed = seed,
            title = prompt.ifBlank { "Bowo Quest" },
            genreId = genreId,
            simKind = simKind,
            physicsMode = phys,
            renderMode = render,
            weather = weather,
            rules = listOf(
                EventRuleSpec("gen_1", "shard_collect", "score_100", true),
                EventRuleSpec("gen_2", "enemy_defeated", "heal_10", true),
                EventRuleSpec("gen_3", "switch_activated", "bonus_coin", true)
            ),
            uiHudTokens = listOf("HP_BAR", "ENERGY_RING", "SHARD_COUNTER", "COMBO_BADGE")
        )
    }

    fun generateDubbingSubtitleSpec(seed: Int, speaker: String, line: String, lang: String): GeneratedDubbingSpec {
        val cleanLine = line.ifBlank { "Nyalakan Lentera Cahaya sekarang!" }
        val dur = maxOf(1.6f, cleanLine.split(" ").size * 0.42f)
        val endSec = String.format("00:00:%02d,%03d", dur.toInt(), ((dur - dur.toInt()) * 1000).toInt())
        val vttEnd = endSec.replace(',', '.')
        val srt = "1\n00:00:00,000 --> $endSec\n$speaker: $cleanLine"
        val vtt = "WEBVTT\n\n00:00:00.000 --> $vttEnd\n$speaker: $cleanLine"
        return GeneratedDubbingSpec(seed, speaker.ifBlank { "Bowo" }, cleanLine, lang, dur, 1.0f, 1.0f, srt, vtt)
    }

    fun generatePlatformTargetSpec(seed: Int, target: String, appName: String): GeneratedPlatformTargetSpec {
        val cleanName = appName.ifBlank { "Bowo V7" }
        val pkg = "com.aistudio." + cleanName.lowercase().replace(Regex("[^a-z0-9]"), "").ifBlank { "mungil" }
        val cfg = when (target) {
            "apk" -> """{
  "appName": "$cleanName",
  "packageId": "$pkg",
  "minSdk": 24,
  "targetSdk": 36,
  "itelA70Profile": { "targetFps": 30, "heapLimitMb": 48, "drawCallsMax": 24 }
}"""
            "mcp" -> """{
  "server": "mungil-mcp-local",
  "tools": ["mungil.create_level", "mungil.run_qolbu_audit", "mungil.switch_perspective"],
  "appName": "$cleanName"
}"""
            "ai_engine" -> """{
  "engine": "Mungil-Qolbu-V7",
  "aiTickHz": 15,
  "soACapacity": 1024,
  "hybridModes": 5
}"""
            else -> """{
  "name": "$cleanName",
  "display": "standalone",
  "offlineCache": true
}"""
        }
        return GeneratedPlatformTargetSpec(seed, target, cleanName, pkg, "Target config ready for $target ($pkg)", cfg)
    }
}
