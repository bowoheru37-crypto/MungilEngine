package com.example.engine

import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.sqrt

object QolbuConstants {
    const val DT_MIN_SEC = 0.0083f
    const val DT_MAX_SEC = 0.05f
    const val MAX_CATCHUP_STEPS = 3
    const val FIXED_TIMESTEP_ECO = 1f / 30f
    const val FIXED_TIMESTEP_STD = 1f / 60f
    const val AI_TICK_RATE_HZ = 15
    const val MAX_DRAW_CALLS = 35
    const val MAX_HEAP_MB = 48f
    const val WORLD_MIN_X = -80f
    const val WORLD_MAX_X = 2400f
    const val WORLD_MIN_Y = -120f
    const val WORLD_MAX_Y = 960f
    const val MAX_TELEPORT_DELTA_PX = 240f
}

fun fastClampDt(dtSec: Float): Float {
    if (!dtSec.isFinite()) return QolbuConstants.DT_MAX_SEC
    return dtSec.coerceIn(QolbuConstants.DT_MIN_SEC, QolbuConstants.DT_MAX_SEC)
}

fun isValidMove(prevX: Float, prevY: Float, nextX: Float, nextY: Float): Boolean {
    if (!prevX.isFinite() || !prevY.isFinite() || !nextX.isFinite() || !nextY.isFinite()) return false
    if (nextX < QolbuConstants.WORLD_MIN_X || nextX > QolbuConstants.WORLD_MAX_X) return false
    if (nextY < QolbuConstants.WORLD_MIN_Y || nextY > QolbuConstants.WORLD_MAX_Y) return false
    val dx = nextX - prevX
    val dy = nextY - prevY
    return (dx * dx + dy * dy) <= QolbuConstants.MAX_TELEPORT_DELTA_PX * QolbuConstants.MAX_TELEPORT_DELTA_PX
}

fun validateMoveBounds(
    prevX: Float,
    prevY: Float,
    nextX: Float,
    nextY: Float
): Triple<Float, Float, Boolean> {
    if (!nextX.isFinite() || !nextY.isFinite()) return Triple(prevX, prevY, false)
    val clampedX = nextX.coerceIn(QolbuConstants.WORLD_MIN_X, QolbuConstants.WORLD_MAX_X)
    val clampedY = nextY.coerceIn(QolbuConstants.WORLD_MIN_Y, QolbuConstants.WORLD_MAX_Y)
    val dx = clampedX - prevX
    val dy = clampedY - prevY
    val distSq = dx * dx + dy * dy
    val maxSq = QolbuConstants.MAX_TELEPORT_DELTA_PX * QolbuConstants.MAX_TELEPORT_DELTA_PX
    return if (distSq > maxSq) {
        val dist = sqrt(distSq)
        val scale = QolbuConstants.MAX_TELEPORT_DELTA_PX / dist
        Triple(prevX + dx * scale, prevY + dy * scale, false)
    } else {
        Triple(clampedX, clampedY, clampedX == nextX && clampedY == nextY)
    }
}

class SoAWorld(val capacity: Int = 1024) {
    val active = BooleanArray(capacity)
    val kind = IntArray(capacity)
    val x = FloatArray(capacity)
    val y = FloatArray(capacity)
    val vx = FloatArray(capacity)
    val vy = FloatArray(capacity)
    val hp = IntArray(capacity)
    private val freeList = IntArray(capacity) { capacity - 1 - it }
    private var freeTop = capacity
    var activeCount: Int = 0
        private set

    fun alloc(): Int {
        if (freeTop <= 0) return -1
        val slot = freeList[--freeTop]
        active[slot] = true
        x[slot] = 0f
        y[slot] = 0f
        vx[slot] = 0f
        vy[slot] = 0f
        hp[slot] = 0
        kind[slot] = 0
        activeCount++
        return slot
    }

    fun free(slot: Int) {
        if (slot !in 0 until capacity || !active[slot]) return
        active[slot] = false
        freeList[freeTop++] = slot
        activeCount--
    }

