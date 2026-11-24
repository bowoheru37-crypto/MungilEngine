/**
 * Deterministic Procedural Generator Suite (Mungil Engine V7).
 * Uses zero-dependency xorshift32 PRNG for reproducible low-RAM generation:
 * 1. Character 2D/3D Generator
 * 2. Music Tracker Generator (3 scales, 16-step lead/bass/percussion)
 * 3. SFX Synthesizer Generator
 * 4. Video / Animation State & Cutscene Sequencer Generator
 * 5. Terrain 2D/3D Heightmap & Platform Generator
 * 6. Other Assets (Items, Props, Pickups) Generator
 */

import { GENRE_TEMPLATES } from './catalogs';
import { CURATED_GITHUB_PLUGINS } from './githubConnectors';
import { SPACE3D_CONSTANTS } from './qolbuSpace3d';
import type {
  AiPlayMode,
  ArtStyleId,
  AtelierBonePose,
  Camera3DPresetId,
  CharacterAnimState,
  CutsceneKeyframe,
  GeneratedCharacterSpec,
  GeneratedCutsceneSpec,
  GeneratedDubbingSpec,
  GeneratedGameBlueprintSpec,
  GeneratedGameplayBundleSpec,
  GeneratedImageSpriteSpec,
  GeneratedMesh3DSpec,
  GeneratedPropSpec,
  GeneratedSfxSpec,
  GeneratedStateMachineSpec,
  GeneratedTargetConfigSpec,
  GeneratedTerrainSpec,
  GeneratedTrackSpec,
  HybridRender5Mode,
  LanguageCode,
  Mesh3DTriangle,
  PerspectiveConnectorId,
  Vec3Tuple,
  WeatherKind,
} from './types';

