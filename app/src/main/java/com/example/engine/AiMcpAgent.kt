package com.example.engine

data class AiCompanionState(
    var active: Boolean = false,
    var x: Float = 80f,
    var y: Float = 220f,
    var healCooldown: Float = 4f,
    var thinkTimer: Float = 0f,
    var lastActionText: String = "Standby"
)

data class McpToolSpec(
    val id: String,
    val name: String,
    val desc: String,
    val params: String
)

data class TutorialStep(
    val step: Int,
    val title: String,
    val desc: String,
    val targetTab: StudioTab
)

data class QolbuEngineTopic(
    val id: String,
    val title: String,
    val summary: String,
    val detail: String,
    val tab: StudioTab
)

data class AgentChatMessage(
    val from: String,
    val text: String,
    val recommendedTab: StudioTab? = null,
    val toolUsed: String? = null
)

object AiMcpAgent {
    val TUTORIAL_STEPS: List<TutorialStep> = listOf(
        TutorialStep(1, "Pilih Chapter & Genre", "Pilih Desa Fajar, Jembatan Badai, Menara Kala, atau 16 genre di tab Play.", StudioTab.PLAY),
        TutorialStep(2, "Atur Tombol Sentuh", "Sesuaikan ukuran tombol >=48dp & layout D-Pad untuk jempol Itel A70.", StudioTab.CONTROLS),
        TutorialStep(3, "Ganti Art Style 1-Tap", "Coba Pixel, Anime, Cyberpunk, Watercolor, hingga Raycast 3D.", StudioTab.ART),
        TutorialStep(4, "Buat Hero & Musik Sendiri", "Generate karakter 2D/3D-Stack & BGM chiptune di tab Generators.", StudioTab.GENERATORS),
        TutorialStep(5, "Pasang Physics Preset", "Pilih Bouncy, Heavy, Ghost, atau Slippery di Scene & Inspector.", StudioTab.SCENE),
        TutorialStep(6, "Grup & Edit Collision", "Gabungkan beberapa objek ke CONTAINER dan geser collider di Scene.", StudioTab.SCENE),
        TutorialStep(7, "Cek Rules & 15Hz AI", "Tambahkan aturan WHEN -> THEN No-Code dan cek 9 Larangan Mutlak di Lab.", StudioTab.LAB),
        TutorialStep(8, "Rakit Game via Wizard", "Gunakan Pembantu Buat Game 5 langkah untuk menciptakan game barumu.", StudioTab.AGENT),
        TutorialStep(9, "Main Bareng / Lawan AI", "Uji Mode Solo AI, Co-Play Qolbu, atau Boss Kala Adaptif di Arena AI.", StudioTab.ARENA),
        TutorialStep(10, "Export Offline / APK Pack", "Simpan JSON, MPAK7 .pak, atau Android Gradle Build Pack.", StudioTab.EXPORT)
    )