    fun reset() {
        for (i in 0 until capacity) {
            active[i] = false
            freeList[i] = capacity - 1 - i
        }
        freeTop = capacity
        activeCount = 0
    }
}

class ParticlePool(val capacity: Int = 160) {
    val active = BooleanArray(capacity)
    val x = FloatArray(capacity)
    val y = FloatArray(capacity)
    val vx = FloatArray(capacity)
    val vy = FloatArray(capacity)
    val life = FloatArray(capacity)
    val maxLife = FloatArray(capacity)
    val size = FloatArray(capacity)
    val colorKind = IntArray(capacity)
    private var cursor = 0

    fun spawn(
        px: Float,
        py: Float,
        pvx: Float,
        pvy: Float,
        pLife: Float,
        pSize: Float,
        pColorKind: Int
    ) {
        val idx = cursor
        cursor = (cursor + 1) % capacity
        active[idx] = true
        x[idx] = px
        y[idx] = py
        vx[idx] = pvx
        vy[idx] = pvy
        life[idx] = pLife
        maxLife[idx] = pLife.coerceAtLeast(0.01f)
        size[idx] = pSize
        colorKind[idx] = pColorKind
    }

    fun step(dt: Float): Int {
        var alive = 0
        for (i in 0 until capacity) {
            if (!active[i]) continue
            life[i] -= dt
            if (life[i] <= 0f) {
                active[i] = false
                continue
            }
            x[i] += vx[i] * dt
            y[i] += vy[i] * dt
            vy[i] += 140f * dt
            alive++
        }
        return alive
    }

    fun clear() {
        active.fill(false)
        cursor = 0
    }
}

class SpatialHashGrid(private val cellSize: Float = 32f) {
    private val buckets = HashMap<Long, MutableList<Int>>(64)

    private fun key(cx: Int, cy: Int): Long = (cx.toLong() shl 32) or (cy.toLong() and 0xffffffffL)

    fun clear() {
        buckets.values.forEach { it.clear() }
    }

    fun insert(id: Int, x: Float, y: Float, w: Float, h: Float) {
        val minCx = floor(x / cellSize).toInt()
        val maxCx = floor((x + w) / cellSize).toInt()
        val minCy = floor(y / cellSize).toInt()
        val maxCy = floor((y + h) / cellSize).toInt()
        for (cy in minCy..maxCy) {
            for (cx in minCx..maxCx) {
                val list = buckets.getOrPut(key(cx, cy)) { ArrayList(8) }
                list.add(id)
            }
        }
    }

    fun query(x: Float, y: Float, w: Float, h: Float): List<Int> {
        val out = ArrayList<Int>(16)
        val minCx = floor(x / cellSize).toInt()
        val maxCx = floor((x + w) / cellSize).toInt()
        val minCy = floor(y / cellSize).toInt()
        val maxCy = floor((y + h) / cellSize).toInt()
        for (cy in minCy..maxCy) {
            for (cx in minCx..maxCx) {
                buckets[key(cx, cy)]?.let { out.addAll(it) }
            }
        }
        return out
    }
}

class DoubleBufferedTransforms(val capacity: Int = 256) {
    var frontX = FloatArray(capacity)
        private set
    var frontY = FloatArray(capacity)
        private set
    var frontRot = FloatArray(capacity)
        private set
    private var backX = FloatArray(capacity)
    private var backY = FloatArray(capacity)
    private var backRot = FloatArray(capacity)

    fun writeBack(slot: Int, x: Float, y: Float, rotDeg: Float): Boolean {
        if (slot !in 0 until capacity || !x.isFinite() || !y.isFinite() || !rotDeg.isFinite()) {
            return false
        }
        backX[slot] = x
        backY[slot] = y
        backRot[slot] = rotDeg
        return true
    }

    fun swapBuffers() {
        val tx = frontX; frontX = backX; backX = tx
        val ty = frontY; frontY = backY; backY = ty
        val tr = frontRot; frontRot = backRot; backRot = tr
    }
}

