/**
 * Mobile-First Asset Management System (Mungil Engine V7).
 * - Efficient load/acquire/release/unload lifecycle for player, environment, enemy, UI, & generated assets
 * - LRU automatic eviction under low-memory budget (default 2 MB Eco / 4 MB Standard)
 * - Level bundle loader automatically unloads previous level biomes while keeping shared player/UI pinned
 * - Sub-millisecond procedural cache lookup with zero network dependency
 */

import type { AssetManagerStats, ManagedAssetRecord } from './types';

const INITIAL_ASSETS: Array<Omit<ManagedAssetRecord, 'loaded' | 'refCount' | 'lastUsedMs' | 'loadTimeMs'>> = [
  { id: 'player_bowo_rig', label: 'Bowo 2D/3D Rig & Animations', category: 'character', levelScope: 0, estimatedBytes: 42_000, pinned: true },
  { id: 'ui_hud_touch_pack', label: 'HUD Bars & Virtual Touch Controls', category: 'ui', levelScope: 0, estimatedBytes: 28_000, pinned: true },
  { id: 'env_dawn_village', label: 'Level 1 — Desa Fajar Tiles & Trees', category: 'environment', levelScope: 1, estimatedBytes: 185_000, pinned: false },
  { id: 'enemy_slime_pack', label: 'Slime Patrol Rig & Telegraph', category: 'enemy', levelScope: 1, estimatedBytes: 38_000, pinned: false },
  { id: 'env_storm_bridge', label: 'Level 2 — Jembatan Badai & Switches', category: 'environment', levelScope: 2, estimatedBytes: 220_000, pinned: false },
  { id: 'enemy_wisp_sentinel', label: 'Storm Wisp & Sentinel Rigs', category: 'enemy', levelScope: 2, estimatedBytes: 64_000, pinned: false },
  { id: 'env_menara_kala', label: 'Level 3 — Menara Kala Obsidian', category: 'environment', levelScope: 3, estimatedBytes: 260_000, pinned: false },
  { id: 'boss_kala_3phase', label: 'Boss Kala (3-Phase Aura & Orbs)', category: 'enemy', levelScope: 3, estimatedBytes: 112_000, pinned: false },
];

export class AssetManager {
  private registry = new Map<string, ManagedAssetRecord>();
  private budgetBytes: number;
  private cacheHits = 0;
  private cacheMisses = 0;
  private evictions = 0;
  private lastLoadMs = 0;

  constructor(budgetBytes = 2_048_000) {
    this.budgetBytes = Math.max(256_000, budgetBytes);
    const now = Date.now();
    for (const def of INITIAL_ASSETS) {
      this.registry.set(def.id, {
        ...def,
        loaded: def.pinned,
        refCount: def.pinned ? 1 : 0,
        lastUsedMs: now,
        loadTimeMs: def.pinned ? 0.15 : 0,
      });
    }
  }

  setBudgetBytes(bytes: number): void {
    this.budgetBytes = Math.max(256_000, bytes);
    this.enforceBudget();
  }

  registerAsset(asset: {
    id: string;
    label: string;
    category: ManagedAssetRecord['category'];
    levelScope?: 0 | 1 | 2 | 3;
    estimatedBytes: number;
    pinned?: boolean;
  }): ManagedAssetRecord {
    const existing = this.registry.get(asset.id);
    if (existing) return existing;
    const rec: ManagedAssetRecord = {
      id: asset.id,
      label: asset.label,
      category: asset.category,
      levelScope: asset.levelScope ?? 0,
      estimatedBytes: Math.max(1024, asset.estimatedBytes),
      loaded: false,
      pinned: Boolean(asset.pinned),
      refCount: 0,
      lastUsedMs: Date.now(),
      loadTimeMs: 0,
    };
    this.registry.set(rec.id, rec);
    return rec;
  }

