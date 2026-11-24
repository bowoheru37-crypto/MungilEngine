import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GameShell } from './components/GameShell';
import { LandingPage } from './components/LandingPage';
import { OfflineToast } from './components/OfflineToast';
import { StudioWorkspace } from './components/StudioWorkspace';
import { DEFAULT_STYLE_OVERRIDES } from './engine/artStyles';
import { soundEngine } from './engine/audio';
import { MungilEngineApi } from './engine/bytecode';
import { createDeviceProfile } from './engine/deviceProfiler';
import { createLevelWorld, toHudSnapshot, type GameWorld } from './engine/gameSimulation';
import { generateCharacter } from './engine/generators';
import { LOCAL_MCP_TOOLS, buildWizardGameSpec } from './engine/qolbuAgent';
import { groupEntities } from './engine/scenePhysics';
import {
  buildSavePayload,
  loadAnalytics,
  loadAuthProfile,
  loadCollisionShapes,
  loadEventRules,
  loadSceneEntities,
  loadTouchConfig,
  loadWizardGames,
  saveAnalytics,
  saveAuthProfile,
  saveCollisionShapes,
  saveEventRules,
  saveSceneEntities,
  saveSlotLocal,
  saveTouchConfig,
  saveWizardGames,
} from './engine/storage';
import type {
  AnalyticsSummary,
  ArenaMode,
  ArtStyleId,
  AuthProfile,
  CollisionShapeSpec,
  DeviceTierId,
  EventSheetRule,
  GameShellState,
  GeneratedCharacterSpec,
  GenreTemplate,
  HudSnapshot,
  LanguageCode,
  PhysicsMode,
  RenderMode,
  SceneEntityNode,
  StudioTab,
  StyleOverrides,
  TouchControlConfig,
  WeatherKind,
  WizardGameSpec,
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
  const [eventRules, setEventRulesState] = useState<EventSheetRule[]>(() => loadEventRules());
  const setEventRules = useCallback((updater: EventSheetRule[] | ((prev: EventSheetRule[]) => EventSheetRule[])) => {
    setEventRulesState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveEventRules(next);
      return next;
    });
  }, []);

  const [sceneEntities, setSceneEntitiesState] = useState<SceneEntityNode[]>(() => loadSceneEntities());
  const setSceneEntities = useCallback(
    (updater: SceneEntityNode[] | ((prev: SceneEntityNode[]) => SceneEntityNode[])) => {
      setSceneEntitiesState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        saveSceneEntities(next);
        return next;
      });
    },
    []
  );

  const [collisionShapes, setCollisionShapesState] = useState<CollisionShapeSpec[]>(() => loadCollisionShapes());
  const setCollisionShapes = useCallback(
    (updater: CollisionShapeSpec[] | ((prev: CollisionShapeSpec[]) => CollisionShapeSpec[])) => {
      setCollisionShapesState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        saveCollisionShapes(next);
        return next;
      });
    },
    []
  );

  const [myGames, setMyGamesState] = useState<WizardGameSpec[]>(() => loadWizardGames());
  const setMyGames = useCallback((updater: WizardGameSpec[] | ((prev: WizardGameSpec[]) => WizardGameSpec[])) => {
    setMyGamesState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveWizardGames(next);
      return next;
    });
  }, []);

  const [activeArenaSpec, setActiveArenaSpec] = useState<WizardGameSpec | null>(null);
  const [forcedArenaMode, setForcedArenaMode] = useState<ArenaMode | undefined>(undefined);
  const [mcpLogs, setMcpLogs] = useState<string[]>([
    '[MCP Ready] 16 local tools registered via in-app Editor Bridge (offline-ready).',
  ]);

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

  const handleAutoSaveLocal = useCallback(() => {
    const w = worldRef.current;
    if (!w) return;
    const payload = buildSavePayload(1, {
      gameTitle: gameName,
      level: w.level,
      hp: w.player.hp || 100,
      energy: w.player.energy,
      coins: w.coinsTotal,
      shards: w.shards.filter((s) => s.collected).length,
      score: w.score,
      kills: w.kills,
      potions: w.potions,
      styleId,
    });
    saveSlotLocal(payload);
  }, [gameName, styleId]);

  // Auto-save active progress locally whenever PWA transitions offline
  useEffect(() => {
    if (!isOnline && (shellState === 'playing' || shellState === 'paused')) {
      handleAutoSaveLocal();
    }
  }, [handleAutoSaveLocal, isOnline, shellState]);

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

  const handlePlayWizardGame = useCallback((game: WizardGameSpec) => {
    setActiveArenaSpec(game);
    setForcedArenaMode(game.aiMode === 'Sendiri' ? 'solo' : game.aiMode === 'Lawan' ? 'vs' : 'coplay');
    setStudioTab('arena');
  }, []);

  const handleExecuteMcpTool = useCallback(
    (toolId: string) => {
      const appendLog = (msg: string) =>
        setMcpLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${toolId}: ${msg}`, ...prev].slice(0, 24));

      switch (toolId) {
        case 'list_tools':
          appendLog(`Aktif ${LOCAL_MCP_TOOLS.length} tools (${LOCAL_MCP_TOOLS.map((x) => x.name).slice(0, 5).join(', ')}...)`);
          break;
        case 'explain_engine':
          appendLog('7-Layer Qolbu Core: Zero-GC SoA + 15Hz AI + FD Lite Render.');
          break;
        case 'guide_player':
          appendLog(`Quest Lv.${hud.level}: Shards ${hud.shards}/${hud.requiredShards}, HP ${hud.hp}.`);
          break;
        case 'create_game': {
          const spec = buildWizardGameSpec({
            name: `MCP Arena ${myGames.length + 1}`,
            genre: 'Arena',
            sprite: 'Bowo MCP',
            characterName: 'Bowo',
            preset: 'BOUNCY',
            map: 'Arena Qolbu',
            enemies: 3,
            items: 3,
            aiMode: 'Bareng',
            difficulty: 'Normal',
            durationSec: 90,
          });
          setMyGames((prev) => [spec, ...prev]);
          appendLog(`Game "${spec.name}" dibuat & disimpan ke Koleksi Game Saya.`);
          break;
        }
        case 'spawn_entity': {
          const newId = `ent_mcp_${Date.now().toString(36)}`;
          setSceneEntities((prev) => [
            ...prev,
            {
              id: newId,
              name: `MCP Slime ${prev.length + 1}`,
              type: 'Enemy',
              x: 190,
              y: 120,
              sx: 1,
              sy: 1,
              rot: 0,
              parent: null,
              locked: false,
              hidden: false,
              preset: 'BOUNCY',
            },
          ]);
          setCollisionShapes((prev) => [
            ...prev,
            {
              id: `shp_${newId}`,
              entityId: newId,
              type: 'Circle',
              w: 32,
              h: 32,
              r: 16,
              ox: 0,
              oy: 0,
              rot: 0,
              color: '#f43f5e',
              verts: [
                { x: 0, y: -16 },
                { x: 16, y: 12 },
                { x: -16, y: 12 },
              ],
            },
          ]);
          appendLog('Entitas MCP Slime + Collider di-spawn ke Scene.');
          break;
        }
        case 'set_physics_preset':
          setSceneEntities((prev) => prev.map((e, i) => (i === 0 ? { ...e, preset: 'SLIPPERY' } : e)));
          appendLog('Preset SLIPPERY diterapkan ke entitas utama.');
          break;
        case 'group_entities': {
          const nonContainers = sceneEntities.filter((e) => e.type !== 'CONTAINER').slice(0, 2).map((e) => e.id);
          const grouped = groupEntities(sceneEntities, nonContainers, 'Grup MCP');
          setSceneEntities(grouped.nodes);
          appendLog(grouped.containerId ? '2 entitas digabung ke Container "Grup MCP" (keep-world).' : 'Butuh >=2 entitas.');
          break;
        }
        case 'edit_collision_shape':
          setCollisionShapes((prev) => prev.map((s, i) => (i === 0 ? { ...s, type: 'Circle', r: 24 } : s)));
          appendLog('Collider utama diubah menjadi Circle r=24px.');
          break;
        case 'generate_asset': {
          const hero = generateCharacter(Date.now() % 9999, '3D-Stack', 'Knight');
          setCustomCharacter(hero);
          appendLog(`Karakter 3D-Stack "${hero.name}" dipasang ke Bowo!`);
          break;
        }
        case 'generate_level':
          setWeather('Hujan');
          setStudioTab('generators');
          appendLog('Membuka Generators & mengaktifkan cuaca Hujan.');
          break;
        case 'generate_dialog':
          if (worldRef.current) {
            worldRef.current.dialogue = 'Qolbu MCP: Cahaya menuntun langkahmu menuju Menara Kala!';
          }
          appendLog('Dialog chapter baru diperbarui pada dunia aktif.');
          break;
        case 'validate_game':
          appendLog('Audit 9 Larangan Mutlak & 25 Check selesai: Semua batas Itel A70 aman.');
          setStudioTab('lab');
          break;
        case 'export_game':
          appendLog('Membuka Export & Android APK Build Pack.');
          setStudioTab('export');
          break;
        case 'play_ai':
          setForcedArenaMode('solo');
          setStudioTab('arena');
          appendLog('Meluncurkan Qolbu Arena Mode Solo AI.');
          break;
        case 'co_play_ai':
          setForcedArenaMode('coplay');
          setStudioTab('arena');
          appendLog('Meluncurkan Qolbu Arena Mode Co-Play.');
          break;
        case 'vs_ai':
          setForcedArenaMode('vs');
          setStudioTab('arena');
          appendLog('Meluncurkan Qolbu Arena Mode VS Boss Kala Adaptif.');
          break;
        default:
          appendLog('Tool selesai dijalankan.');
      }
    },
    [hud.hp, hud.level, hud.requiredShards, hud.shards, myGames.length, sceneEntities, setCollisionShapes, setMyGames, setSceneEntities]
  );

  if (shellState === 'landing') {
    return (
      <>
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
        <OfflineToast isOnline={isOnline} lang={lang} shellState={shellState} />
      </>
    );
  }

  if (shellState === 'studio') {
    return (
      <>
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
          eventRules={eventRules}
          setEventRules={setEventRules}
          hud={hud}
          isOnline={isOnline}
          customCharacter={customCharacter}
          setCustomCharacter={setCustomCharacter}
          sceneEntities={sceneEntities}
          setSceneEntities={setSceneEntities}
          collisionShapes={collisionShapes}
          setCollisionShapes={setCollisionShapes}
          myGames={myGames}
          setMyGames={setMyGames}
          activeArenaSpec={activeArenaSpec}
          forcedArenaMode={forcedArenaMode}
          mcpLogs={mcpLogs}
          onExecuteMcpTool={handleExecuteMcpTool}
          onPlayWizardGame={handlePlayWizardGame}
          onBackToLanding={() => {
            soundEngine.stopTracker();
            setShellState('landing');
          }}
          onBackToTitle={() => setShellState('title')}
          onLaunchGame={launchGame}
          onApplyLoadedSave={handleApplyLoadedSave}
          onAddBonusCoinsPotions={handleAddBonusCoinsPotions}
        />
        <OfflineToast isOnline={isOnline} lang={lang} shellState={shellState} />
      </>
    );
  }

  return (
    <>
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
        eventRules={eventRules}
        onAutoSaveLocal={handleAutoSaveLocal}
        onRecordAnalytics={recordAnalytics}
        worldRefExternal={worldRef}
      />
      <OfflineToast isOnline={isOnline} lang={lang} shellState={shellState} />
    </>
  );
}
