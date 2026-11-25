package com.example.ui

import android.app.Application
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.engine.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AppUiState(
    val shellState: GameShellState = GameShellState.LANDING,
    val studioTab: StudioTab = StudioTab.PLAY,
    val gameName: String = "Bowo: Penjaga Cahaya",
    val activeLevel: Int = 1,
    val requestedTier: DeviceTierId = DeviceTierId.AUTO,
    val powerSaveAuto: Boolean = true,
    val deviceProfile: DeviceProfile = DeviceProfiler.createDeviceProfile(DeviceTierId.AUTO, true),
    val styleId: ArtStyleId = ArtStyleId.PIXEL,
    val customPalettes: Map<ArtStyleId, List<String>> = emptyMap(),
    val styleOverrides: StyleOverrides = ArtStyles.DEFAULT_STYLE_OVERRIDES,
    val renderMode: RenderMode = RenderMode.MODE_2_5D,
    val physicsMode: PhysicsMode = PhysicsMode.ARCADE,
    val weather: WeatherKind = WeatherKind.CERAH,
    val practiceMode: Boolean = false,
    val physicsDebug: Boolean = false,
    val activeGenreId: String = "platformer",
    val aiMode: AiPlayMode = AiPlayMode.OFF,
    val perspectiveConnector: PerspectiveConnectorId = PerspectiveConnectorId.PARALLAX_2_5D,
    val cameraPreset: Camera3DPresetId = Camera3DPresetId.FOLLOW_3_4,
    val hybridMode: HybridRender5Mode = HybridRender5Mode.HYBRID_2_5D_BILLBOARD,
    val activeGitHubRepoId: String = "gh_axmol",
    val visualQuality: VisualQualityPresetId = VisualQualityPresetId.MOBILE_ECO,
    val sceneEntities: List<SceneEntityNode> = SceneHierarchy.createDefaultSceneEntities(1),
    val speedMul: Float = 1f,
    val gravityMul: Float = 1f,
    val touchConfig: TouchControlConfig = TouchControlConfig(),
    val darkTheme: Boolean = true,
    val lang: LanguageCode = LanguageCode.ID,
    val fontSizePx: Int = 14,
    val highContrast: Boolean = false,
    val reduceShake: Boolean = false,
    val muted: Boolean = false,
    val isOnline: Boolean = true,
    val auth: AuthProfile = AuthProfile(),
    val analyticsEnabled: Boolean = true,
    val analytics: AnalyticsSummary = AnalyticsSummary(),
    val customCharacter: GeneratedCharacterSpec? = null,
    val eventRules: List<EventRuleSpec> = emptyList(),
    val myWizardGames: List<WizardGameSpec> = emptyList(),
    val activeArenaSpec: WizardGameSpec? = null,
    val forcedArenaMode: ArenaMode? = null,
    val saveSummaries: List<SaveSlotSummary> = emptyList(),
    val latestSave: SaveSlotSummary? = null,
    val hud: HudSnapshot = HudSnapshot(),
    val statusBanner: String? = null,
    val mcpLogs: List<String> = listOf("[MCP] Ready: 16 local offline tools initialized.")
)

class MainViewModel(application: Application) : AndroidViewModel(application) {
    val storage = StorageRepository(application)
    val assetManager = AssetManager(2_097_152)

    private val _state = MutableStateFlow(AppUiState())
    val state: StateFlow<AppUiState> = _state.asStateFlow()

    var activeWorld: GameWorld = GameSimulation.createLevelWorld(1)
        private set

    init {
        SoundEngine.initTts(application)
        val tierProfile = DeviceProfiler.createDeviceProfile(DeviceTierId.AUTO, true, application)
        val touch = storage.loadTouchConfig()
        val auth = storage.loadAuthProfile()
        val analytics = storage.loadAnalytics()
        val rules = storage.loadEventRules()
        val wizGames = storage.loadWizardGames()
        val summaries = storage.listSaveSummaries()
        val latest = storage.getLatestSaveSlot()
        val online = checkOnline(application)

        _state.update {
            it.copy(
                deviceProfile = tierProfile,
                touchConfig = touch,
                auth = auth,
                analytics = analytics,
                eventRules = rules,
                myWizardGames = wizGames,
                saveSummaries = summaries,
                latestSave = latest,
                isOnline = online,
                hud = GameSimulation.toHudSnapshot(activeWorld, tierProfile.targetFps, tierProfile.dynamicScale, it.aiMode)
            )
        }
    }

