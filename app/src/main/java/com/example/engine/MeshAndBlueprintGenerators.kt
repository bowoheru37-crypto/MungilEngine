package com.example.engine

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

object MeshAndBlueprintGenerators {
    fun generateMesh3DFromPrompt(
        seed: Int,
        prompt: String,
        category: String = "character",
        sourceRepoId: String = "gh_tripo_sr",
        boxOnly: Boolean = false
    ): GeneratedMesh3DSpec {
        val vertices = mutableListOf<Mesh3DVertex>()
        val triangles = mutableListOf<Mesh3DTriangle>()

        if (boxOnly) {
            val s = 0.65f
            vertices.addAll(listOf(
                Mesh3DVertex(-s, -s, -s), Mesh3DVertex(s, -s, -s), Mesh3DVertex(s, s, -s), Mesh3DVertex(-s, s, -s),
                Mesh3DVertex(-s, -s, s), Mesh3DVertex(s, -s, s), Mesh3DVertex(s, s, s), Mesh3DVertex(-s, s, s)
            ))
            val faces = listOf(
                intArrayOf(0, 1, 2), intArrayOf(0, 2, 3),
                intArrayOf(4, 6, 5), intArrayOf(4, 7, 6),
                intArrayOf(0, 4, 5), intArrayOf(0, 5, 1),
                intArrayOf(3, 2, 6), intArrayOf(3, 6, 7),
                intArrayOf(0, 3, 7), intArrayOf(0, 7, 4),
                intArrayOf(1, 5, 6), intArrayOf(1, 6, 2)
            )
            faces.forEachIndexed { idx, f ->
                triangles.add(Mesh3DTriangle(f[0], f[1], f[2], if (idx % 2 == 0) "#38bdf8" else "#0284c7"))
            }
        } else {
            val rings = if (category == "character") 7 else 5
            val segs = if (category == "character") 10 else 8
            val rng = BytecodeVm.createSeedRng(seed + prompt.hashCode())
            for (r in 0..rings) {
                val y = -0.9f + (r.toFloat() / rings) * 1.8f
                val radius = when {
                    category == "character" && r == rings -> 0.16f
                    category == "character" && r >= rings - 2 -> 0.34f
                    category == "character" && r in 2..4 -> 0.48f + rng() * 0.08f
                    else -> 0.28f + sin((r.toFloat() / rings) * PI.toFloat()) * 0.42f
                }
                for (s in 0 until segs) {
                    val theta = (s.toFloat() / segs) * 2f * PI.toFloat()
                    vertices.add(Mesh3DVertex(cos(theta) * radius, y, sin(theta) * radius))
                }
            }
            for (r in 0 until rings) {
                for (s in 0 until segs) {
                    val nextS = (s + 1) % segs
                    val i0 = r * segs + s
                    val i1 = r * segs + nextS
                    val i2 = (r + 1) * segs + s
                    val i3 = (r + 1) * segs + nextS
                    val col = when {
                        r >= rings - 2 -> "#fde047"
                        r % 2 == 0 -> "#38bdf8"
                        else -> "#34d399"
                    }
                    triangles.add(Mesh3DTriangle(i0, i1, i3, col))
                    triangles.add(Mesh3DTriangle(i0, i3, i2, col))
                }
            }
        }

        val objBuilder = StringBuilder("# Mungil Engine V7 Low-Poly Mesh ($prompt)\n")
        vertices.forEach { v -> objBuilder.append(String.format("v %.3f %.3f %.3f\n", v.x, v.y, v.z)) }
        triangles.forEach { t -> objBuilder.append("f ${t.a + 1} ${t.b + 1} ${t.c + 1}\n") }

        val gltf = """{
  "asset": { "version": "2.0", "generator": "Mungil-Engine-V7" },
  "scene": 0,
  "scenes": [{ "nodes": [0] }],
  "nodes": [{ "mesh": 0, "name": "${prompt.take(24)}" }],
  "meshes": [{ "name": "$category", "primitives": [{ "mode": 4, "triCount": ${triangles.size} }] }]
}"""

        val t0 = triangles.size
        return GeneratedMesh3DSpec(
            seed = seed,
            prompt = prompt,
            category = category,
            sourceRepo = sourceRepoId,
            vertices = vertices,
            triangles = triangles,
            lodCounts = Triple(t0, maxOf(8, (t0 * 0.6f).toInt()), maxOf(4, (t0 * 0.3f).toInt())),
            objText = objBuilder.toString(),
            gltfJson = gltf,
            budgetOk = t0 <= Space3DConstants.CHAR_TRIS_LIMIT
        )
    }

