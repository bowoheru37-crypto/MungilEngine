import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GameShell } from './components/GameShell';
import { LandingPage } from './components/LandingPage';
import { StudioWorkspace } from './components/StudioWorkspace';
import { DEFAULT_STYLE_OVERRIDES } from './engine/artStyles';
import { soundEngine } from './engine/audio';
import { MungilEngineApi } from './engine/bytecode';
import { GENRE_TEMPLATES } from './engine/catalogs';
import { createDeviceProfile } from './engine/deviceProfiler';
import {
  createLevelWorld,
  extractWorldSaveProgress,
  restoreWorldFromSave,
  toHudSnapshot,
  type GameWorld,
} from './engine/gameSimulation';
import {
  buildSavePayload,
  deleteSlotLocal,
  getLatestSaveSlot,
  loadAnalytics,
  loadAuthProfile,
  loadSlotLocal,
  loadTouchConfig,
  saveAnalytics,
  saveAuthProfile,
  saveSlotLocal,
  saveTouchConfig,
} from './engine/storage';
import { createDefaultSceneEntities } from './engine/sceneHierarchy';
import type {
  AiPlayMode,
  AnalyticsSummary,
  ArtStyleId,
  AuthProfile,
  Camera3DPresetId,
  DeviceTierId,
  GameShellState,
  GeneratedCharacterSpec,
  GeneratedGameBlueprintSpec,
  GenreTemplate,
  HudSnapshot,
  HybridRender5Mode,
  LanguageCode,
  PerspectiveConnectorId,
  PhysicsMode,
  RenderMode,
  SaveSlotId,
  SceneEntityNode,
  StudioTab,
  StyleOverrides,
  TouchControlConfig,
  VisualQualityPresetId,
  WeatherKind,
} from './engine/types';
import { usePWAInstall } from './hooks/usePWAInstall';

