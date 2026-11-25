package com.example.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.example.engine.ArtStyles
import com.example.engine.CharacterAnimState
import com.example.engine.TouchControlConfig
import com.example.ui.AppUiState
import com.example.ui.MainViewModel
import com.example.ui.canvas.GameCanvasRenderers
import kotlinx.coroutines.delay

@Composable
fun StudioControlsTab(
    state: AppUiState,
    viewModel: MainViewModel
) {
    val cfg = state.touchConfig
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(vertical = 14.dp)
    ) {
        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Customizable Touch Controls (Itel A70 Ergonomics)", style = MaterialTheme.typography.titleMedium)

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        listOf("left" to "Joystick Left", "right" to "Joystick Right").forEach { (side, lbl) ->
                            FilterChip(
                                selected = cfg.joystickSide == side,
                                onClick = { viewModel.updateSettings { it.copy(touchConfig = cfg.copy(joystickSide = side)) } },
                                label = { Text(lbl) },
                                modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("joy_side_$side")
                            )
                        }
                    }

                    Text("Joystick Diameter: ${cfg.joystickDiameter}dp", style = MaterialTheme.typography.bodySmall)
                    Slider(
                        value = cfg.joystickDiameter.toFloat(),
                        onValueChange = { v -> viewModel.updateSettings { it.copy(touchConfig = cfg.copy(joystickDiameter = v.toInt())) } },
                        valueRange = 88f..150f
                    )

                    Text("Action Button Size: ${cfg.buttonSize}dp (min 48dp accessible)", style = MaterialTheme.typography.bodySmall)
                    Slider(
                        value = cfg.buttonSize.toFloat(),
                        onValueChange = { v -> viewModel.updateSettings { it.copy(touchConfig = cfg.copy(buttonSize = v.toInt())) } },
                        valueRange = 48f..76f
                    )

                    Text("Horizontal Offset: ${cfg.joystickOffsetX}dp · Vertical Offset: ${cfg.joystickOffsetY}dp", style = MaterialTheme.typography.bodySmall)
                    Slider(
                        value = cfg.joystickOffsetX.toFloat(),
                        onValueChange = { v -> viewModel.updateSettings { it.copy(touchConfig = cfg.copy(joystickOffsetX = v.toInt())) } },
                        valueRange = 8f..56f
                    )
                    Slider(
                        value = cfg.joystickOffsetY.toFloat(),
                        onValueChange = { v -> viewModel.updateSettings { it.copy(touchConfig = cfg.copy(joystickOffsetY = v.toInt())) } },
                        valueRange = 8f..56f
                    )

                    Text("Opacity: ${(cfg.opacity * 100).toInt()}% · Deadzone: ${(cfg.deadzone * 100).toInt()}%", style = MaterialTheme.typography.bodySmall)
                    Slider(
                        value = cfg.opacity,
                        onValueChange = { v -> viewModel.updateSettings { it.copy(touchConfig = cfg.copy(opacity = v)) } },
                        valueRange = 0.35f..1f
                    )
                    Slider(
                        value = cfg.deadzone,
                        onValueChange = { v -> viewModel.updateSettings { it.copy(touchConfig = cfg.copy(deadzone = v)) } },
                        valueRange = 0.05f..0.35f
                    )

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Haptic Feedback", style = MaterialTheme.typography.bodyMedium)
                        Switch(
                            checked = cfg.haptics,
                            onCheckedChange = { h -> viewModel.updateSettings { it.copy(touchConfig = cfg.copy(haptics = h)) } },
                            modifier = Modifier.testTag("ctrl_haptics_switch")
                        )
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Show Button Labels", style = MaterialTheme.typography.bodyMedium)
                        Switch(
                            checked = cfg.showLabels,
                            onCheckedChange = { l -> viewModel.updateSettings { it.copy(touchConfig = cfg.copy(showLabels = l)) } },
                            modifier = Modifier.testTag("ctrl_labels_switch")
                        )
                    }

                    OutlinedButton(
                        onClick = { viewModel.updateSettings { it.copy(touchConfig = TouchControlConfig()) } },
                        modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("ctrl_reset_btn")
                    ) { Text("Reset Touch Layout to Default") }
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Accessibility & Display", style = MaterialTheme.typography.titleMedium)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Dark Theme", style = MaterialTheme.typography.bodyMedium)
                        Switch(
                            checked = state.darkTheme,
                            onCheckedChange = { d -> viewModel.updateSettings { it.copy(darkTheme = d) } },
                            modifier = Modifier.testTag("a11y_dark_switch")
                        )
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("High Contrast Mode", style = MaterialTheme.typography.bodyMedium)
                        Switch(
                            checked = state.highContrast,
                            onCheckedChange = { hc -> viewModel.updateSettings { it.copy(highContrast = hc) } },
                            modifier = Modifier.testTag("a11y_hc_switch")
                        )
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Reduce Camera Shake", style = MaterialTheme.typography.bodyMedium)
                        Switch(
                            checked = state.reduceShake,
                            onCheckedChange = { rs -> viewModel.updateSettings { it.copy(reduceShake = rs) } },
                            modifier = Modifier.testTag("a11y_shake_switch")
                        )
                    }
                    Text("Base Font Size: ${state.fontSizePx}sp", style = MaterialTheme.typography.bodySmall)
                    Slider(
                        value = state.fontSizePx.toFloat(),
                        onValueChange = { sz -> viewModel.updateSettings { it.copy(fontSizePx = sz.toInt()) } },
                        valueRange = 12f..18f
                    )
                }
            }
        }
    }
}

