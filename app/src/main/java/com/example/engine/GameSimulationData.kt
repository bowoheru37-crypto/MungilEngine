package com.example.engine

data class SimRect(val x: Float, val y: Float, val w: Float, val h: Float)

data class LevelPlatform(val x: Float, val y: Float, val w: Float, val h: Float)

data class EnemySpawnDef(
    val archetype: String,
    val x: Float,
    val y: Float,
    val patrolMinX: Float,
    val patrolMaxX: Float,
    val hp: Int
)

data class LevelDefinition(
    val level: Int,
    val name: String,
    val worldWidth: Float,
    val worldHeight: Float,
    val groundY: Float,
    val hasBoss: Boolean,
    val requiredShards: Int,
    val requiredSwitches: Int,
    val playerSpawnX: Float,
    val playerSpawnY: Float,
    val gate: SimRect,
    val platforms: List<LevelPlatform>,
    val shards: List<Pair<Float, Float>>,
    val coins: List<Pair<Float, Float>>,
    val switches: List<Pair<Float, Float>>,
    val enemies: List<EnemySpawnDef>
)

data class SimPlayer(
    var x: Float,
    var y: Float,
    var vx: Float = 0f,
    var vy: Float = 0f,
    var w: Float = 26f,
    var h: Float = 36f,
    var facing: Int = 1,
    var hp: Int = 100,
    var maxHp: Int = 100,
    var energy: Float = 100f,
    var maxEnergy: Float = 100f,
    var grounded: Boolean = false,
    var coyoteTimer: Float = 0f,
    var jumpBufferTimer: Float = 0f,
    var attackTimer: Float = 0f,
    var attackCooldown: Float = 0f,
    var dashTimer: Float = 0f,
    var dashCooldown: Float = 0f,
    var parryTimer: Float = 0f,
    var invulnTimer: Float = 0f,
    var hurtFlash: Float = 0f,
    var animState: CharacterAnimState = CharacterAnimState.IDLE,
    val cloakSpring: CloakSpringState = CloakSpringState()
)

data class SimEnemy(
    val id: Int,
    val archetype: String,
    var x: Float,
    var y: Float,
    var vx: Float = 0f,
    var vy: Float = 0f,
    var w: Float = 28f,
    var h: Float = 28f,
    val patrolMinX: Float,
    val patrolMaxX: Float,
    var hp: Int,
    val maxHp: Int,
    var dead: Boolean = false,
    var hurtFlash: Float = 0f,
    var attackTimer: Float = 1.4f,
    var telegraphTimer: Float = 0f,
    var bossPhase: Int = 1,
    var koProgress: Float = 0f
)

data class SimPickup(
    val id: Int,
    var x: Float,
    var y: Float,
    var collected: Boolean = false
)

data class SimSwitch(
    val id: Int,
    val x: Float,
    val y: Float,
    var active: Boolean = false
)

data class SimProjectile(
    val id: Int,
    var x: Float,
    var y: Float,
    var vx: Float,
    var vy: Float,
    var fromPlayer: Boolean,
    val damage: Int,
    var life: Float,
    val r: Float = 5f
)

data class SimBeatNote(
    val id: Int,
    var x: Float,
    var lane: Int,
    var hit: Boolean = false,
    var missed: Boolean = false
)

data class SimTurret(
    val id: Int,
    val x: Float,
    val y: Float,
    var cooldown: Float = 0.6f
)

data class SimConfig(
    val physicsMode: PhysicsMode = PhysicsMode.ARCADE,
    val renderMode: RenderMode = RenderMode.MODE_2_5D,
    val weather: WeatherKind = WeatherKind.CERAH,
    val practiceMode: Boolean = false,
    val speedMul: Float = 1f,
    val gravityMul: Float = 1f,
    val eventRules: List<EventRuleSpec> = emptyList()
)

data class SimInput(
    val moveX: Float = 0f,
    val moveY: Float = 0f,
    val jumpPressed: Boolean = false,
    val jumpHeld: Boolean = false,
    val attackPressed: Boolean = false,
    val dashPressed: Boolean = false,
    val burstPressed: Boolean = false
)

data class SimEvent(
    val type: String,
    val panX: Float = 0f,
    val message: String = ""
)

data class VnStoryNode(
    val speaker: String,
    val text: String,
    val choices: List<Pair<String, Int>>
)

