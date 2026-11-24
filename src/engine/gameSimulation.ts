import { GENRE_TEMPLATES } from './catalogs';
import {
  createBoneSpringState,
  evaluateCharacterFsm,
  stepBonePoseSpring,
  validateMoveBounds,
} from './engineCore';
import type {
  BoneSpringState,
  CharacterAnimState,
  EnemyArchetype,
  EventSheetRule,
  GenreSimulationKind,
  HudSnapshot,
  LevelDefinition,
  PhysicsMode,
  RenderMode,
  SaveSlotData,
  SavedWorldProgress,
  WeatherKind,
} from './types';

export function resolveGenreSimKind(genreId?: string): GenreSimulationKind {
  if (!genreId) return 'platformer';
  const found = GENRE_TEMPLATES.find((g) => g.id === genreId);
  return found?.simKind ?? 'platformer';
}

export const LEVEL_DEFINITIONS: Record<1 | 2 | 3, LevelDefinition> = {
  1: {
    level: 1,
    code: 'DESA_FAJAR',
    titleId: 'Babak 1 — Desa Fajar',
    titleEn: 'Level 1 — Dawn Village',
    subtitleId: 'Kumpulkan 2 Pecahan Cahaya & masuki Gerbang Timur.',
    subtitleEn: 'Collect 2 Light Shards and enter the East Gate.',
    width: 1120,
    height: 440,
    groundY: 372,
    requiredShards: 2,
    requiredSwitches: 0,
    maxAttackTokens: 2,
    recommendedStyle: 'pixel',
    weather: 'Cerah',
    hasBoss: false,
    platforms: [
      { x: 210, y: 294, w: 120, h: 18 },
      { x: 430, y: 244, w: 130, h: 18 },
      { x: 670, y: 280, w: 130, h: 18 },
      { x: 850, y: 226, w: 110, h: 18 },
    ],
    trees: [
      { x: 140, y: 372, scale: 1.0 },
      { x: 380, y: 372, scale: 0.88 },
      { x: 610, y: 372, scale: 1.05 },
      { x: 930, y: 372, scale: 0.95 },
    ],
    rocks: [
      { x: 290, y: 372, scale: 0.9 },
      { x: 760, y: 372, scale: 1.0 },
    ],
    switches: [],
    gate: { x: 1030, y: 292, w: 46, h: 80 },
    shards: [
      { id: 1, x: 495, y: 212 },
      { id: 2, x: 905, y: 192 },
    ],
    coins: [
      { id: 1, x: 250, y: 264 },
      { id: 2, x: 290, y: 264 },
      { id: 3, x: 560, y: 342 },
      { id: 4, x: 720, y: 250 },
      { id: 5, x: 960, y: 342 },
    ],
    enemies: [
      { id: 1, archetype: 'slime', x: 350, y: 354, patrolMinX: 250, patrolMaxX: 460 },
      { id: 2, archetype: 'slime', x: 630, y: 354, patrolMinX: 520, patrolMaxX: 770 },
      { id: 3, archetype: 'wisp', x: 740, y: 210, patrolMinX: 640, patrolMaxX: 880 },
    ],
  },
  2: {
    level: 2,
    code: 'JEMBATAN_BADAI',
    titleId: 'Babak 2 — Jembatan Badai',
    titleEn: 'Level 2 — Storm Bridge',
    subtitleId: 'Injak 2 Saklar Badai & ambil 3 Pecahan Cahaya di tengah badai.',
    subtitleEn: 'Activate 2 Storm Switches & gather 3 Light Shards.',
    width: 1260,
    height: 440,
    groundY: 372,
    requiredShards: 3,
    requiredSwitches: 2,
    maxAttackTokens: 2,
    recommendedStyle: 'cyberpunk',
    weather: 'Hujan',
    hasBoss: false,
    platforms: [
      { x: 190, y: 296, w: 120, h: 18 },
      { x: 380, y: 236, w: 120, h: 18 },
      { x: 580, y: 280, w: 130, h: 18 },
      { x: 790, y: 224, w: 130, h: 18 },
      { x: 980, y: 278, w: 110, h: 18 },
    ],
    trees: [
      { x: 120, y: 372, scale: 0.9 },
      { x: 540, y: 372, scale: 0.85 },
      { x: 920, y: 372, scale: 0.95 },
    ],
    rocks: [
      { x: 310, y: 372, scale: 1.0 },
      { x: 690, y: 372, scale: 1.05 },
      { x: 1090, y: 372, scale: 0.9 },
    ],
    switches: [
      { id: 1, x: 440, y: 224 },
      { id: 2, x: 855, y: 212 },
    ],
    gate: { x: 1165, y: 292, w: 46, h: 80 },
    shards: [
      { id: 1, x: 250, y: 262 },
      { id: 2, x: 645, y: 244 },
      { id: 3, x: 1035, y: 244 },
    ],
    coins: [
      { id: 1, x: 225, y: 266 },
      { id: 2, x: 410, y: 204 },
      { id: 3, x: 615, y: 248 },
      { id: 4, x: 825, y: 192 },
      { id: 5, x: 1010, y: 246 },
      { id: 6, x: 1100, y: 342 },
    ],
    enemies: [
      { id: 1, archetype: 'slime', x: 330, y: 354, patrolMinX: 230, patrolMaxX: 460 },
      { id: 2, archetype: 'wisp', x: 520, y: 192, patrolMinX: 400, patrolMaxX: 660 },
      { id: 3, archetype: 'sentinel', x: 780, y: 350, patrolMinX: 640, patrolMaxX: 920 },
      { id: 4, archetype: 'wisp', x: 960, y: 186, patrolMinX: 840, patrolMaxX: 1100 },
      { id: 5, archetype: 'sentinel', x: 1060, y: 350, patrolMinX: 930, patrolMaxX: 1130 },
    ],
  },
  3: {
    level: 3,
    code: 'MENARA_KALA',
    titleId: 'Babak 3 — Menara Kala',
    titleEn: 'Level 3 — Kala’s Tower',
    subtitleId: 'Hadapi Boss Kala (3 Fase) & pulihkan Pecahan Cahaya terakhir!',
    subtitleEn: 'Defeat Boss Kala (3 Phases) & restore the final Light Shards!',
    width: 1180,
    height: 440,
    groundY: 372,
    requiredShards: 2,
    requiredSwitches: 1,
    maxAttackTokens: 3,
    recommendedStyle: 'dark',
    weather: 'Salju',
    hasBoss: true,
    platforms: [
      { x: 190, y: 292, w: 120, h: 18 },
      { x: 440, y: 238, w: 140, h: 18 },
      { x: 730, y: 238, w: 140, h: 18 },
      { x: 960, y: 292, w: 120, h: 18 },
    ],
    trees: [],
    rocks: [
      { x: 160, y: 372, scale: 1.1 },
      { x: 560, y: 372, scale: 1.0 },
      { x: 1040, y: 372, scale: 1.1 },
    ],
    switches: [{ id: 1, x: 510, y: 226 }],
    gate: { x: 1090, y: 292, w: 48, h: 80 },
    shards: [
      { id: 1, x: 250, y: 260 },
      { id: 2, x: 800, y: 204 },
    ],
    coins: [
      { id: 1, x: 220, y: 262 },
      { id: 2, x: 480, y: 208 },
      { id: 3, x: 760, y: 208 },
      { id: 4, x: 1010, y: 262 },
    ],
    enemies: [
      { id: 1, archetype: 'sentinel', x: 390, y: 350, patrolMinX: 280, patrolMaxX: 520 },
      { id: 2, archetype: 'wisp', x: 640, y: 184, patrolMinX: 500, patrolMaxX: 780 },
      { id: 3, archetype: 'boss_kala', x: 890, y: 334, patrolMinX: 650, patrolMaxX: 1020 },
    ],
  },
};

export interface SimEnemy {
  id: number;
  archetype: EnemyArchetype;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  patrolMinX: number;
  patrolMaxX: number;
  dir: 1 | -1;
  flash: number;
  attackCooldown: number;
  telegraphTimer: number;
  telegraphMax: number;
  hasToken: boolean;
  koTimer: number;
  dead: boolean;
  bossPhase: 1 | 2 | 3;
}

export interface SimProjectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fromPlayer: boolean;
  damage: number;
  life: number;
  r: number;
}

export interface SimFloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
}