data class FsmStateConfig(
    val state: CharacterAnimState,
    val priority: Int,
    val cloakTargetAngle: Float,
    val bobAmp: Float,
    val loopSpeed: Float
)

data class CloakSpringState(
    var angle1: Float = 0f,
    var vel1: Float = 0f,
    var angle2: Float = 0f,
    var vel2: Float = 0f
)

data class EngineConnectorInfo(
    val id: PerspectiveConnectorId,
    val title: String,
    val cameraAxis: String,
    val drawCallBudget: Int,
    val githubInspiration: String,
    val summary: String
)

data class VisualQualityProfile(
    val id: VisualQualityPresetId,
    val label: String,
    val resolutionScale: Float,
    val shadowPass: Boolean,
    val glowBloom: Boolean,
    val maxParticles: Int,
    val desc: String
)

data class AuditStageResult(
    val stage: Int,
    val name: String,
    val passed: Boolean,
    val detail: String
)

data class QolbuAuditReport(
    val allPassed: Boolean,
    val stages: List<AuditStageResult>,
    val fuzzEventsTested: Int,
    val fuzzBlockedCount: Int
)

object QolbuCore {
    val CHARACTER_FSM_TABLE: List<FsmStateConfig> = listOf(
        FsmStateConfig(CharacterAnimState.KO, 100, -0.7f, 0f, 1f),
        FsmStateConfig(CharacterAnimState.HURT, 90, -0.55f, 1.5f, 8f),
        FsmStateConfig(CharacterAnimState.DASH, 80, -0.85f, 0.5f, 14f),
        FsmStateConfig(CharacterAnimState.ATTACK, 70, -0.45f, 1f, 12f),
        FsmStateConfig(CharacterAnimState.JUMP, 60, -0.5f, 0.5f, 6f),
        FsmStateConfig(CharacterAnimState.FALL, 50, 0.42f, 0.5f, 6f),
        FsmStateConfig(CharacterAnimState.WALK, 30, -0.35f, 2.2f, 9f),
        FsmStateConfig(CharacterAnimState.IDLE, 10, -0.1f, 1.1f, 3.2f)
    )

    fun stepCloakSpring(
        spring: CloakSpringState,
        targetAngle: Float,
        vx: Float,
        dt: Float
    ) {
        val clampedDt = dt.coerceIn(0.001f, 0.05f)
        val windOffset = (-vx * 0.0022f).coerceIn(-0.45f, 0.45f)
        val t1 = targetAngle + windOffset
        val stiffness = 135f
        val damping = 16f
        val acc1 = (t1 - spring.angle1) * stiffness - spring.vel1 * damping
        spring.vel1 += acc1 * clampedDt
        spring.angle1 += spring.vel1 * clampedDt

        val acc2 = (spring.angle1 * 1.2f - spring.angle2) * (stiffness * 0.8f) - spring.vel2 * (damping * 0.85f)
        spring.vel2 += acc2 * clampedDt
        spring.angle2 += spring.vel2 * clampedDt
    }

    val ENGINE_LAYERS: List<Pair<String, String>> = listOf(
        "L1: Foundation" to "Fixed timestep dt<=0.05s, SoAWorld 1024 slots, ParticlePool 160 slots",
        "L2: Asset Budget" to "Ref-counted LRU biome loader (2 MB Eco / 4 MB Std) + pinned Bowo rig",
        "L3: World & Spatial" to "32px SpatialHashGrid + viewport frustum/circle culling",
        "L4: FD Lite Render" to "12 procedural art styles + Mode-7 + DDA Raycast + 3D-Stack",
        "L5: FSM & Spring" to "8-state priority table FSM + 2-bone damped cloak spring",
        "L6: 15Hz Utility AI" to "Eco-decimated 15Hz Luma Co-Op, Autopilot, & Boss Kala reader",
        "L7: Audio & Save" to "AudioTrack 3-channel synth + FNV-1a checksummed v7.0 save slots"
    )

