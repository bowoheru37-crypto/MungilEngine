package com.example.engine

import kotlinx.serialization.Serializable

@Serializable
enum class LanguageCode(val code: String, val label: String) {
    ID("id", "Indonesia"),
    EN("en", "English"),
    JA("ja", "日本語"),
    KO("ko", "한국어"),
    ES("es", "Español");

    companion object {
        fun fromCode(code: String): LanguageCode = entries.find { it.code == code } ?: ID
    }
}

@Serializable
enum class ArtStyleId(val id: String) {
    PIXEL("pixel"),
    ANIME("anime"),
    CARTOON("cartoon"),
    MINIMAL("minimal"),
    RETRO("retro"),
    CYBERPUNK("cyberpunk"),
    LOWPOLY("lowpoly"),
    WATERCOLOR("watercolor"),
    CHIBI("chibi"),
    ISOMETRIC("isometric"),
    SILHOUETTE("silhouette"),
    VOXEL("voxel");

    companion object {
        fun fromId(id: String): ArtStyleId = entries.find { it.id == id } ?: PIXEL
    }
}

@Serializable
enum class RenderMode(val label: String) {
    MODE_2D("2D"),
    MODE_2_5D("2.5D"),
    MODE_3D_STACK("3D-Stack")
}

@Serializable
enum class PhysicsMode(val label: String) {
    ARCADE("Arcade"),
    REALISTIC("Realistic"),
    ZERO_G("Zero-G")
}

@Serializable
enum class WeatherKind(val label: String) {
    CERAH("Cerah"),
    HUJAN("Hujan"),
    SALJU("Salju")
}

@Serializable
enum class DeviceTierId(val id: String) {
    AUTO("auto"),
    ECO("eco"),
    MID("mid"),
    HD("hd")
}

enum class GameShellState {
    LANDING,
    TITLE,
    PLAYING,
    PAUSED,
    VICTORY,
    GAMEOVER,
    STUDIO
}

enum class StudioTab(val id: String) {
    PLAY("play"),
    SCENE("scene"),
    AGENT("agent"),
    ARENA("arena"),
    ASSETS("assets"),
    GENERATORS("generators"),
    CONTROLS("controls"),
    ART("art"),
    LAB("lab"),
    SKILLS("skills"),
    SERVICES("services"),
    EXPORT("export")
}

@Serializable
enum class AiPlayMode(val id: String) {
    OFF("off"),
    COOP("coop"),
    AUTOPILOT("autopilot")
}

@Serializable
enum class PerspectiveConnectorId(val id: String, val title: String) {
    SIDE_2D_H("2d_side_h", "2D Side Scroller"),
    SIDE_2D_V("2d_side_v", "2D Vertical"),
    TOP_DOWN("top_down", "Top-Down 8-Way"),
    ISOMETRIC("isometric", "Isometric Diamond"),
    HEXAGONAL("hexagonal", "Hex Tactical"),
    PARALLAX_2_5D("2_5d_parallax", "2.5D Parallax"),
    PSEUDO_3D_ZSTACK("pseudo_3d_zstack", "Pseudo-3D Sprite Stack"),
    FAKE_3D_RAYCAST("fake_3d_raycast", "Fake-3D DDA Raycast"),
    THIRD_PERSON("third_person", "Third-Person Orbit"),
    FIRST_PERSON("first_person", "First-Person Corridor")
}

@Serializable
enum class Camera3DPresetId(val id: String, val label: String) {
    ISO_FIXED("iso_fixed", "Camera A: Fixed Isometric"),
    FOLLOW_3_4("follow_3_4", "Camera B: Follow 3/4"),
    FPS_RAYCAST("fps_raycast", "Camera C: FPS Raycast")
}

@Serializable
enum class HybridRender5Mode(val id: String, val label: String) {
    HYBRID_2_5D_BILLBOARD("hybrid_2_5d_billboard", "Hybrid 2.5D Billboard"),
    ISOMETRIC_PAINTER("isometric_painter", "Isometric Painter Sort"),
    RAYCAST_PSEUDO3D("raycast_pseudo3d", "Raycast Pseudo-3D"),
    MODE7_VOXEL("mode7_voxel", "Mode-7 & Voxel Space"),
    REAL_3D_LOWPOLY("real_3d_lowpoly", "Real 3D Low-Poly")
}