    val QOLBU_ENGINE_TOPICS: List<QolbuEngineTopic> = listOf(
        QolbuEngineTopic("gc", "Zero-GC SoA Game Loop", "Array pre-allocated tanpa new/delete di tengah frame.", "Mencegah GC pause 150ms di Android RAM 3GB (Itel A70) dengan recycle slot free-list.", StudioTab.LAB),
        QolbuEngineTopic("layers", "7-Layer Unified Core", "Foundation -> Assets -> World -> FD Lite Render -> FSM -> 15Hz AI -> Audio Pool.", "Menyatukan 25+ teknik top repo GitHub agar semua sistem tetap di bawah 35 draw call.", StudioTab.LAB),
        QolbuEngineTopic("presets", "6 Physics Presets", "Normal, Bouncy, Heavy, Ghost, Slippery, dan Ball siap pakai 1-tap.", "Langsung mengisi mass, friction, restitution, gravityScale, linearDamp, isTrigger, & CCD.", StudioTab.SCENE),
        QolbuEngineTopic("group", "Group Entities & Container", "Parent-child hierarchy dengan keep-world math.", "Move/Scale/Rotate Container menggerakkan seluruh child secara proporsional.", StudioTab.SCENE),
        QolbuEngineTopic("collision", "Collision Shape Editor", "Box, Circle, dan Polygon interaktif dengan deteksi overlap real-time.", "Menampilkan status Aman, Dekat <8px, atau Overlap + kedalaman penetrasi px.", StudioTab.SCENE),
        QolbuEngineTopic("ai15hz", "15Hz Eco AI Decimation", "AI berpikir tiap 2 frame pada tier Eco — hemat 50% CPU & baterai.", "Fisika & render tetap halus 30/60 FPS, sementara evaluasi Utility AI/FSM dijalankan di 15Hz.", StudioTab.ARENA),
        QolbuEngineTopic("mcp", "Local MCP Hub (16 Tools)", "Protokol Client -> Server -> Editor Bridge lokal tanpa API key.", "Menghubungkan agen Qolbu langsung ke Scene, Generator, Lab, Arena AI, dan Export.", StudioTab.AGENT),
        QolbuEngineTopic("fsm", "Table-Driven FSM + Spring", "8 pose karakter + 2-bone damped spring untuk jubah Bowo.", "Menggantikan if/else panjang dengan tabel prioritas + pegas ringan.", StudioTab.ART),
        QolbuEngineTopic("security", "IsValidMove Security Guard", "Tolak koordinat NaN/Infinity dan clamp speed-hack teleportasi.", "Berjalan di kernel simulasi utama dan Qolbu Arena AI sebelum resolusi batas dunia.", StudioTab.LAB),
        QolbuEngineTopic("audio", "AudioTrack Synth Pool", "Musik 3-channel chiptune & spatial pan SFX 0 KB aset eksternal.", "Otomatis suspend saat aplikasi background dan meredupkan BGM saat efek pukul aktif.", StudioTab.GENERATORS),
        QolbuEngineTopic("memory", "2 MB Eco LRU Asset Budget", "Auto-evict biome lama saat pindah chapter agar bebas OOM.", "Hero rig di-pin di memori, sedangkan peta chapter sebelumnya dibersihkan otomatis.", StudioTab.ASSETS),
        QolbuEngineTopic("apk", "Android APK & Build Pack", "Native Compose Android + ProGuard + R8 optimasi Itel A70.", "Menyediakan manifest, Gradle DSL, dan tabel migrasi AndroidX.", StudioTab.EXPORT)
    )

    val LOCAL_MCP_TOOLS: List<McpToolSpec> = listOf(
        McpToolSpec("list_tools", "list_tools", "Tampilkan daftar seluruh 16 tool MCP lokal aktif.", "{}"),
        McpToolSpec("explain_engine", "explain_engine", "Jelaskan layer arsitektur, Zero-GC, atau 15Hz AI.", "{ topic: \"gc\" }"),
        McpToolSpec("guide_player", "guide_player", "Beri panduan langkah tutorial & hint HP/stuck.", "{ step: 1 }"),
        McpToolSpec("create_game", "create_game", "Buat game baru dari Wizard dan simpan ke Koleksi.", "{ genre: \"Arena\" }"),
        McpToolSpec("spawn_entity", "spawn_entity", "Tambah entitas baru ke Scene Hierarchy.", "{ type: \"Enemy\", preset: \"BOUNCY\" }"),
        McpToolSpec("set_physics_preset", "set_physics_preset", "Terapkan Physics Preset ke entitas terpilih.", "{ preset: \"SLIPPERY\" }"),
        McpToolSpec("group_entities", "group_entities", "Gabungkan 2+ entitas menjadi CONTAINER grup.", "{ name: \"Squad Alpha\" }"),
        McpToolSpec("edit_collision_shape", "edit_collision_shape", "Ubah bentuk collider ke Box/Circle/Polygon.", "{ type: \"Circle\", r: 24 }"),
        McpToolSpec("generate_asset", "generate_asset", "Sintesis karakter 3D-Stack baru untuk Bowo.", "{ archetype: \"Knight\" }"),
        McpToolSpec("generate_level", "generate_level", "Bangkitkan terrain & platform baru secara prosedural.", "{ biome: \"storm\" }"),
        McpToolSpec("generate_dialog", "generate_dialog", "Buat dialog pembuka chapter dari tema saat ini.", "{ chapter: 2 }"),
        McpToolSpec("validate_game", "validate_game", "Jalankan audit cepat 9 Larangan Mutlak & 25 Check.", "{}"),
        McpToolSpec("export_game", "export_game", "Buka tab Export untuk download HTML/JSON/PAK.", "{ target: \"apk_pack\" }"),
        McpToolSpec("play_ai", "play_ai", "Jalankan Qolbu Arena dalam mode Solo AI (Coach).", "{ mode: \"solo\" }"),
        McpToolSpec("co_play_ai", "co_play_ai", "Main Co-Op bersama Companion Qolbu AI.", "{ mode: \"coplay\" }"),
        McpToolSpec("vs_ai", "vs_ai", "Tantang Boss Kala Adaptif di Arena VS AI.", "{ mode: \"vs\" }")
    )