  loadAsset(id: string): ManagedAssetRecord | null {
    const rec = this.registry.get(id);
    if (!rec) return null;
    const now = Date.now();
    if (rec.loaded) {
      this.cacheHits += 1;
      rec.refCount += 1;
      rec.lastUsedMs = now;
      return rec;
    }

    const t0 = typeof performance !== 'undefined' ? performance.now() : now;
    this.cacheMisses += 1;
    rec.loaded = true;
    rec.refCount = Math.max(1, rec.refCount + 1);
    rec.lastUsedMs = now;
    rec.loadTimeMs = Math.max(0.08, Number(((typeof performance !== 'undefined' ? performance.now() : now) - t0).toFixed(2)));
    this.lastLoadMs = rec.loadTimeMs;
    this.enforceBudget(rec.id);
    return rec;
  }

  unloadAsset(id: string, force = false): boolean {
    const rec = this.registry.get(id);
    if (!rec || !rec.loaded) return false;
    if (rec.pinned && !force) return false;
    rec.refCount = Math.max(0, rec.refCount - 1);
    if (force || rec.refCount === 0) {
      rec.loaded = false;
      rec.refCount = 0;
      return true;
    }
    return false;
  }

  togglePin(id: string): boolean {
    const rec = this.registry.get(id);
    if (!rec) return false;
    rec.pinned = !rec.pinned;
    if (rec.pinned && !rec.loaded) {
      this.loadAsset(id);
    }
    return rec.pinned;
  }

  /**
   * Unloads prior level-scoped assets not needed by `level`, then loads `level` bundle.
   * Keeps shared player/UI assets pinned for instant transitions on Itel A70.
   */
  loadLevelBundle(level: 1 | 2 | 3): { loaded: string[]; unloaded: string[] } {
    const unloaded: string[] = [];
    const loaded: string[] = [];

    for (const rec of this.registry.values()) {
      if (rec.levelScope !== 0 && rec.levelScope !== level && rec.loaded && !rec.pinned) {
        if (this.unloadAsset(rec.id, true)) {
          unloaded.push(rec.id);
        }
      }
    }

    for (const rec of this.registry.values()) {
      if (rec.levelScope === 0 || rec.levelScope === level || (level === 3 && rec.id === 'enemy_wisp_sentinel')) {
        const res = this.loadAsset(rec.id);
        if (res) loaded.push(res.id);
      }
    }

    return { loaded, unloaded };
  }

  unloadUnused(): number {
    let freed = 0;
    for (const rec of this.registry.values()) {
      if (rec.loaded && !rec.pinned && rec.levelScope !== 0) {
        if (this.unloadAsset(rec.id, true)) freed += 1;
      }
    }
    return freed;
  }

  private enforceBudget(protectedId?: string): void {
    let used = this.getUsedBytes();
    if (used <= this.budgetBytes) return;

    const candidates = Array.from(this.registry.values())
      .filter((r) => r.loaded && !r.pinned && r.id !== protectedId)
      .sort((a, b) => a.lastUsedMs - b.lastUsedMs);

    for (const c of candidates) {
      if (used <= this.budgetBytes) break;
      c.loaded = false;
      c.refCount = 0;
      used -= c.estimatedBytes;
      this.evictions += 1;
    }
  }

  getUsedBytes(): number {
    let total = 0;
    for (const r of this.registry.values()) {
      if (r.loaded) total += r.estimatedBytes;
    }
    return total;
  }

  listAssets(): ManagedAssetRecord[] {
    return Array.from(this.registry.values()).map((r) => ({ ...r }));
  }

  getStats(): AssetManagerStats {
    const all = Array.from(this.registry.values());
    return {
      budgetBytes: this.budgetBytes,
      usedBytes: this.getUsedBytes(),
      loadedCount: all.filter((r) => r.loaded).length,
      totalCount: all.length,
      pinnedCount: all.filter((r) => r.pinned).length,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      evictions: this.evictions,
      lastLoadMs: this.lastLoadMs,
    };
  }
}

export const assetManager = new AssetManager();
