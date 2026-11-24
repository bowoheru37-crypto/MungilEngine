import { validateMoveBounds } from './engineCore';
import type {
  ArenaCoachDirective,
  ArenaCompanionOrder,
  ArenaDifficulty,
  ArenaMode,
  CollisionShapeSpec,
  PhysicsPresetId,
  PhysicsPresetSpec,
  SceneEntityNode,
  ShapeOverlapItem,
  ShapeOverlapResult,
  WizardGameSpec,
} from './types';

export const PHYSICS_PRESETS: Record<PhysicsPresetId, PhysicsPresetSpec> = {
  NORMAL: {
    id: 'NORMAL',
    label: 'Normal',
    mass: 1.0,
    friction: 0.45,
    restitution: 0.1,
    gravityScale: 1.0,
    linearDamp: 0.08,
    bounceThreshold: 25,
    isTrigger: false,
    bodyType: 'Dynamic',
    shape: 'Box',
    ccd: false,
    alpha: 1,
    note: 'Default karakter & NPC seimbang untuk Itel A70.',
  },
  BOUNCY: {
    id: 'BOUNCY',
    label: 'Bouncy',
    mass: 0.8,
    friction: 0.25,
    restitution: 0.88,
    gravityScale: 1.0,
    linearDamp: 0.04,
    bounceThreshold: 8,
    isTrigger: false,
    bodyType: 'Dynamic',
    shape: 'Circle',
    ccd: true,
    alpha: 1,
    note: 'Mantul elastis untuk bola energi, slime, atau trampolin.',
  },
  HEAVY: {
    id: 'HEAVY',
    label: 'Heavy',
    mass: 6.5,
    friction: 0.85,
    restitution: 0.02,
    gravityScale: 1.45,
    linearDamp: 0.18,
    bounceThreshold: 40,
    isTrigger: false,
    bodyType: 'Dynamic',
    shape: 'Box',
    ccd: true,
    alpha: 1,
    note: 'Batu, sentinel baja, atau peti berat anti-terbang.',
  },
  GHOST: {
    id: 'GHOST',
    label: 'Ghost',
    mass: 0.1,
    friction: 0,
    restitution: 0,
    gravityScale: 0,
    linearDamp: 0.22,
    bounceThreshold: 99,
    isTrigger: true,
    bodyType: 'Kinematic',
    shape: 'Circle',
    ccd: false,
    alpha: 0.55,
    note: 'Sensor trigger, arwah wisp, atau zona aura tembus pandang.',
  },
  SLIPPERY: {
    id: 'SLIPPERY',
    label: 'Slippery',
    mass: 1.0,
    friction: 0.03,
    restitution: 0.15,
    gravityScale: 1.0,
    linearDamp: 0.01,
    bounceThreshold: 20,
    isTrigger: false,
    bodyType: 'Dynamic',
    shape: 'Box',
    ccd: false,
    alpha: 1,
    note: 'Lantai es atau perosotan licin dengan momentum panjang.',
  },
  BALL: {
    id: 'BALL',
    label: 'Ball',
    mass: 0.5,
    friction: 0.15,
    restitution: 0.72,
    gravityScale: 1.15,
    linearDamp: 0.03,
    bounceThreshold: 12,
    isTrigger: false,
    bodyType: 'Dynamic',
    shape: 'Circle',
    ccd: true,
    alpha: 1,
    note: 'Proyektil orb atau bola fisika berkecepatan tinggi (CCD aktif).',
  },
};

export const DEFAULT_SCENE_ENTITIES: SceneEntityNode[] = [
  {
    id: 'ent_bowo',
    name: 'Bowo (Player)',
    type: 'Player',
    x: 110,
    y: 130,
    sx: 1,
    sy: 1,
    rot: 0,
    parent: null,
    locked: false,
    hidden: false,
    preset: 'NORMAL',
  },
  {
    id: 'ent_qolbu',
    name: 'Qolbu Companion',
    type: 'NPC',
    x: 170,
    y: 112,
    sx: 1,
    sy: 1,
    rot: 0,
    parent: null,
    locked: false,
    hidden: false,
    preset: 'GHOST',
  },
  {
    id: 'ent_slime',
    name: 'Slime Patrol',
    type: 'Enemy',
    x: 245,
    y: 135,
    sx: 1,
    sy: 1,
    rot: 0,
    parent: null,
    locked: false,
    hidden: false,
    preset: 'BOUNCY',
  },
  {
    id: 'ent_crate',
    name: 'Batu Menara',
    type: 'Prop',
    x: 280,
    y: 168,
    sx: 1,
    sy: 1,
    rot: 0,
    parent: null,
    locked: false,
    hidden: false,
    preset: 'HEAVY',
  },
  {
    id: 'ent_shard',
    name: 'Light Shard',
    type: 'Item',
    x: 196,
    y: 78,
    sx: 1,
    sy: 1,
    rot: 0,
    parent: null,
    locked: false,
    hidden: false,
    preset: 'BALL',
  },
];

