package com.example.engine

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

object GitHubConnectors {
    val CURATED_GITHUB_PLUGINS: List<GitHubRepoPlugin> = listOf(
        GitHubRepoPlugin("gh_42_cub3d", "AghlaAbdo/42_Cub3D", "https://github.com/AghlaAbdo/42_Cub3D", GitHubRepoCategory.FAKE_3D_RAYCAST, "MIT", "42-School", "16x16 grid DDA raycast, textured wall slicing, yaw-only Camera C.", listOf(PerspectiveConnectorId.FAKE_3D_RAYCAST, PerspectiveConnectorId.FIRST_PERSON), HybridRender5Mode.RAYCAST_PSEUDO3D, Camera3DPresetId.FPS_RAYCAST, 28, 1200),
        GitHubRepoPlugin("gh_wolfenstein_ray", "shiro1307/raycast_wolfenstein_renderer", "https://github.com/shiro1307/raycast_wolfenstein_renderer", GitHubRepoCategory.FAKE_3D_RAYCAST, "MIT", "Raycast", "Vertical column DDA traversal with depth darkening fog.", listOf(PerspectiveConnectorId.FAKE_3D_RAYCAST, PerspectiveConnectorId.FIRST_PERSON), HybridRender5Mode.RAYCAST_PSEUDO3D, Camera3DPresetId.FPS_RAYCAST, 26, 1000),
        GitHubRepoPlugin("gh_tinyraycaster", "ssloy/tinyraycaster", "https://github.com/ssloy/tinyraycaster", GitHubRepoCategory.FAKE_3D_RAYCAST, "WTFPL/MIT", "3.2k★", "Minimalist software raycaster & billboard Z-buffer sprite sorting.", listOf(PerspectiveConnectorId.FAKE_3D_RAYCAST, PerspectiveConnectorId.FIRST_PERSON, PerspectiveConnectorId.PSEUDO_3D_ZSTACK), HybridRender5Mode.RAYCAST_PSEUDO3D, Camera3DPresetId.FPS_RAYCAST, 24, 800),
        GitHubRepoPlugin("gh_awk_raycaster", "TheMozg/awk-raycaster", "https://github.com/TheMozg/awk-raycaster", GitHubRepoCategory.FAKE_3D_RAYCAST, "MIT", "1.1k★", "Zero-dependency integer DDA stepping with tiny LUT trig tables.", listOf(PerspectiveConnectorId.FAKE_3D_RAYCAST, PerspectiveConnectorId.FIRST_PERSON), HybridRender5Mode.RAYCAST_PSEUDO3D, Camera3DPresetId.FPS_RAYCAST, 18, 400),
        GitHubRepoPlugin("gh_fake_racer", "johnatas-henrique/fake-racer", "https://github.com/johnatas-henrique/fake-racer", GitHubRepoCategory.MODE7_VOXEL, "MIT", "OutRun-JS", "Segment road curve projection + depth-scaled roadside sprites.", listOf(PerspectiveConnectorId.THIRD_PERSON, PerspectiveConnectorId.PARALLAX_2_5D), HybridRender5Mode.MODE7_VOXEL, Camera3DPresetId.FOLLOW_3_4, 20, 2400),
        GitHubRepoPlugin("gh_mode7_floorcast", "Garebear/MODE-7-FLOORCAST", "https://github.com/Garebear", GitHubRepoCategory.MODE7_VOXEL, "MIT", "Mode-7", "Scanline perspective floor casting with zero-WebGL CPU pixel strips.", listOf(PerspectiveConnectorId.PARALLAX_2_5D, PerspectiveConnectorId.THIRD_PERSON), HybridRender5Mode.MODE7_VOXEL, Camera3DPresetId.FOLLOW_3_4, 16, 1600),
        GitHubRepoPlugin("gh_wurfel_engine", "odaymichael/Wurfel-Engine", "https://github.com/odaymichael/Wurfel-Engine", GitHubRepoCategory.MODE7_VOXEL, "Apache-2.0", "Voxel-2.5D", "Heightmap terrain ray-marching & isometric voxel layer stamping.", listOf(PerspectiveConnectorId.PSEUDO_3D_ZSTACK, PerspectiveConnectorId.ISOMETRIC, PerspectiveConnectorId.PARALLAX_2_5D), HybridRender5Mode.MODE7_VOXEL, Camera3DPresetId.FOLLOW_3_4, 24, 6400),
        GitHubRepoPlugin("gh_trafficcone", "j03m/trafficcone", "https://github.com/j03m/trafficcone", GitHubRepoCategory.ISOMETRIC_2_5D, "MIT", "Iso-2.5D", "Lightweight isometric tile picking, painter sort & extruded prisms.", listOf(PerspectiveConnectorId.ISOMETRIC, PerspectiveConnectorId.HEXAGONAL, PerspectiveConnectorId.TOP_DOWN), HybridRender5Mode.ISOMETRIC_PAINTER, Camera3DPresetId.ISO_FIXED, 20, 4200),
        GitHubRepoPlugin("gh_pixscape", "Pixscape/pixscape", "https://github.com/Pixscape", GitHubRepoCategory.ISOMETRIC_2_5D, "MIT", "2.5D-Canvas", "2.5D layered sprite stacking, depth sorting & soft contact shadows.", listOf(PerspectiveConnectorId.PSEUDO_3D_ZSTACK, PerspectiveConnectorId.ISOMETRIC, PerspectiveConnectorId.PARALLAX_2_5D), HybridRender5Mode.HYBRID_2_5D_BILLBOARD, Camera3DPresetId.FOLLOW_3_4, 22, 3600),
        GitHubRepoPlugin("gh_detonator", "ensisoft/detonator", "https://github.com/ensisoft/detonator", GitHubRepoCategory.ISOMETRIC_2_5D, "GPL-3.0", "C++/GLES", "2D/2.5D scene graph hierarchy, container transforms & fixed-step physics.", listOf(PerspectiveConnectorId.SIDE_2D_H, PerspectiveConnectorId.SIDE_2D_V, PerspectiveConnectorId.TOP_DOWN, PerspectiveConnectorId.PARALLAX_2_5D), HybridRender5Mode.HYBRID_2_5D_BILLBOARD, Camera3DPresetId.FOLLOW_3_4, 26, 8000),
        GitHubRepoPlugin("gh_rbfx", "rbfx/rbfx", "https://github.com/rbfx/rbfx", GitHubRepoCategory.ISOMETRIC_2_5D, "MIT", "1.2k★", "Forward mobile 1-shader pipeline, LOD groups, and node scene serialization.", listOf(PerspectiveConnectorId.THIRD_PERSON, PerspectiveConnectorId.ISOMETRIC, PerspectiveConnectorId.FIRST_PERSON), HybridRender5Mode.REAL_3D_LOWPOLY, Camera3DPresetId.FOLLOW_3_4, 32, 24000),
        GitHubRepoPlugin("gh_pixalo", "pixalo/pixalo", "https://github.com/pixalo/pixalo", GitHubRepoCategory.WEB_MOBILE_LIGHTWEIGHT, "MIT", "Web-2D", "Zero-bloat 2D loop with responsive mobile touch controls.", listOf(PerspectiveConnectorId.SIDE_2D_H, PerspectiveConnectorId.SIDE_2D_V, PerspectiveConnectorId.TOP_DOWN), HybridRender5Mode.HYBRID_2_5D_BILLBOARD, Camera3DPresetId.FOLLOW_3_4, 18, 2000),
        GitHubRepoPlugin("gh_melonjs", "melonjs/melonJS", "https://github.com/melonjs/melonJS", GitHubRepoCategory.WEB_MOBILE_LIGHTWEIGHT, "MIT", "5.5k★", "Tilemap culling, object pooling & mobile viewport scaling.", listOf(PerspectiveConnectorId.SIDE_2D_H, PerspectiveConnectorId.ISOMETRIC, PerspectiveConnectorId.TOP_DOWN), HybridRender5Mode.ISOMETRIC_PAINTER, Camera3DPresetId.ISO_FIXED, 24, 3500),
        GitHubRepoPlugin("gh_axmol", "axmolengine/axmol", "https://github.com/axmolengine/axmol", GitHubRepoCategory.WEB_MOBILE_LIGHTWEIGHT, "MIT", "2.1k★", "Auto-batching draw calls <35, 1024x1024 atlas packing, Android ARM64/Go.", listOf(PerspectiveConnectorId.SIDE_2D_H, PerspectiveConnectorId.PARALLAX_2_5D, PerspectiveConnectorId.PSEUDO_3D_ZSTACK), HybridRender5Mode.HYBRID_2_5D_BILLBOARD, Camera3DPresetId.FOLLOW_3_4, 22, 16000),
        GitHubRepoPlugin("gh_skylicht", "skylicht-lab/skylicht-engine", "https://github.com/skylicht-lab/skylicht-engine", GitHubRepoCategory.WEB_MOBILE_LIGHTWEIGHT, "MIT", "GLES3", "Mobile-first forward rendering, frustum culling, 3-level LOD & fog.", listOf(PerspectiveConnectorId.THIRD_PERSON, PerspectiveConnectorId.ISOMETRIC, PerspectiveConnectorId.FIRST_PERSON), HybridRender5Mode.REAL_3D_LOWPOLY, Camera3DPresetId.FOLLOW_3_4, 30, 44000),
        GitHubRepoPlugin("gh_defold", "defold/defold", "https://github.com/defold/defold", GitHubRepoCategory.WEB_MOBILE_LIGHTWEIGHT, "Defold-1.0", "5.1k★", "Ultra-compact binary runtime, 0-GC collection proxies & rig animation.", listOf(PerspectiveConnectorId.SIDE_2D_H, PerspectiveConnectorId.PARALLAX_2_5D, PerspectiveConnectorId.ISOMETRIC, PerspectiveConnectorId.THIRD_PERSON), HybridRender5Mode.HYBRID_2_5D_BILLBOARD, Camera3DPresetId.FOLLOW_3_4, 18, 18000),
        GitHubRepoPlugin("gh_tripo_sr", "VAST-AI-Research/TripoSR", "https://github.com/VAST-AI-Research/TripoSR", GitHubRepoCategory.MESH_3D_GENERATORS, "MIT", "7.4k★", "Image/Text-to-3D silhouette lofting, decimated <=800 tri character & glTF export.", listOf(PerspectiveConnectorId.PSEUDO_3D_ZSTACK, PerspectiveConnectorId.THIRD_PERSON, PerspectiveConnectorId.ISOMETRIC), HybridRender5Mode.REAL_3D_LOWPOLY, Camera3DPresetId.FOLLOW_3_4, 14, 800),
        GitHubRepoPlugin("gh_meshy_lowpoly", "mrdoob/three.js-exporter-gltf", "https://github.com/mrdoob/three.js", GitHubRepoCategory.MESH_3D_GENERATORS, "MIT", "glTF-2.0", "Low-poly primitive/lathe composition + 3-tier LOD decimation & OBJ/glTF pack.", listOf(PerspectiveConnectorId.PSEUDO_3D_ZSTACK, PerspectiveConnectorId.THIRD_PERSON, PerspectiveConnectorId.ISOMETRIC), HybridRender5Mode.REAL_3D_LOWPOLY, Camera3DPresetId.ISO_FIXED, 12, 800),
        GitHubRepoPlugin("gh_zdog_stack", "metafizzy/zdog", "https://github.com/metafizzy/zdog", GitHubRepoCategory.MESH_3D_GENERATORS, "MIT", "10.6k★", "Round-cap pseudo-3D vector modeling on Canvas 2D with zero WebGL overhead.", listOf(PerspectiveConnectorId.PSEUDO_3D_ZSTACK, PerspectiveConnectorId.PARALLAX_2_5D), HybridRender5Mode.HYBRID_2_5D_BILLBOARD, Camera3DPresetId.FOLLOW_3_4, 12, 200),
        GitHubRepoPlugin("gh_mcp_game_deck", "mcp-game-deck/mcp-game-deck", "https://github.com/modelcontextprotocol/servers", GitHubRepoCategory.AI_GAME_GENERATORS, "MIT", "MCP-Ready", "Prompt -> playable level blueprint, event rules, 16-bit bytecode & AI Co-Op driver.", listOf(PerspectiveConnectorId.SIDE_2D_H, PerspectiveConnectorId.ISOMETRIC, PerspectiveConnectorId.HEXAGONAL, PerspectiveConnectorId.TOP_DOWN, PerspectiveConnectorId.THIRD_PERSON), HybridRender5Mode.HYBRID_2_5D_BILLBOARD, Camera3DPresetId.FOLLOW_3_4, 20, 12000),
        GitHubRepoPlugin("gh_instaplay_gen", "instaplay-ai/zero-code-game-forge", "https://github.com/topics/game-generator", GitHubRepoCategory.AI_GAME_GENERATORS, "Apache-2.0", "AI-Forge", "Single-prompt genre fusion, 3-prefab A70 budget validator & instant playable launch.", listOf(PerspectiveConnectorId.PARALLAX_2_5D, PerspectiveConnectorId.ISOMETRIC, PerspectiveConnectorId.FIRST_PERSON, PerspectiveConnectorId.THIRD_PERSON), HybridRender5Mode.HYBRID_2_5D_BILLBOARD, Camera3DPresetId.FOLLOW_3_4, 22, 18000)
    )