export interface SimPlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: 1 | -1;
  grounded: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  invulnTimer: number;
  parryTimer: number;
  dashTimer: number;
  dashCooldown: number;
  attackTimer: number;
  attackCooldown: number;
  comboCount: number;
  comboWindow: number;
  squashX: number;
  squashY: number;
  flash: number;
  koTimer: number;
}

export interface SimSwitch {
  id: number;
  x: number;
  y: number;
  active: boolean;
}

export interface SimCollectible {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}

export interface SimInput {
  moveX: number;
  moveY: number;
  jumpPressed: boolean;
  jumpHeld: boolean;
  attackPressed: boolean;
  dashPressed: boolean;
  burstPressed: boolean;
}

export interface SimConfig {
  physicsMode: PhysicsMode;
  renderMode: RenderMode;
  weather: WeatherKind;
  practiceMode: boolean;
  speedMul: number;
  gravityMul: number;
  ecoAi15Hz?: boolean;
  eventRules?: EventSheetRule[];
}

export interface SimEventOut {
  type: 'sfx' | 'hit' | 'parry' | 'level_clear' | 'victory' | 'gameover' | 'phase';
  detail?: string;
  x?: number;
}

export interface SimObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SimTurret {
  id: number;
  x: number;
  y: number;
  cooldown: number;
  life: number;
}

export interface SimBeatNote {
  id: number;
  x: number;
  lane: 0 | 1 | 2;
  hit: boolean;
}

export interface VnChoiceOption {
  label: string;
  deltaScore: number;
  heal: number;
  reply: string;
}

export interface GameWorld {
  level: 1 | 2 | 3;
  genreId: string;
  simKind: GenreSimulationKind;
  status: 'playing' | 'victory' | 'gameover';
  time: number;
  hitstopTimer: number;
  cameraX: number;
  shakeTrauma: number;
  player: SimPlayer;
  enemies: SimEnemy[];
  projectiles: SimProjectile[];
  floatingTexts: SimFloatingText[];
  switches: SimSwitch[];
  shards: SimCollectible[];
  coins: SimCollectible[];
  obstacles: SimObstacle[];
  turrets: SimTurret[];
  beatNotes: SimBeatNote[];
  lanternHp: number;
  lanternMaxHp: number;
  lane: 0 | 1 | 2;
  laneSwitchCooldown: number;
  trackDist: number;
  speedKmh: number;
  doubleJumpsLeft: number;
  magnetRadius: number;
  vnStep: number;
  vnPrompt: string;
  vnChoices: VnChoiceOption[];
  gateUnlocked: boolean;
  coinsTotal: number;
  shardsTotal: number;
  score: number;
  kills: number;
  potions: number;
  dialogue: string;
  nextEntityId: number;
  simStepTick: number;
  lowHpRuleCooldown: number;
  playerPose: CharacterAnimState;
  cloakSpring: BoneSpringState;
}

const VN_SCENES: Array<{ prompt: string; choices: VnChoiceOption[] }> = [
  {
    prompt: 'Gerbang Desa Fajar diselimuti kabut bayangan. Apa langkah Bowo?',
    choices: [
      { label: 'Nyalakan Lentera Cahaya (+1 Pecahan)', deltaScore: 250, heal: 10, reply: 'Lentera menyala terang, menguak jalan menembus kabut!' },
      { label: 'Ajak Penjaga Desa berpatroli (+150 Skor)', deltaScore: 150, heal: 20, reply: 'Warga desa bersatu mendukung misi Bowo.' },
    ],
  },
  {
    prompt: 'Di Jembatan Badai, Storm Wisp menghalangi saklar energi!',
    choices: [
      { label: 'Gunakan Dash Parry memantulkan petir!', deltaScore: 300, heal: 0, reply: 'Petir terpantul tepat sasaran! Saklar badai aktif!' },
      { label: 'Negosiasi dengan roh angin kuno (+20 HP)', deltaScore: 200, heal: 20, reply: 'Roh angin memberi restu dan memulihkan tenaga Bowo.' },
    ],
  },
  {
    prompt: 'Puncak Menara Kala! Boss Kala menawarkan persekutuan bayangan.',
    choices: [
      { label: 'Tolak kegelapan — aktifkan Cahaya Burst!', deltaScore: 500, heal: 15, reply: 'Gelombang Cahaya menghancurkan segel Menara Kala!' },
      { label: 'Tantang duel kehormatan satu lawan satu!', deltaScore: 450, heal: 25, reply: 'Semangat ksatria Bowo melemahkan aura Boss Kala!' },
    ],
  },
];

export function selectVisualNovelChoice(world: GameWorld, choiceIndex: number): boolean {
  if (world.simKind !== 'visual_novel' || world.status !== 'playing') return false;
  const opt = world.vnChoices[choiceIndex];
  if (!opt) return false;
  world.score += opt.deltaScore;
  world.player.hp = Math.min(world.player.maxHp, world.player.hp + opt.heal);
  world.dialogue = opt.reply;
  world.floatingTexts.push({
    x: world.player.x,
    y: world.player.y - 36,
    vy: -36,
    text: `+${opt.deltaScore}`,
    color: '#fde047',
    life: 0.9,
  });

  // Collect next shard automatically as narrative progresses
  const uncollected = world.shards.find((s) => !s.collected);
  if (uncollected) {
    uncollected.collected = true;
    world.shardsTotal += 1;
  }
  for (const sw of world.switches) {
    sw.active = true;
  }

  world.vnStep += 1;
  if (world.vnStep >= VN_SCENES.length) {
    world.vnChoices = [];
    world.vnPrompt = 'Kisah cahaya tuntas! Gerbang Timur terbuka menuju kemenangan.';
    world.gateUnlocked = true;
    for (const e of world.enemies) {
      e.dead = true;
    }
    const def = LEVEL_DEFINITIONS[world.level];
    world.player.x = def.gate.x + 10;
  } else {
    const nextScene = VN_SCENES[world.vnStep];
    world.vnPrompt = nextScene.prompt;
    world.vnChoices = nextScene.choices;
  }
  return true;
}