function createPrng(seed: number): () => number {
  let s = (seed | 0) || 7070;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

function hashPrompt(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return (h >>> 0) || 7070;
}

const CHAR_PALETTES = [
  { p: '#2563eb', s: '#1e293b', a: '#facc15', c: '#f59e0b' },
  { p: '#16a34a', s: '#14532d', a: '#4ade80', c: '#eab308' },
  { p: '#dc2626', s: '#450a0a', a: '#fb923c', c: '#fcd34d' },
  { p: '#7c3aed', s: '#2e1065', a: '#22d3ee', c: '#f472b6' },
  { p: '#0ea5e9', s: '#0c4a6e', a: '#a3e635', c: '#38bdf8' },
];

export function generateCharacter(
  seed: number,
  dimension: '2D' | '3D-Stack' = '3D-Stack',
  archetypeOverride?: GeneratedCharacterSpec['archetype']
): GeneratedCharacterSpec {
  const rnd = createPrng(seed);
  const archetypes: GeneratedCharacterSpec['archetype'][] = ['Guardian', 'Ranger', 'Mage', 'Knight'];
  const weapons: GeneratedCharacterSpec['weaponKind'][] = ['blade', 'bow', 'staff', 'hammer'];
  const idx = Math.floor(rnd() * archetypes.length);
  const pal = CHAR_PALETTES[Math.floor(rnd() * CHAR_PALETTES.length)];
  const archetype = archetypeOverride ?? archetypes[idx];

  // Generate symmetrical 12x12 pixel character matrix
  const grid: number[][] = Array.from({ length: 12 }, () => Array(12).fill(0));
  for (let r = 1; r < 11; r++) {
    for (let c = 2; c < 6; c++) {
      const fill = r <= 4 ? rnd() > 0.25 : rnd() > 0.2;
      if (fill) {
        const val = r <= 4 ? (rnd() > 0.7 ? 3 : 2) : rnd() > 0.65 ? 4 : 1;
        grid[r][c] = val;
        grid[r][11 - c] = val;
      }
    }
  }
  // Eyes
  grid[3][4] = 5;
  grid[3][7] = 5;

  const prefixes = ['Bowo', 'Kala', 'Surya', 'Bayu', 'Raka', 'Tirta', 'Guntur'];
  const suffixes = ['Prime', 'V7', 'Light', 'Shadow', 'Wind', 'Spark'];
  const name = `${prefixes[Math.floor(rnd() * prefixes.length)]} ${suffixes[Math.floor(rnd() * suffixes.length)]}`;

  return {
    seed,
    name,
    dimension,
    archetype,
    primaryColor: pal.p,
    secondaryColor: pal.s,
    accentColor: pal.a,
    cloakColor: pal.c,
    weaponKind: weapons[archetypes.indexOf(archetype)] ?? 'blade',
    headScale: Number((0.92 + rnd() * 0.22).toFixed(2)),
    spriteGrid: grid,
  };
}

export const ATELIER_PRESETS: Record<'warm_eco' | 'mint_agile' | 'cobalt_knight', AtelierBonePose> = {
  warm_eco: {
    tint: '#ffd09e',
    roughness: 0.75,
    sx: 1.0,
    sy: 1.0,
    sz: 1.0,
    bones: {
      bone_2: [0, 0, -5],
      bone_3: [0, 0, 5],
      bone_8: [0, 0, -24],
      bone_12: [0, 0, 24],
    },
  },
  mint_agile: {
    tint: '#b3ffe0',
    roughness: 0.6,
    sx: 0.96,
    sy: 1.06,
    sz: 0.96,
    bones: {
      bone_2: [8, 0, 0],
      bone_8: [-15, 0, -35],
      bone_12: [12, 0, 35],
    },
  },
  cobalt_knight: {
    tint: '#b9c8ff',
    roughness: 0.45,
    sx: 1.08,
    sy: 1.02,
    sz: 1.08,
    bones: {
      bone_2: [-4, 6, 0],
      bone_8: [0, 18, -42],
      bone_12: [0, -18, 42],
    },
  },
};

export function generateRig3DFromPrompt(
  seed: number,
  prompt: string,
  preset: keyof typeof ATELIER_PRESETS = 'warm_eco'
): { character: GeneratedCharacterSpec; atelier: AtelierBonePose } {
  const combinedSeed = (seed ^ hashPrompt(prompt || 'guardian')) >>> 0;
  const lower = prompt.toLowerCase();
  const archetype: GeneratedCharacterSpec['archetype'] = lower.includes('mage') || lower.includes('sihir')
    ? 'Mage'
    : lower.includes('ranger') || lower.includes('panah')
      ? 'Ranger'
      : lower.includes('knight') || lower.includes('ksatria')
        ? 'Knight'
        : 'Guardian';
  const charSpec = generateCharacter(combinedSeed, '3D-Stack', archetype);
  const baseAtelier = ATELIER_PRESETS[preset];
  return {
    character: {
      ...charSpec,
      name: prompt.trim() ? prompt.trim().slice(0, 28) : charSpec.name,
      cloakColor: baseAtelier.tint,
    },
    atelier: baseAtelier,
  };
}

export function parseAtelierSetupJson(rawJson: string): {
  ok: boolean;
  character?: GeneratedCharacterSpec;
  poseCount?: number;
  error?: string;
} {
  try {
    const parsed = JSON.parse(rawJson) as {
      app?: string;
      settings?: { tint?: string; style?: string; sx?: number; sy?: number; bones?: Record<string, unknown>; poses?: unknown[] };
    };
    const settings = parsed.settings ?? (parsed as unknown as { tint?: string; style?: string; sx?: number; sy?: number; bones?: Record<string, unknown>; poses?: unknown[] });
    const tint = typeof settings.tint === 'string' && /^#[0-9a-f]{6}$/i.test(settings.tint) ? settings.tint : '#ffd09e';
    const seed = hashPrompt(JSON.stringify(settings.bones ?? {}) + tint);
    const charSpec = generateCharacter(seed, '3D-Stack', 'Guardian');
    return {
      ok: true,
      character: {
        ...charSpec,
        name: parsed.app ? `${parsed.app} Rig` : 'Atelier Rig',
        cloakColor: tint,
        accentColor: tint,
        headScale: Number(Math.max(0.85, Math.min(1.25, Number(settings.sy ?? 1))).toFixed(2)),
      },
      poseCount: Array.isArray(settings.poses) ? settings.poses.length : Object.keys(settings.bones ?? {}).length,
    };
  } catch {
    return { ok: false, error: 'Invalid Atelier JSON setup.' };
  }
}

export function generateImageSpriteFromPrompt(
  seed: number,
  prompt: string,
  styleId: ArtStyleId = 'pixel'
): GeneratedImageSpriteSpec {
  const combinedSeed = (seed ^ hashPrompt(prompt || 'lantern hero')) >>> 0;
  const rnd = createPrng(combinedSeed);
  const lower = prompt.toLowerCase();

  let palette: [string, string, string, string] = ['#1d4ed8', '#38bdf8', '#fde047', '#0f172a'];
  if (lower.includes('fire') || lower.includes('api') || lower.includes('lava')) {
    palette = ['#dc2626', '#f97316', '#fde047', '#450a0a'];
  } else if (lower.includes('forest') || lower.includes('hutan') || lower.includes('slime')) {
    palette = ['#15803d', '#4ade80', '#bef264', '#052e16'];
  } else if (lower.includes('cyber') || lower.includes('neon') || lower.includes('kala')) {
    palette = ['#7c3aed', '#22d3ee', '#f472b6', '#090d16'];
  }

  const grid: number[][] = Array.from({ length: 16 }, () => Array(16).fill(0));
  for (let r = 2; r < 14; r++) {
    for (let c = 2; c < 8; c++) {
      const distCenter = Math.hypot(r - 7.5, c - 7.5);
      const chance = distCenter < 5.2 ? 0.82 : 0.25;
      if (rnd() < chance) {
        const tone = r < 5 ? 2 : rnd() > 0.65 ? 3 : 1;
        grid[r][c] = tone;
        grid[r][15 - c] = tone;
      }
    }
  }
  // Highlight border outline pixels
  for (let r = 1; r < 15; r++) {
    for (let c = 1; c < 15; c++) {
      if (grid[r][c] === 0 && (grid[r - 1][c] > 0 || grid[r + 1][c] > 0 || grid[r][c - 1] > 0 || grid[r][c + 1] > 0)) {
        if (rnd() > 0.45) grid[r][c] = 4;
      }
    }
  }

  return {
    seed: combinedSeed,
    prompt: prompt.trim() || 'Guardian Lantern Emblem',
    title: prompt.trim() ? prompt.trim().slice(0, 30) : `Sprite #${combinedSeed % 1000}`,
    styleId,
    palette,
    size: 16,
    grid,
  };
}

const SCALES: Record<GeneratedTrackSpec['scale'], number[]> = {
  pentatonic: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25],
  dorian: [220.0, 246.94, 261.63, 293.66, 329.63, 369.99, 392.0, 440.0],
  phrygian: [196.0, 207.65, 246.94, 293.66, 311.13, 392.0, 415.3],
};

export function generateMusicTrack(
  seed: number,
  scale: GeneratedTrackSpec['scale'] = 'pentatonic',
  bpm?: number
): GeneratedTrackSpec {
  const rnd = createPrng(seed);
  const notes = SCALES[scale];
  const targetBpm = bpm ?? Math.round(110 + rnd() * 44);
  const leadNotes: number[] = [];
  const bassNotes: number[] = [];
  const percHits: number[] = [];

  for (let i = 0; i < 16; i++) {
    const rest = i % 4 === 3 && rnd() > 0.65;
    const note = rest ? 0 : notes[Math.floor(rnd() * notes.length)];
    leadNotes.push(Number(note.toFixed(2)));
    bassNotes.push(i % 2 === 0 ? Number((notes[Math.floor(i / 4) % 3] * 0.5).toFixed(2)) : 0);
    percHits.push(i % 4 === 0 ? 1 : i % 2 === 1 ? 2 : 0);
  }

  const labels: Record<GeneratedTrackSpec['scale'], string> = {
    pentatonic: 'Dawn Horizon',
    dorian: 'Storm Runner',
    phrygian: 'Kala Citadel',
  };

  return {
    seed,
    title: `${labels[scale]} #${seed % 100}`,
    scale,
    bpm: targetBpm,
    leadNotes,
    bassNotes,
    percHits,
  };
}

