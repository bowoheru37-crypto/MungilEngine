package com.example.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.engine.GameShellState
import com.example.engine.I18n
import com.example.engine.StudioTab
import com.example.ui.AppUiState
import com.example.ui.MainViewModel

@Composable
fun StudioWorkspaceScreen(
    state: AppUiState,
    viewModel: MainViewModel,
    onExportFile: (String, String, ByteArray) -> Unit,
    onCopyText: (String, String) -> Unit,
    onImportSaveFile: () -> Unit
) {
    val tr = I18n.t(state.lang)
    BackHandler {
        viewModel.backToLanding()
    }

    val tabLabels = mapOf(
        StudioTab.PLAY to tr.tabs.play,
        StudioTab.SCENE to tr.tabs.scene,
        StudioTab.AGENT to tr.tabs.agent,
        StudioTab.ARENA to tr.tabs.arena,
        StudioTab.ASSETS to tr.tabs.assets,
        StudioTab.GENERATORS to tr.tabs.generators,
        StudioTab.CONTROLS to tr.tabs.controls,
        StudioTab.ART to tr.tabs.art,
        StudioTab.LAB to tr.tabs.lab,
        StudioTab.SKILLS to tr.tabs.skills,
        StudioTab.SERVICES to tr.tabs.services,
        StudioTab.EXPORT to tr.tabs.export
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing)
    ) {
        Surface(tonalElevation = 4.dp) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        IconButton(
                            onClick = { viewModel.backToLanding() },
                            modifier = Modifier.minimumInteractiveComponentSize().testTag("studio_home_btn")
                        ) {
                            Icon(Icons.Default.Home, contentDescription = stringResource(R.string.cd_back_home))
                        }
                        Column {
                            Text(state.gameName, style = MaterialTheme.typography.titleMedium)
                            Text(
                                text = "Studio · ${state.deviceProfile.activeTier.id.uppercase()} · Lv.${state.activeLevel}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                        OutlinedButton(
                            onClick = { viewModel.openTitleStage() },
                            modifier = Modifier.minimumInteractiveComponentSize().testTag("studio_title_btn")
                        ) { Text("Title") }
                        Button(
                            onClick = { viewModel.startOrRestartLevel(state.activeLevel) },
                            modifier = Modifier.minimumInteractiveComponentSize().testTag("studio_play_btn")
                        ) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null)
                            Spacer(Modifier.width(4.dp))
                            Text(tr.playGame)
                        }
                    }
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    StudioTab.entries.forEach { tab ->
                        FilterChip(
                            selected = state.studioTab == tab,
                            onClick = { viewModel.openStudioTab(tab) },
                            label = { Text(tabLabels[tab] ?: tab.id.uppercase()) },
                            modifier = Modifier.minimumInteractiveComponentSize().testTag("tab_${tab.id}")
                        )
                    }
                }
            }
        }

        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.TopCenter
        ) {
            Box(modifier = Modifier.fillMaxSize().widthIn(max = 840.dp)) {
                when (state.studioTab) {
                    StudioTab.PLAY -> StudioPlayTab(state, viewModel)
                    StudioTab.SCENE -> StudioSceneEditorTab(state, viewModel)
                    StudioTab.AGENT -> StudioAgentTab(state, viewModel)
                    StudioTab.ARENA -> StudioArenaAiTab(state, viewModel)
                    StudioTab.ASSETS -> StudioAssetsTab(state, viewModel)
                    StudioTab.GENERATORS -> StudioGeneratorsTab(state, viewModel, onExportFile)
                    StudioTab.CONTROLS -> StudioControlsTab(state, viewModel)
                    StudioTab.ART -> StudioArtTab(state, viewModel)
                    StudioTab.LAB -> StudioLabTab(state, viewModel)
                    StudioTab.SKILLS -> StudioSkillsTab(onCopyText, onExportFile)
                    StudioTab.SERVICES -> StudioServicesTab(state, viewModel, onExportFile, onImportSaveFile)
                    StudioTab.EXPORT -> StudioExportTab(state, viewModel, onExportFile, onCopyText)
                }
            }
        }
    }
}