export const DEFAULT_COLLISION_SHAPES: CollisionShapeSpec[] = [
  {
    id: 'shp_bowo',
    entityId: 'ent_bowo',
    type: 'Box',
    w: 36,
    h: 48,
    r: 22,
    ox: 0,
    oy: 0,
    rot: 0,
    color: '#38bdf8',
    verts: [
      { x: -18, y: -24 },
      { x: 18, y: -24 },
      { x: 18, y: 24 },
      { x: -18, y: 24 },
    ],
  },
  {
    id: 'shp_qolbu',
    entityId: 'ent_qolbu',
    type: 'Circle',
    w: 32,
    h: 32,
    r: 18,
    ox: 0,
    oy: 0,
    rot: 0,
    color: '#34d399',
    verts: [
      { x: 0, y: -18 },
      { x: 16, y: 12 },
      { x: -16, y: 12 },
    ],
  },
  {
    id: 'shp_slime',
    entityId: 'ent_slime',
    type: 'Polygon',
    w: 44,
    h: 34,
    r: 22,
    ox: 0,
    oy: 0,
    rot: 0,
    color: '#f43f5e',
    verts: [
      { x: 0, y: -18 },
      { x: 22, y: 4 },
      { x: 16, y: 18 },
      { x: -16, y: 18 },
      { x: -22, y: 4 },
    ],
  },
  {
    id: 'shp_crate',
    entityId: 'ent_crate',
    type: 'Box',
    w: 48,
    h: 40,
    r: 24,
    ox: 0,
    oy: 0,
    rot: 0,
    color: '#f59e0b',
    verts: [
      { x: -24, y: -20 },
      { x: 24, y: -20 },
      { x: 24, y: 20 },
      { x: -24, y: 20 },
    ],
  },
  {
    id: 'shp_shard',
    entityId: 'ent_shard',
    type: 'Circle',
    w: 24,
    h: 24,
    r: 14,
    ox: 0,
    oy: 0,
    rot: 0,
    color: '#a78bfa',
    verts: [
      { x: 0, y: -16 },
      { x: 12, y: 0 },
      { x: 0, y: 16 },
      { x: -12, y: 0 },
    ],
  },
];

export interface WorldTransform {
  x: number;
  y: number;
  sx: number;
  sy: number;
  rot: number;
}

/**
 * Computes hierarchical world transform (`world = parentWorld * local`) with cycle protection.
 */
export function computeWorldTransform(node: SceneEntityNode, allNodes: SceneEntityNode[]): WorldTransform {
  const chain: SceneEntityNode[] = [];
  const visited = new Set<string>();
  let curr: SceneEntityNode | undefined = node;

  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    chain.push(curr);
    curr = curr.parent ? allNodes.find((n) => n.id === curr!.parent) : undefined;
  }

  let wx = 0;
  let wy = 0;
  let wsx = 1;
  let wsy = 1;
  let wrot = 0;

  for (let i = chain.length - 1; i >= 0; i--) {
    const item = chain[i];
    const rad = (wrot * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const lx = item.x * wsx;
    const ly = item.y * wsy;
    wx += lx * cos - ly * sin;
    wy += lx * sin + ly * cos;
    wsx *= item.sx;
    wsy *= item.sy;
    wrot += item.rot;
  }

  return {
    x: Number(wx.toFixed(2)),
    y: Number(wy.toFixed(2)),
    sx: Number(wsx.toFixed(3)),
    sy: Number(wsy.toFixed(3)),
    rot: Number((((wrot % 360) + 360) % 360).toFixed(2)),
  };
}

/**
 * Groups selected entities into a new CONTAINER node while preserving each child's world position ("keep world").
 */
