package com.example.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.example.engine.*
import com.example.ui.AppUiState
import com.example.ui.MainViewModel
import com.example.ui.canvas.GameCanvasRenderers
import com.example.ui.canvas.GeneratorRenderers
import kotlinx.coroutines.delay

@Composable
fun StudioGeneratorsTab(
    state: AppUiState,
    viewModel: MainViewModel,
    onExportFile: (String, String, ByteArray) -> Unit
) {
    var genSubTab by remember { mutableIntStateOf(0) }
    val subTabNames = listOf("Character & Rig", "3D Mesh", "Sprite & Props", "Music", "SFX & Dub", "Cutscene", "Terrain", "Forge & FSM")
    val style = remember(state.styleId) { ArtStyles.getStyleSpec(state.styleId) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(vertical = 14.dp)
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                subTabNames.forEachIndexed { idx, label ->
                    FilterChip(
                        selected = genSubTab == idx,
                        onClick = { genSubTab = idx },
                        label = { Text(label) },
                        modifier = Modifier.minimumInteractiveComponentSize().testTag("gen_sub_$idx")
                    )
                }
            }
        }

        when (genSubTab) {
            0 -> item {
                var seed by remember { mutableIntStateOf(101) }
                var prompt by remember { mutableStateOf("Ksatria Lentera") }
                var presetId by remember { mutableStateOf("guardian_mint") }
                var rigSpec by remember { mutableStateOf(Generators.generateRig3DFromPrompt(101, "Ksatria Lentera", "guardian_mint")) }
                var atelierJson by remember { mutableStateOf(rigSpec.atelier.rawJson) }
                var yaw by remember { mutableFloatStateOf(0.3f) }

                Card(shape = RoundedCornerShape(16.dp)) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Procedural Character & 3D-Stack Rig Generator", style = MaterialTheme.typography.titleMedium)
                        OutlinedTextField(value = prompt, onValueChange = { prompt = it }, label = { Text("Character Archetype / Prompt") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                            Generators.listAtelierPresets().forEach { ap ->
                                FilterChip(selected = presetId == ap.presetId, onClick = { presetId = ap.presetId }, label = { Text(ap.label) }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize())
                            }
                        }
                        Canvas(modifier = Modifier.fillMaxWidth().height(130.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFF070D19))) {
                            GameCanvasRenderers.drawBowoCharacter(this, size.width * 0.5f, size.height * 0.58f, 38f, style, CharacterAnimState.IDLE, 1, 0f, true, yawRad = yaw, customChar = rigSpec.character)
                        }
                        Slider(value = yaw, onValueChange = { yaw = it }, valueRange = -1.6f..1.6f)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            Button(
                                onClick = {
                                    seed += 7
                                    rigSpec = Generators.generateRig3DFromPrompt(seed, prompt, presetId)
                                    atelierJson = rigSpec.atelier.rawJson
                                },
                                modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("gen_char_btn")
                            ) { Text("Generate") }
                            FilledTonalButton(
                                onClick = {
                                    viewModel.updateSettings { it.copy(customCharacter = rigSpec.character) }
                                    viewModel.showBanner("Applied ${rigSpec.character.name} to Bowo!")
                                },
                                modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("apply_char_btn")
                            ) { Text("Apply Hero") }
                        }
                        OutlinedTextField(value = atelierJson, onValueChange = { atelierJson = it }, label = { Text("Atelier Setup JSON") }, minLines = 2, textStyle = LocalTextStyle.current.copy(fontFamily = FontFamily.Monospace), modifier = Modifier.fillMaxWidth())
                        OutlinedButton(
                            onClick = {
                                val (ok, parsed) = Generators.parseAtelierSetupJson(atelierJson)
                                if (ok && parsed != null) {
                                    viewModel.updateSettings { it.copy(customCharacter = parsed) }
                                    viewModel.showBanner("Loaded Atelier JSON to Bowo")
                                }
                            },
                            modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize()
                        ) { Text("Import Atelier JSON") }
                    }
                }
            }

            1 -> item {
                var seed by remember { mutableIntStateOf(404) }
                var prompt by remember { mutableStateOf("Bowo Crystal Guardian") }
                var category by remember { mutableStateOf("character") }
                var boxOnly by remember { mutableStateOf(false) }
                var mesh by remember { mutableStateOf(MeshAndBlueprintGenerators.generateMesh3DFromPrompt(404, "Bowo Crystal Guardian")) }
                var yaw by remember { mutableFloatStateOf(0.4f) }

                LaunchedEffect(Unit) {
                    while (true) {
                        delay(33L)
                        yaw += 0.025f
                    }
                }

                Card(shape = RoundedCornerShape(16.dp)) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("TripoSR / Meshy Low-Poly 3D Mesh Generator", style = MaterialTheme.typography.titleMedium)
                        OutlinedTextField(value = prompt, onValueChange = { prompt = it }, label = { Text("3D Mesh Prompt") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                            FilterChip(selected = category == "character", onClick = { category = "character" }, label = { Text("Character") }, modifier = Modifier.weight(1f))
                            FilterChip(selected = category == "prop", onClick = { category = "prop" }, label = { Text("Prop") }, modifier = Modifier.weight(1f))
                            FilterChip(selected = boxOnly, onClick = { boxOnly = !boxOnly }, label = { Text(if (boxOnly) "Box Prim" else "Loft Mesh") }, modifier = Modifier.weight(1f))
                        }
                        Canvas(modifier = Modifier.fillMaxWidth().height(170.dp).clip(RoundedCornerShape(12.dp))) {
                            GeneratorRenderers.drawMesh3DPreviewCanvas(this, mesh, yaw)
                        }
                        Text("LOD Tris: ${mesh.lodCounts.first} / ${mesh.lodCounts.second} / ${mesh.lodCounts.third} · A70 Budget <=800: ${mesh.budgetOk}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                            Button(onClick = { seed += 13; mesh = MeshAndBlueprintGenerators.generateMesh3DFromPrompt(seed, prompt, category, boxOnly = boxOnly) }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("gen_mesh_btn")) { Text("Generate") }
                            OutlinedButton(onClick = { onExportFile("mesh_${mesh.seed}.obj", "text/plain", mesh.objText.encodeToByteArray()) }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize()) { Text(".OBJ") }
                            OutlinedButton(onClick = { onExportFile("mesh_${mesh.seed}.gltf", "model/gltf+json", mesh.gltfJson.encodeToByteArray()) }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize()) { Text(".glTF") }
                        }
                    }
                }
            }

            2 -> item {
                var seed by remember { mutableIntStateOf(202) }
                var prompt by remember { mutableStateOf("Lantern Crystal") }
                var imgSpec by remember { mutableStateOf(Generators.generateImageSpriteFromPrompt(202, "Lantern Crystal", state.styleId)) }
                var propSpec by remember { mutableStateOf(Generators.generatePropAsset(202, "crystal")) }
                Card(shape = RoundedCornerShape(16.dp)) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("16x16 Sprite & Prop Generator", style = MaterialTheme.typography.titleMedium)
                        OutlinedTextField(value = prompt, onValueChange = { prompt = it }, label = { Text("Sprite Prompt") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        Canvas(modifier = Modifier.fillMaxWidth().height(140.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFF080E1B))) {
                            val cell = minOf(size.width * 0.4f, size.height * 0.8f) / 16f
                            val sx = size.width * 0.25f - cell * 8f
                            val sy = size.height * 0.5f - cell * 8f
                            imgSpec.grid.forEachIndexed { r, row ->
                                row.forEachIndexed { c, ch ->
                                    if (ch != '.') {
                                        val col = ArtStyles.parseHexColor(imgSpec.palette.getOrElse((ch - '1').coerceIn(0, 3)) { "#38bdf8" })
                                        drawRect(col, Offset(sx + c * cell, sy + r * cell), Size(cell, cell))
                                    }
                                }
                            }
                            val pCell = minOf(size.width * 0.3f, size.height * 0.7f) / 10f
                            val px = size.width * 0.72f - pCell * 5f
                            val py = size.height * 0.5f - pCell * 5f
                            propSpec.pixelGrid.forEachIndexed { r, row ->
                                row.forEachIndexed { c, ch ->
                                    if (ch == '#') drawRect(ArtStyles.parseHexColor(propSpec.color), Offset(px + c * pCell, py + r * pCell), Size(pCell, pCell))
                                }
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            Button(onClick = {
                                seed += 9
                                imgSpec = Generators.generateImageSpriteFromPrompt(seed, prompt, state.styleId)
                                propSpec = Generators.generatePropAsset(seed, listOf("potion", "chest", "crystal", "lantern")[seed % 4])
                            }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("gen_sprite_btn")) { Text("Generate Pair") }
                        }
                    }
                }
            }

            3 -> item {
                var seed by remember { mutableIntStateOf(303) }
                var scale by remember { mutableStateOf("pentatonic") }
                var bpm by remember { mutableFloatStateOf(128f) }
                var track by remember { mutableStateOf(Generators.generateMusicTrack(303, "pentatonic", 128)) }
                Card(shape = RoundedCornerShape(16.dp)) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("3-Channel Tracker Music Generator", style = MaterialTheme.typography.titleMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                            listOf("pentatonic", "dorian", "phrygian").forEach { sc ->
                                FilterChip(selected = scale == sc, onClick = { scale = sc }, label = { Text(sc.replaceFirstChar { it.uppercase() }) }, modifier = Modifier.weight(1f))
                            }
                        }
                        Text("BPM: ${bpm.toInt()}", style = MaterialTheme.typography.bodySmall)
                        Slider(value = bpm, onValueChange = { bpm = it }, valueRange = 85f..180f)
                        Text("${track.title} · Notes: ${track.leadNotes.take(8).joinToString { "${it.toInt()}Hz" }}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            Button(onClick = { seed += 5; track = Generators.generateMusicTrack(seed, scale, bpm.toInt()) }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize()) { Text("Generate") }
                            FilledTonalButton(onClick = { SoundEngine.playCustomTrack(track) }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize()) { Text("Play") }
                            OutlinedButton(onClick = { SoundEngine.stopTracker() }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize()) { Text("Stop") }
                        }
                    }
                }
            }

            4 -> item {
                var seed by remember { mutableIntStateOf(505) }
                var preset by remember { mutableStateOf("slash") }
                var sfx by remember { mutableStateOf(Generators.generateSfxSpec(505, "slash")) }
                var speaker by remember { mutableStateOf("Bowo") }
                var line by remember { mutableStateOf("Nyalakan Lentera Cahaya sekarang!") }
                var dub by remember { mutableStateOf(Generators.generateDubbingSubtitleSpec(505, "Bowo", "Nyalakan Lentera Cahaya sekarang!", state.lang.code)) }

                Card(shape = RoundedCornerShape(16.dp)) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("SFX Synth & Timed Dubbing (SRT/VTT + TTS)", style = MaterialTheme.typography.titleMedium)
                        Row(modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            listOf("slash", "coin", "laser", "impact", "ui_chime", "jump").forEach { pr ->
                                FilterChip(selected = preset == pr, onClick = { preset = pr; sfx = Generators.generateSfxSpec(seed, pr) }, label = { Text(pr) })
                            }
                        }
                        Canvas(modifier = Modifier.fillMaxWidth().height(90.dp).clip(RoundedCornerShape(10.dp))) {
                            GeneratorRenderers.drawSfxWaveformCanvas(this, sfx)
                        }
                        Button(onClick = { SoundEngine.playCustomSfx(sfx) }, modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize()) { Text("Play Synthesized SFX (${sfx.wave} ${sfx.freqStart.toInt()}→${sfx.freqEnd.toInt()}Hz)") }

                        HorizontalDivider()
                        OutlinedTextField(value = speaker, onValueChange = { speaker = it }, label = { Text("Speaker") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(value = line, onValueChange = { line = it }, label = { Text("Voice Line") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                            Button(onClick = { dub = Generators.generateDubbingSubtitleSpec(seed, speaker, line, state.lang.code); SoundEngine.speakText(dub.line, state.lang.code) }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize()) { Text("Speak & Gen") }
                            OutlinedButton(onClick = { onExportFile("dub_${dub.seed}.srt", "text/plain", dub.srtText.encodeToByteArray()) }, modifier = Modifier.minimumInteractiveComponentSize()) { Text(".SRT") }
                            OutlinedButton(onClick = { onExportFile("dub_${dub.seed}.vtt", "text/vtt", dub.vttText.encodeToByteArray()) }, modifier = Modifier.minimumInteractiveComponentSize()) { Text(".VTT") }
                        }
                        Text(dub.srtText, style = MaterialTheme.typography.labelSmall, fontFamily = FontFamily.Monospace)
                    }
                }
            }

            5 -> item {
                var verbPrompt by remember { mutableStateOf("jalan lompat dash serang") }
                var cutscene by remember { mutableStateOf(Generators.composeMovieFromPrompt("jalan lompat dash serang", 606, state.weather)) }
                var playing by remember { mutableStateOf(true) }
                var playhead by remember { mutableFloatStateOf(0f) }

                LaunchedEffect(playing, cutscene) {
                    while (playing) {
                        delay(33L)
                        playhead = (playhead + 0.033f) % cutscene.durationSec.coerceAtLeast(1f)
                    }
                }

                Card(shape = RoundedCornerShape(16.dp)) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Verb-Driven Cutscene & Storyboard Composer", style = MaterialTheme.typography.titleMedium)
                        OutlinedTextField(value = verbPrompt, onValueChange = { verbPrompt = it }, label = { Text("Action Verbs (jalan lompat dash serang)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        Canvas(modifier = Modifier.fillMaxWidth().height(155.dp).clip(RoundedCornerShape(12.dp))) {
                            GeneratorRenderers.drawCutsceneCanvas(this, cutscene, playhead, style, state.styleOverrides)
                        }
                        val activeCaption = cutscene.keyframes.lastOrNull { it.timeSec <= playhead }?.caption ?: ""
                        Text("${String.format("%.1f", playhead)}s / ${cutscene.durationSec}s · $activeCaption", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                            Button(onClick = { cutscene = Generators.composeMovieFromPrompt(verbPrompt, 606, state.weather); playhead = 0f }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize()) { Text("Compose") }
                            FilledTonalButton(onClick = { playing = !playing }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize()) { Text(if (playing) "Pause" else "Play") }
                            OutlinedButton(onClick = { onExportFile("storyboard_${cutscene.seed}.json", "application/json", cutscene.keyframes.joinToString("\n") { "${it.timeSec}s: ${it.pose.id} - ${it.caption}" }.encodeToByteArray()) }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize()) { Text("Export") }
                        }
                    }
                }
            }

            6 -> item {
                var seed by remember { mutableIntStateOf(707) }
                var mode by remember { mutableStateOf("3D-Heightmap") }
                var biome by remember { mutableStateOf("dawn") }
                var terrain by remember { mutableStateOf(Generators.generateTerrainSpec(707, "3D-Heightmap", "dawn")) }
                Card(shape = RoundedCornerShape(16.dp)) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Procedural 2D / 3D-Heightmap Terrain", style = MaterialTheme.typography.titleMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                            listOf("2D-Ridge", "3D-Heightmap").forEach { m ->
                                FilterChip(selected = mode == m, onClick = { mode = m; terrain = Generators.generateTerrainSpec(seed, m, biome) }, label = { Text(m) }, modifier = Modifier.weight(1f))
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                            listOf("dawn", "storm", "obsidian").forEach { b ->
                                FilterChip(selected = biome == b, onClick = { biome = b; terrain = Generators.generateTerrainSpec(seed, mode, b) }, label = { Text(b.uppercase()) }, modifier = Modifier.weight(1f))
                            }
                        }
                        Canvas(modifier = Modifier.fillMaxWidth().height(155.dp).clip(RoundedCornerShape(12.dp))) {
                            GeneratorRenderers.drawTerrainCanvas(this, terrain, style)
                        }
                        Button(onClick = { seed += 11; terrain = Generators.generateTerrainSpec(seed, mode, biome) }, modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize()) { Text("Generate New Seed Terrain") }
                    }
                }
            }

            else -> item {
                var prompt by remember { mutableStateOf("Cyber Guardian Isometric Boss Quest") }
                var blueprint by remember { mutableStateOf(MeshAndBlueprintGenerators.generateCompleteGameBlueprint(808, "Cyber Guardian Isometric Boss Quest", state.activeGitHubRepoId)) }
                var fsmSpec by remember { mutableStateOf(Generators.generateStateMachineSpec(808, "behavior", prompt)) }

                Card(shape = RoundedCornerShape(16.dp)) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Complete Game Blueprint Forge + FSM", style = MaterialTheme.typography.titleMedium)
                        OutlinedTextField(value = prompt, onValueChange = { prompt = it }, label = { Text("1-Prompt Full Game Spec") }, singleLine = true, modifier = Modifier.fillMaxWidth().testTag("forge_prompt_input"))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            Button(
                                onClick = {
                                    blueprint = MeshAndBlueprintGenerators.generateCompleteGameBlueprint(808 + prompt.length, prompt, state.activeGitHubRepoId)
                                    fsmSpec = Generators.generateStateMachineSpec(808, if (fsmSpec.kind == "behavior") "movement" else "behavior", prompt)
                                },
                                modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("forge_generate_btn")
                            ) { Text("Synthesize") }
                            FilledTonalButton(
                                onClick = { viewModel.launchBlueprint(blueprint) },
                                modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("forge_launch_btn")
                            ) { Text("Launch Game") }
                        }
                        Text("${blueprint.title} · ${blueprint.hybridMode.label} · ${blueprint.cameraPreset.label}", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary)
                        Text("Budget A70: ${blueprint.budgetReport.targetFps} FPS · ${blueprint.budgetReport.drawCallsEst} DC · ${blueprint.budgetReport.trisEst} tris · Pass=${blueprint.budgetReport.passesA70}", style = MaterialTheme.typography.bodySmall)
                        Text("FSM (${fsmSpec.kind}): ${fsmSpec.states.joinToString(" → ")}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}
