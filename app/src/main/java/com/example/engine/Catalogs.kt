package com.example.engine

object Catalogs {
    val GENRE_TEMPLATES: List<GenreTemplate> = listOf(
        GenreTemplate("platformer", "2D Action Platformer", RenderMode.MODE_2_5D, PhysicsMode.ARCADE, ArtStyleId.PIXEL, WeatherKind.CERAH, 1f, 1f, "Classic side-scrolling jump, parry, and Light Shard adventure."),
        GenreTemplate("rpg", "Top-Down Action RPG", RenderMode.MODE_2_5D, PhysicsMode.ARCADE, ArtStyleId.ANIME, WeatherKind.CERAH, 0f, 1.05f, "Free 8-way village & shrine dungeon exploration with melee combos."),
        GenreTemplate("shooter", "Space Shoot-Em-Up", RenderMode.MODE_2D, PhysicsMode.ZERO_G, ArtStyleId.CYBERPUNK, WeatherKind.CERAH, 0f, 1.25f, "Zero-gravity thruster dodging and luminous blaster waves."),
        GenreTemplate("racing", "Mode-7 Turbo Dash", RenderMode.MODE_2_5D, PhysicsMode.ARCADE, ArtStyleId.RETRO, WeatherKind.CERAH, 0f, 1.35f, "Pseudo-3D horizon speed runs with boost rings and obstacles."),
        GenreTemplate("puzzle", "Light Switch Puzzle", RenderMode.MODE_2D, PhysicsMode.ARCADE, ArtStyleId.MINIMAL, WeatherKind.CERAH, 0.9f, 0.9f, "Precision switch routing and crystal beam alignment."),
        GenreTemplate("roguelike", "Procedural Crypt", RenderMode.MODE_2D, PhysicsMode.ARCADE, ArtStyleId.SILHOUETTE, WeatherKind.SALJU, 1f, 1.05f, "Seed-driven dungeon waves with randomized loot pickups."),
        GenreTemplate("rhythm", "Beat Parry Quest", RenderMode.MODE_2_5D, PhysicsMode.ARCADE, ArtStyleId.CHIBI, WeatherKind.CERAH, 0.95f, 1f, "Timed parry & dash sync challenges with glowing hit rings."),
        GenreTemplate("tower_defense", "Lantern Defense", RenderMode.MODE_2_5D, PhysicsMode.ARCADE, ArtStyleId.ISOMETRIC, WeatherKind.HUJAN, 0f, 0.95f, "Protect the Village Gate from escalating shadow patrols."),
        GenreTemplate("survival", "Blizzard Survival", RenderMode.MODE_2_5D, PhysicsMode.REALISTIC, ArtStyleId.WATERCOLOR, WeatherKind.SALJU, 1.05f, 0.9f, "Heavy winter inertia, stamina conservation, and warm shrines."),
        GenreTemplate("fighting", "1v1 Boss Duel", RenderMode.MODE_2_5D, PhysicsMode.ARCADE, ArtStyleId.ANIME, WeatherKind.HUJAN, 1.1f, 1.15f, "Tight arena combat focused on Dash Parry and Burst counters."),
        GenreTemplate("brawler", "Street Beat-Em-Up", RenderMode.MODE_2_5D, PhysicsMode.ARCADE, ArtStyleId.CARTOON, WeatherKind.CERAH, 0f, 1.1f, "Lane-based multi-enemy melee waves with knockback combos."),
        GenreTemplate("metroidvania", "Shadow Keep", RenderMode.MODE_2D, PhysicsMode.ARCADE, ArtStyleId.LOWPOLY, WeatherKind.HUJAN, 1f, 1f, "Interconnected shrine platforms with double-jump verticality."),
        GenreTemplate("simulation", "Village Steward", RenderMode.MODE_2_5D, PhysicsMode.REALISTIC, ArtStyleId.VOXEL, WeatherKind.CERAH, 0.85f, 0.85f, "Calm village patrol, resource gathering, and weather cycles."),
        GenreTemplate("idle", "Auto-Coin Collector", RenderMode.MODE_2D, PhysicsMode.ARCADE, ArtStyleId.CHIBI, WeatherKind.CERAH, 0.85f, 1.15f, "Relaxed coin magnet collection and passive shrine upgrades."),
        GenreTemplate("visual_novel", "Story Sanctuary", RenderMode.MODE_2_5D, PhysicsMode.ARCADE, ArtStyleId.WATERCOLOR, WeatherKind.CERAH, 0.7f, 0.8f, "Narrative exploration of Desa Fajar with branching choices."),
        GenreTemplate("ai_arena", "Qolbu AI Co-Op & Autopilot", RenderMode.MODE_3D_STACK, PhysicsMode.ARCADE, ArtStyleId.CYBERPUNK, WeatherKind.CERAH, 1f, 1.1f, "3D-Stack hero with 15Hz Luma AI Companion or full Autopilot mode.")
    )