@Serializable
enum class VisualQualityPresetId(val id: String, val label: String) {
    PIXEL_RETRO("pixel_retro", "Pixel Retro"),
    MOBILE_ECO("mobile_eco", "Mobile Eco (Itel A70)"),
    SMOOTH_HD("smooth_hd", "Smooth HD"),
    VIVID_GLOW("vivid_glow", "Vivid Glow")
}

enum class GenreSimulationKind {
    PLATFORMER,
    TOPDOWN,
    SHOOTER,
    RUNNER,
    RHYTHM,
    BRAWLER,
    DEFENSE,
    COLLECTOR,
    VISUAL_NOVEL
}

enum class CharacterAnimState(val id: String) {
    IDLE("idle"),
    WALK("walk"),
    JUMP("jump"),
    FALL("fall"),
    ATTACK("attack"),
    DASH("dash"),
    HURT("hurt"),
    KO("ko")
}

data class ArtStyleSpec(
    val id: ArtStyleId,
    val name: String,
    val subtitle: String,
    val palette: List<String>,
    val strokeWidth: Float,
    val glow: Boolean,
    val flatFill: Boolean,
    val pixelSnap: Boolean,
    val shaderHint: String
)

@Serializable
data class StyleOverrides(
    val outline: Boolean = true,
    val shadow: Boolean = true,
    val glow: Boolean = true,
    val scanline: Boolean = false,
    val strokeWidth: Float = 2f,
    val brightness: Float = 1f,
    val contrast: Float = 1f
)

data class DeviceProfile(
    val requestedTier: DeviceTierId,
    val activeTier: DeviceTierId,
    val targetFps: Int,
    val dprCap: Float,
    val dynamicScale: Float,
    val shadowBlur: Int,
    val particleMax: Int,
    val powerSaveAuto: Boolean,
    val renderer: String
)

@Serializable
data class TouchControlConfig(
    val joystickSide: String = "left",
    val joystickOffsetX: Int = 20,
    val joystickOffsetY: Int = 22,
    val joystickDiameter: Int = 116,
    val buttonSize: Int = 56,
    val opacity: Float = 0.85f,
    val deadzone: Float = 0.14f,
    val haptics: Boolean = true,
    val showLabels: Boolean = true
)

@Serializable
data class WorldSaveProgress(
    val genreId: String = "platformer",
    val playerX: Float = 72f,
    val playerY: Float = 260f,
    val facing: Int = 1,
    val time: Float = 0f,
    val collectedShards: List<Int> = emptyList(),
    val collectedCoins: List<Int> = emptyList(),
    val activeSwitches: List<Int> = emptyList(),
    val defeatedEnemies: List<Int> = emptyList(),
    val vnStep: Int = 0
)

@Serializable
data class SaveSlotData(
    val version: String = "7.0.0",
    val slotId: String = "1",
    val updatedAt: String = "",
    val gameTitle: String = "Bowo: Penjaga Cahaya",
    val level: Int = 1,
    val hp: Int = 100,
    val energy: Int = 100,
    val coins: Int = 0,
    val shards: Int = 0,
    val score: Int = 0,
    val kills: Int = 0,
    val potions: Int = 2,
    val styleId: String = "pixel",
    val checksum: String = "",
    val worldState: WorldSaveProgress? = null
)

data class SaveSlotSummary(
    val id: String,
    val exists: Boolean,
    val updatedAt: String = "",
    val level: Int = 1,
    val hp: Int = 100,
    val score: Int = 0,
    val coins: Int = 0,
    val gameTitle: String = ""
)

@Serializable
data class AuthProfile(
    val provider: String = "guest",
    val uid: String = "guest-local",
    val displayName: String = "Offline Guest",
    val syncedAt: String = ""
)

