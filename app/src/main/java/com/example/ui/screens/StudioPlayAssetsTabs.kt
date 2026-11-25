package com.example.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.engine.*
import com.example.ui.AppUiState
import com.example.ui.MainViewModel
import com.example.ui.canvas.GameCanvasRenderers
import kotlinx.coroutines.delay

@Composable
fun StudioPlayTab(
    state: AppUiState,
    viewModel: MainViewModel
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(vertical = 14.dp)
    ) {
        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Project & Chapter Selector", style = MaterialTheme.typography.titleMedium)
                    OutlinedTextField(
                        value = state.gameName,
                        onValueChange = { next -> viewModel.updateSettings { it.copy(gameName = next) } },
                        label = { Text("Game Title") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().testTag("play_game_title_input")
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        listOf(
                            1 to "Lv.1 Desa Fajar",
                            2 to "Lv.2 Badai",
                            3 to "Lv.3 Boss Kala"
                        ).forEach { (lvl, label) ->
                            val selected = state.activeLevel == lvl
                            FilterChip(
                                selected = selected,
                                onClick = { viewModel.startOrRestartLevel(lvl) },
                                label = { Text(label) },
                                modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("play_level_$lvl")
                            )
                        }
                    }

                    Button(
                        onClick = { viewModel.startOrRestartLevel(state.activeLevel) },
                        modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("play_launch_active_btn")
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text("Launch Chapter ${state.activeLevel}")
                    }
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Itel A70 Performance & Engine Modes", style = MaterialTheme.typography.titleMedium)
                    Text(
                        text = "Active Tier: ${state.deviceProfile.activeTier.id.uppercase()} · Target ${state.deviceProfile.targetFps} FPS · Max Particles ${state.deviceProfile.particleMax}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                        DeviceTierId.entries.forEach { tier ->
                            FilterChip(
                                selected = state.requestedTier == tier,
                                onClick = { viewModel.setDeviceTier(tier) },
                                label = { Text(tier.id.uppercase()) },
                                modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("tier_${tier.id}")
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Power Saver Auto-Clamp", style = MaterialTheme.typography.bodyMedium)
                        Switch(
                            checked = state.powerSaveAuto,
                            onCheckedChange = { viewModel.setDeviceTier(state.requestedTier, it) },
                            modifier = Modifier.testTag("power_save_switch")
                        )
                    }

                    Text("Render Dimension", style = MaterialTheme.typography.labelLarge)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                        RenderMode.entries.forEach { rm ->
                            FilterChip(
                                selected = state.renderMode == rm,
                                onClick = { viewModel.updateSettings { it.copy(renderMode = rm) } },
                                label = { Text(rm.label) },
                                modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("render_${rm.label}")
                            )
                        }
                    }

                    Text("Physics Mode", style = MaterialTheme.typography.labelLarge)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                        PhysicsMode.entries.forEach { pm ->
                            FilterChip(
                                selected = state.physicsMode == pm,
                                onClick = { viewModel.updateSettings { it.copy(physicsMode = pm) } },
                                label = { Text(pm.label) },
                                modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("phys_${pm.label}")
                            )
                        }
                    }

                    Text("Weather Atmosphere", style = MaterialTheme.typography.labelLarge)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                        WeatherKind.entries.forEach { wk ->
                            FilterChip(
                                selected = state.weather == wk,
                                onClick = { viewModel.updateSettings { it.copy(weather = wk) } },
                                label = { Text(wk.label) },
                                modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("weather_${wk.label}")
                            )
                        }
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Practice Mode (Invulnerable)", style = MaterialTheme.typography.bodyMedium)
                        Switch(
                            checked = state.practiceMode,
                            onCheckedChange = { next -> viewModel.updateSettings { it.copy(practiceMode = next) } },
                            modifier = Modifier.testTag("practice_mode_switch")
                        )
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Physics Collider Debug Box", style = MaterialTheme.typography.bodyMedium)
                        Switch(
                            checked = state.physicsDebug,
                            onCheckedChange = { next -> viewModel.updateSettings { it.copy(physicsDebug = next) } },
                            modifier = Modifier.testTag("physics_debug_switch")
                        )
                    }
                }
            }
        }

        item {
            Text("16 Playable Genre Templates (1-Tap Launch)", style = MaterialTheme.typography.titleMedium)
        }

        items(Catalogs.GENRE_TEMPLATES, key = { it.id }) { tpl ->
            val isCurrent = state.activeGenreId == tpl.id
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (isCurrent) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f)
                    else MaterialTheme.colorScheme.surface
                )
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f).padding(end = 8.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(tpl.name, style = MaterialTheme.typography.titleSmall)
                        Text(tpl.desc, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            "${tpl.renderMode.label} · ${tpl.physicsMode.label} · ${tpl.styleId.id.uppercase()} · ${tpl.weather.label}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    Button(
                        onClick = { viewModel.startOrRestartLevel(state.activeLevel, genre = tpl) },
                        modifier = Modifier.minimumInteractiveComponentSize().testTag("genre_launch_${tpl.id}")
                    ) {
                        Text("Play")
                    }
                }
            }
        }
    }
}

