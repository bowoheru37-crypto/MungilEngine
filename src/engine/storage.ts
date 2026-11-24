import { computeChecksum } from './bytecode';
import { DEFAULT_COLLISION_SHAPES, DEFAULT_SCENE_ENTITIES } from './scenePhysics';
import { STARTER_WIZARD_GAMES } from './qolbuAgent';
import type {
  AnalyticsSummary,
  ArtStyleId,
  AuthProfile,
  CollisionShapeSpec,
  EventSheetRule,
  SaveSlotData,
  SceneEntityNode,
  TouchControlConfig,
  WizardGameSpec,
} from './types';

const SAVE_KEY_PREFIX = 'mungil_v7_save_slot_';
const TOUCH_CONFIG_KEY = 'mungil_v7_touch_config';
const ANALYTICS_KEY = 'mungil_v7_analytics';
const AUTH_KEY = 'mungil_v7_auth';
const PIXEL_ART_KEY = 'mungil_v7_pixel_art';
const TILEMAP_KEY = 'mungil_v7_tilemap';
const EVENT_RULES_KEY = 'mungil_v7_event_rules';
const MY_GAMES_KEY = 'mungil_v7_my_games';
const SCENE_ENTITIES_KEY = 'mungil_v7_scene_entities';
const COLLISION_SHAPES_KEY = 'mungil_v7_collision_shapes';

export const DEFAULT_EVENT_RULES: EventSheetRule[] = [
  { id: 'ev1', enabled: true, condition: 'ON_SHARD_COLLECT', action: 'ADD_SCORE_25' },
  { id: 'ev2', enabled: true, condition: 'ON_LOW_HP', action: 'HEAL_15' },
];

export const DEFAULT_TOUCH_CONFIG: TouchControlConfig = {
  joystickSide: 'left',
  joystickOffsetX: 18,
  joystickSize: 112,
  buttonSize: 54,
  opacity: 85,
  deadzone: 0.14,
  haptics: true,
  showLabels: true,
  keyMap: {
    up: 'w',
    down: 's',
    left: 'a',
    right: 'd',
    jump: ' ',
    attack: 'j',
    dash: 'k',
    burst: 'l',
  },
};

export const DEFAULT_ANALYTICS: AnalyticsSummary = {
  sessions: 1,
  totalPlaySeconds: 0,
  levelsCleared: 0,
  enemiesDefeated: 0,
  parriesLanded: 0,
  avgFps: 60,
  lastEvent: 'Session started',
};

export const DEFAULT_AUTH: AuthProfile = {
  signedIn: false,
  provider: 'guest',
  displayName: 'Bowo Guest',
  playerId: 'local-guest',
  lastSyncAt: '',
};