@Serializable
data class AnalyticsSummary(
    val sessions: Int = 0,
    val totalPlaySec: Int = 0,
    val level1Clears: Int = 0,
    val level2Clears: Int = 0,
    val level3Clears: Int = 0,
    val enemiesDefeated: Int = 0,
    val shardsCollected: Int = 0,
    val deaths: Int = 0,
    val activeSeconds: Int = 0
)

data class GenreTemplate(
    val id: String,
    val name: String,
    val renderMode: RenderMode,
    val physicsMode: PhysicsMode,
    val styleId: ArtStyleId,
    val weather: WeatherKind,
    val gravityMul: Float,
    val speedMul: Float,
    val desc: String
)

data class AssetCatalogItem(
    val id: String,
    val name: String,
    val category: String,
    val memoryKb: Int,
    val desc: String
)

data class RepoCredit(
    val tier: String,
    val name: String,
    val license: String,
    val url: String,
    val adoption: String
)

@Serializable
data class EventRuleSpec(
    val id: String,
    val condition: String,
    val action: String,
    val enabled: Boolean = true
)

data class HudSnapshot(
    val level: Int = 1,
    val levelName: String = "Desa Fajar",
    val hp: Int = 100,
    val maxHp: Int = 100,
    val energy: Int = 100,
    val maxEnergy: Int = 100,
    val coins: Int = 0,
    val shards: Int = 0,
    val requiredShards: Int = 2,
    val switchesActive: Int = 0,
    val requiredSwitches: Int = 0,
    val potions: Int = 2,
    val score: Int = 0,
    val kills: Int = 0,
    val gateUnlocked: Boolean = false,
    val fps: Int = 60,
    val dynamicScale: Float = 1f,
    val drawCalls: Int = 12,
    val culledCount: Int = 0,
    val activeEntities: Int = 10,
    val heapMb: Float = 16.4f,
    val bossHp: Int = 0,
    val bossMaxHp: Int = 0,
    val bossPhase: Int = 1,
    val objective: String = "",
    val parryFlash: Boolean = false,
    val genreId: String = "platformer",
    val simKind: GenreSimulationKind = GenreSimulationKind.PLATFORMER,
    val aiMode: AiPlayMode = AiPlayMode.OFF,
    val aiCompanionActive: Boolean = false,
    val aiStatusText: String = "",
    val comboCount: Int = 0,
    val waveNumber: Int = 1,
    val trackDist: Int = 0,
    val speedKmh: Int = 0,
    val vnDialog: VnDialogView? = null
)

data class VnDialogView(
    val speaker: String,
    val text: String,
    val step: Int,
    val totalSteps: Int,
    val choices: List<String>
)

@Serializable
data class GeneratedCharacterSpec(
    val id: String,
    val name: String,
    val seed: Int,
    val dimension: String,
    val archetype: String,
    val primaryColor: String,
    val cloakColor: String,
    val accentColor: String,
    val weapon: String,
    val hpBonus: Int,
    val speedMul: Float,
    val spriteGrid: List<String>
)

data class GeneratedTrackSpec(
    val seed: Int,
    val title: String,
    val scale: String,
    val bpm: Int,
    val leadNotes: List<Float>,
    val bassNotes: List<Float>,
    val percHits: List<Int>
)

data class GeneratedSfxSpec(
    val seed: Int,
    val name: String,
    val preset: String,
    val wave: String,
    val freqStart: Float,
    val freqEnd: Float,
    val durationSec: Float,
    val volume: Float
)

data class CutsceneKeyframe(
    val timeSec: Float,
    val pose: CharacterAnimState,
    val xNorm: Float,
    val yNorm: Float,
    val caption: String,
    val effect: String
)

data class GeneratedCutsceneSpec(
    val seed: Int,
    val title: String,
    val durationSec: Float,
    val weather: WeatherKind,
    val keyframes: List<CutsceneKeyframe>
)

data class GeneratedTerrainPlatform(
    val x: Int,
    val y: Int,
    val w: Int
)

data class GeneratedTerrainSpec(
    val seed: Int,
    val name: String,
    val mode: String,
    val biome: String,
    val heights: List<Int>,
    val platforms: List<GeneratedTerrainPlatform>
)

data class GeneratedPropSpec(
    val seed: Int,
    val name: String,
    val kind: String,
    val color: String,
    val pixelGrid: List<String>
)