export function groupEntities(
  nodes: SceneEntityNode[],
  selectedIds: string[],
  containerName = 'Grup Baru'
): { nodes: SceneEntityNode[]; containerId: string | null } {
  const validIds = selectedIds.filter((id) => {
    const n = nodes.find((x) => x.id === id);
    return Boolean(n && n.type !== 'CONTAINER');
  });

  if (validIds.length < 2) {
    return { nodes, containerId: null };
  }

  const worldCache = new Map<string, WorldTransform>();
  for (const n of nodes) {
    worldCache.set(n.id, computeWorldTransform(n, nodes));
  }

  let sumX = 0;
  let sumY = 0;
  for (const id of validIds) {
    const wt = worldCache.get(id)!;
    sumX += wt.x;
    sumY += wt.y;
  }
  const cx = Math.round(sumX / validIds.length);
  const cy = Math.round(sumY / validIds.length);
  const containerId = `grp_${Date.now().toString(36)}_${Math.floor(Math.random() * 99)}`;

  const container: SceneEntityNode = {
    id: containerId,
    name: containerName.trim() || 'Grup Baru',
    type: 'CONTAINER',
    x: cx,
    y: cy,
    sx: 1,
    sy: 1,
    rot: 0,
    parent: null,
    locked: false,
    hidden: false,
    preset: 'NORMAL',
  };

  const selectedSet = new Set(validIds);
  const nextNodes = nodes.map((n) => {
    if (!selectedSet.has(n.id)) return n;
    const wt = worldCache.get(n.id)!;
    return {
      ...n,
      parent: containerId,
      x: Number((wt.x - cx).toFixed(2)),
      y: Number((wt.y - cy).toFixed(2)),
      sx: wt.sx,
      sy: wt.sy,
      rot: wt.rot,
    };
  });

  return {
    nodes: [container, ...nextNodes],
    containerId,
  };
}

/**
 * Ungroups a CONTAINER node and restores every direct child's world transform cleanly.
 */
export function ungroupContainer(nodes: SceneEntityNode[], containerId: string): SceneEntityNode[] {
  const container = nodes.find((n) => n.id === containerId && n.type === 'CONTAINER');
  if (!container) return nodes;

  const worldMap = new Map<string, WorldTransform>();
  for (const n of nodes) {
    worldMap.set(n.id, computeWorldTransform(n, nodes));
  }

  return nodes
    .filter((n) => n.id !== containerId)
    .map((n) => {
      if (n.parent !== containerId) return n;
      const wt = worldMap.get(n.id)!;
      return {
        ...n,
        parent: container.parent,
        x: wt.x,
        y: wt.y,
        sx: wt.sx,
        sy: wt.sy,
        rot: wt.rot,
      };
    });
}

interface ResolvedBounds {
  cx: number;
  cy: number;
  hw: number;
  hh: number;
  r: number;
  type: CollisionShapeSpec['type'];
  vertsWorld: Array<{ x: number; y: number }>;
}

function resolveShapeWorld(shape: CollisionShapeSpec, nodes: SceneEntityNode[]): ResolvedBounds {
  const node = nodes.find((n) => n.id === shape.entityId);
  const wt = node ? computeWorldTransform(node, nodes) : { x: 180, y: 120, sx: 1, sy: 1, rot: 0 };
  const cx = wt.x + shape.ox;
  const cy = wt.y + shape.oy;
  const sx = Math.max(0.2, Math.abs(wt.sx));
  const sy = Math.max(0.2, Math.abs(wt.sy));
  const totalRad = ((wt.rot + shape.rot) * Math.PI) / 180;
  const cos = Math.cos(totalRad);
  const sin = Math.sin(totalRad);

  const vertsWorld =
    shape.verts.length >= 3
      ? shape.verts.map((v) => {
          const vx = v.x * sx;
          const vy = v.y * sy;
          return {
            x: cx + vx * cos - vy * sin,
            y: cy + vx * sin + vy * cos,
          };
        })
      : [
          { x: cx - (shape.w * sx) / 2, y: cy - (shape.h * sy) / 2 },
          { x: cx + (shape.w * sx) / 2, y: cy - (shape.h * sy) / 2 },
          { x: cx + (shape.w * sx) / 2, y: cy + (shape.h * sy) / 2 },
          { x: cx - (shape.w * sx) / 2, y: cy + (shape.h * sy) / 2 },
        ];

  let hw = (shape.w * sx) / 2;
  let hh = (shape.h * sy) / 2;
  if (shape.type === 'Polygon' && vertsWorld.length >= 3) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const v of vertsWorld) {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    }
    hw = Math.max(4, (maxX - minX) / 2);
    hh = Math.max(4, (maxY - minY) / 2);
  }

  return {
    cx,
    cy,
    hw,
    hh,
    r: shape.r * Math.max(sx, sy),
    type: shape.type,
    vertsWorld,
  };
}

