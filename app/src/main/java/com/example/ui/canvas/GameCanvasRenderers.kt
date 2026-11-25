package com.example.ui.canvas

import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import com.example.engine.ArtStyleId
import com.example.engine.ArtStyleSpec
import com.example.engine.ArtStyles
import com.example.engine.CharacterAnimState
import com.example.engine.GameWorld
import com.example.engine.GeneratedCharacterSpec
import com.example.engine.HybridRender5Mode
import com.example.engine.PerspectiveConnectorId
import com.example.engine.RenderMode
import com.example.engine.StyleOverrides
import com.example.engine.WeatherKind
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

object GameCanvasRenderers {
    fun drawMode7Horizon(
        scope: DrawScope,
        width: Float,
        horizonY: Float,
        bottomY: Float,
        scrollX: Float,
        style: ArtStyleSpec,
        level: Int,
        overrides: StyleOverrides = ArtStyles.DEFAULT_STYLE_OVERRIDES
    ) {
        val cA = ArtStyles.applyStyleTint(style.palette[5], overrides)
        val cB = ArtStyles.applyStyleTint(style.palette[8], overrides)
        val accent = ArtStyles.applyStyleTint(style.palette[1], overrides, 0.35f)
        val strips = 7
        val bandH = ((bottomY - horizonY) / strips).coerceAtLeast(2f)
        for (i in 0 until strips) {
            val y = horizonY + i * bandH
            val ratio = (i + 1f) / strips
            scope.drawRect(
                color = if (i % 2 == 0) cA else cB,
                topLeft = Offset(0f, y),
                size = Size(width, bandH + 1f)
            )
            val spacing = 36f + ratio * 64f
            val shift = ((scrollX * (0.4f + ratio)) % spacing)
            var gx = -shift
            while (gx < width) {
                scope.drawLine(
                    color = accent,
                    start = Offset(gx, y),
                    end = Offset(gx + (gx - width * 0.5f) * 0.14f, y + bandH),
                    strokeWidth = 1.2f
                )
                gx += spacing
            }
        }
        val sunColor = ArtStyles.applyStyleTint(style.palette[3], overrides, if (level == 3) 0.45f else 0.7f)
        scope.drawCircle(
            color = sunColor,
            radius = 24f,
            center = Offset(width * 0.78f, horizonY - 22f)
        )
    }

    fun drawGroundTile(
        scope: DrawScope,
        x: Float,
        y: Float,
        w: Float,
        h: Float,
        style: ArtStyleSpec,
        level: Int,
        overrides: StyleOverrides = ArtStyles.DEFAULT_STYLE_OVERRIDES
    ) {
        val topCol = ArtStyles.applyStyleTint(if (level == 3) style.palette[7] else style.palette[2], overrides)
        val bodyCol = ArtStyles.applyStyleTint(style.palette[5], overrides)
        scope.drawRect(color = bodyCol, topLeft = Offset(x, y), size = Size(w, h))
        scope.drawRect(color = topCol, topLeft = Offset(x, y), size = Size(w, 6f))
        if (overrides.outline) {
            scope.drawLine(
                color = ArtStyles.applyStyleTint(style.palette[6], overrides, 0.4f),
                start = Offset(x, y),
                end = Offset(x + w, y),
                strokeWidth = overrides.strokeWidth
            )
        }
    }

    fun drawTreeAsset(
        scope: DrawScope,
        cx: Float,
        groundY: Float,
        scale: Float,
        style: ArtStyleSpec,
        overrides: StyleOverrides = ArtStyles.DEFAULT_STYLE_OVERRIDES
    ) {
        val trunk = ArtStyles.applyStyleTint(style.palette[3], overrides, 0.75f)
        val leaf = ArtStyles.applyStyleTint(style.palette[2], overrides)
        scope.drawRect(trunk, Offset(cx - 5f * scale, groundY - 30f * scale), Size(10f * scale, 30f * scale))
        scope.drawCircle(leaf, 18f * scale, Offset(cx, groundY - 40f * scale))
        scope.drawCircle(ArtStyles.applyStyleTint(style.palette[1], overrides, 0.6f), 11f * scale, Offset(cx - 6f * scale, groundY - 46f * scale))
    }