export function createLevelWorld(
  level: 1 | 2 | 3,
  carry?: Partial<Pick<GameWorld, 'coinsTotal' | 'score' | 'kills' | 'potions' | 'shardsTotal'>>,
  genreId = 'platformer'
): GameWorld {
  const def = LEVEL_DEFINITIONS[level];
  const simKind = resolveGenreSimKind(genreId);
  const startY =
    simKind === 'topdown' || simKind === 'shooter'
      ? 220
      : simKind === 'runner' || simKind === 'rhythm'
        ? 290
        : def.groundY - 24;

  const obstacles: SimObstacle[] =
    simKind === 'topdown'
      ? [
          { x: 260, y: 120, w: 54, h: 72 },
          { x: 470, y: 230, w: 56, h: 78 },
          { x: 690, y: 110, w: 54, h: 72 },
          { x: 870, y: 215, w: 54, h: 76 },
        ]
      : [];

  const turrets: SimTurret[] =
    simKind === 'defense'
      ? [{ id: 1, x: 210, y: def.groundY - 22, cooldown: 0.4, life: 999 }]
      : [];

  const beatNotes: SimBeatNote[] =
    simKind === 'rhythm' || simKind === 'runner'
      ? Array.from({ length: 12 }, (_, idx) => ({
          id: idx + 1,
          x: 420 + idx * 145,
          lane: ((idx + level) % 3) as 0 | 1 | 2,
          hit: false,
        }))
      : [];

  const enemyStartXOffset = simKind === 'defense' ? 180 : 0;

  return {
    level,
    genreId,
    simKind,
    status: 'playing',
    time: 0,
    hitstopTimer: 0,
    cameraX: 0,
    shakeTrauma: 0,
    player: {
      x: simKind === 'defense' ? 235 : 84,
      y: startY,
      vx: 0,
      vy: 0,
      w: simKind === 'shooter' && genreId === 'bullet_hell' ? 16 : 28,
      h: simKind === 'shooter' && genreId === 'bullet_hell' ? 16 : 42,
      facing: 1,
      grounded: simKind === 'platformer' || simKind === 'brawler' || simKind === 'defense' || simKind === 'collector',
      coyoteTimer: 0.1,
      jumpBufferTimer: 0,
      hp: 100,
      maxHp: 100,
      energy: simKind === 'defense' ? 80 : 60,
      maxEnergy: 100,
      invulnTimer: 0,
      parryTimer: 0,
      dashTimer: 0,
      dashCooldown: 0,
      attackTimer: 0,
      attackCooldown: 0,
      comboCount: 0,
      comboWindow: 0,
      squashX: 1,
      squashY: 1,
      flash: 0,
      koTimer: 0,
    },
    enemies: def.enemies.map((e) => {
      const hp =
        simKind === 'brawler'
          ? e.archetype === 'boss_kala'
            ? 240
            : 44
          : e.archetype === 'boss_kala'
            ? 300
            : e.archetype === 'sentinel'
              ? 56
              : e.archetype === 'wisp'
                ? 34
                : 26;
      const r = e.archetype === 'boss_kala' ? 28 : e.archetype === 'sentinel' ? 18 : 14;
      const ey =
        simKind === 'topdown' || simKind === 'shooter'
          ? 120 + ((e.id * 73) % 210)
          : e.y;
      return {
        id: e.id,
        archetype: e.archetype,
        x: Math.min(def.width - 60, e.x + enemyStartXOffset),
        y: ey,
        vx: 0,
        vy: 0,
        r,
        hp,
        maxHp: hp,
        patrolMinX: e.patrolMinX,
        patrolMaxX: e.patrolMaxX,
        dir: -1,
        flash: 0,
        attackCooldown: 0.8 + e.id * 0.25,
        telegraphTimer: 0,
        telegraphMax: e.archetype === 'boss_kala' ? 0.55 : 0.45,
        hasToken: false,
        koTimer: 0,
        dead: false,
        bossPhase: 1,
      };
    }),
    projectiles: [],
    floatingTexts: [],
    switches: def.switches.map((s, i) => ({
      id: s.id,
      x: simKind === 'topdown' ? 240 + i * 320 : s.x,
      y: simKind === 'topdown' ? 110 + i * 160 : s.y,
      active: false,
    })),
    shards: def.shards.map((s, i) => ({
      id: s.id,
      x: s.x,
      y: simKind === 'topdown' || simKind === 'shooter' ? 115 + (i % 2) * 180 : s.y,
      collected: false,
    })),
    coins: def.coins.map((c, i) => ({
      id: c.id,
      x: c.x,
      y: simKind === 'topdown' || simKind === 'shooter' ? 95 + (i % 3) * 110 : c.y,
      collected: false,
    })),
    obstacles,
    turrets,
    beatNotes,
    lanternHp: 100,
    lanternMaxHp: 100,
    lane: 1,
    laneSwitchCooldown: 0,
    trackDist: 0,
    speedKmh: simKind === 'runner' ? 185 : 0,
    doubleJumpsLeft: genreId === 'metroidvania' ? 1 : 0,
    magnetRadius: simKind === 'collector' ? 135 : 0,
    vnStep: 0,
    vnPrompt: VN_SCENES[0].prompt,
    vnChoices: simKind === 'visual_novel' ? VN_SCENES[0].choices : [],
    gateUnlocked: false,
    coinsTotal: carry?.coinsTotal ?? 0,
    shardsTotal: carry?.shardsTotal ?? 0,
    score: carry?.score ?? 0,
    kills: carry?.kills ?? 0,
    potions: carry?.potions ?? 2,
    dialogue: def.subtitleId,
    nextEntityId: 100,
    simStepTick: 0,
    lowHpRuleCooldown: 0,
    playerPose: 'idle',
    cloakSpring: createBoneSpringState(),
  };
}

export function extractWorldSaveProgress(world: GameWorld): SavedWorldProgress {
  const ws: SavedWorldProgress = {
    genreId: world.genreId || 'platformer',
    playerX: Number(world.player.x.toFixed(1)),
    playerY: Number(world.player.y.toFixed(1)),
    collectedShardIds: world.shards.filter((s) => s.collected).map((s) => s.id),
    collectedCoinIds: world.coins.filter((c) => c.collected).map((c) => c.id),
    activatedSwitchIds: world.switches.filter((s) => s.active).map((s) => s.id),
    defeatedEnemyIds: world.enemies.filter((e) => e.dead).map((e) => e.id),
  };
  if (world.simKind === 'defense') ws.lanternHp = Math.round(world.lanternHp);
  if (world.simKind === 'runner') ws.trackDist = Number(world.trackDist.toFixed(1));
  if (world.simKind === 'visual_novel') ws.vnStep = world.vnStep;
  if (world.time > 0) ws.elapsedSec = Number(world.time.toFixed(1));
  return ws;
}

export function restoreWorldFromSave(save: SaveSlotData): GameWorld {
  const ws = save.worldState;
  const genreId = ws?.genreId || 'platformer';
  const world = createLevelWorld(
    save.level,
    {
      coinsTotal: save.coins,
      score: save.score,
      kills: save.kills,
      potions: save.potions,
      shardsTotal: save.shards,
    },
    genreId
  );

  world.player.hp = Math.max(1, Math.min(world.player.maxHp, save.hp));
  world.player.energy = Math.max(0, Math.min(world.player.maxEnergy, save.energy));

  if (ws) {
    const def = LEVEL_DEFINITIONS[save.level];
    world.player.x = Math.max(24, Math.min(def.width - 28, ws.playerX));
    world.player.y = Math.max(24, Math.min(def.height - 24, ws.playerY));
    world.cameraX = Math.max(0, Math.min(Math.max(0, def.width - 420), world.player.x - 160));
    if (typeof ws.elapsedSec === 'number') world.time = ws.elapsedSec;
    if (typeof ws.lanternHp === 'number') world.lanternHp = ws.lanternHp;
    if (typeof ws.trackDist === 'number') world.trackDist = ws.trackDist;
    if (typeof ws.vnStep === 'number' && world.simKind === 'visual_novel') {
      world.vnStep = Math.max(0, Math.min(VN_SCENES.length, ws.vnStep));
      if (world.vnStep >= VN_SCENES.length) {
        world.vnChoices = [];
        world.vnPrompt = 'Kisah cahaya tuntas! Gerbang Timur terbuka menuju kemenangan.';
      } else {
        world.vnPrompt = VN_SCENES[world.vnStep].prompt;
        world.vnChoices = VN_SCENES[world.vnStep].choices;
      }
    }

    const shardSet = new Set(ws.collectedShardIds);
    const coinSet = new Set(ws.collectedCoinIds);
    const switchSet = new Set(ws.activatedSwitchIds);
    const enemySet = new Set(ws.defeatedEnemyIds);

    for (const sh of world.shards) {
      if (shardSet.has(sh.id)) sh.collected = true;
    }
    for (const co of world.coins) {
      if (coinSet.has(co.id)) co.collected = true;
    }
    for (const sw of world.switches) {
      if (switchSet.has(sw.id)) sw.active = true;
    }
    for (const en of world.enemies) {
      if (enemySet.has(en.id)) {
        en.dead = true;
        en.hp = 0;
      }
    }

    const shardsCollected = world.shards.filter((s) => s.collected).length;
    const switchesActive = world.switches.filter((s) => s.active).length;
    const bossDead = !def.hasBoss || world.enemies.every((e) => e.archetype !== 'boss_kala' || e.dead);
    world.gateUnlocked =
      shardsCollected >= def.requiredShards &&
      switchesActive >= def.requiredSwitches &&
      bossDead;
  }

  world.dialogue = `Progres Babak ${save.level} dimuat!`;
  return world;
}

export function usePotion(world: GameWorld): boolean {
  if (world.potions <= 0 || world.player.hp >= world.player.maxHp || world.status !== 'playing') {
    return false;
  }
  world.potions -= 1;
  world.player.hp = Math.min(world.player.maxHp, world.player.hp + 40);
  world.floatingTexts.push({
    x: world.player.x,
    y: world.player.y - 36,
    vy: -42,
    text: '+40 HP',
    color: '#4ade80',
    life: 0.8,
  });
  world.dialogue = 'Potion diminum! +40 HP pulih.';
  return true;
}

export function getBossSummary(world: GameWorld): { hp: number; maxHp: number; phase: 1 | 2 | 3; active: boolean } {
  const boss = world.enemies.find((e) => e.archetype === 'boss_kala' && !e.dead);
  if (!boss) return { hp: 0, maxHp: 300, phase: 1, active: false };
  return { hp: Math.max(0, Math.round(boss.hp)), maxHp: boss.maxHp, phase: boss.bossPhase, active: true };
}