function pairGapOrPenetration(a: ResolvedBounds, b: ResolvedBounds): { penetrationPx: number; gapPx: number } {
  if (a.type === 'Circle' && b.type === 'Circle') {
    const dist = Math.hypot(a.cx - b.cx, a.cy - b.cy);
    const sumR = a.r + b.r;
    if (dist < sumR) {
      return { penetrationPx: Number((sumR - dist).toFixed(1)), gapPx: 0 };
    }
    return { penetrationPx: 0, gapPx: Number((dist - sumR).toFixed(1)) };
  }

  if (a.type === 'Circle' || b.type === 'Circle') {
    const circ = a.type === 'Circle' ? a : b;
    const box = a.type === 'Circle' ? b : a;
    const closestX = Math.max(box.cx - box.hw, Math.min(box.cx + box.hw, circ.cx));
    const closestY = Math.max(box.cy - box.hh, Math.min(box.cy + box.hh, circ.cy));
    const dist = Math.hypot(circ.cx - closestX, circ.cy - closestY);
    if (dist < circ.r) {
      return { penetrationPx: Number((circ.r - dist).toFixed(1)), gapPx: 0 };
    }
    return { penetrationPx: 0, gapPx: Number((dist - circ.r).toFixed(1)) };
  }

  // Box/Polygon bounding overlap
  const dx = Math.abs(a.cx - b.cx);
  const dy = Math.abs(a.cy - b.cy);
  const penX = a.hw + b.hw - dx;
  const penY = a.hh + b.hh - dy;
  if (penX > 0 && penY > 0) {
    return { penetrationPx: Number(Math.min(penX, penY).toFixed(1)), gapPx: 0 };
  }
  const gapX = Math.max(0, -penX);
  const gapY = Math.max(0, -penY);
  return { penetrationPx: 0, gapPx: Number(Math.hypot(gapX, gapY).toFixed(1)) };
}

/**
 * Evaluates real-time collision overlap & <8px proximity against all other scene shapes.
 */
export function evaluateShapeOverlaps(
  selectedShapeId: string,
  shapes: CollisionShapeSpec[],
  nodes: SceneEntityNode[]
): ShapeOverlapResult {
  const target = shapes.find((s) => s.id === selectedShapeId);
  if (!target) {
    return { status: 'none', items: [] };
  }

  const a = resolveShapeWorld(target, nodes);
  const items: ShapeOverlapItem[] = [];
  let hasOverlap = false;
  let hasNear = false;

  for (const other of shapes) {
    if (other.id === target.id) continue;
    const otherNode = nodes.find((n) => n.id === other.entityId);
    if (otherNode?.hidden) continue;

    const b = resolveShapeWorld(other, nodes);
    const { penetrationPx, gapPx } = pairGapOrPenetration(a, b);
    const hit = penetrationPx > 0;
    const near = !hit && gapPx < 8;
    if (hit) hasOverlap = true;
    if (near) hasNear = true;

    items.push({
      otherShapeId: other.id,
      entityName: otherNode?.name ?? other.entityId,
      penetrationPx,
      hit,
      near,
    });
  }

  return {
    status: hasOverlap ? 'overlap' : hasNear ? 'near' : 'none',
    items,
  };
}

// ============================================================
// Qolbu Arena AI Simulation (Solo AI / Co-Play / Vs Adaptive)
// ============================================================

export interface ArenaFighter {
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  attackCd: number;
  dashCd: number;
  healCd: number;
  invuln: number;
  fsm: 'idle' | 'move' | 'attack' | 'dash' | 'heal' | 'ko';
}

export interface ArenaEnemy {
  id: number;
  name: string;
  isBoss: boolean;
  phase: 1 | 2 | 3;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  attackCd: number;
  telegraph: number;
  hurtFlash: number;
  dead: boolean;
}

export interface ArenaItem {
  id: number;
  kind: 'shard' | 'potion';
  x: number;
  y: number;
  collected: boolean;
}

export interface ArenaWorld {
  mode: ArenaMode;
  mapName: string;
  characterName: string;
  difficulty: ArenaDifficulty;
  autoDifficulty: boolean;
  tickCount: number;
  elapsedSec: number;
  score: number;
  status: 'playing' | 'victory' | 'gameover';
  player: ArenaFighter;
  companion: ArenaFighter;
  companionReviveLeft: number;
  enemies: ArenaEnemy[];
  items: ArenaItem[];
  lastPlayerMoves: string[];
  adaptiveRule: string;
  aiThinkText: string;
  aiPath: Array<{ x: number; y: number }>;
  hitFlashTimer: number;
  logText: string;
}

export interface ArenaInput {
  moveX: number;
  moveY: number;
}

export interface ArenaStepOptions {
  coachDirective: ArenaCoachDirective;
  companionOrder: ArenaCompanionOrder;
  speedMul?: 1 | 2;
}