    private fun checkOnline(app: Application): Boolean {
        return try {
            val cm = app.getSystemService(ConnectivityManager::class.java)
            val net = cm?.activeNetwork ?: return false
            val caps = cm.getNetworkCapabilities(net) ?: return false
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        } catch (_: Throwable) {
            false
        }
    }

    fun showBanner(msg: String) {
        _state.update { it.copy(statusBanner = msg) }
    }

    fun clearBanner() {
        _state.update { it.copy(statusBanner = null) }
    }

    fun openStudioTab(tab: StudioTab) {
        SoundEngine.stopTracker()
        _state.update { it.copy(shellState = GameShellState.STUDIO, studioTab = tab) }
    }

    fun backToLanding() {
        SoundEngine.stopTracker()
        _state.update { it.copy(shellState = GameShellState.LANDING) }
    }

    fun openTitleStage() {
        SoundEngine.stopTracker()
        _state.update { it.copy(shellState = GameShellState.TITLE) }
    }

    fun startOrRestartLevel(
        level: Int = _state.value.activeLevel,
        genre: GenreTemplate? = null,
        aiOverride: AiPlayMode? = null
    ) {
        val lvl = level.coerceIn(1, 3)
        val cur = _state.value
        val nextGenreId = genre?.id ?: cur.activeGenreId
        val nextAi = aiOverride ?: cur.aiMode
        val nextRender = genre?.renderMode ?: cur.renderMode
        val nextPhysics = genre?.physicsMode ?: cur.physicsMode
        val nextStyle = genre?.styleId ?: cur.styleId
        val nextWeather = genre?.weather ?: cur.weather
        val nextGrav = genre?.gravityMul ?: cur.gravityMul
        val nextSpd = genre?.speedMul ?: cur.speedMul

        assetManager.loadLevelBundle(lvl)
        activeWorld = GameSimulation.createLevelWorld(lvl, cur.customCharacter, nextGenreId)
        val nextAnalytics = if (cur.analyticsEnabled) {
            cur.analytics.copy(sessions = cur.analytics.sessions + 1).also { storage.saveAnalytics(it) }
        } else cur.analytics

        _state.update {
            it.copy(
                shellState = GameShellState.PLAYING,
                activeLevel = lvl,
                activeGenreId = nextGenreId,
                aiMode = nextAi,
                renderMode = nextRender,
                physicsMode = nextPhysics,
                styleId = nextStyle,
                weather = nextWeather,
                gravityMul = nextGrav,
                speedMul = nextSpd,
                sceneEntities = SceneHierarchy.createDefaultSceneEntities(lvl),
                analytics = nextAnalytics,
                hud = GameSimulation.toHudSnapshot(activeWorld, it.deviceProfile.targetFps, it.deviceProfile.dynamicScale, nextAi)
            )
        }
        SoundEngine.startTracker(lvl)
    }

    fun launchBlueprint(bp: GeneratedGameBlueprintSpec) {
        assetManager.loadLevelBundle(1)
        activeWorld = GameSimulation.createLevelWorld(1, _state.value.customCharacter, bp.genreId)
        val mergedRules = (bp.rules + _state.value.eventRules).distinctBy { it.id }
        storage.saveEventRules(mergedRules)
        _state.update {
            it.copy(
                shellState = GameShellState.PLAYING,
                gameName = bp.title,
                activeLevel = 1,
                activeGenreId = bp.genreId,
                perspectiveConnector = bp.perspective,
                cameraPreset = bp.cameraPreset,
                hybridMode = bp.hybridMode,
                physicsMode = bp.physicsMode,
                renderMode = bp.renderMode,
                styleId = bp.styleId,
                weather = bp.weather,
                aiMode = bp.aiMode,
                eventRules = mergedRules,
                hud = GameSimulation.toHudSnapshot(activeWorld, it.deviceProfile.targetFps, it.deviceProfile.dynamicScale, bp.aiMode)
            )
        }
        SoundEngine.startTracker(1)
    }

    fun pauseGame() {
        if (_state.value.shellState == GameShellState.PLAYING) {
            SoundEngine.stopTracker()
            _state.update { it.copy(shellState = GameShellState.PAUSED) }
        }
    }

