package com.example.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.engine.*
import com.example.ui.AppUiState
import com.example.ui.MainViewModel

@Composable
fun StudioAgentTab(
    state: AppUiState,
    viewModel: MainViewModel
) {
    var section by remember { mutableIntStateOf(0) } // 0=Qolbu AI & Wizard, 1=Local MCP Hub, 2=Connectors & GitHub, 3=Qolbu Audit

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(vertical = 14.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                listOf("AI & Wizard", "MCP (16 Tools)", "3D & GitHub", "Qolbu Audit").forEachIndexed { idx, lbl ->
                    FilterChip(
                        selected = section == idx,
                        onClick = { section = idx },
                        label = { Text(lbl) },
                        modifier = Modifier.minimumInteractiveComponentSize().testTag("agent_sec_$idx")
                    )
                }
            }
        }

        when (section) {
            0 -> {
                item {
                    Card(shape = RoundedCornerShape(16.dp)) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Offline Qolbu AI Assistant & Router", style = MaterialTheme.typography.titleMedium)
                            var prompt by remember { mutableStateOf("") }
                            var chatHistory by remember {
                                mutableStateOf(
                                    listOf(AgentChatMessage("Qolbu AI", "Tanyakan tentang Zero-GC, Physics Preset, Boss Kala, atau minta saya membuat game baru!"))
                                )
                            }
                            OutlinedTextField(
                                value = prompt,
                                onValueChange = { prompt = it },
                                label = { Text("Ask Qolbu or prompt a game") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth().testTag("qolbu_chat_input")
                            )
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                                Button(
                                    onClick = {
                                        val q = prompt.trim().ifBlank { "Bagaimana cara mengalahkan Boss Kala?" }
                                        val (reply, tool, tab) = AiMcpAgent.routePromptWithTrace(
                                            prompt = q,
                                            activeLevel = state.activeLevel,
                                            onSwitchConnector = { conn -> viewModel.updateSettings { it.copy(perspectiveConnector = conn) } },
                                            onSwitchAiMode = { mode -> viewModel.updateSettings { it.copy(aiMode = mode) } },
                                            onSetGameName = { title -> viewModel.updateSettings { it.copy(gameName = title) } }
                                        )
                                        chatHistory = (listOf(
                                            AgentChatMessage("Qolbu AI", reply, tab, tool),
                                            AgentChatMessage("You", q)
                                        ) + chatHistory).take(8)
                                        prompt = ""
                                    },
                                    modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("qolbu_chat_send_btn")
                                ) { Text("Send Prompt") }
                                OutlinedButton(
                                    onClick = {
                                        val (reply, tab) = AiMcpAgent.askQolbuAgent("itel gc memory")
                                        chatHistory = (listOf(AgentChatMessage("Qolbu AI", reply, tab, "mcp.explain_engine")) + chatHistory).take(8)
                                    },
                                    modifier = Modifier.minimumInteractiveComponentSize()
                                ) { Text("A70 Tip") }
                            }
                            chatHistory.forEach { msg ->
                                Surface(
                                    color = if (msg.from == "You") MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Column(modifier = Modifier.fillMaxWidth().padding(8.dp)) {
                                        Text("${msg.from}${msg.toolUsed?.let { " [$it]" } ?: ""}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                                        Text(msg.text, style = MaterialTheme.typography.bodySmall)
                                        msg.recommendedTab?.let { target ->
                                            TextButton(
                                                onClick = { viewModel.openStudioTab(target) },
                                                modifier = Modifier.minimumInteractiveComponentSize()
                                            ) { Text("Open ${target.id.uppercase()} Tab") }
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
                            Text("5-Step Game Creation Wizard", style = MaterialTheme.typography.titleMedium)
                            var wizName by remember { mutableStateOf("Lentera Nusantara") }
                            var wizGenre by remember { mutableStateOf("Arena") }
                            var wizHero by remember { mutableStateOf("Bowo Kilat") }
                            var wizPreset by remember { mutableStateOf("NORMAL") }
                            var wizAi by remember { mutableStateOf("Bareng") }
                            var wizDiff by remember { mutableStateOf("Normal") }

                            OutlinedTextField(value = wizName, onValueChange = { wizName = it }, label = { Text("1. Game Title") }, singleLine = true, modifier = Modifier.fillMaxWidth().testTag("wiz_name_input"))
                            OutlinedTextField(value = wizHero, onValueChange = { wizHero = it }, label = { Text("2. Hero Name") }, singleLine = true, modifier = Modifier.fillMaxWidth())

                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                                listOf("Platformer", "Arena", "RPG", "Runner").forEach { g ->
                                    FilterChip(selected = wizGenre == g, onClick = { wizGenre = g }, label = { Text(g) }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize())
                                }
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                                listOf("NORMAL", "BOUNCY", "SLIPPERY").forEach { p ->
                                    FilterChip(selected = wizPreset == p, onClick = { wizPreset = p }, label = { Text(p) }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize())
                                }
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                                listOf("Sendiri", "Bareng", "Lawan").forEach { m ->
                                    FilterChip(selected = wizAi == m, onClick = { wizAi = m }, label = { Text(m) }, modifier = Modifier.weight(1f).minimumInteractiveComponentSize())
                                }
                            }
                            Button(
                                onClick = {
                                    val spec = AiMcpAgent.buildWizardGameSpec(wizName, wizGenre, "Bowo", wizHero, wizPreset, "Desa Fajar", 3, 4, wizAi, wizDiff, 90)
                                    val next = listOf(spec) + state.myWizardGames
                                    viewModel.updateSettings { it.copy(myWizardGames = next) }
                                    viewModel.playWizardGame(spec)
                                },
                                modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize().testTag("wiz_create_play_btn")
                            ) { Text("Create & Play in Arena AI") }
                        }
                    }
                }

                item { Text("My Wizard Games (${state.myWizardGames.size})", style = MaterialTheme.typography.titleMedium) }
                items(state.myWizardGames, key = { it.id }) { g ->
                    Card(shape = RoundedCornerShape(12.dp)) {
                        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(g.name, style = MaterialTheme.typography.titleSmall)
                                Text("${g.genre} · ${g.preset} · AI: ${g.aiMode} · ${g.difficulty}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Button(onClick = { viewModel.playWizardGame(g) }, modifier = Modifier.minimumInteractiveComponentSize().testTag("wiz_play_${g.id}")) { Text("Play") }
                                TextButton(
                                    onClick = { viewModel.updateSettings { s -> s.copy(myWizardGames = s.myWizardGames.filter { it.id != g.id }) } },
                                    modifier = Modifier.minimumInteractiveComponentSize()
                                ) { Text("Del") }
                            }
                        }
                    }
                }

                item { Text("10-Step Interactive Guide", style = MaterialTheme.typography.titleMedium) }
                items(AiMcpAgent.TUTORIAL_STEPS, key = { it.step }) { step ->
                    Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.clickable { viewModel.openStudioTab(step.targetTab) }) {
                        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("${step.step}. ${step.title}", style = MaterialTheme.typography.titleSmall)
                                Text(step.desc, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text(step.targetTab.id.uppercase(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }

            1 -> {
                item {
                    Card(shape = RoundedCornerShape(16.dp)) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Local Offline MCP Hub (16 Tools)", style = MaterialTheme.typography.titleMedium)
                            state.mcpLogs.take(5).forEach { log ->
                                Text(log, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                            }
                        }
                    }
                }
                items(AiMcpAgent.LOCAL_MCP_TOOLS, key = { it.id }) { tool ->
                    Card(shape = RoundedCornerShape(12.dp)) {
                        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                                Text(tool.name, style = MaterialTheme.typography.titleSmall)
                                Text(tool.desc, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            FilledTonalButton(
                                onClick = { viewModel.executeLocalMcpTool(tool.id) },
                                modifier = Modifier.minimumInteractiveComponentSize().testTag("mcp_run_${tool.id}")
                            ) { Text("Run") }
                        }
                    }
                }
            }

            2 -> {
                item {
                    Card(shape = RoundedCornerShape(16.dp)) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("QolbuSpace3D: Camera & 5 Hybrid Modes", style = MaterialTheme.typography.titleMedium)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                                QolbuSpace3DMath.CAMERA_3_PRESETS.forEach { cam ->
                                    FilterChip(
                                        selected = state.cameraPreset == cam.id,
                                        onClick = { viewModel.updateSettings { it.copy(cameraPreset = cam.id) } },
                                        label = { Text(cam.id.id.uppercase()) },
                                        modifier = Modifier.weight(1f).minimumInteractiveComponentSize()
                                    )
                                }
                            }
                            QolbuSpace3DMath.HYBRID_5_MODES.forEach { hm ->
                                Row(
                                    modifier = Modifier.fillMaxWidth().clickable { viewModel.updateSettings { it.copy(hybridMode = hm.id) } }.padding(vertical = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(hm.label, style = MaterialTheme.typography.bodyMedium, fontWeight = if (state.hybridMode == hm.id) FontWeight.Bold else FontWeight.Normal)
                                        Text(hm.desc, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    RadioButton(selected = state.hybridMode == hm.id, onClick = { viewModel.updateSettings { it.copy(hybridMode = hm.id) } })
                                }
                            }
                        }
                    }
                }

                item {
                    Card(shape = RoundedCornerShape(16.dp)) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("10 Perspective Connectors & 4 Quality Profiles", style = MaterialTheme.typography.titleMedium)
                            QolbuCore.VISUAL_QUALITY_PROFILES.forEach { vp ->
                                FilterChip(
                                    selected = state.visualQuality == vp.id,
                                    onClick = { viewModel.updateSettings { it.copy(visualQuality = vp.id) } },
                                    label = { Text("${vp.label} (${(vp.resolutionScale * 100).toInt()}% scale, ${vp.maxParticles} particles)") },
                                    modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize()
                                )
                            }
                            QolbuCore.ENGINE_CONNECTORS.forEach { conn ->
                                Row(
                                    modifier = Modifier.fillMaxWidth().clickable { viewModel.updateSettings { it.copy(perspectiveConnector = conn.id) } }.padding(vertical = 3.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("${conn.title} (${conn.drawCallBudget} DC)", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                                        Text("${conn.githubInspiration} · ${conn.summary}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    RadioButton(selected = state.perspectiveConnector == conn.id, onClick = { viewModel.updateSettings { it.copy(perspectiveConnector = conn.id) } })
                                }
                            }
                        }
                    }
                }

                item {
                    var ghQuery by remember { mutableStateOf("") }
                    var ghCategory by remember { mutableStateOf(GitHubRepoCategory.ALL) }
                    var ghPlugins by remember { mutableStateOf(GitHubConnectors.CURATED_GITHUB_PLUGINS) }
                    var ghStatus by remember { mutableStateOf("21 Curated Offline Cleanroom Plugins") }
                    var searching by remember { mutableStateOf(false) }

                    Card(shape = RoundedCornerShape(16.dp)) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("GitHub Engine Plugin Hub", style = MaterialTheme.typography.titleMedium)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                OutlinedTextField(
                                    value = ghQuery,
                                    onValueChange = {
                                        ghQuery = it
                                        ghPlugins = GitHubConnectors.filterCuratedGitHubPlugins(it, ghCategory)
                                    },
                                    label = { Text("Filter / Search GitHub") },
                                    singleLine = true,
                                    modifier = Modifier.weight(1f).testTag("gh_search_input")
                                )
                                Button(
                                    onClick = {
                                        searching = true
                                        viewModel.loadGitHubLiveSearch(ghQuery, ghCategory) { resp ->
                                            ghPlugins = resp.results
                                            ghStatus = "${resp.mode}: ${resp.note}"
                                            searching = false
                                        }
                                    },
                                    enabled = !searching,
                                    modifier = Modifier.minimumInteractiveComponentSize().testTag("gh_live_sync_btn")
                                ) { Text(if (searching) "..." else "Sync") }
                            }
                            Row(modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                GitHubRepoCategory.entries.forEach { cat ->
                                    FilterChip(
                                        selected = ghCategory == cat,
                                        onClick = {
                                            ghCategory = cat
                                            ghPlugins = GitHubConnectors.filterCuratedGitHubPlugins(ghQuery, cat)
                                        },
                                        label = { Text(cat.label) },
                                        modifier = Modifier.minimumInteractiveComponentSize()
                                    )
                                }
                            }
                            Text(ghStatus, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                            ghPlugins.take(8).forEach { p ->
                                Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Column(modifier = Modifier.weight(1f).padding(end = 6.dp)) {
                                        Text("${p.repo} (${p.starsLabel})", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                                        Text(p.dnaPattern, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    FilledTonalButton(
                                        onClick = {
                                            viewModel.updateSettings {
                                                it.copy(
                                                    activeGitHubRepoId = p.id,
                                                    hybridMode = p.recommendedHybridMode,
                                                    cameraPreset = p.recommendedCamera
                                                )
                                            }
                                            viewModel.showBanner("Activated plugin ${p.repo}")
                                        },
                                        modifier = Modifier.minimumInteractiveComponentSize()
                                    ) { Text(if (state.activeGitHubRepoId == p.id) "Active" else "Use") }
                                }
                            }
                        }
                    }
                }
            }

            else -> {
                item {
                    var auditReport by remember { mutableStateOf(QolbuCore.runQolbu8StageAudit(state.hud.drawCalls, state.hud.heapMb)) }
                    Card(shape = RoundedCornerShape(16.dp)) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text("Qolbu 8-Stage Audit & Fuzz", style = MaterialTheme.typography.titleMedium)
                                Button(
                                    onClick = { auditReport = QolbuCore.runQolbu8StageAudit(state.hud.drawCalls, state.hud.heapMb) },
                                    modifier = Modifier.minimumInteractiveComponentSize().testTag("qolbu_run_audit_btn")
                                ) { Text("Re-Run") }
                            }
                            Text(
                                text = if (auditReport.allPassed) "ALL 8 STAGES PASSED (${auditReport.fuzzBlockedCount}/${auditReport.fuzzEventsTested} fuzz blocked)" else "AUDIT WARNING",
                                style = MaterialTheme.typography.labelLarge,
                                color = if (auditReport.allPassed) Color(0xFF34D399) else Color(0xFFF43F5E)
                            )
                            auditReport.stages.forEach { st ->
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("${st.stage}. ${st.name}", style = MaterialTheme.typography.bodySmall)
                                    Text("${if (st.passed) "PASS" else "FAIL"} (${st.detail})", style = MaterialTheme.typography.labelSmall, color = if (st.passed) Color(0xFF34D399) else Color(0xFFF43F5E))
                                }
                            }
                        }
                    }
                }
                item {
                    Card(shape = RoundedCornerShape(16.dp)) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("12-Layer Cleanroom Stack", style = MaterialTheme.typography.titleMedium)
                            QolbuCore.LAYER_ARCHITECTURE_12.forEach { (num, title) ->
                                Text("Layer $num: $title", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }
        }
    }
}
