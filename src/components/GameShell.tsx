import { Pause, Play, RotateCcw, Settings2, Sliders, Volume2, VolumeX, Wrench } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

import {
  drawBowoCharacter,
  drawEnemyEntity,
  drawGateAsset,
  drawGroundTile,
  drawRockAsset,
  drawTreeAsset,
  getStyleSpec,
} from '../engine/artStyles';
import { assetManager } from '../engine/assetManager';
import { soundEngine } from '../engine/audio';
import { isCircleInViewport, isPointInViewport, isRectInViewport, type ViewportBounds } from '../engine/culling';
import { updateDynamicResolution } from '../engine/deviceProfiler';
import { ParticlePool } from '../engine/ecs';
import {
  createLevelWorld,
  LEVEL_DEFINITIONS,
  selectVisualNovelChoice,
  stepGameWorld,
  toHudSnapshot,
  usePotion,
  type GameWorld,
  type SimConfig,
  type SimInput,
} from '../engine/gameSimulation';
import { createAiCompanionState, stepAi15Hz } from '../engine/aiMcpAgent';
import { LANGUAGE_NAMES, t } from '../engine/i18n';
import { renderMode7Horizon, renderRaycastCorridor } from '../engine/pseudo3d';
import { fastClampDt, isValidMove } from '../engine/qolbuCore';
import { QolbuSpace3D } from '../engine/qolbuSpace3d';
import { listSaveSlots } from '../engine/storage';
import type {
  AiCompanionState,
  AiPlayMode,
  ArtStyleId,
  Camera3DPresetId,
  CharacterAnimState,
  DeviceProfile,
  EventSheetRule,
  GameShellState,
  GeneratedCharacterSpec,
  HudSnapshot,
  HybridRender5Mode,
  LanguageCode,
  PerspectiveConnectorId,
  PhysicsMode,
  RenderMode,
  SaveSlotId,
  SaveSlotSummary,
  StyleOverrides,
  TouchControlConfig,
  VisualQualityPresetId,
  WeatherKind,
} from '../engine/types';
import { PWAInstallButton } from './PWAInstallButton';

const GAME_SPACE_3D = new QolbuSpace3D('follow_3_4', 16 / 9);

interface GameShellProps {
  shellState: GameShellState;
  setShellState: (next: GameShellState) => void;
  activeLevel: 1 | 2 | 3;
  setActiveLevel: (lvl: 1 | 2 | 3) => void;
  styleId: ArtStyleId;
  customPalettes: Partial<Record<ArtStyleId, string[]>>;
  styleOverrides: StyleOverrides;
  renderMode: RenderMode;
  physicsMode: PhysicsMode;
  weather: WeatherKind;
  practiceMode: boolean;
  physicsDebug?: boolean;
  activeGenreId?: string;
  aiMode?: AiPlayMode;
  setAiMode?: (mode: AiPlayMode) => void;
  perspectiveConnector?: PerspectiveConnectorId;
  cameraPreset?: Camera3DPresetId;
  hybridMode?: HybridRender5Mode;
  visualQuality?: VisualQualityPresetId;
  speedMul: number;
  gravityMul: number;
  deviceProfile: DeviceProfile;
  touchConfig: TouchControlConfig;
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  reduceShake: boolean;
  isOnline: boolean;
  hud: HudSnapshot;
  onHudChange: (snapshot: HudSnapshot) => void;
  onOpenControls: () => void;
  onOpenStudio: () => void;
  onBackToLanding?: () => void;
  customCharacter?: GeneratedCharacterSpec | null;
  eventRules?: EventSheetRule[];
  onAutoSaveLocal?: () => void;
  onRecordAnalytics: (evt: { killsDelta: number; parriesDelta: number; clearedDelta: number; fps: number }) => void;
  worldRefExternal: React.MutableRefObject<GameWorld | null>;
  latestSave?: SaveSlotSummary | null;
  saveRevision?: number;
  onSaveProgress?: (slotId: SaveSlotId) => { ok: boolean; bytes: number; level: 1 | 2 | 3 };
  onLoadProgress?: (slotId: SaveSlotId, launchImmediately?: boolean) => { ok: boolean; level?: 1 | 2 | 3; score?: number };
  onAutoSaveWorld?: () => void;
}