export function generateSfxSpec(
  seed: number,
  preset: 'jump' | 'slash' | 'coin' | 'laser' | 'impact' | 'ui_chime' = 'jump'
): GeneratedSfxSpec {
  const rnd = createPrng(seed);
  const jitter = 0.9 + rnd() * 0.2;
  switch (preset) {
    case 'slash':
      return { seed, name: 'Blade Slash', wave: 'square', freqStart: Math.round(440 * jitter), freqEnd: 165, durationSec: 0.1, volume: 0.1 };
    case 'coin':
      return { seed, name: 'Gold Chime', wave: 'sine', freqStart: Math.round(720 * jitter), freqEnd: 1180, durationSec: 0.12, volume: 0.12 };
    case 'laser':
      return { seed, name: 'Arcane Bolt', wave: 'sawtooth', freqStart: Math.round(920 * jitter), freqEnd: 240, durationSec: 0.16, volume: 0.1 };
    case 'impact':
      return { seed, name: 'Heavy Impact', wave: 'sawtooth', freqStart: Math.round(160 * jitter), freqEnd: 48, durationSec: 0.22, volume: 0.15 };
    case 'ui_chime':
      return { seed, name: 'UI Confirm', wave: 'triangle', freqStart: Math.round(520 * jitter), freqEnd: 780, durationSec: 0.08, volume: 0.09 };
    case 'jump':
    default:
      return { seed, name: 'Hero Leap', wave: 'triangle', freqStart: Math.round(300 * jitter), freqEnd: 610, durationSec: 0.12, volume: 0.12 };
  }
}

export function generateCutsceneSpec(seed: number, weather: WeatherKind = 'Cerah'): GeneratedCutsceneSpec {
  const rnd = createPrng(seed);
  const titles = ['Kebangkitan Desa Fajar', 'Tantangan Jembatan Badai', 'Konfrontasi Menara Kala'];
  return {
    seed,
    title: titles[Math.floor(rnd() * titles.length)],
    durationSec: 4.8,
    weather,
    keyframes: [
      { timeSec: 0.0, pose: 'idle', cameraX: 0, caption: 'Bowo berdiri di gerbang Desa Fajar...', effect: 'none' },
      { timeSec: 0.9, pose: 'walk', cameraX: 55, caption: 'Langkah cepat menuju cahaya pecahan!', effect: 'none' },
      { timeSec: 1.8, pose: 'jump', cameraX: 110, caption: 'Melompati tebing badai!', effect: 'none' },
      { timeSec: 2.6, pose: 'dash', cameraX: 175, caption: 'Parry kilat menahan serangan bayangan!', effect: 'flash' },
      { timeSec: 3.4, pose: 'attack', cameraX: 215, caption: 'Tebasan Cahaya — Boss Kala terdesak!', effect: 'shake' },
      { timeSec: 4.1, pose: 'idle', cameraX: 240, caption: 'Gerbang Cahaya terbuka!', effect: 'burst' },
    ],
  };
}

const ACTION_TOKEN_MAP: Record<string, { pose: CharacterAnimState; effect: CutsceneKeyframe['effect']; caption: string }> = {
  diam: { pose: 'idle', effect: 'none', caption: 'Bowo bersiap siaga.' },
  idle: { pose: 'idle', effect: 'none', caption: 'Hero stands ready.' },
  jalan: { pose: 'walk', effect: 'none', caption: 'Melangkah menyusuri arena.' },
  walk: { pose: 'walk', effect: 'none', caption: 'Walking across the stage.' },
  lari: { pose: 'dash', effect: 'none', caption: 'Berlari cepat menembus angin!' },
  run: { pose: 'dash', effect: 'none', caption: 'Sprinting forward!' },
  lompat: { pose: 'jump', effect: 'none', caption: 'Melompat tinggi di atas jurang!' },
  jump: { pose: 'jump', effect: 'none', caption: 'Leaping over obstacles!' },
  dash: { pose: 'dash', effect: 'flash', caption: 'Dash kilat & parry!' },
  serang: { pose: 'attack', effect: 'shake', caption: 'Tebasan Cahaya menghantam!' },
  attack: { pose: 'attack', effect: 'shake', caption: 'Light slash strike!' },
  kick: { pose: 'attack', effect: 'shake', caption: 'Tendangan akrobatik!' },
  burst: { pose: 'attack', effect: 'burst', caption: 'Ledakan Cahaya penuh!' },
};

export function composeMovieFromPrompt(
  prompt: string,
  seed: number,
  weather: WeatherKind = 'Cerah'
): GeneratedCutsceneSpec {
  const words = prompt
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const keyframes: CutsceneKeyframe[] = [];
  let cursorTime = 0;
  let camX = 0;

  for (const w of words) {
    const mapped = ACTION_TOKEN_MAP[w];
    if (!mapped) continue;
    keyframes.push({
      timeSec: Number(cursorTime.toFixed(1)),
      pose: mapped.pose,
      cameraX: camX,
      caption: mapped.caption,
      effect: mapped.effect,
    });
    cursorTime += 0.9;
    camX += mapped.pose === 'idle' ? 15 : 52;
    if (keyframes.length >= 8) break;
  }

  if (keyframes.length === 0) {
    return generateCutsceneSpec(seed ^ hashPrompt(prompt), weather);
  }

  return {
    seed: (seed ^ hashPrompt(prompt)) >>> 0,
    title: prompt.trim().slice(0, 36) || 'Movie Storyboard',
    durationSec: Math.max(1.8, Number((cursorTime + 0.6).toFixed(1))),
    weather,
    keyframes,
  };
}