    val ASSET_CATALOG: List<AssetCatalogItem> = listOf(
        AssetCatalogItem("bowo_hero", "Bowo Guardian Rig", "Character", 18, "Procedural animated hero with articulated limbs, cloak sway, and weapon arcs."),
        AssetCatalogItem("luma_companion", "Luma Light Wisp", "Companion", 4, "Floating companion aura sprite that tracks Bowo with spring damping."),
        AssetCatalogItem("slime_mob", "Shadow Slime", "Enemy", 6, "Bouncing patrol enemy with squash-and-stretch deformation."),
        AssetCatalogItem("wisp_ranged", "Dark Wisp Shooter", "Enemy", 8, "Hovering turret firing parry-able energy bolts."),
        AssetCatalogItem("sentinel_heavy", "Obsidian Sentinel", "Enemy", 12, "Armored shield guard with telegraph wind-up ring."),
        AssetCatalogItem("boss_kala", "Boss Kala (3-Phase)", "Boss", 24, "Menara Kala ruler with multi-orb radial bursts and phase enrages."),
        AssetCatalogItem("dawn_tiles", "Dawn Village Tileset", "Environment", 14, "Layered grass, stone brick, wooden bridges, and lantern posts."),
        AssetCatalogItem("storm_bridge", "Storm Bridge Props", "Environment", 16, "Floor pressure switches, rain streaks, and lightning clouds."),
        AssetCatalogItem("sfx_pack", "4-Channel Synth Audio", "Audio", 0, "Zero-KB procedural AudioTrack tracker BGM + 18 sound effects."),
        AssetCatalogItem("particle_pool", "160-Slot Particle Ring", "VFX", 6, "Zero-GC particle pool for slashes, dust, sparks, and healing bursts.")
    )