data class GeneratedImageSpriteSpec(
    val seed: Int,
    val prompt: String,
    val size: Int,
    val palette: List<String>,
    val grid: List<String>
)

data class AtelierSetupSpec(
    val presetId: String,
    val label: String,
    val tint: String,
    val sy: Float,
    val animSpeed: Float,
    val animBlend: Float,
    val poseAnglesDeg: Map<String, Float>,
    val rawJson: String
)

data class GeneratedRig3DSpec(
    val character: GeneratedCharacterSpec,
    val atelier: AtelierSetupSpec
)

data class FsmTransitionSpec(
    val from: String,
    val event: String,
    val to: String,
    val guard: String
)

data class GeneratedStateMachineSpec(
    val seed: Int,
    val kind: String,
    val initialState: String,
    val states: List<String>,
    val transitions: List<FsmTransitionSpec>,
    val bytecodePreview: String
)

data class GeneratedGameplayBundleSpec(
    val seed: Int,
    val title: String,
    val genreId: String,
    val simKind: GenreSimulationKind,
    val physicsMode: PhysicsMode,
    val renderMode: RenderMode,
    val weather: WeatherKind,
    val rules: List<EventRuleSpec>,
    val uiHudTokens: List<String>
)

data class GeneratedDubbingSpec(
    val seed: Int,
    val speaker: String,
    val line: String,
    val lang: String,
    val durationSec: Float,
    val pitch: Float,
    val rate: Float,
    val srtText: String,
    val vttText: String
)

data class GeneratedPlatformTargetSpec(
    val seed: Int,
    val target: String,
    val appName: String,
    val packageId: String,
    val summary: String,
    val configJson: String
)

data class Mesh3DVertex(
    val x: Float,
    val y: Float,
    val z: Float
)

data class Mesh3DTriangle(
    val a: Int,
    val b: Int,
    val c: Int,
    val color: String
)

data class GeneratedMesh3DSpec(
    val seed: Int,
    val prompt: String,
    val category: String,
    val sourceRepo: String,
    val vertices: List<Mesh3DVertex>,
    val triangles: List<Mesh3DTriangle>,
    val lodCounts: Triple<Int, Int, Int>,
    val objText: String,
    val gltfJson: String,
    val budgetOk: Boolean
)

data class BlueprintPrefabSpec(
    val name: String,
    val role: String,
    val meshCategory: String,
    val triCount: Int,
    val collider: String
)

data class BlueprintBudgetReport(
    val targetFps: Int,
    val drawCallsEst: Int,
    val trisEst: Int,
    val heapMbEst: Float,
    val passesA70: Boolean
)

data class GeneratedGameBlueprintSpec(
    val seed: Int,
    val title: String,
    val prompt: String,
    val genreId: String,
    val simKind: GenreSimulationKind,
    val perspective: PerspectiveConnectorId,
    val cameraPreset: Camera3DPresetId,
    val hybridMode: HybridRender5Mode,
    val physicsMode: PhysicsMode,
    val renderMode: RenderMode,
    val styleId: ArtStyleId,
    val weather: WeatherKind,
    val aiMode: AiPlayMode,
    val repoStack: List<String>,
    val prefabs: List<BlueprintPrefabSpec>,
    val levelQuests: List<String>,
    val rules: List<EventRuleSpec>,
    val budgetReport: BlueprintBudgetReport
)

@Serializable
enum class PhysicsPresetId(val id: String, val label: String) {
    NORMAL("normal", "NORMAL"),
    BOUNCY("bouncy", "BOUNCY"),
    HEAVY("heavy", "HEAVY"),
    GHOST("ghost", "GHOST"),
    SLIPPERY("slippery", "SLIPPERY"),
    BALL("ball", "BALL")
}

@Serializable
enum class ColliderShapeKind(val id: String) {
    BOX("box"),
    CIRCLE("circle"),
    POLYGON("polygon")
}