    fun resumeGame() {
        if (_state.value.shellState == GameShellState.PAUSED) {
            _state.update { it.copy(shellState = GameShellState.PLAYING) }
            SoundEngine.startTracker(_state.value.activeLevel)
        }
    }

    fun syncWorldEventsAndHud(events: List<SimEvent>, fps: Int) {
        for (ev in events) {
            SoundEngine.playSfx(ev.type, ev.panX)
        }
        val cur = _state.value
        val hud = GameSimulation.toHudSnapshot(activeWorld, fps, cur.deviceProfile.dynamicScale, cur.aiMode)

        if (activeWorld.status == "level_clear") {
            val nextLvl = (activeWorld.level + 1).coerceAtMost(3)
            saveProgress("auto")
            startOrRestartLevel(nextLvl)
            return
        } else if (activeWorld.status == "victory") {
            SoundEngine.stopTracker()
            saveProgress("auto")
            _state.update { it.copy(shellState = GameShellState.VICTORY, hud = hud) }
            return
        } else if (activeWorld.status == "gameover") {
            SoundEngine.stopTracker()
            val nextAn = if (cur.analyticsEnabled) cur.analytics.copy(deaths = cur.analytics.deaths + 1).also { storage.saveAnalytics(it) } else cur.analytics
            _state.update { it.copy(shellState = GameShellState.GAMEOVER, analytics = nextAn, hud = hud) }
            return
        }

        _state.update { it.copy(hud = hud) }
    }

    fun triggerPotion() {
        if (GameSimulation.usePotion(activeWorld)) {
            SoundEngine.playSfx("potion")
            syncWorldEventsAndHud(emptyList(), _state.value.hud.fps)
        }
    }

    fun chooseVnOption(index: Int) {
        if (GameSimulation.selectVisualNovelChoice(activeWorld, index)) {
            SoundEngine.playSfx("shard")
            syncWorldEventsAndHud(emptyList(), _state.value.hud.fps)
        }
    }

    fun saveProgress(slotId: String): Pair<Boolean, Int> {
        val cur = _state.value
        val ws = GameSimulation.extractWorldSaveProgress(activeWorld)
        val payload = storage.buildSavePayload(
            slotId = slotId,
            gameTitle = cur.gameName,
            level = activeWorld.level,
            hp = activeWorld.player.hp,
            energy = activeWorld.player.energy.toInt(),
            coins = activeWorld.coinsTotal,
            shards = activeWorld.shardsTotal,
            score = activeWorld.score,
            kills = activeWorld.kills,
            potions = activeWorld.potions,
            styleId = cur.styleId,
            worldState = ws
        )
        val res = storage.saveSlotLocal(slotId, payload)
        _state.update {
            it.copy(
                saveSummaries = storage.listSaveSummaries(),
                latestSave = storage.getLatestSaveSlot()
            )
        }
        return res
    }

    fun loadProgress(slotId: String, launchImmediately: Boolean): Boolean {
        val parsed = storage.loadSlotLocal(slotId) ?: return false
        val d = parsed.data
        assetManager.loadLevelBundle(d.level)
        activeWorld = GameSimulation.restoreWorldFromSave(d, _state.value.customCharacter)
        _state.update {
            it.copy(
                activeLevel = d.level,
                activeGenreId = activeWorld.genreId,
                styleId = ArtStyleId.fromId(d.styleId),
                shellState = if (launchImmediately) GameShellState.PLAYING else it.shellState,
                hud = GameSimulation.toHudSnapshot(activeWorld, it.deviceProfile.targetFps, it.deviceProfile.dynamicScale, it.aiMode)
            )
        }
        if (launchImmediately) SoundEngine.startTracker(d.level)
        return true
    }

    fun importSaveJson(rawJson: String): String {
        return try {
            val parsed = storage.parseAndMigrateSave(rawJson, "1")
            storage.saveSlotLocal("1", parsed.data)
            _state.update {
                it.copy(
                    saveSummaries = storage.listSaveSummaries(),
                    latestSave = storage.getLatestSaveSlot()
                )
            }
            "Imported to Slot 1 (Migrated=${parsed.migrated}, Checksum=${parsed.checksumValid})"
        } catch (t: Throwable) {
            "Import failed: ${t.message}"
        }
    }