export function toHudSnapshot(
  world: GameWorld,
  perf: {
    fps: number;
    resolutionScale: number;
    drawCalls: number;
    culledCount?: number;
    powerSaveActive: boolean;
    aiMode?: 'off' | 'coop' | 'autopilot';
    aiNote?: string;
  }
): HudSnapshot {
  const def = LEVEL_DEFINITIONS[world.level];
  const boss = getBossSummary(world);
  const collectedShards = world.shards.filter((s) => s.collected).length;
  const activeSwitches = world.switches.filter((s) => s.active).length;

  return {
    level: world.level,
    genreId: world.genreId,
    simKind: world.simKind,
    hp: Math.max(0, Math.round(world.player.hp)),
    maxHp: world.player.maxHp,
    energy: Math.round(world.player.energy),
    maxEnergy: world.player.maxEnergy,
    coins: world.coinsTotal,
    shards: collectedShards,
    requiredShards: def.requiredShards,
    switchesActive: activeSwitches,
    requiredSwitches: def.requiredSwitches,
    score: world.score,
    combo: world.player.comboCount,
    kills: world.kills,
    potions: world.potions,
    bossHp: boss.hp,
    bossMaxHp: boss.maxHp,
    bossPhase: boss.phase,
    bossActive: boss.active,
    gateUnlocked: world.gateUnlocked,
    elapsedSec: Math.round(world.time * 10) / 10,
    fps: perf.fps,
    resolutionScale: perf.resolutionScale,
    drawCalls: perf.drawCalls,
    culledCount: perf.culledCount ?? 0,
    activeEntities: 1 + world.enemies.filter((e) => !e.dead).length + world.projectiles.length + world.coins.filter((c) => !c.collected).length,
    powerSaveActive: perf.powerSaveActive,
    dialogue: world.dialogue,
    lanternHp: world.simKind === 'defense' ? Math.max(0, Math.round(world.lanternHp)) : undefined,
    speedKmh: world.simKind === 'runner' ? Math.round(world.speedKmh) : undefined,
    vnPrompt: world.simKind === 'visual_novel' ? world.vnPrompt : undefined,
    vnChoices: world.simKind === 'visual_novel' ? world.vnChoices.map((c) => c.label) : undefined,
    aiMode: perf.aiMode,
    aiNote: perf.aiNote,
  };
}

