import { LEVEL_DEFINITIONS } from './gameSimulation';
import type {
  CollisionOverlapInfo,
  CollisionShapeSpec,
  EntityPhysicsConfig,
  PhysicsPresetId,
  SceneEntityNode,
} from './types';

export const PHYSICS_PRESETS: Record<
  PhysicsPresetId,
  { label: string; desc: string; config: EntityPhysicsConfig }
> = {
  default: {
    label: 'Default',
    desc: 'Balanced arcade body',
    config: { restitution: 0.2, friction: 0.5, gravityScale: 1.0, density: 1.0, isTrigger: false, collisionEnabled: true },
  },
  bouncy: {
    label: 'Bouncy',
    desc: 'High-elastic rebound',
    config: { restitution: 0.92, friction: 0.15, gravityScale: 0.95, density: 0.6, isTrigger: false, collisionEnabled: true },
  },
  heavy: {
    label: 'Heavy',
    desc: 'Dense tank inertia',
    config: { restitution: 0.05, friction: 0.88, gravityScale: 1.7, density: 2.8, isTrigger: false, collisionEnabled: true },
  },
  ghost: {
    label: 'Ghost',
    desc: 'Pass-through trigger volume',
    config: { restitution: 0, friction: 0, gravityScale: 0, density: 0.1, isTrigger: true, collisionEnabled: false },
  },
  slippery: {
    label: 'Slippery',
    desc: 'Low-friction ice glide',
    config: { restitution: 0.12, friction: 0.02, gravityScale: 1.0, density: 1.0, isTrigger: false, collisionEnabled: true },
  },
  zero_g: {
    label: 'Zero-G',
    desc: 'Weightless orbital drift',
    config: { restitution: 0.55, friction: 0.05, gravityScale: 0, density: 0.4, isTrigger: false, collisionEnabled: true },
  },
};

function safeNum(val: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, val));
}

export function createDefaultSceneEntities(level: 1 | 2 | 3 = 1): SceneEntityNode[] {
  const def = LEVEL_DEFINITIONS[level];
  const entities: SceneEntityNode[] = [
    {
      id: 'ent_bowo',
      name: 'Bowo (Hero)',
      kind: 'player',
      parentId: null,
      children: [],
      x: 115,
      y: 215,
      scaleX: 1,
      scaleY: 1,
      rotationDeg: 0,
      color: '#38bdf8',
      physicsPreset: 'default',
      physics: { ...PHYSICS_PRESETS.default.config },
      collider: { kind: 'box', w: 32, h: 46, radius: 22, offsetX: 0, offsetY: 0 },
    },
  ];

  def.platforms.slice(0, 2).forEach((plat, idx) => {
    entities.push({
      id: `ent_plat_${idx + 1}`,
      name: `Platform ${idx + 1}`,
      kind: 'platform',
      parentId: null,
      children: [],
      x: Math.min(480, Math.max(140, plat.x * 0.65)),
      y: plat.y - 20,
      scaleX: 1,
      scaleY: 1,
      rotationDeg: 0,
      color: '#4ade80',
      physicsPreset: 'heavy',
      physics: { ...PHYSICS_PRESETS.heavy.config },
      collider: { kind: 'box', w: Math.min(130, plat.w), h: 20, radius: 24, offsetX: 0, offsetY: 0 },
    });
  });

  def.enemies.slice(0, 2).forEach((en, idx) => {
    entities.push({
      id: `ent_enemy_${idx + 1}`,
      name: en.archetype === 'boss_kala' ? 'Boss Kala' : `Enemy ${en.archetype}`,
      kind: 'enemy',
      parentId: null,
      children: [],
      x: 240 + idx * 120,
      y: idx === 0 ? 250 : 170,
      scaleX: 1,
      scaleY: 1,
      rotationDeg: 0,
      color: '#f43f5e',
      physicsPreset: idx === 0 ? 'bouncy' : 'default',
      physics: { ...(idx === 0 ? PHYSICS_PRESETS.bouncy.config : PHYSICS_PRESETS.default.config) },
      collider: { kind: 'circle', w: 34, h: 34, radius: en.archetype === 'boss_kala' ? 28 : 18, offsetX: 0, offsetY: 0 },
    });
  });

  entities.push({
    id: 'ent_shard_1',
    name: 'Light Shard',
    kind: 'pickup',
    parentId: null,
    children: [],
    x: 410,
    y: 135,
    scaleX: 1,
    scaleY: 1,
    rotationDeg: 0,
    color: '#fde047',
    physicsPreset: 'ghost',
    physics: { ...PHYSICS_PRESETS.ghost.config },
    collider: { kind: 'circle', w: 28, h: 28, radius: 16, offsetX: 0, offsetY: 0 },
  });

  return entities;
}