    val STARTER_WIZARD_GAMES: List<WizardGameSpec> = listOf(
        WizardGameSpec("starter_lentera_runner", "Lentera Runner", "Runner", "Bowo Api", "Bowo Kilat", "SLIPPERY", "Jembatan Cahaya", 3, 4, "Sendiri", "Normal", 60, "2026-01-01T00:00:00Z"),
        WizardGameSpec("starter_arena_kala", "Arena Kala Mini", "Arena", "Ksatria Cahaya", "Guardian", "NORMAL", "Arena Qolbu", 1, 3, "Lawan", "Hard", 90, "2026-01-01T00:00:00Z"),
        WizardGameSpec("starter_rpg_fajar", "RPG Desa Fajar", "RPG", "Penjaga Desa", "Bowo & Qolbu", "BOUNCY", "Desa Fajar", 4, 5, "Bareng", "Easy", 120, "2026-01-01T00:00:00Z")
    )

    fun buildWizardGameSpec(
        name: String,
        genre: String,
        sprite: String,
        characterName: String,
        preset: String,
        map: String,
        enemies: Int,
        items: Int,
        aiMode: String,
        difficulty: String,
        durationSec: Int
    ): WizardGameSpec = WizardGameSpec(
        id = "game_${System.currentTimeMillis().toString(36)}",
        name = name.trim().ifBlank { "$genre Qolbu" },
        genre = genre,
        sprite = sprite.ifBlank { "Bowo Guardian" },
        characterName = characterName.trim().ifBlank { "Bowo" },
        preset = preset,
        map = map,
        enemies = enemies.coerceIn(1, 6),
        items = items.coerceIn(2, 6),
        aiMode = aiMode,
        difficulty = difficulty,
        durationSec = durationSec.coerceIn(30, 300),
        createdAt = "2026-11-25T00:00:00Z"
    )

