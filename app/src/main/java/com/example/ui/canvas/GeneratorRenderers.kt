package com.example.ui.canvas

import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import com.example.engine.ArtStyleSpec
import com.example.engine.ArtStyles
import com.example.engine.GeneratedCutsceneSpec
import com.example.engine.GeneratedMesh3DSpec
import com.example.engine.GeneratedSfxSpec
import com.example.engine.GeneratedTerrainSpec
import com.example.engine.StyleOverrides
import com.example.engine.WeatherKind
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.sin

object GeneratorRenderers {
    fun drawTerrainCanvas(scope: DrawScope, spec: GeneratedTerrainSpec, style: ArtStyleSpec) {
        val w = scope.size.width
        val h = scope.size.height
        val bg = when (spec.biome) {
            "storm" -> Color(0xFF0F172A)
            "obsidian" -> Color(0xFF140B24)
            else -> Color(0xFF0B1E2E)
        }
        scope.drawRect(bg, Offset.Zero, scope.size)
        val colW = w / spec.heights.size.coerceAtLeast(1)
        val mainCol = ArtStyles.parseHexColor(
            when (spec.biome) {
                "storm" -> style.palette[1]
                "obsidian" -> style.palette[7]
                else -> style.palette[2]
            }
        )
        spec.heights.forEachIndexed { idx, ht ->
            val bh = (ht / 150f) * h * 0.78f
            val x = idx * colW
            val y = h - bh
            if (spec.mode == "3D-Heightmap") {
                scope.drawRect(mainCol.copy(alpha = 0.85f), Offset(x, y), Size(colW + 0.5f, bh))
                scope.drawRect(Color.White.copy(alpha = 0.35f), Offset(x, y), Size(colW + 0.5f, 4f))
            } else {
                scope.drawRect(mainCol, Offset(x, y), Size(colW + 0.5f, bh))
            }
        }
        spec.platforms.forEach { p ->
            val sx = (p.x / 540f) * w
            val sy = (p.y / 240f) * h
            val sw = (p.w / 540f) * w
            scope.drawRoundRect(Color(0xFFFBBF24), Offset(sx, sy), Size(sw, 6f), CornerRadius(3f, 3f))
        }
    }

    fun drawSfxWaveformCanvas(scope: DrawScope, spec: GeneratedSfxSpec) {
        val w = scope.size.width
        val h = scope.size.height
        scope.drawRect(Color(0xFF020617), Offset.Zero, scope.size)
        val midY = h * 0.5f
        scope.drawLine(Color(0xFF1E293B), Offset(0f, midY), Offset(w, midY), 1f)
        val steps = 72
        val path = Path()
        for (i in 0..steps) {
            val t = i.toFloat() / steps
            val env = (1f - t) * (1f - t)
            val freq = spec.freqStart + (spec.freqEnd - spec.freqStart) * t
            val phase = t * (freq / 45f)
            val yNorm = when (spec.wave) {
                "square" -> if (sin(phase * 2f * PI.toFloat()) >= 0f) 1f else -1f
                "sawtooth" -> ((phase % 1f) * 2f - 1f)
                "triangle" -> 1f - 4f * kotlin.math.abs((phase % 1f) - 0.5f)
                else -> sin(phase * 2f * PI.toFloat())
            }
            val px = t * w
            val py = midY - yNorm * env * h * 0.38f
            if (i == 0) path.moveTo(px, py) else path.lineTo(px, py)
        }
        scope.drawPath(path, Color(0xFF38BDF8), style = Stroke(2.5f))
    }

