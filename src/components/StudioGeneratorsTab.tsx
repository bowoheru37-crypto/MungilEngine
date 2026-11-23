import { Download, Film, Music, Play, RefreshCw, Sparkles, Square, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { drawBowoCharacter, drawGroundTile, drawRockAsset, drawTreeAsset, getStyleSpec } from '../engine/artStyles';
import { assetManager } from '../engine/assetManager';
import { soundEngine } from '../engine/audio';
import {
  generateCharacter,
  generateCutsceneSpec,
  generateMusicTrack,
  generatePropAsset,
  generateSfxSpec,
  generateTerrainSpec,
} from '../engine/generators';
import { renderVoxelHeightmapTerrain } from '../engine/pseudo3d';
import type {
  ArtStyleId,
  CharacterAnimState,
  GeneratedCharacterSpec,
  GeneratedPropSpec,
  GeneratedSfxSpec,
  GeneratedTerrainSpec,
  GeneratedTrackSpec,
  StyleOverrides,
  WeatherKind,
} from '../engine/types';

interface StudioGeneratorsTabProps {
  styleId: ArtStyleId;
  customPalettes: Partial<Record<ArtStyleId, string[]>>;
  styleOverrides: StyleOverrides;
  customCharacter: GeneratedCharacterSpec | null;
  onApplyCharacter: (c: GeneratedCharacterSpec | null) => void;
}

type GenSection = 'character' | 'music' | 'sfx' | 'video' | 'terrain' | 'props';

function downloadJson(name: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function StudioGeneratorsTab({
  styleId,
  customPalettes,
  styleOverrides,
  customCharacter,
  onApplyCharacter,
}: StudioGeneratorsTabProps) {
  const style = getStyleSpec(styleId, customPalettes);
  const [subTab, setSubTab] = useState<GenSection>('character');

  // 1. Character 2D/3D
  const [charSeed, setCharSeed] = useState(404);
  const [charDim, setCharDim] = useState<'2D' | '3D-Stack'>('3D-Stack');
  const [charArchetype, setCharArchetype] = useState<GeneratedCharacterSpec['archetype']>('Guardian');
  const [charPose, setCharPose] = useState<CharacterAnimState>('idle');
  const [charSpec, setCharSpec] = useState<GeneratedCharacterSpec>(() => generateCharacter(404, '3D-Stack', 'Guardian'));
  const charCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 2. Music
  const [musicSeed, setMusicSeed] = useState(120);
  const [musicScale, setMusicScale] = useState<GeneratedTrackSpec['scale']>('pentatonic');
  const [musicBpm, setMusicBpm] = useState(128);
  const [trackSpec, setTrackSpec] = useState<GeneratedTrackSpec>(() => generateMusicTrack(120, 'pentatonic', 128));
  const [musicPlaying, setMusicPlaying] = useState(false);

  // 3. SFX
  const [sfxSeed, setSfxSeed] = useState(88);
  const [sfxPreset, setSfxPreset] = useState<'jump' | 'slash' | 'coin' | 'laser' | 'impact' | 'ui_chime'>('jump');
  const [sfxSpec, setSfxSpec] = useState<GeneratedSfxSpec>(() => generateSfxSpec(88, 'jump'));
  const sfxCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 4. Video / Cutscene
  const [cutSeed, setCutSeed] = useState(777);
  const [cutWeather, setCutWeather] = useState<WeatherKind>('Cerah');
  const [cutSpec, setCutSpec] = useState(() => generateCutsceneSpec(777, 'Cerah'));
  const [cutPlaying, setCutPlaying] = useState(true);
  const [videoExportMsg, setVideoExportMsg] = useState('');
  const cutCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 5. Terrain 2D/3D
  const [terSeed, setTerSeed] = useState(909);
  const [terMode, setTerMode] = useState<'2D' | '3D-Heightmap'>('3D-Heightmap');
  const [terBiome, setTerBiome] = useState<GeneratedTerrainSpec['biome']>('meadow');
  const [terSpec, setTerSpec] = useState<GeneratedTerrainSpec>(() => generateTerrainSpec(909, '3D-Heightmap', 'meadow'));
  const terCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 6. Other Props
  const [propSeed, setPropSeed] = useState(303);
  const [propKind, setPropKind] = useState<GeneratedPropSpec['kind']>('potion');
  const [propSpec, setPropSpec] = useState<GeneratedPropSpec>(() => generatePropAsset(303, 'potion'));
  const [propMsg, setPropMsg] = useState('');
  const propCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stop custom music preview on unmount
  useEffect(() => {
    return () => {
      if (musicPlaying) soundEngine.stopTracker();
    };
  }, [musicPlaying]);

  // Animate Character 2D/3D preview
  useEffect(() => {
    if (subTab !== 'character') return;
    let rafId = 0;
    let last = 0;
    const loop = (now: number) => {
      rafId = window.requestAnimationFrame(loop);
      if (now - last < 50) return;
      last = now;
      const canvas = charCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const t = now * 0.001;
      ctx.fillStyle = style.palette[0];
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawGroundTile(ctx, 0, canvas.height - 32, canvas.width, 32, style, 1);

      drawBowoCharacter(ctx, 110, canvas.height - 54, 34, style, {
        pose: charPose,
        facing: 1,
        time: t,
        rig3d: charSpec.dimension === '3D-Stack',
        yaw: charSpec.dimension === '3D-Stack' ? Math.sin(t * 1.8) * 0.8 : 0.3,
        overrides: styleOverrides,
        customChar: charSpec,
      });

      // Draw symmetrical 12x12 pixel sprite alongside rig
      const pxOriginX = 215;
      const pxOriginY = 30;
      const cell = 10;
      ctx.fillStyle = 'rgba(15,23,42,0.75)';
      ctx.fillRect(pxOriginX - 6, pxOriginY - 6, 12 * cell + 12, 12 * cell + 12);
      for (let r = 0; r < 12; r++) {
        for (let c = 0; c < 12; c++) {
          const v = charSpec.spriteGrid[r][c];
          if (v === 0) continue;
          ctx.fillStyle =
            v === 1
              ? charSpec.primaryColor
              : v === 2
                ? charSpec.secondaryColor
                : v === 3
                  ? charSpec.cloakColor
                  : v === 5
                    ? '#ffffff'
                    : charSpec.accentColor;
          ctx.fillRect(pxOriginX + c * cell, pxOriginY + r * cell, cell - 1, cell - 1);
        }
      }
    };
    rafId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(rafId);
  }, [charPose, charSpec, style, styleOverrides, subTab]);

  // Draw SFX waveform envelope
  useEffect(() => {
    if (subTab !== 'sfx') return;
    const canvas = sfxCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#090f1a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3ddc78';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const progress = x / w;
      const env = 1 - progress;
      const freq = sfxSpec.freqStart + (sfxSpec.freqEnd - sfxSpec.freqStart) * progress;
      const phase = progress * freq * 0.08;
      let sample = Math.sin(phase);
      if (sfxSpec.wave === 'square') sample = sample >= 0 ? 1 : -1;
      else if (sfxSpec.wave === 'sawtooth') sample = ((phase / Math.PI) % 2) - 1;
      else if (sfxSpec.wave === 'triangle') sample = Math.asin(Math.sin(phase)) / (Math.PI / 2);
      const y = h / 2 + sample * env * (h * 0.36);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [sfxSpec, subTab]);

  // Animate Video / Cutscene timeline
  useEffect(() => {
    if (subTab !== 'video') return;
    let rafId = 0;
    let startMs = performance.now();
    let lastDraw = 0;
    const tick = (now: number) => {
      rafId = window.requestAnimationFrame(tick);
      if (now - lastDraw < 45) return;
      lastDraw = now;
      const canvas = cutCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const elapsed = cutPlaying ? ((now - startMs) * 0.001) % cutSpec.durationSec : 1.8;
      let activeKf = cutSpec.keyframes[0];
      for (const kf of cutSpec.keyframes) {
        if (elapsed >= kf.timeSec) activeKf = kf;
      }

      const w = canvas.width;
      const h = canvas.height;
      const shakeX = activeKf.effect === 'shake' ? (Math.random() - 0.5) * 6 : 0;
      ctx.save();
      ctx.translate(shakeX, 0);
      ctx.fillStyle = style.palette[0];
      ctx.fillRect(-10, 0, w + 20, h);
      drawGroundTile(ctx, 0, h - 36, w, 36, style, 1);
      drawTreeAsset(ctx, 75 - activeKf.cameraX * 0.3, h - 36, 0.9, style);
      drawRockAsset(ctx, 290 - activeKf.cameraX * 0.4, h - 36, 0.9, style);

      drawBowoCharacter(ctx, 110 + activeKf.cameraX * 0.4, h - 56, 30, style, {
        pose: activeKf.pose,
        facing: 1,
        time: elapsed,
        rig3d: true,
        overrides: styleOverrides,
        customChar: customCharacter ?? undefined,
      });

      if (activeKf.effect === 'flash') {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(0, 0, w, h);
      }

      // Subtitle bar
      ctx.fillStyle = 'rgba(2,6,23,0.82)';
      ctx.fillRect(14, h - 42, w - 28, 28);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`[${elapsed.toFixed(1)}s · ${activeKf.pose.toUpperCase()}] ${activeKf.caption}`, w / 2, h - 24);
      ctx.restore();
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [cutPlaying, cutSpec, customCharacter, style, styleOverrides, subTab]);

  // Draw Terrain 2D/3D Heightmap
  useEffect(() => {
    if (subTab !== 'terrain') return;
    const canvas = terCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderVoxelHeightmapTerrain(ctx, canvas.width, canvas.height, terSpec, 0);
    if (terSpec.mode === '2D') {
      ctx.fillStyle = '#f59e0b';
      for (const p of terSpec.platforms) {
        ctx.fillRect((p.x / terSpec.width) * canvas.width, canvas.height - (440 - p.y) * 0.45, (p.w / terSpec.width) * canvas.width, 8);
      }
    }
  }, [subTab, terSpec]);

  // Draw Prop Asset grid
  useEffect(() => {
    if (subTab !== 'props') return;
    const canvas = propCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cell = Math.floor(canvas.width / 10);
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const v = propSpec.pixelGrid[r][c];
        if (v === 0) continue;
        ctx.fillStyle = v === 2 ? propSpec.glowColor : propSpec.primaryColor;
        ctx.fillRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4);
      }
    }
  }, [propSpec, subTab]);

  const exportCutsceneVideo = () => {
    const canvas = cutCanvasRef.current;
    if (!canvas || typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
      downloadJson(`cutscene_${cutSpec.seed}.json`, cutSpec);
      setVideoExportMsg('MediaRecorder unavailable; exported storyboard JSON cleanly.');
      return;
    }
    try {
      const stream = canvas.captureStream(24);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cutscene_${cutSpec.seed}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setVideoExportMsg('Exported WebM cutscene clip!');
      };
      setVideoExportMsg('Recording 1.6s WebM cutscene...');
      recorder.start();
      window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 1600);
    } catch {
      downloadJson(`cutscene_${cutSpec.seed}.json`, cutSpec);
      setVideoExportMsg('WebM codec unsupported here; exported JSON storyboard.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-navigation across all 6 generators */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-(--border) bg-(--surface) p-2">
        {(
          [
            ['character', 'Character 2D/3D'],
            ['music', 'Music Tracker'],
            ['sfx', 'SFX Synth'],
            ['video', 'Video & Cutscene'],
            ['terrain', 'Terrain 2D/3D'],
            ['props', 'Other Assets'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              soundEngine.playSfx('ui_tab');
              setSubTab(id);
            }}
            className={`touch-btn rounded-lg px-3.5 text-xs font-bold transition ${
              subTab === id
                ? 'bg-(--accent) text-(--accent-ink)'
                : 'border border-(--border) bg-(--surface-2) text-(--text)'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 1. CHARACTER 2D / 3D GENERATOR */}
      {subTab === 'character' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-(--border) bg-(--surface) p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-(--text)">Character 2D / 3D-Stack Generator</h3>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playSfx('ui_click');
                  const nextSeed = charSeed + 17;
                  setCharSeed(nextSeed);
                  setCharSpec(generateCharacter(nextSeed, charDim, charArchetype));
                }}
                className="touch-btn inline-flex items-center gap-1.5 rounded-lg bg-(--accent) px-3 text-xs font-extrabold text-(--accent-ink)"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Generate</span>
              </button>
            </div>

            <canvas
              ref={charCanvasRef}
              width={360}
              height={180}
              className="mt-3 w-full rounded-xl border border-(--border)"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-(--text)">
                {charSpec.name} ({charSpec.archetype} · {charSpec.dimension})
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSfx('ui_toggle');
                    onApplyCharacter(customCharacter?.seed === charSpec.seed ? null : charSpec);
                  }}
                  className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold text-(--text)"
                >
                  {customCharacter?.seed === charSpec.seed ? 'Reset to Default Bowo' : 'Apply to Bowo'}
                </button>
                <button
                  type="button"
                  onClick={() => downloadJson(`character_${charSpec.seed}.json`, charSpec)}
                  className="touch-btn inline-flex items-center gap-1 rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>JSON</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
            <h3 className="text-sm font-extrabold text-(--text)">Rig Dimension, Archetype &amp; Animation State</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['2D', '3D-Stack'] as const).map((dim) => (
                <button
                  key={dim}
                  type="button"
                  onClick={() => {
                    soundEngine.playSfx('ui_toggle');
                    setCharDim(dim);
                    setCharSpec(generateCharacter(charSeed, dim, charArchetype));
                  }}
                  className={`touch-btn rounded-xl border font-bold ${
                    charDim === dim ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                  }`}
                >
                  {dim}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {(['Guardian', 'Ranger', 'Mage', 'Knight'] as const).map((arch) => (
                <button
                  key={arch}
                  type="button"
                  onClick={() => {
                    soundEngine.playSfx('ui_click');
                    setCharArchetype(arch);
                    setCharSpec(generateCharacter(charSeed, charDim, arch));
                  }}
                  className={`touch-btn rounded-lg border font-bold ${
                    charArchetype === arch ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                  }`}
                >
                  {arch}
                </button>
              ))}
            </div>

            <div>
              <div className="mb-1.5 font-semibold text-(--muted)">Test Animation State</div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['idle', 'walk', 'jump', 'fall', 'attack', 'dash', 'hurt', 'ko'] as const).map((pose) => (
                  <button
                    key={pose}
                    type="button"
                    onClick={() => {
                      soundEngine.playSfx('ui_click');
                      setCharPose(pose);
                    }}
                    className={`touch-btn rounded-lg border font-bold uppercase ${
                      charPose === pose ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                    }`}
                  >
                    {pose}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. MUSIC GENERATOR */}
      {subTab === 'music' && (
        <section className="rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-(--text)">Procedural 3-Channel Music Generator</h3>
              <p className="text-(--muted)">Generates 16-step Lead, Bass &amp; Percussion tracker loops (0 KB external MP3).</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = musicSeed + 23;
                  setMusicSeed(next);
                  const tr = generateMusicTrack(next, musicScale, musicBpm);
                  setTrackSpec(tr);
                  if (musicPlaying) soundEngine.playCustomTrack(tr);
                }}
                className="touch-btn inline-flex items-center gap-1.5 rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Generate Loop</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (musicPlaying) {
                    soundEngine.stopTracker();
                    setMusicPlaying(false);
                  } else {
                    soundEngine.playCustomTrack(trackSpec);
                    setMusicPlaying(true);
                  }
                }}
                className="touch-btn inline-flex items-center gap-1.5 rounded-lg bg-(--accent) px-4 font-extrabold text-(--accent-ink)"
              >
                {musicPlaying ? <Square className="h-3.5 w-3.5 fill-current" /> : <Music className="h-3.5 w-3.5" />}
                <span>{musicPlaying ? 'Stop' : 'Play Track'}</span>
              </button>
              <button
                type="button"
                onClick={() => downloadJson(`track_${trackSpec.seed}.json`, trackSpec)}
                className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
              >
                Export JSON
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="grid grid-cols-3 gap-1.5">
              {(['pentatonic', 'dorian', 'phrygian'] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => {
                    setMusicScale(sc);
                    const tr = generateMusicTrack(musicSeed, sc, musicBpm);
                    setTrackSpec(tr);
                    if (musicPlaying) soundEngine.playCustomTrack(tr);
                  }}
                  className={`touch-btn rounded-lg border font-bold capitalize ${
                    musicScale === sc ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                  }`}
                >
                  {sc}
                </button>
              ))}
            </div>
            <label className="block">
              <div className="mb-1 flex justify-between font-semibold">
                <span>Tempo BPM</span>
                <span className="font-mono-num">{musicBpm} BPM</span>
              </div>
              <input
                type="range"
                min={90}
                max={170}
                value={musicBpm}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMusicBpm(val);
                  const tr = generateMusicTrack(musicSeed, musicScale, val);
                  setTrackSpec(tr);
                }}
                className="w-full accent-(--accent)"
              />
            </label>
          </div>

          <div className="mt-3 grid grid-cols-8 gap-1 sm:grid-cols-16">
            {trackSpec.leadNotes.map((freq, idx) => (
              <div
                key={idx}
                className="flex h-12 flex-col items-center justify-end rounded border border-(--border) bg-(--surface-2) p-1"
              >
                <div
                  className="w-full rounded-sm bg-(--accent)"
                  style={{ height: freq === 0 ? '4%' : `${Math.min(100, Math.round((freq / 550) * 100))}%` }}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. SFX GENERATOR */}
      {subTab === 'sfx' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-(--text)">Procedural SFX Synthesizer</h3>
              <button
                type="button"
                onClick={() => soundEngine.playCustomSfx(sfxSpec)}
                className="touch-btn inline-flex items-center gap-1.5 rounded-lg bg-(--accent) px-4 font-extrabold text-(--accent-ink)"
              >
                <Volume2 className="h-4 w-4" />
                <span>Test SFX</span>
              </button>
            </div>
            <canvas ref={sfxCanvasRef} width={360} height={130} className="mt-3 w-full rounded-xl border border-(--border)" />
            <div className="mt-2 flex items-center justify-between text-(--muted)">
              <span>
                {sfxSpec.name} · {sfxSpec.wave} · {sfxSpec.freqStart}Hz -&gt; {sfxSpec.freqEnd}Hz
              </span>
              <button
                type="button"
                onClick={() => downloadJson(`sfx_${sfxSpec.name}.json`, sfxSpec)}
                className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold text-(--text)"
              >
                JSON
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
            <h3 className="text-sm font-extrabold text-(--text)">Presets &amp; Sweep Tuning</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {(['jump', 'slash', 'coin', 'laser', 'impact', 'ui_chime'] as const).map((pre) => (
                <button
                  key={pre}
                  type="button"
                  onClick={() => {
                    setSfxPreset(pre);
                    const next = generateSfxSpec(sfxSeed + 5, pre);
                    setSfxSeed(sfxSeed + 5);
                    setSfxSpec(next);
                    soundEngine.playCustomSfx(next);
                  }}
                  className={`touch-btn rounded-lg border font-bold uppercase ${
                    sfxPreset === pre ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                  }`}
                >
                  {pre}
                </button>
              ))}
            </div>
            <label className="block">
              <div className="mb-1 flex justify-between font-semibold">
                <span>Start Frequency</span>
                <span className="font-mono-num">{sfxSpec.freqStart} Hz</span>
              </div>
              <input
                type="range"
                min={80}
                max={1200}
                value={sfxSpec.freqStart}
                onChange={(e) => setSfxSpec({ ...sfxSpec, freqStart: Number(e.target.value) })}
                className="w-full accent-(--accent)"
              />
            </label>
            <label className="block">
              <div className="mb-1 flex justify-between font-semibold">
                <span>End Frequency</span>
                <span className="font-mono-num">{sfxSpec.freqEnd} Hz</span>
              </div>
              <input
                type="range"
                min={40}
                max={1400}
                value={sfxSpec.freqEnd}
                onChange={(e) => setSfxSpec({ ...sfxSpec, freqEnd: Number(e.target.value) })}
                className="w-full accent-(--accent)"
              />
            </label>
          </div>
        </section>
      )}

      {/* 4. VIDEO / CUTSCENE & ANIMATION SYSTEM GENERATOR */}
      {subTab === 'video' && (
        <section className="rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-(--text)">Video / Cutscene &amp; Animation State Sequencer</h3>
              <p className="text-(--muted)">Plays multi-keyframe animation timelines and exports WebM clips or JSON storyboards.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCutPlaying((p) => !p)}
                className="touch-btn inline-flex items-center gap-1.5 rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
              >
                <Play className="h-3.5 w-3.5" />
                <span>{cutPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = cutSeed + 19;
                  setCutSeed(next);
                  setCutSpec(generateCutsceneSpec(next, cutWeather));
                }}
                className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
              >
                New Cutscene
              </button>
              <button
                type="button"
                onClick={exportCutsceneVideo}
                className="touch-btn inline-flex items-center gap-1.5 rounded-lg bg-(--accent) px-4 font-extrabold text-(--accent-ink)"
              >
                <Film className="h-3.5 w-3.5" />
                <span>Export Video</span>
              </button>
            </div>
          </div>

          <canvas ref={cutCanvasRef} width={540} height={220} className="mt-3 w-full rounded-xl border border-(--border)" />
          {videoExportMsg && <div className="mt-2 font-semibold text-(--accent)">{videoExportMsg}</div>}

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {cutSpec.keyframes.map((kf, i) => (
              <div key={i} className="rounded-lg border border-(--border) bg-(--surface-2) p-2">
                <div className="font-mono-num font-bold text-(--text)">
                  {kf.timeSec.toFixed(1)}s · {kf.pose.toUpperCase()} ({kf.effect})
                </div>
                <div className="mt-0.5 text-(--muted)">{kf.caption}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. TERRAIN 2D / 3D GENERATOR */}
      {subTab === 'terrain' && (
        <section className="rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-(--text)">Terrain 2D / 3D Heightmap Generator</h3>
              <p className="text-(--muted)">Deterministic 48-column Voxel-Space heightmap &amp; platform builder.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = terSeed + 31;
                  setTerSeed(next);
                  setTerSpec(generateTerrainSpec(next, terMode, terBiome));
                }}
                className="touch-btn inline-flex items-center gap-1.5 rounded-lg bg-(--accent) px-4 font-extrabold text-(--accent-ink)"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Generate Terrain</span>
              </button>
              <button
                type="button"
                onClick={() => downloadJson(`terrain_${terSpec.seed}.json`, terSpec)}
                className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
              >
                Export JSON
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(['2D', '3D-Heightmap'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setTerMode(m);
                  setTerSpec(generateTerrainSpec(terSeed, m, terBiome));
                }}
                className={`touch-btn rounded-lg border px-3 font-bold ${
                  terMode === m ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                }`}
              >
                {m}
              </button>
            ))}
            {(['meadow', 'storm', 'obsidian'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => {
                  setTerBiome(b);
                  setTerSpec(generateTerrainSpec(terSeed, terMode, b));
                }}
                className={`touch-btn rounded-lg border px-3 font-bold capitalize ${
                  terBiome === b ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          <canvas ref={terCanvasRef} width={540} height={210} className="mt-3 w-full rounded-xl border border-(--border)" />
        </section>
      )}

      {/* 6. OTHER ASSETS GENERATOR */}
      {subTab === 'props' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-(--text)">Other Props &amp; Pickup Generator</h3>
              <button
                type="button"
                onClick={() => {
                  const next = propSeed + 11;
                  setPropSeed(next);
                  setPropSpec(generatePropAsset(next, propKind));
                }}
                className="touch-btn rounded-lg bg-(--accent) px-3 font-extrabold text-(--accent-ink)"
              >
                Generate Prop
              </button>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <canvas ref={propCanvasRef} width={160} height={160} className="pixel-crisp rounded-xl border border-(--border)" />
              <div className="space-y-2">
                <div className="text-sm font-extrabold text-(--text)">{propSpec.name}</div>
                <div className="text-(--muted)">Category: {propSpec.kind} · 10x10 compact bitmap</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const rec = assetManager.registerAsset({
                        id: `gen_${propSpec.kind}_${propSpec.seed}`,
                        label: propSpec.name,
                        category: 'generated',
                        levelScope: 0,
                        estimatedBytes: 12_000,
                      });
                      assetManager.loadAsset(rec.id);
                      setPropMsg(`Registered & loaded "${rec.label}" in Asset Manager!`);
                    }}
                    className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
                  >
                    Register to Asset Manager
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadJson(`prop_${propSpec.seed}.json`, propSpec)}
                    className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
                  >
                    JSON
                  </button>
                </div>
                {propMsg && <div className="font-semibold text-(--accent)">{propMsg}</div>}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
            <h3 className="text-sm font-extrabold text-(--text)">Select Asset Archetype</h3>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(['potion', 'chest', 'crystal', 'torch', 'emblem'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setPropKind(k);
                    setPropSpec(generatePropAsset(propSeed, k));
                  }}
                  className={`touch-btn rounded-xl border font-bold capitalize ${
                    propKind === k ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