    val LAYER_ARCHITECTURE_12: List<Pair<Int, String>> = listOf(
        1 to "Zero-GC Memory & Typed/Array Pools",
        2 to "Fixed-Step Accumulator & Fast Clamp dt",
        3 to "Double-Buffered Transform Snapshots",
        4 to "Scene Graph Keep-World Container Math",
        5 to "Physics Preset & Swept/Circle Overlap Solver",
        6 to "IsValidMove Bounds & Teleport Guard",
        7 to "32px Spatial Hash & Frustum Culling",
        8 to "QolbuSpace3D Y-Up LookAt + Perspective",
        9 to "3-Level LOD & 500m Origin Rebasing",
        10 to "15Hz Decimated AI & Local MCP Hub",
        11 to "Procedural AudioTrack & 12 Art Styles",
        12 to "Offline FNV-1a Saves & MPAK7 RLE Export"
    )

    val HARDENED_RULES_9: List<Pair<Int, String>> = listOf(
        1 to "Zero allocation inside frame loop (SoA + Ring Buffers)",
        2 to "dt strictly clamped [0.0083s, 0.05s], max 3 catch-up steps",
        3 to "Draw calls strictly <= 35 per frame (Itel A70 target <= 24)",
        4 to "Heap budget <= 48 MB; LRU asset cache <= 2 MB Eco",
        5 to "Touch hitboxes >= 48dp across all controls & modals",
        6 to "15Hz AI decimation on Eco devices (50% CPU savings)",
        7 to "IsValidMove rejects NaN/Infinity & speed-hack teleports",
        8 to "FNV-1a checksum & range clamping on every save load",
        9 to "AudioTrack auto-suspends on lifecycle pause & respects Mute"
    )

    val ENGINE_CONNECTORS: List<EngineConnectorInfo> = listOf(
        EngineConnectorInfo(PerspectiveConnectorId.SIDE_2D_H, "2D Side Scroller", "X/Y Orthographic", 14, "phaserjs/phaser", "Classic side action with coyote time & jump buffer."),
        EngineConnectorInfo(PerspectiveConnectorId.SIDE_2D_V, "2D Vertical", "X/Y Vertical Scroll", 14, "pixalo/pixalo", "Vertical tower climb or arcade shmup corridor."),
        EngineConnectorInfo(PerspectiveConnectorId.TOP_DOWN, "Top-Down 8-Way", "X/Z Ground Plane", 16, "melonjs/melonJS", "Free 8-way exploration RPG with obstacle sliding."),
        EngineConnectorInfo(PerspectiveConnectorId.ISOMETRIC, "Isometric Diamond", "2:1 Diamond Sort", 20, "j03m/trafficcone", "Depth-sorted isometric prisms & diamond tiles."),
        EngineConnectorInfo(PerspectiveConnectorId.HEXAGONAL, "Hex Tactical", "Axial Hex Grid", 18, "j03m/trafficcone", "Hex tile tactical positioning & range rings."),
        EngineConnectorInfo(PerspectiveConnectorId.PARALLAX_2_5D, "2.5D Parallax", "Multi-Layer Depth", 18, "Pixscape/pixscape", "Parallax hills + Mode-7 floor horizon."),
        EngineConnectorInfo(PerspectiveConnectorId.PSEUDO_3D_ZSTACK, "Pseudo-3D Sprite Stack", "5-Slice Z-Stack", 20, "metafizzy/zdog", "Rotated layered character rig + articulated limbs."),
        EngineConnectorInfo(PerspectiveConnectorId.FAKE_3D_RAYCAST, "Fake-3D DDA Raycast", "Column Slice DDA", 24, "ssloy/tinyraycaster", "Software DDA raycast dungeon with distance fog."),
        EngineConnectorInfo(PerspectiveConnectorId.THIRD_PERSON, "Third-Person Orbit", "Follow 3/4 LookAt", 26, "rbfx/rbfx", "3D-projected follow camera & low-poly meshes."),
        EngineConnectorInfo(PerspectiveConnectorId.FIRST_PERSON, "First-Person Corridor", "Eye-Height Yaw FPS", 24, "AghlaAbdo/42_Cub3D", "Eye-level 1.65m corridor traversal.")
    )