    fun filterCuratedGitHubPlugins(
        query: String,
        category: GitHubRepoCategory = GitHubRepoCategory.ALL
    ): List<GitHubRepoPlugin> {
        val q = query.trim().lowercase()
        return CURATED_GITHUB_PLUGINS.filter { item ->
            val catMatch = category == GitHubRepoCategory.ALL || item.category == category
            val qMatch = q.isEmpty() ||
                item.repo.lowercase().contains(q) ||
                item.dnaPattern.lowercase().contains(q) ||
                item.category.label.lowercase().contains(q) ||
                item.supportedPerspectives.any { it.id.lowercase().contains(q) }
            catMatch && qMatch
        }
    }

    data class GitHubSearchResponse(
        val results: List<GitHubRepoPlugin>,
        val mode: String,
        val note: String
    )

    suspend fun searchGitHubReposWithFallback(
        query: String,
        category: GitHubRepoCategory = GitHubRepoCategory.ALL
    ): GitHubSearchResponse = withContext(Dispatchers.IO) {
        val localMatches = filterCuratedGitHubPlugins(query, category)
        val cleanQuery = query.trim().ifEmpty { "lightweight game engine raycaster" }
        try {
            val encoded = URLEncoder.encode("$cleanQuery in:name,description", "UTF-8")
            val url = URL("https://api.github.com/search/repositories?q=$encoded&sort=stars&order=desc&per_page=6")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 2800
                readTimeout = 2800
                setRequestProperty("Accept", "application/vnd.github+json")
                setRequestProperty("User-Agent", "MungilEngine-Android")
            }
            if (conn.responseCode !in 200..299) {
                return@withContext GitHubSearchResponse(
                    localMatches,
                    "curated-offline",
                    "GitHub API returned ${conn.responseCode} — using curated offline patterns."
                )
            }
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val root = Json.parseToJsonElement(body).jsonObject
            val items = root["items"]?.jsonArray ?: emptyList()
            val liveItems = items.mapNotNull { el ->
                val obj = el.jsonObject
                val id = obj["id"]?.jsonPrimitive?.intOrNull ?: return@mapNotNull null
                val fullName = obj["full_name"]?.jsonPrimitive?.content ?: return@mapNotNull null
                val htmlUrl = obj["html_url"]?.jsonPrimitive?.content ?: ""
                val stars = obj["stargazers_count"]?.jsonPrimitive?.intOrNull ?: 0
                val desc = (obj["description"]?.jsonPrimitive?.content ?: "Lightweight game repository pattern.").take(120)
                val lower = "$fullName $desc".lowercase()
                val cat = when {
                    lower.contains("raycast") -> GitHubRepoCategory.FAKE_3D_RAYCAST
                    lower.contains("iso") -> GitHubRepoCategory.ISOMETRIC_2_5D
                    lower.contains("3d") || lower.contains("mesh") || lower.contains("gltf") -> GitHubRepoCategory.MESH_3D_GENERATORS
                    lower.contains("mcp") || lower.contains("ai") -> GitHubRepoCategory.AI_GAME_GENERATORS
                    else -> GitHubRepoCategory.WEB_MOBILE_LIGHTWEIGHT
                }
                val starsLabel = if (stars >= 1000) String.format("%.1fk★", stars / 1000f) else "${stars}★"
                GitHubRepoPlugin(
                    id = "gh_live_$id",
                    repo = fullName,
                    url = htmlUrl,
                    category = cat,
                    license = "OSS",
                    starsLabel = starsLabel,
                    dnaPattern = desc,
                    supportedPerspectives = listOf(PerspectiveConnectorId.SIDE_2D_H, PerspectiveConnectorId.PARALLAX_2_5D, PerspectiveConnectorId.THIRD_PERSON),
                    recommendedHybridMode = if (cat == GitHubRepoCategory.FAKE_3D_RAYCAST) HybridRender5Mode.RAYCAST_PSEUDO3D else HybridRender5Mode.HYBRID_2_5D_BILLBOARD,
                    recommendedCamera = if (cat == GitHubRepoCategory.FAKE_3D_RAYCAST) Camera3DPresetId.FPS_RAYCAST else Camera3DPresetId.FOLLOW_3_4,
                    maxDrawCallsBudget = 24,
                    maxTrisBudget = if (cat == GitHubRepoCategory.MESH_3D_GENERATORS) 800 else 12000,
                    source = "live-github"
                )
            }
            val seen = localMatches.map { it.repo.lowercase() }.toHashSet()
            val merged = localMatches + liveItems.filter { !seen.contains(it.repo.lowercase()) }
            GitHubSearchResponse(
                results = if (merged.isNotEmpty()) merged else CURATED_GITHUB_PLUGINS.take(6),
                mode = if (liveItems.isNotEmpty()) "live-github" else "curated-offline",
                note = if (liveItems.isNotEmpty()) "Synced ${liveItems.size} live GitHub repos + curated patterns." else "Loaded curated offline patterns."
            )
        } catch (_: Throwable) {
            GitHubSearchResponse(
                localMatches,
                "curated-offline",
                "Offline / timeout fallback — loaded curated cleanroom GitHub patterns."
            )
        }
    }
}
