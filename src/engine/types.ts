export type GameShellState = 'landing' | 'title' | 'playing' | 'paused' | 'victory' | 'gameover' | 'studio';

export type StudioTab = 'play' | 'assets' | 'generators' | 'controls' | 'art' | 'lab' | 'skills' | 'services' | 'export';

export type ArtStyleId =
  | 'pixel'
  | 'anime'
  | 'realistis'
  | 'flat'
  | 'retro'
  | 'cyberpunk'
  | 'watercolor'
  | 'clay'
  | 'vector'
  | 'dark'
  | 'isometric'
  | 'raycast';

export type RenderMode = '2D' | '2.5D' | '3D Ringan';
export type PhysicsMode = 'Arcade' | 'Realistis' | 'Zero-G';
export type DeviceTierId = 'auto' | 'eco' | 'mid' | 'hd';
export type LanguageCode = 'id' | 'en' | 'ja' | 'ko' | 'es';
export type WeatherKind = 'Cerah' | 'Hujan' | 'Salju';
export type RendererBackend = 'WebGPU' | 'WebGL2' | 'Canvas';

export interface ArtStyleSpec {
  id: ArtStyleId;
  name: string;
  desc: string;
  /** [sky, ground, primary, secondary, skin, enemy, accent, highlight, outline, specular] */
  palette: [string, string, string, string, string, string, string, string, string, string];
  outline: number;
  outlineStyle: 'keras' | 'lembut' | 'tidak ada';
  edge: 'tajam' | 'bulat' | 'kasar';
  shading: 'flat' | '2-tone' | 'gradient' | 'dithering';
  lightType: string;
  lightColor: string;
  proportion: string;
  uiRadius: number;
}

export interface StyleOverrides {
  outlineOn: boolean;
  outlineW: number;
  shadowOn: boolean;
  glowOn: boolean;
  scanline: boolean;
  vignette: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
}

export interface TouchControlConfig {
  joystickSide: 'left' | 'right';
  joystickOffsetX: number;
  joystickSize: number;
  buttonSize: number;
  opacity: number;
  deadzone: number;
  haptics: boolean;
  showLabels: boolean;
  keyMap: {
    up: string;
    down: string;
    left: string;
    right: string;
    jump: string;
    attack: string;
    dash: string;
    burst: string;
  };
}

export interface DeviceProfile {
  requestedTier: DeviceTierId;
  activeTier: 'eco' | 'mid' | 'hd';
  deviceMemoryGb: number;
  cpuCores: number;
  targetFps: 30 | 60;
  fixedStepSec: number;
  dynamicScale: number;
  minScale: number;
  maxScale: number;
  maxParticles: number;
  maxEnemies: number;
  powerSaveAuto: boolean;
  powerSaveActive: boolean;
  renderer: RendererBackend;
}

export type EnemyArchetype = 'slime' | 'wisp' | 'sentinel' | 'boss_kala';

export interface LevelDefinition {
  level: 1 | 2 | 3;
  code: string;
  titleId: string;
  titleEn: string;
  subtitleId: string;
  subtitleEn: string;
  width: number;
  height: number;
  groundY: number;
  requiredShards: number;
  requiredSwitches: number;
  maxAttackTokens: number;
  recommendedStyle: ArtStyleId;
  weather: WeatherKind;
  hasBoss: boolean;
  platforms: Array<{ x: number; y: number; w: number; h: number }>;
  trees: Array<{ x: number; y: number; scale: number }>;
  rocks: Array<{ x: number; y: number; scale: number }>;
  switches: Array<{ id: number; x: number; y: number }>;
  gate: { x: number; y: number; w: number; h: number };
  shards: Array<{ id: number; x: number; y: number }>;
  coins: Array<{ id: number; x: number; y: number }>;
  enemies: Array<{ id: number; archetype: EnemyArchetype; x: number; y: number; patrolMinX: number; patrolMaxX: number }>;
}

export interface HudSnapshot {
  level: 1 | 2 | 3;
  genreId?: string;
  simKind?: GenreSimulationKind;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  coins: number;
  shards: number;
  requiredShards: number;
  switchesActive: number;
  requiredSwitches: number;
  score: number;
  combo: number;
  kills: number;
  potions: number;
  bossHp: number;
  bossMaxHp: number;
  bossPhase: 1 | 2 | 3;
  bossActive: boolean;
  gateUnlocked: boolean;
  elapsedSec: number;
  fps: number;
  resolutionScale: number;
  drawCalls: number;
  culledCount?: number;
  activeEntities: number;
  powerSaveActive: boolean;
  dialogue: string;
  lanternHp?: number;
  speedKmh?: number;
  vnPrompt?: string;
  vnChoices?: string[];
}

export interface SaveSlotData {
  slot: 1 | 2 | 3;
  version: string;
  migratedFrom?: string;
  gameTitle: string;
  level: 1 | 2 | 3;
  hp: number;
  energy: number;
  coins: number;
  shards: number;
  score: number;
  kills: number;
  potions: number;
  styleId: ArtStyleId;
  updatedAt: string;
  checksum: string;
}