    fun askQolbuAgent(question: String): Pair<String, StudioTab?> {
        val q = question.lowercase().trim()
        return when {
            q.isEmpty() -> "Tanyakan tentang Zero-GC, Physics Preset, Group Entities, Collision Editor, 15Hz AI, MCP, atau APK Build Pack!" to null
            q.contains("gc") || q.contains("lag") || q.contains("itel") || q.contains("memori") ->
                "Itel A70 dijaga oleh 9 Larangan Mutlak: SoA Pool 1024 slot (Zero-GC), AI 15Hz Eco (hemat 50% CPU), draw call <35, dan LRU Asset Budget 2 MB." to StudioTab.LAB
            q.contains("preset") || q.contains("bouncy") || q.contains("heavy") || q.contains("ghost") || q.contains("fisika") ->
                "Di tab Scene & Inspector tersedia 6 preset 1-tap: NORMAL, BOUNCY, HEAVY, GHOST (trigger tembus), SLIPPERY (licin), dan BALL (CCD anti-tembus)." to StudioTab.SCENE
            q.contains("group") || q.contains("grup") || q.contains("container") ->
                "Pilih >=2 entitas di Hierarchy lalu tekan Group Entities untuk membentuk parent CONTAINER dengan keep-world math." to StudioTab.SCENE
            q.contains("collision") || q.contains("tabrak") || q.contains("hitbox") ->
                "Collision Shape Editor mendukung Box, Circle, dan Polygon yang dapat digeser di kanvas dengan indikator Aman/Dekat/Overlap." to StudioTab.SCENE
            q.contains("mcp") || q.contains("tool") ->
                "MCP Hub lokal berjalan 100% offline dengan 16 tool aktif tanpa memerlukan API key eksternal." to StudioTab.AGENT
            q.contains("ai") || q.contains("arena") || q.contains("kala") ->
                "Qolbu Arena AI mendukung 3 mode: Solo AI (Coach directive), Co-Play (Qolbu auto-heal <40% + 1x revive), dan VS Boss Kala." to StudioTab.ARENA
            q.contains("apk") || q.contains("android") || q.contains("export") ->
                "Tab Export menyediakan Android APK Build Pack + MPAK7 RLE .pak dan manifest offline." to StudioTab.EXPORT
            else ->
                "Qolbu AI siap membantu! Gunakan Scene untuk Fisika/Grup/Collider, AI & MCP untuk Wizard game baru, atau Arena AI untuk bermain bersama AI." to StudioTab.AGENT
        }
    }

    fun routePromptWithTrace(
        prompt: String,
        activeLevel: Int,
        onSwitchConnector: (PerspectiveConnectorId) -> Unit,
        onSwitchAiMode: (AiPlayMode) -> Unit,
        onSetGameName: (String) -> Unit
    ): Triple<String, String, StudioTab?> {
        val q = prompt.lowercase()
        return when {
            q.contains("buatkan") || q.contains("create") || q.contains("isometric") || q.contains("raycast") -> {
                val isIso = q.contains("isometric") || q.contains("iso")
                val isRay = q.contains("raycast") || q.contains("fps")
                val title = when {
                    isIso -> "Isometric Light Quest"
                    isRay -> "Raycast Kala Dungeon"
                    else -> "Cyber Guardian Quest"
                }
                onSetGameName(title)
                onSwitchConnector(when {
                    isIso -> PerspectiveConnectorId.ISOMETRIC
                    isRay -> PerspectiveConnectorId.FAKE_3D_RAYCAST
                    else -> PerspectiveConnectorId.PARALLAX_2_5D
                })
                onSwitchAiMode(AiPlayMode.COOP)
                Triple("Game baru \"$title\" disiapkan dengan perspektif optimal + Luma AI Co-Op aktif!", "mcp.create_game_project", StudioTab.PLAY)
            }
            q.contains("pandu") || q.contains("boss") || q.contains("menang") -> {
                val guide = when (activeLevel) {
                    1 -> "Babak 1 (Desa Fajar): Kumpulkan 2 Light Shard di platform lalu masuki Gerbang Timur."
                    2 -> "Babak 2 (Jembatan Badai): Aktifkan 2 saklar lantai, pantulkan proyektil Wisp dengan Dash Parry, dan ambil 3 Shard."
                    else -> "Babak 3 (Menara Kala): Hindari 3 fase Boss Kala dengan Dash Parry (K), tekan saklar pembuka, dan serang saat jeda telegraph!"
                }
                Triple(guide, "mcp.guide_player", StudioTab.PLAY)
            }
            else -> {
                val (ans, tab) = askQolbuAgent(prompt)
                Triple(ans, "mcp.explain_engine", tab)
            }
        }
    }
}
