package com.example.engine

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.tan

object Space3DConstants {
    const val CULL_DISTANCE_M = 35f
    const val LOD0_MAX_M = 12f
    const val LOD1_MAX_M = 24f
    const val REBASE_THRESHOLD_M = 500f
    const val MAX_DRAW_CALLS = 35
    const val CHAR_TRIS_LIMIT = 800
    const val MAX_ENTITIES = 256
    const val FOG_START_M = 10f
    const val FOG_END_M = 35f
}

data class Camera3DState(
    var preset: Camera3DPresetId = Camera3DPresetId.FOLLOW_3_4,
    var eyeX: Float = 0f,
    var eyeY: Float = 8f,
    var eyeZ: Float = 8f,
    var targetX: Float = 0f,
    var targetY: Float = 0f,
    var targetZ: Float = 0f,
    var fovDeg: Float = 52f,
    var aspect: Float = 16f / 9f,
    var near: Float = 0.2f,
    var far: Float = 60f
)

data class ProjectedPoint(val sx: Float, val sy: Float, val scale: Float)

data class OriginRebaseResult(
    val rebased: Boolean,
    val shiftX: Float,
    val shiftZ: Float,
    val newOriginX: Float,
    val newOriginZ: Float
)

data class HybridModeSpec(val id: HybridRender5Mode, val label: String, val desc: String)
data class CameraPresetSpec(val id: Camera3DPresetId, val label: String, val desc: String)

object QolbuSpace3DMath {
    val CAMERA_3_PRESETS: List<CameraPresetSpec> = listOf(
        CameraPresetSpec(Camera3DPresetId.ISO_FIXED, "Camera A: Fixed Isometric", "Locked elevated isometric vantage at (12, 14, 12)."),
        CameraPresetSpec(Camera3DPresetId.FOLLOW_3_4, "Camera B: Follow 3/4", "Smooth damped 3/4 third-person follow camera."),
        CameraPresetSpec(Camera3DPresetId.FPS_RAYCAST, "Camera C: FPS Raycast", "1.65m eye-height yaw-only corridor camera.")
    )

    val HYBRID_5_MODES: List<HybridModeSpec> = listOf(
        HybridModeSpec(HybridRender5Mode.HYBRID_2_5D_BILLBOARD, "Hybrid 2.5D Billboard", "Depth-scaled sprites + 2.5D parallax background."),
        HybridModeSpec(HybridRender5Mode.ISOMETRIC_PAINTER, "Isometric Painter Sort", "Painter-sorted diamond prism world."),
        HybridModeSpec(HybridRender5Mode.RAYCAST_PSEUDO3D, "Raycast Pseudo-3D", "Column DDA corridor with depth darkening fog."),
        HybridModeSpec(HybridRender5Mode.MODE7_VOXEL, "Mode-7 & Voxel Space", "Scanline ground horizon + voxel heightmap hills."),
        HybridModeSpec(HybridRender5Mode.REAL_3D_LOWPOLY, "Real 3D Low-Poly", "Projected 3D mesh triangles with Lambert shading.")
    )

    fun project3D(
        wx: Float,
        wy: Float,
        wz: Float,
        viewWidth: Float,
        viewHeight: Float,
        focal: Float = 260f
    ): ProjectedPoint {
        val zSafe = (wz + focal).coerceAtLeast(32f)
        val scale = focal / zSafe
        val sx = viewWidth * 0.5f + wx * scale
        val sy = viewHeight * 0.5f + wy * scale
        return ProjectedPoint(sx, sy, scale)
    }

    fun createCamera3D(
        preset: Camera3DPresetId = Camera3DPresetId.FOLLOW_3_4,
        aspect: Float = 16f / 9f
    ): Camera3DState {
        return when (preset) {
            Camera3DPresetId.ISO_FIXED -> Camera3DState(preset, 12f, 14f, 12f, 0f, 0f, 0f, 45f, aspect)
            Camera3DPresetId.FPS_RAYCAST -> Camera3DState(preset, 0f, 1.65f, 0f, 0f, 1.65f, -4f, 65f, aspect)
            Camera3DPresetId.FOLLOW_3_4 -> Camera3DState(preset, 0f, 8f, 8f, 0f, 0f, 0f, 52f, aspect)
        }
    }