export function GameShell({
  shellState,
  setShellState,
  activeLevel,
  setActiveLevel,
  styleId,
  customPalettes,
  styleOverrides,
  renderMode,
  physicsMode,
  weather,
  practiceMode,
  physicsDebug = false,
  activeGenreId = 'platformer',
  aiMode = 'off',
  setAiMode,
  perspectiveConnector = '2_5d_parallax',
  cameraPreset = 'follow_3_4',
  hybridMode = 'hybrid_2_5d_billboard',
  visualQuality = 'mobile_eco',
  speedMul,
  gravityMul,
  deviceProfile,
  touchConfig,
  lang,
  setLang,
  theme,
  setTheme,
  muted,
  setMuted,
  reduceShake,
  isOnline,
  hud,
  onHudChange,
  onOpenControls,
  onOpenStudio,
  onBackToLanding,
  customCharacter,
  eventRules,
  onAutoSaveLocal,
  onRecordAnalytics,
  worldRefExternal,
  latestSave,
  saveRevision = 0,
  onSaveProgress,
  onLoadProgress,
  onAutoSaveWorld,
}: GameShellProps) {
  const tr = t(lang);
  const pauseStatusRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const joyKnobRef = useRef<HTMLDivElement | null>(null);
  const hpBarRef = useRef<HTMLDivElement | null>(null);
  const energyBarRef = useRef<HTMLDivElement | null>(null);
  const bossBarRef = useRef<HTMLDivElement | null>(null);

  const particlePoolRef = useRef<ParticlePool>(new ParticlePool());
  const aiCompanionRef = useRef<AiCompanionState>(createAiCompanionState());
  const keysRef = useRef<Record<string, boolean>>({});
  const joyVecRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const pendingActionsRef = useRef<{ jump: boolean; jumpHeld: boolean; attack: boolean; dash: boolean; burst: boolean }>({
    jump: false,
    jumpHeld: false,
    attack: false,
    dash: false,
    burst: false,
  });

  // Live config refs so rAF loop never tears down on slider changes
  const configRef = useRef({
    shellState,
    styleId,
    customPalettes,
    styleOverrides,
    renderMode,
    physicsMode,
    weather,
    practiceMode,
    physicsDebug,
    activeGenreId,
    aiMode,
    perspectiveConnector,
    cameraPreset,
    hybridMode,
    visualQuality,
    speedMul,
    gravityMul,
    deviceProfile,
    touchConfig,
    reduceShake,
    customCharacter,
    eventRules,
  });
  configRef.current = {
    shellState,
    styleId,
    customPalettes,
    styleOverrides,
    renderMode,
    physicsMode,
    weather,
    practiceMode,
    physicsDebug,
    activeGenreId,
    aiMode,
    perspectiveConnector,
    cameraPreset,
    hybridMode,
    visualQuality,
    speedMul,
    gravityMul,
    deviceProfile,
    touchConfig,
    reduceShake,
    customCharacter,
    eventRules,
  };

  const callbacksRef = useRef({
    setShellState,
    setActiveLevel,
    onHudChange,
    onAutoSaveLocal,
    onRecordAnalytics,
    onAutoSaveWorld,
  });
  callbacksRef.current = {
    setShellState,
    setActiveLevel,
    onHudChange,
    onAutoSaveLocal,
    onRecordAnalytics,
    onAutoSaveWorld,
  };

  const triggerHaptic = useCallback((ms = 12) => {
    if (configRef.current.touchConfig.haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore
      }
    }
  }, []);

  const initOrResetLevel = useCallback(
    (level: 1 | 2 | 3, preserveCarry = false) => {
      assetManager.setBudgetBytes(configRef.current.deviceProfile.activeTier === 'eco' ? 2_048_000 : 4_096_000);
      assetManager.loadLevelBundle(level);
      const prev = worldRefExternal.current;
      const carry =
        preserveCarry && prev
          ? {
              coinsTotal: prev.coinsTotal,
              score: prev.score,
              kills: prev.kills,
              potions: prev.potions,
              shardsTotal: prev.shardsTotal,
            }
          : undefined;
      const genreId = configRef.current.activeGenreId ?? prev?.genreId ?? 'platformer';
      const nextWorld = createLevelWorld(level, carry, genreId);
      worldRefExternal.current = nextWorld;
      particlePoolRef.current.clear();
      callbacksRef.current.setActiveLevel(level);
      callbacksRef.current.onHudChange(
        toHudSnapshot(nextWorld, {
          fps: configRef.current.deviceProfile.targetFps,
          resolutionScale: configRef.current.deviceProfile.dynamicScale,
          drawCalls: 12,
          culledCount: 0,
          powerSaveActive: configRef.current.deviceProfile.powerSaveActive,
        })
      );
    },
    [worldRefExternal]
  );

  // Ensure initial world exists
  if (!worldRefExternal.current) {
    worldRefExternal.current = createLevelWorld(activeLevel, undefined, activeGenreId);
  }

  const startGame = useCallback(() => {
    soundEngine.playSfx('ui_click');
    initOrResetLevel(activeLevel, false);
    setShellState('playing');
    soundEngine.setMuted(muted);
    soundEngine.startTracker(activeLevel);
  }, [activeLevel, initOrResetLevel, muted, setShellState]);

  const restartCurrentLevel = useCallback(() => {
    soundEngine.playSfx('ui_click');
    initOrResetLevel(activeLevel, false);
    setShellState('playing');
    soundEngine.startTracker(activeLevel);
  }, [activeLevel, initOrResetLevel, setShellState]);

  const handleDrinkPotion = useCallback(() => {
    const w = worldRefExternal.current;
    if (!w) return;
    if (usePotion(w)) {
      soundEngine.playSfx('potion');
      triggerHaptic(15);
      onHudChange(
        toHudSnapshot(w, {
          fps: hud.fps,
          resolutionScale: hud.resolutionScale,
          drawCalls: hud.drawCalls,
          powerSaveActive: hud.powerSaveActive,
        })
      );
    }
  }, [hud.drawCalls, hud.fps, hud.powerSaveActive, hud.resolutionScale, onHudChange, triggerHaptic, worldRefExternal]);

  // Keyboard bindings & blur/visibility safety
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      const key = e.key.toLowerCase();
      const map = configRef.current.touchConfig.keyMap;
      const state = configRef.current.shellState;

      if (state === 'title' && (key === 'enter' || key === ' ')) {
        e.preventDefault();
        startGame();
        return;
      }

      if ((key === 'escape' || key === 'p') && (state === 'playing' || state === 'paused')) {
        e.preventDefault();
        if (state === 'playing') {
          soundEngine.stopTracker();
          setShellState('paused');
        } else {
          soundEngine.startTracker(activeLevel);
          setShellState('playing');
        }
        return;
      }

      if (state !== 'playing') return;

      if (key === ' ' || key === 'arrowup' || key === 'arrowdown' || key === map.jump || key === map.up || key === map.down) {
        e.preventDefault();
      }

      const wasDown = keysRef.current[key];
      keysRef.current[key] = true;

      if (!wasDown) {
        if (key === map.jump || key === ' ' || key === 'arrowup') {
          pendingActionsRef.current.jump = true;
          pendingActionsRef.current.jumpHeld = true;
        }
        if (key === map.attack) pendingActionsRef.current.attack = true;
        if (key === map.dash) pendingActionsRef.current.dash = true;
        if (key === map.burst) pendingActionsRef.current.burst = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = false;
      const map = configRef.current.touchConfig.keyMap;
      if (key === map.jump || key === ' ' || key === 'arrowup') {
        pendingActionsRef.current.jumpHeld = false;
      }
    };

    const clearKeys = () => {
      keysRef.current = {};
      pendingActionsRef.current.jumpHeld = false;
      joyVecRef.current = { x: 0, y: 0, active: false };
    };

    const onVisibility = () => {
      if (document.hidden) {
        clearKeys();
        soundEngine.suspend();
        if (configRef.current.shellState === 'playing') {
          callbacksRef.current.setShellState('paused');
        }
      } else if (configRef.current.shellState === 'playing') {
        soundEngine.resume();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeLevel, setShellState, startGame]);

  // Isolated Fixed-Timestep Simulation + Render rAF Loop (mounts canvas once)
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    let emaFrameMs = 16.67;
    let dynamicScale = configRef.current.deviceProfile.dynamicScale;
    let powerSaveActive = configRef.current.deviceProfile.powerSaveActive;
    let resCheckAccum = 0;
    let idleRenderAccum = 0;
    let hudSyncAccum = 0;
    let prevCanvasW = 0;
    let prevCanvasH = 0;
    let titleIdleTime = 0;

    const frame = (now: number) => {
      rafId = window.requestAnimationFrame(frame);

      const frameMs = Math.min(80, Math.max(1, now - lastTime));
      lastTime = now;

      const cfg = configRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (cfg.shellState === 'studio') return;

      const isActivePlay = cfg.shellState === 'playing';
      if (isActivePlay) {
        emaFrameMs = emaFrameMs * 0.9 + frameMs * 0.1;
        resCheckAccum += frameMs / 1000;
        if (resCheckAccum >= 0.5) {
          resCheckAccum = 0;
          const resUpdate = updateDynamicResolution(cfg.deviceProfile, emaFrameMs, dynamicScale);
          dynamicScale = resUpdate.nextScale;
          powerSaveActive = resUpdate.powerSaveActive;
        }
      } else {
        idleRenderAccum += frameMs / 1000;
        if (prevCanvasW > 0 && idleRenderAccum < 0.08) {
          return;
        }
        idleRenderAccum = 0;
      }

      // Dynamic resolution resize only when dimensions change meaningfully (>24px hysteresis)
      const rect = canvas.getBoundingClientRect();
      const targetW = Math.max(320, Math.round(rect.width * dynamicScale));
      const targetH = Math.max(240, Math.round(rect.height * dynamicScale));
      if (Math.abs(targetW - prevCanvasW) > 24 || Math.abs(targetH - prevCanvasH) > 24) {
        canvas.width = targetW;
        canvas.height = targetH;
        prevCanvasW = targetW;
        prevCanvasH = targetH;
      }

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const style = getStyleSpec(cfg.styleId, cfg.customPalettes);
      const world = worldRefExternal.current;
      const fixedStep = cfg.deviceProfile.fixedStepSec;

      if (isActivePlay && world) {
        const dt = fastClampDt(frameMs / 1000);
        accumulator += dt;
        let steps = 0;

        while (accumulator >= fixedStep && steps < 3) {
          const k = keysRef.current;
          const km = cfg.touchConfig.keyMap;
          const left = k[km.left] || k['arrowleft'] ? 1 : 0;
          const right = k[km.right] || k['arrowright'] ? 1 : 0;
          const up = k[km.up] || k['arrowup'] ? 1 : 0;
          const down = k[km.down] || k['arrowdown'] ? 1 : 0;
          const keyX = right - left;
          const keyY = down - up;
          const joyX = Math.abs(joyVecRef.current.x) >= cfg.touchConfig.deadzone ? joyVecRef.current.x : 0;
          const joyY = Math.abs(joyVecRef.current.y) >= cfg.touchConfig.deadzone ? joyVecRef.current.y : 0;
          const moveX = Math.max(-1, Math.min(1, keyX + joyX));
          const moveY = Math.max(-1, Math.min(1, keyY + joyY));

          const manualInput: SimInput = {
            moveX,
            moveY,
            jumpPressed: pendingActionsRef.current.jump,
            jumpHeld: pendingActionsRef.current.jumpHeld,
            attackPressed: pendingActionsRef.current.attack,
            dashPressed: pendingActionsRef.current.dash,
            burstPressed: pendingActionsRef.current.burst,
          };

          pendingActionsRef.current.jump = false;
          pendingActionsRef.current.attack = false;
          pendingActionsRef.current.dash = false;
          pendingActionsRef.current.burst = false;

          const aiStep = stepAi15Hz(world, aiCompanionRef.current, cfg.aiMode, fixedStep);
          const hasManualOverride =
            Math.abs(manualInput.moveX) > 0.1 ||
            Math.abs(manualInput.moveY) > 0.1 ||
            manualInput.jumpPressed ||
            manualInput.attackPressed ||
            manualInput.dashPressed ||
            manualInput.burstPressed;
          const input: SimInput =
            aiStep.inputOverride && !hasManualOverride ? aiStep.inputOverride : manualInput;

          const simCfg: SimConfig = {
            physicsMode: cfg.physicsMode,
            renderMode: cfg.renderMode,
            weather: cfg.weather,
            practiceMode: cfg.practiceMode,
            speedMul: cfg.speedMul,
            gravityMul: cfg.gravityMul,
            ecoAi15Hz: cfg.deviceProfile.activeTier === 'eco',
            eventRules: cfg.eventRules,
          };

          const prevPx = world.player.x;
          const prevPy = world.player.y;
          const events = stepGameWorld(world, input, fixedStep, simCfg, 620);
          if (!isValidMove(prevPx, prevPy, world.player.x, world.player.y, fixedStep, 600)) {
            world.player.x = prevPx;
            world.player.y = prevPy;
          }
          particlePoolRef.current.step(fixedStep);

          for (const ev of events) {
            if (ev.type === 'sfx' && ev.detail) {
              soundEngine.playSfx(ev.detail as Parameters<typeof soundEngine.playSfx>[0], ev.x ?? 0);
            } else if (ev.type === 'hit') {
              const count = powerSaveActive ? 4 : 9;
              for (let i = 0; i < count; i++) {
                particlePoolRef.current.spawn(
                  world.player.x + world.player.facing * 26,
                  world.player.y - 6,
                  (Math.random() - 0.5) * 180,
                  -Math.random() * 140 - 30,
                  0.38,
                  3.2,
                  0
                );
              }
            } else if (ev.type === 'parry') {
              callbacksRef.current.onRecordAnalytics({ killsDelta: 0, parriesDelta: 1, clearedDelta: 0, fps: Math.round(1000 / emaFrameMs) });
              for (let i = 0; i < 12; i++) {
                particlePoolRef.current.spawn(
                  world.player.x,
                  world.player.y,
                  (Math.random() - 0.5) * 240,
                  (Math.random() - 0.5) * 240,
                  0.45,
                  3.5,
                  1
                );
              }
            } else if (ev.type === 'level_clear') {
              const nextLvl = (world.level + 1) as 1 | 2 | 3;
              soundEngine.playSfx('gate');
              callbacksRef.current.onRecordAnalytics({ killsDelta: 0, parriesDelta: 0, clearedDelta: 1, fps: Math.round(1000 / emaFrameMs) });
              callbacksRef.current.onAutoSaveLocal?.();
              initOrResetLevel(nextLvl, true);
              callbacksRef.current.onAutoSaveWorld?.();
              soundEngine.startTracker(nextLvl);
              break;
            } else if (ev.type === 'victory') {
              soundEngine.stopTracker();
              callbacksRef.current.onAutoSaveLocal?.();
              callbacksRef.current.onRecordAnalytics({ killsDelta: 0, parriesDelta: 0, clearedDelta: 1, fps: Math.round(1000 / emaFrameMs) });
              callbacksRef.current.onAutoSaveWorld?.();
              callbacksRef.current.setShellState('victory');
            } else if (ev.type === 'gameover') {
              soundEngine.stopTracker();
              callbacksRef.current.onAutoSaveLocal?.();
              callbacksRef.current.setShellState('gameover');
            }
          }

          accumulator -= fixedStep;
          steps += 1;
        }

        // Direct-DOM bar mutations for zero React 60Hz re-render overhead
        if (hpBarRef.current) {
          hpBarRef.current.style.width = `${Math.max(0, Math.min(100, (world.player.hp / world.player.maxHp) * 100))}%`;
        }
        if (energyBarRef.current) {
          energyBarRef.current.style.width = `${Math.max(0, Math.min(100, (world.player.energy / world.player.maxEnergy) * 100))}%`;
        }
        if (bossBarRef.current) {
          const boss = world.enemies.find((e) => e.archetype === 'boss_kala' && !e.dead);
          if (boss) {
            bossBarRef.current.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
          }
        }
      } else {
        titleIdleTime += 0.08;
      }

      // Render World with Screen-Space Culling & Optional Physics Debug
      const activeWorld = world ?? createLevelWorld(1, undefined, cfg.activeGenreId);
      const { drawCalls, culledCount } = renderGameScene(ctx, canvas.width, canvas.height, activeWorld, particlePoolRef.current, style, {
        renderMode: cfg.renderMode,
        physicsMode: cfg.physicsMode,
        gravityMul: cfg.gravityMul,
        physicsDebug: cfg.physicsDebug,
        weather: cfg.weather,
        overrides: cfg.styleOverrides,
        reduceShake: cfg.reduceShake,
        powerSaveActive,
        timeFallback: titleIdleTime,
        customCharacter: cfg.customCharacter,
        aiCompanion: aiCompanionRef.current,
        aiMode: cfg.aiMode,
        perspectiveConnector: cfg.perspectiveConnector,
        cameraPreset: cfg.cameraPreset,
        hybridMode: cfg.hybridMode,
        visualQuality: cfg.visualQuality,
      });

      // Throttled HUD text snapshot sync (~6Hz) only while playing
      if (isActivePlay && world) {
        hudSyncAccum += frameMs / 1000;
        if (hudSyncAccum >= 0.16) {
          hudSyncAccum = 0;
          const fps = Math.min(60, Math.max(15, Math.round(1000 / emaFrameMs)));
          callbacksRef.current.onHudChange(
            toHudSnapshot(world, {
              fps,
              resolutionScale: dynamicScale,
              drawCalls,
              culledCount,
              powerSaveActive,
              aiMode: cfg.aiMode,
              aiNote: aiCompanionRef.current.active ? aiCompanionRef.current.actionLabel : undefined,
            })
          );
        }
      }
    };

    rafId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(rafId);
  }, [initOrResetLevel, worldRefExternal]);

  const handleJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    joyVecRef.current.active = true;
    updateJoystickFromPointer(e);
  };

  const handleJoystickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joyVecRef.current.active) return;
    updateJoystickFromPointer(e);
  };

  const handleJoystickPointerUp = () => {
    joyVecRef.current = { x: 0, y: 0, active: false };
    if (joyKnobRef.current) {
      joyKnobRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
    }
  };

  const updateJoystickFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const radius = rect.width / 2;
    const dx = e.clientX - (rect.left + radius);
    const dy = e.clientY - (rect.top + radius);
    const dist = Math.hypot(dx, dy);
    const maxR = radius * 0.68;
    const clamped = dist > maxR && dist > 0 ? maxR / dist : 1;
    const nx = (dx * clamped) / maxR;
    const ny = (dy * clamped) / maxR;
    joyVecRef.current.x = Math.max(-1, Math.min(1, nx));
    joyVecRef.current.y = Math.max(-1, Math.min(1, ny));

    if (joyKnobRef.current) {
      joyKnobRef.current.style.transform = `translate3d(${(dx * clamped).toFixed(1)}px, ${(dy * clamped).toFixed(1)}px, 0px)`;
    }
  };

  const isPixelCrisp = styleId === 'pixel' || styleId === 'retro';
  const btnSize = Math.max(44, touchConfig.buttonSize);
  const joySize = Math.max(88, touchConfig.joystickSize);

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-(--canvas-bg) select-none">
      {/* Live Full-Viewport Game Canvas */}
      <canvas
        ref={canvasRef}
        className={`block h-full w-full ${isPixelCrisp ? 'pixel-crisp' : ''}`}
        style={{
          filter: `brightness(${styleOverrides.brightness}%) contrast(${styleOverrides.contrast}%) saturate(${styleOverrides.saturation}%)`,
        }}
      />

      {/* TITLE SCREEN OVERLAY */}
      {shellState === 'title' && (
        <div className="absolute inset-0 z-20 flex flex-col justify-between bg-gradient-to-b from-slate-950/45 via-slate-950/15 to-slate-950/60 p-4 sm:p-6">
          {/* Minimal Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-xs font-medium text-slate-200">
              <span>{isOnline ? tr.onlineBadge : tr.offlineBadge}</span>
              <span className="opacity-40">·</span>
              <span className="font-mono-num">
                {deviceProfile.activeTier.toUpperCase()} ({deviceProfile.targetFps} FPS)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Language"
                value={lang}
                onChange={(e) => setLang(e.target.value as LanguageCode)}
                className="touch-btn rounded-xl border border-white/15 bg-slate-900/85 px-2.5 py-1.5 text-xs font-semibold text-white outline-none"
              >
                {LANGUAGE_NAMES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="touch-btn rounded-xl border border-white/15 bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                {theme === 'dark' ? 'Dark' : 'Light'}
              </button>
              <button
                type="button"
                aria-label="Mute Audio"
                onClick={() => {
                  const next = !muted;
                  setMuted(next);
                  soundEngine.setMuted(next);
                }}
                className="touch-btn inline-flex items-center justify-center rounded-xl border border-white/15 bg-slate-900/85 px-2.5 text-white hover:bg-slate-800"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Center Title Lockup + Primary Play CTA */}
          <div className="mx-auto flex w-full max-w-lg flex-col items-center rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-center shadow-xl sm:p-6">
            <svg viewBox="0 0 360 110" className="mb-3 h-24 w-full max-w-xs drop-shadow-lg" aria-hidden="true">
              <defs>
                <linearGradient id="bowoTitleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="55%" stopColor="#4ade80" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              <circle cx="180" cy="36" r="26" fill="none" stroke="url(#bowoTitleGrad)" strokeWidth="2.5" strokeDasharray="6 4" />
              <path d="M180 14 L189 36 L180 58 L171 36 Z" fill="url(#bowoTitleGrad)" />
              <text
                x="180"
                y="88"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="24"
                fontWeight="800"
                letterSpacing="1.5"
              >
                BOWO: PENJAGA CAHAYA
              </text>
              <text x="180" y="106" textAnchor="middle" fill="#cbd5e1" fontSize="11" fontWeight="600" letterSpacing="2">
                MUNGIL ENGINE V7 · 3 CHAPTERS
              </text>
            </svg>

            <p className="mb-5 max-w-md text-xs leading-relaxed text-slate-200 sm:text-sm">
              3-level action-RPG powered by Zero-GC SoA ECS, 12 procedural art styles, and Itel A70 dynamic resolution scaling.
            </p>

            {/* Level Quick Picker */}
            <div className="mb-3 grid w-full max-w-sm grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setActiveLevel(lvl)}
                  className={`touch-btn rounded-xl border px-2 py-2 text-xs font-bold transition ${
                    activeLevel === lvl
                      ? 'border-emerald-400 bg-emerald-500 text-slate-950 shadow-md'
                      : 'border-white/15 bg-slate-900/80 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {tr.levelLabel} {lvl}
                </button>
              ))}
            </div>

            {/* Compact AI Play Mode Switcher (Solo / With AI / AI Plays) */}
            {setAiMode && (
              <div className="mb-4 grid w-full max-w-sm grid-cols-3 gap-2">
                {(
                  [
                    { id: 'off', label: 'Solo' },
                    { id: 'coop', label: 'With AI' },
                    { id: 'autopilot', label: 'AI Plays' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playSfx('ui_toggle');
                      setAiMode(m.id);
                    }}
                    className={`touch-btn rounded-xl border px-2 py-1.5 text-[11px] font-bold transition ${
                      aiMode === m.id
                        ? 'border-sky-400 bg-sky-500 text-slate-950 shadow'
                        : 'border-white/15 bg-slate-900/80 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex w-full max-w-sm flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                data-start="true"
                onClick={startGame}
                className="touch-btn flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-base font-extrabold text-slate-950 shadow-lg transition hover:bg-emerald-400 active:scale-95"
              >
                <Play className="h-5 w-5 fill-current" />
                <span>{tr.playGame}</span>
              </button>
              <button
                type="button"
                onClick={onOpenStudio}
                className="touch-btn flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-slate-900/90 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <Wrench className="h-4 w-4 text-sky-400" />
                <span>{tr.openStudio}</span>
              </button>
            </div>

            {latestSave?.exists && onLoadProgress && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playSfx('ui_click');
                  onLoadProgress(latestSave.id, true);
                }}
                className="touch-btn mt-2.5 flex w-full max-w-sm items-center justify-between gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500/15 px-3.5 py-2.5 text-left text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/25"
              >
                <span>{tr.continueSaved}</span>
                <span className="font-mono-num text-[11px] text-white">
                  {tr.levelLabel} {latestSave.level} · {latestSave.score} pts
                </span>
              </button>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {onBackToLanding && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSfx('ui_click');
                    onBackToLanding();
                  }}
                  className="touch-btn inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-900/75 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Home
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playSfx('ui_tab');
                  onOpenControls();
                }}
                className="touch-btn inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-900/75 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>{tr.controlsBtn}</span>
              </button>
              <PWAInstallButton label={tr.installApp} compact />
            </div>
          </div>

          {/* Flat Control Hint Line */}
          <div className="mx-auto max-w-xl text-center text-xs font-medium text-slate-300">{tr.titleHint}</div>
        </div>
      )}

      {/* IN-GAME HUD & CUSTOMIZABLE TOUCH CONTROLS */}
      {shellState === 'playing' && (
        <>
          {/* Top-Left Compact HUD Cluster (includes mobile objective line cleanly stacked below so it never overlaps) */}
          <div className="pointer-events-none absolute top-2.5 left-2.5 z-20 flex max-w-[172px] flex-col gap-1.5 sm:top-4 sm:left-4 sm:max-w-xs">
            <div className="rounded-xl border border-white/15 bg-slate-950/85 px-2.5 py-1.5 text-white shadow-md sm:px-3 sm:py-2">
              <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-bold sm:gap-3 sm:text-xs">
                <span>
                  {tr.levelLabel} {hud.level}/3
                </span>
                <span className="font-mono-num text-amber-300">
                  {tr.shardsLabel} {hud.shards}/{hud.requiredShards}
                </span>
                {hud.requiredSwitches > 0 && (
                  <span className="font-mono-num text-emerald-300">
                    {tr.switchesLabel} {hud.switchesActive}/{hud.requiredSwitches}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-5 text-[10px] font-bold text-rose-300 sm:w-8 sm:text-[11px]">{tr.hpLabel}</span>
                <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-800 sm:h-2.5 sm:w-36">
                  <div ref={hpBarRef} className="h-full bg-rose-500 transition-[width] duration-75" style={{ width: `${hud.hp}%` }} />
                </div>
                <span className="font-mono-num w-6 text-right text-[10px] font-bold sm:w-8 sm:text-[11px]">{hud.hp}</span>
              </div>

              <div className="mt-1 flex items-center gap-1.5 sm:gap-2">
                <span className="w-5 text-[10px] font-bold text-sky-300 sm:w-8 sm:text-[11px]">EN</span>
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-800 sm:h-2 sm:w-36">
                  <div ref={energyBarRef} className="h-full bg-sky-400 transition-[width] duration-75" style={{ width: `${hud.energy}%` }} />
                </div>
                <span className="font-mono-num w-6 text-right text-[10px] font-bold sm:w-8 sm:text-[11px]">{hud.energy}</span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-semibold text-slate-200 sm:mt-1.5 sm:gap-2.5 sm:text-[11px]">
                <span className="font-mono-num text-amber-300">
                  {tr.coinsLabel} {hud.coins}
                </span>
                <span className="opacity-40">·</span>
                <span className="font-mono-num">
                  {tr.scoreLabel} {hud.score}
                </span>
                {hud.simKind && hud.simKind !== 'platformer' && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="font-mono-num uppercase text-sky-300">{hud.simKind.replace('_', ' ')}</span>
                  </>
                )}
                {typeof hud.speedKmh === 'number' && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="font-mono-num text-cyan-300">{hud.speedKmh} km/h</span>
                  </>
                )}
                {typeof hud.lanternHp === 'number' && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="font-mono-num text-amber-200">Lentera {hud.lanternHp}%</span>
                  </>
                )}
                {hud.combo > 1 && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="font-mono-num text-emerald-300">{hud.combo}x</span>
                  </>
                )}
              </div>
              {physicsDebug && (
                <div className="font-mono-num mt-1 text-[9px] font-bold text-cyan-300 sm:text-[10px]">
                  DBG {physicsMode} · Calls {hud.drawCalls} · Culled {hud.culledCount ?? 0}
                </div>
              )}
              {aiMode !== 'off' && (
                <div data-testid="ai-hud-badge" className="font-mono-num mt-1 text-[9px] font-bold text-emerald-300 sm:text-[10px]">
                  {aiMode === 'autopilot' ? 'AI PILOT' : 'LUMA CO-OP'} · {hud.aiNote ?? '15Hz Active'}
                </div>
              )}
            </div>

            {/* Mobile Objective Line stacked directly below HUD (no overlap) */}
            <div className="rounded-lg bg-slate-950/75 px-2.5 py-1 text-[10px] font-medium leading-snug text-slate-200 sm:hidden">
              {hud.gateUnlocked ? tr.gateOpenMsg : hud.dialogue}
            </div>
          </div>

          {/* Boss Kala Top-Center Bar (Level 3 only when Boss active) */}
          {hud.bossActive && (
            <div className="pointer-events-none absolute top-32 left-1/2 z-20 w-52 -translate-x-1/2 rounded-xl border border-purple-400/35 bg-slate-950/85 px-3 py-1.5 text-center text-white sm:top-3 sm:w-72">
              <div className="flex items-center justify-between text-[11px] font-bold text-purple-200">
                <span>BOSS KALA · P{hud.bossPhase}</span>
                <span className="font-mono-num">
                  {hud.bossHp}/{hud.bossMaxHp}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  ref={bossBarRef}
                  className="h-full bg-purple-500 transition-[width] duration-75"
                  style={{ width: `${(hud.bossHp / hud.bossMaxHp) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Top-Right Compact Controls */}
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 sm:top-4 sm:right-4 sm:gap-1.5">
            <button
              type="button"
              aria-label="Toggle Mute"
              onClick={() => {
                const next = !muted;
                setMuted(next);
                soundEngine.setMuted(next);
              }}
              className="touch-btn flex items-center justify-center rounded-xl border border-white/15 bg-slate-950/80 px-2 text-white hover:bg-slate-900 sm:px-2.5"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              aria-label="Touch Controls"
              onClick={onOpenControls}
              className="touch-btn flex items-center justify-center rounded-xl border border-white/15 bg-slate-950/80 px-2 text-white hover:bg-slate-900 sm:px-2.5"
            >
              <Settings2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Open Engine Studio"
              onClick={() => {
                soundEngine.stopTracker();
                onOpenStudio();
              }}
              className="touch-btn flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-slate-950/80 px-2 text-xs font-bold text-sky-300 hover:bg-slate-900 sm:px-3"
            >
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Studio</span>
            </button>
            <button
              type="button"
              aria-label="Pause Game"
              onClick={() => {
                soundEngine.stopTracker();
                setShellState('paused');
              }}
              className="touch-btn flex items-center justify-center rounded-xl border border-white/15 bg-slate-950/80 px-2 text-white hover:bg-slate-900 sm:px-3"
            >
              <Pause className="h-4 w-4" />
            </button>
          </div>

          {/* Desktop Subtle Objective Line */}
          <div
            className={`pointer-events-none hidden sm:block absolute left-1/2 z-10 max-w-xs -translate-x-1/2 rounded-lg bg-slate-950/75 px-2.5 py-1 text-center text-[11px] font-medium text-slate-200 ${
              hud.bossActive ? 'top-16' : 'top-4'
            }`}
          >
            {hud.gateUnlocked ? tr.gateOpenMsg : hud.dialogue}
          </div>

          {/* VISUAL NOVEL INTERACTIVE DIALOGUE & CHOICES PANEL */}
          {hud.simKind === 'visual_novel' ? (
            <div className="absolute inset-x-3 bottom-4 z-20 mx-auto max-w-xl rounded-2xl border border-white/20 bg-slate-950/90 p-4 text-white shadow-2xl">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">
                Visual Novel · Story Stage
              </div>
              <p className="text-sm font-semibold leading-snug text-slate-100">{hud.vnPrompt ?? hud.dialogue}</p>
              {hud.vnChoices && hud.vnChoices.length > 0 && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  {hud.vnChoices.map((choiceLabel, idx) => (
                    <button
                      key={choiceLabel}
                      type="button"
                      onClick={() => {
                        const w = worldRefExternal.current;
                        if (!w) return;
                        if (selectVisualNovelChoice(w, idx)) {
                          soundEngine.playSfx('shard');
                          triggerHaptic(12);
                          onHudChange(
                            toHudSnapshot(w, {
                              fps: hud.fps,
                              resolutionScale: hud.resolutionScale,
                              drawCalls: hud.drawCalls,
                              culledCount: hud.culledCount,
                              powerSaveActive: hud.powerSaveActive,
                            })
                          );
                        }
                      }}
                      className="touch-btn flex-1 rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-3 py-2 text-left text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/35"
                    >
                      {choiceLabel}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* CUSTOMIZABLE TOUCH CONTROLS */
            <div
              className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex items-end justify-between px-3 sm:bottom-5 sm:px-6"
              style={{ opacity: touchConfig.opacity / 100 }}
            >
              {/* Virtual Thumbstick */}
              <div
                className={`pointer-events-auto relative flex items-center justify-center rounded-full border-2 border-white/30 bg-slate-950/55 touch-none ${
                  touchConfig.joystickSide === 'right' ? 'order-2' : 'order-1'
                }`}
                style={{
                  width: joySize,
                  height: joySize,
                  marginLeft: touchConfig.joystickSide === 'left' ? touchConfig.joystickOffsetX : 0,
                  marginRight: touchConfig.joystickSide === 'right' ? touchConfig.joystickOffsetX : 0,
                }}
                onPointerDown={handleJoystickPointerDown}
                onPointerMove={handleJoystickPointerMove}
                onPointerUp={handleJoystickPointerUp}
                onPointerCancel={handleJoystickPointerUp}
              >
                <div
                  ref={joyKnobRef}
                  className="pointer-events-none h-11 w-11 rounded-full border border-white/40 bg-emerald-400/80 shadow-md"
                />
              </div>

              {/* Action Cluster (>= 44px hitboxes) */}
              <div
                className={`pointer-events-auto flex flex-col items-end gap-2 ${
                  touchConfig.joystickSide === 'right' ? 'order-1 items-start' : 'order-2 items-end'
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onPointerDown={() => {
                      pendingActionsRef.current.burst = true;
                      triggerHaptic(18);
                    }}
                    className="flex items-center justify-center rounded-full border border-amber-300/60 bg-amber-500/85 text-xs font-extrabold text-slate-950 shadow active:scale-95"
                    style={{ width: btnSize, height: btnSize }}
                  >
                    {touchConfig.showLabels ? tr.actions.burst : 'L'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDrinkPotion}
                    className="flex items-center justify-center rounded-full border border-emerald-300/60 bg-emerald-600/85 text-xs font-extrabold text-white shadow active:scale-95"
                    style={{ width: btnSize, height: btnSize }}
                  >
                    +{hud.potions}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onPointerDown={() => {
                      pendingActionsRef.current.dash = true;
                      triggerHaptic(12);
                    }}
                    className="flex items-center justify-center rounded-full border border-sky-300/60 bg-sky-500/85 text-xs font-extrabold text-slate-950 shadow active:scale-95"
                    style={{ width: btnSize, height: btnSize }}
                  >
                    {touchConfig.showLabels ? tr.actions.dash : 'K'}
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => {
                      pendingActionsRef.current.attack = true;
                      triggerHaptic(10);
                    }}
                    className="flex items-center justify-center rounded-full border border-rose-300/60 bg-rose-500/90 text-xs font-extrabold text-white shadow active:scale-95"
                    style={{ width: btnSize + 6, height: btnSize + 6 }}
                  >
                    {touchConfig.showLabels ? tr.actions.attack : 'J'}
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => {
                      pendingActionsRef.current.jump = true;
                      pendingActionsRef.current.jumpHeld = true;
                      triggerHaptic(8);
                    }}
                    onPointerUp={() => {
                      pendingActionsRef.current.jumpHeld = false;
                    }}
                    onPointerCancel={() => {
                      pendingActionsRef.current.jumpHeld = false;
                    }}
                    className="flex items-center justify-center rounded-full border border-emerald-200/70 bg-emerald-400/90 text-xs font-extrabold text-slate-950 shadow active:scale-95"
                    style={{ width: btnSize + 4, height: btnSize + 4 }}
                  >
                    {touchConfig.showLabels ? tr.actions.jump : 'A'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* PAUSED / VICTORY / GAMEOVER MODALS (No backdrop-blur over canvas) */}
      {(shellState === 'paused' || shellState === 'victory' || shellState === 'gameover') && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-900 p-6 text-center text-white shadow-2xl">
            <h2 className="text-xl font-extrabold">
              {shellState === 'paused'
                ? tr.pausedTitle
                : shellState === 'victory'
                  ? tr.victoryTitle
                  : tr.gameOverTitle}
            </h2>
            <p className="mt-1.5 text-xs text-slate-300">
              {tr.levelLabel} {hud.level} · {tr.scoreLabel} <span className="font-mono-num font-bold text-amber-300">{hud.score}</span> ·{' '}
              {tr.coinsLabel} <span className="font-mono-num font-bold">{hud.coins}</span>
            </p>

            <div className="mt-5 flex flex-col gap-2.5">
              {shellState === 'paused' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShellState('playing');
                      soundEngine.startTracker(activeLevel);
                    }}
                    className="touch-btn flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-emerald-400"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>{tr.resumeGame}</span>
                  </button>

                  {setAiMode && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'off', label: 'Solo' },
                          { id: 'coop', label: 'With AI' },
                          { id: 'autopilot', label: 'AI Plays' },
                        ] as const
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playSfx('ui_toggle');
                            setAiMode(m.id);
                          }}
                          className={`touch-btn rounded-lg border px-2 py-1.5 text-[11px] font-bold ${
                            aiMode === m.id
                              ? 'border-sky-400 bg-sky-500 text-slate-950'
                              : 'border-white/15 bg-slate-800 text-slate-200'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {onSaveProgress && onLoadProgress && (() => {
                    void saveRevision;
                    const slotRows = listSaveSlots();
                    return (
                      <div className="rounded-xl border border-white/10 bg-slate-950/70 p-2.5 text-left">
                        <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-300">
                          <span>{tr.quickSaveLabel}</span>
                          <span className="font-mono-num text-[10px] text-slate-400">FNV-1a &lt;1 KB</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {([1, 2, 3] as const).map((s) => {
                            const info = slotRows.find((r) => r.id === s);
                            return (
                              <div key={s} className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const res = onSaveProgress(s);
                                    soundEngine.playSfx('ui_click');
                                    if (pauseStatusRef.current) {
                                      pauseStatusRef.current.textContent = res.ok
                                        ? `${tr.savedNotice} ${tr.slotLabel} ${s} · ${res.bytes} B`
                                        : 'Storage full';
                                    }
                                  }}
                                  className="touch-btn rounded-lg bg-sky-500/20 px-2 py-1.5 text-[11px] font-bold text-sky-200 hover:bg-sky-500/35"
                                >
                                  {tr.saveProgress} {s}
                                </button>
                                <button
                                  type="button"
                                  disabled={!info?.exists}
                                  onClick={() => {
                                    const res = onLoadProgress(s, true);
                                    soundEngine.playSfx('ui_click');
                                    if (!res.ok && pauseStatusRef.current) {
                                      pauseStatusRef.current.textContent = `${tr.slotLabel} ${s} ${tr.emptySlotLabel}`;
                                    }
                                  }}
                                  className="touch-btn rounded-lg border border-white/15 bg-slate-800/80 px-2 py-1.5 text-[11px] font-semibold text-slate-200 disabled:opacity-40"
                                >
                                  {info?.exists ? `${tr.loadProgress} L${info.level}` : tr.emptySlotLabel}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        {slotRows.find((r) => r.id === 'auto')?.exists && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playSfx('ui_click');
                              onLoadProgress('auto', true);
                            }}
                            className="touch-btn mt-1.5 w-full rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/25"
                          >
                            {tr.loadProgress} {tr.autoSaveLabel} (L{slotRows.find((r) => r.id === 'auto')?.level} ·{' '}
                            {slotRows.find((r) => r.id === 'auto')?.score} pts)
                          </button>
                        )}
                        <div ref={pauseStatusRef} className="mt-1.5 text-center text-[11px] font-semibold text-emerald-300" />
                      </div>
                    );
                  })()}
                </>
              )}

              <button
                type="button"
                onClick={restartCurrentLevel}
                className="touch-btn flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{tr.retryLevel}</span>
              </button>

              <button
                type="button"
                onClick={onOpenStudio}
                className="touch-btn flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-800 px-4 py-2.5 text-sm font-bold text-sky-300 hover:bg-slate-700"
              >
                <Wrench className="h-4 w-4" />
                <span>{tr.openStudio}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.stopTracker();
                  setShellState('title');
                }}
                className="touch-btn rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                {tr.backToTitle}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Pure Canvas 2D scene renderer supporting 2D, 2.5D Fake Depth, and 3D Wireframe modes,
 * authentic genre arenas, full screen-space culling for Itel A70, and live Physics Debug bounds.
 */
function renderGameScene(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  world: GameWorld,
  particles: ParticlePool,
  style: ReturnType<typeof getStyleSpec>,
  opts: {
    renderMode: RenderMode;
    physicsMode: PhysicsMode;
    gravityMul: number;
    physicsDebug: boolean;
    weather: WeatherKind;
    overrides: StyleOverrides;
    reduceShake: boolean;
    powerSaveActive: boolean;
    timeFallback: number;
    customCharacter?: GeneratedCharacterSpec | null;
    aiCompanion?: AiCompanionState;
    aiMode?: AiPlayMode;
    perspectiveConnector?: PerspectiveConnectorId;
    cameraPreset?: Camera3DPresetId;
    hybridMode?: HybridRender5Mode;
    visualQuality?: VisualQualityPresetId;
  }
): { drawCalls: number; culledCount: number } {
  let drawCalls = 0;
  let culledCount = 0;
  const def = LEVEL_DEFINITIONS[world.level];
  const p = style.palette;
  const sim = world.simKind;
  const isFree2D = sim === 'topdown' || sim === 'shooter';

  // Zero-GC QolbuSpace3D sync (1 unit = 1 meter -> 40px = 1m)
  GAME_SPACE_3D.camera.preset = opts.cameraPreset ?? 'follow_3_4';
  GAME_SPACE_3D.setEntity(0, world.player.x / 40, (def.groundY - world.player.y) / 40, 0);
  GAME_SPACE_3D.rebaseIfNeeded(world.player.x / 40, 0);
  GAME_SPACE_3D.updateAll(cw, ch);

  // On portrait mobile, fit >= 370 world units horizontally and align ground near bottom so players see enemies & platforms ahead
  const isPortrait = cw < ch;
  const scale = isPortrait ? Math.min(ch / def.height, cw / 370) : ch / def.height;
  const viewW = cw / scale;
  const worldOffsetY = isPortrait ? Math.max(0, ch / scale - def.height) : 0;
  const tNow = world.time > 0 ? world.time : opts.timeFallback;

  // Sky / Cosmos / Top-Down Backdrop
  if ((style.id === 'raycast' || opts.hybridMode === 'raycast_pseudo3d') && sim !== 'topdown' && sim !== 'shooter') {
    drawCalls += renderRaycastCorridor(ctx, cw, ch, world.cameraX, style);
  } else {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, ch);
    if (sim === 'shooter') {
      skyGrad.addColorStop(0, '#040814');
      skyGrad.addColorStop(1, '#141e3a');
    } else if (sim === 'topdown') {
      skyGrad.addColorStop(0, world.level === 3 ? '#18102b' : '#11221e');
      skyGrad.addColorStop(1, world.level === 3 ? '#261a3f' : '#19352f');
    } else {
      skyGrad.addColorStop(0, world.level === 3 ? '#0a0714' : world.level === 2 ? '#122038' : p[0]);
      skyGrad.addColorStop(1, world.level === 3 ? '#1e1133' : world.level === 2 ? '#234263' : p[1]);
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, cw, ch);
    drawCalls += 1;
  }

  ctx.save();
  ctx.scale(scale, scale);
  if (worldOffsetY > 0 && sim !== 'topdown' && sim !== 'shooter') {
    ctx.translate(0, worldOffsetY * (sim === 'visual_novel' ? 0.36 : 0.72));
  }

  // Camera shake (trauma^2)
  if (!opts.reduceShake && world.shakeTrauma > 0) {
    const mag = world.shakeTrauma * world.shakeTrauma * 10;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }

  const camX = world.cameraX;
  const vp: ViewportBounds = { left: camX, right: camX + viewW, top: 0, bottom: def.height };

  if (sim === 'shooter') {
    // Parallax starfield culled cleanly inside viewW
    ctx.fillStyle = 'rgba(224,242,254,0.65)';
    for (let i = 0; i < 24; i++) {
      const sx = ((i * 89 - camX * (i % 3 === 0 ? 0.35 : 0.15) + tNow * -28) % viewW + viewW) % viewW;
      const sy = (i * 53) % def.height;
      ctx.fillRect(sx, sy, i % 4 === 0 ? 2.5 : 1.5, i % 4 === 0 ? 2.5 : 1.5);
    }
    drawCalls += 1;
  } else if (sim !== 'topdown') {
    // Sun / Moon / Neon Core
    ctx.fillStyle = world.level === 3 ? '#c084fc' : style.lightColor;
    ctx.beginPath();
    ctx.arc(viewW * 0.82, 68, 24, 0, Math.PI * 2);
    ctx.fill();
    drawCalls += 1;

    // 2.5D Parallax Distant Hills + Mode-7 Perspective Horizon
    const parallaxFactor = opts.renderMode === '2.5D' || opts.renderMode === '3D Ringan' ? 0.35 : 0.2;
    ctx.fillStyle = world.level === 3 ? 'rgba(88,28,135,0.28)' : 'rgba(15,23,42,0.18)';
    ctx.beginPath();
    ctx.moveTo(0, def.groundY);
    for (let hx = -120; hx <= viewW + 180; hx += 120) {
      const peak = 230 + Math.sin((hx + camX * parallaxFactor) * 0.015) * 44;
      ctx.lineTo(hx - ((camX * parallaxFactor) % 120), peak);
    }
    ctx.lineTo(viewW + 180, def.groundY);
    ctx.closePath();
    ctx.fill();
    drawCalls += 1;

    if (opts.renderMode === '2.5D' || opts.renderMode === '3D Ringan' || opts.hybridMode === 'mode7_voxel') {
      drawCalls += renderMode7Horizon(ctx, viewW, def.groundY - 26, def.groundY, camX, style, world.level);
    }
  }

  // World Space Transform
  ctx.save();
  ctx.translate(-camX, 0);

  if (sim === 'topdown') {
    // Top-Down Dungeon / Sanctuary Floor Grid (covers full visible viewport height on portrait mobile too)
    const tile = 48;
    const startCol = Math.max(0, Math.floor(camX / tile));
    const endCol = Math.min(Math.ceil(def.width / tile), Math.ceil((camX + viewW) / tile));
    const maxRow = Math.max(9, Math.ceil(ch / scale / tile));
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let c = startCol; c <= endCol; c++) {
      for (let r = 0; r <= maxRow; r++) {
        const inArena = r >= 1 && r < 9;
        ctx.fillStyle = inArena
          ? (c + r) % 2 === 0
            ? 'rgba(255,255,255,0.035)'
            : 'rgba(0,0,0,0.09)'
          : (c + r) % 2 === 0
            ? 'rgba(255,255,255,0.014)'
            : 'rgba(0,0,0,0.16)';
        ctx.fillRect(c * tile, r * tile, tile - 1, tile - 1);
      }
    }
    ctx.strokeStyle = 'rgba(56,189,248,0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, tile, def.width, tile * 8);
    drawCalls += 1;

    // Solid Dungeon Stone Pillars (culled)
    for (const obs of world.obstacles) {
      if (!isRectInViewport(obs.x, obs.y, obs.w, obs.h, vp, 32)) {
        culledCount += 1;
        continue;
      }
      ctx.fillStyle = p[3];
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.fillStyle = p[2];
      ctx.fillRect(obs.x + 4, obs.y + 4, obs.w - 8, obs.h - 14);
      ctx.strokeStyle = p[8];
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      drawCalls += 1;
    }
  } else if (sim !== 'shooter') {
    // Screen-Space Ground Slice Clamping (skips off-screen width for Itel A70)
    const groundFillH = Math.max(def.height - def.groundY, ch / scale - def.groundY + 40);
    const gx0 = Math.max(0, Math.floor(camX) - 8);
    const gx1 = Math.min(def.width, Math.ceil(camX + viewW) + 8);
    if (gx1 > gx0) {
      drawGroundTile(ctx, gx0, def.groundY, gx1 - gx0, groundFillH, style, world.level);
      drawCalls += 1;
    } else {
      culledCount += 1;
    }
  }

  // Genre-specific Arena Overlays (Runner Highway / Rhythm Beat Tracks / Defense Lantern & Turrets)
  if (sim === 'runner') {
    for (let ln = 0; ln < 3; ln++) {
      const ly = 215 + ln * 68;
      ctx.fillStyle = 'rgba(15,23,42,0.48)';
      ctx.fillRect(camX, ly - 18, viewW, 36);
      ctx.strokeStyle = ln === world.lane ? '#38bdf8' : 'rgba(255,255,255,0.22)';
      ctx.lineWidth = ln === world.lane ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(camX, ly + 18);
      ctx.lineTo(camX + viewW, ly + 18);
      ctx.stroke();
    }
    drawCalls += 1;
    for (const note of world.beatNotes) {
      if (note.hit) continue;
      const ny = 215 + note.lane * 68;
      if (!isCircleInViewport(note.x, ny, 14, vp, 24)) {
        culledCount += 1;
        continue;
      }
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(note.x - 10, ny - 10);
      ctx.lineTo(note.x + 12, ny);
      ctx.lineTo(note.x - 10, ny + 10);
      ctx.closePath();
      ctx.fill();
      drawCalls += 1;
    }
  } else if (sim === 'rhythm') {
    for (let ln = 0; ln < 3; ln++) {
      const ly = 215 + ln * 68;
      ctx.fillStyle = ln === world.lane ? 'rgba(56,189,248,0.18)' : 'rgba(15,23,42,0.45)';
      ctx.fillRect(camX, ly - 18, viewW, 36);
      ctx.strokeStyle = ln === world.lane ? '#38bdf8' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(camX, ly - 18, viewW, 36);
    }
    const strikeX = world.player.x + 28;
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(strikeX, 185);
    ctx.lineTo(strikeX, 380);
    ctx.stroke();
    drawCalls += 2;

    for (const note of world.beatNotes) {
      if (note.hit) continue;
      const ny = 215 + note.lane * 68;
      if (!isCircleInViewport(note.x, ny, 16, vp, 24)) {
        culledCount += 1;
        continue;
      }
      ctx.fillStyle = note.lane === 0 ? '#f43f5e' : note.lane === 1 ? '#38bdf8' : '#4ade80';
      ctx.beginPath();
      ctx.arc(note.x, ny, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      drawCalls += 1;
    }
  } else if (sim === 'defense') {
    if (isRectInViewport(90, def.groundY - 64, 42, 64, vp, 40)) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(98, def.groundY - 46, 24, 46);
      ctx.fillStyle = world.lanternHp > 35 ? '#fde047' : '#f87171';
      ctx.beginPath();
      ctx.arc(110, def.groundY - 54, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(88, def.groundY - 78, 44, 6);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(88, def.groundY - 78, Math.max(0, (world.lanternHp / world.lanternMaxHp) * 44), 6);
      drawCalls += 1;
    } else {
      culledCount += 1;
    }
    for (const trt of world.turrets) {
      if (!isCircleInViewport(trt.x, trt.y, 18, vp, 30)) {
        culledCount += 1;
        continue;
      }
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(trt.x - 10, trt.y - 6, 20, 26);
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(trt.x, trt.y - 10, 8, 0, Math.PI * 2);
      ctx.fill();
      drawCalls += 1;
    }
  }

  // Platforms (Side-scroll & Arena genres only, strictly culled)
  if (!isFree2D && sim !== 'runner' && sim !== 'rhythm') {
    for (const plat of def.platforms) {
      if (!isRectInViewport(plat.x, plat.y, plat.w, plat.h, vp, 32)) {
        culledCount += 1;
        continue;
      }
      drawGroundTile(ctx, plat.x, plat.y, plat.w, plat.h, style, world.level);
      drawCalls += 1;
    }
  }

  // Environment Trees & Rocks (Culled cleanly)
  if (!isFree2D && sim !== 'rhythm') {
    for (const tree of def.trees) {
      if (!isRectInViewport(tree.x - 36, tree.y - 96, 72, 96, vp, 40)) {
        culledCount += 1;
        continue;
      }
      drawTreeAsset(ctx, tree.x, tree.y, tree.scale, style);
      drawCalls += 1;
    }
    for (const rock of def.rocks) {
      if (!isRectInViewport(rock.x - 28, rock.y - 36, 56, 36, vp, 32)) {
        culledCount += 1;
        continue;
      }
      drawRockAsset(ctx, rock.x, rock.y, rock.scale, style);
      drawCalls += 1;
    }
  }

  // Floor Switches (Culled)
  if (sim !== 'shooter' && sim !== 'runner' && sim !== 'rhythm') {
    for (const sw of world.switches) {
      if (!isRectInViewport(sw.x - 16, sw.y, 32, 12, vp, 24)) {
        culledCount += 1;
        continue;
      }
      ctx.fillStyle = sw.active ? '#22c55e' : '#f97316';
      ctx.fillRect(sw.x - 16, sw.y, 32, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sw.x - 10, sw.y + 3, 20, 4);
      drawCalls += 1;
    }
  }

  // Exit Gate (Culled)
  if (isRectInViewport(def.gate.x, def.gate.y, def.gate.w, def.gate.h, vp, 48)) {
    drawGateAsset(ctx, def.gate.x, def.gate.y, def.gate.w, def.gate.h, world.gateUnlocked, style, tNow);
    drawCalls += 1;
  } else {
    culledCount += 1;
  }

  // Coins (Culled via isCircleInViewport)
  for (const c of world.coins) {
    if (c.collected) continue;
    if (!isCircleInViewport(c.x, c.y, 10, vp, 24)) {
      culledCount += 1;
      continue;
    }
    const bob = Math.sin(tNow * 5 + c.id) * 3;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(c.x, c.y + bob, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawCalls += 1;
  }

  // Light Shards (Culled via isCircleInViewport)
  for (const sh of world.shards) {
    if (sh.collected) continue;
    if (!isCircleInViewport(sh.x, sh.y, 16, vp, 28)) {
      culledCount += 1;
      continue;
    }
    const bob = Math.sin(tNow * 4 + sh.id) * 5;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(sh.x, sh.y - 14 + bob);
    ctx.lineTo(sh.x + 10, sh.y + bob);
    ctx.lineTo(sh.x, sh.y + 14 + bob);
    ctx.lineTo(sh.x - 10, sh.y + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawCalls += 1;
  }

  // Enemies (Culled via isCircleInViewport)
  for (const e of world.enemies) {
    if (e.dead) continue;
    if (!isCircleInViewport(e.x, e.y, e.r + 12, vp, 56)) {
      culledCount += 1;
      continue;
    }
    drawEnemyEntity(ctx, e.archetype, e.x, e.y, e.r, style, {
      time: tNow,
      flash: e.flash,
      telegraphRatio: e.telegraphTimer > 0 ? e.telegraphTimer / e.telegraphMax : 0,
      koProgress: e.koTimer > 0 ? Math.min(1, e.koTimer / 0.35) : 0,
      bossPhase: e.bossPhase,
    });
    drawCalls += 1;
  }

  // Projectiles (Culled via isCircleInViewport)
  for (const pr of world.projectiles) {
    if (!isCircleInViewport(pr.x, pr.y, pr.r + 4, vp, 24)) {
      culledCount += 1;
      continue;
    }
    ctx.fillStyle = pr.fromPlayer ? '#38bdf8' : '#f43f5e';
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
    ctx.fill();
    drawCalls += 1;
  }

  // Bowo Player (8-state table-driven FSM + 2-bone damped cloak spring)
  const pl = world.player;
  const pose: CharacterAnimState = world.playerPose ?? (
    pl.koTimer > 0
      ? 'ko'
      : pl.flash > 0.08
        ? 'hurt'
        : pl.dashTimer > 0
          ? 'dash'
          : pl.attackTimer > 0
            ? 'attack'
            : !pl.grounded
              ? pl.vy > 45
                ? 'fall'
                : 'jump'
              : Math.abs(pl.vx) > 20
                ? 'walk'
                : 'idle'
  );

  if (sim === 'collector') {
    ctx.strokeStyle = 'rgba(250,204,21,0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(pl.x, pl.y, world.magnetRadius + world.kills * 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    drawCalls += 1;
  }

  drawBowoCharacter(ctx, pl.x, pl.y, 26, style, {
    pose,
    facing: pl.facing,
    time: tNow,
    squashX: pl.squashX,
    squashY: pl.squashY,
    flash: pl.flash,
    comboStep: pl.comboCount,
    rig3d: opts.renderMode === '3D Ringan' || opts.customCharacter?.dimension === '3D-Stack',
    spring: world.cloakSpring,
    customChar: opts.customCharacter ?? undefined,
    overrides: opts.overrides,
  });
  drawCalls += 1;

  // Danmaku Bullet-Hell 6px Core Hurtbox Ring
  if (sim === 'shooter' && world.genreId === 'bullet_hell') {
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(pl.x, pl.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawCalls += 1;
  }

  // Survival Top-Down Lantern Spotlight Vignette
  if (sim === 'topdown' && world.genreId === 'survival') {
    const grad = ctx.createRadialGradient(pl.x, pl.y, 65, pl.x, pl.y, 240);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(2,6,23,0.72)');
    ctx.fillStyle = grad;
    ctx.fillRect(camX, 0, viewW, def.height);
    drawCalls += 1;
  }

  // Lightweight 3D Wireframe Cube Overlay when RenderMode === '3D Ringan'
  if (opts.renderMode === '3D Ringan') {
    const cx = pl.x;
    const cy = pl.y - 52;
    const ang = tNow * 1.8;
    const r = 14;
    ctx.strokeStyle = p[6];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const x1 = cx + Math.cos(ang) * r;
    const x2 = cx - Math.cos(ang) * r;
    ctx.rect(Math.min(x1, x2), cy - r * 0.7, Math.abs(x1 - x2) + 8, r * 1.4);
    ctx.stroke();
    drawCalls += 1;
  }

  // Luma AI Companion / Autopilot Drone Sprite (15Hz Co-Op & Auto-Play)
  if (opts.aiCompanion?.active && opts.aiMode !== 'off') {
    const lx = opts.aiCompanion.x;
    const ly = opts.aiCompanion.y;
    ctx.fillStyle = opts.aiMode === 'autopilot' ? 'rgba(168,85,247,0.28)' : 'rgba(56,189,248,0.28)';
    ctx.beginPath();
    ctx.arc(lx, ly, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = opts.aiMode === 'autopilot' ? '#c084fc' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(lx, ly, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e0f2fe';
    ctx.fillText(opts.aiMode === 'autopilot' ? 'AI PILOT' : 'LUMA AI', lx, ly - 14);
    drawCalls += 1;
  }

  // Perspective Connector Visual Guides (Isometric / Hexagonal / FPS Reticle)
  if (opts.perspectiveConnector === 'isometric') {
    ctx.strokeStyle = 'rgba(56,189,248,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gStart = Math.floor(camX / 64) * 64;
    for (let gx = gStart; gx < camX + viewW + 96; gx += 64) {
      ctx.moveTo(gx, def.groundY);
      ctx.lineTo(gx + 48, def.groundY + 24);
      ctx.moveTo(gx + 48, def.groundY);
      ctx.lineTo(gx, def.groundY + 24);
    }
    ctx.stroke();
    drawCalls += 1;
  } else if (opts.perspectiveConnector === 'hexagonal') {
    ctx.strokeStyle = 'rgba(74,222,128,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const hexStart = Math.floor(camX / 54) * 54 + 27;
    for (let hx = hexStart; hx < camX + viewW + 30; hx += 54) {
      const hy = def.groundY + 14;
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k;
        const px = hx + 16 * Math.cos(a);
        const py = hy + 9 * Math.sin(a);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
    ctx.stroke();
    drawCalls += 1;
  } else if (opts.perspectiveConnector === 'first_person') {
    const cx = camX + viewW * 0.5;
    const cy = def.height * 0.44;
    ctx.strokeStyle = 'rgba(56,189,248,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.moveTo(cx - 18, cy);
    ctx.lineTo(cx - 6, cy);
    ctx.moveTo(cx + 6, cy);
    ctx.lineTo(cx + 18, cy);
    ctx.stroke();
    drawCalls += 1;
  }

  // Pooled Particles (Culled via isPointInViewport)
  for (let i = 0; i < particles.capacity; i++) {
    if (particles.active[i] === 0) continue;
    if (!isPointInViewport(particles.x[i], particles.y[i], vp, 16)) {
      culledCount += 1;
      continue;
    }
    ctx.globalAlpha = Math.max(0, particles.life[i] / particles.maxLife[i]);
    ctx.fillStyle = particles.colorIndex[i] === 1 ? '#38bdf8' : '#facc15';
    ctx.fillRect(particles.x[i], particles.y[i], particles.size[i], particles.size[i]);
  }
  ctx.globalAlpha = 1;

  // Floating Combat Text (Culled via isPointInViewport)
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const ft of world.floatingTexts) {
    if (!isPointInViewport(ft.x, ft.y, vp, 48)) {
      culledCount += 1;
      continue;
    }
    ctx.globalAlpha = Math.min(1, ft.life * 1.5);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;

  // PHYSICS DEBUG OVERLAY (Hitboxes, One-Way Snap Lips, Obstacles, Vectors — Culled to Viewport)
  if (opts.physicsDebug) {
    const effectiveGravity =
      isFree2D || sim === 'runner' || sim === 'rhythm'
        ? 0
        : Math.round(
            (opts.physicsMode === 'Zero-G' ? 280 : opts.physicsMode === 'Realistis' ? 980 : 880) * opts.gravityMul
          );

    // Visible ground floor collision line
    if (!isFree2D) {
      const gxStart = Math.max(0, camX);
      const gxEnd = Math.min(def.width, camX + viewW);
      if (gxEnd > gxStart) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gxStart, def.groundY);
        ctx.lineTo(gxEnd, def.groundY);
        ctx.stroke();
      }
    }

    // One-way platform bounds + top 8px landing catch lip
    if (!isFree2D && sim !== 'runner' && sim !== 'rhythm') {
      for (const plat of def.platforms) {
        if (!isRectInViewport(plat.x, plat.y, plat.w, plat.h, vp, 32)) continue;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.25;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = 'rgba(74,222,128,0.45)';
        ctx.fillRect(plat.x, plat.y, plat.w, 8);
      }
    }

    // Top-down solid obstacles AABB
    for (const obs of world.obstacles) {
      if (!isRectInViewport(obs.x, obs.y, obs.w, obs.h, vp, 32)) continue;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
    }

    // Enemies: hitbox circle + contact radius + patrol rail
    const hitCoreRadius = sim === 'shooter' && world.genreId === 'bullet_hell' ? 6 : 16;
    for (const e of world.enemies) {
      if (e.dead || !isCircleInViewport(e.x, e.y, e.r + 24, vp, 56)) continue;
      ctx.strokeStyle = 'rgba(244,63,94,0.45)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(e.patrolMinX, e.y);
      ctx.lineTo(e.patrolMaxX, e.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + hitCoreRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Projectiles hit circles
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1;
    for (const pr of world.projectiles) {
      if (!isCircleInViewport(pr.x, pr.y, pr.r + 4, vp, 24)) continue;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r + 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Player AABB + landing foot strip + velocity vector + mode tag
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(pl.x - pl.w * 0.5, pl.y - pl.h * 0.5, pl.w, pl.h);
    ctx.fillStyle = pl.grounded ? '#4ade80' : '#facc15';
    ctx.fillRect(pl.x - pl.w * 0.35, pl.y + pl.h * 0.5 - 3, pl.w * 0.7, 3);

    // Melee reach debug box when attacking
    if (pl.attackTimer > 0 && sim !== 'shooter' && sim !== 'rhythm') {
      const reachX = pl.x + pl.facing * 32;
      ctx.strokeStyle = '#f43f5e';
      ctx.strokeRect(reachX - 34, pl.y - 32, 68, 64);
    }

    // Velocity vector line
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pl.x, pl.y);
    ctx.lineTo(pl.x + pl.vx * 0.16, pl.y + pl.vy * 0.16);
    ctx.stroke();

    // Floating physics mode & culling readout right above player (clamped inside viewport edges)
    const modeTag =
      sim === 'topdown'
        ? 'TOP-XY'
        : sim === 'shooter'
          ? 'FLIGHT'
          : sim === 'runner' || sim === 'rhythm'
            ? `LANE-${world.lane + 1}`
            : pl.grounded
              ? 'GND'
              : 'AIR';
    const dbgText = `${opts.physicsMode} G=${effectiveGravity} ${modeTag} ${opts.cameraPreset ?? 'follow_3_4'} Culled=${culledCount}`;
    const dbgX = Math.max(camX + 96, Math.min(camX + viewW - 96, pl.x));
    const dbgY = Math.max(22, pl.y - pl.h * 0.5 - 10);
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#22d3ee';
    ctx.fillText(dbgText, dbgX, dbgY);
    drawCalls += 1;
  }

  ctx.restore(); // end camera translate

  // Weather Particles (capped low on eco/power save)
  if (opts.weather !== 'Cerah') {
    const dropCount = opts.powerSaveActive ? 14 : 28;
    ctx.strokeStyle = opts.weather === 'Hujan' ? 'rgba(147,197,253,0.45)' : 'rgba(255,255,255,0.65)';
    ctx.lineWidth = opts.weather === 'Hujan' ? 1.2 : 2;
    ctx.beginPath();
    for (let i = 0; i < dropCount; i++) {
      const rx = ((i * 73 + tNow * 190) % viewW);
      const ry = ((i * 47 + tNow * (opts.weather === 'Hujan' ? 320 : 90)) % def.height);
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - (opts.weather === 'Hujan' ? 4 : 1), ry + (opts.weather === 'Hujan' ? 10 : 3));
    }
    ctx.stroke();
    drawCalls += 1;
  }

  ctx.restore(); // end scale

  // Optional Retro Scanline
  if (opts.overrides.scanline || style.id === 'retro') {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let sy = 0; sy < ch; sy += 4) {
      ctx.fillRect(0, sy, cw, 1);
    }
    drawCalls += 1;
  }

  return { drawCalls, culledCount };
}
