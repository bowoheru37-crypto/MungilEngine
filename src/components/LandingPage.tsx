import { Play, Sliders, Sparkles, Terminal, Volume2, VolumeX, Wrench } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { drawBowoCharacter, drawEnemyEntity, drawGateAsset, drawGroundTile, drawTreeAsset, getStyleSpec } from '../engine/artStyles';
import { soundEngine } from '../engine/audio';
import { LANGUAGE_NAMES, t } from '../engine/i18n';
import { renderMode7Horizon } from '../engine/pseudo3d';
import type { ArtStyleId, CharacterAnimState, DeviceProfile, LanguageCode, StudioTab, StyleOverrides } from '../engine/types';
import { PWAInstallButton } from './PWAInstallButton';

interface LandingPageProps {
  activeLevel: 1 | 2 | 3;
  setActiveLevel: (lvl: 1 | 2 | 3) => void;
  styleId: ArtStyleId;
  customPalettes: Partial<Record<ArtStyleId, string[]>>;
  styleOverrides: StyleOverrides;
  customCharacter?: import('../engine/types').GeneratedCharacterSpec | null;
  deviceProfile: DeviceProfile;
  lang: LanguageCode;
  setLang: (l: LanguageCode) => void;
  theme: 'dark' | 'light';
  setTheme: (th: 'dark' | 'light') => void;
  muted: boolean;
  setMuted: (m: boolean) => void;
  isOnline: boolean;
  onStartPlay: () => void;
  onOpenTitleStage: () => void;
  onOpenStudioTab: (tab: StudioTab) => void;
}

const DEMO_POSES: CharacterAnimState[] = ['idle', 'walk', 'jump', 'attack', 'dash'];