export function generateStateMachineSpec(
  seed: number,
  kind: 'movement' | 'behavior',
  prompt = ''
): GeneratedStateMachineSpec {
  const h = (seed ^ hashPrompt(prompt || kind)) >>> 0;
  if (kind === 'movement') {
    return {
      seed: h,
      kind: 'movement',
      name: prompt.trim() || 'Hero Agile Locomotion FSM',
      initialState: 'idle',
      states: [
        { id: 'idle', speedMul: 0, durationSec: 0.4, animation: 'idle' },
        { id: 'walk', speedMul: 1.0, durationSec: 0.6, animation: 'walk' },
        { id: 'jump', speedMul: 0.95, durationSec: 0.45, animation: 'jump' },
        { id: 'dash', speedMul: 1.85, durationSec: 0.22, animation: 'dash' },
        { id: 'attack', speedMul: 0.6, durationSec: 0.24, animation: 'attack' },
      ],
      transitions: [
        { from: 'idle', event: 'MOVE_INPUT', to: 'walk' },
        { from: 'walk', event: 'JUMP_COYOTE', to: 'jump' },
        { from: 'walk', event: 'DASH_PARRY', to: 'dash' },
        { from: 'idle', event: 'ATTACK_COMBO', to: 'attack' },
        { from: 'jump', event: 'LAND_GROUND', to: 'idle' },
      ],
      bytecodeSnippet: 'SET 1\nADD 2\nSAY 1\nPLAY 1\nEND',
    };
  }

  return {
    seed: h,
    kind: 'behavior',
    name: prompt.trim() || 'Tactical Guardian Enemy AI',
    initialState: 'patrol',
    states: [
      { id: 'patrol', speedMul: 0.65, durationSec: 1.5, animation: 'walk' },
      { id: 'chase', speedMul: 1.25, durationSec: 1.0, animation: 'walk' },
      { id: 'telegraph', speedMul: 0.1, durationSec: 0.45, animation: 'idle' },
      { id: 'strike', speedMul: 1.6, durationSec: 0.3, animation: 'attack' },
      { id: 'recover', speedMul: 0.0, durationSec: 0.65, animation: 'hurt' },
    ],
    transitions: [
      { from: 'patrol', event: 'PLAYER_IN_LOS', to: 'chase' },
      { from: 'chase', event: 'TOKEN_ACQUIRED', to: 'telegraph' },
      { from: 'telegraph', event: 'WINDUP_DONE', to: 'strike' },
      { from: 'strike', event: 'PARRIED_OR_END', to: 'recover' },
      { from: 'recover', event: 'COOLDOWN_DONE', to: 'patrol' },
    ],
    bytecodeSnippet: 'SET 3\nSPAWN 2\nSAY 2\nEND',
  };
}

export function generateGameplaySceneAndRules(
  seed: number,
  prompt: string
): GeneratedGameplayBundleSpec {
  const combined = (seed ^ hashPrompt(prompt || 'action')) >>> 0;
  const rnd = createPrng(combined);
  const lower = prompt.toLowerCase();

  let genreId = 'platformer';
  let physicsMode: GeneratedGameplayBundleSpec['physicsMode'] = 'Arcade';
  let gravityMul = 1.0;
  let speedMul = 1.05;

  if (lower.includes('space') || lower.includes('shooter') || lower.includes('angkasa')) {
    genreId = 'shooter';
    physicsMode = 'Zero-G';
    gravityMul = 0;
    speedMul = 1.15;
  } else if (lower.includes('race') || lower.includes('balap') || lower.includes('turbo')) {
    genreId = 'racing';
    physicsMode = 'Realistis';
    gravityMul = 1.05;
    speedMul = 1.35;
  } else if (lower.includes('rpg') || lower.includes('dungeon') || lower.includes('topdown')) {
    genreId = 'rpg';
    gravityMul = 0;
    speedMul = 1.0;
  } else if (lower.includes('defense') || lower.includes('menara')) {
    genreId = 'tower_defense';
  }

  return {
    seed: combined,
    prompt: prompt.trim() || 'Action Platformer Temple',
    genreId,
    physicsMode,
    gravityMul,
    speedMul,
    uiTheme: {
      accent: rnd() > 0.5 ? '#22c55e' : '#38bdf8',
      radiusPx: 12,
      hudLayout: 'compact-mobile',
    },
    rules: [
      { condition: 'ON_SHARD_COLLECT', action: 'ADD_SCORE_25' },
      { condition: 'ON_LOW_HP', action: 'HEAL_15' },
      { condition: 'ON_SWITCH_ALL', action: 'OPEN_GATE' },
    ],
    sceneTitle: prompt.trim() ? `${prompt.trim().slice(0, 26)} Scene` : `Stage #${combined % 99}`,
    enemiesCount: 3 + Math.floor(rnd() * 3),
    platformsCount: 3 + Math.floor(rnd() * 3),
  };
}

export function generateDubbingSubtitleSpec(
  seed: number,
  speaker: string,
  text: string,
  lang: LanguageCode = 'id'
): GeneratedDubbingSpec {
  const cleanText = text.trim() || 'Cahaya desa harus kita jaga bersama!';
  const cleanSpeaker = speaker.trim() || 'Bowo';
  const combined = (seed ^ hashPrompt(cleanSpeaker + cleanText)) >>> 0;
  const rnd = createPrng(combined);
  const words = cleanText.split(/\s+/).filter(Boolean).length;
  const durationSec = Math.max(1.6, Number((words * 0.42 + 0.6).toFixed(1)));
  const pitchHz = Math.round(140 + rnd() * 140);
  const endTs = `00:00:0${Math.floor(durationSec)},${String(Math.round((durationSec % 1) * 1000)).padStart(3, '0')}`;

  const srtText = `1\n00:00:00,000 --> ${endTs}\n[${cleanSpeaker}] ${cleanText}\n`;
  const vttText = `WEBVTT\n\n00:00.000 --> 00:0${Math.floor(durationSec)}.${String(Math.round((durationSec % 1) * 1000)).padStart(3, '0')}\n<v ${cleanSpeaker}>${cleanText}\n`;

  return {
    seed: combined,
    speaker: cleanSpeaker,
    lang,
    text: cleanText,
    pitchHz,
    rate: 1.0,
    durationSec,
    srtText,
    vttText,
  };
}