export function createArenaWorld(mode: ArenaMode, spec?: WizardGameSpec | null): ArenaWorld {
  const diff: ArenaDifficulty = spec?.difficulty ?? 'Normal';
  const hpScale = diff === 'Hard' ? 1.35 : diff === 'Easy' ? 0.8 : 1;
  const enemyCount = Math.max(1, Math.min(6, spec?.enemies ?? (mode === 'vs' ? 1 : 3)));
  const itemCount = Math.max(2, Math.min(6, spec?.items ?? 3));

  const enemies: ArenaEnemy[] = [];
  if (mode === 'vs') {
    enemies.push({
      id: 1,
      name: 'Boss Kala (Adaptive)',
      isBoss: true,
      phase: 1,
      x: 280,
      y: 120,
      vx: 0,
      vy: 0,
      hp: Math.round(240 * hpScale),
      maxHp: Math.round(240 * hpScale),
      attackCd: 1.0,
      telegraph: 0,
      hurtFlash: 0,
      dead: false,
    });
  } else {
    for (let i = 0; i < enemyCount; i++) {
      enemies.push({
        id: i + 1,
        name: i === enemyCount - 1 && enemyCount >= 3 ? 'Sentinel Mini' : `Bayang ${i + 1}`,
        isBoss: false,
        phase: 1,
        x: 245 + (i % 2) * 58,
        y: 55 + ((i * 52) % 135),
        vx: 0,
        vy: 0,
        hp: Math.round((65 + i * 15) * hpScale),
        maxHp: Math.round((65 + i * 15) * hpScale),
        attackCd: 0.7 + i * 0.25,
        telegraph: 0,
        hurtFlash: 0,
        dead: false,
      });
    }
  }

  const items: ArenaItem[] = [];
  for (let i = 0; i < itemCount; i++) {
    items.push({
      id: i + 1,
      kind: i % 2 === 0 ? 'shard' : 'potion',
      x: 90 + ((i * 75) % 210),
      y: 44 + ((i * 68) % 150),
      collected: false,
    });
  }

  return {
    mode,
    mapName: spec?.map ?? 'Arena Qolbu',
    characterName: spec?.characterName ?? 'Bowo',
    difficulty: diff,
    autoDifficulty: true,
    tickCount: 0,
    elapsedSec: 0,
    score: 0,
    status: 'playing',
    player: {
      name: spec?.characterName ?? 'Bowo',
      x: 68,
      y: 120,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      facing: 1,
      attackCd: 0,
      dashCd: 0,
      healCd: 0,
      invuln: 0,
      fsm: 'idle',
    },
    companion: {
      name: 'Qolbu AI',
      x: 52,
      y: 158,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      facing: 1,
      attackCd: 0,
      dashCd: 0,
      healCd: 0,
      invuln: 0,
      fsm: 'idle',
    },
    companionReviveLeft: 1,
    enemies,
    items,
    lastPlayerMoves: [],
    adaptiveRule: 'Merekam pola gerak pemain (0/10)',
    aiThinkText:
      mode === 'solo'
        ? 'Utility AI aktif pada 15Hz'
        : mode === 'coplay'
          ? 'Qolbu siap menemani & auto-heal'
          : 'Boss Kala memantau 10 aksi terakhir',
    aiPath: [{ x: 68, y: 120 }],
    hitFlashTimer: 0,
    logText: `Mode ${mode.toUpperCase()} dimulai di ${spec?.map ?? 'Arena Qolbu'}.`,
  };
}

function clampArenaPos(fromX: number, fromY: number, toX: number, toY: number, dt: number, maxSpeed: number) {
  return validateMoveBounds(fromX, fromY, toX, toY, dt, maxSpeed, {
    minX: 20,
    maxX: 340,
    minY: 22,
    maxY: 218,
  });
}

function recordPlayerMove(arena: ArenaWorld, moveCode: string): void {
  arena.lastPlayerMoves.push(moveCode);
  if (arena.lastPlayerMoves.length > 10) {
    arena.lastPlayerMoves.shift();
  }
}

export function triggerArenaPlayerAction(arena: ArenaWorld, action: 'attack' | 'dash' | 'heal'): boolean {
  if (arena.status !== 'playing') return false;
  const p = arena.player;

  if (action === 'attack' && p.attackCd <= 0) {
    p.attackCd = 0.35;
    p.fsm = 'attack';
    recordPlayerMove(arena, 'ATK');
    let hits = 0;
    for (const e of arena.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) <= 56) {
        e.hp = Math.max(0, e.hp - 24);
        e.hurtFlash = 0.2;
        hits++;
        arena.score += 35;
        if (e.hp <= 0) {
          e.dead = true;
          arena.score += e.isBoss ? 500 : 120;
        }
      }
    }
    if (hits > 0) {
      arena.hitFlashTimer = 0.12;
      arena.logText = `${p.name} menyerang ${hits} target!`;
    }
    return true;
  }

  if (action === 'dash' && p.dashCd <= 0) {
    p.dashCd = 0.9;
    p.invuln = 0.35;
    p.fsm = 'dash';
    const nextX = p.x + p.facing * 42;
    const bounded = clampArenaPos(p.x, p.y, nextX, p.y, 0.05, 950);
    p.x = bounded.x;
    p.y = bounded.y;
    recordPlayerMove(arena, p.facing >= 0 ? 'DASH_R' : 'DASH_L');
    arena.logText = `${p.name} Dash (${p.facing >= 0 ? 'Kanan' : 'Kiri'})!`;
    return true;
  }

  if (action === 'heal' && p.healCd <= 0 && p.hp < p.maxHp) {
    p.healCd = 3.5;
    p.fsm = 'heal';
    p.hp = Math.min(p.maxHp, p.hp + 28);
    recordPlayerMove(arena, 'HEAL');
    arena.logText = `${p.name} memulihkan +28 HP.`;
    return true;
  }

  return false;
}