export default function App() {
  const { isOnline } = usePWAInstall();

  const [shellState, setShellState] = useState<GameShellState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'playing';
    }
    return 'landing';
  });

  const [customCharacter, setCustomCharacter] = useState<GeneratedCharacterSpec | null>(null);

  const [studioTab, setStudioTab] = useState<StudioTab>('play');
  const [gameName, setGameName] = useState('Bowo: Penjaga Cahaya');
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3>(1);

  const [requestedTier, setRequestedTier] = useState<DeviceTierId>('auto');
  const [powerSaveAuto, setPowerSaveAuto] = useState(true);
  const deviceProfile = useMemo(
    () => createDeviceProfile(requestedTier, powerSaveAuto),
    [requestedTier, powerSaveAuto]
  );

  const [styleId, setStyleId] = useState<ArtStyleId>('pixel');
  const [customPalettes, setCustomPalettes] = useState<Partial<Record<ArtStyleId, string[]>>>({});
  const [styleOverrides, setStyleOverrides] = useState<StyleOverrides>(DEFAULT_STYLE_OVERRIDES);
  const [renderMode, setRenderMode] = useState<RenderMode>('2.5D');
  const [physicsMode, setPhysicsMode] = useState<PhysicsMode>('Arcade');
  const [weather, setWeather] = useState<WeatherKind>('Cerah');
  const [practiceMode, setPracticeMode] = useState(false);
  const [physicsDebug, setPhysicsDebug] = useState(false);
  const [activeGenreId, setActiveGenreId] = useState<string>('platformer');
  const [aiMode, setAiMode] = useState<AiPlayMode>('off');
  const [perspectiveConnector, setPerspectiveConnector] = useState<PerspectiveConnectorId>('2_5d_parallax');
  const [cameraPreset, setCameraPreset] = useState<Camera3DPresetId>('follow_3_4');
  const [hybridMode, setHybridMode] = useState<HybridRender5Mode>('hybrid_2_5d_billboard');
  const [activeGitHubRepoId, setActiveGitHubRepoId] = useState<string>('gh_axmol');
  const [visualQuality, setVisualQuality] = useState<VisualQualityPresetId>('mobile_eco');
  const [sceneEntities, setSceneEntities] = useState<SceneEntityNode[]>(() => createDefaultSceneEntities(1));
  const [speedMul, setSpeedMul] = useState(1);
  const [gravityMul, setGravityMul] = useState(1);

  const [touchConfig, setTouchConfigState] = useState<TouchControlConfig>(() => loadTouchConfig());
  const setTouchConfig = useCallback((next: TouchControlConfig) => {
    setTouchConfigState(next);
    saveTouchConfig(next);
  }, []);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lang, setLang] = useState<LanguageCode>('id');
  const [fontSizePx, setFontSizePx] = useState(14);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceShake, setReduceShake] = useState(false);
  const [muted, setMuted] = useState(false);

  const [auth, setAuthState] = useState<AuthProfile>(() => loadAuthProfile());
  const setAuth = useCallback((next: AuthProfile) => {
    setAuthState(next);
    saveAuthProfile(next);
  }, []);

  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsSummary>(() => loadAnalytics());
  const [saveRevision, setSaveRevision] = useState(0);

  const worldRef = useRef<GameWorld | null>(null);
  if (!worldRef.current) {
    worldRef.current = createLevelWorld(1);
  }

  const latestSave = useMemo(() => {
    void saveRevision;
    void shellState;
    return getLatestSaveSlot();
  }, [saveRevision, shellState]);

  const [hud, setHud] = useState<HudSnapshot>(() =>
    toHudSnapshot(worldRef.current!, {
      fps: deviceProfile.targetFps,
      resolutionScale: deviceProfile.dynamicScale,
      drawCalls: 10,
      powerSaveActive: deviceProfile.powerSaveActive,
    })
  );

  // Sync document.body.dataset.state, .dark class, accessibility tokens
  useEffect(() => {
    document.body.dataset.state = shellState;
    if (shellState === 'landing' || shellState === 'studio') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [shellState]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${fontSizePx}px`);
  }, [fontSizePx]);

  useEffect(() => {
    document.documentElement.dataset.contrast = highContrast ? 'high' : 'normal';
    document.documentElement.dataset.reduceMotion = reduceShake ? 'true' : 'false';
  }, [highContrast, reduceShake]);

  // Expose backwards-compatible global Engine API (`window.MungilE`)
  useEffect(() => {
    const api = new MungilEngineApi({
      onSound: (name) => soundEngine.playSfx(name as Parameters<typeof soundEngine.playSfx>[0]),
      onLang: (l) => setLang(l),
      onTheme: (t) => setTheme(t),
      onMode: (m) => setRenderMode(m),
      onPhysics: (p) => setPhysicsMode(p),
      onShake: (amp) => {
        if (worldRef.current) worldRef.current.shakeTrauma = Math.min(1, amp);
      },
    });
    (window as Window & { MungilE?: MungilEngineApi }).MungilE = api;
  }, []);

  const recordAnalytics = useCallback(
    (evt: { killsDelta: number; parriesDelta: number; clearedDelta: number; fps: number }) => {
      if (!analyticsEnabled) return;
      setAnalytics((prev) => {
        const next: AnalyticsSummary = {
          ...prev,
          enemiesDefeated: prev.enemiesDefeated + evt.killsDelta,
          parriesLanded: prev.parriesLanded + evt.parriesDelta,
          levelsCleared: prev.levelsCleared + evt.clearedDelta,
          avgFps: Math.round((prev.avgFps * 4 + evt.fps) / 5),
          lastEvent: evt.clearedDelta > 0 ? 'Level cleared' : evt.parriesDelta > 0 ? 'Parry landed' : prev.lastEvent,
        };
        saveAnalytics(next);
        return next;
      });
    },
    [analyticsEnabled]
  );

  const launchGame = useCallback(
    (levelOverride?: 1 | 2 | 3, genre?: GenreTemplate, aiModeOverride?: AiPlayMode) => {
      const targetLevel = levelOverride ?? activeLevel;
      const targetGenreId = genre ? genre.id : activeGenreId;
      const nextAiMode: AiPlayMode =
        aiModeOverride ?? (genre?.id === 'ai_arena' && aiMode === 'off' ? 'coop' : aiMode);
      if (nextAiMode !== aiMode) {
        setAiMode(nextAiMode);
      }
      if (genre) {
        setActiveGenreId(genre.id);
        setRenderMode(genre.renderMode);
        setPhysicsMode(genre.physicsMode);
        setStyleId(genre.defaultStyle);
        setSpeedMul(genre.speedMul);
        setGravityMul(genre.gravityMul);
      }
      setActiveLevel(targetLevel);
      const nextWorld = createLevelWorld(targetLevel, undefined, targetGenreId);
      if (genre) {
        nextWorld.dialogue = `${genre.name}: ${genre.quest}`;
      }
      worldRef.current = nextWorld;
      setHud(
        toHudSnapshot(nextWorld, {
          fps: deviceProfile.targetFps,
          resolutionScale: deviceProfile.dynamicScale,
          drawCalls: 12,
          powerSaveActive: deviceProfile.powerSaveActive,
          aiMode: nextAiMode,
        })
      );
      setShellState('playing');
      soundEngine.setMuted(muted);
      soundEngine.startTracker(targetLevel);
    },
    [activeGenreId, activeLevel, aiMode, deviceProfile.dynamicScale, deviceProfile.powerSaveActive, deviceProfile.targetFps, muted]
  );

  const launchGeneratedBlueprint = useCallback(
    (bp: GeneratedGameBlueprintSpec) => {
      setGameName(bp.title);
      setActiveGenreId(bp.genreId);
      setRenderMode(bp.renderMode);
      setPhysicsMode(bp.physicsMode);
      setPerspectiveConnector(bp.connectorId);
      setCameraPreset(bp.cameraPreset);
      setHybridMode(bp.hybridMode);
      setAiMode(bp.aiMode);
      setStyleId(bp.styleId);
      setSpeedMul(bp.speedMul);
      setGravityMul(bp.gravityMul);
      setActiveLevel(1);

      const nextWorld = createLevelWorld(1, undefined, bp.genreId);
      nextWorld.dialogue = `${bp.title}: ${bp.levelQuests[0]?.objective ?? 'Collect Shards!'}`;
      worldRef.current = nextWorld;
      setHud(
        toHudSnapshot(nextWorld, {
          fps: deviceProfile.targetFps,
          resolutionScale: deviceProfile.dynamicScale,
          drawCalls: bp.budgetReport.drawCallsEst,
          powerSaveActive: deviceProfile.powerSaveActive,
          aiMode: bp.aiMode,
        })
      );
      setShellState('playing');
      soundEngine.setMuted(muted);
      soundEngine.startTracker(1);
    },
    [deviceProfile.dynamicScale, deviceProfile.powerSaveActive, deviceProfile.targetFps, muted]
  );

  const handleSaveProgress = useCallback(
    (slotId: SaveSlotId): { ok: boolean; bytes: number; level: 1 | 2 | 3 } => {
      const w = worldRef.current ?? createLevelWorld(activeLevel, undefined, activeGenreId);
      const worldState = extractWorldSaveProgress(w);
      const numericSlot: 1 | 2 | 3 = slotId === 'auto' ? 1 : slotId;
      const payload = buildSavePayload(numericSlot, {
        gameTitle: gameName,
        level: w.level,
        hp: Math.max(1, w.player.hp),
        energy: w.player.energy,
        coins: w.coinsTotal,
        shards: w.shardsTotal,
        score: w.score,
        kills: w.kills,
        potions: w.potions,
        styleId,
        worldState,
      });
      const res = saveSlotLocal(payload, slotId);
      setSaveRevision((r) => r + 1);
      return { ok: res.ok, bytes: res.bytes, level: w.level };
    },
    [activeGenreId, activeLevel, gameName, styleId]
  );

  const handleLoadProgress = useCallback(
    (slotId: SaveSlotId, launchImmediately = true): { ok: boolean; level?: 1 | 2 | 3; score?: number; migrated?: boolean; checksumValid?: boolean } => {
      const loaded = loadSlotLocal(slotId);
      if (!loaded) return { ok: false };
      const restored = restoreWorldFromSave(loaded.data);
      const matchedGenre = GENRE_TEMPLATES.find((g) => g.id === restored.genreId);
      setActiveLevel(restored.level);
      setActiveGenreId(restored.genreId);
      setStyleId(loaded.data.styleId);
      if (matchedGenre) {
        setRenderMode(matchedGenre.renderMode);
        setPhysicsMode(matchedGenre.physicsMode);
        setSpeedMul(matchedGenre.speedMul);
        setGravityMul(matchedGenre.gravityMul);
      }
      worldRef.current = restored;
      setHud(
        toHudSnapshot(restored, {
          fps: deviceProfile.targetFps,
          resolutionScale: deviceProfile.dynamicScale,
          drawCalls: 12,
          powerSaveActive: deviceProfile.powerSaveActive,
        })
      );
      if (launchImmediately) {
        setShellState('playing');
        soundEngine.setMuted(muted);
        soundEngine.startTracker(restored.level);
      }
      return {
        ok: true,
        level: restored.level,
        score: restored.score,
        migrated: loaded.migrated,
        checksumValid: loaded.checksumValid,
      };
    },
    [deviceProfile.dynamicScale, deviceProfile.powerSaveActive, deviceProfile.targetFps, muted]
  );

  const handleDeleteSaveSlot = useCallback((slotId: SaveSlotId) => {
    deleteSlotLocal(slotId);
    setSaveRevision((r) => r + 1);
  }, []);

  const handleApplyLoadedSave = useCallback(
    (lvl: 1 | 2 | 3, coins: number, score: number, potions: number) => {
      setActiveLevel(lvl);
      const nextWorld = createLevelWorld(lvl, { coinsTotal: coins, score, potions });
      worldRef.current = nextWorld;
      setHud(
        toHudSnapshot(nextWorld, {
          fps: deviceProfile.targetFps,
          resolutionScale: deviceProfile.dynamicScale,
          drawCalls: 12,
          powerSaveActive: deviceProfile.powerSaveActive,
        })
      );
    },
    [deviceProfile.dynamicScale, deviceProfile.powerSaveActive, deviceProfile.targetFps]
  );

  const handleAddBonusCoinsPotions = useCallback(
    (coinsDelta: number, potionsDelta: number) => {
      if (!worldRef.current) return;
      worldRef.current.coinsTotal = Math.min(9999, worldRef.current.coinsTotal + coinsDelta);
      worldRef.current.potions = Math.min(99, worldRef.current.potions + potionsDelta);
      setHud(
        toHudSnapshot(worldRef.current, {
          fps: deviceProfile.targetFps,
          resolutionScale: deviceProfile.dynamicScale,
          drawCalls: 12,
          powerSaveActive: deviceProfile.powerSaveActive,
        })
      );
    },
    [deviceProfile.dynamicScale, deviceProfile.powerSaveActive, deviceProfile.targetFps]
  );

  if (shellState === 'landing') {
    return (
      <LandingPage
        activeLevel={activeLevel}
        setActiveLevel={setActiveLevel}
        styleId={styleId}
        customPalettes={customPalettes}
        styleOverrides={styleOverrides}
        customCharacter={customCharacter}
        deviceProfile={deviceProfile}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        muted={muted}
        setMuted={setMuted}
        isOnline={isOnline}
        latestSave={latestSave}
        onContinueSaved={() => {
          if (latestSave) handleLoadProgress(latestSave.id, true);
        }}
        onStartPlay={() => launchGame(activeLevel)}
        onOpenTitleStage={() => setShellState('title')}
        onOpenStudioTab={(tab) => {
          setStudioTab(tab);
          setShellState('studio');
        }}
      />
    );
  }

  if (shellState === 'studio') {
    return (
      <StudioWorkspace
        activeTab={studioTab}
        setActiveTab={setStudioTab}
        gameName={gameName}
        setGameName={setGameName}
        activeLevel={activeLevel}
        setActiveLevel={setActiveLevel}
        requestedTier={requestedTier}
        onChangeTier={setRequestedTier}
        powerSaveAuto={powerSaveAuto}
        onChangePowerSaveAuto={setPowerSaveAuto}
        deviceProfile={deviceProfile}
        renderMode={renderMode}
        setRenderMode={setRenderMode}
        physicsMode={physicsMode}
        setPhysicsMode={setPhysicsMode}
        weather={weather}
        setWeather={setWeather}
        practiceMode={practiceMode}
        setPracticeMode={setPracticeMode}
        physicsDebug={physicsDebug}
        setPhysicsDebug={setPhysicsDebug}
        activeGenreId={activeGenreId}
        styleId={styleId}
        setStyleId={setStyleId}
        customPalettes={customPalettes}
        setCustomPalettes={setCustomPalettes}
        styleOverrides={styleOverrides}
        setStyleOverrides={setStyleOverrides}
        touchConfig={touchConfig}
        setTouchConfig={setTouchConfig}
        theme={theme}
        setTheme={setTheme}
        fontSizePx={fontSizePx}
        setFontSizePx={setFontSizePx}
        highContrast={highContrast}
        setHighContrast={setHighContrast}
        reduceShake={reduceShake}
        setReduceShake={setReduceShake}
        lang={lang}
        setLang={setLang}
        auth={auth}
        setAuth={setAuth}
        analytics={analytics}
        analyticsEnabled={analyticsEnabled}
        setAnalyticsEnabled={setAnalyticsEnabled}
        hud={hud}
        isOnline={isOnline}
        customCharacter={customCharacter}
        setCustomCharacter={setCustomCharacter}
        onBackToLanding={() => {
          soundEngine.stopTracker();
          setShellState('landing');
        }}
        onBackToTitle={() => setShellState('title')}
        onLaunchGame={launchGame}
        onLaunchBlueprint={launchGeneratedBlueprint}
        onApplyLoadedSave={handleApplyLoadedSave}
        onSaveProgress={handleSaveProgress}
        onLoadProgress={handleLoadProgress}
        onDeleteSaveSlot={handleDeleteSaveSlot}
        saveRevision={saveRevision}
        onAddBonusCoinsPotions={handleAddBonusCoinsPotions}
        aiMode={aiMode}
        setAiMode={setAiMode}
        perspectiveConnector={perspectiveConnector}
        setPerspectiveConnector={setPerspectiveConnector}
        cameraPreset={cameraPreset}
        setCameraPreset={setCameraPreset}
        hybridMode={hybridMode}
        setHybridMode={setHybridMode}
        activeGitHubRepoId={activeGitHubRepoId}
        setActiveGitHubRepoId={setActiveGitHubRepoId}
        visualQuality={visualQuality}
        setVisualQuality={setVisualQuality}
        sceneEntities={sceneEntities}
        setSceneEntities={setSceneEntities}
      />
    );
  }

  return (
    <GameShell
      shellState={shellState}
      setShellState={setShellState}
      activeLevel={activeLevel}
      setActiveLevel={setActiveLevel}
      styleId={styleId}
      customPalettes={customPalettes}
      styleOverrides={styleOverrides}
      renderMode={renderMode}
      physicsMode={physicsMode}
      weather={weather}
      practiceMode={practiceMode}
      physicsDebug={physicsDebug}
      activeGenreId={activeGenreId}
      aiMode={aiMode}
      setAiMode={setAiMode}
      perspectiveConnector={perspectiveConnector}
      cameraPreset={cameraPreset}
      hybridMode={hybridMode}
      visualQuality={visualQuality}
      speedMul={speedMul}
      gravityMul={gravityMul}
      deviceProfile={deviceProfile}
      touchConfig={touchConfig}
      lang={lang}
      setLang={setLang}
      theme={theme}
      setTheme={setTheme}
      muted={muted}
      setMuted={setMuted}
      reduceShake={reduceShake}
      isOnline={isOnline}
      hud={hud}
      onHudChange={setHud}
      onOpenControls={() => {
        soundEngine.stopTracker();
        setStudioTab('controls');
        setShellState('studio');
      }}
      onOpenStudio={() => {
        soundEngine.stopTracker();
        setShellState('studio');
      }}
      onBackToLanding={() => {
        soundEngine.stopTracker();
        setShellState('landing');
      }}
      customCharacter={customCharacter}
      onRecordAnalytics={recordAnalytics}
      worldRefExternal={worldRef}
      latestSave={latestSave}
      saveRevision={saveRevision}
      onSaveProgress={handleSaveProgress}
      onLoadProgress={handleLoadProgress}
      onAutoSaveWorld={() => handleSaveProgress('auto')}
    />
  );
}