/**
 * Applies a predefined Physics Preset to an entity and aligns trigger/collision state.
 */
export function applyPhysicsPreset(
  entities: SceneEntityNode[],
  entityId: string,
  presetId: PhysicsPresetId
): SceneEntityNode[] {
  const preset = PHYSICS_PRESETS[presetId] ?? PHYSICS_PRESETS.default;
  return entities.map((ent) =>
    ent.id === entityId
      ? {
          ...ent,
          physicsPreset: presetId,
          physics: { ...preset.config },
        }
      : ent
  );
}

/**
 * Updates physics properties manually on an entity.
 */
export function updateEntityPhysics(
  entities: SceneEntityNode[],
  entityId: string,
  patch: Partial<EntityPhysicsConfig>
): SceneEntityNode[] {
  return entities.map((ent) =>
    ent.id === entityId
      ? {
          ...ent,
          physics: {
            restitution: safeNum(patch.restitution ?? ent.physics.restitution, ent.physics.restitution, 0, 1.5),
            friction: safeNum(patch.friction ?? ent.physics.friction, ent.physics.friction, 0, 2.0),
            gravityScale: safeNum(patch.gravityScale ?? ent.physics.gravityScale, ent.physics.gravityScale, -2, 5),
            density: safeNum(patch.density ?? ent.physics.density, ent.physics.density, 0.05, 10),
            isTrigger: patch.isTrigger ?? ent.physics.isTrigger,
            collisionEnabled: patch.collisionEnabled ?? ent.physics.collisionEnabled,
          },
        }
      : ent
  );
}

/**
 * Updates collision shape & bounds on an entity with safe non-degenerate clamps.
 */
export function updateEntityCollider(
  entities: SceneEntityNode[],
  entityId: string,
  patch: Partial<CollisionShapeSpec>
): SceneEntityNode[] {
  return entities.map((ent) => {
    if (ent.id !== entityId) return ent;
    return {
      ...ent,
      collider: {
        kind: patch.kind ?? ent.collider.kind,
        w: safeNum(patch.w ?? ent.collider.w, ent.collider.w, 8, 320),
        h: safeNum(patch.h ?? ent.collider.h, ent.collider.h, 8, 240),
        radius: safeNum(patch.radius ?? ent.collider.radius, ent.collider.radius, 6, 160),
        offsetX: safeNum(patch.offsetX ?? ent.collider.offsetX, ent.collider.offsetX, -120, 120),
        offsetY: safeNum(patch.offsetY ?? ent.collider.offsetY, ent.collider.offsetY, -120, 120),
      },
    };
  });
}

/**
 * Combines 2+ selected entities into a parent Container entity positioned at their bounding centroid.
 */