export function generatePlatformTargetSpec(
  seed: number,
  target: GeneratedTargetConfigSpec['target'],
  appName = 'Bowo: Penjaga Cahaya'
): GeneratedTargetConfigSpec {
  const slug = appName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'bowo-game';
  if (target === 'apk') {
    const cfg = {
      appId: `id.mungil.${slug.replace(/-/g, '')}`,
      appName,
      targetSdk: 34,
      minSdk: 24,
      itelA70Profile: { targetFps: 30, resolutionScale: 0.72, ramBudgetMb: 48 },
      capacitor: { webDir: 'dist', androidScheme: 'https' },
    };
    return {
      seed,
      target,
      appName,
      packageId: cfg.appId,
      summary: 'Android APK Capacitor + Itel A70 Eco 30 FPS manifest',
      configJson: JSON.stringify(cfg, null, 2),
    };
  }
  if (target === 'mcp') {
    const cfg = {
      mcpVersion: '1.0',
      serverName: 'mungil-engine-v7-mcp',
      tools: [
        'mungil.create_level',
        'mungil.generate_sprite',
        'mungil.generate_fsm',
        'mungil.save_slot',
        'mungil.export_pak',
      ],
    };
    return {
      seed,
      target,
      appName,
      packageId: 'mungil-mcp',
      summary: 'Model Context Protocol tool registry for Claude / Gemini / Qwen / Grok',
      configJson: JSON.stringify(cfg, null, 2),
    };
  }
  if (target === 'ai_engine') {
    const cfg = {
      engine: 'MungilEngineV7',
      offlineDeterministic: true,
      soaCapacity: 1024,
      particlePool: 160,
      bytecodeBits: 16,
      aiBehaviors: ['patrol', 'chase', 'telegraph', 'parry-reflect', '3-phase-boss'],
    };
    return {
      seed,
      target,
      appName,
      packageId: 'mungil-ai-core',
      summary: 'Offline zero-GC SoA + Tactical AI behavior engine profile',
      configJson: JSON.stringify(cfg, null, 2),
    };
  }
  const cfg = {
    name: appName,
    short_name: 'Bowo V7',
    display: 'standalone',
    orientation: 'landscape',
    theme_color: '#0b101b',
    offlineReady: true,
  };
  return {
    seed,
    target: 'web',
    appName,
    packageId: slug,
    summary: 'Offline-first PWA Web App manifest (< 1 MB asset bundle)',
    configJson: JSON.stringify(cfg, null, 2),
  };
}

export function generateTerrainSpec(
  seed: number,
  mode: '2D' | '3D-Heightmap' = '3D-Heightmap',
  biome: GeneratedTerrainSpec['biome'] = 'meadow'
): GeneratedTerrainSpec {
  const rnd = createPrng(seed);
  const cols = 48;
  const heights: number[] = [];
  const freq1 = 0.14 + rnd() * 0.1;
  const freq2 = 0.31 + rnd() * 0.15;
  const phase = rnd() * Math.PI * 2;

  for (let i = 0; i < cols; i++) {
    const h = 44 + Math.sin(i * freq1 + phase) * 26 + Math.cos(i * freq2) * 14 + (rnd() - 0.5) * 8;
    heights.push(Math.max(18, Math.min(118, Math.round(h))));
  }

  const platforms = [
    { x: 140 + Math.round(rnd() * 40), y: 270, w: 120 },
    { x: 360 + Math.round(rnd() * 50), y: 225, w: 130 },
    { x: 600 + Math.round(rnd() * 40), y: 265, w: 125 },
  ];

  const trees = [90, 280, 520, 740].map((base) => base + Math.round(rnd() * 40));
  const rocks = [190, 440, 680].map((base) => base + Math.round(rnd() * 35));

  return {
    seed,
    mode,
    biome,
    width: 960,
    height: 440,
    heights,
    platforms,
    trees,
    rocks,
  };
}

export function generatePropAsset(
  seed: number,
  kind: GeneratedPropSpec['kind'] = 'potion'
): GeneratedPropSpec {
  const rnd = createPrng(seed);
  const colorSets: Record<GeneratedPropSpec['kind'], { p: string; g: string; name: string }> = {
    potion: { p: '#10b981', g: '#a7f3d0', name: 'Elixir Cahaya' },
    chest: { p: '#d97706', g: '#fde047', name: 'Peti Pusaka' },
    crystal: { p: '#0ea5e9', g: '#e0f2fe', name: 'Kristal Tenaga' },
    torch: { p: '#ea580c', g: '#fef08a', name: 'Obor Penjaga' },
    emblem: { p: '#8b5cf6', g: '#f472b6', name: 'Lencana Kala' },
  };
  const cfg = colorSets[kind];

  const grid: number[][] = Array.from({ length: 10 }, () => Array(10).fill(0));
  for (let r = 1; r < 9; r++) {
    for (let c = 1; c < 5; c++) {
      const active = r >= 2 && r <= 7 ? rnd() > 0.22 : rnd() > 0.65;
      if (active) {
        const shade = r <= 3 ? 2 : 1;
        grid[r][c] = shade;
        grid[r][9 - c] = shade;
      }
    }
  }

  return {
    seed,
    kind,
    name: `${cfg.name} #${seed % 99}`,
    primaryColor: cfg.p,
    glowColor: cfg.g,
    pixelGrid: grid,
  };
}

function appendBoxMesh(
  vertices: Vec3Tuple[],
  triangles: Mesh3DTriangle[],
  cx: number,
  cy: number,
  cz: number,
  hx: number,
  hy: number,
  hz: number,
  color: string
): void {
  const base = vertices.length;
  vertices.push(
    { x: cx - hx, y: cy - hy, z: cz - hz },
    { x: cx + hx, y: cy - hy, z: cz - hz },
    { x: cx + hx, y: cy + hy, z: cz - hz },
    { x: cx - hx, y: cy + hy, z: cz - hz },
    { x: cx - hx, y: cy - hy, z: cz + hz },
    { x: cx + hx, y: cy - hy, z: cz + hz },
    { x: cx + hx, y: cy + hy, z: cz + hz },
    { x: cx - hx, y: cy + hy, z: cz + hz }
  );
  const faces: Array<[number, number, number]> = [
    // Front (+Z)
    [4, 5, 6], [4, 6, 7],
    // Back (-Z)
    [1, 0, 3], [1, 3, 2],
    // Left (-X)
    [0, 4, 7], [0, 7, 3],
    // Right (+X)
    [5, 1, 2], [5, 2, 6],
    // Top (+Y)
    [3, 7, 6], [3, 6, 2],
    // Bottom (-Y)
    [0, 1, 5], [0, 5, 4],
  ];
  for (const [a, b, c] of faces) {
    triangles.push({ a: base + a, b: base + b, c: base + c, color });
  }
}

