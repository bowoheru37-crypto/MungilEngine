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

import type {
  GeneratedCharacterSpec,
  GeneratedCutsceneSpec,
  GeneratedPropSpec,
  GeneratedSfxSpec,
  GeneratedTerrainSpec,
  GeneratedTrackSpec,
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