export function groupEntitiesIntoContainer(
  entities: SceneEntityNode[],
  selectedIds: string[],
  containerName?: string
): { entities: SceneEntityNode[]; containerId: string | null } {
  const uniqueIds = Array.from(new Set(selectedIds));
  const members = entities.filter((e) => uniqueIds.includes(e.id) && e.kind !== 'container');
  if (members.length < 2) {
    return { entities, containerId: null };
  }

  let sumX = 0;
  let sumY = 0;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const m of members) {
    sumX += m.x;
    sumY += m.y;
    const hw = (m.collider.kind === 'circle' ? m.collider.radius : m.collider.w * 0.5) * m.scaleX;
    const hh = (m.collider.kind === 'circle' ? m.collider.radius : m.collider.h * 0.5) * m.scaleY;
    minX = Math.min(minX, m.x - hw);
    maxX = Math.max(maxX, m.x + hw);
    minY = Math.min(minY, m.y - hh);
    maxY = Math.max(maxY, m.y + hh);
  }

  const cx = Number((sumX / members.length).toFixed(1));
  const cy = Number((sumY / members.length).toFixed(1));
  const containerCount = entities.filter((e) => e.kind === 'container').length + 1;
  const containerId = `container_${Date.now().toString(36)}_${containerCount}`;
  const memberSet = new Set(members.map((m) => m.id));

  const containerNode: SceneEntityNode = {
    id: containerId,
    name: containerName?.trim() || `Container #${containerCount}`,
    kind: 'container',
    parentId: null,
    children: members.map((m) => m.id),
    x: cx,
    y: cy,
    scaleX: 1,
    scaleY: 1,
    rotationDeg: 0,
    color: '#a855f7',
    physicsPreset: 'ghost',
    physics: { ...PHYSICS_PRESETS.ghost.config },
    collider: {
      kind: 'box',
      w: Math.max(32, Math.round(maxX - minX)),
      h: Math.max(32, Math.round(maxY - minY)),
      radius: Math.max(20, Math.round(Math.max(maxX - minX, maxY - minY) * 0.5)),
      offsetX: 0,
      offsetY: 0,
    },
  };

  // Detach from any previous parent containers cleanly
  const updated = entities
    .map((e) => {
      if (memberSet.has(e.id)) {
        return { ...e, parentId: containerId };
      }
      if (e.kind === 'container') {
        const remaining = e.children.filter((cid) => !memberSet.has(cid));
        return { ...e, children: remaining };
      }
      return e;
    })
    .filter((e) => e.kind !== 'container' || e.children.length > 0);

  return {
    entities: [...updated, containerNode],
    containerId,
  };
}

export function ungroupContainer(entities: SceneEntityNode[], containerId: string): SceneEntityNode[] {
  const target = entities.find((e) => e.id === containerId && e.kind === 'container');
  if (!target) return entities;
  const childSet = new Set(target.children);
  return entities
    .filter((e) => e.id !== containerId)
    .map((e) => (childSet.has(e.id) ? { ...e, parentId: null } : e));
}

/**
 * Moves, scales, and rotates an entity. When applied to a parent Container,
 * proportionally transforms all children around the Container pivot.
 */
