package com.example.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.example.engine.*
import com.example.ui.AppUiState
import com.example.ui.MainViewModel

@Composable
fun StudioLabTab(
    state: AppUiState,
    viewModel: MainViewModel
) {
    var bytecodeSrc by remember { mutableStateOf("SET 10\nADD 5\nSPAWN 2\nSAY 77\nEND") }
    var compiled by remember { mutableStateOf(BytecodeVm.compileBytecode("SET 10\nADD 5\nSPAWN 2\nSAY 77\nEND")) }
    var vmResult by remember { mutableStateOf<BytecodeVmResult?>(BytecodeVm.runBytecodeVm(compiled.instructions)) }

    var worldSeed by remember { mutableStateOf("777") }
    var seedWorld by remember { mutableStateOf(BytecodeVm.generateSeedWorld(777)) }

    var newCond by remember { mutableStateOf("shard_collect") }
    var newAct by remember { mutableStateOf("score_100") }

    val activeStyle = remember(state.styleId, state.customPalettes) { ArtStyles.getStyleSpec(state.styleId, state.customPalettes) }
    val checks = remember(state, activeStyle, compiled) {
        ArtStyles.run25ValidatorChecks(
            gameName = state.gameName,
            buttonSize = state.touchConfig.buttonSize,
            entityCount = state.hud.activeEntities,
            drawCalls = state.hud.drawCalls,
            heapMb = state.hud.heapMb,
            style = activeStyle,
            hasEventRule = state.eventRules.any { it.enabled },
            bytecodeValid = compiled.errors.isEmpty(),
            saveSizeBytes = 1024,
            level = state.activeLevel
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(vertical = 14.dp)
    ) {
        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("16-bit Bytecode VM & Compiler", style = MaterialTheme.typography.titleMedium)
                    OutlinedTextField(
                        value = bytecodeSrc,
                        onValueChange = { bytecodeSrc = it },
                        minLines = 4,
                        textStyle = LocalTextStyle.current.copy(fontFamily = FontFamily.Monospace),
                        modifier = Modifier.fillMaxWidth().testTag("lab_bytecode_input")
                    )
                    Button(
                        onClick = {
                            compiled = BytecodeVm.compileBytecode(bytecodeSrc)
                            vmResult = if (compiled.errors.isEmpty()) BytecodeVm.runBytecodeVm(compiled.instructions) else null
                        },
                        modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("lab_bytecode_run_btn")
                    ) { Text("Compile & Run VM") }
                    if (compiled.errors.isNotEmpty()) {
                        Text(compiled.errors.joinToString("\n"), style = MaterialTheme.typography.bodySmall, color = Color(0xFFF43F5E))
                    } else if (vmResult != null) {
                        val res = vmResult!!
                        Text("Halted=${res.halted} · Steps=${res.steps} · R0=${res.registers[0]} R1=${res.registers[1]} R2=${res.registers[2]}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                        if (res.log.isNotEmpty()) Text(res.log.joinToString(" | "), style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("No-Code WHEN -> THEN Event Sheet", style = MaterialTheme.typography.titleMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                        listOf("shard_collect", "enemy_defeated", "switch_activated").forEach { c ->
                            FilterChip(selected = newCond == c, onClick = { newCond = c }, label = { Text(c.substringBefore("_")) }, modifier = Modifier.weight(1f))
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                        listOf("score_100", "heal_10", "bonus_coin").forEach { a ->
                            FilterChip(selected = newAct == a, onClick = { newAct = a }, label = { Text(a) }, modifier = Modifier.weight(1f))
                        }
                    }
                    Button(
                        onClick = {
                            val rule = EventRuleSpec("rule_${System.currentTimeMillis() % 9999}", newCond, newAct, true)
                            viewModel.updateSettings { it.copy(eventRules = it.eventRules + rule) }
                        },
                        modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("lab_add_rule_btn")
                    ) { Text("Add Event Rule") }

                    state.eventRules.forEach { rule ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("WHEN ${rule.condition} -> ${rule.action}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                            Switch(
                                checked = rule.enabled,
                                onCheckedChange = { en ->
                                    viewModel.updateSettings { s ->
                                        s.copy(eventRules = s.eventRules.map { if (it.id == rule.id) it.copy(enabled = en) else it })
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Deterministic Seed World (xorshift32)", style = MaterialTheme.typography.titleMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(value = worldSeed, onValueChange = { worldSeed = it }, label = { Text("Seed") }, singleLine = true, modifier = Modifier.weight(1f))
                        Button(onClick = { seedWorld = BytecodeVm.generateSeedWorld(worldSeed.toIntOrNull() ?: 777) }, modifier = Modifier.minimumInteractiveComponentSize()) { Text("Generate") }
                    }
                    Text("Biome: ${seedWorld.biome} · Diff ${seedWorld.difficulty}/5 · Tiles: ${seedWorld.tiles.take(6).joinToString { it.kind }}", style = MaterialTheme.typography.bodySmall)
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    val passed = checks.count { it.passed }
                    Text("25 Production Validator Checks ($passed/25 Pass)", style = MaterialTheme.typography.titleMedium)
                    checks.forEach { chk ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("${chk.id}. ${chk.label}", style = MaterialTheme.typography.bodySmall)
                            Text(if (chk.passed) "PASS · ${chk.detail}" else "WARN", style = MaterialTheme.typography.labelSmall, color = if (chk.passed) Color(0xFF34D399) else Color(0xFFF59E0B))
                        }
                    }
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("9 Larangan Mutlak (Hardened Rules)", style = MaterialTheme.typography.titleMedium)
                    QolbuCore.HARDENED_RULES_9.forEach { (id, rule) ->
                        Text("$id. $rule", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }

        item { Text("32 Open-Source Cleanroom Inspiration Credits", style = MaterialTheme.typography.titleMedium) }
        items(Catalogs.REPO_CREDITS, key = { it.name }) { rc ->
            Card(shape = RoundedCornerShape(10.dp)) {
                Column(modifier = Modifier.padding(10.dp)) {
                    Text("[Tier ${rc.tier}] ${rc.name} (${rc.license})", style = MaterialTheme.typography.labelLarge)
                    Text(rc.adoption, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
fun StudioSkillsTab(
    onCopyText: (String, String) -> Unit,
    onExportFile: (String, String, ByteArray) -> Unit
) {
    val packs = remember { AgentSkills.buildAgentSkillPack() }
    var selectedIdx by remember { mutableIntStateOf(0) }
    val active = packs[selectedIdx]

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(vertical = 14.dp)
    ) {
        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("AI Agent Skill Packs (5 Platforms)", style = MaterialTheme.typography.titleMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
                        packs.forEachIndexed { idx, p ->
                            FilterChip(
                                selected = selectedIdx == idx,
                                onClick = { selectedIdx = idx },
                                label = { Text(p.platform.uppercase()) },
                                modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("skill_plat_$idx")
                            )
                        }
                    }
                    Text(active.title, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary)
                    Text(active.summary, style = MaterialTheme.typography.bodySmall)
                    Text(
                        text = AgentSkills.getInstallCommandSnippet(active.platform),
                        style = MaterialTheme.typography.labelSmall,
                        fontFamily = FontFamily.Monospace
                    )
                    Surface(color = Color(0xFF070D19), shape = RoundedCornerShape(10.dp)) {
                        Text(
                            text = active.content,
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFFCBD5E1),
                            fontFamily = FontFamily.Monospace,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                        Button(onClick = { onCopyText(active.filename, active.content) }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("skill_copy_btn")) { Text("Copy") }
                        FilledTonalButton(onClick = { onExportFile(active.filename, "text/markdown", active.content.encodeToByteArray()) }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize()) { Text("Export .MD") }
                        OutlinedButton(onClick = { onExportFile("mungil-agent-skills.json", "application/json", AgentSkills.exportFullAgentBundleJson().encodeToByteArray()) }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize()) { Text("Bundle") }
                    }
                }
            }
        }

        item { Text("5-Keyword Top-5 GitHub Matrix", style = MaterialTheme.typography.titleMedium) }
        Catalogs.KEYWORD_TOP5_REPOS.forEach { (kw, list) ->
            item(key = kw) {
                Card(shape = RoundedCornerShape(12.dp)) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Keyword: ${kw.uppercase()}", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary)
                        list.forEach { entry ->
                            Text("• ${entry.name} (${entry.license}) — ${entry.adapt}", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}