function appendPyramidOrPrism(
  vertices: Vec3Tuple[],
  triangles: Mesh3DTriangle[],
  cx: number,
  cy: number,
  cz: number,
  radius: number,
  height: number,
  segments: number,
  color: string,
  doubleEnded = false
): void {
  const safeSeg = Math.max(4, Math.min(10, segments));
  const baseStart = vertices.length;
  for (let i = 0; i < safeSeg; i++) {
    const ang = (i / safeSeg) * Math.PI * 2;
    vertices.push({
      x: Number((cx + Math.cos(ang) * radius).toFixed(4)),
      y: Number(cy.toFixed(4)),
      z: Number((cz + Math.sin(ang) * radius).toFixed(4)),
    });
  }
  const topIdx = vertices.length;
  vertices.push({ x: cx, y: Number((cy + height).toFixed(4)), z: cz });
  const botIdx = vertices.length;
  vertices.push({ x: cx, y: Number((cy - (doubleEnded ? height * 0.75 : 0)).toFixed(4)), z: cz });

  for (let i = 0; i < safeSeg; i++) {
    const next = (i + 1) % safeSeg;
    triangles.push({ a: baseStart + i, b: baseStart + next, c: topIdx, color });
    triangles.push({ a: baseStart + next, b: baseStart + i, c: botIdx, color });
  }
}

function buildObjText(title: string, vertices: Vec3Tuple[], triangles: Mesh3DTriangle[]): string {
  const lines: string[] = [`# Mungil Engine V7 - QolbuSpace3D Low-Poly Mesh`, `o ${title.replace(/\s+/g, '_')}`];
  for (const v of vertices) {
    lines.push(`v ${v.x.toFixed(4)} ${v.y.toFixed(4)} ${v.z.toFixed(4)}`);
  }
  for (const t of triangles) {
    lines.push(`f ${t.a + 1} ${t.b + 1} ${t.c + 1}`);
  }
  return lines.join('\n');
}

function buildMinimalGltfJson(title: string, vertices: Vec3Tuple[], triangles: Mesh3DTriangle[]): string {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const v of vertices) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.z < minZ) minZ = v.z;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
    if (v.z > maxZ) maxZ = v.z;
  }
  const posArr = new Float32Array(vertices.length * 3);
  for (let i = 0; i < vertices.length; i++) {
    posArr[i * 3 + 0] = vertices[i].x;
    posArr[i * 3 + 1] = vertices[i].y;
    posArr[i * 3 + 2] = vertices[i].z;
  }
  const idxArr = new Uint16Array(triangles.length * 3);
  for (let i = 0; i < triangles.length; i++) {
    idxArr[i * 3 + 0] = triangles[i].a;
    idxArr[i * 3 + 1] = triangles[i].b;
    idxArr[i * 3 + 2] = triangles[i].c;
  }
  const posBytes = new Uint8Array(posArr.buffer);
  const idxBytes = new Uint8Array(idxArr.buffer);
  const totalBytes = posBytes.byteLength + idxBytes.byteLength;
  const combined = new Uint8Array(totalBytes);
  combined.set(posBytes, 0);
  combined.set(idxBytes, posBytes.byteLength);

  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  const base64Uri =
    typeof btoa === 'function'
      ? `data:application/octet-stream;base64,${btoa(binary)}`
      : `data:application/octet-stream;base64,${Buffer.from(combined).toString('base64')}`;

  const gltf = {
    asset: { version: '2.0', generator: 'Mungil Engine V7 · QolbuSpace3D (Itel A70)' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: title }],
    meshes: [
      {
        name: title,
        primitives: [
          {
            attributes: { POSITION: 0 },
            indices: 1,
            mode: 4,
          },
        ],
      },
    ],
    buffers: [{ uri: base64Uri, byteLength: totalBytes }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBytes.byteLength, target: 34962 },
      { buffer: 0, byteOffset: posBytes.byteLength, byteLength: idxBytes.byteLength, target: 34963 },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: vertices.length,
        type: 'VEC3',
        min: [Number(minX.toFixed(4)), Number(minY.toFixed(4)), Number(minZ.toFixed(4))],
        max: [Number(maxX.toFixed(4)), Number(maxY.toFixed(4)), Number(maxZ.toFixed(4))],
      },
      {
        bufferView: 1,
        componentType: 5123,
        count: triangles.length * 3,
        type: 'SCALAR',
      },
    ],
  };
  return JSON.stringify(gltf, null, 2);
}

/**
 * Tripo3D / Meshy.ai-grade Offline + GitHub-Linked Low-Poly 3D Mesh Generator.
 * Strictly obeys Itel A70 triangle limits: <=800 tris (Character), <=200 tris (Prop), 12 tris (Box LOD2).
 */
