package com.example.engine

data class ManagedAsset(
    val id: String,
    val name: String,
    val biome: String,
    val bytes: Int,
    var loaded: Boolean,
    var pinned: Boolean,
    var lastUsedTick: Int,
    var refCount: Int
)

data class AssetLoadResult(
    val loaded: List<String>,
    val unloaded: List<String>
)

data class AssetManagerStats(
    val usedBytes: Int,
    val budgetBytes: Int,
    val loadedCount: Int,
    val evictions: Int
)

class AssetManager(val budgetBytes: Int = 2_097_152) {
    private var tick = 0
    private var evictions = 0
    private val assets: MutableList<ManagedAsset> = mutableListOf(
        ManagedAsset("player_bowo_rig", "Bowo 3D-Stack Hero Rig", "shared", 48_000, loaded = true, pinned = true, lastUsedTick = 1, refCount = 1),
        ManagedAsset("luma_ai_drone", "Luma Companion Wisp", "shared", 16_000, loaded = true, pinned = true, lastUsedTick = 1, refCount = 1),
        ManagedAsset("ui_touch_atlas", "Touch & HUD Atlas", "shared", 28_000, loaded = true, pinned = true, lastUsedTick = 1, refCount = 1),
        ManagedAsset("env_dawn_village", "Desa Fajar Biome", "level1", 180_000, loaded = true, pinned = false, lastUsedTick = 1, refCount = 1),
        ManagedAsset("mob_slime_pack", "Shadow Slime Sprites", "level1", 64_000, loaded = true, pinned = false, lastUsedTick = 1, refCount = 1),
        ManagedAsset("env_storm_bridge", "Jembatan Badai Biome", "level2", 210_000, loaded = false, pinned = false, lastUsedTick = 0, refCount = 0),
        ManagedAsset("mob_wisp_sentinel", "Wisp & Sentinel Pack", "level2", 96_000, loaded = false, pinned = false, lastUsedTick = 0, refCount = 0),
        ManagedAsset("env_menara_kala", "Menara Kala Obsidian", "level3", 260_000, loaded = false, pinned = false, lastUsedTick = 0, refCount = 0),
        ManagedAsset("boss_kala_3phase", "Boss Kala 3-Phase Rig", "level3", 148_000, loaded = false, pinned = false, lastUsedTick = 0, refCount = 0)
    )

    fun listAssets(): List<ManagedAsset> = assets.map { it.copy() }

    fun getUsedBytes(): Int = assets.filter { it.loaded }.sumOf { it.bytes }

    fun getStats(): AssetManagerStats = AssetManagerStats(
        usedBytes = getUsedBytes(),
        budgetBytes = budgetBytes,
        loadedCount = assets.count { it.loaded },
        evictions = evictions
    )

    fun setPinned(id: String, pinned: Boolean) {
        assets.find { it.id == id }?.pinned = pinned
    }

    fun registerGeneratedAsset(id: String, name: String, biome: String = "generated", bytes: Int = 24_000) {
        tick++
        val existing = assets.find { it.id == id }
        if (existing != null) {
            existing.loaded = true
            existing.lastUsedTick = tick
            existing.refCount++
        } else {
            assets.add(ManagedAsset(id, name, biome, bytes, loaded = true, pinned = false, lastUsedTick = tick, refCount = 1))
        }
        enforceBudget()
    }

    fun loadLevelBundle(level: Int): AssetLoadResult {
        tick++
        val targetBiome = "level${level.coerceIn(1, 3)}"
        val loadedNames = mutableListOf<String>()
        val unloadedNames = mutableListOf<String>()

        for (asset in assets) {
            val isLevelBiome = asset.biome.startsWith("level")
            if (isLevelBiome && asset.biome != targetBiome && asset.loaded && !asset.pinned) {
                asset.loaded = false
                asset.refCount = 0
                unloadedNames.add(asset.id)
            }
        }
        for (asset in assets) {
            if (asset.biome == "shared" || asset.biome == targetBiome) {
                asset.loaded = true
                asset.lastUsedTick = tick
                asset.refCount = maxOf(1, asset.refCount)
                loadedNames.add(asset.id)
            }
        }
        enforceBudget()
        return AssetLoadResult(loadedNames, unloadedNames)
    }

    fun unloadUnused(): List<String> {
        val unloaded = mutableListOf<String>()
        for (asset in assets) {
            if (asset.loaded && !asset.pinned && asset.biome != "shared") {
                asset.loaded = false
                asset.refCount = 0
                unloaded.add(asset.id)
            }
        }
        return unloaded
    }

    private fun enforceBudget() {
        while (getUsedBytes() > budgetBytes) {
            val victim = assets
                .filter { it.loaded && !it.pinned }
                .minByOrNull { it.lastUsedTick } ?: break
            victim.loaded = false
            victim.refCount = 0
            evictions++
        }
    }
}