    val REPO_CREDITS: List<RepoCredit> = listOf(
        RepoCredit("A", "GDevelop", "MIT", "https://github.com/4ian/GDevelop", "No-Code WHEN -> THEN Event Sheet rule engine"),
        RepoCredit("A", "LÖVE2D", "zlib", "https://github.com/love2d/love", "Fixed-timestep dt clamp & lightweight 2D canvas loop"),
        RepoCredit("A", "Phaser", "MIT", "https://github.com/phaserjs/phaser", "Arcade AABB physics, coyote time, & jump buffering"),
        RepoCredit("A", "Godot Engine", "MIT", "https://github.com/godotengine/godot", "Node scene architecture & pause-aware processing"),
        RepoCredit("A", "PixiJS", "MIT", "https://github.com/pixijs/pixijs", "High-throughput 2D draw batching & DPR resolution cap"),
        RepoCredit("A", "Defold", "Defold-1.0", "https://github.com/defold/defold", "Under-2 MB memory footprint & zero-GC object pools"),
        RepoCredit("A", "bitecs", "MIT", "https://github.com/NateTheGregg/bitecs", "Structure-of-Arrays (SoA) TypedArray entity memory"),
        RepoCredit("A", "Excalibur.js", "BSD-2-Clause", "https://github.com/excaliburjs/Excalibur", "Clean entity lifecycle & debug collider overlay"),
        RepoCredit("A", "Kontra.js", "MIT", "https://github.com/straker/kontra", "Compact sprite pools & tiny touch-first bundle"),
        RepoCredit("A", "Three.js", "MIT", "https://github.com/mrdoob/three.js", "2.5D depth layering & camera projection math"),
        RepoCredit("B", "Aseprite", "EULA/Open", "https://github.com/aseprite/aseprite", "16x16 / 32x32 indexed pixel sprite editor grid"),
        RepoCredit("B", "Tiled", "GPL/BSD", "https://github.com/mapeditor/tiled", "12x8 tilemap painting & export schema"),
        RepoCredit("B", "DragonBones", "MIT", "https://github.com/DragonBones/DragonBonesJS", "Procedural articulated limb & cloak animation"),
        RepoCredit("B", "Spine-inspired", "Custom", "https://esotericsoftware.com", "Keyframe interpolation & hitstop timing curves"),
        RepoCredit("B", "ZzFX", "MIT", "https://github.com/KilledByAPixel/ZzFX", "Micro procedural sound effect synthesis"),
        RepoCredit("B", "Tone.js", "MIT", "https://github.com/Tonejs/Tone.js", "Scheduled step-sequencer tracker music timing"),
        RepoCredit("B", "Tiny-Canvas", "MIT", "https://github.com/bitnenfer/tiny-canvas", "Low-overhead draw call minimization"),
        RepoCredit("B", "Matter.js", "MIT", "https://github.com/liabru/matter-js", "Physics preset intuition (Arcade / Realistic / Zero-G)"),
        RepoCredit("B", "NippleJS", "MIT", "https://github.com/yoannmoinet/nipplejs", "Ergonomic virtual analog joystick deadzones"),
        RepoCredit("B", "LocalForage", "Apache-2.0", "https://github.com/localForage/localForage", "Resilient offline save-slot persistence"),
        RepoCredit("B", "Workbox", "MIT", "https://github.com/GoogleChrome/workbox", "Offline-first caching & update lifecycle"),
        RepoCredit("B", "Seedrandom", "MIT", "https://github.com/davidbau/seedrandom", "Deterministic xorshift32 procedural worlds"),
        RepoCredit("B", "Box2D-inspired", "MIT", "https://github.com/erincatto/box2d", "Swept AABB & impulse separation stability"),
        RepoCredit("C", "Colyseus", "MIT", "https://github.com/colyseus/colyseus", "Authoritative state snapshot pattern"),
        RepoCredit("C", "Nakama", "Apache-2.0", "https://github.com/heroiclabs/nakama", "Profile, leaderboard, & cloud-sync contract"),
        RepoCredit("C", "i18next", "MIT", "https://github.com/i18next/i18next", "Multi-language reactive dictionary design"),
        RepoCredit("C", "OpenTelemetry", "Apache-2.0", "https://github.com/open-telemetry", "Lightweight session & frame-time telemetry"),
        RepoCredit("C", "LuaJIT-inspired", "MIT", "https://github.com/LuaJIT/LuaJIT", "Register-based compact 16-bit bytecode VM"),
        RepoCredit("C", "RLE-Packer", "Public Domain", "https://en.wikipedia.org/wiki/Run-length_encoding", "Deterministic binary .pak compression"),
        RepoCredit("C", "FNV-1a", "Public Domain", "https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function", "Fast save-file integrity checksum verification"),
        RepoCredit("C", "A11y-Focus", "W3C", "https://www.w3.org/WAI/", "WCAG touch target (>=48dp) & high-contrast rules"),
        RepoCredit("C", "AndroidX-Compose", "Apache-2.0", "https://developer.android.com/jetpack/compose", "Native Kotlin & Jetpack Compose rendering")
    )

    val THIRD_PARTY_NOTICES_TEXT = """Mungil Engine V7 — Bowo: Guardian of Light
Cleanroom Architectural Attribution & Third-Party Notices

This application does NOT copy external proprietary source code or copyrighted assets.
All visual sprites, procedural audio tracks, bytecode VM instructions, ECS arrays,
physics integrators, and game logic are original cleanroom implementations written
in Kotlin & Jetpack Compose.

Architectural inspiration credits (Tier A / B / C open-source ecosystem):
- GDevelop, Phaser, Godot, LÖVE2D, PixiJS, Defold, bitecs, Excalibur.js, Kontra.js, Three.js
- Aseprite, Tiled, DragonBones, ZzFX, Tone.js, Matter.js, NippleJS, Workbox, Seedrandom, Box2D
- Colyseus, Nakama, i18next, OpenTelemetry, LuaJIT-style Bytecode, RLE, FNV-1a, WCAG 2.2 AA

License: MIT / Apache-2.0 compatible cleanroom implementation."""

    val API_REFERENCE_EXAMPLES: List<Triple<String, String, String>> = listOf(
        Triple("E.create(name, x, y, hp)", "E.create('Slime', 420, 300, 30)", "Spawns a tracked entity at world coordinates."),
        Triple("E.move(id, dx, dy)", "E.move('Bowo', 4, -8)", "Applies instant displacement or impulse."),
        Triple("E.on(event, action)", "E.on('shard_collect', 'score_100')", "Registers a No-Code event rule hook."),
        Triple("E.playSound(sfx)", "E.playSound('parry')", "Triggers procedural AudioTrack sound effect."),
        Triple("E.setMode(mode)", "E.setMode('2.5D')", "Switches between 2D, 2.5D, and 3D-Stack."),
        Triple("E.setPhysics(mode)", "E.setPhysics('Zero-G')", "Switches Arcade, Realistic, or Zero-G gravity."),
        Triple("E.cameraShake(intensity)", "E.cameraShake(8)", "Triggers screen shake respecting Reduce Shake.")
    )