    fun updateCameraModeAIsometric(cam: Camera3DState) {
        cam.preset = Camera3DPresetId.ISO_FIXED
        cam.eyeX = 12f; cam.eyeY = 14f; cam.eyeZ = 12f
        cam.targetX = 0f; cam.targetY = 0f; cam.targetZ = 0f
    }

    fun updateCameraModeBFollow34(cam: Camera3DState, px: Float, py: Float, pz: Float, dt: Float) {
        cam.preset = Camera3DPresetId.FOLLOW_3_4
        val alpha = (dt * 7f).coerceIn(0f, 1f)
        cam.targetX += (px - cam.targetX) * alpha
        cam.targetY += (py - cam.targetY) * alpha
        cam.targetZ += (pz - cam.targetZ) * alpha
        cam.eyeX += (px - cam.eyeX) * alpha
        cam.eyeY += ((py + 8f) - cam.eyeY) * alpha
        cam.eyeZ += ((pz + 8f) - cam.eyeZ) * alpha
    }

    fun updateCameraModeCFpsRaycast(cam: Camera3DState, px: Float, py: Float, pz: Float, yawRad: Float) {
        cam.preset = Camera3DPresetId.FPS_RAYCAST
        val eyeH = py + 1.65f
        cam.eyeX = px; cam.eyeY = eyeH; cam.eyeZ = pz
        cam.targetX = px + sin(yawRad) * 4f
        cam.targetY = eyeH
        cam.targetZ = pz - cos(yawRad) * 4f
    }

    fun evaluateCullAndLod(distM: Float, inFrustum: Boolean, occluded: Boolean): Int {
        if (!inFrustum || occluded || distM > Space3DConstants.CULL_DISTANCE_M) return -1
        return when {
            distM <= Space3DConstants.LOD0_MAX_M -> 0
            distM <= Space3DConstants.LOD1_MAX_M -> 1
            else -> 2
        }
    }

    fun calcFogFactor(distM: Float): Float {
        if (distM <= Space3DConstants.FOG_START_M) return 0f
        if (distM >= Space3DConstants.FOG_END_M) return 1f
        return (distM - Space3DConstants.FOG_START_M) / (Space3DConstants.FOG_END_M - Space3DConstants.FOG_START_M)
    }

    fun evaluateOriginRebase(px: Float, pz: Float, curOriginX: Float, curOriginZ: Float): OriginRebaseResult {
        val threshold = Space3DConstants.REBASE_THRESHOLD_M
        if (abs(px) < threshold && abs(pz) < threshold) {
            return OriginRebaseResult(false, 0f, 0f, curOriginX, curOriginZ)
        }
        val shiftX = floor(px / threshold) * threshold
        val shiftZ = floor(pz / threshold) * threshold
        return OriginRebaseResult(
            rebased = shiftX != 0f || shiftZ != 0f,
            shiftX = shiftX,
            shiftZ = shiftZ,
            newOriginX = curOriginX + shiftX,
            newOriginZ = curOriginZ + shiftZ
        )
    }