export type GenreSimulationKind =
  | 'platformer'
  | 'topdown'
  | 'shooter'
  | 'runner'
  | 'rhythm'
  | 'brawler'
  | 'defense'
  | 'collector'
  | 'visual_novel';

export interface GenreTemplate {
  id: string;
  name: string;
  simKind: GenreSimulationKind;
  mechanic: string;
  renderMode: RenderMode;
  physicsMode: PhysicsMode;
  defaultStyle: ArtStyleId;
  quest: string;
  speedMul: number;
  gravityMul: number;
  enemyDensity: number;
}

export interface RepoCredit {
  name: string;
  license: string;
  tier: 'A' | 'B' | 'C';
  keywordGroup?: 'fake_3d' | 'pseudo_3d' | '2_5d' | 'web_engine' | 'mobile_engine' | 'core';
  what: string;
  adapt: string;
}

export interface PerformanceGateResult {
  id: 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6';
  label: string;
  target: string;
  status: 'untested' | 'pass' | 'warn';
  metric: string;
}

export interface ValidatorCheck {
  id: number;
  name: string;
  passed: boolean;
  detail: string;
}

export interface EventSheetRule {
  id: string;
  enabled: boolean;
  condition: 'ON_COLLISION_COIN' | 'ON_LOW_HP' | 'ON_SHARD_COLLECT' | 'ON_BOSS_PHASE' | 'ON_SWITCH_ALL';
  action: 'ADD_SCORE_25' | 'HEAL_15' | 'SPAWN_BURST' | 'PLAY_CHIME' | 'OPEN_GATE';
}

export interface AssetEntry {
  id: string;
  category: 'character' | 'environment' | 'enemy' | 'ui';
  name: string;
  polyOrSpriteBudget: string;
  drawCost: string;
  description: string;
}

export interface AuthProfile {
  signedIn: boolean;
  provider: 'guest' | 'google_demo' | 'github_demo';
  displayName: string;
  playerId: string;
  lastSyncAt: string;
}

export interface AnalyticsSummary {
  sessions: number;
  totalPlaySeconds: number;
  levelsCleared: number;
  enemiesDefeated: number;
  parriesLanded: number;
  avgFps: number;
  lastEvent: string;
}

export interface PaymentSku {
  id: string;
  title: string;
  coinsBonus: number;
  potionsBonus: number;
  priceDisplay: string;
  owned: boolean;
}

export interface ManagedAssetRecord {
  id: string;
  label: string;
  category: 'character' | 'environment' | 'enemy' | 'ui' | 'generated';
  levelScope: 0 | 1 | 2 | 3;
  estimatedBytes: number;
  loaded: boolean;
  pinned: boolean;
  refCount: number;
  lastUsedMs: number;
  loadTimeMs: number;
}

export interface AssetManagerStats {
  budgetBytes: number;
  usedBytes: number;
  loadedCount: number;
  totalCount: number;
  pinnedCount: number;
  cacheHits: number;
  cacheMisses: number;
  evictions: number;
  lastLoadMs: number;
}

export type CharacterAnimState = 'idle' | 'walk' | 'jump' | 'fall' | 'attack' | 'dash' | 'hurt' | 'ko';

export interface GeneratedCharacterSpec {
  seed: number;
  name: string;
  dimension: '2D' | '3D-Stack';
  archetype: 'Guardian' | 'Ranger' | 'Mage' | 'Knight';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  cloakColor: string;
  weaponKind: 'blade' | 'staff' | 'bow' | 'hammer';
  headScale: number;
  spriteGrid: number[][];
}

export interface GeneratedTrackSpec {
  seed: number;
  title: string;
  scale: 'pentatonic' | 'dorian' | 'phrygian';
  bpm: number;
  leadNotes: number[];
  bassNotes: number[];
  percHits: number[];
}

export interface GeneratedSfxSpec {
  seed: number;
  name: string;
  wave: 'sine' | 'triangle' | 'square' | 'sawtooth';
  freqStart: number;
  freqEnd: number;
  durationSec: number;
  volume: number;
}

export interface CutsceneKeyframe {
  timeSec: number;
  pose: CharacterAnimState;
  cameraX: number;
  caption: string;
  effect: 'none' | 'flash' | 'shake' | 'burst';
}

export interface GeneratedCutsceneSpec {
  seed: number;
  title: string;
  durationSec: number;
  weather: WeatherKind;
  keyframes: CutsceneKeyframe[];
}

export interface GeneratedTerrainSpec {
  seed: number;
  mode: '2D' | '3D-Heightmap';
  biome: 'meadow' | 'storm' | 'obsidian';
  width: number;
  height: number;
  heights: number[];
  platforms: Array<{ x: number; y: number; w: number }>;
  trees: number[];
  rocks: number[];
}

export interface GeneratedPropSpec {
  seed: number;
  kind: 'potion' | 'chest' | 'crystal' | 'torch' | 'emblem';
  name: string;
  primaryColor: string;
  glowColor: string;
  pixelGrid: number[][];
}

export type AgentPlatformId = 'claude' | 'gemini' | 'grok' | 'qwen' | 'universal';

export interface AgentSkillFile {
  filename: string;
  platform: AgentPlatformId;
  title: string;
  summary: string;
  content: string;
}