    data class SandboxSku(val id: String, val title: String, val price: String, val coins: Int, val potions: Int, val desc: String)

    val SANDBOX_SKUS: List<SandboxSku> = listOf(
        SandboxSku("starter_pack", "Lantern Starter Pack", "Free Sandbox", 150, 2, "Adds 150 Light Coins & 2 Healing Potions offline."),
        SandboxSku("guardian_relic", "Guardian Relic Bundle", "Demo Token", 400, 4, "Simulates validated in-app entitlement without billing."),
        SandboxSku("kala_challenger", "Menara Kala Elixir", "Demo Token", 250, 5, "Refills emergency potions for Boss Kala Practice.")
    )

    val ENGINE_DOCS_SECTIONS: List<Pair<String, String>> = listOf(
        "Architecture Overview" to "Mungil Engine V7 separates simulation (GameSimulation), zero-GC data storage (SoAWorld & ParticlePool), procedural Canvas rendering (ArtStyles & QolbuSpace3D), and native AudioTrack synthesis so the entire engine runs offline with minimal memory overhead.",
        "Adding a New Enemy or Level" to "Add a new enemy archetype in GameSimulation.kt, give it a procedural renderer in GameCanvasRenderers.kt, and declare its spawn data in LEVEL_DEFINITIONS.",
        "Offline Save & Migration Security" to "All save slots store JSON in SharedPreferences protected with an FNV-1a checksum. Legacy v6.1 saves are migrated automatically to v7.0.0 with tamper clamping on HP, coins, and shards.",
        "Low-Entry Android Optimization (Itel A70)" to "Eco tier locks 30 FPS fixed timestep, disables expensive blurs, caps particles at 60 slots, and keeps heap steady via ring buffers and LRU asset unloading."
    )

    data class RepoMatrixEntry(val name: String, val license: String, val what: String, val adapt: String)

    val KEYWORD_TOP5_REPOS: Map<String, List<RepoMatrixEntry>> = mapOf(
        "fake_3d" to listOf(
            RepoMatrixEntry("AghlaAbdo/42_Cub3D", "MIT", "16x16 DDA raycaster with wall slicing", "Cleanroom DDA corridor renderer"),
            RepoMatrixEntry("ssloy/tinyraycaster", "WTFPL/MIT", "Minimal Z-buffer billboard sprite sorting", "Billboards + Z-buffer depth fog"),
            RepoMatrixEntry("TheMozg/awk-raycaster", "MIT", "Zero-dependency integer DDA & LUT trig", "Low-CPU mobile trig approximation"),
            RepoMatrixEntry("johnatas-henrique/fake-racer", "MIT", "OutRun Mode-7 segment curve projection", "Mode-7 horizon road/ground renderer"),
            RepoMatrixEntry("odaymichael/Wurfel-Engine", "Apache-2.0", "Voxel-Space terrain column ray-marching", "Voxel heightmap terrain generator")
        ),
        "pseudo_3d" to listOf(
            RepoMatrixEntry("metafizzy/zdog", "MIT", "Round-cap pseudo-3D vector modeling", "3D-Stack capsule limb & cloak layering"),
            RepoMatrixEntry("Pixscape/pixscape", "MIT", "2.5D layered sprite stacking & contact shadow", "5-slice Bowo hero depth stack"),
            RepoMatrixEntry("j03m/trafficcone", "MIT", "Isometric tile picking & painter sort", "Isometric diamond sorting order"),
            RepoMatrixEntry("Garebear/MODE-7-FLOORCAST", "MIT", "Scanline perspective floor casting", "Zero-WebGL floor strip perspective"),
            RepoMatrixEntry("mrdoob/three.js", "MIT", "Camera projection & fog math", "Y-Up LookAt + Perspective matrix")
        ),
        "2_5d" to listOf(
            RepoMatrixEntry("ensisoft/detonator", "GPL-3.0", "2.5D scene hierarchy & container transforms", "Parent-child Scene Hierarchy + keep-world"),
            RepoMatrixEntry("rbfx/rbfx", "MIT", "Forward mobile 1-shader & LOD pipeline", "3-level LOD & <=24 draw call budget"),
            RepoMatrixEntry("melonjs/melonJS", "MIT", "Tilemap culling & object pooling", "Viewport frustum & circle culling"),
            RepoMatrixEntry("axmolengine/axmol", "MIT", "Auto-batching <35 draw calls for ARM64", "2D/2.5D batch pass counter"),
            RepoMatrixEntry("skylicht-lab/skylicht-engine", "MIT", "Mobile forward culling & fog", "35m cull radius & smooth fog curve")
        ),
        "web_engine" to listOf(
            RepoMatrixEntry("pixalo/pixalo", "MIT", "Zero-bloat responsive touch 2D loop", "Customizable mobile virtual joystick"),
            RepoMatrixEntry("phaserjs/phaser", "MIT", "Arcade AABB, coyote time & jump buffer", "110ms coyote time & 120ms jump buffer"),
            RepoMatrixEntry("straker/kontra", "MIT", "Tiny sprite pool & modular loop", "Fixed-timestep dt clamp accumulator"),
            RepoMatrixEntry("4ian/GDevelop", "MIT", "No-Code WHEN -> THEN Event Sheet", "Live editable Event Sheet rules"),
            RepoMatrixEntry("NateTheGregg/bitecs", "MIT", "SoA TypedArray zero-GC ECS", "Pre-allocated FloatArray/IntArray SoAWorld")
        ),
        "mobile_engine" to listOf(
            RepoMatrixEntry("defold/defold", "Defold-1.0", "Ultra-compact 0-GC collection proxies", "2 MB Eco LRU AssetManager bundles"),
            RepoMatrixEntry("love2d/love", "zlib", "Simple fixed-step mobile game loop", "30/60 Hz Eco/HD profiler"),
            RepoMatrixEntry("KilledByAPixel/ZzFX", "MIT", "Procedural 0-KB audio synthesizer", "Native AudioTrack procedural SFX & tracker"),
            RepoMatrixEntry("VAST-AI-Research/TripoSR", "MIT", "Decimated <=800 tri character & glTF export", "Procedural low-poly mesh + OBJ/glTF"),
            RepoMatrixEntry("mcp-game-deck/mcp-game-deck", "MIT", "Prompt -> playable blueprint & AI driver", "16-tool Local MCP Hub & Complete Forge")
        )
    )

