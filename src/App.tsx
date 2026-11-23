import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GameShell } from './components/GameShell';
import { LandingPage } from './components/LandingPage';
import { StudioWorkspace } from './components/StudioWorkspace';
import { DEFAULT_STYLE_OVERRIDES } from './engine/artStyles';
import { soundEngine } from './engine/audio';
import { MungilEngineApi } from './engine/bytecode';
import { createDeviceProfile } from './engine/deviceProfiler';
import { createLevelWorld, toHudSnapshot, type GameWorld } from './engine/gameSimulation';
import {
  loadAnalytics,
  loadAuthProfile,
  loadTouchConfig,
  saveAnalytics,
  saveAuthProfile,
  saveTouchConfig,
} from './engine/storage';
import type {
  AnalyticsSummary,
  ArtStyleId,
  AuthProfile,
  DeviceTierId,
  GameShellState,
  GeneratedCharacterSpec,
  GenreTemplate,
  HudSnapshot,
  LanguageCode,
  PhysicsMode,
  RenderMode,
  StudioTab,
  StyleOverrides,
  TouchControlConfig,
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

  const worldRef = useRef<GameWorld | null>(null);
  if (!worldRef.current) {
    worldRef.current = createLevelWorld(1);
  }

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
    (levelOverride?: 1 | 2 | 3, genre?: GenreTemplate) => {
      const targetLevel = levelOverride ?? activeLevel;
      const targetGenreId = genre ? genre.id : activeGenreId;
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
        })
      );
      setShellState('playing');
      soundEngine.setMuted(muted);
      soundEngine.startTracker(targetLevel);
    },
    [activeGenreId, activeLevel, deviceProfile.dynamicScale, deviceProfile.powerSaveActive, deviceProfile.targetFps, muted]
  );

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
        onApplyLoadedSave={handleApplyLoadedSave}
        onAddBonusCoinsPotions={handleAddBonusCoinsPotions}
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
    />
  );
}