@Serializable
data class EntityPhysicsProps(
    val presetId: PhysicsPresetId = PhysicsPresetId.NORMAL,
    val mass: Float = 1f,
    val friction: Float = 0.6f,
    val restitution: Float = 0.2f,
    val gravityScale: Float = 1f,
    val linearDamp: Float = 0.08f,
    val isTrigger: Boolean = false,
    val ccd: Boolean = false
)

@Serializable
data class ColliderShapeSpec(
    val kind: ColliderShapeKind = ColliderShapeKind.BOX,
    val width: Float = 36f,
    val height: Float = 44f,
    val radius: Float = 22f,
    val polygonPoints: List<Pair<Float, Float>> = listOf(
        -18f to -20f, 18f to -20f, 20f to 18f, -20f to 18f
    )
)

@Serializable
data class SceneEntityNode(
    val id: String,
    val name: String,
    val kind: String,
    val parentId: String? = null,
    val children: List<String> = emptyList(),
    val x: Float = 180f,
    val y: Float = 120f,
    val localX: Float = 0f,
    val localY: Float = 0f,
    val scaleX: Float = 1f,
    val scaleY: Float = 1f,
    val localScaleX: Float = 1f,
    val localScaleY: Float = 1f,
    val rotationDeg: Float = 0f,
    val localRotationDeg: Float = 0f,
    val visible: Boolean = true,
    val physics: EntityPhysicsProps = EntityPhysicsProps(),
    val collider: ColliderShapeSpec = ColliderShapeSpec()
)

data class CollisionOverlapInfo(
    val aId: String,
    val aName: String,
    val bId: String,
    val bName: String,
    val penetrationPx: Float,
    val isTriggerOverlap: Boolean,
    val near: Boolean
)

enum class ArenaMode(val id: String, val label: String) {
    SOLO("solo", "1. AI Main Sendiri"),
    COPLAY("coplay", "2. Main Bareng Qolbu"),
    VS("vs", "3. Lawan Boss Kala")
}

enum class ArenaCoachDirective(val label: String) {
    AGRESIF("Agresif"),
    SEIMBANG("Seimbang"),
    BERTAHAN("Bertahan"),
    FARMING("Farming")
}

enum class ArenaCompanionOrder(val label: String) {
    IKUT("Ikut"),
    SERANG("Serang"),
    BERTAHAN("Bertahan"),
    AMBIL_ITEM("Ambil Item"),
    HEAL("Heal")
}

enum class ArenaDifficulty(val label: String) {
    EASY("Easy"),
    NORMAL("Normal"),
    HARD("Hard")
}

@Serializable
data class WizardGameSpec(
    val id: String,
    val name: String,
    val genre: String,
    val sprite: String,
    val characterName: String,
    val preset: String,
    val map: String,
    val enemies: Int,
    val items: Int,
    val aiMode: String,
    val difficulty: String,
    val durationSec: Int,
    val createdAt: String
)

enum class GitHubRepoCategory(val id: String, val label: String) {
    ALL("all", "All"),
    FAKE_3D_RAYCAST("fake_3d_raycast", "Fake 3D & Raycast"),
    MODE7_VOXEL("mode7_voxel", "Mode-7 & Voxel Space"),
    ISOMETRIC_2_5D("isometric_2_5d", "Isometric & 2.5D"),
    WEB_MOBILE_LIGHTWEIGHT("web_mobile_lightweight", "Web & Mobile Engines"),
    MESH_3D_GENERATORS("3d_mesh_generators", "3D Generators (Tripo/Meshy)"),
    AI_GAME_GENERATORS("ai_game_generators", "AI Game Forge & MCP")
}

data class GitHubRepoPlugin(
    val id: String,
    val repo: String,
    val url: String,
    val category: GitHubRepoCategory,
    val license: String,
    val starsLabel: String,
    val dnaPattern: String,
    val supportedPerspectives: List<PerspectiveConnectorId>,
    val recommendedHybridMode: HybridRender5Mode,
    val recommendedCamera: Camera3DPresetId,
    val maxDrawCallsBudget: Int,
    val maxTrisBudget: Int,
    val source: String = "curated-offline"
)

data class AgentSkillFile(
    val filename: String,
    val platform: String,
    val title: String,
    val summary: String,
    val content: String
)