    fun drawGateAsset(
        scope: DrawScope,
        x: Float,
        y: Float,
        w: Float,
        h: Float,
        unlocked: Boolean,
        style: ArtStyleSpec,
        timeSec: Float,
        overrides: StyleOverrides = ArtStyles.DEFAULT_STYLE_OVERRIDES
    ) {
        val frame = ArtStyles.applyStyleTint(style.palette[9], overrides)
        val portal = ArtStyles.applyStyleTint(if (unlocked) style.palette[2] else style.palette[4], overrides, 0.85f)
        scope.drawRoundRect(frame, Offset(x, y), Size(w, h), CornerRadius(10f, 10f))
        val pulse = if (unlocked) (0.7f + 0.3f * sin(timeSec * 5f)) else 0.35f
        scope.drawRoundRect(portal.copy(alpha = pulse), Offset(x + 6f, y + 8f), Size(w - 12f, h - 10f), CornerRadius(8f, 8f))
    }

    fun drawBowoCharacter(
        scope: DrawScope,
        cx: Float,
        cy: Float,
        size: Float,
        style: ArtStyleSpec,
        pose: CharacterAnimState,
        facing: Int,
        timeSec: Float,
        rig3d: Boolean,
        yawRad: Float = 0.25f,
        cloakAngle: Float = -0.15f,
        overrides: StyleOverrides = ArtStyles.DEFAULT_STYLE_OVERRIDES,
        customChar: GeneratedCharacterSpec? = null
    ) {
        val primaryHex = customChar?.primaryColor ?: style.palette[1]
        val cloakHex = customChar?.cloakColor ?: style.palette[2]
        val accentHex = customChar?.accentColor ?: style.palette[3]

        val bodyCol = ArtStyles.applyStyleTint(primaryHex, overrides)
        val cloakCol = ArtStyles.applyStyleTint(cloakHex, overrides)
        val accentCol = ArtStyles.applyStyleTint(accentHex, overrides)
        val rimCol = ArtStyles.applyStyleTint(style.palette[6], overrides)

        val bob = when (pose) {
            CharacterAnimState.WALK -> abs(sin(timeSec * 10f)) * -4f
            CharacterAnimState.IDLE -> sin(timeSec * 3.5f) * 2f
            CharacterAnimState.JUMP -> -4f
            CharacterAnimState.DASH -> 1f
            else -> 0f
        }
        val yPos = cy + bob

        if (overrides.shadow) {
            scope.drawOval(
                color = Color.Black.copy(alpha = 0.32f),
                topLeft = Offset(cx - size * 0.55f, cy + size * 0.45f),
                size = Size(size * 1.1f, size * 0.32f)
            )
        }

        if (customChar != null && customChar.spriteGrid.size == 12 && !rig3d) {
            val cell = (size * 1.15f) / 12f
            val startX = cx - (cell * 6f)
            val startY = yPos - (cell * 6f)
            for (r in customChar.spriteGrid.indices) {
                val row = customChar.spriteGrid[r]
                for (c in row.indices) {
                    val ch = row[c]
                    if (ch == '.') continue
                    val pxCol = when (ch) {
                        'H' -> accentCol
                        'C' -> cloakCol
                        else -> bodyCol
                    }
                    val drawC = if (facing < 0) 11 - c else c
                    scope.drawRect(pxCol, Offset(startX + drawC * cell, startY + r * cell), Size(cell + 0.5f, cell + 0.5f))
                }
            }
            return
        }

        // Cloak with spring angle
        val cloakShift = sin(cloakAngle) * size * 0.45f
        val cloakPath = Path().apply {
            moveTo(cx - facing * size * 0.1f, yPos - size * 0.1f)
            lineTo(cx - facing * (size * 0.65f + abs(cloakShift)), yPos + size * 0.48f)
            lineTo(cx + facing * size * 0.15f, yPos + size * 0.42f)
            close()
        }
        scope.drawPath(cloakPath, cloakCol)

        // 3D-Stack Torso Slices or 2D Torso
        val slices = if (rig3d) 5 else 1
        val yawShift = if (rig3d) sin(yawRad) * 4.5f else 0f
        for (s in 0 until slices) {
            val depth = s - (slices - 1) * 0.5f
            val sx = cx + depth * yawShift * 0.4f
            val sy = yPos - depth * 1.4f
            scope.drawRoundRect(
                color = if (s == slices - 1) bodyCol else bodyCol.copy(alpha = 0.78f),
                topLeft = Offset(sx - size * 0.32f, sy - size * 0.18f),
                size = Size(size * 0.64f, size * 0.58f),
                cornerRadius = CornerRadius(6f, 6f)
            )
        }

        // Head
        val headScale = if (style.id == ArtStyleId.CHIBI) 1.3f else 1f
        val headR = size * 0.32f * headScale
        scope.drawCircle(rimCol, headR, Offset(cx + yawShift * 0.5f, yPos - size * 0.44f))
        if (overrides.outline) {
            scope.drawCircle(Color.Black.copy(alpha = 0.7f), headR, Offset(cx + yawShift * 0.5f, yPos - size * 0.44f), style = Stroke(overrides.strokeWidth))
        }
        // Visor / Eyes
        scope.drawCircle(
            color = if (pose == CharacterAnimState.HURT) Color(0xFFF43F5E) else accentCol,
            radius = headR * 0.25f,
            center = Offset(cx + facing * headR * 0.36f + yawShift * 0.5f, yPos - size * 0.44f)
        )

        // Lantern Weapon / Attack Arc
        val atkDeg = if (pose == CharacterAnimState.ATTACK) facing * 58f else facing * 12f
        scope.rotate(degrees = atkDeg, pivot = Offset(cx + facing * size * 0.24f, yPos)) {
            scope.drawRoundRect(
                color = accentCol,
                topLeft = Offset(cx + facing * size * 0.22f, yPos - size * 0.42f),
                size = Size(5f, size * 0.62f),
                cornerRadius = CornerRadius(3f, 3f)
            )
        }
        if (pose == CharacterAnimState.ATTACK) {
            scope.drawArc(
                color = accentCol.copy(alpha = 0.75f),
                startAngle = if (facing > 0) -60f else 120f,
                sweepAngle = 120f,
                useCenter = false,
                topLeft = Offset(cx - size * 0.85f, yPos - size * 0.75f),
                size = Size(size * 1.7f, size * 1.4f),
                style = Stroke(width = 4f)
            )
        }
    }