    fun deleteSaveSlot(slotId: String) {
        storage.deleteSlotLocal(slotId)
        _state.update {
            it.copy(
                saveSummaries = storage.listSaveSummaries(),
                latestSave = storage.getLatestSaveSlot()
            )
        }
    }

    fun addBonusCoinsPotions(coins: Int, potions: Int) {
        activeWorld.coinsTotal += coins
        activeWorld.potions += potions
        _state.update {
            it.copy(hud = GameSimulation.toHudSnapshot(activeWorld, it.hud.fps, it.deviceProfile.dynamicScale, it.aiMode))
        }
    }

    fun setDeviceTier(tier: DeviceTierId, powerSave: Boolean = _state.value.powerSaveAuto) {
        val next = DeviceProfiler.createDeviceProfile(tier, powerSave, getApplication())
        _state.update { it.copy(requestedTier = tier, powerSaveAuto = powerSave, deviceProfile = next) }
    }

    fun updateSettings(transform: (AppUiState) -> AppUiState) {
        _state.update { cur ->
            val next = transform(cur)
            if (next.touchConfig != cur.touchConfig) storage.saveTouchConfig(next.touchConfig)
            if (next.auth != cur.auth) storage.saveAuthProfile(next.auth)
            if (next.eventRules != cur.eventRules) storage.saveEventRules(next.eventRules)
            if (next.myWizardGames != cur.myWizardGames) storage.saveWizardGames(next.myWizardGames)
            if (next.muted != cur.muted) SoundEngine.setMuted(next.muted)
            next
        }
    }

    fun executeLocalMcpTool(toolId: String) {
        val logLine = when (toolId) {
            "list_tools" -> "[MCP] 16 active local tools: ${AiMcpAgent.LOCAL_MCP_TOOLS.joinToString { it.name }}"
            "validate_game" -> {
                val report = QolbuCore.runQolbu8StageAudit(_state.value.hud.drawCalls, _state.value.hud.heapMb)
                "[MCP] Qolbu 8-Stage Audit: passed=${report.allPassed} (${report.fuzzBlockedCount}/${report.fuzzEventsTested} fuzz blocked)"
            }
            "spawn_entity" -> {
                val added = SceneEntityNode("ent_mcp_${System.currentTimeMillis() % 999}", "MCP Slime", "enemy", x = 200f, y = 120f)
                _state.update { it.copy(sceneEntities = it.sceneEntities + added) }
                "[MCP] Spawned MCP Slime into Scene Hierarchy."
            }
            "play_ai" -> {
                _state.update { it.copy(studioTab = StudioTab.ARENA, forcedArenaMode = ArenaMode.SOLO) }
                "[MCP] Launched Qolbu Arena in Solo AI mode."
            }
            "co_play_ai" -> {
                _state.update { it.copy(studioTab = StudioTab.ARENA, forcedArenaMode = ArenaMode.COPLAY) }
                "[MCP] Launched Qolbu Arena in Co-Play mode."
            }
            "vs_ai" -> {
                _state.update { it.copy(studioTab = StudioTab.ARENA, forcedArenaMode = ArenaMode.VS) }
                "[MCP] Launched Qolbu Arena in VS Boss Kala mode."
            }
            "export_game" -> {
                _state.update { it.copy(studioTab = StudioTab.EXPORT) }
                "[MCP] Switched to Export & APK Build Pack tab."
            }
            else -> "[MCP] Executed tool '$toolId' on local bridge."
        }
        _state.update { it.copy(mcpLogs = (listOf(logLine) + it.mcpLogs).take(14)) }
    }

    fun playWizardGame(spec: WizardGameSpec) {
        val forced = when (spec.aiMode) {
            "Sendiri" -> ArenaMode.SOLO
            "Lawan" -> ArenaMode.VS
            else -> ArenaMode.COPLAY
        }
        _state.update {
            it.copy(
                shellState = GameShellState.STUDIO,
                studioTab = StudioTab.ARENA,
                activeArenaSpec = spec,
                forcedArenaMode = forced
            )
        }
    }

    fun loadGitHubLiveSearch(query: String, cat: GitHubRepoCategory, onDone: (GitHubConnectors.GitHubSearchResponse) -> Unit) {
        viewModelScope.launch {
            onDone(GitHubConnectors.searchGitHubReposWithFallback(query, cat))
        }
    }
}