export function generateMesh3DFromPrompt(
  seed: number,
  prompt: string,
  archetypeOverride?: GeneratedMesh3DSpec['archetype'],
  repoPluginId = 'gh_tripo_sr',
  boxOnly12Tris = false
): GeneratedMesh3DSpec {
  const cleanPrompt = prompt.trim() || 'Guardian Knight of Dawn';
  const combinedSeed = (seed ^ hashPrompt(cleanPrompt)) >>> 0;
  const rnd = createPrng(combinedSeed);
  const lower = cleanPrompt.toLowerCase();

  const archetype: GeneratedMesh3DSpec['archetype'] =
    archetypeOverride ??
    (lower.includes('tower') || lower.includes('menara') || lower.includes('citadel') || lower.includes('castle')
      ? 'citadel'
      : lower.includes('ship') || lower.includes('hover') || lower.includes('car') || lower.includes('racer')
        ? 'vehicle'
        : lower.includes('crystal') || lower.includes('shard') || lower.includes('gem')
          ? 'crystal'
          : lower.includes('chest') || lower.includes('crate') || lower.includes('prop') || lower.includes('tree')
            ? 'prop'
            : 'character');

  const pal = CHAR_PALETTES[Math.floor(rnd() * CHAR_PALETTES.length)];
  const vertices: Vec3Tuple[] = [];
  const triangles: Mesh3DTriangle[] = [];

  if (boxOnly12Tris) {
    appendBoxMesh(vertices, triangles, 0, 0.9, 0, 0.65, 0.9, 0.65, pal.p);
  } else if (archetype === 'character') {
    // Composite multi-part humanoid hero (~96-144 tris, well under 800 cap)
    appendBoxMesh(vertices, triangles, -0.22, 0.35, 0, 0.14, 0.35, 0.14, pal.s); // Left leg
    appendBoxMesh(vertices, triangles, 0.22, 0.35, 0, 0.14, 0.35, 0.14, pal.s);  // Right leg
    appendBoxMesh(vertices, triangles, 0, 1.05, 0, 0.36, 0.42, 0.22, pal.p);     // Torso
    appendBoxMesh(vertices, triangles, 0, 1.08, -0.28, 0.3, 0.46, 0.06, pal.c);  // Flowing cloak
    appendBoxMesh(vertices, triangles, -0.52, 1.08, 0, 0.13, 0.34, 0.13, pal.p); // Left arm
    appendBoxMesh(vertices, triangles, 0.52, 1.08, 0.08, 0.13, 0.34, 0.13, pal.p);// Right arm
    appendBoxMesh(vertices, triangles, 0.68, 1.25, 0.35, 0.06, 0.62, 0.09, pal.a);// Light blade
    appendPyramidOrPrism(vertices, triangles, 0, 1.56, 0, 0.28, 0.42, 6, '#fde68a', false); // Head
    appendPyramidOrPrism(vertices, triangles, 0, 1.88, 0.02, 0.24, 0.28, 5, pal.c, false); // Crest helmet
  } else if (archetype === 'citadel') {
    appendBoxMesh(vertices, triangles, 0, 0.85, 0, 0.85, 0.85, 0.85, pal.s);
    appendBoxMesh(vertices, triangles, 0, 1.85, 0, 0.55, 0.4, 0.55, pal.p);
    appendPyramidOrPrism(vertices, triangles, 0, 2.25, 0, 0.72, 0.95, 6, pal.c, false);
    appendBoxMesh(vertices, triangles, -0.78, 1.15, 0.78, 0.22, 0.9, 0.22, pal.a);
    appendBoxMesh(vertices, triangles, 0.78, 1.15, 0.78, 0.22, 0.9, 0.22, pal.a);
  } else if (archetype === 'vehicle') {
    appendBoxMesh(vertices, triangles, 0, 0.48, 0, 0.56, 0.22, 1.05, pal.p);     // Hull
    appendBoxMesh(vertices, triangles, 0, 0.76, -0.1, 0.34, 0.18, 0.46, '#38bdf8'); // Canopy
    appendBoxMesh(vertices, triangles, -0.72, 0.44, 0.25, 0.26, 0.08, 0.45, pal.c); // Left wing
    appendBoxMesh(vertices, triangles, 0.72, 0.44, 0.25, 0.26, 0.08, 0.45, pal.c);  // Right wing
    appendPyramidOrPrism(vertices, triangles, 0, 0.48, -1.1, 0.34, 0.55, 5, pal.a, false); // Nose cone
  } else if (archetype === 'crystal') {
    appendPyramidOrPrism(vertices, triangles, 0, 1.05, 0, 0.48, 1.05, 6, '#38bdf8', true);
    appendPyramidOrPrism(vertices, triangles, -0.45, 0.65, 0.15, 0.22, 0.55, 5, pal.a, true);
    appendPyramidOrPrism(vertices, triangles, 0.42, 0.72, -0.18, 0.2, 0.48, 5, pal.c, true);
  } else {
    // Low-Poly Prop (Crate + Glowing Trim + Beacon)
    appendBoxMesh(vertices, triangles, 0, 0.55, 0, 0.55, 0.55, 0.55, pal.p);
    appendBoxMesh(vertices, triangles, 0, 1.14, 0, 0.6, 0.08, 0.6, pal.c);
    appendPyramidOrPrism(vertices, triangles, 0, 1.25, 0, 0.22, 0.36, 4, pal.a, true);
  }

  const triBudgetLimit =
    archetype === 'character' ? SPACE3D_CONSTANTS.CHAR_TRIS_LIMIT : SPACE3D_CONSTANTS.PROP_TRIS_LIMIT;
  const clampedTriangles = triangles.slice(0, triBudgetLimit);
  const lod0 = clampedTriangles.length;
  const lod1 = Math.max(12, Math.round(lod0 * 0.45));
  const lod2 = Math.min(12, lod0);

  return {
    seed: combinedSeed,
    prompt: cleanPrompt,
    title: cleanPrompt.slice(0, 32),
    archetype,
    shaderTag: 'ForwardMobile_LambertFog',
    atlasBudget: '1024x1024 ASTC-6x6 (1 active)',
    blobShadow: true,
    vertices,
    triangles: clampedTriangles,
    lodCounts: { lod0, lod1, lod2 },
    triBudgetLimit,
    drawCallsEst: boxOnly12Tris ? 1 : 2,
    repoPluginId,
    objText: buildObjText(cleanPrompt.slice(0, 24), vertices, clampedTriangles),
    gltfJson: buildMinimalGltfJson(cleanPrompt.slice(0, 24), vertices, clampedTriangles),
  };
}

/**
 * InstaPlay / Claude / Grok-Grade Complete Playable Game Generator.
 * Produces an end-to-end game blueprint ready to launch immediately in GameShell + Itel A70 budget report.
 */