    fun drawEnemyEntity(
        scope: DrawScope,
        archetype: String,
        cx: Float,
        cy: Float,
        r: Float,
        style: ArtStyleSpec,
        timeSec: Float,
        flash: Float,
        telegraphRatio: Float,
        koProgress: Float,
        bossPhase: Int,
        overrides: StyleOverrides = ArtStyles.DEFAULT_STYLE_OVERRIDES
    ) {
        if (koProgress >= 0.99f) return
        val alpha = (1f - koProgress).coerceIn(0f, 1f)
        val colHex = when (archetype) {
            "boss_kala" -> if (bossPhase >= 3) style.palette[4] else style.palette[7]
            "sentinel" -> style.palette[3]
            "wisp" -> style.palette[1]
            else -> style.palette[4]
        }
        val fill = if (flash > 0f) Color.White.copy(alpha = alpha) else ArtStyles.applyStyleTint(colHex, overrides, alpha)

        if (telegraphRatio > 0f) {
            scope.drawCircle(
                color = Color(0xFFFBBF24).copy(alpha = telegraphRatio * 0.8f),
                radius = r + 7f,
                center = Offset(cx, cy),
                style = Stroke(2.5f)
            )
        }

        val bob = sin(timeSec * 5f + cx * 0.03f) * 3f
        when (archetype) {
            "boss_kala" -> {
                scope.drawCircle(fill, r, Offset(cx, cy + bob))
                scope.drawCircle(Color(0xFFFDE047), r * 0.35f, Offset(cx, cy + bob - r * 0.2f))
                if (overrides.outline) {
                    scope.drawCircle(Color.Black.copy(alpha = alpha), r, Offset(cx, cy + bob), style = Stroke(2.5f))
                }
            }
            "sentinel" -> {
                scope.drawRoundRect(fill, Offset(cx - r, cy - r), Size(r * 2f, r * 2f), CornerRadius(6f, 6f))
            }
            "wisp" -> {
                scope.drawCircle(fill, r * 0.8f, Offset(cx, cy + bob))
                scope.drawCircle(Color.White.copy(alpha = 0.7f * alpha), r * 0.32f, Offset(cx, cy + bob))
            }
            else -> {
                scope.drawOval(fill, Offset(cx - r, cy - r * 0.75f + bob * 0.5f), Size(r * 2f, r * 1.5f))
            }
        }
    }

