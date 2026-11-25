package com.example.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.example.engine.*
import com.example.ui.AppUiState
import com.example.ui.MainViewModel

@Composable
fun StudioServicesTab(
    state: AppUiState,
    viewModel: MainViewModel,
    onExportFile: (String, String, ByteArray) -> Unit,
    onImportSaveFile: () -> Unit
) {
    var displayNameInput by remember(state.auth.displayName) { mutableStateOf(state.auth.displayName) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(vertical = 14.dp)
    ) {
        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Offline 3-Slot + Auto Save Storage", style = MaterialTheme.typography.titleMedium)
                        OutlinedButton(onClick = onImportSaveFile, modifier = Modifier.minimumInteractiveComponentSize().testTag("svc_import_json_btn")) { Text("Import JSON") }
                    }
                    state.saveSummaries.forEach { slot ->
                        Surface(
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Column(modifier = Modifier.fillMaxWidth().padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(
                                    text = if (slot.id == "auto") "Auto-Save" else "Slot ${slot.id}",
                                    style = MaterialTheme.typography.titleSmall
                                )
                                Text(
                                    text = if (slot.exists) "Lv.${slot.level} · HP ${slot.hp} · Score ${slot.score} · Coins ${slot.coins}" else "Empty slot",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                                    if (slot.id != "auto") {
                                        Button(
                                            onClick = {
                                                val (_, bytes) = viewModel.saveProgress(slot.id)
                                                viewModel.showBanner("Saved Slot ${slot.id} ($bytes bytes)")
                                            },
                                            modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("svc_save_${slot.id}")
                                        ) { Text("Save") }
                                    }
                                    FilledTonalButton(
                                        onClick = {
                                            if (viewModel.loadProgress(slot.id, launchImmediately = true)) {
                                                viewModel.showBanner("Loaded Slot ${slot.id}")
                                            }
                                        },
                                        enabled = slot.exists,
                                        modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("svc_load_${slot.id}")
                                    ) { Text("Load") }
                                    OutlinedButton(
                                        onClick = {
                                            viewModel.storage.exportSlotJson(slot.id)?.let { raw ->
                                                onExportFile("mungil_save_slot_${slot.id}.json", "application/json", raw.encodeToByteArray())
                                            }
                                        },
                                        enabled = slot.exists,
                                        modifier = Modifier.minimumInteractiveComponentSize()
                                    ) { Text("JSON") }
                                    TextButton(
                                        onClick = { viewModel.deleteSaveSlot(slot.id) },
                                        enabled = slot.exists,
                                        modifier = Modifier.minimumInteractiveComponentSize()
                                    ) { Text("Del") }
                                }
                            }
                        }
                    }
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Language & Local Profile", style = MaterialTheme.typography.titleMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
                        LanguageCode.entries.forEach { lc ->
                            FilterChip(
                                selected = state.lang == lc,
                                onClick = { viewModel.updateSettings { it.copy(lang = lc) } },
                                label = { Text(lc.code.uppercase()) },
                                modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("lang_${lc.code}")
                            )
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(value = displayNameInput, onValueChange = { displayNameInput = it }, label = { Text("Guardian Name") }, singleLine = true, modifier = Modifier.weight(1f))
                        Button(
                            onClick = {
                                viewModel.updateSettings { it.copy(auth = it.auth.copy(displayName = displayNameInput.ifBlank { "Offline Guest" })) }
                                viewModel.showBanner("Profile updated!")
                            },
                            modifier = Modifier.minimumInteractiveComponentSize()
                        ) { Text("Save") }
                    }
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Local Telemetry & Sandbox Store", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Sessions: ${state.analytics.sessions} · Deaths: ${state.analytics.deaths} · Cleared Lv1/2/3: ${state.analytics.level1Clears}/${state.analytics.level2Clears}/${state.analytics.level3Clears}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Catalogs.SANDBOX_SKUS.forEach { sku ->
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("${sku.title} (${sku.price})", style = MaterialTheme.typography.titleSmall)
                                Text(sku.desc, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            FilledTonalButton(
                                onClick = {
                                    viewModel.addBonusCoinsPotions(sku.coins, sku.potions)
                                    viewModel.showBanner("Granted +${sku.coins} coins & +${sku.potions} potions!")
                                },
                                modifier = Modifier.minimumInteractiveComponentSize().testTag("sku_claim_${sku.id}")
                            ) { Text("Claim") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StudioExportTab(
    state: AppUiState,
    viewModel: MainViewModel,
    onExportFile: (String, String, ByteArray) -> Unit,
    onCopyText: (String, String) -> Unit
) {
    var pakStatus by remember { mutableStateOf("Ready to test lossless MPAK7 RLE compression.") }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(vertical = 14.dp)
    ) {
        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("MPAK7 Binary .PAK & Project Export", style = MaterialTheme.typography.titleMedium)
                    val projectJson = remember(state.gameName, state.activeLevel, state.styleId, state.renderMode, state.physicsMode) {
                        """{
  "engine": "Mungil-Engine-V7-Android",
  "title": "${state.gameName}",
  "activeLevel": ${state.activeLevel},
  "artStyle": "${state.styleId.id}",
  "renderMode": "${state.renderMode.label}",
  "physicsMode": "${state.physicsMode.label}",
  "perspective": "${state.perspectiveConnector.id}",
  "hybridMode": "${state.hybridMode.id}",
  "eventRulesCount": ${state.eventRules.size}
}"""
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        Button(
                            onClick = { onExportFile("mungil_project_v7.json", "application/json", projectJson.encodeToByteArray()) },
                            modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("exp_json_btn")
                        ) { Text("Export JSON") }
                        FilledTonalButton(
                            onClick = {
                                val pak = BytecodeVm.packRleBytes(projectJson)
                                val roundtripOk = BytecodeVm.unpackRleBytes(pak.bytes) == projectJson
                                pakStatus = "MPAK7: ${pak.originalBytes}B -> ${pak.packedBytes}B (${pak.ratioPct}%) · Roundtrip=$roundtripOk"
                                onExportFile("mungil_bundle.pak", "application/octet-stream", pak.bytes)
                            },
                            modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("exp_pak_btn")
                        ) { Text("MPAK7 .PAK") }
                    }
                    Text(pakStatus, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                    OutlinedButton(
                        onClick = {
                            val html = "<!doctype html><html><body><h1>${state.gameName}</h1><pre>$projectJson</pre></body></html>"
                            onExportFile("mungil_standalone.html", "text/html", html.encodeToByteArray())
                        },
                        modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("exp_html_btn")
                    ) { Text("Export Standalone HTML Summary") }
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Android SDK 24-36 Build Pack (Itel A70)", style = MaterialTheme.typography.titleMedium)
                    val targetSpec = Generators.generatePlatformTargetSpec(700, "apk", state.gameName)
                    Text(targetSpec.configJson, style = MaterialTheme.typography.labelSmall, fontFamily = FontFamily.Monospace)
                    Button(
                        onClick = { onCopyText("Android Build Target", targetSpec.configJson) },
                        modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize()
                    ) { Text("Copy Android APK Target Spec") }
                }
            }
        }

        item { Text("MungilE API Reference", style = MaterialTheme.typography.titleMedium) }
        items(Catalogs.API_REFERENCE_EXAMPLES, key = { it.first }) { (sig, ex, desc) ->
            Card(shape = RoundedCornerShape(12.dp)) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(sig, style = MaterialTheme.typography.titleSmall, fontFamily = FontFamily.Monospace)
                    Text(desc, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    TextButton(
                        onClick = { viewModel.showBanner(MungilEngineApi.runCommandSummary(ex)) },
                        modifier = Modifier.minimumInteractiveComponentSize()
                    ) { Text("Test: $ex") }
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Engine Docs & Cleanroom Notices", style = MaterialTheme.typography.titleMedium)
                    Catalogs.ENGINE_DOCS_SECTIONS.forEach { (title, body) ->
                        Text(title, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary)
                        Text(body, style = MaterialTheme.typography.bodySmall)
                    }
                    HorizontalDivider()
                    Text(Catalogs.THIRD_PARTY_NOTICES_TEXT, style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}