    fun drawCutsceneCanvas(
        scope: DrawScope,
        spec: GeneratedCutsceneSpec,
        playheadSec: Float,
        style: ArtStyleSpec,
        overrides: StyleOverrides
    ) {
        val w = scope.size.width
        val h = scope.size.height
        scope.drawRect(Color(0xFF0B1221), Offset.Zero, scope.size)
        GameCanvasRenderers.drawMode7Horizon(scope, w, h * 0.52f, h * 0.84f, playheadSec * 40f, style, 1, overrides)
        GameCanvasRenderers.drawGroundTile(scope, 0f, h * 0.84f, w, h * 0.16f, style, 1, overrides)

        val kfs = spec.keyframes
        val active = kfs.lastOrNull { it.timeSec <= playheadSec } ?: kfs.firstOrNull()
        if (active != null) {
            val shake = if (active.effect == "shake") sin(playheadSec * 45f) * 4f else 0f
            GameCanvasRenderers.drawBowoCharacter(
                scope = scope,
                cx = active.xNorm * w + shake,
                cy = active.yNorm * h,
                size = 28f,
                style = style,
                pose = active.pose,
                facing = 1,
                timeSec = playheadSec,
                rig3d = true,
                overrides = overrides
            )
        }
        if (spec.weather == WeatherKind.HUJAN) {
            for (i in 0 until 18) {
                val rx = ((i * 39 + (playheadSec * 220f).toInt()) % w.toInt().coerceAtLeast(1)).toFloat()
                val ry = ((i * 29 + (playheadSec * 420f).toInt()) % h.toInt().coerceAtLeast(1)).toFloat()
                scope.drawLine(Color(0xFF7DD3FC).copy(alpha = 0.5f), Offset(rx, ry), Offset(rx - 5f, ry + 14f), 1.5f)
            }
        }
    }

    fun drawMesh3DPreviewCanvas(
        scope: DrawScope,
        mesh: GeneratedMesh3DSpec,
        yawRad: Float
    ) {
        val w = scope.size.width
        val h = scope.size.height
        scope.drawRect(Color(0xFF070D19), Offset.Zero, scope.size)
        val cx = w * 0.5f
        val cy = h * 0.52f
        val scale = minOf(w, h) * 0.36f
        val cosY = cos(yawRad)
        val sinY = sin(yawRad)

        data class ProjectedTri(val zAvg: Float, val p1: Offset, val p2: Offset, val p3: Offset, val shade: Color)
        val projected = mesh.triangles.map { tri ->
            val v0 = mesh.vertices[tri.a]
            val v1 = mesh.vertices[tri.b]
            val v2 = mesh.vertices[tri.c]
            fun rot(x: Float, y: Float, z: Float): Triple<Float, Float, Float> {
                val rx = x * cosY - z * sinY
                val rz = x * sinY + z * cosY
                return Triple(rx, y, rz)
            }
            val r0 = rot(v0.x, v0.y, v0.z)
            val r1 = rot(v1.x, v1.y, v1.z)
            val r2 = rot(v2.x, v2.y, v2.z)
            fun proj(p: Triple<Float, Float, Float>): Offset {
                val persp = 2.8f / (2.8f - p.third * 0.6f)
                return Offset(cx + p.first * scale * persp, cy - p.second * scale * persp)
            }
            // Lambert light from (0.4, 0.8, 0.5)
            val ux = r1.first - r0.first; val uy = r1.second - r0.second; val uz = r1.third - r0.third
            val vx = r2.first - r0.first; val vy = r2.second - r0.second; val vz = r2.third - r0.third
            val nx = uy * vz - uz * vy
            val ny = uz * vx - ux * vz
            val nz = ux * vy - uy * vx
            val len = kotlin.math.sqrt(nx * nx + ny * ny + nz * nz).coerceAtLeast(1e-4f)
            val ndl = ((nx / len) * 0.4f + (ny / len) * 0.8f + (nz / len) * 0.5f).coerceIn(0.25f, 1.0f)
            val baseCol = ArtStyles.parseHexColor(tri.color)
            val shaded = Color(
                red = (baseCol.red * (0.45f + 0.55f * ndl)).coerceIn(0f, 1f),
                green = (baseCol.green * (0.45f + 0.55f * ndl)).coerceIn(0f, 1f),
                blue = (baseCol.blue * (0.45f + 0.55f * ndl)).coerceIn(0f, 1f),
                alpha = 1f
            )
            ProjectedTri((r0.third + r1.third + r2.third) / 3f, proj(r0), proj(r1), proj(r2), shaded)
        }.sortedBy { it.zAvg }

        for (pt in projected) {
            val path = Path().apply {
                moveTo(pt.p1.x, pt.p1.y)
                lineTo(pt.p2.x, pt.p2.y)
                lineTo(pt.p3.x, pt.p3.y)
                close()
            }
            scope.drawPath(path, pt.shade)
            scope.drawPath(path, Color.Black.copy(alpha = 0.25f), style = Stroke(0.8f))
        }
    }
}