    fun drawGameWorld(
        scope: DrawScope,
        world: GameWorld,
        style: ArtStyleSpec,
        renderMode: RenderMode,
        weather: WeatherKind,
        physicsDebug: Boolean,
        overrides: StyleOverrides,
        hybridMode: HybridRender5Mode = HybridRender5Mode.HYBRID_2_5D_BILLBOARD,
        perspective: PerspectiveConnectorId = PerspectiveConnectorId.PARALLAX_2_5D
    ) {
        val w = scope.size.width
        val h = scope.size.height
        val scaleX = w / 540f
        val scaleY = h / 380f
        val camX = world.cameraX
        val tSec = world.time

        val skyTop = ArtStyles.applyStyleTint(if (world.level == 3) "#090414" else if (world.level == 2) "#0c192c" else style.palette[0], overrides)
        val skyBot = ArtStyles.applyStyleTint(if (world.level == 3) "#1e1038" else if (world.level == 2) "#1b365d" else style.palette[5], overrides)
        scope.drawRect(Brush.verticalGradient(listOf(skyTop, skyBot)), Offset.Zero, scope.size)

        if (hybridMode == HybridRender5Mode.RAYCAST_PSEUDO3D || perspective == PerspectiveConnectorId.FAKE_3D_RAYCAST) {
            // Cleanroom DDA corridor slice accent background
            val cols = 24
            val colW = w / cols
            for (c in 0 until cols) {
                val depth = 0.35f + 0.55f * abs(sin(c * 0.32f + camX * 0.008f))
                val wallH = h * 0.52f * depth
                val topY = (h - wallH) * 0.42f
                scope.drawRect(
                    color = ArtStyles.applyStyleTint(style.palette[5], overrides, (1f - depth * 0.5f).coerceIn(0.25f, 0.9f)),
                    topLeft = Offset(c * colW, topY),
                    size = Size(colW + 1f, wallH)
                )
            }
        } else if (renderMode != RenderMode.MODE_2D) {
            drawMode7Horizon(scope, w, h * 0.48f, world.def.groundY * scaleY, camX * scaleX, style, world.level, overrides)
        }

        // Ground
        val groundScreenY = world.def.groundY * scaleY
        drawGroundTile(scope, 0f, groundScreenY, w, h - groundScreenY, style, world.level, overrides)
        drawTreeAsset(scope, (120f - camX) * scaleX, groundScreenY, scaleY * 0.9f, style, overrides)
        drawTreeAsset(scope, (520f - camX) * scaleX, groundScreenY, scaleY * 1.05f, style, overrides)

        // Platforms
        val platColor = ArtStyles.applyStyleTint(style.palette[2], overrides)
        for (plat in world.def.platforms) {
            val sx = (plat.x - camX) * scaleX
            val sy = plat.y * scaleY
            val sw = plat.w * scaleX
            val sh = plat.h * scaleY
            if (sx + sw < -32f || sx > w + 32f) continue
            scope.drawRoundRect(platColor, Offset(sx, sy), Size(sw, sh), CornerRadius(4f, 4f))
        }

        // Obstacles (Top-Down)
        val obsColor = ArtStyles.applyStyleTint(style.palette[7], overrides, 0.85f)
        for (obs in world.obstacles) {
            val sx = (obs.x - camX) * scaleX
            val sy = obs.y * scaleY
            scope.drawRoundRect(obsColor, Offset(sx, sy), Size(obs.w * scaleX, obs.h * scaleY), CornerRadius(6f, 6f))
        }

        // Gate
        drawGateAsset(
            scope,
            (world.def.gate.x - camX) * scaleX,
            world.def.gate.y * scaleY,
            world.def.gate.w * scaleX,
            world.def.gate.h * scaleY,
            world.gateUnlocked,
            style,
            tSec,
            overrides
        )

        // Switches
        for (sw in world.switches) {
            val sx = (sw.x - camX) * scaleX
            val sy = sw.y * scaleY
            scope.drawRoundRect(
                color = if (sw.active) Color(0xFF34D399) else Color(0xFFF59E0B),
                topLeft = Offset(sx - 14f * scaleX, sy - 8f * scaleY),
                size = Size(28f * scaleX, 8f * scaleY),
                cornerRadius = CornerRadius(3f, 3f)
            )
        }

        // Shards & Coins
        for (sh in world.shards) {
            if (sh.collected) continue
            val sx = (sh.x - camX) * scaleX
            val sy = (sh.y + sin(tSec * 4f + sh.id) * 4f) * scaleY
            scope.drawCircle(Color(0xFF38BDF8), 9f * scaleX, Offset(sx, sy))
            scope.drawCircle(Color.White, 4f * scaleX, Offset(sx, sy))
        }
        for (coin in world.coins) {
            if (coin.collected) continue
            val sx = (coin.x - camX) * scaleX
            val sy = coin.y * scaleY
            scope.drawCircle(Color(0xFFFBBF24), 6f * scaleX, Offset(sx, sy))
        }

        // Rhythm Beat Notes
        for (note in world.beatNotes) {
            if (note.hit || note.missed) continue
            val nx = (note.x - camX) * scaleX
            val ny = (200f + note.lane * 52f) * scaleY
            scope.drawCircle(Color(0xFF34D399), 11f * scaleX, Offset(nx, ny))
            scope.drawCircle(Color.White, 5f * scaleX, Offset(nx, ny))
        }

        // Defense Turrets
        for (t in world.turrets) {
            val tx = (t.x - camX) * scaleX
            val ty = t.y * scaleY
            scope.drawCircle(Color(0xFF38BDF8), 12f * scaleX, Offset(tx, ty))
        }

        // Enemies
        for (e in world.enemies) {
            val ex = (e.x - camX) * scaleX
            val ey = e.y * scaleY
            if (ex < -60f || ex > w + 60f) continue
            drawEnemyEntity(scope, e.archetype, ex, ey, e.w * 0.5f * scaleX, style, tSec, e.hurtFlash, e.telegraphTimer, e.koProgress, e.bossPhase, overrides)
        }

        // Companion Luma AI
        if (world.companion.active) {
            val lx = (world.companion.x - camX) * scaleX
            val ly = (world.companion.y + sin(tSec * 6f) * 5f) * scaleY
            scope.drawCircle(Color(0xFF34D399).copy(alpha = 0.35f), 14f * scaleX, Offset(lx, ly))
            scope.drawCircle(Color(0xFF6EE7B7), 7f * scaleX, Offset(lx, ly))
        }

        // Player Bowo
        val px = (world.player.x + world.player.w * 0.5f - camX) * scaleX
        val py = (world.player.y + world.player.h * 0.5f) * scaleY
        drawBowoCharacter(
            scope = scope,
            cx = px,
            cy = py,
            size = 28f * scaleY,
            style = style,
            pose = world.player.animState,
            facing = world.player.facing,
            timeSec = tSec,
            rig3d = renderMode == RenderMode.MODE_3D_STACK,
            yawRad = sin(tSec * 2f) * 0.35f,
            cloakAngle = world.player.cloakSpring.angle1,
            overrides = overrides,
            customChar = world.customCharacter
        )

        // Projectiles
        for (pr in world.projectiles) {
            val sx = (pr.x - camX) * scaleX
            val sy = pr.y * scaleY
            scope.drawCircle(if (pr.fromPlayer) Color(0xFF38BDF8) else Color(0xFFF43F5E), pr.r * scaleX, Offset(sx, sy))
        }

        // Particles
        for (i in 0 until world.particles.capacity) {
            if (!world.particles.active[i]) continue
            val sx = (world.particles.x[i] - camX) * scaleX
            val sy = world.particles.y[i] * scaleY
            val a = (world.particles.life[i] / world.particles.maxLife[i]).coerceIn(0f, 1f)
            scope.drawCircle(Color(0xFFFDE047).copy(alpha = a), world.particles.size[i] * scaleX, Offset(sx, sy))
        }

        // Weather overlay
        if (weather == WeatherKind.HUJAN) {
            for (i in 0 until 24) {
                val rx = ((i * 53 + (tSec * 260f).toInt()) % w.toInt().coerceAtLeast(1)).toFloat()
                val ry = ((i * 37 + (tSec * 480f).toInt()) % h.toInt().coerceAtLeast(1)).toFloat()
                scope.drawLine(Color(0xFF7DD3FC).copy(alpha = 0.45f), Offset(rx, ry), Offset(rx - 6f, ry + 16f), 1.5f)
            }
        } else if (weather == WeatherKind.SALJU) {
            for (i in 0 until 24) {
                val rx = ((i * 61 + (tSec * 45f).toInt()) % w.toInt().coerceAtLeast(1)).toFloat()
                val ry = ((i * 41 + (tSec * 90f).toInt()) % h.toInt().coerceAtLeast(1)).toFloat()
                scope.drawCircle(Color.White.copy(alpha = 0.65f), 2.5f, Offset(rx, ry))
            }
        }

        // Physics Debug overlay
        if (physicsDebug) {
            scope.drawRect(
                color = Color(0xFF34D399),
                topLeft = Offset((world.player.x - camX) * scaleX, world.player.y * scaleY),
                size = Size(world.player.w * scaleX, world.player.h * scaleY),
                style = Stroke(1.5f)
            )
            for (e in world.enemies) {
                if (e.dead) continue
                scope.drawRect(
                    color = Color(0xFFF43F5E),
                    topLeft = Offset((e.x - e.w * 0.5f - camX) * scaleX, (e.y - e.h * 0.5f) * scaleY),
                    size = Size(e.w * scaleX, e.h * scaleY),
                    style = Stroke(1.5f)
                )
            }
        }

        if (overrides.scanline) {
            var sy = 0f
            while (sy < h) {
                scope.drawLine(Color.Black.copy(alpha = 0.16f), Offset(0f, sy), Offset(w, sy), 1f)
                sy += 4f
            }
        }
    }
}
