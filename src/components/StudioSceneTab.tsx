import { Download, FolderPlus, Lock, Unlock, Eye, EyeOff, RotateCcw, Ungroup, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { soundEngine } from '../engine/audio';
import {
  computeWorldTransform,
  DEFAULT_COLLISION_SHAPES,
  DEFAULT_SCENE_ENTITIES,
  evaluateShapeOverlaps,
  groupEntities,
  PHYSICS_PRESETS,
  ungroupContainer,
} from '../engine/scenePhysics';
import type { CollisionShapeSpec, PhysicsPresetId, SceneEntityNode } from '../engine/types';

interface StudioSceneTabProps {
  entities: SceneEntityNode[];
  setEntities: (updater: SceneEntityNode[] | ((prev: SceneEntityNode[]) => SceneEntityNode[])) => void;
  shapes: CollisionShapeSpec[];
  setShapes: (updater: CollisionShapeSpec[] | ((prev: CollisionShapeSpec[]) => CollisionShapeSpec[])) => void;
}

type DragTarget =
  | { kind: 'offset'; startX: number; startY: number; origOx: number; origOy: number }
  | { kind: 'box_corner' }
  | { kind: 'circle_edge' }
  | { kind: 'vertex'; index: number };

const PRESET_ORDER: PhysicsPresetId[] = ['NORMAL', 'BOUNCY', 'HEAVY', 'GHOST', 'SLIPPERY', 'BALL'];

export function StudioSceneTab({ entities, setEntities, shapes, setShapes }: StudioSceneTabProps) {
  const [selectedId, setSelectedId] = useState<string>(() => entities[0]?.id ?? 'ent_bowo');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('Squad Cahaya');
  const [statusMsg, setStatusMsg] = useState('Pilih entitas untuk ubah Physics Preset, Group, atau Collision Shape.');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<DragTarget | null>(null);

  const selectedNode = useMemo(
    () => entities.find((e) => e.id === selectedId) ?? entities[0] ?? null,
    [entities, selectedId]
  );

  const selectedShape = useMemo(() => {
    if (!selectedNode) return shapes[0] ?? null;
    return shapes.find((s) => s.entityId === selectedNode.id) ?? shapes[0] ?? null;
  }, [selectedNode, shapes]);

  const selectedWorld = useMemo(
    () => (selectedNode ? computeWorldTransform(selectedNode, entities) : null),
    [entities, selectedNode]
  );

  const overlapResult = useMemo(
    () => (selectedShape ? evaluateShapeOverlaps(selectedShape.id, shapes, entities) : { status: 'none' as const, items: [] }),
    [entities, selectedShape, shapes]
  );

  const activePreset = PHYSICS_PRESETS[selectedNode?.preset ?? 'NORMAL'];
  const normalPreset = PHYSICS_PRESETS.NORMAL;

  // Draw 360x240 Collision & Hierarchy Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#090e1a';
    ctx.fillRect(0, 0, w, h);

    // Subtle 24px grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= w; gx += 24) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }
    for (let gy = 0; gy <= h; gy += 24) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Draw containers as dashed bounds
    for (const node of entities) {
      if (node.hidden || node.type !== 'CONTAINER') continue;
      const wt = computeWorldTransform(node, entities);
      ctx.save();
      ctx.translate(wt.x, wt.y);
      ctx.rotate((wt.rot * Math.PI) / 180);
      ctx.strokeStyle = node.id === selectedNode?.id ? '#38bdf8' : 'rgba(56, 189, 248, 0.45)';
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(-32 * wt.sx, -26 * wt.sy, 64 * wt.sx, 52 * wt.sy);
      ctx.setLineDash([]);
      ctx.fillStyle = '#7dd3fc';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(node.name, -30, -30);
      ctx.restore();
    }

    // Draw collision shapes
    for (const shape of shapes) {
      const node = entities.find((e) => e.id === shape.entityId);
      if (!node || node.hidden) continue;
      const wt = computeWorldTransform(node, entities);
      const cx = wt.x + shape.ox;
      const cy = wt.y + shape.oy;
      const totalRotRad = ((wt.rot + shape.rot) * Math.PI) / 180;
      const isSelected = selectedShape?.id === shape.id;
      const overlapItem = overlapResult.items.find((it) => it.otherShapeId === shape.id);
      const alpha = PHYSICS_PRESETS[node.preset].alpha;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cx, cy);
      ctx.rotate(totalRotRad);
      ctx.scale(Math.max(0.25, wt.sx), Math.max(0.25, wt.sy));

      const strokeColor =
        isSelected && overlapResult.status === 'overlap'
          ? '#f43f5e'
          : isSelected && overlapResult.status === 'near'
            ? '#f59e0b'
            : overlapItem?.hit
              ? '#fb7185'
              : shape.color;

      ctx.fillStyle = `${strokeColor}33`;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;

      if (shape.type === 'Box') {
        ctx.fillRect(-shape.w / 2, -shape.h / 2, shape.w, shape.h);
        ctx.strokeRect(-shape.w / 2, -shape.h / 2, shape.w, shape.h);
      } else if (shape.type === 'Circle') {
        ctx.beginPath();
        ctx.arc(0, 0, shape.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (shape.verts.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(shape.verts[0].x, shape.verts[0].y);
        for (let i = 1; i < shape.verts.length; i++) {
          ctx.lineTo(shape.verts[i].x, shape.verts[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Handles for selected shape
      if (isSelected) {
        ctx.globalAlpha = 1;
        // Center drag handle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        if (shape.type === 'Box') {
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(shape.w / 2 - 4, shape.h / 2 - 4, 8, 8);
        } else if (shape.type === 'Circle') {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(shape.r, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          for (const v of shape.verts) {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(v.x, v.y, 4.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.restore();

      // Name label
      ctx.fillStyle = isSelected ? '#f8fafc' : '#94a3b8';
      ctx.font = isSelected ? 'bold 10px sans-serif' : '10px sans-serif';
      ctx.fillText(node.name, cx - 22, cy - 28);
    }
  }, [entities, overlapResult, selectedNode?.id, selectedShape?.id, shapes]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!selectedShape || !selectedNode || selectedNode.locked) return;
    const pt = getCanvasPoint(e);
    const wt = computeWorldTransform(selectedNode, entities);
    const cx = wt.x + selectedShape.ox;
    const cy = wt.y + selectedShape.oy;

    if (selectedShape.type === 'Polygon') {
      const idx = selectedShape.verts.findIndex((v) => Math.hypot(cx + v.x * wt.sx - pt.x, cy + v.y * wt.sy - pt.y) <= 12);
      if (idx >= 0) {
        dragRef.current = { kind: 'vertex', index: idx };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    } else if (selectedShape.type === 'Box') {
      const hx = cx + (selectedShape.w * wt.sx) / 2;
      const hy = cy + (selectedShape.h * wt.sy) / 2;
      if (Math.hypot(hx - pt.x, hy - pt.y) <= 14) {
        dragRef.current = { kind: 'box_corner' };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    } else if (selectedShape.type === 'Circle') {
      const hx = cx + selectedShape.r * wt.sx;
      const hy = cy;
      if (Math.hypot(hx - pt.x, hy - pt.y) <= 14) {
        dragRef.current = { kind: 'circle_edge' };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }

    // Otherwise check if user clicked another shape to select it
    for (const s of shapes) {
      const n = entities.find((x) => x.id === s.entityId);
      if (!n || n.hidden) continue;
      const w = computeWorldTransform(n, entities);
      if (Math.hypot(w.x + s.ox - pt.x, w.y + s.oy - pt.y) <= 22) {
        setSelectedId(n.id);
        dragRef.current = { kind: 'offset', startX: pt.x, startY: pt.y, origOx: s.ox, origOy: s.oy };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }

    dragRef.current = { kind: 'offset', startX: pt.x, startY: pt.y, origOx: selectedShape.ox, origOy: selectedShape.oy };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || !selectedShape || !selectedNode || selectedNode.locked) return;
    const pt = getCanvasPoint(e);
    const wt = computeWorldTransform(selectedNode, entities);
    const cx = wt.x + selectedShape.ox;
    const cy = wt.y + selectedShape.oy;

    setShapes((prev) =>
      prev.map((s) => {
        if (s.id !== selectedShape.id) return s;
        if (drag.kind === 'offset') {
          return {
            ...s,
            ox: Math.round(Math.max(-90, Math.min(90, drag.origOx + (pt.x - drag.startX)))),
            oy: Math.round(Math.max(-80, Math.min(80, drag.origOy + (pt.y - drag.startY)))),
          };
        }
        if (drag.kind === 'box_corner') {
          return {
            ...s,
            w: Math.round(Math.max(12, Math.min(140, Math.abs(pt.x - cx) * 2))),
            h: Math.round(Math.max(12, Math.min(120, Math.abs(pt.y - cy) * 2))),
          };
        }
        if (drag.kind === 'circle_edge') {
          return {
            ...s,
            r: Math.round(Math.max(8, Math.min(70, Math.hypot(pt.x - cx, pt.y - cy)))),
          };
        }
        const nextVerts = s.verts.map((v, i) =>
          i === drag.index
            ? {
                x: Math.round(Math.max(-60, Math.min(60, pt.x - cx))),
                y: Math.round(Math.max(-60, Math.min(60, pt.y - cy))),
              }
            : v
        );
        return { ...s, verts: nextVerts };
      })
    );
  };

  const handleGroupSelected = () => {
    const res = groupEntities(entities, checkedIds, groupName);
    if (!res.containerId) {
      setStatusMsg('Centang minimal 2 entitas non-container untuk di-group.');
      return;
    }
    soundEngine.playSfx('ui_click');
    setEntities(res.nodes);
    setSelectedId(res.containerId);
    setCheckedIds([]);
    setStatusMsg(`Grup "${groupName}" dibuat (keep-world aktif). Geser slider Container untuk menggerakkan semua child.`);
  };

  const handleUngroupSelected = () => {
    if (!selectedNode || selectedNode.type !== 'CONTAINER') return;
    soundEngine.playSfx('ui_toggle');
    const next = ungroupContainer(entities, selectedNode.id);
    setEntities(next);
    setSelectedId(next[0]?.id ?? '');
    setStatusMsg(`Container "${selectedNode.name}" di-ungroup; posisi world semua child dipertahankan.`);
  };

  const handleSpawnEntity = () => {
    soundEngine.playSfx('ui_click');
    const idx = entities.length + 1;
    const id = `ent_${Date.now().toString(36)}`;
    const newNode: SceneEntityNode = {
      id,
      name: `Objek ${idx}`,
      type: 'Prop',
      x: 100 + ((idx * 37) % 160),
      y: 80 + ((idx * 29) % 90),
      sx: 1,
      sy: 1,
      rot: 0,
      parent: null,
      locked: false,
      hidden: false,
      preset: 'NORMAL',
    };
    const newShape: CollisionShapeSpec = {
      id: `shp_${id}`,
      entityId: id,
      type: 'Box',
      w: 36,
      h: 36,
      r: 18,
      ox: 0,
      oy: 0,
      rot: 0,
      color: '#22d3ee',
      verts: [
        { x: -18, y: -18 },
        { x: 18, y: -18 },
        { x: 18, y: 18 },
        { x: -18, y: 18 },
      ],
    };
    setEntities((prev) => [...prev, newNode]);
    setShapes((prev) => [...prev, newShape]);
    setSelectedId(id);
    setStatusMsg(`Entitas "${newNode.name}" ditambahkan ke Hierarchy & Collider.`);
  };

  const handleExportSceneJson = () => {
    const payload = JSON.stringify({ entities, shapes, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mungil-scene-physics.json';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatusMsg('Scene, Hierarchy & Physics Presets berhasil diexport ke mungil-scene-physics.json.');
  };

  const updateSelectedNode = (patch: Partial<SceneEntityNode>) => {
    if (!selectedNode) return;
    setEntities((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, ...patch } : n)));
  };

  const updateSelectedShape = (patch: Partial<CollisionShapeSpec>) => {
    if (!selectedShape) return;
    setShapes((prev) => prev.map((s) => (s.id === selectedShape.id ? { ...s, ...patch } : s)));
  };

  // Sort hierarchy so children render right below their container
  const orderedEntities = useMemo(() => {
    const out: SceneEntityNode[] = [];
    const tops = entities.filter((e) => !e.parent || !entities.some((p) => p.id === e.parent));
    for (const top of tops) {
      out.push(top);
      const children = entities.filter((c) => c.parent === top.id);
      out.push(...children);
    }
    return out;
  }, [entities]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-(--border) bg-(--surface) px-4 py-3 text-xs">
        <div>
          <span className="font-extrabold text-(--text)">Scene Hierarchy, Physics Presets &amp; Collision Shape Editor</span>
          <div className="text-[11px] text-(--muted)">{statusMsg}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportSceneJson}
            className="touch-btn inline-flex items-center gap-1.5 rounded-xl border border-(--border) bg-(--surface-2) px-3 font-bold"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Scene JSON</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEntities(DEFAULT_SCENE_ENTITIES);
              setShapes(DEFAULT_COLLISION_SHAPES);
              setSelectedId(DEFAULT_SCENE_ENTITIES[0].id);
              setCheckedIds([]);
              setStatusMsg('Scene dikembalikan ke setelan awal.');
            }}
            className="touch-btn inline-flex items-center gap-1.5 rounded-xl border border-(--border) bg-(--surface-2) px-3 font-bold"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left: HierarchyPanel & Group Entities */}
        <section className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4 lg:col-span-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-(--text)">Hierarchy &amp; Group Entities</h3>
            <button
              type="button"
              onClick={handleSpawnEntity}
              className="touch-btn inline-flex items-center gap-1 rounded-lg bg-(--accent) px-2.5 text-xs font-extrabold text-(--accent-ink)"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Spawn</span>
            </button>
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Nama Container Grup"
              className="touch-btn min-w-0 flex-1 rounded-lg border border-(--border) bg-(--surface-2) px-2.5 text-xs"
            />
            <button
              type="button"
              onClick={handleGroupSelected}
              className="touch-btn inline-flex items-center gap-1 rounded-lg border border-(--border) bg-(--surface-2) px-3 text-xs font-bold hover:border-(--accent)"
            >
              <FolderPlus className="h-3.5 w-3.5 text-(--accent)" />
              <span>Group ({checkedIds.length})</span>
            </button>
          </div>

          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {orderedEntities.map((node) => {
              const isSelected = node.id === selectedNode?.id;
              const isChild = Boolean(node.parent);
              return (
                <div
                  key={node.id}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs transition ${
                    isChild ? 'ml-4' : ''
                  } ${
                    isSelected
                      ? 'border-(--accent) bg-(--accent)/10'
                      : 'border-(--border) bg-(--surface-2)'
                  }`}
                >
                  {node.type !== 'CONTAINER' ? (
                    <input
                      type="checkbox"
                      aria-label={`Pilih ${node.name}`}
                      checked={checkedIds.includes(node.id)}
                      onChange={(e) =>
                        setCheckedIds((prev) =>
                          e.target.checked ? [...prev, node.id] : prev.filter((id) => id !== node.id)
                        )
                      }
                      className="h-4 w-4 accent-(--accent)"
                    />
                  ) : (
                    <span className="font-mono-num rounded bg-sky-500/20 px-1 text-[10px] font-bold text-sky-300">GRP</span>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedId(node.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate font-bold text-(--text)">{node.name}</div>
                    <div className="text-[10px] text-(--muted)">
                      {node.type} · {node.preset}
                    </div>
                  </button>

                  <button
                    type="button"
                    aria-label="Lock"
                    onClick={() =>
                      setEntities((prev) => prev.map((x) => (x.id === node.id ? { ...x, locked: !x.locked } : x)))
                    }
                    className="rounded-lg p-1.5 text-(--muted) hover:text-(--text)"
                  >
                    {node.locked ? <Lock className="h-3.5 w-3.5 text-amber-400" /> : <Unlock className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    aria-label="Hide"
                    onClick={() =>
                      setEntities((prev) => prev.map((x) => (x.id === node.id ? { ...x, hidden: !x.hidden } : x)))
                    }
                    className="rounded-lg p-1.5 text-(--muted) hover:text-(--text)"
                  >
                    {node.hidden ? <EyeOff className="h-3.5 w-3.5 text-rose-400" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Selected Node / Container Transform Controls */}
          {selectedNode && selectedWorld && (
            <div className="space-y-2 rounded-xl border border-(--border) bg-(--surface-2) p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={selectedNode.name}
                  disabled={selectedNode.locked}
                  onChange={(e) => updateSelectedNode({ name: e.target.value })}
                  className="w-full rounded-lg border border-(--border) bg-(--surface) px-2 py-1 font-bold text-(--text)"
                />
                {selectedNode.type === 'CONTAINER' && (
                  <button
                    type="button"
                    onClick={handleUngroupSelected}
                    className="touch-btn inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 text-[11px] font-bold text-rose-300"
                  >
                    <Ungroup className="h-3.5 w-3.5" />
                    <span>Ungroup</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <label className="block">
                  <span>Move X ({Math.round(selectedNode.x)})</span>
                  <input
                    type="range"
                    min={20}
                    max={340}
                    disabled={selectedNode.locked}
                    value={selectedNode.x}
                    onChange={(e) => updateSelectedNode({ x: Number(e.target.value) })}
                    className="w-full accent-(--accent)"
                  />
                </label>
                <label className="block">
                  <span>Move Y ({Math.round(selectedNode.y)})</span>
                  <input
                    type="range"
                    min={20}
                    max={220}
                    disabled={selectedNode.locked}
                    value={selectedNode.y}
                    onChange={(e) => updateSelectedNode({ y: Number(e.target.value) })}
                    className="w-full accent-(--accent)"
                  />
                </label>
                <label className="block">
                  <span>Scale ({selectedNode.sx.toFixed(2)}x)</span>
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.05}
                    disabled={selectedNode.locked}
                    value={selectedNode.sx}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateSelectedNode({ sx: v, sy: v });
                    }}
                    className="w-full accent-(--accent)"
                  />
                </label>
                <label className="block">
                  <span>Rotate ({Math.round(selectedNode.rot)}°)</span>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    disabled={selectedNode.locked}
                    value={selectedNode.rot}
                    onChange={(e) => updateSelectedNode({ rot: Number(e.target.value) })}
                    className="w-full accent-(--accent)"
                  />
                </label>
              </div>
              <div className="font-mono-num text-[10px] text-(--muted)">
                World = ({selectedWorld.x}, {selectedWorld.y}) · S {selectedWorld.sx}x · {selectedWorld.rot}°
              </div>
            </div>
          )}
        </section>

        {/* Center: Collision Shape Canvas & Controls */}
        <section className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4 lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-(--text)">Collision Shape Editor (360×240)</h3>
            <span
              className={`rounded-lg px-2 py-0.5 text-[11px] font-extrabold uppercase ${
                overlapResult.status === 'overlap'
                  ? 'bg-rose-500/20 text-rose-300'
                  : overlapResult.status === 'near'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {overlapResult.status === 'overlap'
                ? 'OVERLAP'
                : overlapResult.status === 'near'
                  ? 'DEKAT <8px'
                  : 'AMAN'}
            </span>
          </div>

          <canvas
            ref={canvasRef}
            width={360}
            height={240}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
            className="aspect-3/2 w-full touch-none rounded-xl border border-(--border) bg-slate-950"
          />

          {selectedShape && (
            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-3 gap-1.5">
                {(['Box', 'Circle', 'Polygon'] as const).map((shapeType) => (
                  <button
                    key={shapeType}
                    type="button"
                    onClick={() => updateSelectedShape({ type: shapeType })}
                    className={`touch-btn rounded-lg border font-bold ${
                      selectedShape.type === shapeType
                        ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                        : 'border-(--border) bg-(--surface-2)'
                    }`}
                  >
                    {shapeType}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {selectedShape.type === 'Box' && (
                  <>
                    <label>
                      <span>Width ({selectedShape.w}px)</span>
                      <input
                        type="range"
                        min={12}
                        max={120}
                        value={selectedShape.w}
                        onChange={(e) => updateSelectedShape({ w: Number(e.target.value) })}
                        className="w-full accent-(--accent)"
                      />
                    </label>
                    <label>
                      <span>Height ({selectedShape.h}px)</span>
                      <input
                        type="range"
                        min={12}
                        max={120}
                        value={selectedShape.h}
                        onChange={(e) => updateSelectedShape({ h: Number(e.target.value) })}
                        className="w-full accent-(--accent)"
                      />
                    </label>
                  </>
                )}
                {selectedShape.type === 'Circle' && (
                  <label className="col-span-2">
                    <span>Radius ({selectedShape.r}px)</span>
                    <input
                      type="range"
                      min={8}
                      max={64}
                      value={selectedShape.r}
                      onChange={(e) => updateSelectedShape({ r: Number(e.target.value) })}
                      className="w-full accent-(--accent)"
                    />
                  </label>
                )}
                <label>
                  <span>Offset X ({selectedShape.ox})</span>
                  <input
                    type="range"
                    min={-80}
                    max={80}
                    value={selectedShape.ox}
                    onChange={(e) => updateSelectedShape({ ox: Number(e.target.value) })}
                    className="w-full accent-(--accent)"
                  />
                </label>
                <label>
                  <span>Offset Y ({selectedShape.oy})</span>
                  <input
                    type="range"
                    min={-80}
                    max={80}
                    value={selectedShape.oy}
                    onChange={(e) => updateSelectedShape({ oy: Number(e.target.value) })}
                    className="w-full accent-(--accent)"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-lg border border-(--border) bg-(--surface-2) px-3 py-2">
                <span className="font-semibold">Warna Collider</span>
                <input
                  type="color"
                  aria-label="Warna Collider"
                  value={selectedShape.color}
                  onChange={(e) => updateSelectedShape({ color: e.target.value })}
                  className="h-7 w-12 cursor-pointer rounded border-0 bg-transparent"
                />
              </div>

              <div className="space-y-1 rounded-xl border border-(--border) bg-(--surface-2) p-2.5 text-[11px]">
                <div className="font-bold text-(--text)">Deteksi Overlap Real-Time:</div>
                {overlapResult.items.map((it) => (
                  <div key={it.otherShapeId} className="flex items-center justify-between">
                    <span className="text-(--muted)">{it.entityName}</span>
                    <span
                      className={`font-mono-num font-bold ${
                        it.hit ? 'text-rose-400' : it.near ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {it.hit ? `Overlap ${it.penetrationPx}px` : it.near ? 'Dekat (<8px)' : 'Aman'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right: InspectorPanel Physics Presets */}
        <section className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4 lg:col-span-4">
          <h3 className="text-sm font-extrabold text-(--text)">Inspector · 6 Physics Presets (1-Tap)</h3>
          <p className="text-[11px] text-(--muted)">
            Terapkan preset ke <strong>{selectedNode?.name ?? 'entitas'}</strong> untuk mengisi semua parameter fisika otomatis.
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
            {PRESET_ORDER.map((pid) => {
              const p = PHYSICS_PRESETS[pid];
              const isSelected = selectedNode?.preset === pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => {
                    if (!selectedNode) return;
                    soundEngine.playSfx('ui_toggle');
                    updateSelectedNode({ preset: pid });
                    if (selectedShape) {
                      updateSelectedShape({ type: p.shape });
                    }
                    setStatusMsg(`Preset ${pid} diterapkan ke ${selectedNode.name}.`);
                  }}
                  className={`touch-btn rounded-xl border px-3 py-2 text-left text-xs transition ${
                    isSelected
                      ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                      : 'border-(--border) bg-(--surface-2) text-(--text) hover:border-(--accent)'
                  }`}
                >
                  <div className="font-extrabold">{p.id}</div>
                  <div className={`text-[10px] ${isSelected ? 'opacity-85' : 'text-(--muted)'}`}>
                    m={p.mass} · e={p.restitution}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-(--border) bg-(--surface-2) p-3 text-xs">
            <div className="font-extrabold text-(--accent)">{activePreset.label} Preset</div>
            <p className="mt-0.5 text-[11px] text-(--muted)">{activePreset.note}</p>

            <table className="mt-2.5 w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-(--border) text-(--muted)">
                  <th className="py-1">Param</th>
                  <th className="py-1">Aktif</th>
                  <th className="py-1">vs NORMAL</th>
                </tr>
              </thead>
              <tbody className="font-mono-num">
                {[
                  ['mass', activePreset.mass, normalPreset.mass],
                  ['friction', activePreset.friction, normalPreset.friction],
                  ['restitution', activePreset.restitution, normalPreset.restitution],
                  ['gravityScale', activePreset.gravityScale, normalPreset.gravityScale],
                  ['linearDamp', activePreset.linearDamp, normalPreset.linearDamp],
                  ['isTrigger', String(activePreset.isTrigger), String(normalPreset.isTrigger)],
                  ['ccd', String(activePreset.ccd), String(normalPreset.ccd)],
                  ['bodyType', activePreset.bodyType, normalPreset.bodyType],
                ].map(([label, cur, base]) => (
                  <tr key={String(label)} className="border-b border-(--border)/40">
                    <td className="py-1 font-sans font-semibold text-(--text)">{label}</td>
                    <td className="py-1 font-bold text-(--accent)">{cur}</td>
                    <td className={`py-1 ${cur !== base ? 'text-amber-400' : 'text-(--muted)'}`}>{base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