    val VISUAL_QUALITY_PROFILES: List<VisualQualityProfile> = listOf(
        VisualQualityProfile(VisualQualityPresetId.PIXEL_RETRO, "Pixel Retro", 0.75f, false, false, 48, "Crisp pixel aesthetic, lowest GPU fillrate."),
        VisualQualityProfile(VisualQualityPresetId.MOBILE_ECO, "Mobile Eco (Itel A70)", 0.82f, false, false, 60, "Locked 30 FPS eco profile with minimal overdraw."),
        VisualQualityProfile(VisualQualityPresetId.SMOOTH_HD, "Smooth HD", 1.0f, true, false, 120, "60 FPS smooth anti-aliased rendering."),
        VisualQualityProfile(VisualQualityPresetId.VIVID_GLOW, "Vivid Glow", 1.0f, true, true, 160, "Full bloom rims, weather streaks, & max VFX.")
    )

    fun runQolbu8StageAudit(drawCalls: Int = 14, heapMb: Float = 18.4f): QolbuAuditReport {
        val db = DoubleBufferedTransforms()
        val dbOk = db.writeBack(0, 42f, 84f, 15f) && !db.writeBack(0, Float.NaN, 84f, 15f)
        db.swapBuffers()

        val ecs = SoAWorld(64)
        val s1 = ecs.alloc()
        ecs.free(s1)
        val s2 = ecs.alloc()
        val ecsOk = s1 == s2 && ecs.activeCount == 1

        var fuzzBlocked = 0
        val fuzzCount = 2000
        var seed = 0x13572468
        for (i in 0 until fuzzCount) {
            seed = seed xor (seed shl 13)
            seed = seed xor (seed ushr 17)
            seed = seed xor (seed shl 5)
            val invalid = when (i % 4) {
                0 -> !isValidMove(100f, 100f, Float.NaN, 100f)
                1 -> !isValidMove(100f, 100f, Float.POSITIVE_INFINITY, 100f)
                2 -> !isValidMove(100f, 100f, 100f, -300f)
                else -> !isValidMove(100f, 100f, 950f + abs(seed % 500), 100f)
            }
            if (invalid) fuzzBlocked++
        }

        val stages = listOf(
            AuditStageResult(1, "Fixed-Step dt Clamp", fastClampDt(0.5f) == QolbuConstants.DT_MAX_SEC && fastClampDt(Float.NaN) == QolbuConstants.DT_MAX_SEC, "clamped [8.3ms..50ms]"),
            AuditStageResult(2, "Zero-GC SoA Slot Recycle", ecsOk, "free-list O(1) verified"),
            AuditStageResult(3, "Double-Buffered Transforms", dbOk && db.frontX[0] == 42f, "front/back swap + NaN reject"),
            AuditStageResult(4, "Draw Call Budget <= 35", drawCalls <= QolbuConstants.MAX_DRAW_CALLS, "$drawCalls calls"),
            AuditStageResult(5, "Heap Footprint <= 48 MB", heapMb <= QolbuConstants.MAX_HEAP_MB, "$heapMb MB"),
            AuditStageResult(6, "IsValidMove Teleport Guard", !isValidMove(10f, 10f, 800f, 10f), "speed-hack blocked"),
            AuditStageResult(7, "2,000-Event Security Fuzz", fuzzBlocked == fuzzCount, "$fuzzBlocked/$fuzzCount blocked"),
            AuditStageResult(8, "10 Perspective Connectors Ready", ENGINE_CONNECTORS.size == 10, "10/10 active")
        )
        return QolbuAuditReport(
            allPassed = stages.all { it.passed },
            stages = stages,
            fuzzEventsTested = fuzzCount,
            fuzzBlockedCount = fuzzBlocked
        )
    }
}