@Composable
fun StudioAssetsTab(
    state: AppUiState,
    viewModel: MainViewModel
) {
    var showcasePose by remember { mutableStateOf(CharacterAnimState.IDLE) }
    var rig3d by remember { mutableStateOf(true) }
    var animSec by remember { mutableFloatStateOf(0f) }

    var pixelGrid by remember { mutableStateOf(viewModel.storage.loadPixelGrid(16)) }
    var pixelUndo by remember { mutableStateOf<List<Int>?>(null) }
    var activePaletteIdx by remember { mutableIntStateOf(1) }

    var tileGrid by remember { mutableStateOf(viewModel.storage.loadTilemap()) }
    var activeTileBrush by remember { mutableIntStateOf(1) }

    var assetStats by remember { mutableStateOf(viewModel.assetManager.getStats()) }
    var managedAssets by remember { mutableStateOf(viewModel.assetManager.listAssets()) }

    val style = remember(state.styleId, state.customPalettes) {
        ArtStyles.getStyleSpec(state.styleId, state.customPalettes)
    }

    LaunchedEffect(Unit) {
        while (true) {
            delay(33L)
            animSec += 0.033f
        }
    }

    val refreshAssets = {
        assetStats = viewModel.assetManager.getStats()
        managedAssets = viewModel.assetManager.listAssets()
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(vertical = 14.dp)
    ) {
        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Bowo Character Pose Showcase", style = MaterialTheme.typography.titleMedium)
                        FilterChip(
                            selected = rig3d,
                            onClick = { rig3d = !rig3d },
                            label = { Text(if (rig3d) "3D-Stack" else "2D Flat") },
                            modifier = Modifier.minimumInteractiveComponentSize().testTag("asset_rig_toggle")
                        )
                    }
                    Canvas(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF091122))
                    ) {
                        GameCanvasRenderers.drawBowoCharacter(
                            scope = this,
                            cx = size.width * 0.5f,
                            cy = size.height * 0.55f,
                            size = 44f,
                            style = style,
                            pose = showcasePose,
                            facing = 1,
                            timeSec = animSec,
                            rig3d = rig3d,
                            yawRad = animSec * 0.9f,
                            overrides = state.styleOverrides,
                            customChar = state.customCharacter
                        )
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        CharacterAnimState.entries.forEach { pose ->
                            FilterChip(
                                selected = showcasePose == pose,
                                onClick = { showcasePose = pose },
                                label = { Text(pose.id.uppercase()) },
                                modifier = Modifier.minimumInteractiveComponentSize().testTag("pose_${pose.id}")
                            )
                        }
                    }
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Mobile LRU AssetManager (2 MB Budget)", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Used ${(assetStats.usedBytes / 1024)} KB / ${(assetStats.budgetBytes / 1024)} KB · Loaded ${assetStats.loadedCount} · Evictions ${assetStats.evictions}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                        listOf(1, 2, 3).forEach { lvl ->
                            OutlinedButton(
                                onClick = {
                                    viewModel.assetManager.loadLevelBundle(lvl)
                                    refreshAssets()
                                    viewModel.showBanner("Loaded Level $lvl asset bundle")
                                },
                                modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("lru_load_lv$lvl")
                            ) { Text("Load Lv.$lvl") }
                        }
                        FilledTonalButton(
                            onClick = {
                                val unloaded = viewModel.assetManager.unloadUnused()
                                refreshAssets()
                                viewModel.showBanner("Unloaded ${unloaded.size} biome packs")
                            },
                            modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("lru_unload_btn")
                        ) { Text("Prune") }
                    }
                    managedAssets.forEach { asset ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(asset.name, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                                Text(
                                    "${asset.biome} · ${asset.bytes / 1024} KB · ${if (asset.loaded) "LOADED" else "UNLOADED"}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (asset.loaded) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            TextButton(
                                onClick = {
                                    viewModel.assetManager.setPinned(asset.id, !asset.pinned)
                                    refreshAssets()
                                },
                                modifier = Modifier.minimumInteractiveComponentSize().testTag("pin_${asset.id}")
                            ) { Text(if (asset.pinned) "Pinned" else "Pin") }
                        }
                    }
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("16x16 Pixel Sprite Editor (Aseprite Style)", style = MaterialTheme.typography.titleMedium)
                    val swatchColors = listOf(Color.Transparent, Color(0xFF38BDF8), Color(0xFF34D399), Color(0xFFFBBF24), Color(0xFFF43F5E), Color(0xFFF8FAFC))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        swatchColors.forEachIndexed { idx, col ->
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(if (idx == 0) Color(0xFF1E293B) else col)
                                    .border(if (activePaletteIdx == idx) 3.dp else 1.dp, Color.White, CircleShape)
                                    .clickable { activePaletteIdx = idx }
                                    .testTag("pixel_swatch_$idx"),
                                contentAlignment = Alignment.Center
                            ) {
                                if (idx == 0) Text("X", style = MaterialTheme.typography.labelSmall, color = Color.White)
                            }
                        }
                    }
                    Canvas(
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFF070C18))
                            .testTag("pixel_editor_canvas")
                            .pointerInput(activePaletteIdx, pixelGrid) {
                                detectTapGestures { pos ->
                                    val cell = size.width / 16f
                                    val cx = (pos.x / cell).toInt().coerceIn(0, 15)
                                    val cy = (pos.y / cell).toInt().coerceIn(0, 15)
                                    val idx = cy * 16 + cx
                                    pixelUndo = pixelGrid
                                    val next = pixelGrid.toMutableList()
                                    next[idx] = activePaletteIdx
                                    pixelGrid = next
                                }
                            }
                    ) {
                        val cw = size.width / 16f
                        val ch = size.height / 16f
                        for (r in 0 until 16) {
                            for (c in 0 until 16) {
                                val v = pixelGrid[r * 16 + c]
                                if (v > 0 && v < swatchColors.size) {
                                    drawRect(swatchColors[v], Offset(c * cw, r * ch), Size(cw, ch))
                                }
                                drawRect(Color.White.copy(alpha = 0.08f), Offset(c * cw, r * ch), Size(cw, ch), style = androidx.compose.ui.graphics.drawscope.Stroke(1f))
                            }
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(
                            onClick = { pixelUndo?.let { pixelGrid = it; pixelUndo = null } },
                            enabled = pixelUndo != null,
                            modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("pixel_undo_btn")
                        ) { Text("Undo") }
                        OutlinedButton(
                            onClick = {
                                pixelUndo = pixelGrid
                                pixelGrid = List(256) { 0 }
                            },
                            modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("pixel_clear_btn")
                        ) { Text("Clear") }
                        Button(
                            onClick = {
                                viewModel.storage.savePixelGrid(pixelGrid)
                                viewModel.showBanner("Saved 16x16 pixel sprite locally!")
                            },
                            modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("pixel_save_btn")
                        ) { Text("Save") }
                    }
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("12x8 Tilemap Editor (Tiled Schema)", style = MaterialTheme.typography.titleMedium)
                    val tileLabels = listOf("0: Erase", "1: Ground", "2: Platform", "3: Hazard")
                    val tileColors = listOf(Color(0xFF0F172A), Color(0xFF34D399), Color(0xFF38BDF8), Color(0xFFF43F5E))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                        tileLabels.forEachIndexed { idx, lbl ->
                            FilterChip(
                                selected = activeTileBrush == idx,
                                onClick = { activeTileBrush = idx },
                                label = { Text(lbl) },
                                modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("tile_brush_$idx")
                            )
                        }
                    }
                    Canvas(
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(12f / 8f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFF060B16))
                            .testTag("tilemap_editor_canvas")
                            .pointerInput(activeTileBrush, tileGrid) {
                                detectTapGestures { pos ->
                                    val cw = size.width / 12f
                                    val ch = size.height / 8f
                                    val cx = (pos.x / cw).toInt().coerceIn(0, 11)
                                    val cy = (pos.y / ch).toInt().coerceIn(0, 7)
                                    val next = tileGrid.toMutableList()
                                    next[cy * 12 + cx] = activeTileBrush
                                    tileGrid = next
                                }
                            }
                    ) {
                        val cw = size.width / 12f
                        val ch = size.height / 8f
                        for (r in 0 until 8) {
                            for (c in 0 until 12) {
                                val v = tileGrid[r * 12 + c].coerceIn(0, 3)
                                drawRect(tileColors[v], Offset(c * cw, r * ch), Size(cw, ch))
                                drawRect(Color.White.copy(alpha = 0.14f), Offset(c * cw, r * ch), Size(cw, ch), style = androidx.compose.ui.graphics.drawscope.Stroke(1f))
                            }
                        }
                    }
                    Button(
                        onClick = {
                            viewModel.storage.saveTilemap(tileGrid)
                            viewModel.showBanner("Saved 12x8 tilemap!")
                        },
                        modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("tilemap_save_btn")
                    ) { Text("Save Tilemap") }
                }
            }
        }

        item {
            Text("Built-In Procedural Asset Catalog (10 Packs)", style = MaterialTheme.typography.titleMedium)
        }
        items(Catalogs.ASSET_CATALOG, key = { it.id }) { item ->
            Card(shape = RoundedCornerShape(12.dp)) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(item.name, style = MaterialTheme.typography.titleSmall)
                        Text("${item.category} · ${item.memoryKb} KB", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                    }
                    Text(item.desc, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}