function safeGetItem(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage quota errors on private browsing
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

export function buildSavePayload(
  slot: 1 | 2 | 3,
  input: {
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
  }
): SaveSlotData {
  const core = {
    slot,
    version: '7.0.0',
    gameTitle: input.gameTitle.slice(0, 64) || 'Bowo: Penjaga Cahaya',
    level: (input.level >= 1 && input.level <= 3 ? input.level : 1) as 1 | 2 | 3,
    hp: clamp(input.hp, 1, 100),
    energy: clamp(input.energy, 0, 100),
    coins: clamp(input.coins, 0, 9999),
    shards: clamp(input.shards, 0, 7),
    score: clamp(input.score, 0, 999999),
    kills: clamp(input.kills, 0, 9999),
    potions: clamp(input.potions, 0, 99),
    styleId: input.styleId,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...core,
    checksum: computeChecksum(JSON.stringify(core)),
  };
}

/**
 * Validates, clamps tampered values, and migrates legacy v6.x saves cleanly to v7.0.0.
 */
export function parseAndMigrateSave(rawJson: string, fallbackSlot: 1 | 2 | 3 = 1): {
  data: SaveSlotData;
  migrated: boolean;
  checksumValid: boolean;
} {
  const parsed = JSON.parse(rawJson) as Record<string, unknown>;
  const rawVersion = typeof parsed.version === 'string' ? parsed.version : '6.1.0';
  const isLegacy = !rawVersion.startsWith('7.');

  const legacyLevelRaw = Number(parsed.level ?? parsed.chapter ?? 1);
  const clampedLevel = (legacyLevelRaw >= 3 ? 3 : legacyLevelRaw === 2 ? 2 : 1) as 1 | 2 | 3;

  const normalizedCore = {
    slot: (Number(parsed.slot) === 2 ? 2 : Number(parsed.slot) === 3 ? 3 : fallbackSlot) as 1 | 2 | 3,
    version: '7.0.0',
    gameTitle: typeof parsed.gameTitle === 'string' ? parsed.gameTitle : 'Bowo: Penjaga Cahaya',
    level: clampedLevel,
    hp: clamp(Number(parsed.hp ?? 100), 1, 100),
    energy: clamp(Number(parsed.energy ?? 60), 0, 100),
    coins: clamp(Number(parsed.coins ?? 0), 0, 9999),
    shards: clamp(Number(parsed.shards ?? 0), 0, 7),
    score: clamp(Number(parsed.score ?? 0), 0, 999999),
    kills: clamp(Number(parsed.kills ?? 0), 0, 9999),
    potions: clamp(Number(parsed.potions ?? 2), 0, 99),
    styleId: (typeof parsed.styleId === 'string' ? parsed.styleId : 'pixel') as ArtStyleId,
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
  };

  let checksumValid = true;
  if (!isLegacy && typeof parsed.checksum === 'string') {
    const expected = computeChecksum(JSON.stringify(normalizedCore));
    checksumValid = expected === parsed.checksum;
  }

  return {
    data: {
      ...normalizedCore,
      migratedFrom: isLegacy ? rawVersion : undefined,
      checksum: computeChecksum(JSON.stringify(normalizedCore)),
    },
    migrated: isLegacy,
    checksumValid,
  };
}

export function saveSlotLocal(data: SaveSlotData): void {
  safeSetItem(`${SAVE_KEY_PREFIX}${data.slot}`, JSON.stringify(data));
}

export function loadSlotLocal(slot: 1 | 2 | 3): { data: SaveSlotData; migrated: boolean; checksumValid: boolean } | null {
  const raw = safeGetItem(`${SAVE_KEY_PREFIX}${slot}`);
  if (!raw) return null;
  try {
    return parseAndMigrateSave(raw, slot);
  } catch {
    return null;
  }
}

export function deleteSlotLocal(slot: 1 | 2 | 3): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`${SAVE_KEY_PREFIX}${slot}`);
    }
  } catch {
    // ignore
  }
}

export function loadTouchConfig(): TouchControlConfig {
  const raw = safeGetItem(TOUCH_CONFIG_KEY);
  if (!raw) return DEFAULT_TOUCH_CONFIG;
  try {
    const parsed = JSON.parse(raw) as Partial<TouchControlConfig>;
    return {
      ...DEFAULT_TOUCH_CONFIG,
      ...parsed,
      buttonSize: Math.max(44, Math.min(84, Number(parsed.buttonSize ?? DEFAULT_TOUCH_CONFIG.buttonSize))),
      joystickSize: Math.max(88, Math.min(156, Number(parsed.joystickSize ?? DEFAULT_TOUCH_CONFIG.joystickSize))),
      opacity: Math.max(35, Math.min(100, Number(parsed.opacity ?? DEFAULT_TOUCH_CONFIG.opacity))),
      keyMap: {
        ...DEFAULT_TOUCH_CONFIG.keyMap,
        ...(parsed.keyMap ?? {}),
      },
    };
  } catch {
    return DEFAULT_TOUCH_CONFIG;
  }
}

export function saveTouchConfig(config: TouchControlConfig): void {
  safeSetItem(TOUCH_CONFIG_KEY, JSON.stringify(config));
}

export function loadAnalytics(): AnalyticsSummary {
  const raw = safeGetItem(ANALYTICS_KEY);
  if (!raw) return DEFAULT_ANALYTICS;
  try {
    return { ...DEFAULT_ANALYTICS, ...(JSON.parse(raw) as Partial<AnalyticsSummary>) };
  } catch {
    return DEFAULT_ANALYTICS;
  }
}

