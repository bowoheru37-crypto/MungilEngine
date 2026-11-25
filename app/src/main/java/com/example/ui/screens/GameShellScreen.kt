package com.example.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.engine.*
import com.example.ui.AppUiState
import com.example.ui.MainViewModel
import com.example.ui.canvas.GameCanvasRenderers
import kotlin.math.hypot
import kotlin.math.roundToInt

@Composable
fun GameShellScreen(
    state: AppUiState,
    viewModel: MainViewModel
) {
    val tr = I18n.t(state.lang)
    val haptics = LocalHapticFeedback.current
    val style = remember(state.styleId, state.customPalettes) {
        ArtStyles.getStyleSpec(state.styleId, state.customPalettes)
    }

    // Mutable input state read inside Compose frame loop (zero allocations per frame)
    val moveX = remember { mutableFloatStateOf(0f) }
    val moveY = remember { mutableFloatStateOf(0f) }
    val jumpQueued = remember { mutableStateOf(false) }
    val jumpHoldFrames = remember { mutableIntStateOf(0) }
    val attackQueued = remember { mutableStateOf(false) }
    val dashQueued = remember { mutableStateOf(false) }
    val burstQueued = remember { mutableStateOf(false) }
    var frameTick by remember { mutableIntStateOf(0) }

    BackHandler {
        when (state.shellState) {
            GameShellState.PLAYING -> viewModel.pauseGame()
            GameShellState.PAUSED -> viewModel.resumeGame()
            else -> viewModel.backToLanding()
        }
    }

    // Fixed-timestep simulation loop synced to Compose frames
    LaunchedEffect(state.shellState, state.deviceProfile.targetFps, state.aiMode) {
        if (state.shellState != GameShellState.PLAYING) return@LaunchedEffect
        var lastNs = withFrameNanos { it }
        var accum = 0f
        var fpsFrames = 0
        var fpsTimer = 0f
        var currentFps = state.deviceProfile.targetFps
        val fixedDt = if (state.deviceProfile.targetFps <= 35) 1f / 30f else 1f / 60f

        while (state.shellState == GameShellState.PLAYING) {
            val nowNs = withFrameNanos { it }
            val rawDt = ((nowNs - lastNs) / 1_000_000_000f).coerceIn(0f, 0.05f)
            lastNs = nowNs
            accum += rawDt
            fpsFrames++
            fpsTimer += rawDt
            if (fpsTimer >= 0.5f) {
                currentFps = (fpsFrames / fpsTimer).roundToInt().coerceIn(1, 120)
                fpsFrames = 0
                fpsTimer = 0f
            }

            val cfg = SimConfig(
                physicsMode = state.physicsMode,
                renderMode = state.renderMode,
                weather = state.weather,
                practiceMode = state.practiceMode,
                speedMul = state.speedMul,
                gravityMul = state.gravityMul,
                eventRules = state.eventRules
            )

            var steps = 0
            val allEvents = mutableListOf<SimEvent>()
            while (accum >= fixedDt && steps < QolbuConstants.MAX_CATCHUP_STEPS) {
                val input = SimInput(
                    moveX = moveX.floatValue,
                    moveY = moveY.floatValue,
                    jumpPressed = jumpQueued.value,
                    jumpHeld = jumpHoldFrames.intValue > 0,
                    attackPressed = attackQueued.value,
                    dashPressed = dashQueued.value,
                    burstPressed = burstQueued.value
                )
                jumpQueued.value = false
                if (jumpHoldFrames.intValue > 0) jumpHoldFrames.intValue--
                attackQueued.value = false
                dashQueued.value = false
                burstQueued.value = false

                allEvents.addAll(
                    GameSimulation.stepGameWorld(viewModel.activeWorld, input, fixedDt, cfg, state.aiMode)
                )
                accum -= fixedDt
                steps++
            }
            if (steps > 0 || allEvents.isNotEmpty()) {
                viewModel.syncWorldEventsAndHud(allEvents, currentFps)
                frameTick++
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .windowInsetsPadding(WindowInsets.safeDrawing)
    ) {
        // Live Game Canvas
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .testTag("game_stage_canvas")
        ) {
            @Suppress("UNUSED_EXPRESSION")
            frameTick
            GameCanvasRenderers.drawGameWorld(
                scope = this,
                world = viewModel.activeWorld,
                style = style,
                renderMode = state.renderMode,
                weather = state.weather,
                physicsDebug = state.physicsDebug,
                overrides = state.styleOverrides,
                hybridMode = state.hybridMode,
                perspective = state.perspectiveConnector
            )
        }

        // Top Compact HUD
        if (state.shellState == GameShellState.PLAYING || state.shellState == GameShellState.PAUSED) {
            val hud = state.hud
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(10.dp)
            ) {
                Surface(
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.88f),
                    shape = RoundedCornerShape(14.dp),
                    tonalElevation = 3.dp
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Lv.${hud.level} ${hud.levelName} · HP ${hud.hp}/${hud.maxHp} · EN ${hud.energy}",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "Shards ${hud.shards}/${hud.requiredShards} · Sw ${hud.switchesActive}/${hud.requiredSwitches} · Coins ${hud.coins} · Score ${hud.score} · ${hud.fps} FPS",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Text(
                                text = hud.objective,
                                style = MaterialTheme.typography.bodySmall,
                                color = if (hud.gateUnlocked) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            IconButton(
                                onClick = { viewModel.openStudioTab(StudioTab.PLAY) },
                                modifier = Modifier.minimumInteractiveComponentSize().testTag("hud_studio_button")
                            ) {
                                Icon(Icons.Default.Build, contentDescription = stringResource(R.string.cd_open_studio))
                            }
                            IconButton(
                                onClick = { viewModel.pauseGame() },
                                modifier = Modifier.minimumInteractiveComponentSize().testTag("hud_pause_button")
                            ) {
                                Icon(Icons.Default.Pause, contentDescription = stringResource(R.string.cd_pause_game))
                            }
                        }
                    }
                }

                if (hud.bossMaxHp > 0) {
                    Spacer(Modifier.height(6.dp))
                    Surface(
                        color = Color(0xFF1E0B2B).copy(alpha = 0.9f),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)) {
                            Text(
                                text = "BOSS KALA · PHASE ${hud.bossPhase} (${hud.bossHp}/${hud.bossMaxHp})",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFFFDE047)
                            )
                            LinearProgressIndicator(
                                progress = { (hud.bossHp.toFloat() / hud.bossMaxHp).coerceIn(0f, 1f) },
                                modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                                color = Color(0xFFF43F5E)
                            )
                        }
                    }
                }
            }
        }

        // Visual Novel Overlay
        val vn = state.hud.vnDialog
        if (state.shellState == GameShellState.PLAYING && vn != null) {
            Card(
                modifier = Modifier
                    .align(Alignment.Center)
                    .fillMaxWidth(0.92f),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.96f)),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("${vn.speaker} (${vn.step}/${vn.totalSteps})", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                    Text(vn.text, style = MaterialTheme.typography.bodyMedium)
                    vn.choices.forEachIndexed { idx, label ->
                        Button(
                            onClick = { viewModel.chooseVnOption(idx) },
                            modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("vn_choice_$idx")
                        ) { Text(label) }
                    }
                }
            }
        }

        // Customizable Touch Controls (Joystick + Action Buttons)
        if (state.shellState == GameShellState.PLAYING) {
            val cfg = state.touchConfig
            val joyLeft = cfg.joystickSide != "right"
            val joyModifier = Modifier
                .align(if (joyLeft) Alignment.BottomStart else Alignment.BottomEnd)
                .padding(horizontal = cfg.joystickOffsetX.dp, vertical = cfg.joystickOffsetY.dp)

            VirtualJoystick(
                diameterDp = cfg.joystickDiameter,
                deadzone = cfg.deadzone,
                opacity = cfg.opacity,
                modifier = joyModifier,
                onMove = { dx, dy ->
                    moveX.floatValue = dx
                    moveY.floatValue = dy
                }
            )

            val btnAlignment = if (joyLeft) Alignment.BottomEnd else Alignment.BottomStart
            Column(
                modifier = Modifier
                    .align(btnAlignment)
                    .padding(horizontal = 16.dp, vertical = cfg.joystickOffsetY.dp)
                    .alpha(cfg.opacity),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                horizontalAlignment = Alignment.End
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ActionTouchButton("POT(${state.hud.potions})", Color(0xFF10B981), cfg.buttonSize, cfg.showLabels, "touch_potion_btn") {
                        if (cfg.haptics) haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        viewModel.triggerPotion()
                    }
                    ActionTouchButton("BURST", Color(0xFFA855F7), cfg.buttonSize, cfg.showLabels, "touch_burst_btn") {
                        if (cfg.haptics) haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                        burstQueued.value = true
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ActionTouchButton("DASH", Color(0xFF38BDF8), cfg.buttonSize, cfg.showLabels, "touch_dash_btn") {
                        if (cfg.haptics) haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        dashQueued.value = true
                    }
                    ActionTouchButton("ATK", Color(0xFFF43F5E), cfg.buttonSize, cfg.showLabels, "touch_attack_btn") {
                        if (cfg.haptics) haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        attackQueued.value = true
                    }
                    ActionTouchButton("JUMP", Color(0xFFFBBF24), cfg.buttonSize, cfg.showLabels, "touch_jump_btn") {
                        if (cfg.haptics) haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        jumpQueued.value = true
                        jumpHoldFrames.intValue = 8
                    }
                }
            }
        }

        // Title / Pause / Victory / GameOver Overlays
        if (state.shellState == GameShellState.TITLE) {
            GameOverlayModal(title = state.gameName, subtitle = "Select Mode & Start Chapter ${state.activeLevel}") {
                Button(
                    onClick = { viewModel.startOrRestartLevel(state.activeLevel, aiOverride = AiPlayMode.OFF) },
                    modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("title_solo_btn")
                ) { Text("Play Solo") }
                FilledTonalButton(
                    onClick = { viewModel.startOrRestartLevel(state.activeLevel, aiOverride = AiPlayMode.COOP) },
                    modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("title_coop_btn")
                ) { Text("Play With Luma AI Co-Op") }
                OutlinedButton(
                    onClick = { viewModel.startOrRestartLevel(state.activeLevel, aiOverride = AiPlayMode.AUTOPILOT) },
                    modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("title_autopilot_btn")
                ) { Text("Watch AI Autopilot Play") }
                if (state.latestSave?.exists == true) {
                    OutlinedButton(
                        onClick = { viewModel.loadProgress(state.latestSave.id, true) },
                        modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("title_continue_btn")
                    ) { Text("${tr.continueSaved} (Lv.${state.latestSave.level})") }
                }
                TextButton(
                    onClick = { viewModel.backToLanding() },
                    modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("title_back_home_btn")
                ) { Text("Back to Home") }
            }
        } else if (state.shellState == GameShellState.PAUSED) {
            GameOverlayModal(title = tr.pausedTitle, subtitle = "Lv.${state.activeLevel} · Score ${state.hud.score}") {
                Button(
                    onClick = { viewModel.resumeGame() },
                    modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("pause_resume_btn")
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = null)
                    Spacer(Modifier.width(4.dp))
                    Text(tr.resumeGame)
                }
                OutlinedButton(
                    onClick = { viewModel.startOrRestartLevel(state.activeLevel) },
                    modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("pause_restart_btn")
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null)
                    Spacer(Modifier.width(4.dp))
                    Text(tr.restartLevel)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    listOf("1", "2", "3").forEach { slot ->
                        OutlinedButton(
                            onClick = {
                                val (_, bytes) = viewModel.saveProgress(slot)
                                viewModel.showBanner("Saved Slot $slot ($bytes bytes)")
                            },
                            modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("pause_save_$slot")
                        ) { Text("Save $slot") }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    listOf("1", "2", "3").forEach { slot ->
                        FilledTonalButton(
                            onClick = { viewModel.loadProgress(slot, true) },
                            modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("pause_load_$slot")
                        ) { Text("Load $slot") }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    OutlinedButton(
                        onClick = { viewModel.openStudioTab(StudioTab.PLAY) },
                        modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("pause_studio_btn")
                    ) { Text(tr.openStudio) }
                    TextButton(
                        onClick = { viewModel.backToLanding() },
                        modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("pause_home_btn")
                    ) { Text("Home") }
                }
            }
        } else if (state.shellState == GameShellState.VICTORY || state.shellState == GameShellState.GAMEOVER) {
            val won = state.shellState == GameShellState.VICTORY
            GameOverlayModal(
                title = if (won) tr.victoryTitle else tr.gameoverTitle,
                subtitle = "Score ${state.hud.score} · Coins ${state.hud.coins} · Kills ${state.hud.kills}"
            ) {
                Button(
                    onClick = { viewModel.startOrRestartLevel(if (won) 1 else state.activeLevel) },
                    modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("end_replay_btn")
                ) { Text(if (won) "Play Again (Ch. 1)" else tr.restartLevel) }
                OutlinedButton(
                    onClick = { viewModel.openStudioTab(StudioTab.PLAY) },
                    modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("end_studio_btn")
                ) { Text(tr.openStudio) }
                TextButton(
                    onClick = { viewModel.backToLanding() },
                    modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("end_home_btn")
                ) { Text("Back to Home") }
            }
        }
    }
}