export function generateCompleteGameBlueprint(
  seed: number,
  prompt: string,
  preferredRepoId?: string
): GeneratedGameBlueprintSpec {
  const cleanPrompt = prompt.trim() || 'Cyber Isometric Guardian Quest with AI Co-Op';
  const combinedSeed = (seed ^ hashPrompt(cleanPrompt)) >>> 0;
  const lower = cleanPrompt.toLowerCase();

  let matchedGenre = GENRE_TEMPLATES.find((g) => g.id === 'ai_arena') ?? GENRE_TEMPLATES[0];
  let connectorId: PerspectiveConnectorId = '2_5d_parallax';
  let cameraPreset: Camera3DPresetId = 'follow_3_4';
  let hybridMode: HybridRender5Mode = 'hybrid_2_5d_billboard';

  if (lower.includes('iso') || lower.includes('isometrik')) {
    connectorId = 'isometric';
    cameraPreset = 'iso_fixed';
    hybridMode = 'isometric_painter';
    matchedGenre = GENRE_TEMPLATES.find((g) => g.id === 'rpg') ?? matchedGenre;
  } else if (lower.includes('hex') || lower.includes('taktik') || lower.includes('defense')) {
    connectorId = 'hexagonal';
    cameraPreset = 'iso_fixed';
    hybridMode = 'isometric_painter';
    matchedGenre = GENRE_TEMPLATES.find((g) => g.id === 'tower_defense') ?? matchedGenre;
  } else if (lower.includes('fps') || lower.includes('raycast') || lower.includes('first') || lower.includes('dungeon')) {
    connectorId = 'first_person';
    cameraPreset = 'fps_raycast';
    hybridMode = 'raycast_pseudo3d';
    matchedGenre = GENRE_TEMPLATES.find((g) => g.id === 'roguelike') ?? matchedGenre;
  } else if (lower.includes('race') || lower.includes('balap') || lower.includes('turbo') || lower.includes('mode 7')) {
    connectorId = 'third_person';
    cameraPreset = 'follow_3_4';
    hybridMode = 'mode7_voxel';
    matchedGenre = GENRE_TEMPLATES.find((g) => g.id === 'racing') ?? matchedGenre;
  } else if (lower.includes('space') || lower.includes('shooter') || lower.includes('bullet') || lower.includes('danmaku')) {
    connectorId = '2d_side_v';
    cameraPreset = 'follow_3_4';
    hybridMode = 'hybrid_2_5d_billboard';
    matchedGenre = GENRE_TEMPLATES.find((g) => g.id === 'bullet_hell') ?? matchedGenre;
  } else if (lower.includes('3d') || lower.includes('lowpoly') || lower.includes('voxel')) {
    connectorId = 'pseudo_3d_zstack';
    cameraPreset = 'follow_3_4';
    hybridMode = 'real_3d_lowpoly';
    matchedGenre = GENRE_TEMPLATES.find((g) => g.id === 'platformer') ?? matchedGenre;
  }

  const aiMode: AiPlayMode =
    lower.includes('auto') || lower.includes('bot') || lower.includes('sendiri')
      ? 'autopilot'
      : lower.includes('solo')
        ? 'off'
        : 'coop';

  const preferredPlugin = preferredRepoId
    ? CURATED_GITHUB_PLUGINS.find((p) => p.id === preferredRepoId)
    : undefined;
  if (preferredPlugin) {
    hybridMode = preferredPlugin.recommendedHybridMode;
    cameraPreset = preferredPlugin.recommendedCamera;
  }

  const matchingRepos = CURATED_GITHUB_PLUGINS.filter(
    (r) => r.recommendedHybridMode === hybridMode || r.supportedPerspectives.includes(connectorId)
  )
    .slice(0, 3)
    .map((r) => r.repo);
  if (preferredPlugin && !matchingRepos.includes(preferredPlugin.repo)) {
    matchingRepos.unshift(preferredPlugin.repo);
  }

  const titleWords = cleanPrompt.split(/\s+/).slice(0, 4).join(' ');
  const title = titleWords.length > 2 ? titleWords : `Bowo ${matchedGenre.name}`;
  const meshBudgetChar = 108;
  const propBoxTris = 12;
  const drawCallsEst = hybridMode === 'real_3d_lowpoly' ? 22 : 16;

  return {
    seed: combinedSeed,
    prompt: cleanPrompt,
    title,
    genreId: matchedGenre.id,
    simKind: matchedGenre.simKind,
    renderMode: hybridMode === 'real_3d_lowpoly' || hybridMode === 'raycast_pseudo3d' ? '3D Ringan' : matchedGenre.renderMode,
    physicsMode: matchedGenre.physicsMode,
    connectorId,
    cameraPreset,
    hybridMode,
    aiMode,
    styleId: matchedGenre.defaultStyle,
    speedMul: matchedGenre.speedMul,
    gravityMul: matchedGenre.gravityMul,
    levelQuests: [
      { level: 1, title: `${title}: Awaken`, objective: 'Collect 2 Shards & reach the East Gate.' },
      { level: 2, title: `${title}: Surge`, objective: 'Trigger 2 Floor Switches & gather 3 Shards.' },
      { level: 3, title: `${title}: Kala Finale`, objective: 'Defeat 3-Phase Boss Kala & unlock Sanctum Gate.' },
    ],
    prefabs: [
      { name: 'Player_Bowo_Billboard3D', role: 'Hero + 12-bone rig + Capsule', triCount: meshBudgetChar, collider: 'Box 28x44' },
      { name: 'Enemy_15Hz_Swarm', role: '15Hz AI + Telegraph + Attack Token', triCount: 72, collider: 'Circle r=16' },
      { name: 'Environment_Box_Prop', role: 'Instanced crate/pillar + Blob shadow', triCount: propBoxTris, collider: 'Static AABB' },
    ],
    rules: [
      { condition: 'ON_SHARD_COLLECT', action: 'ADD_SCORE_25' },
      { condition: 'ON_LOW_HP', action: 'HEAL_15' },
      { condition: 'ON_SWITCH_ALL', action: 'OPEN_GATE' },
    ],
    bytecodeScript: `SET ${combinedSeed % 50}\nADD 15\nSAY 1\nSPAWN 2\nPLAY 1\nEND`,
    repoStack: matchingRepos.length > 0 ? matchingRepos : ['axmolengine/axmol', 'mcp-game-deck/mcp-game-deck'],
    budgetReport: {
      targetFps: 30,
      drawCallsEst,
      trisEst: meshBudgetChar + 72 * 5 + propBoxTris * 8,
      ramMbEst: 24,
      passesA70: drawCallsEst < SPACE3D_CONSTANTS.MAX_DRAW_CALLS,
    },
  };
}