export function stepGameWorld(
  world: GameWorld,
  input: SimInput,
  dtRaw: number,
  config: SimConfig,
  viewportW = 480
): SimEventOut[] {
  const events: SimEventOut[] = [];
  if (world.status !== 'playing') return events;

  const dt = Math.min(0.05, Math.max(0.001, dtRaw));
  world.time += dt;
  world.simStepTick += 1;
  world.lowHpRuleCooldown = Math.max(0, world.lowHpRuleCooldown - dt);
  world.shakeTrauma = Math.max(0, world.shakeTrauma - dt * 1.9);

  // Hitstop freeze frame for crisp impact feel (camera shake & flash still decay)
  if (world.hitstopTimer > 0) {
    world.hitstopTimer = Math.max(0, world.hitstopTimer - dt);
    return events;
  }

  const def = LEVEL_DEFINITIONS[world.level];
  const p = world.player;
  const prevPlayerX = p.x;
  const prevPlayerY = p.y;
  const sim = world.simKind;
  const isFree2D = sim === 'topdown' || sim === 'shooter';

  // Cooldowns & squash recovery
  p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  p.parryTimer = Math.max(0, p.parryTimer - dt);
  p.dashTimer = Math.max(0, p.dashTimer - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.attackTimer = Math.max(0, p.attackTimer - dt);
  p.attackCooldown = Math.max(0, p.attackCooldown - dt);
  p.comboWindow = Math.max(0, p.comboWindow - dt);
  p.flash = Math.max(0, p.flash - dt);
  p.energy = Math.min(p.maxEnergy, p.energy + dt * (sim === 'defense' ? 11 : 7.5));
  p.squashX += (1 - p.squashX) * Math.min(1, dt * 14);
  p.squashY += (1 - p.squashY) * Math.min(1, dt * 14);
  world.laneSwitchCooldown = Math.max(0, world.laneSwitchCooldown - dt);

  if (p.comboWindow <= 0) {
    p.comboCount = 0;
  }

  // Coyote time & jump input buffer
  if (p.grounded) {
    p.coyoteTimer = 0.1;
    if (world.genreId === 'metroidvania') {
      world.doubleJumpsLeft = 1;
    }
  } else {
    p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
  }
  if (input.jumpPressed) {
    p.jumpBufferTimer = 0.12;
  } else {
    p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);
  }

  // Movement & Gravity per Genre Simulation Kind
  const maxMoveSpeed = 215 * config.speedMul;
  const gravity =
    isFree2D || sim === 'runner' || sim === 'rhythm'
      ? 0
      : (config.physicsMode === 'Zero-G' ? 280 : config.physicsMode === 'Realistis' ? 980 : 880) * config.gravityMul;

  if (sim === 'runner') {
    // Mode-7 3-Lane Auto-Forward Highway Sprint
    if (world.laneSwitchCooldown <= 0) {
      if (input.moveY < -0.35 || input.jumpPressed) {
        world.lane = Math.max(0, world.lane - 1) as 0 | 1 | 2;
        world.laneSwitchCooldown = 0.16;
        events.push({ type: 'sfx', detail: 'footstep', x: 0 });
      } else if (input.moveY > 0.35) {
        world.lane = Math.min(2, world.lane + 1) as 0 | 1 | 2;
        world.laneSwitchCooldown = 0.16;
        events.push({ type: 'sfx', detail: 'footstep', x: 0 });
      }
    }
    const targetSpeed = (p.dashTimer > 0 ? 320 : 210) * config.speedMul;
    world.speedKmh += (targetSpeed - world.speedKmh) * Math.min(1, dt * 6);
    const roadScrollVx = world.speedKmh * 0.72;
    world.trackDist += world.speedKmh * 0.36 * dt;
    p.x = Math.min(def.gate.x + 12, p.x + Math.max(20, input.moveX * 95 + roadScrollVx * 0.16) * dt);
    const targetLaneY = 215 + world.lane * 68;
    p.y += (targetLaneY - p.y) * Math.min(1, dt * 14);
    p.vx = roadScrollVx;
    p.vy = 0;
    p.facing = 1;
    p.grounded = true;
    // Scroll road notes leftward toward runner
    for (const note of world.beatNotes) {
      note.x -= roadScrollVx * dt;
      if (!note.hit && Math.abs(note.x - p.x) < 26 && note.lane === world.lane) {
        note.hit = true;
        world.score += 90;
        world.coinsTotal = Math.min(9999, world.coinsTotal + 3);
        world.floatingTexts.push({ x: p.x, y: p.y - 26, vy: -40, text: '+BOOST', color: '#38bdf8', life: 0.65 });
        events.push({ type: 'sfx', detail: 'coin', x: 0 });
      }
      if (note.x < world.cameraX - 60) {
        note.x = world.cameraX + 760 + (note.id % 3) * 60;
        note.hit = false;
      }
    }
  } else if (sim === 'rhythm') {
    // 3-Lane BPM Beat-Note Catcher
    if (world.laneSwitchCooldown <= 0) {
      if (input.moveY < -0.35 || input.jumpPressed) {
        world.lane = Math.max(0, world.lane - 1) as 0 | 1 | 2;
        world.laneSwitchCooldown = 0.14;
      } else if (input.moveY > 0.35) {
        world.lane = Math.min(2, world.lane + 1) as 0 | 1 | 2;
        world.laneSwitchCooldown = 0.14;
      }
    }
    p.x = Math.max(80, Math.min(280, p.x + input.moveX * 140 * dt));
    const targetLaneY = 215 + world.lane * 68;
    p.y += (targetLaneY - p.y) * Math.min(1, dt * 16);
    p.vx = input.moveX * 140;
    p.vy = 0;
    p.facing = 1;
    const noteSpeed = (175 + world.level * 22) * config.speedMul;
    for (const note of world.beatNotes) {
      note.x -= noteSpeed * dt;
      if (note.x < 40) {
        note.x = 640 + (note.id % 4) * 90;
        note.hit = false;
      }
    }
    if (input.attackPressed || input.dashPressed || input.burstPressed) {
      const strikeX = p.x + 28;
      const hitNote = world.beatNotes.find((n) => !n.hit && n.lane === world.lane && Math.abs(n.x - strikeX) <= 52);
      if (hitNote) {
        hitNote.hit = true;
        p.comboCount += 1;
        p.comboWindow = 1.6;
        const pts = 140 + p.comboCount * 20;
        world.score += pts;
        world.floatingTexts.push({ x: strikeX, y: p.y - 28, vy: -42, text: `PERFECT +${pts}`, color: '#4ade80', life: 0.75 });
        events.push({ type: 'sfx', detail: 'parry', x: 0 });
        world.projectiles.push({
          id: world.nextEntityId++,
          x: p.x + 20,
          y: p.y,
          vx: 360,
          vy: 0,
          fromPlayer: true,
          damage: 24,
          life: 1.5,
          r: 6,
        });
      }
    }
  } else if (isFree2D) {
    // 8-Way Top-Down (RPG / Roguelike / Survival / Puzzle) & 360° Flight (Shooter / Bullet Hell)
    if (p.dashTimer <= 0) {
      const accel = config.physicsMode === 'Realistis' ? 9 : 16;
      const vyMul = sim === 'shooter' ? 1.0 : 0.92;
      p.vx += (input.moveX * maxMoveSpeed - p.vx) * Math.min(1, dt * accel);
      p.vy += (input.moveY * maxMoveSpeed * vyMul - p.vy) * Math.min(1, dt * accel);
      if (Math.abs(input.moveX) > 0.15) {
        p.facing = input.moveX > 0 ? 1 : -1;
      }
    }
    p.grounded = false;
  } else {
    // Standard Platformer / Brawler / Defense / Collector / Visual Novel
    if (p.dashTimer <= 0) {
      const targetVx = sim === 'visual_novel' ? 0 : input.moveX * maxMoveSpeed;
      const accel = config.physicsMode === 'Realistis' ? 10 : 18;
      p.vx += (targetVx - p.vx) * Math.min(1, dt * accel);
      if (Math.abs(input.moveX) > 0.15) {
        p.facing = input.moveX > 0 ? 1 : -1;
      }
    }

    if (p.grounded && Math.abs(p.vx) > 65 && p.dashTimer <= 0) {
      const prevPhase = Math.floor((world.time - dt) * 4.5);
      const currPhase = Math.floor(world.time * 4.5);
      if (currPhase !== prevPhase) {
        events.push({ type: 'sfx', detail: 'footstep', x: p.x - world.cameraX });
      }
    }

    // Jump trigger with coyote + buffer + Metroidvania double-jump
    if (p.jumpBufferTimer > 0 && (p.coyoteTimer > 0 || world.doubleJumpsLeft > 0) && sim !== 'visual_novel') {
      if (p.coyoteTimer <= 0 && world.doubleJumpsLeft > 0) {
        world.doubleJumpsLeft -= 1;
      }
      p.vy = config.physicsMode === 'Zero-G' ? -290 : -415;
      p.grounded = false;
      p.coyoteTimer = 0;
      p.jumpBufferTimer = 0;
      p.squashX = 0.78;
      p.squashY = 1.24;
      events.push({ type: 'sfx', detail: 'jump', x: p.x - world.cameraX });
    }

    if (!input.jumpHeld && p.vy < -140) {
      p.vy *= 0.65;
    }
  }

  // Dash / Parry (all action genres)
  if (input.dashPressed && p.dashCooldown <= 0 && sim !== 'visual_novel') {
    p.dashTimer = 0.16;
    p.dashCooldown = sim === 'brawler' ? 0.42 : 0.65;
    p.parryTimer = 0.22;
    p.invulnTimer = Math.max(p.invulnTimer, 0.22);
    if (isFree2D) {
      const len = Math.hypot(input.moveX, input.moveY) || 1;
      const dx = Math.abs(input.moveX) + Math.abs(input.moveY) > 0.1 ? input.moveX / len : p.facing;
      const dy = Math.abs(input.moveX) + Math.abs(input.moveY) > 0.1 ? input.moveY / len : 0;
      p.vx = dx * 420 * config.speedMul;
      p.vy = dy * 420 * config.speedMul;
    } else {
      p.vx = p.facing * 430 * config.speedMul;
      p.vy = Math.min(p.vy, 0);
    }
    p.energy = Math.max(0, p.energy - 8);
    p.squashX = 1.28;
    p.squashY = 0.76;
    events.push({ type: 'sfx', detail: 'dash', x: p.x - world.cameraX });
  }

  // Primary Attack (Projectile Blasters for Shooter/Bullet Hell; Juggle Melee for Fighter; 360/Arc Melee otherwise)
  if (input.attackPressed && p.attackCooldown <= 0 && sim !== 'visual_novel') {
    p.attackTimer = 0.18;
    p.attackCooldown = sim === 'shooter' ? 0.16 : 0.22;
    p.comboCount = (p.comboCount % 3) + 1;
    p.comboWindow = 0.9;
    events.push({ type: 'sfx', detail: 'attack', x: p.x - world.cameraX });

    if (sim === 'shooter') {
      const fanCount = world.genreId === 'bullet_hell' ? 3 : 2;
      for (let i = 0; i < fanCount; i++) {
        const spreadAngle = (i - (fanCount - 1) / 2) * 0.16;
        const speed = 380;
        world.projectiles.push({
          id: world.nextEntityId++,
          x: p.x + p.facing * 16,
          y: p.y + (i - 0.5) * 6,
          vx: Math.cos(spreadAngle) * speed * p.facing,
          vy: Math.sin(spreadAngle) * speed,
          fromPlayer: true,
          damage: world.genreId === 'bullet_hell' ? 14 : 18,
          life: 1.8,
          r: 5,
        });
      }
    } else if (sim !== 'rhythm') {
      const reachX = p.x + p.facing * 32;
      const baseDmg = sim === 'brawler' ? 20 : 14;
      const damage = baseDmg + p.comboCount * 4;
      let landed = false;

      for (const e of world.enemies) {
        if (e.dead || e.koTimer > 0) continue;
        const dx = isFree2D ? Math.abs(e.x - p.x) : Math.abs(e.x - reachX);
        const dy = Math.abs(e.y - p.y);
        if (dx <= e.r + (isFree2D ? 44 : 34) && dy <= e.r + (isFree2D ? 44 : 32)) {
          landed = true;
          if (sim === 'brawler' && input.moveY < -0.25) {
            e.vy = -210;
          }
          damageEnemy(world, e, damage, p.facing * (sim === 'brawler' ? 190 : 140), events);
        }
      }

      if (landed) {
        world.hitstopTimer = p.comboCount === 3 ? 0.055 : 0.032;
        world.shakeTrauma = Math.min(1, world.shakeTrauma + (p.comboCount === 3 ? 0.42 : 0.22));
        p.energy = Math.min(p.maxEnergy, p.energy + 6);
      }
    }
  }

  // Light Burst Ultimate / Defense Light Turret Deploy
  if (input.burstPressed && p.energy >= (sim === 'defense' ? 25 : 30) && sim !== 'visual_novel') {
    if (sim === 'defense') {
      p.energy -= 25;
      if (world.turrets.length >= 4) world.turrets.shift();
      world.turrets.push({
        id: world.nextEntityId++,
        x: p.x,
        y: def.groundY - 22,
        cooldown: 0.25,
        life: 35,
      });
      world.dialogue = `Turret Cahaya dipasang (${world.turrets.length}/4)! Pertahankan Lentera!`;
      events.push({ type: 'sfx', detail: 'switch', x: p.x - world.cameraX });
    } else {
      p.energy -= 30;
      p.invulnTimer = Math.max(p.invulnTimer, 0.35);
      world.hitstopTimer = 0.065;
      world.shakeTrauma = Math.min(1, world.shakeTrauma + 0.65);
      events.push({ type: 'sfx', detail: 'burst', x: p.x - world.cameraX });

      for (const e of world.enemies) {
        if (e.dead || e.koTimer > 0) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) <= 185) {
          damageEnemy(world, e, 36, Math.sign(e.x - p.x || p.facing) * 200, events);
        }
      }
      world.dialogue = 'CAHAYA BURST! Gelombang cahaya menghantam musuh sekitar!';
    }
  }

  // Integrate physics & world collisions
  if (isFree2D) {
    const rawX = p.x + p.vx * dt;
    const rawY = p.y + p.vy * dt;
    const stepGuard = validateMoveBounds(
      prevPlayerX,
      prevPlayerY,
      rawX,
      rawY,
      dt,
      Math.max(520, maxMoveSpeed * 2.5),
      { minX: 20, maxX: def.width - 20, minY: 48, maxY: def.height - 28 }
    );
    p.x = stepGuard.x;
    p.y = stepGuard.y;

    // Top-Down obstacle pillar AABB resolution
    for (const obs of world.obstacles) {
      const halfW = obs.w * 0.5 + p.w * 0.42;
      const halfH = obs.h * 0.5 + p.h * 0.38;
      const cx = obs.x + obs.w * 0.5;
      const cy = obs.y + obs.h * 0.5;
      const dx = p.x - cx;
      const dy = p.y - cy;
      if (Math.abs(dx) < halfW && Math.abs(dy) < halfH) {
        const overlapX = halfW - Math.abs(dx);
        const overlapY = halfH - Math.abs(dy);
        if (overlapX < overlapY) {
          p.x += Math.sign(dx || 1) * overlapX;
          p.vx = 0;
        } else {
          p.y += Math.sign(dy || 1) * overlapY;
          p.vy = 0;
        }
      }
    }
  } else if (sim !== 'runner' && sim !== 'rhythm') {
    const prevBottom = p.y + p.h * 0.5;
    p.vy += gravity * dt;
    const rawX = p.x + p.vx * dt;
    const rawY = p.y + p.vy * dt;
    const stepGuard = validateMoveBounds(
      prevPlayerX,
      prevPlayerY,
      rawX,
      rawY,
      dt,
      Math.max(600, maxMoveSpeed * 2.8),
      { minX: 20, maxX: def.width - 20, minY: 20, maxY: def.height + 32 }
    );
    p.x = stepGuard.x;
    p.y = stepGuard.y;
    p.grounded = false;

    // One-way platforms
    for (const plat of def.platforms) {
      const withinX = p.x + p.w * 0.35 >= plat.x && p.x - p.w * 0.35 <= plat.x + plat.w;
      const newBottom = p.y + p.h * 0.5;
      if (withinX && p.vy >= 0 && prevBottom <= plat.y + 8 && newBottom >= plat.y) {
        p.y = plat.y - p.h * 0.5;
        if (p.vy > 180) {
          p.squashX = 1.2;
          p.squashY = 0.82;
          events.push({ type: 'sfx', detail: 'land', x: p.x - world.cameraX });
        }
        p.vy = 0;
        p.grounded = true;
      }
    }

    // Ground floor
    if (p.y + p.h * 0.5 >= def.groundY) {
      if (p.vy > 180) {
        p.squashX = 1.22;
        p.squashY = 0.8;
        events.push({ type: 'sfx', detail: 'land', x: p.x - world.cameraX });
      }
      p.y = def.groundY - p.h * 0.5;
      p.vy = 0;
      p.grounded = true;
    }
  }

  // Qolbu Final Finite & World-Bounds Safety Clamp
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
    p.x = prevPlayerX;
    p.y = prevPlayerY;
  }
  p.x = Math.max(16, Math.min(def.width - 16, p.x));
  p.y = Math.max(20, Math.min(def.height + 32, p.y));

  // FD Lite v2 Table-Driven FSM + 2-Bone Damped Cloak Spring
  world.playerPose = evaluateCharacterFsm(world.playerPose, {
    ko: p.koTimer > 0,
    hurt: p.flash > 0.08,
    dashing: p.dashTimer > 0,
    attacking: p.attackTimer > 0,
    grounded: p.grounded,
    vy: p.vy,
    vx: p.vx,
  });
  stepBonePoseSpring(world.cloakSpring, world.playerPose, p.vx, p.vy, dt);

  // Coin Collector Magnet Aura + Continuous Gold Respawn
  if (sim === 'collector') {
    for (const c of world.coins) {
      if (c.collected) continue;
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d <= world.magnetRadius + world.kills * 12 && d > 4) {
        c.x += ((p.x - c.x) / d) * 220 * dt;
        c.y += ((p.y - c.y) / d) * 220 * dt;
      }
    }
    if (world.coins.filter((c) => !c.collected).length <= 1) {
      for (let i = 0; i < world.coins.length; i++) {
        world.coins[i].collected = false;
        world.coins[i].x = 160 + ((i * 190 + Math.round(world.time * 40)) % (def.width - 280));
      }
    }
  }

  // Lantern Defense Turrets Auto-Fire
  if (sim === 'defense') {
    for (let i = world.turrets.length - 1; i >= 0; i--) {
      const tr = world.turrets[i];
      tr.cooldown -= dt;
      tr.life -= dt;
      if (tr.life <= 0) {
        world.turrets.splice(i, 1);
        continue;
      }
      if (tr.cooldown <= 0) {
        const target = world.enemies.find((e) => !e.dead && e.koTimer <= 0 && Math.abs(e.x - tr.x) < 340);
        if (target) {
          tr.cooldown = 0.78;
          const ang = Math.atan2(target.y - tr.y, target.x - tr.x);
          world.projectiles.push({
            id: world.nextEntityId++,
            x: tr.x,
            y: tr.y - 6,
            vx: Math.cos(ang) * 310,
            vy: Math.sin(ang) * 310,
            fromPlayer: true,
            damage: 13,
            life: 1.6,
            r: 5,
          });
          events.push({ type: 'sfx', detail: 'attack', x: tr.x - world.cameraX });
        }
      }
    }
  }

  // Collectibles: Coins
  let coinTriggered = false;
  for (const c of world.coins) {
    if (c.collected) continue;
    if (Math.hypot(p.x - c.x, p.y - c.y) <= (sim === 'runner' ? 42 : 28)) {
      c.collected = true;
      coinTriggered = true;
      world.coinsTotal = Math.min(9999, world.coinsTotal + 5);
      world.score += sim === 'collector' ? 120 : 50;
      world.floatingTexts.push({ x: c.x, y: c.y - 12, vy: -35, text: sim === 'collector' ? '+120 FEVER' : '+5 Koin', color: '#facc15', life: 0.7 });
      events.push({ type: 'sfx', detail: 'coin', x: c.x - world.cameraX });
    }
  }

  // Collectibles: Light Shards
  let shardTriggered = false;
  for (const s of world.shards) {
    if (s.collected) continue;
    if (Math.hypot(p.x - s.x, p.y - s.y) <= (sim === 'runner' ? 48 : 30)) {
      s.collected = true;
      shardTriggered = true;
      world.shardsTotal += 1;
      world.score += 250;
      world.floatingTexts.push({ x: s.x, y: s.y - 16, vy: -38, text: '+1 Pecahan Cahaya', color: '#38bdf8', life: 0.9 });
      events.push({ type: 'sfx', detail: 'shard', x: s.x - world.cameraX });
      world.dialogue = `Pecahan Cahaya didapat (${world.shards.filter((x) => x.collected).length}/${def.requiredShards})!`;
    }
  }

  // Floor Switches (Level 2 & 3, and Top-Down Puzzle)
  let switchTriggered = false;
  for (const sw of world.switches) {
    const swDistY = isFree2D ? Math.abs(p.y - sw.y) : Math.abs(p.y + p.h * 0.5 - sw.y);
    if (!sw.active && Math.abs(p.x - sw.x) <= 30 && swDistY <= (isFree2D ? 28 : 22)) {
      sw.active = true;
      switchTriggered = true;
      world.score += 150;
      world.floatingTexts.push({ x: sw.x, y: sw.y - 20, vy: -36, text: 'Saklar Aktif!', color: '#34d399', life: 0.9 });
      events.push({ type: 'sfx', detail: 'switch', x: sw.x - world.cameraX });
      world.dialogue = 'Saklar aktif! Segel Gerbang mulai melemah.';
    }
  }

  // Enemies & Attack Token Pool (15Hz AI perception decimation on Eco / Itel A70 tier)
  const runAiPerception = !config.ecoAi15Hz || world.simStepTick % 2 === 1;
  let activeTokens = world.enemies.filter((e) => !e.dead && e.koTimer <= 0 && e.hasToken).length;
  const hitCoreRadius = sim === 'shooter' && world.genreId === 'bullet_hell' ? 6 : 16;
  let bossPhaseChanged = false;

  for (const e of world.enemies) {
    if (e.dead) continue;
    if (e.koTimer > 0) {
      e.koTimer += dt;
      if (e.koTimer >= 0.35) {
        e.dead = true;
      }
      continue;
    }

    e.flash = Math.max(0, e.flash - dt);
    e.attackCooldown = Math.max(0, e.attackCooldown - dt);

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy);

    // Boss Kala phase progression
    if (e.archetype === 'boss_kala') {
      const ratio = e.hp / e.maxHp;
      const nextPhase: 1 | 2 | 3 = ratio <= 0.34 ? 3 : ratio <= 0.67 ? 2 : 1;
      if (nextPhase !== e.bossPhase) {
        e.bossPhase = nextPhase;
        bossPhaseChanged = true;
        world.shakeTrauma = Math.min(1, world.shakeTrauma + 0.55);
        world.dialogue =
          nextPhase === 2
            ? 'BOSS KALA — Fase 2: Badai! Waspadai telegraf serangan.'
            : 'BOSS KALA — Fase 3: Kala Sejati! Serangan beruntun aktif!';
        events.push({ type: 'phase', detail: `Boss Phase ${nextPhase}` });
        events.push({ type: 'sfx', detail: 'boss_phase', x: e.x - world.cameraX });
      }
    }

    // Acquire attack token if within engagement range (15Hz perception decimated on Eco)
    if (
      runAiPerception &&
      !e.hasToken &&
      e.attackCooldown <= 0 &&
      dist < 310 &&
      activeTokens < def.maxAttackTokens &&
      sim !== 'visual_novel'
    ) {
      e.hasToken = true;
      activeTokens += 1;
      e.telegraphTimer = e.telegraphMax;
    }

    if (e.hasToken && e.telegraphTimer > 0) {
      e.telegraphTimer -= dt;
      if (e.telegraphTimer <= 0) {
        if (e.archetype === 'wisp' || e.archetype === 'boss_kala' || sim === 'shooter') {
          const isDanmaku = sim === 'shooter' && world.genreId === 'bullet_hell';
          const shots = isDanmaku ? 6 : e.archetype === 'boss_kala' ? (e.bossPhase === 3 ? 4 : e.bossPhase === 2 ? 3 : 2) : 1;
          const baseAngle = Math.atan2(dy, dx);
          for (let sIdx = 0; sIdx < shots; sIdx++) {
            const spread = isDanmaku
              ? (sIdx / shots) * Math.PI * 2 + world.time
              : shots === 1
                ? 0
                : (sIdx - (shots - 1) / 2) * 0.28;
            const ang = isDanmaku ? spread : baseAngle + spread;
            world.projectiles.push({
              id: world.nextEntityId++,
              x: e.x,
              y: e.y,
              vx: Math.cos(ang) * (isDanmaku ? 165 : e.archetype === 'boss_kala' ? 235 : 195),
              vy: Math.sin(ang) * (isDanmaku ? 165 : e.archetype === 'boss_kala' ? 235 : 195),
              fromPlayer: false,
              damage: e.archetype === 'boss_kala' ? 16 : 11,
              life: 2.4,
              r: e.archetype === 'boss_kala' ? 7 : 5,
            });
          }
        } else if (e.archetype === 'sentinel') {
          e.vx = Math.sign(dx || e.dir) * 290;
        } else {
          e.vx = Math.sign(dx || e.dir) * 165;
          e.vy = isFree2D ? Math.sign(dy) * 120 : -190;
        }
        e.hasToken = false;
        e.attackCooldown = sim === 'shooter' ? 1.15 : e.archetype === 'boss_kala' ? (e.bossPhase === 3 ? 0.95 : 1.35) : 1.7;
      }
    } else if (sim !== 'visual_novel') {
      if (isFree2D) {
        // 2D Top-Down / Free-Flight Enemy Patrol & Pursuit
        const spd = e.archetype === 'boss_kala' ? 72 : 52;
        if (dist < 260 && dist > 18) {
          e.x += (dx / dist) * spd * dt;
          e.y += (dy / dist) * spd * dt;
          e.dir = dx >= 0 ? 1 : -1;
        } else {
          e.x += e.dir * spd * 0.7 * dt;
          if (e.x < e.patrolMinX) e.dir = 1;
          if (e.x > e.patrolMaxX) e.dir = -1;
        }
        e.y = Math.max(54, Math.min(def.height - 32, e.y));
      } else if (sim === 'defense') {
        // Lantern Defense Enemies March Left Toward Sacred Lantern (x = 110)
        const marchSpeed = e.archetype === 'sentinel' ? 54 : 42;
        e.x -= marchSpeed * dt;
        const floorY = def.groundY - e.r;
        e.y = floorY;
        if (e.x <= 122) {
          world.lanternHp = Math.max(0, world.lanternHp - 14);
          e.x = e.patrolMaxX;
          world.floatingTexts.push({ x: 112, y: floorY - 36, vy: -35, text: 'Lentera -14!', color: '#f87171', life: 0.8 });
          events.push({ type: 'sfx', detail: 'hurt', x: 0 });
          if (world.lanternHp <= 0) {
            world.status = 'gameover';
            world.dialogue = 'Lentera Cahaya padam! Coba lagi dan pasang lebih banyak Turret.';
            events.push({ type: 'gameover' });
            events.push({ type: 'sfx', detail: 'gameover', x: 0 });
          }
        }
      } else if (e.archetype === 'wisp') {
        e.x += e.dir * (58 + world.level * 12) * dt;
        e.y += Math.sin(world.time * 4 + e.id) * 24 * dt;
        if (e.x < e.patrolMinX) e.dir = 1;
        if (e.x > e.patrolMaxX) e.dir = -1;
      } else {
        const patrolSpeed = e.archetype === 'boss_kala' ? 68 + e.bossPhase * 24 : e.archetype === 'sentinel' ? 76 : 52;
        if (Math.abs(e.vx) < patrolSpeed) {
          e.vx = e.dir * patrolSpeed;
        } else {
          e.vx *= 0.92;
        }
        e.vy += gravity * 0.8 * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        const floorY = def.groundY - e.r;
        if (e.y > floorY) {
          e.y = floorY;
          e.vy = 0;
        }
        if (e.x <= e.patrolMinX) {
          e.x = e.patrolMinX;
          e.dir = 1;
        } else if (e.x >= e.patrolMaxX) {
          e.x = e.patrolMaxX;
          e.dir = -1;
        }
      }
    }

    // Contact collision with Bowo
    if (sim !== 'visual_novel' && Math.hypot(p.x - e.x, p.y - e.y) <= e.r + hitCoreRadius) {
      applyDamageToPlayer(world, e.archetype === 'boss_kala' ? 18 : 12, e.x, config.practiceMode, events);
    }
  }

  // Projectiles
  for (let i = world.projectiles.length - 1; i >= 0; i--) {
    const proj = world.projectiles[i];
    proj.life -= dt;
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;

    if (proj.life <= 0 || proj.x < 0 || proj.x > def.width || proj.y < 0 || proj.y > def.height) {
      world.projectiles.splice(i, 1);
      continue;
    }

    if (!proj.fromPlayer && Math.hypot(proj.x - p.x, proj.y - p.y) <= proj.r + hitCoreRadius) {
      if (p.parryTimer > 0) {
        proj.fromPlayer = true;
        proj.vx *= -1.4;
        proj.vy *= -1.4;
        proj.damage = 28;
        p.energy = Math.min(p.maxEnergy, p.energy + 22);
        world.score += 120;
        world.hitstopTimer = 0.06;
        world.shakeTrauma = Math.min(1, world.shakeTrauma + 0.45);
        world.floatingTexts.push({ x: p.x, y: p.y - 36, vy: -45, text: 'PARRY!', color: '#38bdf8', life: 0.75 });
        events.push({ type: 'parry', x: p.x - world.cameraX });
        events.push({ type: 'sfx', detail: 'parry', x: p.x - world.cameraX });
      } else {
        applyDamageToPlayer(world, proj.damage, proj.x, config.practiceMode, events);
        world.projectiles.splice(i, 1);
      }
    } else if (proj.fromPlayer) {
      for (const e of world.enemies) {
        if (e.dead || e.koTimer > 0) continue;
        if (Math.hypot(proj.x - e.x, proj.y - e.y) <= proj.r + e.r) {
          damageEnemy(world, e, proj.damage, Math.sign(proj.vx) * 120, events);
          world.projectiles.splice(i, 1);
          break;
        }
      }
    }
  }

  // Gate Unlock Check (Genre-Aware + Classic Shard/Switch/Boss Rule)
  const collectedShards = world.shards.filter((s) => s.collected).length;
  const activeSwitches = world.switches.filter((s) => s.active).length;

  // Execute live No-Code Event Sheet Rules (WHEN -> THEN)
  if (config.eventRules && config.eventRules.length > 0) {
    const allSwitchesActive = world.switches.length > 0 && activeSwitches >= world.switches.length;
    const isLowHp = p.hp > 0 && p.hp < 30 && world.lowHpRuleCooldown <= 0;

    for (let i = 0; i < config.eventRules.length; i++) {
      const rule = config.eventRules[i];
      if (!rule.enabled) continue;
      let matched = false;
      if (rule.condition === 'ON_COLLISION_COIN' && coinTriggered) matched = true;
      else if (rule.condition === 'ON_SHARD_COLLECT' && shardTriggered) matched = true;
      else if (rule.condition === 'ON_LOW_HP' && isLowHp) {
        matched = true;
        world.lowHpRuleCooldown = 6.0;
      } else if (rule.condition === 'ON_SWITCH_ALL' && switchTriggered && allSwitchesActive) matched = true;
      else if (rule.condition === 'ON_BOSS_PHASE' && bossPhaseChanged) matched = true;

      if (!matched) continue;

      if (rule.action === 'ADD_SCORE_25') {
        world.score += 25;
        world.floatingTexts.push({ x: p.x, y: p.y - 34, vy: -32, text: 'Rule +25', color: '#a78bfa', life: 0.7 });
      } else if (rule.action === 'HEAL_15') {
        p.hp = Math.min(p.maxHp, p.hp + 15);
        world.floatingTexts.push({ x: p.x, y: p.y - 36, vy: -34, text: 'Rule +15 HP', color: '#4ade80', life: 0.8 });
      } else if (rule.action === 'SPAWN_BURST') {
        events.push({ type: 'hit', x: p.x - world.cameraX });
        events.push({ type: 'sfx', detail: 'burst', x: p.x - world.cameraX });
      } else if (rule.action === 'PLAY_CHIME') {
        events.push({ type: 'sfx', detail: 'shard', x: p.x - world.cameraX });
      } else if (rule.action === 'OPEN_GATE' && !world.gateUnlocked) {
        world.gateUnlocked = true;
        events.push({ type: 'sfx', detail: 'gate', x: def.gate.x - world.cameraX });
      }
    }
  }
  const bossAlive = world.enemies.some((e) => e.archetype === 'boss_kala' && !e.dead && e.koTimer <= 0);
  const enemiesAlive = world.enemies.some((e) => !e.dead && e.koTimer <= 0);
  const nextUnlocked =
    sim === 'runner'
      ? world.trackDist >= 1100 || collectedShards >= def.requiredShards
      : sim === 'rhythm'
        ? world.score >= 1200 || collectedShards >= def.requiredShards
        : sim === 'collector'
          ? world.score >= 1500
          : sim === 'brawler' || sim === 'defense'
            ? !enemiesAlive
            : collectedShards >= def.requiredShards &&
              activeSwitches >= def.requiredSwitches &&
              (!def.hasBoss || !bossAlive);

  if (nextUnlocked && !world.gateUnlocked) {
    world.gateUnlocked = true;
    events.push({ type: 'sfx', detail: 'gate', x: def.gate.x - world.cameraX });
    world.dialogue =
      world.level === 3
        ? 'Boss Kala tumbang! Masuki Gerbang Cahaya untuk mengakhiri kegelapan!'
        : 'Gerbang Cahaya terbuka! Masuki gerbang untuk lanjut babak berikutnya.';
  }

  // Entering Unlocked Gate -> Advance or Victory
  if (
    world.gateUnlocked &&
    p.x >= def.gate.x - 14 &&
    p.x <= def.gate.x + def.gate.w + 14 &&
    (isFree2D || sim === 'runner' || sim === 'rhythm' || p.y >= def.gate.y - 12)
  ) {
    if (world.level < 3) {
      events.push({ type: 'level_clear' });
      events.push({ type: 'sfx', detail: 'level_clear', x: 0 });
    } else {
      world.status = 'victory';
      world.score += 1000;
      events.push({ type: 'victory' });
      events.push({ type: 'sfx', detail: 'victory', x: 0 });
    }
  }

  // Floating texts cleanup
  for (let i = world.floatingTexts.length - 1; i >= 0; i--) {
    const ft = world.floatingTexts[i];
    ft.life -= dt;
    ft.y += ft.vy * dt;
    if (ft.life <= 0) world.floatingTexts.splice(i, 1);
  }

  // Smooth camera follow clamped to level bounds
  const targetCamX = Math.max(0, Math.min(def.width - viewportW, p.x - viewportW * 0.38));
  world.cameraX += (targetCamX - world.cameraX) * Math.min(1, dt * 8);

  return events;
}