    fun generateCompleteGameBlueprint(
        seed: Int,
        prompt: String,
        activeRepoId: String = "gh_axmol"
    ): GeneratedGameBlueprintSpec {
        val q = prompt.lowercase()
        val cameraPreset = when {
            q.contains("raycast") || q.contains("fps") -> Camera3DPresetId.FPS_RAYCAST
            q.contains("isometric") || q.contains("iso") || q.contains("hex") -> Camera3DPresetId.ISO_FIXED
            else -> Camera3DPresetId.FOLLOW_3_4
        }
        val hybridMode = when {
            q.contains("raycast") || q.contains("fps") -> HybridRender5Mode.RAYCAST_PSEUDO3D
            q.contains("mode-7") || q.contains("race") || q.contains("turbo") -> HybridRender5Mode.MODE7_VOXEL
            q.contains("isometric") || q.contains("iso") -> HybridRender5Mode.ISOMETRIC_PAINTER
            q.contains("3d") -> HybridRender5Mode.REAL_3D_LOWPOLY
            else -> HybridRender5Mode.HYBRID_2_5D_BILLBOARD
        }
        val perspective = when (hybridMode) {
            HybridRender5Mode.RAYCAST_PSEUDO3D -> PerspectiveConnectorId.FAKE_3D_RAYCAST
            HybridRender5Mode.ISOMETRIC_PAINTER -> PerspectiveConnectorId.ISOMETRIC
            HybridRender5Mode.MODE7_VOXEL -> PerspectiveConnectorId.PARALLAX_2_5D
            HybridRender5Mode.REAL_3D_LOWPOLY -> PerspectiveConnectorId.THIRD_PERSON
            else -> PerspectiveConnectorId.PARALLAX_2_5D
        }
        val aiMode = when {
            q.contains("autopilot") -> AiPlayMode.AUTOPILOT
            q.contains("co-op") || q.contains("coop") || q.contains("bareng") -> AiPlayMode.COOP
            else -> AiPlayMode.COOP
        }
        val genreId = when {
            q.contains("race") || q.contains("mode-7") -> "racing"
            q.contains("danmaku") || q.contains("space") || q.contains("shooter") -> "shooter"
            q.contains("isometric") || q.contains("rpg") -> "rpg"
            q.contains("hex") || q.contains("bastion") -> "tower_defense"
            else -> "platformer"
        }
        val styleId = when {
            q.contains("cyber") || q.contains("neon") -> ArtStyleId.CYBERPUNK
            q.contains("voxel") -> ArtStyleId.VOXEL
            q.contains("anime") -> ArtStyleId.ANIME
            else -> ArtStyleId.PIXEL
        }
        val weather = if (q.contains("storm") || q.contains("badai") || q.contains("rain")) WeatherKind.HUJAN else WeatherKind.CERAH
        val prefabs = listOf(
            BlueprintPrefabSpec("Hero Bowo Rig", "player", "character", 120, "Capsule/Box"),
            BlueprintPrefabSpec("Guardian Mob", "enemy", "prop", 64, "Circle"),
            BlueprintPrefabSpec("Light Relic", "pickup", "prop", 24, "Trigger")
        )
        return GeneratedGameBlueprintSpec(
            seed = seed,
            title = prompt.ifBlank { "Mungil Quest Forge" },
            prompt = prompt,
            genreId = genreId,
            simKind = GameSimulationData.simKindForGenre(genreId),
            perspective = perspective,
            cameraPreset = cameraPreset,
            hybridMode = hybridMode,
            physicsMode = if (genreId == "shooter") PhysicsMode.ZERO_G else PhysicsMode.ARCADE,
            renderMode = RenderMode.MODE_2_5D,
            styleId = styleId,
            weather = weather,
            aiMode = aiMode,
            repoStack = listOf(activeRepoId, "gh_axmol", "gh_mcp_game_deck"),
            prefabs = prefabs,
            levelQuests = listOf(
                "Ch 1: Collect Shards & Awaken Shrine",
                "Ch 2: Activate Switches & Reflect Bolts",
                "Ch 3: Defeat Boss Kala & Escape Gate"
            ),
            rules = listOf(
                EventRuleSpec("bp_1", "shard_collect", "score_100", true),
                EventRuleSpec("bp_2", "enemy_defeated", "heal_10", true)
            ),
            budgetReport = BlueprintBudgetReport(
                targetFps = 30,
                drawCallsEst = 18,
                trisEst = 208,
                heapMbEst = 21.5f,
                passesA70 = true
            )
        )
    }
}