export function updateEntityTransform(
  entities: SceneEntityNode[],
  entityId: string,
  next: { x?: number; y?: number; scaleX?: number; scaleY?: number; rotationDeg?: number }
): SceneEntityNode[] {
  const target = entities.find((e) => e.id === entityId);
  if (!target) return entities;

  const newX = safeNum(next.x ?? target.x, target.x, 12, 548);
  const newY = safeNum(next.y ?? target.y, target.y, 12, 308);
  const newScaleX = safeNum(next.scaleX ?? target.scaleX, target.scaleX, 0.35, 3.0);
  const newScaleY = safeNum(next.scaleY ?? target.scaleY, target.scaleY, 0.35, 3.0);
  const newRot = safeNum(next.rotationDeg ?? target.rotationDeg, target.rotationDeg, -360, 360);

  if (target.kind !== 'container' || target.children.length === 0) {
    return entities.map((e) =>
      e.id === entityId
        ? { ...e, x: Number(newX.toFixed(1)), y: Number(newY.toFixed(1)), scaleX: Number(newScaleX.toFixed(2)), scaleY: Number(newScaleY.toFixed(2)), rotationDeg: Number(newRot.toFixed(1)) }
        : e
    );
  }

  const ratioScaleX = target.scaleX > 0 ? newScaleX / target.scaleX : 1;
  const ratioScaleY = target.scaleY > 0 ? newScaleY / target.scaleY : 1;
  const deltaRotDeg = newRot - target.rotationDeg;
  const rad = (deltaRotDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const childSet = new Set(target.children);

  return entities.map((e) => {
    if (e.id === entityId) {
      return {
        ...e,
        x: Number(newX.toFixed(1)),
        y: Number(newY.toFixed(1)),
        scaleX: Number(newScaleX.toFixed(2)),
        scaleY: Number(newScaleY.toFixed(2)),
        rotationDeg: Number(newRot.toFixed(1)),
      };
    }
    if (!childSet.has(e.id)) return e;

    // Proportional offset relative to old pivot -> scale -> rotate -> translate to new pivot
    const relX = (e.x - target.x) * ratioScaleX;
    const relY = (e.y - target.y) * ratioScaleY;
    const rotRelX = relX * cos - relY * sin;
    const rotRelY = relX * sin + relY * cos;

    return {
      ...e,
      x: Number(safeNum(newX + rotRelX, e.x, 8, 552).toFixed(1)),
      y: Number(safeNum(newY + rotRelY, e.y, 8, 312).toFixed(1)),
      scaleX: Number(safeNum(e.scaleX * ratioScaleX, e.scaleX, 0.25, 4.0).toFixed(2)),
      scaleY: Number(safeNum(e.scaleY * ratioScaleY, e.scaleY, 0.25, 4.0).toFixed(2)),
      rotationDeg: Number((e.rotationDeg + deltaRotDeg).toFixed(1)),
    };
  });
}

function getWorldColliderBounds(ent: SceneEntityNode): {
  kind: 'box' | 'circle';
  cx: number;
  cy: number;
  hw: number;
  hh: number;
  r: number;
} {
  const cx = ent.x + ent.collider.offsetX * ent.scaleX;
  const cy = ent.y + ent.collider.offsetY * ent.scaleY;
  const hw = (ent.collider.w * ent.scaleX) * 0.5;
  const hh = (ent.collider.h * ent.scaleY) * 0.5;
  const r = ent.collider.radius * Math.max(ent.scaleX, ent.scaleY);
  return { kind: ent.collider.kind, cx, cy, hw, hh, r };
}

/**
 * Real-time overlap solver supporting AABB-vs-AABB, Circle-vs-Circle, and AABB-vs-Circle.
 */
export function detectEntityOverlaps(entities: SceneEntityNode[]): CollisionOverlapInfo[] {
  const overlaps: CollisionOverlapInfo[] = [];
  const collidable = entities.filter((e) => e.kind !== 'container');

  for (let i = 0; i < collidable.length; i++) {
    const a = collidable[i];
    if (!a.physics.collisionEnabled && !a.physics.isTrigger) continue;
    const ba = getWorldColliderBounds(a);

    for (let j = i + 1; j < collidable.length; j++) {
      const b = collidable[j];
      if (!b.physics.collisionEnabled && !b.physics.isTrigger) continue;
      const bb = getWorldColliderBounds(b);

      let depth = 0;
      if (ba.kind === 'box' && bb.kind === 'box') {
        const ox = ba.hw + bb.hw - Math.abs(ba.cx - bb.cx);
        const oy = ba.hh + bb.hh - Math.abs(ba.cy - bb.cy);
        if (ox > 0 && oy > 0) depth = Math.min(ox, oy);
      } else if (ba.kind === 'circle' && bb.kind === 'circle') {
        const dist = Math.hypot(ba.cx - bb.cx, ba.cy - bb.cy);
        const sumR = ba.r + bb.r;
        if (dist < sumR) depth = sumR - dist;
      } else {
        const box = ba.kind === 'box' ? ba : bb;
        const cir = ba.kind === 'circle' ? ba : bb;
        const closestX = Math.max(box.cx - box.hw, Math.min(cir.cx, box.cx + box.hw));
        const closestY = Math.max(box.cy - box.hh, Math.min(cir.cy, box.cy + box.hh));
        const dist = Math.hypot(cir.cx - closestX, cir.cy - closestY);
        if (dist < cir.r) depth = cir.r - dist;
      }

      if (depth > 0.25) {
        overlaps.push({
          aId: a.id,
          bId: b.id,
          aName: a.name,
          bName: b.name,
          depth: Number(depth.toFixed(1)),
          isTriggerOverlap: a.physics.isTrigger || b.physics.isTrigger,
        });
      }
    }
  }

  return overlaps;
}