function damageEnemy(
  world: GameWorld,
  e: SimEnemy,
  amount: number,
  knockVx: number,
  events: SimEventOut[]
): void {
  e.hp -= amount;
  e.flash = 0.16;
  e.vx = knockVx;
  world.score += 35;
  world.floatingTexts.push({
    x: e.x,
    y: e.y - e.r - 12,
    vy: -42,
    text: `-${amount}`,
    color: '#fde047',
    life: 0.65,
  });
  events.push({ type: 'hit', x: e.x - world.cameraX });
  events.push({ type: 'sfx', detail: 'hit', x: e.x - world.cameraX });

  if (e.hp <= 0) {
    e.hp = 0;
    e.koTimer = 0.001;
    e.hasToken = false;
    world.kills += 1;
    world.coinsTotal = Math.min(9999, world.coinsTotal + (e.archetype === 'boss_kala' ? 50 : 8));
    world.score += e.archetype === 'boss_kala' ? 600 : 120;
    world.floatingTexts.push({
      x: e.x,
      y: e.y - 30,
      vy: -48,
      text: e.archetype === 'boss_kala' ? 'KALA KALAH!' : '+8 Koin',
      color: '#4ade80',
      life: 0.9,
    });
  }
}

function applyDamageToPlayer(
  world: GameWorld,
  damage: number,
  sourceX: number,
  practiceMode: boolean,
  events: SimEventOut[]
): void {
  const p = world.player;
  if (p.invulnTimer > 0) return;

  if (p.parryTimer > 0) {
    p.energy = Math.min(p.maxEnergy, p.energy + 20);
    world.score += 100;
    world.hitstopTimer = 0.055;
    world.shakeTrauma = Math.min(1, world.shakeTrauma + 0.4);
    world.floatingTexts.push({ x: p.x, y: p.y - 34, vy: -45, text: 'PARRY!', color: '#38bdf8', life: 0.7 });
    events.push({ type: 'parry', x: p.x - world.cameraX });
    events.push({ type: 'sfx', detail: 'parry', x: p.x - world.cameraX });
    return;
  }

  p.invulnTimer = 0.75;
  p.flash = 0.25;
  p.vx = Math.sign(p.x - sourceX || 1) * 190;
  p.vy = -170;
  world.shakeTrauma = Math.min(1, world.shakeTrauma + 0.48);
  events.push({ type: 'sfx', detail: 'hurt', x: p.x - world.cameraX });

  if (!practiceMode) {
    p.hp = Math.max(0, p.hp - damage);
    world.floatingTexts.push({ x: p.x, y: p.y - 34, vy: -42, text: `-${damage}`, color: '#f87171', life: 0.75 });
    if (p.hp <= 0) {
      p.koTimer = 0.4;
      world.status = 'gameover';
      world.dialogue = 'HP Bowo habis. Gunakan Potion atau Retry Babak!';
      events.push({ type: 'gameover' });
      events.push({ type: 'sfx', detail: 'gameover', x: 0 });
    }
  } else {
    world.floatingTexts.push({ x: p.x, y: p.y - 34, vy: -42, text: 'Latihan (Kebal)', color: '#a3e635', life: 0.7 });
  }
}