export function saveAnalytics(summary: AnalyticsSummary): void {
  safeSetItem(ANALYTICS_KEY, JSON.stringify(summary));
}

export function loadAuthProfile(): AuthProfile {
  const raw = safeGetItem(AUTH_KEY);
  if (!raw) return DEFAULT_AUTH;
  try {
    return { ...DEFAULT_AUTH, ...(JSON.parse(raw) as Partial<AuthProfile>) };
  } catch {
    return DEFAULT_AUTH;
  }
}

export function saveAuthProfile(profile: AuthProfile): void {
  safeSetItem(AUTH_KEY, JSON.stringify(profile));
}

export function createEmptyGrid(size: number, fill = 0): number[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => fill));
}

export function loadPixelGrid(size = 16): number[][] {
  const raw = safeGetItem(PIXEL_ART_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as number[][];
      if (Array.isArray(parsed) && parsed.length === size) return parsed;
    } catch {
      // fall through
    }
  }
  const g = createEmptyGrid(size, 0);
  // Pre-draw a crisp starter Bowo emblem
  for (let y = 3; y < size - 3; y++) {
    for (let x = 4; x < size - 4; x++) {
      if (y < 7) g[y][x] = 4;
      else g[y][x] = 2;
    }
  }
  g[5][6] = 8;
  g[5][9] = 8;
  return g;
}

export function savePixelGrid(grid: number[][]): void {
  safeSetItem(PIXEL_ART_KEY, JSON.stringify(grid));
}

export function loadTilemap(): number[][] {
  const raw = safeGetItem(TILEMAP_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as number[][];
      if (Array.isArray(parsed) && parsed.length === 8) return parsed;
    } catch {
      // fall through
    }
  }
  // 8 rows x 12 cols starter level tilemap (0=sky, 1=grass, 2=stone, 3=coin/shard)
  return Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 12 }, (_, c) => {
      if (r === 7) return 1;
      if (r === 5 && (c === 3 || c === 4 || c === 8 || c === 9)) return 2;
      if (r === 4 && (c === 4 || c === 9)) return 3;
      return 0;
    })
  );
}

export function saveTilemap(map: number[][]): void {
  safeSetItem(TILEMAP_KEY, JSON.stringify(map));
}

export function loadEventRules(): EventSheetRule[] {
  const raw = safeGetItem(EVENT_RULES_KEY);
  if (!raw) return DEFAULT_EVENT_RULES;
  try {
    const parsed = JSON.parse(raw) as EventSheetRule[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_EVENT_RULES;
}

export function saveEventRules(rules: EventSheetRule[]): void {
  safeSetItem(EVENT_RULES_KEY, JSON.stringify(rules));
}

export function loadWizardGames(): WizardGameSpec[] {
  const raw = safeGetItem(MY_GAMES_KEY);
  if (!raw) return STARTER_WIZARD_GAMES;
  try {
    const parsed = JSON.parse(raw) as WizardGameSpec[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore
  }
  return STARTER_WIZARD_GAMES;
}

export function saveWizardGames(games: WizardGameSpec[]): void {
  safeSetItem(MY_GAMES_KEY, JSON.stringify(games));
}

export function loadSceneEntities(): SceneEntityNode[] {
  const raw = safeGetItem(SCENE_ENTITIES_KEY);
  if (!raw) return DEFAULT_SCENE_ENTITIES;
  try {
    const parsed = JSON.parse(raw) as SceneEntityNode[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore
  }
  return DEFAULT_SCENE_ENTITIES;
}

export function saveSceneEntities(entities: SceneEntityNode[]): void {
  safeSetItem(SCENE_ENTITIES_KEY, JSON.stringify(entities));
}

export function loadCollisionShapes(): CollisionShapeSpec[] {
  const raw = safeGetItem(COLLISION_SHAPES_KEY);
  if (!raw) return DEFAULT_COLLISION_SHAPES;
  try {
    const parsed = JSON.parse(raw) as CollisionShapeSpec[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore
  }
  return DEFAULT_COLLISION_SHAPES;
}

export function saveCollisionShapes(shapes: CollisionShapeSpec[]): void {
  safeSetItem(COLLISION_SHAPES_KEY, JSON.stringify(shapes));
}