export function stepArenaWorld(
  arena: ArenaWorld,
  rawDt: number,
  input: ArenaInput,
  options: ArenaStepOptions
): void {
  if (arena.status !== 'playing') return;

  const mult = options.speedMul === 2 ? 2 : 1;
  const dt = Math.min(0.05, Math.max(0.008, rawDt)) * mult;
  arena.tickCount += 1;
  arena.elapsedSec += dt;
  arena.hitFlashTimer = Math.max(0, arena.hitFlashTimer - dt);

  const p = arena.player;
  const c = arena.companion;

  p.attackCd = Math.max(0, p.attackCd - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.healCd = Math.max(0, p.healCd - dt);
  p.invuln = Math.max(0, p.invuln - dt);

  c.attackCd = Math.max(0, c.attackCd - dt);
  c.dashCd = Math.max(0, c.dashCd - dt);
  c.healCd = Math.max(0, c.healCd - dt);
  c.invuln = Math.max(0, c.invuln - dt);

  const aiTick15Hz = arena.tickCount % 2 === 0;
  const livingEnemies = arena.enemies.filter((e) => !e.dead);
  const nearestEnemy = livingEnemies.reduce<ArenaEnemy | null>((best, cur) => {
    if (!best) return cur;
    return Math.hypot(cur.x - p.x, cur.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? cur : best;
  }, null);
  const nearestItem = arena.items.find((it) => !it.collected) ?? null;

  // 1. Player or Solo Utility AI Movement
  if (arena.mode === 'solo') {
    if (aiTick15Hz) {
      let tx = p.x;
      let ty = p.y;
      const directive = options.coachDirective;

      if ((p.hp < 45 || directive === 'Bertahan') && nearestEnemy && Math.hypot(nearestEnemy.x - p.x, nearestEnemy.y - p.y) < 90) {
        // Kite away from enemy or move toward potion
        const potion = arena.items.find((it) => !it.collected && it.kind === 'potion');
        if (potion) {
          tx = potion.x;
          ty = potion.y;
          arena.aiThinkText = 'Sense HP rendah -> Think ke Potion -> Act Ambil Heal';
        } else {
          tx = p.x - Math.sign(nearestEnemy.x - p.x || 1) * 70;
          ty = p.y + (p.y < 120 ? 40 : -40);
          arena.aiThinkText = `Coach ${directive} -> Think Jaga Jarak -> Act Kite`;
        }
        if (p.hp < 40) triggerArenaPlayerAction(arena, 'heal');
      } else if (directive === 'Farming' && nearestItem) {
        tx = nearestItem.x;
        ty = nearestItem.y;
        arena.aiThinkText = `Coach Farming -> Think ke ${nearestItem.kind} -> Act Loot`;
      } else if (nearestEnemy) {
        tx = nearestEnemy.x - Math.sign(nearestEnemy.x - p.x || 1) * 28;
        ty = nearestEnemy.y;
        const dist = Math.hypot(nearestEnemy.x - p.x, nearestEnemy.y - p.y);
        arena.aiThinkText = `Coach ${directive} -> Think Serang ${nearestEnemy.name} (${Math.round(dist)}px)`;
        if (dist <= 50) {
          triggerArenaPlayerAction(arena, 'attack');
        } else if (directive === 'Agresif' && dist > 95 && p.dashCd <= 0) {
          p.facing = nearestEnemy.x >= p.x ? 1 : -1;
          triggerArenaPlayerAction(arena, 'dash');
        }
      }

      const dx = tx - p.x;
      const dy = ty - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const speed = directive === 'Agresif' ? 145 : directive === 'Bertahan' ? 115 : 130;
      p.vx = Math.abs(dx) > 4 ? (dx / len) * speed : 0;
      p.vy = Math.abs(dy) > 4 ? (dy / len) * speed : 0;
      p.facing = p.vx >= 0 ? 1 : -1;
      arena.aiPath = [
        { x: p.x, y: p.y },
        { x: Math.max(20, Math.min(340, tx)), y: Math.max(22, Math.min(218, ty)) },
      ];
    }
  } else {
    const speed = 155;
    p.vx = input.moveX * speed;
    p.vy = input.moveY * speed;
    if (Math.abs(input.moveX) > 0.1) {
      p.facing = input.moveX > 0 ? 1 : -1;
      if (aiTick15Hz) {
        recordPlayerMove(arena, input.moveX > 0 ? 'MOVE_R' : 'MOVE_L');
      }
    }
  }

  const nextPlayerPos = clampArenaPos(p.x, p.y, p.x + p.vx * dt, p.y + p.vy * dt, dt, 260);
  p.x = nextPlayerPos.x;
  p.y = nextPlayerPos.y;
  if (p.attackCd <= 0.1 && p.dashCd <= 0.5) {
    p.fsm = Math.hypot(p.vx, p.vy) > 12 ? 'move' : 'idle';
  }

  // 2. Co-Play Companion AI (Qolbu)
  if (arena.mode === 'coplay') {
    if (aiTick15Hz) {
      let cx = p.x - p.facing * 32;
      let cy = p.y + 18;
      const order = options.companionOrder;

      // Auto-heal when player < 40% HP
      if ((p.hp < 40 || order === 'Heal') && c.healCd <= 0 && p.hp < p.maxHp) {
        c.healCd = 4.0;
        c.fsm = 'heal';
        p.hp = Math.min(p.maxHp, p.hp + 25);
        arena.aiThinkText = 'Co-Play Qolbu: HP Player <40% -> Auto-Heal +25 HP!';
        arena.logText = 'Qolbu AI memulihkan Bowo (+25 HP).';
      } else if (order === 'Ambil Item' && nearestItem) {
        cx = nearestItem.x;
        cy = nearestItem.y;
        arena.aiThinkText = `Co-Play Order [${order}] -> Mengambil ${nearestItem.kind}`;
      } else if (order === 'Bertahan') {
        cx = p.x + p.facing * 24;
        cy = p.y;
        arena.aiThinkText = 'Co-Play Order [Bertahan] -> Menjaga sisi depan Bowo';
      } else if (order === 'Serang' && nearestEnemy) {
        cx = nearestEnemy.x - 24;
        cy = nearestEnemy.y;
        const d = Math.hypot(nearestEnemy.x - c.x, nearestEnemy.y - c.y);
        arena.aiThinkText = `Co-Play Order [Serang] -> Fokus ke ${nearestEnemy.name}`;
        if (d <= 48 && c.attackCd <= 0) {
          c.attackCd = 0.55;
          c.fsm = 'attack';
          nearestEnemy.hp = Math.max(0, nearestEnemy.hp - 18);
          nearestEnemy.hurtFlash = 0.15;
          arena.score += 25;
          if (nearestEnemy.hp <= 0) {
            nearestEnemy.dead = true;
            arena.score += 100;
          }
        }
      } else {
        arena.aiThinkText = 'Co-Play Order [Ikut] -> Mendampingi Bowo & bantu pukul terdekat';
        if (nearestEnemy && Math.hypot(nearestEnemy.x - c.x, nearestEnemy.y - c.y) <= 50 && c.attackCd <= 0) {
          c.attackCd = 0.65;
          c.fsm = 'attack';
          nearestEnemy.hp = Math.max(0, nearestEnemy.hp - 14);
          nearestEnemy.hurtFlash = 0.12;
          if (nearestEnemy.hp <= 0) nearestEnemy.dead = true;
        }
      }

      const dx = cx - c.x;
      const dy = cy - c.y;
      const len = Math.hypot(dx, dy) || 1;
      c.vx = Math.abs(dx) > 5 ? (dx / len) * 135 : 0;
      c.vy = Math.abs(dy) > 5 ? (dy / len) * 135 : 0;
      arena.aiPath = [
        { x: c.x, y: c.y },
        { x: Math.max(20, Math.min(340, cx)), y: Math.max(22, Math.min(218, cy)) },
      ];
    }
    const nextComp = clampArenaPos(c.x, c.y, c.x + c.vx * dt, c.y + c.vy * dt, dt, 240);
    c.x = nextComp.x;
    c.y = nextComp.y;
  }

  // 3. Collect items
  for (const item of arena.items) {
    if (item.collected) continue;
    const pickedByPlayer = Math.hypot(item.x - p.x, item.y - p.y) < 22;
    const pickedByComp = arena.mode === 'coplay' && Math.hypot(item.x - c.x, item.y - c.y) < 22;
    if (pickedByPlayer || pickedByComp) {
      item.collected = true;
      if (item.kind === 'potion') {
        p.hp = Math.min(p.maxHp, p.hp + 20);
        arena.score += 40;
      } else {
        arena.score += 75;
      }
    }
  }

  // 4. Adaptive Enemy / Boss Kala Update (15Hz AI decision)
  const rightDashCount = arena.lastPlayerMoves.filter((m) => m === 'DASH_R' || m === 'MOVE_R').length;
  const leftDashCount = arena.lastPlayerMoves.filter((m) => m === 'DASH_L' || m === 'MOVE_L').length;
  const predictedFlankX = rightDashCount >= 3 ? p.x - 42 : leftDashCount >= 3 ? p.x + 42 : p.x;

  if (arena.mode === 'vs') {
    if (rightDashCount >= 3) {
      arena.adaptiveRule = `Pola kanan (${rightDashCount}/10) terdeteksi -> Boss potong flank KIRI`;
    } else if (leftDashCount >= 3) {
      arena.adaptiveRule = `Pola kiri (${leftDashCount}/10) terdeteksi -> Boss potong flank KANAN`;
    } else {
      arena.adaptiveRule = `Merekam pola (${arena.lastPlayerMoves.length}/10 aksi)`;
    }
  }

  for (const enemy of arena.enemies) {
    if (enemy.dead) continue;
    enemy.hurtFlash = Math.max(0, enemy.hurtFlash - dt);
    enemy.attackCd = Math.max(0, enemy.attackCd - dt);
    enemy.telegraph = Math.max(0, enemy.telegraph - dt);

    if (enemy.isBoss) {
      const ratio = enemy.hp / enemy.maxHp;
      enemy.phase = ratio <= 0.34 ? 3 : ratio <= 0.67 ? 2 : 1;
    }

    if (aiTick15Hz) {
      const targetX = enemy.isBoss ? predictedFlankX : p.x;
      const targetY = p.y;
      const dx = targetX - enemy.x;
      const dy = targetY - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      const spdBase = enemy.isBoss ? 72 + enemy.phase * 18 : 66;
      const diffMul = arena.difficulty === 'Hard' ? 1.25 : arena.difficulty === 'Easy' ? 0.78 : 1;
      enemy.vx = dist > 20 ? (dx / dist) * spdBase * diffMul : 0;
      enemy.vy = dist > 20 ? (dy / dist) * spdBase * diffMul : 0;

      if (enemy.isBoss) {
        arena.aiThinkText = `Boss Kala F${enemy.phase} · ${arena.adaptiveRule}`;
        arena.aiPath = [
          { x: enemy.x, y: enemy.y },
          { x: Math.max(20, Math.min(340, targetX)), y: Math.max(22, Math.min(218, targetY)) },
        ];
      }

      if (Math.hypot(p.x - enemy.x, p.y - enemy.y) < 34 && enemy.attackCd <= 0 && p.invuln <= 0) {
        const dmg = enemy.isBoss ? 10 + enemy.phase * 4 : 9;
        p.hp = Math.max(0, p.hp - dmg);
        p.invuln = 0.65;
        enemy.attackCd = enemy.isBoss ? 1.15 - enemy.phase * 0.15 : 1.3;
        enemy.telegraph = 0.25;
        arena.hitFlashTimer = 0.14;
        arena.logText = `${enemy.name} mengenai ${p.name} (-${dmg} HP)!`;
      }
    }

    const nextE = clampArenaPos(enemy.x, enemy.y, enemy.x + enemy.vx * dt, enemy.y + enemy.vy * dt, dt, 220);
    enemy.x = nextE.x;
    enemy.y = nextE.y;
  }

  // Auto-difficulty scaling in VS mode
  if (arena.mode === 'vs' && arena.autoDifficulty && aiTick15Hz) {
    if (arena.elapsedSec > 18 && p.hp > 80 && arena.difficulty === 'Normal') {
      arena.difficulty = 'Hard';
    } else if (p.hp < 25 && arena.difficulty === 'Hard') {
      arena.difficulty = 'Normal';
    }
  }

  // Co-Play 1x Revive or Game Over
  if (p.hp <= 0) {
    if (arena.mode === 'coplay' && arena.companionReviveLeft > 0) {
      arena.companionReviveLeft -= 1;
      p.hp = 55;
      p.invuln = 1.5;
      arena.logText = 'Qolbu AI mengaktifkan 1x Revive (+55 HP)!';
    } else {
      p.fsm = 'ko';
      arena.status = 'gameover';
      arena.logText = `${p.name} tumbang di ${arena.mapName}. Tekan Reset Arena untuk ulang.`;
      return;
    }
  }

  if (arena.enemies.every((e) => e.dead)) {
    arena.status = 'victory';
    arena.logText = `Menang! Semua lawan di ${arena.mapName} dikalahkan (Skor ${arena.score}).`;
  }
}