object AgentSkills {
    private const val CORE_SKILL_BODY = """# Mungil Engine V7 — Complete Mobile & Pseudo-3D Game Development Skill

## 1. Core Architecture & Performance Contracts (Itel A70 / Low-Entry Android)
- Fixed-timestep simulation loop: 1/30s (Eco), 1/60s (Mid/HD), clamped dt <= 0.05s, max 3 catch-up steps.
- Zero-GC SoA ECS (SoAWorld): Pre-allocated arrays with O(1) free-list & dense active list.
- Particle ring buffer (ParticlePool, 160 slots): update in-place, never allocate inside frame ticks.
- Dynamic resolution scaling via EMA frame-time tracking (0.60x-1.00x).
- Asset Manager (AssetManager): Ref-counted LRU eviction under 2 MB Eco / 4 MB Standard budget.

## 2. Procedural 2D / 2.5D / Fake-3D Rendering APIs
- drawBowoCharacter(...): 8 animation states (idle | walk | jump | fall | attack | dash | hurt | ko) across 12 Art Styles & 3D-Stack layering.
- renderRaycastCorridor(...): Cleanroom DDA column raycaster with distance fog.
- renderMode7Horizon(...): Scanline perspective ground strip projection.
- renderVoxelHeightmapTerrain(...): Column heightmap ray-marching for 2D/3D terrains.

## 3. Procedural Audio (Zero-KB Footprint)
- SoundEngine.startTracker(level): 3-channel AudioTrack synthesizer (lead + bass + kick/hi-hat) per level (1-3).
- SoundEngine.playSfx(kind): Movement, Combat, Game Events, and UI feedback."""

    fun buildAgentSkillPack(): List<AgentSkillFile> = listOf(
        AgentSkillFile(
            filename = "CLAUDE.md",
            platform = "claude",
            title = "Claude Code Project Instructions + Skill Loader",
            summary = "Place in project root or ~/.claude/skills/mungil-engine/SKILL.md for Claude Code.",
            content = "# CLAUDE.md — Mungil Engine V7 Agent Guide\n\nTarget low-entry Android (Itel A70): <= 24 draw calls/frame, <= 48 MB heap, >= 48dp touch hitboxes.\n\n$CORE_SKILL_BODY"
        ),
        AgentSkillFile(
            filename = "GEMINI.md",
            platform = "gemini",
            title = "Gemini CLI & AI Studio Skill Definition",
            summary = "Place in project root as GEMINI.md or .gemini/skills/mungil-engine/SKILL.md.",
            content = "---\nname: mungil-engine-v7\ndescription: Mobile-first 2D, 2.5D, and Pseudo-3D game engine skill for Itel A70 optimization.\n---\n\n$CORE_SKILL_BODY"
        ),
        AgentSkillFile(
            filename = "GROK_INSTRUCTIONS.md",
            platform = "grok",
            title = "Grok Custom System Instructions & Engine Rules",
            summary = "Paste into Grok Workspaces / Custom Instructions for Mungil Engine V7.",
            content = "# Grok Agent Instructions — Mungil Engine V7\n\nAlways mutate pre-allocated pools in SoAWorld & ParticlePool and pair VFX with SoundEngine.playSfx.\n\n$CORE_SKILL_BODY"
        ),
        AgentSkillFile(
            filename = "QWEN_AGENT.md",
            platform = "qwen",
            title = "Qwen-Coder / Qwen Agent Tooling & Skill Spec",
            summary = "Compatible with Qwen-Agent, Cline/RooCode, and Qwen3-Coder workspace rules.",
            content = "# QWEN_AGENT.md — Mungil Engine V7 Specification\n\nruntime_target: android_low_entry_itel_a70\nfps_budget: 30-60\nmemory_budget_mb: 48\n\n$CORE_SKILL_BODY"
        ),
        AgentSkillFile(
            filename = "AGENTS.md",
            platform = "universal",
            title = "Universal AGENTS.md + MCP Tool Manifest (JSON)",
            summary = "Standard AGENTS.md + JSON tool schema usable across Claude, Gemini, Grok, Qwen, Codex, and Cursor.",
            content = "# AGENTS.md — Universal AI Agent Contract (Mungil Engine V7)\n\nTools: asset_load_level, gen_character, gen_music, gen_sfx, gen_cutscene, gen_terrain\n\n$CORE_SKILL_BODY"
        )
    )

    fun getInstallCommandSnippet(platform: String): String = when (platform) {
        "claude" -> "mkdir -p .claude/skills/mungil-engine && cp CLAUDE.md .claude/skills/mungil-engine/SKILL.md"
        "gemini" -> "mkdir -p .gemini/skills/mungil-engine && cp GEMINI.md .gemini/skills/mungil-engine/SKILL.md"
        "grok" -> "# Copy GROK_INSTRUCTIONS.md into Grok Project / System Instructions"
        "qwen" -> "mkdir -p .qwen/skills && cp QWEN_AGENT.md .qwen/skills/mungil-engine.md"
        else -> "cp AGENTS.md ./AGENTS.md"
    }

    fun exportFullAgentBundleJson(): String {
        val files = buildAgentSkillPack()
        val entries = files.joinToString(",\n") { f ->
            val escaped = f.content.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")
            """    { "filename": "${f.filename}", "platform": "${f.platform}", "title": "${f.title}", "content": "$escaped" }"""
        }
        return "{\n  \"bundle\": \"Mungil-Engine-V7-AI-Agent-Skills\",\n  \"version\": \"7.1.0\",\n  \"files\": [\n$entries\n  ]\n}"
    }
}