    fun buildLookAtMatrix(
        eyeX: Float, eyeY: Float, eyeZ: Float,
        targetX: Float, targetY: Float, targetZ: Float
    ): FloatArray {
        var fx = targetX - eyeX; var fy = targetY - eyeY; var fz = targetZ - eyeZ
        val fLen = sqrt(fx * fx + fy * fy + fz * fz).coerceAtLeast(1e-5f)
        fx /= fLen; fy /= fLen; fz /= fLen
        var rx = -fz; var ry = 0f; var rz = fx
        val rLen = sqrt(rx * rx + rz * rz).coerceAtLeast(1e-5f)
        rx /= rLen; rz /= rLen
        val ux = ry * fz - rz * fy
        val uy = rz * fx - rx * fz
        val uz = rx * fy - ry * fx
        return floatArrayOf(
            rx, ux, -fx, 0f,
            ry, uy, -fy, 0f,
            rz, uz, -fz, 0f,
            -(rx * eyeX + ry * eyeY + rz * eyeZ),
            -(ux * eyeX + uy * eyeY + uz * eyeZ),
            (fx * eyeX + fy * eyeY + fz * eyeZ),
            1f
        )
    }

    fun buildPerspectiveMatrix(fovDeg: Float, aspect: Float, near: Float, far: Float): FloatArray {
        val f = 1f / tan((fovDeg * PI.toFloat() / 180f) * 0.5f)
        val nf = 1f / (near - far)
        return floatArrayOf(
            f / aspect, 0f, 0f, 0f,
            0f, f, 0f, 0f,
            0f, 0f, (far + near) * nf, -1f,
            0f, 0f, 2f * far * near * nf, 0f
        )
    }
}

class QolbuSpace3D(
    preset: Camera3DPresetId = Camera3DPresetId.FOLLOW_3_4,
    aspect: Float = 16f / 9f,
    val capacity: Int = Space3DConstants.MAX_ENTITIES
) {
    var camera = QolbuSpace3DMath.createCamera3D(preset, aspect)
    private val active = BooleanArray(capacity)
    private val wx = FloatArray(capacity)
    private val wy = FloatArray(capacity)
    private val wz = FloatArray(capacity)
    val screenX = FloatArray(capacity)
    val screenY = FloatArray(capacity)
    val lodLevel = IntArray(capacity) { -1 }

    fun setEntity(slot: Int, x: Float, y: Float, z: Float) {
        if (slot !in 0 until capacity) return
        active[slot] = true
        wx[slot] = x; wy[slot] = y; wz[slot] = z
    }

    data class UpdateCounts(val visible: Int, val culled: Int)

    fun updateAll(viewWidth: Float, viewHeight: Float): UpdateCounts {
        camera.aspect = (viewWidth / viewHeight.coerceAtLeast(1f)).coerceAtLeast(0.4f)
        val view = QolbuSpace3DMath.buildLookAtMatrix(
            camera.eyeX, camera.eyeY, camera.eyeZ,
            camera.targetX, camera.targetY, camera.targetZ
        )
        val proj = QolbuSpace3DMath.buildPerspectiveMatrix(camera.fovDeg, camera.aspect, camera.near, camera.far)
        var visible = 0
        var culled = 0
        for (i in 0 until capacity) {
            if (!active[i]) continue
            val dx = wx[i] - camera.eyeX
            val dy = wy[i] - camera.eyeY
            val dz = wz[i] - camera.eyeZ
            val dist = sqrt(dx * dx + dy * dy + dz * dz)
            val vx = view[0] * wx[i] + view[4] * wy[i] + view[8] * wz[i] + view[12]
            val vy = view[1] * wx[i] + view[5] * wy[i] + view[9] * wz[i] + view[13]
            val vz = view[2] * wx[i] + view[6] * wy[i] + view[10] * wz[i] + view[14]
            val clipW = -vz
            val inFrustum = clipW > camera.near
            val lod = QolbuSpace3DMath.evaluateCullAndLod(dist, inFrustum, false)
            lodLevel[i] = lod
            if (lod < 0) {
                culled++
                continue
            }
            val ndcX = (proj[0] * vx) / clipW
            val ndcY = (proj[5] * vy) / clipW
            screenX[i] = (ndcX * 0.5f + 0.5f) * viewWidth
            screenY[i] = (0.5f - ndcY * 0.5f) * viewHeight
            visible++
        }
        return UpdateCounts(visible, culled)
    }
}