object GameSimulationData {
    val LEVEL_DEFINITIONS: Map<Int, LevelDefinition> = mapOf(
        1 to LevelDefinition(
            level = 1,
            name = "Desa Fajar",
            worldWidth = 980f,
            worldHeight = 420f,
            groundY = 336f,
            hasBoss = false,
            requiredShards = 2,
            requiredSwitches = 0,
            playerSpawnX = 72f,
            playerSpawnY = 280f,
            gate = SimRect(884f, 260f, 44f, 76f),
            platforms = listOf(
                LevelPlatform(180f, 274f, 124f, 16f),
                LevelPlatform(370f, 224f, 134f, 16f),
                LevelPlatform(585f, 268f, 128f, 16f),
                LevelPlatform(748f, 220f, 110f, 16f)
            ),
            shards = listOf(435f to 188f, 795f to 184f),
            coins = listOf(220f to 240f, 255f to 240f, 415f to 190f, 640f to 234f, 710f to 300f),
            switches = emptyList(),
            enemies = listOf(
                EnemySpawnDef("slime", 310f, 308f, 240f, 440f, 36),
                EnemySpawnDef("slime", 615f, 240f, 590f, 698f, 36),
                EnemySpawnDef("wisp", 790f, 152f, 730f, 860f, 42)
            )
        ),
        2 to LevelDefinition(
            level = 2,
            name = "Jembatan Badai",
            worldWidth = 1140f,
            worldHeight = 420f,
            groundY = 336f,
            hasBoss = false,
            requiredShards = 3,
            requiredSwitches = 2,
            playerSpawnX = 72f,
            playerSpawnY = 280f,
            gate = SimRect(1042f, 260f, 44f, 76f),
            platforms = listOf(
                LevelPlatform(190f, 272f, 116f, 16f),
                LevelPlatform(350f, 212f, 140f, 16f),
                LevelPlatform(555f, 252f, 132f, 16f),
                LevelPlatform(740f, 198f, 130f, 16f),
                LevelPlatform(910f, 250f, 108f, 16f)
            ),
            shards = listOf(418f to 176f, 804f to 162f, 964f to 214f),
            coins = listOf(230f to 238f, 385f to 178f, 600f to 218f, 785f to 164f, 880f to 302f),
            switches = listOf(245f to 272f, 620f to 252f),
            enemies = listOf(
                EnemySpawnDef("slime", 320f, 308f, 240f, 480f, 42),
                EnemySpawnDef("wisp", 510f, 150f, 440f, 610f, 48),
                EnemySpawnDef("sentinel", 790f, 294f, 700f, 920f, 64)
            )
        ),
        3 to LevelDefinition(
            level = 3,
            name = "Menara Kala",
            worldWidth = 1180f,
            worldHeight = 420f,
            groundY = 336f,
            hasBoss = true,
            requiredShards = 2,
            requiredSwitches = 1,
            playerSpawnX = 72f,
            playerSpawnY = 280f,
            gate = SimRect(1082f, 260f, 44f, 76f),
            platforms = listOf(
                LevelPlatform(175f, 268f, 120f, 16f),
                LevelPlatform(370f, 214f, 130f, 16f),
                LevelPlatform(590f, 224f, 140f, 16f),
                LevelPlatform(815f, 214f, 130f, 16f)
            ),
            shards = listOf(430f to 178f, 875f to 178f),
            coins = listOf(220f to 234f, 460f to 178f, 650f to 190f, 845f to 178f),
            switches = listOf(656f to 224f),
            enemies = listOf(
                EnemySpawnDef("wisp", 340f, 152f, 290f, 460f, 48),
                EnemySpawnDef("sentinel", 520f, 294f, 440f, 650f, 68),
                EnemySpawnDef("boss_kala", 900f, 272f, 720f, 1020f, 210)
            )
        )
    )

    val VN_STORY_NODES: List<VnStoryNode> = listOf(
        VnStoryNode(
            "Penjaga Desa",
            "Lentera Cahaya mulai meredup di Desa Fajar. Apa langkah pertama Bowo?",
            listOf("Nyalakan Lentera Desa (+150 Skor)" to 150, "Amati Jejak Bayangan (+120 Skor)" to 120)
        ),
        VnStoryNode(
            "Luma Companion",
            "Dua Light Shard bersembunyi di dekat Jembatan Badai. Bagaimana cara melewatinya?",
            listOf("Dash Parry Proyektil Wisp (+180 Skor)" to 180, "Aktifkan Saklar Batu (+140 Skor)" to 140)
        ),
        VnStoryNode(
            "Boss Kala (Bayangan)",
            "Puncak Menara Kala menunggumu! Pilih jurus pamungkas untuk membuka Gerbang Cahaya.",
            listOf("Lantern Burst Penuh (+250 Skor)" to 250, "Refleksi Cahaya Suci (+220 Skor)" to 220)
        )
    )

    fun simKindForGenre(genreId: String): GenreSimulationKind = when (genreId) {
        "rpg", "simulation" -> GenreSimulationKind.TOPDOWN
        "shooter" -> GenreSimulationKind.SHOOTER
        "racing" -> GenreSimulationKind.RUNNER
        "rhythm" -> GenreSimulationKind.RHYTHM
        "brawler", "fighting" -> GenreSimulationKind.BRAWLER
        "tower_defense" -> GenreSimulationKind.DEFENSE
        "idle" -> GenreSimulationKind.COLLECTOR
        "visual_novel" -> GenreSimulationKind.VISUAL_NOVEL
        else -> GenreSimulationKind.PLATFORMER
    }
}