@Composable
fun StudioArtTab(
    state: AppUiState,
    viewModel: MainViewModel
) {
    val activeSpec = remember(state.styleId, state.customPalettes) {
        ArtStyles.getStyleSpec(state.styleId, state.customPalettes)
    }
    var animSec by remember { mutableFloatStateOf(0f) }
    var editingPaletteIdx by remember { mutableIntStateOf(1) }
    var hexInput by remember(activeSpec, editingPaletteIdx) {
        mutableStateOf(activeSpec.palette.getOrElse(editingPaletteIdx) { "#38bdf8" })
    }

    LaunchedEffect(Unit) {
        while (true) {
            delay(33L)
            animSec += 0.033f
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(vertical = 14.dp)
    ) {
        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Live Style Preview: ${activeSpec.name}", style = MaterialTheme.typography.titleMedium)
                    Canvas(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(145.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(ArtStyles.applyStyleTint(activeSpec.palette[0], state.styleOverrides))
                    ) {
                        GameCanvasRenderers.drawMode7Horizon(this, size.width, size.height * 0.45f, size.height * 0.85f, animSec * 36f, activeSpec, state.activeLevel, state.styleOverrides)
                        GameCanvasRenderers.drawGroundTile(this, 0f, size.height * 0.85f, size.width, size.height * 0.15f, activeSpec, state.activeLevel, state.styleOverrides)
                        GameCanvasRenderers.drawBowoCharacter(
                            scope = this,
                            cx = size.width * 0.35f,
                            cy = size.height * 0.65f,
                            size = 34f,
                            style = activeSpec,
                            pose = CharacterAnimState.WALK,
                            facing = 1,
                            timeSec = animSec,
                            rig3d = true,
                            overrides = state.styleOverrides
                        )
                        GameCanvasRenderers.drawEnemyEntity(
                            scope = this,
                            archetype = "boss_kala",
                            cx = size.width * 0.72f,
                            cy = size.height * 0.62f,
                            r = 22f,
                            style = activeSpec,
                            timeSec = animSec,
                            flash = 0f,
                            telegraphRatio = 0.5f,
                            koProgress = 0f,
                            bossPhase = 1,
                            overrides = state.styleOverrides
                        )
                    }
                    Text(activeSpec.shaderHint, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("10-Color Palette & Shader Overrides", style = MaterialTheme.typography.titleMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                        activeSpec.palette.take(10).forEachIndexed { idx, hex ->
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(32.dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(ArtStyles.parseHexColor(hex))
                                    .border(if (editingPaletteIdx == idx) 2.5.dp else 1.dp, Color.White, RoundedCornerShape(6.dp))
                                    .clickable { editingPaletteIdx = idx }
                                    .testTag("palette_slot_$idx")
                            )
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(
                            value = hexInput,
                            onValueChange = { hexInput = it },
                            label = { Text("Slot #$editingPaletteIdx Hex") },
                            singleLine = true,
                            textStyle = LocalTextStyle.current.copy(fontFamily = FontFamily.Monospace),
                            modifier = Modifier.weight(1f).testTag("palette_hex_input")
                        )
                        Button(
                            onClick = {
                                val nextList = activeSpec.palette.toMutableList()
                                nextList[editingPaletteIdx] = hexInput.trim()
                                val nextMap = state.customPalettes + (state.styleId to nextList)
                                viewModel.updateSettings { it.copy(customPalettes = nextMap) }
                            },
                            modifier = Modifier.minimumInteractiveComponentSize().testTag("palette_apply_btn")
                        ) { Text("Apply") }
                    }

                    val ov = state.styleOverrides
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                        FilterChip(selected = ov.outline, onClick = { viewModel.updateSettings { it.copy(styleOverrides = ov.copy(outline = !ov.outline)) } }, label = { Text("Outline") }, modifier = Modifier.weight(1f))
                        FilterChip(selected = ov.shadow, onClick = { viewModel.updateSettings { it.copy(styleOverrides = ov.copy(shadow = !ov.shadow)) } }, label = { Text("Shadow") }, modifier = Modifier.weight(1f))
                        FilterChip(selected = ov.glow, onClick = { viewModel.updateSettings { it.copy(styleOverrides = ov.copy(glow = !ov.glow)) } }, label = { Text("Glow") }, modifier = Modifier.weight(1f))
                        FilterChip(selected = ov.scanline, onClick = { viewModel.updateSettings { it.copy(styleOverrides = ov.copy(scanline = !ov.scanline)) } }, label = { Text("CRT") }, modifier = Modifier.weight(1f))
                    }
                    Text("Stroke: ${String.format("%.1f", ov.strokeWidth)}px · Brightness: ${(ov.brightness * 100).toInt()}% · Contrast: ${(ov.contrast * 100).toInt()}%", style = MaterialTheme.typography.bodySmall)
                    Slider(value = ov.strokeWidth, onValueChange = { v -> viewModel.updateSettings { it.copy(styleOverrides = ov.copy(strokeWidth = v)) } }, valueRange = 1f..4f)
                    Slider(value = ov.brightness, onValueChange = { v -> viewModel.updateSettings { it.copy(styleOverrides = ov.copy(brightness = v)) } }, valueRange = 0.6f..1.5f)
                    Slider(value = ov.contrast, onValueChange = { v -> viewModel.updateSettings { it.copy(styleOverrides = ov.copy(contrast = v)) } }, valueRange = 0.6f..1.5f)
                }
            }
        }

        item { Text("12 Procedural Art Styles", style = MaterialTheme.typography.titleMedium) }
        items(ArtStyles.ART_STYLE_SPECS, key = { it.id.id }) { spec ->
            val selected = state.styleId == spec.id
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (selected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f)
                    else MaterialTheme.colorScheme.surface
                ),
                modifier = Modifier.fillMaxWidth().clickable {
                    viewModel.updateSettings { it.copy(styleId = spec.id) }
                }.testTag("art_style_${spec.id.id}")
            ) {
                Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(spec.name, style = MaterialTheme.typography.titleSmall)
                        Text(spec.subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                        spec.palette.take(4).forEach { hex ->
                            Box(modifier = Modifier.size(16.dp).clip(CircleShape).background(ArtStyles.parseHexColor(hex)))
                        }
                    }
                }
            }
        }
    }
}
