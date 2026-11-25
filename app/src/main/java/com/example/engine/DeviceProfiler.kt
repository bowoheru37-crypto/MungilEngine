package com.example.engine

import android.app.ActivityManager
import android.content.Context

data class ViewportBounds(
    val left: Float,
    val right: Float,
    val top: Float,
    val bottom: Float
)

object Culling {
    fun isRectInViewport(
        x: Float,
        y: Float,
        w: Float,
        h: Float,
        vp: ViewportBounds,
        margin: Float = 48f
    ): Boolean = x + w >= vp.left - margin &&
        x <= vp.right + margin &&
        y + h >= vp.top - margin &&
        y <= vp.bottom + margin

    fun isCircleInViewport(
        cx: Float,
        cy: Float,
        r: Float,
        vp: ViewportBounds,
        margin: Float = 48f
    ): Boolean = cx + r >= vp.left - margin &&
        cx - r <= vp.right + margin &&
        cy + r >= vp.top - margin &&
        cy - r <= vp.bottom + margin

    fun isPointInViewport(
        x: Float,
        y: Float,
        vp: ViewportBounds,
        margin: Float = 32f
    ): Boolean = x >= vp.left - margin &&
        x <= vp.right + margin &&
        y >= vp.top - margin &&
        y <= vp.bottom + margin
}

object DeviceProfiler {
    fun detectHardwareTier(context: Context? = null): DeviceTierId {
        if (context == null) return DeviceTierId.ECO
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
        val memInfo = ActivityManager.MemoryInfo()
        am?.getMemoryInfo(memInfo)
        val totalMb = memInfo.totalMem / (1024L * 1024L)
        val cores = Runtime.getRuntime().availableProcessors()
        return when {
            totalMb in 1..3600 || cores <= 4 -> DeviceTierId.ECO
            totalMb in 3601..6200 -> DeviceTierId.MID
            else -> DeviceTierId.HD
        }
    }

    fun createDeviceProfile(
        requestedTier: DeviceTierId,
        powerSaveAuto: Boolean,
        context: Context? = null
    ): DeviceProfile {
        val activeTier = if (requestedTier == DeviceTierId.AUTO) {
            detectHardwareTier(context)
        } else {
            requestedTier
        }
        return when (activeTier) {
            DeviceTierId.ECO -> DeviceProfile(
                requestedTier = requestedTier,
                activeTier = DeviceTierId.ECO,
                targetFps = 30,
                dprCap = 1.25f,
                dynamicScale = 0.80f,
                shadowBlur = 0,
                particleMax = 45,
                powerSaveAuto = powerSaveAuto,
                renderer = "Android Compose Canvas (Itel A70 Eco)"
            )
            DeviceTierId.MID -> DeviceProfile(
                requestedTier = requestedTier,
                activeTier = DeviceTierId.MID,
                targetFps = if (powerSaveAuto) 45 else 60,
                dprCap = 1.6f,
                dynamicScale = 0.92f,
                shadowBlur = 2,
                particleMax = 96,
                powerSaveAuto = powerSaveAuto,
                renderer = "Android Compose Canvas (Mid Tier)"
            )
            else -> DeviceProfile(
                requestedTier = requestedTier,
                activeTier = DeviceTierId.HD,
                targetFps = 60,
                dprCap = 2.0f,
                dynamicScale = 1.0f,
                shadowBlur = 6,
                particleMax = 160,
                powerSaveAuto = powerSaveAuto,
                renderer = "Android Compose Canvas (HD 60Hz)"
            )
        }
    }

    data class DynamicResUpdate(val nextScale: Float, val emaMs: Float)

    fun updateDynamicResolution(
        profile: DeviceProfile,
        frameMs: Float,
        currentScale: Float
    ): DynamicResUpdate {
        val budgetMs = 1000f / profile.targetFps
        val next = when {
            frameMs > budgetMs * 1.18f -> (currentScale - 0.04f).coerceAtLeast(0.60f)
            frameMs < budgetMs * 0.78f -> (currentScale + 0.02f).coerceAtMost(1.0f)
            else -> currentScale
        }
        return DynamicResUpdate(nextScale = next, emaMs = frameMs)
    }
}
