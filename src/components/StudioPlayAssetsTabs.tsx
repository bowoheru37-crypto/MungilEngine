import { Play, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
import { ASSET_CATALOG, GENRE_TEMPLATES } from '../engine/catalogs';
import { getHeapMb } from '../engine/deviceProfiler';
import { LEVEL_DEFINITIONS } from '../engine/gameSimulation';
import { createEmptyGrid, savePixelGrid, saveTilemap } from '../engine/storage';
import type {
  ArtStyleId,
  CharacterAnimState,
  DeviceProfile,
  DeviceTierId,
  GenreTemplate,
  HudSnapshot,
  PhysicsMode,
  RenderMode,
  StyleOverrides,
  WeatherKind,
} from '../engine/types';

interface StudioPlayTabProps {
  gameName: string;
  setGameName: (v: string) => void;
  activeLevel: 1 | 2 | 3;
  setActiveLevel: (lvl: 1 | 2 | 3) => void;
  requestedTier: DeviceTierId;
  onChangeTier: (tier: DeviceTierId) => void;
  powerSaveAuto: boolean;
  onChangePowerSaveAuto: (v: boolean) => void;
  deviceProfile: DeviceProfile;
  renderMode: RenderMode;
  setRenderMode: (m: RenderMode) => void;
  physicsMode: PhysicsMode;
  setPhysicsMode: (p: PhysicsMode) => void;
  weather: WeatherKind;
  setWeather: (w: WeatherKind) => void;
  practiceMode: boolean;
  setPracticeMode: (v: boolean) => void;
  physicsDebug: boolean;
  setPhysicsDebug: (v: boolean) => void;
  activeGenreId: string;
  hud: HudSnapshot;
  onLaunchGame: (lvl?: 1 | 2 | 3, genre?: GenreTemplate) => void;
}

export function StudioPlayTab({
  gameName,
  setGameName,
  activeLevel,
  setActiveLevel,
  requestedTier,
  onChangeTier,
  powerSaveAuto,
  onChangePowerSaveAuto,
  deviceProfile,
  renderMode,
  setRenderMode,
  physicsMode,
  setPhysicsMode,
  weather,
  setWeather,
  practiceMode,
  setPracticeMode,
  physicsDebug,
  setPhysicsDebug,
  activeGenreId,
  hud,
  onLaunchGame,
}: StudioPlayTabProps) {
  const [genreFilter, setGenreFilter] = useState('');
  const filteredGenres = GENRE_TEMPLATES.filter(
    (g) =>
      g.name.toLowerCase().includes(genreFilter.toLowerCase()) ||
      g.mechanic.toLowerCase().includes(genreFilter.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Project & Launch Bar */}
      <section className="rounded-xl border border-(--border) bg-(--surface) p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-(--muted)">Project Title</label>
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              className="touch-btn w-full rounded-xl border border-(--border) bg-(--surface-2) px-3 py-2 text-sm font-semibold text-(--text) outline-none focus:border-(--accent)"
            />
          </div>
          <button
            type="button"
            onClick={() => onLaunchGame(activeLevel)}
            className="touch-btn inline-flex items-center justify-center gap-2 rounded-xl bg-(--accent) px-5 py-2.5 text-sm font-extrabold text-(--accent-ink) transition hover:opacity-90"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Launch Level {activeLevel}</span>
          </button>
        </div>

        {/* 3-Level Progression Selector */}
        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {([1, 2, 3] as const).map((lvl) => {
            const def = LEVEL_DEFINITIONS[lvl];
            const selected = activeLevel === lvl;
            return (
              <div
                key={lvl}
                className={`rounded-xl border p-3 transition ${
                  selected ? 'border-(--accent) bg-(--surface-2)' : 'border-(--border) bg-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-(--text)">{def.titleId}</span>
                  <span className="font-mono-num text-[11px] font-semibold text-(--muted)">
                    {def.requiredShards} Shards
                  </span>
                </div>
                <p className="mt-1 text-xs text-(--muted)">{def.subtitleId}</p>
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveLevel(lvl)}
                    className={`touch-btn flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                      selected
                        ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                        : 'border-(--border) bg-(--surface-2) text-(--text)'
                    }`}
                  >
                    {selected ? 'Selected' : 'Select'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onLaunchGame(lvl)}
                    className="touch-btn rounded-lg border border-(--border) bg-(--surface) px-3 py-1.5 text-xs font-bold text-(--text) hover:bg-(--surface-2)"
                  >
                    Play
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Itel A70 Performance & Engine Modes */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-(--border) bg-(--surface) p-4">
          <h3 className="text-sm font-extrabold text-(--text)">Device Tier & Dynamic Resolution</h3>
          <p className="mt-0.5 text-xs text-(--muted)">
            Auto-tunes fixed timestep, particle pool, and EMA resolution scaling (0.60x–1.00x) for Itel A70 & low-entry Android.
          </p>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {(['auto', 'eco', 'mid', 'hd'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => onChangeTier(tier)}
                className={`touch-btn rounded-xl border px-2 py-2 text-xs font-bold uppercase ${
                  requestedTier === tier
                    ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                    : 'border-(--border) bg-(--surface-2) text-(--text)'
                }`}
              >
                {tier === 'eco' ? 'A70 Eco' : tier}
              </button>
            ))}
          </div>

          <label className="mt-3 flex cursor-pointer items-center justify-between rounded-xl border border-(--border) bg-(--surface-2) px-3 py-2.5 text-xs font-semibold">
            <span>Auto Power Saver (dim particles/glow on low budget)</span>
            <input
              type="checkbox"
              checked={powerSaveAuto}
              onChange={(e) => onChangePowerSaveAuto(e.target.checked)}
              className="h-5 w-5 accent-(--accent)"
            />
          </label>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-lg bg-(--surface-2) p-2">
              <div className="text-[11px] text-(--muted)">Active Tier</div>
              <div className="font-mono-num font-bold text-(--text)">{deviceProfile.activeTier.toUpperCase()}</div>
            </div>
            <div className="rounded-lg bg-(--surface-2) p-2">
              <div className="text-[11px] text-(--muted)">Target FPS</div>
              <div className="font-mono-num font-bold text-(--text)">{deviceProfile.targetFps} FPS</div>
            </div>
            <div className="rounded-lg bg-(--surface-2) p-2">
              <div className="text-[11px] text-(--muted)">Scale</div>
              <div className="font-mono-num font-bold text-(--text)">{hud.resolutionScale.toFixed(2)}x</div>
            </div>
            <div className="rounded-lg bg-(--surface-2) p-2">
              <div className="text-[11px] text-(--muted)">Heap / Backend</div>
              <div className="font-mono-num font-bold text-(--text)">
                {getHeapMb()}MB · {deviceProfile.renderer}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-(--border) bg-(--surface) p-4">
          <h3 className="text-sm font-extrabold text-(--text)">Engine Simulation Mode</h3>
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1 text-xs font-semibold text-(--muted)">Render Pipeline</div>
              <div className="grid grid-cols-3 gap-2">
                {(['2D', '2.5D', '3D Ringan'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setRenderMode(m)}
                    className={`touch-btn rounded-xl border px-2 py-2 text-xs font-bold ${
                      renderMode === m
                        ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                        : 'border-(--border) bg-(--surface-2) text-(--text)'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold text-(--muted)">Physics Engine</div>
              <div className="grid grid-cols-3 gap-2">
                {(['Arcade', 'Realistis', 'Zero-G'] as const).map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPhysicsMode(pm)}
                    className={`touch-btn rounded-xl border px-2 py-2 text-xs font-bold ${
                      physicsMode === pm
                        ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                        : 'border-(--border) bg-(--surface-2) text-(--text)'
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="mb-1 text-xs font-semibold text-(--muted)">Weather</div>
                <select
                  value={weather}
                  onChange={(e) => setWeather(e.target.value as WeatherKind)}
                  className="touch-btn w-full rounded-xl border border-(--border) bg-(--surface-2) px-3 text-xs font-semibold text-(--text)"
                >
                  <option value="Cerah">Cerah (Clear)</option>
                  <option value="Hujan">Hujan (Rain)</option>
                  <option value="Salju">Salju (Snow)</option>
                </select>
              </div>
              <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl border border-(--border) bg-(--surface-2) px-3 text-xs font-semibold">
                <span>Practice (Invincible)</span>
                <input
                  type="checkbox"
                  checked={practiceMode}
                  onChange={(e) => setPracticeMode(e.target.checked)}
                  className="h-5 w-5 accent-(--accent)"
                />
              </label>
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-(--border) bg-(--surface-2) px-3 py-2.5 text-xs font-semibold">
              <div>
                <div className="font-bold text-(--text)">Physics Debug (Hitboxes &amp; Bounds)</div>
                <div className="text-[11px] font-normal text-(--muted)">
                  Visualizes AABB bounds, platform snap lips, velocity vectors &amp; culling for {physicsMode} physics.
                </div>
              </div>
              <input
                type="checkbox"
                data-testid="physics-debug-toggle"
                checked={physicsDebug}
                onChange={(e) => {
                  soundEngine.playSfx('ui_toggle');
                  setPhysicsDebug(e.target.checked);
                }}
                className="ml-2 h-5 w-5 shrink-0 accent-(--accent)"
              />
            </label>
          </div>
        </div>
      </section>

      {/* 14-Genre 1-Tap Generator */}
      <section className="rounded-xl border border-(--border) bg-(--surface) p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold text-(--text)">14 Genre 1-Tap Generator</h3>
              <span className="font-mono-num text-[11px] font-bold uppercase text-(--accent)">
                Active: {GENRE_TEMPLATES.find((x) => x.id === activeGenreId)?.name ?? 'Platformer'}
              </span>
            </div>
            <p className="text-xs text-(--muted)">
              Applies authentic genre simulation, physics, render mode, speed, gravity, and art style in one tap.
            </p>
          </div>
          <input
            type="search"
            placeholder="Filter genre..."
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="touch-btn w-full rounded-xl border border-(--border) bg-(--surface-2) px-3 text-xs sm:w-56"
          />
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGenres.map((g) => {
            const isSelectedGenre = g.id === activeGenreId;
            return (
              <div
                key={g.id}
                className={`flex flex-col justify-between rounded-xl border p-3 ${
                  isSelectedGenre ? 'border-(--accent) bg-(--surface-2)' : 'border-(--border) bg-(--surface-2)'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-(--text)">{g.name}</span>
                    <span className="font-mono-num text-[10px] font-bold uppercase tracking-wide text-(--accent)">
                      {g.simKind.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="font-mono-num mt-0.5 text-[11px] font-semibold text-(--muted)">
                    {g.renderMode} · {g.physicsMode}
                  </div>
                  <p className="mt-1 text-xs text-(--muted)">{g.mechanic}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onLaunchGame(activeLevel, g)}
                  className={`touch-btn mt-2.5 w-full rounded-lg border px-3 py-1.5 text-xs font-bold ${
                    isSelectedGenre
                      ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                      : 'border-(--border) bg-(--surface) text-(--text) hover:border-(--accent) hover:text-(--accent)'
                  }`}
                >
                  Play {g.name}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

interface StudioAssetsTabProps {
  styleId: ArtStyleId;
  customPalettes: Partial<Record<ArtStyleId, string[]>>;
  styleOverrides: StyleOverrides;
}

export function StudioAssetsTab({ styleId, customPalettes, styleOverrides }: StudioAssetsTabProps) {
  const style = getStyleSpec(styleId, customPalettes);
  const showcaseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tileCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gridSize, setGridSize] = useState<16 | 32>(16);
  const [pixelGrid, setPixelGrid] = useState<number[][]>(() => createEmptyGrid(16, 0));
  const [history, setHistory] = useState<number[][][]>([]);
  const [selectedColorIdx, setSelectedColorIdx] = useState<number>(2);
  const [tilemap, setTilemap] = useState<number[][]>(() =>
    Array.from({ length: 8 }, (_, r) =>
      Array.from({ length: 12 }, (_, c) => (r === 7 ? 1 : r === 5 && (c === 3 || c === 4 || c === 8) ? 2 : r === 4 && c === 4 ? 3 : 0))
    )
  );
  const [selectedTile, setSelectedTile] = useState<number>(1);
  const [hydrated, setHydrated] = useState(false);
  const [demoPose, setDemoPose] = useState<CharacterAnimState>('walk');
  const [demoRig3D, setDemoRig3D] = useState(true);
  const [assetVersion, setAssetVersion] = useState(0);

  // Load persisted pixel & tilemap once
  useEffect(() => {
    import('../engine/storage').then((m) => {
      setPixelGrid(m.loadPixelGrid(16));
      setTilemap(m.loadTilemap());
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) savePixelGrid(pixelGrid);
  }, [pixelGrid, hydrated]);

  useEffect(() => {
    if (hydrated) saveTilemap(tilemap);
  }, [tilemap, hydrated]);

  // Render Procedural Asset Library Showcase (animated 2D/3D Bowo + environment)
  useEffect(() => {
    let rafId = 0;
    let lastDraw = 0;
    const draw = (now: number) => {
      rafId = window.requestAnimationFrame(draw);
      if (now - lastDraw < 65) return;
      lastDraw = now;
      const canvas = showcaseCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const t = now * 0.001;
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = style.palette[0];
      ctx.fillRect(0, 0, w, h);
      drawGroundTile(ctx, 0, h - 28, w, 28, style, 1);

      drawTreeAsset(ctx, 56, h - 28, 0.85, style);
      drawRockAsset(ctx, 118, h - 28, 0.9, style);
      drawBowoCharacter(ctx, 185, h - 46, 26, style, {
        pose: demoPose,
        facing: 1,
        time: t,
        rig3d: demoRig3D,
        yaw: demoRig3D ? Math.sin(t * 1.4) * 0.45 : 0.3,
        overrides: styleOverrides,
      });
      drawEnemyEntity(ctx, 'slime', 255, h - 40, 14, style, { time: t, flash: 0, telegraphRatio: 0, koProgress: 0 });
      drawEnemyEntity(ctx, 'wisp', 312, h - 72, 13, style, { time: t, flash: 0, telegraphRatio: 0.5, koProgress: 0 });
      drawEnemyEntity(ctx, 'sentinel', 370, h - 44, 16, style, { time: t, flash: 0, telegraphRatio: 0, koProgress: 0 });
      drawEnemyEntity(ctx, 'boss_kala', 445, h - 54, 24, style, { time: t, flash: 0, telegraphRatio: 0.4, koProgress: 0, bossPhase: 2 });
      drawGateAsset(ctx, 504, h - 98, 42, 70, true, style, t);
    };
    rafId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(rafId);
  }, [demoPose, demoRig3D, style, styleOverrides]);

  const assetStats = assetManager.getStats();
  const managedAssets = assetManager.listAssets();
  const bumpAssets = () => setAssetVersion((v) => v + 1);
  void assetVersion;

  // Render Pixel Editor Canvas
  useEffect(() => {
    const canvas = pixelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cell = canvas.width / gridSize;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const val = pixelGrid[r]?.[c] ?? 0;
        ctx.fillStyle = val === 0 ? ((r + c) % 2 === 0 ? '#1e293b' : '#0f172a') : style.palette[val % style.palette.length];
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  }, [pixelGrid, gridSize, style.palette]);

  // Render Tilemap Editor Canvas
  useEffect(() => {
    const canvas = tileCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cw = canvas.width / 12;
    const ch = canvas.height / 8;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 12; c++) {
        const t = tilemap[r]?.[c] ?? 0;
        ctx.fillStyle = t === 0 ? style.palette[0] : t === 1 ? style.palette[1] : t === 2 ? '#64748b' : '#facc15';
        ctx.fillRect(c * cw, r * ch, cw - 1, ch - 1);
      }
    }
  }, [tilemap, style.palette]);

  const paintPixel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * gridSize);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * gridSize);
    if (col < 0 || row < 0 || col >= gridSize || row >= gridSize) return;
    setHistory((h) => [...h.slice(-10), pixelGrid]);
    setPixelGrid((prev) => prev.map((line, r) => (r === row ? line.map((v, c) => (c === col ? selectedColorIdx : v)) : line)));
  };

  const paintTile = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * 12);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * 8);
    if (col < 0 || row < 0 || col >= 12 || row >= 8) return;
    setTilemap((prev) => prev.map((line, r) => (r === row ? line.map((v, c) => (c === col ? selectedTile : v)) : line)));
  };

  return (
    <div className="space-y-5">
      {/* Live Procedural Asset Showcase */}
      <section className="rounded-xl border border-(--border) bg-(--surface) p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-(--text)">Procedural Mobile Asset Library ({style.name})</h3>
            <p className="text-xs text-(--muted)">
              0 KB external image footprint. Every character, tree, rock, enemy, gate, and UI component adapts live to active style.
            </p>
          </div>
          <span className="font-mono-num text-xs font-bold text-(--accent)">100% Canvas/SVG</span>
        </div>

        <canvas
          ref={showcaseCanvasRef}
          width={560}
          height={145}
          className="mt-3 w-full rounded-xl border border-(--border)"
        />

        {/* Animation & Rig Switcher */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap gap-1.5">
            {(['idle', 'walk', 'jump', 'fall', 'attack', 'dash', 'hurt', 'ko'] as const).map((pose) => (
              <button
                key={pose}
                type="button"
                onClick={() => {
                  soundEngine.playSfx('ui_click');
                  setDemoPose(pose);
                }}
                className={`touch-btn rounded-lg border px-2.5 font-bold uppercase ${
                  demoPose === pose ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                }`}
              >
                {pose}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playSfx('ui_toggle');
              setDemoRig3D((v) => !v);
            }}
            className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
          >
            {demoRig3D ? 'Rig: 3D-Stack' : 'Rig: 2D'}
          </button>
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {ASSET_CATALOG.map((asset) => (
            <div key={asset.id} className="rounded-xl border border-(--border) bg-(--surface-2) p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-(--text)">{asset.name}</span>
                <span className="font-mono-num text-[11px] font-semibold text-(--muted)">{asset.drawCost}</span>
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-(--accent)">
                {asset.category.toUpperCase()} · {asset.polyOrSpriteBudget}
              </div>
              <p className="mt-1 text-xs text-(--muted)">{asset.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mobile Asset Management System (Load / Unload / LRU Budget) */}
      <section className="rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-(--text)">Mobile Asset Manager (LRU &amp; Biome Unloading)</h3>
            <p className="text-(--muted)">
              Used: {Math.round(assetStats.usedBytes / 1024)} KB / {Math.round(assetStats.budgetBytes / 1024)} KB · Loaded {assetStats.loadedCount}/{assetStats.totalCount} · Hits {assetStats.cacheHits} · Evictions {assetStats.evictions}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {([1, 2, 3] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => {
                  soundEngine.playSfx('ui_click');
                  assetManager.loadLevelBundle(lvl);
                  bumpAssets();
                }}
                className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
              >
                Load Level {lvl}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_click');
                assetManager.unloadUnused();
                bumpAssets();
              }}
              className="touch-btn rounded-lg bg-(--accent) px-3 font-extrabold text-(--accent-ink)"
            >
              Unload Unused
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {managedAssets.map((rec) => (
            <div key={rec.id} className="flex flex-col justify-between rounded-xl border border-(--border) bg-(--surface-2) p-2.5">
              <div>
                <div className="flex items-center justify-between gap-1 font-bold text-(--text)">
                  <span className="truncate">{rec.label}</span>
                  <span className={rec.loaded ? 'text-emerald-400' : 'text-(--muted)'}>{rec.loaded ? 'LOADED' : 'IDLE'}</span>
                </div>
                <div className="font-mono-num mt-0.5 text-[11px] text-(--muted)">
                  {Math.round(rec.estimatedBytes / 1024)} KB · Scope L{rec.levelScope} {rec.pinned ? '· PINNED' : ''}
                </div>
              </div>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSfx('ui_toggle');
                    if (rec.loaded) assetManager.unloadAsset(rec.id, true);
                    else assetManager.loadAsset(rec.id);
                    bumpAssets();
                  }}
                  className="touch-btn flex-1 rounded-lg border border-(--border) bg-(--surface) px-2 font-bold"
                >
                  {rec.loaded ? 'Unload' : 'Load'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSfx('ui_toggle');
                    assetManager.togglePin(rec.id);
                    bumpAssets();
                  }}
                  className="touch-btn rounded-lg border border-(--border) bg-(--surface) px-2 font-bold"
                >
                  {rec.pinned ? 'Unpin' : 'Pin'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pixel Art Editor & Tilemap Editor */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-(--border) bg-(--surface) p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-(--text)">Pixel Sprite Editor ({gridSize}x{gridSize})</h3>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const nextSize = gridSize === 16 ? 32 : 16;
                  setGridSize(nextSize);
                  setPixelGrid(createEmptyGrid(nextSize, 0));
                }}
                className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-2.5 text-xs font-bold"
              >
                {gridSize === 16 ? '32x32' : '16x16'}
              </button>
              <button
                type="button"
                disabled={history.length === 0}
                onClick={() => {
                  const last = history[history.length - 1];
                  if (last) {
                    setPixelGrid(last);
                    setHistory((h) => h.slice(0, -1));
                  }
                }}
                className="touch-btn inline-flex items-center gap-1 rounded-lg border border-(--border) bg-(--surface-2) px-2.5 text-xs font-bold disabled:opacity-40"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span>Undo</span>
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedColorIdx(0)}
              className={`touch-btn rounded-lg border px-2.5 text-xs font-bold ${
                selectedColorIdx === 0 ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
              }`}
            >
              Eraser
            </button>
            {style.palette.slice(1, 9).map((hex, i) => {
              const colorIdx = i + 1;
              return (
                <button
                  key={hex + colorIdx}
                  type="button"
                  aria-label={`Palette ${colorIdx}`}
                  onClick={() => setSelectedColorIdx(colorIdx)}
                  className={`h-11 w-11 rounded-lg border-2 ${selectedColorIdx === colorIdx ? 'border-white scale-105' : 'border-transparent'}`}
                  style={{ backgroundColor: hex }}
                />
              );
            })}
          </div>

          <canvas
            ref={pixelCanvasRef}
            width={256}
            height={256}
            onPointerDown={paintPixel}
            className="pixel-crisp mt-3 mx-auto w-full max-w-[256px] cursor-crosshair rounded-xl border border-(--border) touch-none"
          />
        </div>

        <div className="rounded-xl border border-(--border) bg-(--surface) p-4">
          <h3 className="text-sm font-extrabold text-(--text)">Tilemap Level Editor (12x8 Grid)</h3>
          <p className="mt-0.5 text-xs text-(--muted)">Tap or click cells to paint Sky, Ground, Stone Platform, or Coin Spawn.</p>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              { id: 0, label: 'Sky' },
              { id: 1, label: 'Ground' },
              { id: 2, label: 'Platform' },
              { id: 3, label: 'Coin' },
            ].map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => setSelectedTile(tile.id)}
                className={`touch-btn rounded-lg border px-2 text-xs font-bold ${
                  selectedTile === tile.id
                    ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                    : 'border-(--border) bg-(--surface-2)'
                }`}
              >
                {tile.label}
              </button>
            ))}
          </div>

          <canvas
            ref={tileCanvasRef}
            width={360}
            height={240}
            onPointerDown={paintTile}
            className="mt-3 w-full cursor-crosshair rounded-xl border border-(--border) touch-none"
          />
        </div>
      </section>
    </div>
  );
}