    data class GeneratorGroupEntry(val title: String, val repos: List<Triple<String, String, String>>)

    val GENERATOR_TOP3_REPOS: List<GeneratorGroupEntry> = listOf(
        GeneratorGroupEntry(
            "1. Image & Sprite Generators",
            listOf(
                Triple("aseprite/aseprite", "MIT-inspired", "16x16 & 32x32 indexed grid painter"),
                Triple("sanderfrenken/Universal-LPC", "CC-BY-SA", "Layered humanoid archetype generator"),
                Triple("pixscape/sprite-stack", "MIT", "Symmetrical pixel-to-sprite generator")
            )
        ),
        GeneratorGroupEntry(
            "2. Character Rig & 3D Mesh Generators",
            listOf(
                Triple("VAST-AI-Research/TripoSR", "MIT", "<=800 tri stylized silhouette mesh"),
                Triple("metafizzy/zdog", "MIT", "Articulated 3D-Stack vector limbs"),
                Triple("mrdoob/three.js-exporter-gltf", "MIT", "Standard glTF 2.0 & Wavefront OBJ")
            )
        ),
        GeneratorGroupEntry(
            "3. Audio, Tracker & Dubbing Generators",
            listOf(
                Triple("KilledByAPixel/ZzFX", "MIT", "Procedural sweep & envelope SFX"),
                Triple("Tonejs/Tone.js", "MIT", "16-step multi-scale music tracker"),
                Triple("W3C/WebVTT", "W3C", "SRT / WebVTT timed dubbing subtitles")
            )
        ),
        GeneratorGroupEntry(
            "4. Video, Cutscene & Terrain Generators",
            listOf(
                Triple("odaymichael/Wurfel-Engine", "Apache-2.0", "48-column voxel heightmap terrain"),
                Triple("johnatas-henrique/fake-racer", "MIT", "Mode-7 horizon parallax road"),
                Triple("esotericsoftware/spine-runtime", "Custom", "Verb-driven timeline keyframe sequencer")
            )
        ),
        GeneratorGroupEntry(
            "5. Full Game, FSM & Target Export",
            listOf(
                Triple("4ian/GDevelop", "MIT", "No-Code WHEN -> THEN gameplay bundle"),
                Triple("mcp-game-deck/mcp-game-deck", "MIT", "1-prompt Complete Game Blueprint"),
                Triple("Android/AGP-Kotlin-Compose", "Apache-2.0", "Native Itel A70 SDK 24-36 APK target")
            )
        )
    )
}
