import { Box, Download, Film, Music, Play, RefreshCw, Sparkles, Square, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { drawBowoCharacter, drawGroundTile, drawRockAsset, drawTreeAsset, getStyleSpec } from '../engine/artStyles';
import { assetManager } from '../engine/assetManager';
import { soundEngine } from '../engine/audio';
import {
  ATELIER_PRESETS,
  composeMovieFromPrompt,
  generateCharacter,
  generateCompleteGameBlueprint,
  generateCutsceneSpec,
  generateDubbingSubtitleSpec,
  generateGameplaySceneAndRules,
  generateImageSpriteFromPrompt,
  generateMesh3DFromPrompt,
  generateMusicTrack,
  generatePlatformTargetSpec,
  generatePropAsset,
  generateRig3DFromPrompt,
  generateSfxSpec,
  generateStateMachineSpec,
  generateTerrainSpec,
  parseAtelierSetupJson,
} from '../engine/generators';
import { CURATED_GITHUB_PLUGINS } from '../engine/githubConnectors';
import { renderMesh3DPreview, renderVoxelHeightmapTerrain } from '../engine/pseudo3d';
import { CAMERA_3_PRESETS } from '../engine/qolbuSpace3d';
import type {
  ArtStyleId,
  Camera3DPresetId,
  CharacterAnimState,
  GeneratedCharacterSpec,
  GeneratedGameBlueprintSpec,
  GeneratedMesh3DSpec,
  GeneratedPropSpec,
  GeneratedSfxSpec,
  GeneratedTargetConfigSpec,
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
  cameraPreset?: Camera3DPresetId;
  setCameraPreset?: (c: Camera3DPresetId) => void;
  activeGitHubRepoId?: string;
  onLaunchBlueprint?: (bp: GeneratedGameBlueprintSpec) => void;
}

type GenSection = 'character' | 'image' | 'music' | 'sfx' | 'video' | 'terrain' | 'systems' | 'targets';

function downloadText(name: string, text: string, mime = 'application/json') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJson(name: string, payload: unknown) {
  downloadText(name, JSON.stringify(payload, null, 2), 'application/json');
}

export function StudioGeneratorsTab({
  styleId,
  customPalettes,
  styleOverrides,
  customCharacter,
  onApplyCharacter,
  cameraPreset = 'follow_3_4',
  setCameraPreset,
  activeGitHubRepoId = 'gh_tripo_sr',
  onLaunchBlueprint,
}: StudioGeneratorsTabProps) {
  const style = getStyleSpec(styleId, customPalettes);
  const [subTab, setSubTab] = useState<GenSection>('character');

  // 1. Character 2D/3D + CharacterAtelier Presets + Tripo/Meshy Low-Poly 3D Mesh
  const [charSeed, setCharSeed] = useState(404);
  const [charDim, setCharDim] = useState<'2D' | '3D-Stack'>('3D-Stack');
  const [charArchetype, setCharArchetype] = useState<GeneratedCharacterSpec['archetype']>('Guardian');
  const [charPose, setCharPose] = useState<CharacterAnimState>('idle');
  const [charPrompt, setCharPrompt] = useState('Guardian of Dawn Light');
  const [atelierPreset, setAtelierPreset] = useState<keyof typeof ATELIER_PRESETS>('warm_eco');
  const [atelierMsg, setAtelierMsg] = useState('');
  const [charSpec, setCharSpec] = useState<GeneratedCharacterSpec>(() => generateCharacter(404, '3D-Stack', 'Guardian'));
  const charCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [meshPrompt, setMeshPrompt] = useState('Armored Dawn Knight');
  const [meshArch, setMeshArch] = useState<GeneratedMesh3DSpec['archetype']>('character');
  const [meshRepoId, setMeshRepoId] = useState('gh_tripo_sr');
  const [meshBox12, setMeshBox12] = useState(false);
  const [meshLod, setMeshLod] = useState<0 | 1 | 2>(0);
  const [meshWireframe, setMeshWireframe] = useState(false);
  const [meshYawDeg, setMeshYawDeg] = useState(28);
  const [meshCam, setMeshCam] = useState<Camera3DPresetId>(cameraPreset);
  const [meshSpec, setMeshSpec] = useState<GeneratedMesh3DSpec>(() =>
    generateMesh3DFromPrompt(404, 'Armored Dawn Knight', 'character', 'gh_tripo_sr', false)
  );
  const meshCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 2. Image / Sprite from Text + Other Props
  const [imgPrompt, setImgPrompt] = useState('Lantern Guardian Crest');
  const [imgSeed, setImgSeed] = useState(505);
  const [imgSpec, setImgSpec] = useState(() => generateImageSpriteFromPrompt(505, 'Lantern Guardian Crest', styleId));
  const imgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [propSeed, setPropSeed] = useState(303);
  const [propKind, setPropKind] = useState<GeneratedPropSpec['kind']>('potion');
  const [propSpec, setPropSpec] = useState<GeneratedPropSpec>(() => generatePropAsset(303, 'potion'));
  const [propMsg, setPropMsg] = useState('');
  const propCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3. Music
  const [musicSeed, setMusicSeed] = useState(120);
  const [musicScale, setMusicScale] = useState<GeneratedTrackSpec['scale']>('pentatonic');
  const [musicBpm, setMusicBpm] = useState(128);
  const [trackSpec, setTrackSpec] = useState<GeneratedTrackSpec>(() => generateMusicTrack(120, 'pentatonic', 128));
  const [musicPlaying, setMusicPlaying] = useState(false);

  // 4. SFX + Dubbing & Subtitles
  const [sfxSeed, setSfxSeed] = useState(88);
  const [sfxPreset, setSfxPreset] = useState<'jump' | 'slash' | 'coin' | 'laser' | 'impact' | 'ui_chime'>('jump');
  const [sfxSpec, setSfxSpec] = useState<GeneratedSfxSpec>(() => generateSfxSpec(88, 'jump'));
  const sfxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dubSpeaker, setDubSpeaker] = useState('Bowo');
  const [dubText, setDubText] = useState('Cahaya desa harus kita jaga bersama!');
  const [dubSpec, setDubSpec] = useState(() => generateDubbingSubtitleSpec(88, 'Bowo', 'Cahaya desa harus kita jaga bersama!', 'id'));

  // 5. Video / Cutscene / Movie Composer
  const [cutSeed, setCutSeed] = useState(777);
  const [cutWeather] = useState<WeatherKind>('Cerah');
  const [moviePrompt, setMoviePrompt] = useState('jalan lompat dash serang');
  const [cutSpec, setCutSpec] = useState(() => generateCutsceneSpec(777, 'Cerah'));
  const [cutPlaying, setCutPlaying] = useState(true);
  const [videoExportMsg, setVideoExportMsg] = useState('');
  const cutCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 6. Terrain 2D/3D
  const [terSeed, setTerSeed] = useState(909);
  const [terMode, setTerMode] = useState<'2D' | '3D-Heightmap'>('3D-Heightmap');
  const [terBiome, setTerBiome] = useState<GeneratedTerrainSpec['biome']>('meadow');
  const [terSpec, setTerSpec] = useState<GeneratedTerrainSpec>(() => generateTerrainSpec(909, '3D-Heightmap', 'meadow'));
  const terCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 7. Movement / Behavior State Systems & Complete Playable Game Forge
  const [fsmKind, setFsmKind] = useState<'movement' | 'behavior'>('movement');
  const [fsmPrompt, setFsmPrompt] = useState('Agile Guardian Combo');
  const [fsmSpec, setFsmSpec] = useState(() => generateStateMachineSpec(101, 'movement', 'Agile Guardian Combo'));
  const [scenePrompt, setScenePrompt] = useState('Isometric Cyber Guardian Co-Op');
  const [sceneBundle, setSceneBundle] = useState(() => generateGameplaySceneAndRules(202, 'Isometric Cyber Guardian Co-Op'));
  const [gameBlueprint, setGameBlueprint] = useState<GeneratedGameBlueprintSpec>(() =>
    generateCompleteGameBlueprint(202, 'Isometric Cyber Guardian Co-Op', activeGitHubRepoId)
  );

  // 8. Web / APK / MCP / AI Engine Targets
  const [targetKind, setTargetKind] = useState<GeneratedTargetConfigSpec['target']>('apk');
  const [targetAppName, setTargetAppName] = useState('Bowo: Penjaga Cahaya');
  const [targetSpec, setTargetSpec] = useState(() => generatePlatformTargetSpec(303, 'apk', 'Bowo: Penjaga Cahaya'));

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

  // Render QolbuSpace3D Low-Poly Mesh Turntable (Tripo3D / Meshy Parity)
  useEffect(() => {
    if (subTab !== 'character') return;
    const canvas = meshCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderMesh3DPreview(ctx, canvas.width, canvas.height, meshSpec, {
      yawRad: (meshYawDeg * Math.PI) / 180,
      pitchRad: 0.08,
      cameraPreset: meshCam,
      lod: meshLod,
      wireframe: meshWireframe,
    });
  }, [meshCam, meshLod, meshSpec, meshWireframe, meshYawDeg, subTab]);

  // Draw Text-to-Sprite + Prop previews
  useEffect(() => {
    if (subTab !== 'image') return;
    const c1 = imgCanvasRef.current;
    if (c1) {
      const ctx = c1.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#090f1a';
        ctx.fillRect(0, 0, c1.width, c1.height);
        const cell = Math.floor(c1.width / 16);
        for (let r = 0; r < 16; r++) {
          for (let c = 0; c < 16; c++) {
            const v = imgSpec.grid[r][c];
            if (v === 0) continue;
            ctx.fillStyle = imgSpec.palette[(v - 1) % imgSpec.palette.length];
            ctx.fillRect(c * cell + 1, r * cell + 1, cell - 1, cell - 1);
          }
        }
      }
    }
    const c2 = propCanvasRef.current;
    if (c2) {
      const ctx = c2.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, c2.width, c2.height);
        const cell = Math.floor(c2.width / 10);
        for (let r = 0; r < 10; r++) {
          for (let c = 0; c < 10; c++) {
            const v = propSpec.pixelGrid[r][c];
            if (v === 0) continue;
            ctx.fillStyle = v === 2 ? propSpec.glowColor : propSpec.primaryColor;
            ctx.fillRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4);
          }
        }
      }
    }
  }, [imgSpec, propSpec, subTab]);

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
    const startMs = performance.now();
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

  const handleAtelierImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const text = await f.text();
    const res = parseAtelierSetupJson(text);
    if (!res.ok || !res.character) {
      setAtelierMsg(res.error ?? 'Failed to parse Atelier setup.');
      return;
    }
    setCharSpec(res.character);
    onApplyCharacter(res.character);
    setAtelierMsg(`Imported ${res.character.name} (${res.poseCount ?? 0} bone pose entries) & equipped to Bowo!`);
  };

  const playDubbingPreview = () => {
    soundEngine.playCustomSfx({
      seed: dubSpec.seed,
      name: 'Dubbing Voice',
      wave: 'triangle',
      freqStart: dubSpec.pitchHz,
      freqEnd: Math.round(dubSpec.pitchHz * 1.18),
      durationSec: 0.24,
      volume: 0.14,
    });
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(dubSpec.text);
        utter.lang = dubSpec.lang === 'id' ? 'id-ID' : 'en-US';
        utter.rate = dubSpec.rate;
        window.speechSynthesis.speak(utter);
      } catch {
        // Offline synth fallback already played
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-navigation across unified generators */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-(--border) bg-(--surface) p-2">
        {(
          [
            ['character', '3D & Character'],
            ['image', 'Image & Props'],
            ['music', 'Music'],
            ['sfx', 'SFX & Dubbing'],
            ['video', 'Video & Movie'],
            ['terrain', 'Terrain 2D/3D'],
            ['systems', 'FSM & Gameplay'],
            ['targets', 'Web / APK / MCP'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              soundEngine.playSfx('ui_tab');
              setSubTab(id);
            }}
            className={`touch-btn rounded-lg px-3 text-xs font-bold transition ${
              subTab === id
                ? 'bg-(--accent) text-(--accent-ink)'
                : 'border border-(--border) bg-(--surface-2) text-(--text)'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 1. CHARACTER 2D / 3D + ATELIER RIG GENERATOR */}
      {subTab === 'character' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-(--border) bg-(--surface) p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-(--text)">Text/Image to 3D Rig &amp; Atelier</h3>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playSfx('ui_click');
                  const nextSeed = charSeed + 17;
                  setCharSeed(nextSeed);
                  setCharSpec(generateRig3DFromPrompt(nextSeed, charPrompt, atelierPreset).character);
                }}
                className="touch-btn inline-flex items-center gap-1.5 rounded-lg bg-(--accent) px-3 text-xs font-extrabold text-(--accent-ink)"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Generate</span>
              </button>
            </div>

            <div className="mt-2.5 flex gap-2">
              <input
                type="text"
                value={charPrompt}
                onChange={(e) => setCharPrompt(e.target.value)}
                placeholder="Prompt e.g. Knight of Light"
                className="touch-btn flex-1 rounded-xl border border-(--border) bg-(--surface-2) px-3 text-xs font-medium text-(--text)"
              />
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
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSfx('ui_toggle');
                    onApplyCharacter(customCharacter?.seed === charSpec.seed ? null : charSpec);
                  }}
                  className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold text-(--text)"
                >
                  {customCharacter?.seed === charSpec.seed ? 'Reset Default' : 'Apply to Bowo'}
                </button>
                <label className="touch-btn flex cursor-pointer items-center rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold">
                  <span>Import Atelier JSON</span>
                  <input type="file" accept=".json,application/json" onChange={handleAtelierImport} className="hidden" />
                </label>
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
            {atelierMsg && <div className="mt-2 text-xs font-semibold text-(--accent)">{atelierMsg}</div>}
          </div>

          <div className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
            <h3 className="text-sm font-extrabold text-(--text)">Dimension, Atelier Bone Preset &amp; Poses</h3>
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

            <div className="grid grid-cols-3 gap-1.5">
              {([
                ['warm_eco', 'Warm Eco'],
                ['mint_agile', 'Mint Agile'],
                ['cobalt_knight', 'Cobalt'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setAtelierPreset(key);
                    const res = generateRig3DFromPrompt(charSeed, charPrompt, key);
                    setCharSpec(res.character);
                  }}
                  className={`touch-btn rounded-lg border font-bold ${
                    atelierPreset === key ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                  }`}
                >
                  {label}
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
              <div className="mb-1.5 font-semibold text-(--muted)">Animation State Preview</div>
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

          {/* QOLBU SPACE 3D: TRIPO3D / MESHY LOW-POLY MESH GENERATOR (OBJ + GLTF 2.0) */}
          <div className="rounded-xl border border-(--border) bg-(--surface) p-4 lg:col-span-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4 text-(--accent)" />
                <div>
                  <h3 className="text-sm font-extrabold text-(--text)">
                    3D Mesh Generator (Tripo3D / Meshy Parity · QolbuSpace3D)
                  </h3>
                  <p className="text-[11px] text-(--muted)">
                    Real LookAt+Perspective geometry · {meshSpec.shaderTag} · {meshSpec.atlasBudget}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  data-testid="generate-3d-mesh-btn"
                  onClick={() => {
                    soundEngine.playSfx('ui_click');
                    const nextSeed = meshSpec.seed + 37;
                    setMeshSpec(generateMesh3DFromPrompt(nextSeed, meshPrompt, meshArch, meshRepoId, meshBox12));
                  }}
                  className="touch-btn inline-flex items-center gap-1.5 rounded-lg bg-(--accent) px-3 font-extrabold text-(--accent-ink)"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Generate 3D Mesh</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadText(`${meshSpec.title.replace(/\s+/g, '_')}.obj`, meshSpec.objText, 'text/plain')}
                  className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
                >
                  Export .OBJ
                </button>
                <button
                  type="button"
                  data-testid="export-gltf-btn"
                  onClick={() => downloadText(`${meshSpec.title.replace(/\s+/g, '_')}.gltf`, meshSpec.gltfJson, 'model/gltf+json')}
                  className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
                >
                  Export .glTF 2.0
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <canvas
                  ref={meshCanvasRef}
                  data-testid="mesh-3d-canvas"
                  width={440}
                  height={230}
                  className="w-full rounded-xl border border-(--border)"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex flex-1 items-center gap-2 font-semibold text-(--muted)">
                    <span>Turntable Yaw</span>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={meshYawDeg}
                      onChange={(e) => setMeshYawDeg(Number(e.target.value))}
                      className="flex-1 accent-(--accent)"
                    />
                    <span className="font-mono-num w-10 text-right text-(--text)">{meshYawDeg}°</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMeshWireframe((w) => !w)}
                    className={`touch-btn rounded-lg border px-2.5 font-bold ${
                      meshWireframe ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                    }`}
                  >
                    {meshWireframe ? 'Wireframe ON' : 'Shaded'}
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 lg:col-span-6">
                <input
                  type="text"
                  data-testid="mesh-3d-prompt"
                  value={meshPrompt}
                  onChange={(e) => setMeshPrompt(e.target.value)}
                  placeholder="Describe 3D model: Armored Knight, Crystal Citadel, Hover Racer..."
                  className="touch-btn w-full rounded-xl border border-(--border) bg-(--surface-2) px-3 text-xs font-medium text-(--text)"
                />

                <div className="grid grid-cols-5 gap-1.5">
                  {(['character', 'citadel', 'vehicle', 'crystal', 'prop'] as const).map((arch) => (
                    <button
                      key={arch}
                      type="button"
                      onClick={() => {
                        setMeshArch(arch);
                        setMeshSpec(generateMesh3DFromPrompt(meshSpec.seed, meshPrompt, arch, meshRepoId, meshBox12));
                      }}
                      className={`touch-btn rounded-lg border px-1.5 font-bold capitalize ${
                        meshArch === arch ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                      }`}
                    >
                      {arch}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {CAMERA_3_PRESETS.map((cam) => (
                    <button
                      key={cam.id}
                      type="button"
                      onClick={() => {
                        setMeshCam(cam.id);
                        setCameraPreset?.(cam.id);
                      }}
                      className={`touch-btn rounded-lg border px-2 font-bold ${
                        meshCam === cam.id ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                      }`}
                    >
                      {cam.shortTag}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {([0, 1, 2] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setMeshLod(lvl)}
                      className={`touch-btn flex-1 rounded-lg border px-2 font-bold ${
                        meshLod === lvl ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                      }`}
                    >
                      LOD{lvl} ({lvl === 0 ? meshSpec.lodCounts.lod0 : lvl === 1 ? meshSpec.lodCounts.lod1 : meshSpec.lodCounts.lod2}t)
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const nextBox = !meshBox12;
                      setMeshBox12(nextBox);
                      setMeshSpec(generateMesh3DFromPrompt(meshSpec.seed, meshPrompt, meshArch, meshRepoId, nextBox));
                    }}
                    className={`touch-btn rounded-lg border px-2.5 font-bold ${
                      meshBox12 ? 'border-emerald-400 bg-emerald-500 text-slate-950' : 'border-(--border) bg-(--surface-2)'
                    }`}
                  >
                    12-Tri Box
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {CURATED_GITHUB_PLUGINS.filter((p) => p.category === '3d_mesh_generators').map((rep) => (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => {
                        setMeshRepoId(rep.id);
                        setMeshSpec(generateMesh3DFromPrompt(meshSpec.seed, meshPrompt, meshArch, rep.id, meshBox12));
                      }}
                      className={`touch-btn rounded-lg border px-2.5 text-[11px] font-bold ${
                        meshRepoId === rep.id ? 'border-sky-400 bg-sky-500/20 text-sky-300' : 'border-(--border) bg-(--surface-2)'
                      }`}
                    >
                      {rep.repo}
                    </button>
                  ))}
                </div>

                <div className="font-mono-num rounded-xl border border-(--border) bg-slate-950/80 p-2.5 text-[11px] text-emerald-300">
                  Tris: {meshSpec.triangles.length}/{meshSpec.triBudgetLimit} (A70 Safe) · Verts: {meshSpec.vertices.length} · Est DC: {meshSpec.drawCallsEst} · Blob Shadow: ON
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. IMAGE FROM TEXT & OTHER ASSETS */}
      {subTab === 'image' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-(--text)">Image / Sprite from Text Generator</h3>
              <button
                type="button"
                onClick={() => {
                  const next = imgSeed + 13;
                  setImgSeed(next);
                  setImgSpec(generateImageSpriteFromPrompt(next, imgPrompt, styleId));
                }}
                className="touch-btn rounded-lg bg-(--accent) px-3 font-extrabold text-(--accent-ink)"
              >
                Generate Sprite
              </button>
            </div>
            <input
              type="text"
              value={imgPrompt}
              onChange={(e) => setImgPrompt(e.target.value)}
              placeholder="Describe sprite (fire sword, forest slime, cyber shield)"
              className="touch-btn mt-2.5 w-full rounded-xl border border-(--border) bg-(--surface-2) px-3 text-xs font-medium text-(--text)"
            />
            <div className="mt-3 flex items-center gap-4">
              <canvas ref={imgCanvasRef} width={160} height={160} className="pixel-crisp rounded-xl border border-(--border)" />
              <div className="space-y-2">
                <div className="text-sm font-extrabold text-(--text)">{imgSpec.title}</div>
                <div className="text-(--muted)">16×16 zero-dependency procedural bitmap ({imgSpec.styleId})</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const rec = assetManager.registerAsset({
                        id: `sprite_${imgSpec.seed}`,
                        label: imgSpec.title,
                        category: 'generated',
                        levelScope: 0,
                        estimatedBytes: 14_000,
                      });
                      assetManager.loadAsset(rec.id);
                      setPropMsg(`Registered "${rec.label}" to Asset Manager!`);
                    }}
                    className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
                  >
                    Save to Asset Cache
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadJson(`sprite_${imgSpec.seed}.json`, imgSpec)}
                    className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
                  >
                    JSON
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-(--text)">Props &amp; Pickups Generator</h3>
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
              <canvas ref={propCanvasRef} width={140} height={140} className="pixel-crisp rounded-xl border border-(--border)" />
              <div className="space-y-2">
                <div className="text-sm font-extrabold text-(--text)">{propSpec.name}</div>
                <div className="flex flex-wrap gap-1.5">
                  {(['potion', 'chest', 'crystal', 'torch', 'emblem'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setPropKind(k);
                        setPropSpec(generatePropAsset(propSeed, k));
                      }}
                      className={`touch-btn rounded-lg border px-2.5 font-bold capitalize ${
                        propKind === k ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                {propMsg && <div className="font-semibold text-(--accent)">{propMsg}</div>}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. MUSIC GENERATOR */}
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

      {/* 4. SFX SYNTH + DUBBING & SUBTITLE GENERATOR */}
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
            <canvas ref={sfxCanvasRef} width={360} height={110} className="mt-3 w-full rounded-xl border border-(--border)" />
            <div className="mt-2 grid grid-cols-3 gap-1.5">
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
          </div>

          <div className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-(--text)">Dubbing &amp; Subtitle (SRT / VTT)</h3>
              <button
                type="button"
                onClick={playDubbingPreview}
                className="touch-btn rounded-lg bg-(--accent) px-3 font-extrabold text-(--accent-ink)"
              >
                Speak &amp; Preview
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={dubSpeaker}
                onChange={(e) => {
                  setDubSpeaker(e.target.value);
                  setDubSpec(generateDubbingSubtitleSpec(sfxSeed, e.target.value, dubText, 'id'));
                }}
                placeholder="Speaker"
                className="touch-btn rounded-xl border border-(--border) bg-(--surface-2) px-2.5 text-xs font-semibold text-(--text)"
              />
              <input
                type="text"
                value={dubText}
                onChange={(e) => {
                  setDubText(e.target.value);
                  setDubSpec(generateDubbingSubtitleSpec(sfxSeed, dubSpeaker, e.target.value, 'id'));
                }}
                placeholder="Dialogue text..."
                className="touch-btn col-span-2 rounded-xl border border-(--border) bg-(--surface-2) px-2.5 text-xs font-medium text-(--text)"
              />
            </div>
            <pre className="font-mono-num whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-[11px] text-sky-300">
              {dubSpec.srtText}
            </pre>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => downloadText(`subtitle_${dubSpec.seed}.srt`, dubSpec.srtText, 'text/plain')}
                className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
              >
                Export .SRT
              </button>
              <button
                type="button"
                onClick={() => downloadText(`subtitle_${dubSpec.seed}.vtt`, dubSpec.vttText, 'text/vtt')}
                className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
              >
                Export .VTT
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 5. VIDEO / CUTSCENE / MOVIE COMPOSER */}
      {subTab === 'video' && (
        <section className="rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-(--text)">Video / Cutscene / Movie &amp; Image-to-Video</h3>
              <p className="text-(--muted)">Compose action timelines from verbs (jalan, lompat, dash, serang) &amp; export WebM or JSON.</p>
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
                onClick={exportCutsceneVideo}
                className="touch-btn inline-flex items-center gap-1.5 rounded-lg bg-(--accent) px-4 font-extrabold text-(--accent-ink)"
              >
                <Film className="h-3.5 w-3.5" />
                <span>Export Video</span>
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="text"
              value={moviePrompt}
              onChange={(e) => setMoviePrompt(e.target.value)}
              placeholder="e.g. diam jalan lompat dash serang burst"
              className="touch-btn flex-1 rounded-xl border border-(--border) bg-(--surface-2) px-3 text-xs font-medium text-(--text)"
            />
            <button
              type="button"
              onClick={() => {
                const next = cutSeed + 19;
                setCutSeed(next);
                setCutSpec(composeMovieFromPrompt(moviePrompt, next, cutWeather));
              }}
              className="touch-btn rounded-xl bg-(--accent) px-4 font-extrabold text-(--accent-ink)"
            >
              Compose Movie
            </button>
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

      {/* 6. TERRAIN 2D / 3D GENERATOR */}
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

      {/* 7. MOVEMENT & BEHAVIOR STATE SYSTEM + GAMEPLAY SCENE / UI / PHYSICS GENERATOR */}
      {subTab === 'systems' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-(--text)">Movement &amp; Behavior State Machine</h3>
              <div className="flex gap-1.5">
                {(['movement', 'behavior'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setFsmKind(k);
                      setFsmSpec(generateStateMachineSpec(fsmSpec.seed + 7, k, fsmPrompt));
                    }}
                    className={`touch-btn rounded-lg border px-3 font-bold capitalize ${
                      fsmKind === k ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={fsmPrompt}
                onChange={(e) => setFsmPrompt(e.target.value)}
                className="touch-btn flex-1 rounded-xl border border-(--border) bg-(--surface-2) px-3 text-xs"
              />
              <button
                type="button"
                onClick={() => setFsmSpec(generateStateMachineSpec(fsmSpec.seed + 13, fsmKind, fsmPrompt))}
                className="touch-btn rounded-xl bg-(--accent) px-3 font-extrabold text-(--accent-ink)"
              >
                Build FSM
              </button>
            </div>
            <div className="grid gap-1.5">
              {fsmSpec.transitions.map((tr, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-(--surface-2) px-3 py-1.5 font-mono-num">
                  <span className="font-bold text-(--text)">{tr.from}</span>
                  <span className="text-(--accent)">--[{tr.event}]--&gt;</span>
                  <span className="font-bold text-emerald-400">{tr.to}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => downloadJson(`fsm_${fsmKind}_${fsmSpec.seed}.json`, fsmSpec)}
              className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
            >
              Export FSM + Bytecode JSON
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-(--text)">Complete Game Forge (InstaPlay / AI Dev Parity)</h3>
                <p className="text-[11px] text-(--muted)">Prompt -&gt; Playable 3-Level Game + 3 Prefabs + GitHub Stack + QolbuSpace3D</p>
              </div>
              <button
                type="button"
                data-testid="generate-full-game-btn"
                onClick={() => {
                  soundEngine.playSfx('ui_click');
                  const nextSeed = sceneBundle.seed + 29;
                  setSceneBundle(generateGameplaySceneAndRules(nextSeed, scenePrompt));
                  setGameBlueprint(generateCompleteGameBlueprint(nextSeed, scenePrompt, activeGitHubRepoId));
                }}
                className="touch-btn rounded-lg bg-(--accent) px-3 font-extrabold text-(--accent-ink)"
              >
                Generate Full Game
              </button>
            </div>
            <input
              type="text"
              data-testid="full-game-prompt"
              value={scenePrompt}
              onChange={(e) => setScenePrompt(e.target.value)}
              placeholder="e.g. Isometric Cyber RPG, FPS Raycast Dungeon, Mode-7 Turbo Race, Space Danmaku"
              className="touch-btn w-full rounded-xl border border-(--border) bg-(--surface-2) px-3 text-xs"
            />
            <div className="flex flex-wrap gap-1.5">
              {[
                'Isometric Cyber RPG',
                'FPS Raycast Dungeon',
                'Mode-7 Turbo Race',
                'Space Danmaku Co-Op',
                'Hex Tactical Bastion',
              ].map((pre) => (
                <button
                  key={pre}
                  type="button"
                  onClick={() => {
                    setScenePrompt(pre);
                    setSceneBundle(generateGameplaySceneAndRules(sceneBundle.seed + 7, pre));
                    setGameBlueprint(generateCompleteGameBlueprint(gameBlueprint.seed + 7, pre, activeGitHubRepoId));
                  }}
                  className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-2.5 text-[11px] font-bold"
                >
                  {pre}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-(--border) bg-(--surface-2) p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-(--text)">{gameBlueprint.title}</span>
                <span className="font-mono-num text-[10px] font-bold text-emerald-400">
                  {gameBlueprint.budgetReport.targetFps} FPS · {gameBlueprint.budgetReport.drawCallsEst} DC · {gameBlueprint.budgetReport.trisEst} tris
                </span>
              </div>
              <div className="font-mono-num text-(--muted)">
                Genre: {gameBlueprint.genreId} ({gameBlueprint.simKind}) · {gameBlueprint.hybridMode} · {gameBlueprint.cameraPreset} · AI: {gameBlueprint.aiMode}
              </div>
              <div className="font-mono-num text-[11px] text-sky-300">
                GitHub Stack: {gameBlueprint.repoStack.join(' + ')}
              </div>
              <div className="grid gap-1 pt-1 sm:grid-cols-3">
                {gameBlueprint.prefabs.map((pf) => (
                  <div key={pf.name} className="rounded-lg bg-slate-950/75 p-1.5 text-[10px]">
                    <div className="font-bold text-(--text)">{pf.name}</div>
                    <div className="font-mono-num text-(--muted)">{pf.triCount} tris · {pf.collider}</div>
                  </div>
                ))}
              </div>
              <div className="pt-1 space-y-0.5">
                {gameBlueprint.rules.map((r, i) => (
                  <div key={i} className="font-mono-num text-[11px] text-emerald-300">
                    WHEN {r.condition} -&gt; THEN {r.action}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {onLaunchBlueprint && (
                <button
                  type="button"
                  data-testid="launch-generated-game-btn"
                  onClick={() => {
                    soundEngine.playSfx('ui_click');
                    onLaunchBlueprint(gameBlueprint);
                  }}
                  className="touch-btn inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 font-extrabold text-slate-950 hover:bg-emerald-400"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Build &amp; Play Generated Game</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => downloadJson(`game_blueprint_${gameBlueprint.seed}.json`, gameBlueprint)}
                className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold"
              >
                Export Blueprint JSON
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 8. WEB / APK / MCP / AI ENGINE TARGET GENERATOR */}
      {subTab === 'targets' && (
        <section className="rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-(--text)">Web / Android APK / MCP / AI Engine Generator</h3>
              <p className="text-(--muted)">Generate production-ready manifests for Web PWA, Android APK (Itel A70), MCP server, or AI Engine core.</p>
            </div>
            <button
              type="button"
              onClick={() => downloadText(`${targetSpec.packageId}-${targetSpec.target}.json`, targetSpec.configJson)}
              className="touch-btn inline-flex items-center gap-1.5 rounded-lg bg-(--accent) px-4 font-extrabold text-(--accent-ink)"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Config</span>
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(['apk', 'web', 'mcp', 'ai_engine'] as const).map((tg) => (
              <button
                key={tg}
                type="button"
                onClick={() => {
                  setTargetKind(tg);
                  setTargetSpec(generatePlatformTargetSpec(targetSpec.seed + 1, tg, targetAppName));
                }}
                className={`touch-btn rounded-lg border px-3 font-bold uppercase ${
                  targetKind === tg ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                }`}
              >
                {tg.replace('_', ' ')}
              </button>
            ))}
            <input
              type="text"
              value={targetAppName}
              onChange={(e) => {
                setTargetAppName(e.target.value);
                setTargetSpec(generatePlatformTargetSpec(targetSpec.seed, targetKind, e.target.value));
              }}
              className="touch-btn flex-1 rounded-xl border border-(--border) bg-(--surface-2) px-3 text-xs font-medium"
            />
          </div>

          <div className="mt-2 font-semibold text-(--accent)">{targetSpec.summary}</div>
          <pre className="font-mono-num mt-2 max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-[11px] text-emerald-300">
            {targetSpec.configJson}
          </pre>
        </section>
      )}
    </div>
  );
}