@Composable
private fun VirtualJoystick(
    diameterDp: Int,
    deadzone: Float,
    opacity: Float,
    modifier: Modifier = Modifier,
    onMove: (Float, Float) -> Unit
) {
    var knobOffset by remember { mutableStateOf(Offset.Zero) }
    val radiusPx = diameterDp * 1.15f
    Box(
        modifier = modifier
            .size(diameterDp.dp)
            .alpha(opacity)
            .clip(CircleShape)
            .background(Color.Black.copy(alpha = 0.35f))
            .border(2.dp, Color(0xFF38BDF8).copy(alpha = 0.7f), CircleShape)
            .testTag("virtual_joystick")
            .pointerInput(diameterDp, deadzone) {
                detectDragGestures(
                    onDragEnd = {
                        knobOffset = Offset.Zero
                        onMove(0f, 0f)
                    },
                    onDragCancel = {
                        knobOffset = Offset.Zero
                        onMove(0f, 0f)
                    },
                    onDrag = { change, dragAmount ->
                        change.consume()
                        val cand = knobOffset + dragAmount
                        val dist = hypot(cand.x, cand.y)
                        val maxR = size.width * 0.38f
                        val clamped = if (dist > maxR) cand * (maxR / dist) else cand
                        knobOffset = clamped
                        val nx = (clamped.x / maxR).coerceIn(-1f, 1f)
                        val ny = (clamped.y / maxR).coerceIn(-1f, 1f)
                        onMove(
                            if (kotlin.math.abs(nx) < deadzone) 0f else nx,
                            if (kotlin.math.abs(ny) < deadzone) 0f else ny
                        )
                    }
                )
            },
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .offset { IntOffset(knobOffset.x.roundToInt(), knobOffset.y.roundToInt()) }
                .size((diameterDp * 0.42f).dp)
                .clip(CircleShape)
                .background(Color(0xFF38BDF8).copy(alpha = 0.85f))
        )
    }
}

@Composable
private fun ActionTouchButton(
    label: String,
    color: Color,
    sizeDp: Int,
    showLabel: Boolean,
    tag: String,
    onClick: () -> Unit
) {
    val safeSize = sizeDp.coerceAtLeast(48)
    Button(
        onClick = onClick,
        shape = CircleShape,
        contentPadding = PaddingValues(2.dp),
        colors = ButtonDefaults.buttonColors(containerColor = color, contentColor = Color(0xFF090F1D)),
        modifier = Modifier
            .size(safeSize.dp)
            .testTag(tag)
    ) {
        Text(
            text = if (showLabel) label else label.take(1),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.ExtraBold
        )
    }
}

@Composable
private fun GameOverlayModal(
    title: String,
    subtitle: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.68f)),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.88f)
                .widthIn(max = 420.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(title, style = MaterialTheme.typography.headlineSmall)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                content()
            }
        }
    }
}
