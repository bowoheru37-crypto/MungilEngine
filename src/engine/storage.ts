import { computeChecksum } from './bytecode';
import type {
  AnalyticsSummary,
  ArtStyleId,
  AuthProfile,
  SaveSlotData,
  SaveSlotId,
  SaveSlotSummary,
  SavedWorldProgress,
  TouchControlConfig,
} from './types';

const SAVE_KEY_PREFIX = 'mungil_v7_save_slot_';
const AUTO_SAVE_KEY = 'mungil_v7_save_auto';
const TOUCH_CONFIG_KEY = 'mungil_v7_touch_config';
const ANALYTICS_KEY = 'mungil_v7_analytics';
const AUTH_KEY = 'mungil_v7_auth';
const PIXEL_ART_KEY = 'mungil_v7_pixel_art';
const TILEMAP_KEY = 'mungil_v7_tilemap';

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

function safeSetItem(key: string, value: string): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return true;
    }
    return false;
  } catch {
    // Ignore storage quota errors on private browsing / low-end devices
    return false;
  }
}

function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, Math.round(val)));
}

function clampFloat(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, Number(val.toFixed(1))));
}

function sanitizeIdList(raw: unknown, maxLen = 64): number[] {
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  for (let i = 0; i < Math.min(raw.length, maxLen); i++) {
    const n = Math.round(Number(raw[i]));
    if (Number.isFinite(n) && n >= 0 && n <= 9999 && !out.includes(n)) {
      out.push(n);
    }
  }
  return out;
}

function sanitizeWorldState(raw: unknown): SavedWorldProgress | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const genreId = typeof r.genreId === 'string' && r.genreId.length <= 32 ? r.genreId : 'platformer';
  const result: SavedWorldProgress = {
    genreId,
    playerX: clampFloat(Number(r.playerX ?? 84), 0, 2000),
    playerY: clampFloat(Number(r.playerY ?? 348), 0, 600),
    collectedShardIds: sanitizeIdList(r.collectedShardIds, 16),
    collectedCoinIds: sanitizeIdList(r.collectedCoinIds, 32),
    activatedSwitchIds: sanitizeIdList(r.activatedSwitchIds, 16),
    defeatedEnemyIds: sanitizeIdList(r.defeatedEnemyIds, 32),
  };
  if (r.lanternHp !== undefined) result.lanternHp = clamp(Number(r.lanternHp), 0, 100);
  if (r.trackDist !== undefined) result.trackDist = clampFloat(Number(r.trackDist), 0, 99999);
  if (r.vnStep !== undefined) result.vnStep = clamp(Number(r.vnStep), 0, 10);
  if (r.elapsedSec !== undefined) result.elapsedSec = clampFloat(Number(r.elapsedSec), 0, 86400);
  return result;
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
    worldState?: SavedWorldProgress;
  }
): SaveSlotData {
  const cleanWorldState = input.worldState ? sanitizeWorldState(input.worldState) : undefined;
  const core: Record<string, unknown> = {
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

  if (cleanWorldState) {
    core.worldState = cleanWorldState;
  }

  return {
    ...(core as unknown as Omit<SaveSlotData, 'checksum'>),
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

  const cleanWorldState = sanitizeWorldState(parsed.worldState);

  const normalizedCore: Record<string, unknown> = {
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

  if (cleanWorldState) {
    normalizedCore.worldState = cleanWorldState;
  }

  let checksumValid = true;
  if (!isLegacy && typeof parsed.checksum === 'string') {
    const expected = computeChecksum(JSON.stringify(normalizedCore));
    checksumValid = expected === parsed.checksum;
  }

  return {
    data: {
      ...(normalizedCore as unknown as Omit<SaveSlotData, 'checksum'>),
      migratedFrom: isLegacy ? rawVersion : undefined,
      checksum: computeChecksum(JSON.stringify(normalizedCore)),
    },
    migrated: isLegacy,
    checksumValid,
  };
}

export function saveSlotLocal(data: SaveSlotData, id: SaveSlotId = data.slot): { ok: boolean; bytes: number } {
  const serialized = JSON.stringify(data);
  const key = id === 'auto' ? AUTO_SAVE_KEY : `${SAVE_KEY_PREFIX}${id}`;
  const ok = safeSetItem(key, serialized);
  return { ok, bytes: serialized.length };
}

export function loadSlotLocal(id: SaveSlotId): { data: SaveSlotData; migrated: boolean; checksumValid: boolean; bytes: number } | null {
  const key = id === 'auto' ? AUTO_SAVE_KEY : `${SAVE_KEY_PREFIX}${id}`;
  const raw = safeGetItem(key);
  if (!raw) return null;
  try {
    const res = parseAndMigrateSave(raw, id === 'auto' ? 1 : id);
    return { ...res, bytes: raw.length };
  } catch {
    return null;
  }
}

export function deleteSlotLocal(id: SaveSlotId): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const key = id === 'auto' ? AUTO_SAVE_KEY : `${SAVE_KEY_PREFIX}${id}`;
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export function listSaveSlots(): SaveSlotSummary[] {
  const ids: SaveSlotId[] = [1, 2, 3, 'auto'];
  return ids.map((id) => {
    const loaded = loadSlotLocal(id);
    if (!loaded) {
      return {
        id,
        exists: false,
        bytes: 0,
        level: 1,
        genreId: 'platformer',
        hp: 100,
        coins: 0,
        score: 0,
        updatedAt: '',
        checksumValid: true,
        migrated: false,
        data: null,
      };
    }
    return {
      id,
      exists: true,
      bytes: loaded.bytes,
      level: loaded.data.level,
      genreId: loaded.data.worldState?.genreId ?? 'platformer',
      hp: loaded.data.hp,
      coins: loaded.data.coins,
      score: loaded.data.score,
      updatedAt: loaded.data.updatedAt,
      checksumValid: loaded.checksumValid,
      migrated: loaded.migrated,
      data: loaded.data,
    };
  });
}

export function getLatestSaveSlot(): SaveSlotSummary | null {
  const existing = listSaveSlots().filter((s) => s.exists && s.data !== null);
  if (existing.length === 0) return null;
  existing.sort((a, b) => Date.parse(b.updatedAt || '0') - Date.parse(a.updatedAt || '0'));
  return existing[0];
}

export function importSaveJsonToSlot(rawJson: string, targetSlot: SaveSlotId): {
  ok: boolean;
  summary?: SaveSlotSummary;
  error?: string;
} {
  try {
    if (rawJson.length > 32768) {
      return { ok: false, error: 'Save file exceeds 32 KB mobile limit.' };
    }
    const parsed = parseAndMigrateSave(rawJson, targetSlot === 'auto' ? 1 : targetSlot);
    saveSlotLocal(parsed.data, targetSlot);
    const reloaded = loadSlotLocal(targetSlot);
    if (!reloaded) return { ok: false, error: 'Failed to store imported save.' };
    return {
      ok: true,
      summary: {
        id: targetSlot,
        exists: true,
        bytes: reloaded.bytes,
        level: reloaded.data.level,
        genreId: reloaded.data.worldState?.genreId ?? 'platformer',
        hp: reloaded.data.hp,
        coins: reloaded.data.coins,
        score: reloaded.data.score,
        updatedAt: reloaded.data.updatedAt,
        checksumValid: reloaded.checksumValid,
        migrated: reloaded.migrated,
        data: reloaded.data,
      },
    };
  } catch {
    return { ok: false, error: 'Invalid save JSON format.' };
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
