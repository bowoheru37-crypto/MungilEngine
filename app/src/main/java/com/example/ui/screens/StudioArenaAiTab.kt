package com.example.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.engine.*
import com.example.ui.AppUiState
import com.example.ui.MainViewModel
import com.example.ui.canvas.GameCanvasRenderers

@Composable
fun StudioArenaAiTab(
    state: AppUiState,
    viewModel: MainViewModel
) {
    var mode by remember(state.forcedArenaMode) { mutableStateOf(state.forcedArenaMode ?: ArenaMode.COPLAY) }
    var coachDirective by remember { mutableStateOf(ArenaCoachDirective.SEIMBANG) }
    var companionOrder by remember { mutableStateOf(ArenaCompanionOrder.SERANG) }
    var difficulty by remember { mutableStateOf(ArenaDifficulty.NORMAL) }
    var autoDiff by remember { mutableStateOf(true) }
    var speedMul by remember { mutableIntStateOf(1) }
    var showPath by remember { mutableStateOf(true) }

    var arenaWorld by remember(mode, state.activeArenaSpec?.id) {
        mutableStateOf(ArenaWorld.create(mode, state.activeArenaSpec))
    }
    var moveX by remember { mutableFloatStateOf(0f) }
    var moveY by remember { mutableFloatStateOf(0f) }
    var frameTick by remember { mutableIntStateOf(0) }

    LaunchedEffect(arenaWorld, speedMul, coachDirective, companionOrder, difficulty, autoDiff) {
        var lastNs = withFrameNanos { it }
        while (true) {
            val nowNs = withFrameNanos { it }
            val dt = ((nowNs - lastNs) / 1_000_000_000f).coerceIn(0f, 0.05f)
            lastNs = nowNs
            arenaWorld.difficulty = difficulty
            arenaWorld.autoDifficulty = autoDiff
            arenaWorld.step(dt, moveX, moveY, coachDirective, companionOrder, speedMul)
            frameTick++
        }
    }

    val style = remember(state.styleId) { ArtStyles.getStyleSpec(state.styleId) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(vertical = 14.dp)
    ) {
        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = state.activeArenaSpec?.let { "Arena AI: ${it.name} (${it.genre})" } ?: "Qolbu Arena AI Sandbox (15Hz)",
                        style = MaterialTheme.typography.titleMedium
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                        ArenaMode.entries.forEach { m ->
                            FilterChip(
                                selected = mode == m,
                                onClick = {
                                    mode = m
                                    arenaWorld = ArenaWorld.create(m, state.activeArenaSpec)
                                },
                                label = { Text(m.id.uppercase()) },
                                modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("arena_mode_${m.id}")
                            )
                        }
                    }

                    Canvas(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(210.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF070E1C))
                            .testTag("arena_canvas")
                    ) {
                        @Suppress("UNUSED_EXPRESSION")
                        frameTick
                        val sx = size.width / 360f
                        val sy = size.height / 240f
                        // Arena floor grid
                        for (gx in 1..8) drawLine(Color(0xFF17253D), Offset(gx * 40f * sx, 0f), Offset(gx * 40f * sx, size.height), 1f)
                        for (gy in 1..5) drawLine(Color(0xFF17253D), Offset(0f, gy * 40f * sy), Offset(size.width, gy * 40f * sy), 1f)

                        if (showPath && arenaWorld.aiPath.size >= 2) {
                            drawLine(
                                Color(0xFF34D399).copy(alpha = 0.65f),
                                Offset(arenaWorld.aiPath[0].first * sx, arenaWorld.aiPath[0].second * sy),
                                Offset(arenaWorld.aiPath[1].first * sx, arenaWorld.aiPath[1].second * sy),
                                2.5f
                            )
                        }

                        // Items
                        arenaWorld.items.filter { !it.collected }.forEach { item ->
                            drawCircle(
                                color = if (item.kind == "potion") Color(0xFFF43F5E) else Color(0xFFFBBF24),
                                radius = 7f * sx,
                                center = Offset(item.x * sx, item.y * sy)
                            )
                        }

                        // Enemies
                        arenaWorld.enemies.filter { !it.dead }.forEach { e ->
                            GameCanvasRenderers.drawEnemyEntity(
                                scope = this,
                                archetype = if (e.isBoss) "boss_kala" else "slime",
                                cx = e.x * sx,
                                cy = e.y * sy,
                                r = (if (e.isBoss) 22f else 14f) * sx,
                                style = style,
                                timeSec = frameTick * 0.03f,
                                flash = e.hurtFlash,
                                telegraphRatio = e.telegraph,
                                koProgress = 0f,
                                bossPhase = e.phase
                            )
                        }

                        // Qolbu Companion in CoPlay
                        if (mode == ArenaMode.COPLAY) {
                            drawCircle(Color(0xFF34D399).copy(alpha = 0.3f), 16f * sx, Offset(arenaWorld.companion.x * sx, arenaWorld.companion.y * sy))
                            drawCircle(Color(0xFF6EE7B7), 8f * sx, Offset(arenaWorld.companion.x * sx, arenaWorld.companion.y * sy))
                        }

                        // Bowo Player
                        val pose = when (arenaWorld.player.fsm) {
                            "attack" -> CharacterAnimState.ATTACK
                            "walk" -> CharacterAnimState.WALK
                            else -> CharacterAnimState.IDLE
                        }
                        GameCanvasRenderers.drawBowoCharacter(
                            scope = this,
                            cx = arenaWorld.player.x * sx,
                            cy = arenaWorld.player.y * sy,
                            size = 20f * sx,
                            style = style,
                            pose = pose,
                            facing = 1,
                            timeSec = frameTick * 0.03f,
                            rig3d = true,
                            customChar = state.customCharacter
                        )

                        if (arenaWorld.hitFlashTimer > 0f) {
                            drawRect(Color.Red.copy(alpha = 0.18f), Offset.Zero, size, style = Stroke(8f))
                        }
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(
                            "HP Bowo: ${arenaWorld.player.hp}/${arenaWorld.player.maxHp} · Score: ${arenaWorld.score}",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            arenaWorld.status.uppercase(),
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = if (arenaWorld.status == "victory") Color(0xFF34D399) else if (arenaWorld.status == "gameover") Color(0xFFF43F5E) else MaterialTheme.colorScheme.onSurface
                        )
                    }
                    Text("Otak AI: ${arenaWorld.aiThinkText}", style = MaterialTheme.typography.bodySmall)
                    Text("Adaptive Rule: ${arenaWorld.adaptiveRule} · Log: ${arenaWorld.logText}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Arena Touch Controls & AI Directives", style = MaterialTheme.typography.titleSmall)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                OutlinedButton(onClick = { moveX = -1f; moveY = 0f }, modifier = Modifier.minimumInteractiveComponentSize().testTag("arena_left_btn")) { Text("L") }
                                OutlinedButton(onClick = { moveX = 0f; moveY = -1f }, modifier = Modifier.minimumInteractiveComponentSize().testTag("arena_up_btn")) { Text("U") }
                                OutlinedButton(onClick = { moveX = 0f; moveY = 1f }, modifier = Modifier.minimumInteractiveComponentSize().testTag("arena_down_btn")) { Text("D") }
                                OutlinedButton(onClick = { moveX = 1f; moveY = 0f }, modifier = Modifier.minimumInteractiveComponentSize().testTag("arena_right_btn")) { Text("R") }
                                OutlinedButton(onClick = { moveX = 0f; moveY = 0f }, modifier = Modifier.minimumInteractiveComponentSize().testTag("arena_stop_btn")) { Text("•") }
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Button(onClick = { arenaWorld.triggerPlayerAction("attack") }, modifier = Modifier.minimumInteractiveComponentSize().testTag("arena_atk_btn")) { Text("ATK") }
                            FilledTonalButton(onClick = { arenaWorld.triggerPlayerAction("dash") }, modifier = Modifier.minimumInteractiveComponentSize().testTag("arena_dash_btn")) { Text("DASH") }
                            OutlinedButton(onClick = { arenaWorld.triggerPlayerAction("heal") }, modifier = Modifier.minimumInteractiveComponentSize().testTag("arena_heal_btn")) { Text("HEAL") }
                        }
                    }

                    if (mode == ArenaMode.SOLO) {
                        Text("Coach Directive:", style = MaterialTheme.typography.labelMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                            ArenaCoachDirective.entries.forEach { d ->
                                FilterChip(
                                    selected = coachDirective == d,
                                    onClick = { coachDirective = d },
                                    label = { Text(d.label) },
                                    modifier = Modifier.weight(1f).minimumInteractiveComponentSize()
                                )
                            }
                        }
                    } else if (mode == ArenaMode.COPLAY) {
                        Text("Qolbu Companion Order (Revives left: ${arenaWorld.companionReviveLeft}):", style = MaterialTheme.typography.labelMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
                            ArenaCompanionOrder.entries.forEach { ord ->
                                FilterChip(
                                    selected = companionOrder == ord,
                                    onClick = { companionOrder = ord },
                                    label = { Text(ord.label) },
                                    modifier = Modifier.weight(1f).minimumInteractiveComponentSize()
                                )
                            }
                        }
                    } else {
                        Text("Difficulty & Adaptive Boss Kala:", style = MaterialTheme.typography.labelMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                            ArenaDifficulty.entries.forEach { df ->
                                FilterChip(selected = difficulty == df, onClick = { difficulty = df }, label = { Text(df.label) }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize())
                            }
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        FilterChip(
                            selected = speedMul == 2,
                            onClick = { speedMul = if (speedMul == 1) 2 else 1 },
                            label = { Text("Speed ${speedMul}x") },
                            modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("arena_speed_btn")
                        )
                        FilterChip(
                            selected = showPath,
                            onClick = { showPath = !showPath },
                            label = { Text("AI Path") },
                            modifier = Modifier.weight(1f).minimumInteractiveComponentSize()
                        )
                        Button(
                            onClick = { arenaWorld = ArenaWorld.create(mode, state.activeArenaSpec) },
                            modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("arena_reset_btn")
                        ) { Text("Reset Match") }
                    }

                    Text(
                        text = "Last 10 Player Moves: ${arenaWorld.lastPlayerMoves.ifEmpty { listOf("None yet") }.joinToString(" → ")}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