export function LandingPage({
  activeLevel,
  setActiveLevel,
  styleId,
  customPalettes,
  styleOverrides,
  customCharacter,
  deviceProfile,
  lang,
  setLang,
  theme,
  setTheme,
  muted,
  setMuted,
  isOnline,
  onStartPlay,
  onOpenTitleStage,
  onOpenStudioTab,
}: LandingPageProps) {
  const tr = t(lang);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [preview3D, setPreview3D] = useState(true);
  const [poseIdx, setPoseIdx] = useState(0);

  // Enter / Space starts gameplay immediately just like Title Screen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        soundEngine.playSfx('ui_click');
        onStartPlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStartPlay]);

  // Lightweight throttled preview canvas (12 FPS idle friendly for Itel A70)
  useEffect(() => {
    let rafId = 0;
    let lastDraw = 0;
    const style = getStyleSpec(styleId, customPalettes);

    const tick = (now: number) => {
      rafId = window.requestAnimationFrame(tick);
      if (now - lastDraw < 75) return;
      lastDraw = now;

      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const tSec = now * 0.001;
      const p = style.palette;

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, activeLevel === 3 ? '#0a0714' : activeLevel === 2 ? '#0f172a' : p[0]);
      sky.addColorStop(1, activeLevel === 3 ? '#1e1133' : activeLevel === 2 ? '#1e3a5f' : '#d9f2ff');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      renderMode7Horizon(ctx, w, h - 76, h - 38, tSec * 48, style, activeLevel);
      drawGroundTile(ctx, 0, h - 40, w, 40, style, activeLevel);
      drawTreeAsset(ctx, 84, h - 40, 0.9, style);
      drawGateAsset(ctx, w - 92, h - 114, 44, 74, true, style, tSec);

      drawBowoCharacter(ctx, w * 0.36, h - 62, 30, style, {
        pose: DEMO_POSES[poseIdx % DEMO_POSES.length],
        facing: 1,
        time: tSec,
        rig3d: preview3D,
        yaw: preview3D ? Math.sin(tSec * 1.4) * 0.48 : 0.32,
        overrides: styleOverrides,
        customChar: customCharacter ?? undefined,
      });

      drawEnemyEntity(ctx, activeLevel === 3 ? 'boss_kala' : 'slime', w * 0.62, h - (activeLevel === 3 ? 68 : 54), activeLevel === 3 ? 24 : 15, style, {
        time: tSec,
        flash: 0,
        telegraphRatio: Math.sin(tSec * 2) > 0.4 ? 0.5 : 0,
        koProgress: 0,
        bossPhase: 2,
      });
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [activeLevel, customCharacter, customPalettes, poseIdx, preview3D, styleId, styleOverrides]);

  return (
    <div className="min-h-dvh bg-(--bg) text-(--text)">
      {/* Clean 3-Zone Top Bar */}
      <header className="border-b border-(--border) bg-(--surface)">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          <a
            href="#hero"
            className="whitespace-nowrap shrink-0 text-lg font-extrabold tracking-tight text-(--text)"
          >
            Mungil Engine
          </a>

          <nav className="hidden items-center gap-6 text-sm font-medium text-(--muted) md:flex">
            <a href="#chapters" className="whitespace-nowrap shrink-0 hover:text-(--text)">
              Chapters
            </a>
            <a href="#generators" className="whitespace-nowrap shrink-0 hover:text-(--text)">
              Generators
            </a>
            <a href="#engines" className="whitespace-nowrap shrink-0 hover:text-(--text)">
              Pseudo-3D
            </a>
            <a href="#skills" className="whitespace-nowrap shrink-0 hover:text-(--text)">
              AI Skills
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_click');
                onStartPlay();
              }}
              className="touch-btn whitespace-nowrap shrink-0 rounded-xl bg-(--accent) px-4 py-2 text-xs font-extrabold text-(--accent-ink) transition hover:opacity-90"
            >
              {tr.playGame}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-14 px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero Proposition + Live Interactive Stage */}
        <section id="hero" className="grid items-stretch gap-8 lg:grid-cols-12">
          <div className="flex flex-col justify-between lg:col-span-6">
            <div>
              <div className="text-xs font-medium text-(--muted)">
                {isOnline ? tr.onlineBadge : tr.offlineBadge} · {deviceProfile.activeTier.toUpperCase()} ({deviceProfile.targetFps} FPS) · Zero-GC SoA
              </div>
              <h1
                className="mt-3 font-extrabold tracking-tight text-(--text)"
                style={{ fontSize: 'clamp(2.1rem, 4vw, 3.25rem)', lineHeight: 1.08, textWrap: 'balance' }}
              >
                {tr.appSubtitle} &amp; Mobile Pseudo-3D Game Studio
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-(--muted) sm:text-base">
                Lightweight 2D, 2.5D, and Fake-3D game engine built for low-entry Android phones like Itel A70. Play all 3 chapters or generate characters, music, SFX, cutscenes, and terrains in one tap.
              </p>

              {/* Level Quick Picker */}
              <div className="mt-6 grid grid-cols-3 gap-2">
                {([1, 2, 3] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      soundEngine.playSfx('ui_click');
                      setActiveLevel(lvl);
                    }}
                    className={`touch-btn rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      activeLevel === lvl
                        ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                        : 'border-(--border) bg-(--surface) text-(--text) hover:border-(--accent)'
                    }`}
                  >
                    {tr.levelLabel} {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  data-start="true"
                  onClick={() => {
                    soundEngine.playSfx('ui_click');
                    onStartPlay();
                  }}
                  className="touch-btn inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-(--accent) px-5 py-3 text-sm font-extrabold text-(--accent-ink) transition hover:opacity-90"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>{tr.playGame}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSfx('ui_tab');
                    onOpenStudioTab('generators');
                  }}
                  className="touch-btn inline-flex items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--surface) px-4 py-3 text-xs font-bold text-(--text) hover:border-(--accent)"
                >
                  <Sparkles className="h-4 w-4 text-(--accent)" />
                  <span>Generators</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSfx('ui_tab');
                    onOpenStudioTab('play');
                  }}
                  className="touch-btn inline-flex items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--surface) px-4 py-3 text-xs font-bold text-(--text) hover:border-(--accent)"
                >
                  <Wrench className="h-4 w-4 text-(--accent-2)" />
                  <span>{tr.openStudio}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSfx('ui_tab');
                    onOpenStudioTab('agent');
                  }}
                  className="touch-btn rounded-xl border border-(--accent)/50 bg-(--accent)/10 px-3 py-2 font-bold text-(--text) hover:border-(--accent)"
                >
                  Qolbu AI &amp; MCP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSfx('ui_tab');
                    onOpenStudioTab('arena');
                  }}
                  className="touch-btn rounded-xl border border-(--border) bg-(--surface) px-3 py-2 font-semibold text-(--text) hover:border-(--accent)"
                >
                  Arena AI
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSfx('ui_tab');
                    onOpenStudioTab('scene');
                  }}
                  className="touch-btn rounded-xl border border-(--border) bg-(--surface) px-3 py-2 font-semibold text-(--text) hover:border-(--accent)"
                >
                  Scene &amp; Collider
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSfx('ui_click');
                    onOpenTitleStage();
                  }}
                  className="touch-btn rounded-xl border border-(--border) bg-(--surface) px-3 py-2 font-semibold text-(--text) hover:border-(--accent)"
                >
                  Title Stage
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSfx('ui_tab');
                    onOpenStudioTab('controls');
                  }}
                  className="touch-btn inline-flex items-center gap-1.5 rounded-xl border border-(--border) bg-(--surface) px-3 py-2 font-semibold text-(--text) hover:border-(--accent)"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>{tr.controlsBtn}</span>
                </button>
                <PWAInstallButton label={tr.installApp} compact />
              </div>
            </div>
          </div>

          {/* Right Column: Live Canvas Stage & Workspace Preferences */}
          <div className="flex flex-col justify-between rounded-2xl border border-(--border) bg-(--surface) p-4 lg:col-span-6">
            <canvas
              ref={previewCanvasRef}
              width={540}
              height={300}
              className="aspect-[540/300] w-full rounded-xl border border-(--border) bg-slate-950"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSfx('ui_toggle');
                    setPreview3D((v) => !v);
                  }}
                  className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold text-(--text)"
                >
                  {preview3D ? 'Rig: 3D-Stack' : 'Rig: 2D Sprite'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSfx('ui_click');
                    setPoseIdx((i) => (i + 1) % DEMO_POSES.length);
                  }}
                  className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold text-(--text)"
                >
                  Pose: {DEMO_POSES[poseIdx % DEMO_POSES.length]}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Language"
                  value={lang}
                  onChange={(e) => {
                    soundEngine.playSfx('ui_toggle');
                    setLang(e.target.value as LanguageCode);
                  }}
                  className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-2.5 text-xs font-semibold text-(--text)"
                >
                  {LANGUAGE_NAMES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSfx('ui_toggle');
                    setTheme(theme === 'dark' ? 'light' : 'dark');
                  }}
                  className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold text-(--text)"
                >
                  {theme === 'dark' ? 'Dark' : 'Light'}
                </button>
                <button
                  type="button"
                  aria-label="Toggle Sound"
                  onClick={() => {
                    const next = !muted;
                    setMuted(next);
                    soundEngine.setMuted(next);
                  }}
                  className="touch-btn inline-flex items-center justify-center rounded-lg border border-(--border) bg-(--surface-2) px-2.5 text-(--text)"
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 01. Three-Chapter Playable Game */}
        <section id="chapters" className="border-t border-(--border) pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-extrabold text-(--text)">01. Three-Chapter Action RPG Loop</h2>
            <span className="font-mono-num text-xs text-(--muted)">30–60 FPS · Coyote Time · Parry · 3 BGM Tracks</span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-(--border) bg-(--surface) p-4">
              <div className="font-mono-num text-xs font-semibold text-(--muted)">Level 1 · Dawn Village</div>
              <h3 className="mt-1 text-sm font-extrabold text-(--text)">Desa Fajar</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-(--muted)">
                Collect 2 Light Shards across village platforms, defeat Slime patrols, and unlock the East Gate.
              </p>
            </div>
            <div className="rounded-xl border border-(--border) bg-(--surface) p-4">
              <div className="font-mono-num text-xs font-semibold text-(--muted)">Level 2 · Storm Bridge</div>
              <h3 className="mt-1 text-sm font-extrabold text-(--text)">Jembatan Badai</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-(--muted)">
                Trigger 2 storm floor switches, reflect Wisp bolts with Dash Parry, and hold off Sentinel charges.
              </p>
            </div>
            <div className="rounded-xl border border-(--border) bg-(--surface) p-4">
              <div className="font-mono-num text-xs font-semibold text-(--muted)">Level 3 · Boss Battle</div>
              <h3 className="mt-1 text-sm font-extrabold text-(--text)">Menara Kala</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-(--muted)">
                Battle 3-phase Boss Kala with multi-orb spreads, hitstop combos, and dynamic camera shake.
              </p>
            </div>
          </div>
        </section>

        {/* 02. Procedural Generator Suite */}
        <section id="generators" className="border-t border-(--border) pt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-(--text)">02. Procedural Asset, Audio, Video &amp; Terrain Generators</h2>
              <p className="mt-1 text-xs text-(--muted)">
                Generate sprites, 3D-stack heroes, tracker songs, Web Audio SFX, animation cutscenes, and 2D/3D heightmaps offline.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_tab');
                onOpenStudioTab('generators');
              }}
              className="touch-btn rounded-xl border border-(--border) bg-(--surface) px-4 text-xs font-bold text-(--text) hover:border-(--accent)"
            >
              Open Generators
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: 'Character 2D/3D Generator', desc: 'Symmetrical pixel grids and 5-slice Z-stacked heroes ready to equip on Bowo.' },
              { title: 'Music & SFX Generator', desc: '16-step pentatonic/dorian/phrygian tracker loops and sweep SFX synths.' },
              { title: 'Video & Cutscene Sequencer', desc: 'Keyframe animation timelines with real WebM capture or JSON storyboard export.' },
              { title: 'Terrain 2D/3D Generator', desc: 'Deterministic heightmaps rendered with Voxel-Space columns and platforms.' },
              { title: 'Mobile Asset Manager', desc: 'LRU memory budget (2 MB Eco) that unloads prior biomes automatically.' },
              { title: 'Other Props & RPG Icons', desc: 'Potions, chests, crystals, torches, and emblems registered directly to cache.' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-(--border) bg-(--surface) p-4">
                <h3 className="text-sm font-extrabold text-(--text)">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-(--muted)">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 03. Fake 3D, Pseudo 3D & Mobile Architecture */}
        <section id="engines" className="border-t border-(--border) pt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-(--text)">03. Cleanroom Pseudo-3D &amp; Mobile Engine DNA</h2>
              <p className="mt-1 text-xs text-(--muted)">
                25 Top-5 open-source architectural patterns fused across Fake 3D, Pseudo 3D, 2.5D, Web, and Mobile engines.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_tab');
                onOpenStudioTab('lab');
              }}
              className="touch-btn rounded-xl border border-(--border) bg-(--surface) px-4 text-xs font-bold text-(--text) hover:border-(--accent)"
            >
              Inspect Engine Lab
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Fake 3D', detail: 'DDA Raycaster, Mode-7 Horizon, Voxel Space Heightmap' },
              { label: 'Pseudo 3D', detail: 'Zdog Layered Shapes, Sprite Stacking, Perspective Math' },
              { label: 'Web Engine', detail: 'SoA TypedArray ECS, 1-line MungilE API, Web Audio Synth' },
              { label: 'Mobile Itel A70', detail: '2 MB Asset Budget, EMA Dynamic Scale, <=24 Draw Calls' },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-(--border) bg-(--surface) p-4">
                <div className="text-xs font-bold text-(--accent)">{card.label}</div>
                <p className="mt-1 text-xs leading-relaxed text-(--muted)">{card.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 04. Installable AI Agent & Complete Skills */}
        <section id="skills" className="border-t border-(--border) pt-8">
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-(--border) bg-(--surface) p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-extrabold text-(--text)">04. Installable AI Agent &amp; Complete Skills Pack</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-(--muted)">
                Export ready-to-install skill packs (CLAUDE.md, GEMINI.md, GROK_INSTRUCTIONS.md, QWEN_AGENT.md, and Universal AGENTS.md + MCP tools) for AI-assisted game creation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_tab');
                onOpenStudioTab('skills');
              }}
              className="touch-btn inline-flex shrink-0 items-center gap-2 rounded-xl bg-(--accent) px-5 py-3 text-xs font-extrabold text-(--accent-ink)"
            >
              <Terminal className="h-4 w-4" />
              <span>Open AI Skills Installer</span>
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-(--border) bg-(--surface) px-4 py-6 text-xs text-(--muted) sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <span className="font-semibold text-(--text)">Mungil Engine V7 · Bowo: Penjaga Cahaya</span>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_click');
                onStartPlay();
              }}
              className="hover:text-(--text)"
            >
              Play Game
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_tab');
                onOpenStudioTab('assets');
              }}
              className="hover:text-(--text)"
            >
              Asset Manager
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_tab');
                onOpenStudioTab('export');
              }}
              className="hover:text-(--text)"
            >
              Export &amp; Docs
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
