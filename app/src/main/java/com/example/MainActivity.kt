package com.example

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.engine.GameShellState
import com.example.engine.SoundEngine
import com.example.ui.MainViewModel
import com.example.ui.screens.GameShellScreen
import com.example.ui.screens.LandingScreen
import com.example.ui.screens.StudioWorkspaceScreen
import com.example.ui.theme.MungilEngineTheme

class MainActivity : ComponentActivity() {
    private val viewModel: MainViewModel by viewModels()

    private var pendingExportMime = "application/octet-stream"
    private var pendingExportBytes: ByteArray = ByteArray(0)

    private val createDocumentLauncher =
        registerForActivityResult(ActivityResultContracts.CreateDocument("*/*")) { uri: Uri? ->
            if (uri != null) {
                try {
                    contentResolver.openOutputStream(uri)?.use { out ->
                        out.write(pendingExportBytes)
                    }
                    viewModel.showBanner("Exported file (${pendingExportBytes.size} bytes)")
                } catch (t: Throwable) {
                    viewModel.showBanner("Export failed: ${t.message}")
                }
            }
        }

    private val openDocumentLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
            if (uri != null) {
                try {
                    val text = contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() } ?: ""
                    viewModel.showBanner(viewModel.importSaveJson(text))
                } catch (t: Throwable) {
                    viewModel.showBanner("Import failed: ${t.message}")
                }
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val state by viewModel.state.collectAsStateWithLifecycle()
            val lifecycleOwner = LocalLifecycleOwner.current
            val snackbarHostState = remember { SnackbarHostState() }

            DisposableEffect(lifecycleOwner) {
                val observer = LifecycleEventObserver { _, event ->
                    when (event) {
                        Lifecycle.Event.ON_PAUSE -> SoundEngine.suspend()
                        Lifecycle.Event.ON_RESUME -> SoundEngine.resume()
                        else -> Unit
                    }
                }
                lifecycleOwner.lifecycle.addObserver(observer)
                onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
            }

            LaunchedEffect(state.statusBanner) {
                val msg = state.statusBanner ?: return@LaunchedEffect
                snackbarHostState.showSnackbar(msg)
                viewModel.clearBanner()
            }

            MungilEngineTheme(
                darkTheme = state.darkTheme,
                highContrast = state.highContrast,
                fontSizePx = state.fontSizePx
            ) {
                Scaffold(
                    snackbarHost = { SnackbarHost(snackbarHostState) }
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                    ) {
                        when (state.shellState) {
                            GameShellState.LANDING -> LandingScreen(
                                state = state,
                                onSelectLevel = { lvl -> viewModel.updateSettings { it.copy(activeLevel = lvl) } },
                                onStartPlay = { viewModel.startOrRestartLevel(state.activeLevel) },
                                onContinueSaved = {
                                    state.latestSave?.let { sv ->
                                        if (sv.exists) viewModel.loadProgress(sv.id, launchImmediately = true)
                                    }
                                },
                                onOpenTitleStage = { viewModel.openTitleStage() },
                                onOpenStudioTab = { tab -> viewModel.openStudioTab(tab) },
                                onChangeLanguage = { lang -> viewModel.updateSettings { it.copy(lang = lang) } },
                                onToggleTheme = { viewModel.updateSettings { it.copy(darkTheme = !it.darkTheme) } },
                                onToggleMute = { viewModel.updateSettings { it.copy(muted = !it.muted) } }
                            )
                            GameShellState.STUDIO -> StudioWorkspaceScreen(
                                state = state,
                                viewModel = viewModel,
                                onExportFile = { filename, mime, bytes ->
                                    pendingExportMime = mime
                                    pendingExportBytes = bytes
                                    createDocumentLauncher.launch(filename)
                                },
                                onCopyText = { label, text ->
                                    val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    cm.setPrimaryClip(ClipData.newPlainText(label, text))
                                    viewModel.showBanner("Copied $label to clipboard")
                                },
                                onImportSaveFile = {
                                    openDocumentLauncher.launch(arrayOf("application/json", "text/plain", "*/*"))
                                }
                            )
                            else -> GameShellScreen(state = state, viewModel = viewModel)
                        }
                    }
                }
            }
        }
    }
}
