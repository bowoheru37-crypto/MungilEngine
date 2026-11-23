/**
 * Zero-GC Structure-of-Arrays (SoA) TypedArray ECS + Spatial Hash + Particle Ring Buffer.
 * Inspired by bitECS / entt / libGDX Pool patterns — zero heap allocations inside frame loop.
 */

export const MAX_ECS_ENTITIES = 1024;
export const MAX_PARTICLES = 160;

export const FLAG_ACTIVE = 1 << 0;
export const FLAG_PLAYER = 1 << 1;
export const FLAG_ENEMY = 1 << 2;
export const FLAG_PROJECTILE = 1 << 3;
export const FLAG_COLLECTIBLE = 1 << 4;

export class SoAWorld {
  readonly capacity = MAX_ECS_ENTITIES;
  readonly flags = new Uint16Array(MAX_ECS_ENTITIES);
  readonly kind = new Uint8Array(MAX_ECS_ENTITIES);
  readonly x = new Float32Array(MAX_ECS_ENTITIES);
  readonly y = new Float32Array(MAX_ECS_ENTITIES);
  readonly vx = new Float32Array(MAX_ECS_ENTITIES);
  readonly vy = new Float32Array(MAX_ECS_ENTITIES);
  readonly w = new Float32Array(MAX_ECS_ENTITIES);
  readonly h = new Float32Array(MAX_ECS_ENTITIES);
  readonly hp = new Float32Array(MAX_ECS_ENTITIES);

  // Sparse-set style dense active list for cache-friendly O(active) iteration
  readonly activeDense = new Uint16Array(MAX_ECS_ENTITIES);
  readonly entityToDense = new Int16Array(MAX_ECS_ENTITIES);
  activeCount = 0;

  // Free-list stack for O(1) entity reuse without GC
  private readonly freeStack = new Uint16Array(MAX_ECS_ENTITIES);
  private freeTop = MAX_ECS_ENTITIES;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.flags.fill(0);
    this.entityToDense.fill(-1);
    this.activeCount = 0;
    this.freeTop = MAX_ECS_ENTITIES;
    for (let i = 0; i < MAX_ECS_ENTITIES; i++) {
      this.freeStack[i] = MAX_ECS_ENTITIES - 1 - i;
    }
  }

  alloc(flagMask = FLAG_ACTIVE): number {
    if (this.freeTop <= 0) return -1;
    this.freeTop -= 1;
    const id = this.freeStack[this.freeTop];
    this.flags[id] = flagMask | FLAG_ACTIVE;
    const denseIdx = this.activeCount;
    this.activeDense[denseIdx] = id;
    this.entityToDense[id] = denseIdx;
    this.activeCount += 1;
    return id;
  }

  free(id: number): void {
    if (id < 0 || id >= MAX_ECS_ENTITIES) return;
    if ((this.flags[id] & FLAG_ACTIVE) === 0) return;
    this.flags[id] = 0;
    const denseIdx = this.entityToDense[id];
    const lastDense = this.activeCount - 1;
    if (denseIdx >= 0 && denseIdx !== lastDense) {
      const movedId = this.activeDense[lastDense];
      this.activeDense[denseIdx] = movedId;
      this.entityToDense[movedId] = denseIdx;
    }
    this.entityToDense[id] = -1;
    this.activeCount = Math.max(0, lastDense);
    this.freeStack[this.freeTop] = id;
    this.freeTop += 1;
  }

  stepKinematics(dt: number): void {
    for (let i = 0; i < this.activeCount; i++) {
      const id = this.activeDense[i];
      this.x[id] += this.vx[id] * dt;
      this.y[id] += this.vy[id] * dt;
    }
  }
}

/**
 * Fixed-capacity particle ring buffer — zero per-frame object allocation.
 */
export class ParticlePool {
  readonly capacity = MAX_PARTICLES;
  readonly active = new Uint8Array(MAX_PARTICLES);
  readonly x = new Float32Array(MAX_PARTICLES);
  readonly y = new Float32Array(MAX_PARTICLES);
  readonly vx = new Float32Array(MAX_PARTICLES);
  readonly vy = new Float32Array(MAX_PARTICLES);
  readonly life = new Float32Array(MAX_PARTICLES);
  readonly maxLife = new Float32Array(MAX_PARTICLES);
  readonly size = new Float32Array(MAX_PARTICLES);
  readonly colorIndex = new Uint8Array(MAX_PARTICLES);
  private cursor = 0;

  clear(): void {
    this.active.fill(0);
    this.cursor = 0;
  }

  spawn(x: number, y: number, vx: number, vy: number, life: number, size: number, colorIndex: number): void {
    const idx = this.cursor;
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;
    this.active[idx] = 1;
    this.x[idx] = x;
    this.y[idx] = y;
    this.vx[idx] = vx;
    this.vy[idx] = vy;
    this.life[idx] = life;
    this.maxLife[idx] = life;
    this.size[idx] = size;
    this.colorIndex[idx] = colorIndex;
  }

  step(dt: number): number {
    let alive = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.active[i] === 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.active[i] = 0;
        continue;
      }
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.vy[i] += 180 * dt;
      alive += 1;
    }
    return alive;
  }
}

/**
 * Spatial Hash Grid (32px default cell size) for O(1) broadphase queries.
 */
export class SpatialHashGrid {
  private readonly cellSize: number;
  private readonly buckets = new Map<number, number[]>();

  constructor(cellSize = 32) {
    this.cellSize = cellSize;
  }

  clear(): void {
    for (const arr of this.buckets.values()) {
      arr.length = 0;
    }
  }

  private hash(cx: number, cy: number): number {
    return ((cx + 512) << 12) | ((cy + 512) & 0xfff);
  }

  insert(id: number, x: number, y: number): void {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const key = this.hash(cx, cy);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = [];
      this.buckets.set(key, bucket);
    }
    bucket.push(id);
  }

  queryNear(x: number, y: number, out: number[] = []): number[] {
    out.length = 0;
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const bucket = this.buckets.get(this.hash(cx + ox, cy + oy));
        if (bucket && bucket.length > 0) {
          for (let i = 0; i < bucket.length; i++) {
            out.push(bucket[i]);
          }
        }
      }
    }
    return out;
  }
}
