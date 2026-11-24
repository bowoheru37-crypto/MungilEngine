import { Boxes, Layers, Play, Plus, RotateCcw, Ungroup } from 'lucide-react';
import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react';

import { soundEngine } from '../engine/audio';
import {
  applyPhysicsPreset,
  createDefaultSceneEntities,
  detectEntityOverlaps,
  groupEntitiesIntoContainer,
  PHYSICS_PRESETS,
  ungroupContainer,
  updateEntityCollider,
  updateEntityPhysics,
  updateEntityTransform,
} from '../engine/sceneHierarchy';
import type {
  CollisionShapeKind,
  PerspectiveConnectorId,
  PhysicsPresetId,
  SceneEntityNode,
} from '../engine/types';

interface StudioSceneEditorTabProps {
  entities: SceneEntityNode[];
  setEntities: Dispatch<SetStateAction<SceneEntityNode[]>>;
  perspectiveConnector: PerspectiveConnectorId;
  activeLevel: 1 | 2 | 3;
  onLaunchGame: () => void;
}

export function StudioSceneEditorTab({
  entities,
  setEntities,
  perspectiveConnector,
  activeLevel,
  onLaunchGame,
}: StudioSceneEditorTabProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragModeRef = useRef<'none' | 'move' | 'resize'>('none');

  const [selectedId, setSelectedId] = useState<string>(() => entities[0]?.id ?? 'ent_bowo');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [groupNotice, setGroupNotice] = useState<string>('');

  const selected = useMemo(
    () => entities.find((e) => e.id === selectedId) ?? entities[0] ?? null,
    [entities, selectedId]
  );

  const overlaps = useMemo(() => detectEntityOverlaps(entities), [entities]);

  const overlappingIds = useMemo(() => {
    const s = new Set<string>();
    for (const o of overlaps) {
      s.add(o.aId);
      s.add(o.bId);
    }
    return s;
  }, [overlaps]);

  // Render interactive Scene + Visual Collision Shape Editor Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, w, h);

    // Connector-aware background grid (Orthographic / Isometric / Hexagonal)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    if (perspectiveConnector === 'isometric') {
      ctx.beginPath();
      for (let x = -h; x < w + h; x += 48) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x + h * 1.5, h);
        ctx.moveTo(x + h * 1.5, 0);
        ctx.lineTo(x, h);
      }
      ctx.stroke();
    } else if (perspectiveConnector === 'hexagonal') {
      const r = 24;
      const dx = r * 1.732;
      const dy = r * 1.5;
      ctx.beginPath();
      for (let row = 0; row * dy < h + r; row++) {
        for (let col = 0; col * dx < w + r; col++) {
          const cx = col * dx + (row % 2 === 1 ? dx * 0.5 : 0);
          const cy = row * dy;
          for (let k = 0; k < 6; k++) {
            const a = (Math.PI / 3) * k + Math.PI / 6;
            const px = cx + r * Math.cos(a);
            const py = cy + r * Math.sin(a);
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        }
      }
      ctx.stroke();
    } else {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += 40) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    }

    // Draw parent-child tethers for Container groups
    for (const ent of entities) {
      if (ent.kind !== 'container') continue;
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
      ctx.setLineDash([4, 4]);
      for (const cid of ent.children) {
        const child = entities.find((c) => c.id === cid);
        if (!child) continue;
        ctx.beginPath();
        ctx.moveTo(ent.x, ent.y);
        ctx.lineTo(child.x, child.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Draw entities & collision shapes
    for (const ent of entities) {
      const isSelected = ent.id === selected?.id;
      const isOverlapping = overlappingIds.has(ent.id);

      ctx.save();
      ctx.translate(ent.x, ent.y);
      ctx.rotate((ent.rotationDeg * Math.PI) / 180);

      if (ent.kind === 'container') {
        const bw = ent.collider.w * ent.scaleX;
        const bh = ent.collider.h * ent.scaleY;
        ctx.strokeStyle = isSelected ? '#c084fc' : 'rgba(168, 85, 247, 0.7)';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(-bw * 0.5, -bh * 0.5, bw, bh);
        ctx.setLineDash([]);
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Entity visual body
        ctx.fillStyle = ent.physicsPreset === 'ghost' ? 'rgba(56, 189, 248, 0.25)' : ent.color;
        ctx.globalAlpha = ent.physicsPreset === 'ghost' ? 0.55 : 0.88;
        if (ent.collider.kind === 'circle') {
          const r = ent.collider.radius * Math.max(ent.scaleX, ent.scaleY);
          ctx.beginPath();
          ctx.arc(ent.collider.offsetX * ent.scaleX, ent.collider.offsetY * ent.scaleY, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const bw = ent.collider.w * ent.scaleX;
          const bh = ent.collider.h * ent.scaleY;
          ctx.fillRect(
            ent.collider.offsetX * ent.scaleX - bw * 0.5,
            ent.collider.offsetY * ent.scaleY - bh * 0.5,
            bw,
            bh
          );
        }
        ctx.globalAlpha = 1;

        // Collision Shape outline + live overlap feedback
        ctx.strokeStyle = isOverlapping ? '#f43f5e' : isSelected ? '#4ade80' : '#94a3b8';
        ctx.lineWidth = isOverlapping || isSelected ? 2.5 : 1.25;
        if (!ent.physics.collisionEnabled) ctx.setLineDash([4, 3]);

        if (ent.collider.kind === 'circle') {
          const r = ent.collider.radius * Math.max(ent.scaleX, ent.scaleY);
          const ox = ent.collider.offsetX * ent.scaleX;
          const oy = ent.collider.offsetY * ent.scaleY;
          ctx.beginPath();
          ctx.arc(ox, oy, r, 0, Math.PI * 2);
          ctx.stroke();
          if (isSelected) {
            ctx.fillStyle = '#fde047';
            ctx.fillRect(ox + r - 5, oy - 5, 10, 10);
          }
        } else {
          const bw = ent.collider.w * ent.scaleX;
          const bh = ent.collider.h * ent.scaleY;
          const ox = ent.collider.offsetX * ent.scaleX;
          const oy = ent.collider.offsetY * ent.scaleY;
          ctx.strokeRect(ox - bw * 0.5, oy - bh * 0.5, bw, bh);
          if (isSelected) {
            ctx.fillStyle = '#fde047';
            ctx.fillRect(ox + bw * 0.5 - 5, oy + bh * 0.5 - 5, 10, 10);
          }
        }
        ctx.setLineDash([]);
      }

      ctx.restore();

      // Label above entity (or below bounding box for containers to avoid overlapping child labels)
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = isOverlapping ? '#fda4af' : isSelected ? '#86efac' : '#cbd5e1';
      const labelY =
        ent.kind === 'container'
          ? Math.min(h - 8, ent.y + (ent.collider.h * ent.scaleY) * 0.5 + 14)
          : Math.max(14, ent.y - 26);
      ctx.fillText(ent.name, ent.x, labelY);
    }
  }, [entities, overlappingIds, perspectiveConnector, selected]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    e.currentTarget.setPointerCapture(e.pointerId);

    // Check resize handle on selected non-container entity first
    if (selected && selected.kind !== 'container') {
      const ox = selected.x + selected.collider.offsetX * selected.scaleX;
      const oy = selected.y + selected.collider.offsetY * selected.scaleY;
      const hx =
        selected.collider.kind === 'circle'
          ? ox + selected.collider.radius * Math.max(selected.scaleX, selected.scaleY)
          : ox + (selected.collider.w * selected.scaleX) * 0.5;
      const hy =
        selected.collider.kind === 'circle'
          ? oy
          : oy + (selected.collider.h * selected.scaleY) * 0.5;
      if (Math.hypot(pt.x - hx, pt.y - hy) <= 18) {
        dragModeRef.current = 'resize';
        return;
      }
    }

    // Hit test any entity to select + move
    const hit = [...entities].reverse().find((ent) => {
      const r = ent.collider.kind === 'circle' ? ent.collider.radius : Math.max(ent.collider.w, ent.collider.h) * 0.55;
      return Math.hypot(pt.x - ent.x, pt.y - ent.y) <= Math.max(22, r);
    });

    if (hit) {
      setSelectedId(hit.id);
      dragModeRef.current = 'move';
    } else {
      dragModeRef.current = 'none';
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragModeRef.current === 'none' || !selected) return;
    const pt = getCanvasPoint(e);
    if (dragModeRef.current === 'move') {
      setEntities(updateEntityTransform(entities, selected.id, { x: pt.x, y: pt.y }));
    } else if (dragModeRef.current === 'resize' && selected.kind !== 'container') {
      if (selected.collider.kind === 'circle') {
        const nextR = Math.max(10, Math.round(Math.hypot(pt.x - selected.x, pt.y - selected.y)));
        setEntities(updateEntityCollider(entities, selected.id, { radius: nextR }));
      } else {
        const nextW = Math.max(14, Math.round(Math.abs(pt.x - selected.x) * 2));
        const nextH = Math.max(14, Math.round(Math.abs(pt.y - selected.y) * 2));
        setEntities(updateEntityCollider(entities, selected.id, { w: nextW, h: nextH }));
      }
    }
  };

  const handleCanvasPointerUp = () => {
    dragModeRef.current = 'none';
  };

  const toggleChecked = (id: string) => {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleGroupSelected = () => {
    soundEngine.playSfx('ui_click');
    const res = groupEntitiesIntoContainer(entities, checkedIds);
    if (!res.containerId) {
      setGroupNotice('Select at least 2 non-container entities to group.');
      return;
    }
    setEntities(res.entities);
    setSelectedId(res.containerId);
    setCheckedIds([]);
    setGroupNotice('Grouped into parent Container! Move/scale/rotate transforms all children.');
  };

  const handleAddEntity = () => {
    soundEngine.playSfx('ui_click');
    const idx = entities.length + 1;
    const newId = `ent_custom_${idx}`;
    const node: SceneEntityNode = {
      id: newId,
      name: `Prop Box #${idx}`,
      kind: 'obstacle',
      parentId: null,
      children: [],
      x: 190 + ((idx * 35) % 180),
      y: 160 + ((idx * 25) % 90),
      scaleX: 1,
      scaleY: 1,
      rotationDeg: 0,
      color: '#38bdf8',
      physicsPreset: 'bouncy',
      physics: { ...PHYSICS_PRESETS.bouncy.config },
      collider: { kind: 'box', w: 42, h: 42, radius: 22, offsetX: 0, offsetY: 0 },
    };
    setEntities([...entities, node]);
    setSelectedId(newId);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-12">
        {/* HIERARCHY PANEL */}
        <section
          aria-label="HierarchyPanel"
          className="rounded-xl border border-(--border) bg-(--surface) p-3.5 text-xs lg:col-span-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-(--accent)" />
              <h3 className="text-sm font-extrabold text-(--text)">HierarchyPanel</h3>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Add Entity"
                onClick={handleAddEntity}
                className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-2 font-bold text-(--text)"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Reset Scene"
                onClick={() => {
                  const reset = createDefaultSceneEntities(activeLevel);
                  setEntities(reset);
                  setSelectedId(reset[0]?.id ?? 'ent_bowo');
                  setCheckedIds([]);
                }}
                className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-2 font-bold text-(--text)"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={handleGroupSelected}
              className="touch-btn inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-(--accent) px-3 text-xs font-extrabold text-(--accent-ink)"
            >
              <Boxes className="h-3.5 w-3.5" />
              <span>Group Entities ({checkedIds.length})</span>
            </button>
            {selected?.kind === 'container' && (
              <button
                type="button"
                onClick={() => {
                  setEntities(ungroupContainer(entities, selected.id));
                  setGroupNotice('Container ungrouped.');
                }}
                className="touch-btn inline-flex items-center gap-1 rounded-xl border border-(--border) bg-(--surface-2) px-2.5 font-bold"
              >
                <Ungroup className="h-3.5 w-3.5" />
                <span>Ungroup</span>
              </button>
            )}
          </div>

          {groupNotice && <div className="mt-2 text-[11px] font-semibold text-(--accent)">{groupNotice}</div>}

          <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-0.5">
            {entities.map((ent) => {
              const isSelected = ent.id === selected?.id;
              const isChild = ent.parentId !== null;
              const isOver = overlappingIds.has(ent.id);
              return (
                <div
                  key={ent.id}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 ${
                    isChild ? 'ml-4 ' : ''
                  }${
                    isSelected
                      ? 'border-(--accent) bg-(--accent)/15'
                      : 'border-(--border) bg-(--surface-2)'
                  }`}
                >
                  {ent.kind !== 'container' && (
                    <input
                      type="checkbox"
                      aria-label={`Select ${ent.name} for grouping`}
                      checked={checkedIds.includes(ent.id)}
                      onChange={() => toggleChecked(ent.id)}
                      className="h-4 w-4 shrink-0 accent-(--accent)"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedId(ent.id)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-1.5 text-left"
                  >
                    <span className="truncate font-bold text-(--text)">
                      {ent.kind === 'container' ? `[Container] ${ent.name}` : ent.name}
                    </span>
                    <span className={`font-mono-num shrink-0 text-[10px] font-bold uppercase ${isOver ? 'text-rose-400' : 'text-(--muted)'}`}>
                      {ent.kind === 'container' ? `${ent.children.length} ch` : ent.physicsPreset}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* INTERACTIVE VISUAL COLLISION CANVAS */}
        <section className="rounded-xl border border-(--border) bg-(--surface) p-3.5 text-xs lg:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-(--text)">Collision Shape &amp; Scene Canvas</h3>
              <p className="text-[11px] text-(--muted)">
                Drag entity to move · Drag yellow handle to resize collider · Grid: {perspectiveConnector}
              </p>
            </div>
            <button
              type="button"
              onClick={onLaunchGame}
              className="touch-btn inline-flex items-center gap-1 rounded-xl bg-(--accent) px-3 font-extrabold text-(--accent-ink)"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Play</span>
            </button>
          </div>

          <canvas
            ref={canvasRef}
            width={560}
            height={320}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            className="mt-2.5 w-full cursor-move rounded-xl border border-(--border) touch-none"
          />

          {/* Real-time Overlap Feedback Bar */}
          <div
            data-testid="overlap-feedback"
            className={`mt-2.5 rounded-xl border px-3 py-2 text-xs font-semibold ${
              overlaps.length > 0
                ? 'border-rose-500/50 bg-rose-500/10 text-rose-200'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
            }`}
          >
            {overlaps.length === 0
              ? 'No collision overlap detected across active physics entities.'
              : `Overlap (${overlaps.length}): ` +
                overlaps.map((o) => `${o.aName} <-> ${o.bName} (${o.depth}px${o.isTriggerOverlap ? ' trigger' : ''})`).join(' · ')}
          </div>
        </section>

        {/* INSPECTOR PANEL */}
        <section
          aria-label="InspectorPanel"
          className="rounded-xl border border-(--border) bg-(--surface) p-3.5 text-xs lg:col-span-4"
        >
          <h3 className="text-sm font-extrabold text-(--text)">InspectorPanel</h3>
          {selected ? (
            <div className="mt-2.5 space-y-3">
              <div className="rounded-xl border border-(--border) bg-(--surface-2) p-2.5">
                <div className="flex items-center justify-between font-bold text-(--text)">
                  <span>{selected.name}</span>
                  <span className="font-mono-num text-[11px] uppercase text-(--accent)">{selected.kind}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-(--muted)">
                    X: <span className="font-mono-num font-bold text-(--text)">{selected.x}</span>
                    <input
                      type="range"
                      min={20}
                      max={540}
                      value={selected.x}
                      onChange={(e) => setEntities(updateEntityTransform(entities, selected.id, { x: Number(e.target.value) }))}
                      className="mt-1 w-full accent-(--accent)"
                    />
                  </label>
                  <label className="text-[11px] text-(--muted)">
                    Y: <span className="font-mono-num font-bold text-(--text)">{selected.y}</span>
                    <input
                      type="range"
                      min={20}
                      max={300}
                      value={selected.y}
                      onChange={(e) => setEntities(updateEntityTransform(entities, selected.id, { y: Number(e.target.value) }))}
                      className="mt-1 w-full accent-(--accent)"
                    />
                  </label>
                  <label className="text-[11px] text-(--muted)">
                    Scale: <span className="font-mono-num font-bold text-(--text)">{selected.scaleX}x</span>
                    <input
                      type="range"
                      min={0.5}
                      max={2.2}
                      step={0.05}
                      value={selected.scaleX}
                      onChange={(e) => {
                        const s = Number(e.target.value);
                        setEntities(updateEntityTransform(entities, selected.id, { scaleX: s, scaleY: s }));
                      }}
                      className="mt-1 w-full accent-(--accent)"
                    />
                  </label>
                  <label className="text-[11px] text-(--muted)">
                    Rot: <span className="font-mono-num font-bold text-(--text)">{selected.rotationDeg}°</span>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={5}
                      value={selected.rotationDeg}
                      onChange={(e) => setEntities(updateEntityTransform(entities, selected.id, { rotationDeg: Number(e.target.value) }))}
                      className="mt-1 w-full accent-(--accent)"
                    />
                  </label>
                </div>
              </div>

              {/* PHYSICS PRESETS SECTION */}
              <div className="rounded-xl border border-(--border) bg-(--surface-2) p-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-extrabold text-(--text)">Physics Presets</span>
                  <span className="font-mono-num text-[10px] font-bold uppercase text-(--accent)">
                    {PHYSICS_PRESETS[selected.physicsPreset].label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(PHYSICS_PRESETS) as PhysicsPresetId[]).map((pid) => (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => {
                        soundEngine.playSfx('ui_toggle');
                        const targetId = selected.id;
                        setEntities((prev) => applyPhysicsPreset(prev, targetId, pid));
                      }}
                      className={`touch-btn rounded-lg border px-2 text-[11px] font-bold ${
                        selected.physicsPreset === pid
                          ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                          : 'border-(--border) bg-(--surface) text-(--text)'
                      }`}
                    >
                      {PHYSICS_PRESETS[pid].label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px] text-(--muted)">
                  <div>Rest: <span className="font-mono-num font-bold text-(--text)">{selected.physics.restitution}</span></div>
                  <div>Fric: <span className="font-mono-num font-bold text-(--text)">{selected.physics.friction}</span></div>
                  <div>Grav: <span className="font-mono-num font-bold text-(--text)">{selected.physics.gravityScale}x</span></div>
                </div>
                <div className="mt-2 flex gap-2">
                  <label className="flex flex-1 cursor-pointer items-center justify-between rounded-lg border border-(--border) bg-(--surface) px-2 py-1 text-[11px]">
                    <span>Collision</span>
                    <input
                      type="checkbox"
                      checked={selected.physics.collisionEnabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const targetId = selected.id;
                        setEntities((prev) => updateEntityPhysics(prev, targetId, { collisionEnabled: checked }));
                      }}
                      className="h-4 w-4 accent-(--accent)"
                    />
                  </label>
                  <label className="flex flex-1 cursor-pointer items-center justify-between rounded-lg border border-(--border) bg-(--surface) px-2 py-1 text-[11px]">
                    <span>Trigger</span>
                    <input
                      type="checkbox"
                      checked={selected.physics.isTrigger}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const targetId = selected.id;
                        setEntities((prev) => updateEntityPhysics(prev, targetId, { isTrigger: checked }));
                      }}
                      className="h-4 w-4 accent-(--accent)"
                    />
                  </label>
                </div>
              </div>

              {/* COLLISION SHAPE EDITOR */}
              {selected.kind !== 'container' && (
                <div className="rounded-xl border border-(--border) bg-(--surface-2) p-2.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-extrabold text-(--text)">Collision Shape Editor</span>
                    <div className="flex gap-1">
                      {(['box', 'circle'] as CollisionShapeKind[]).map((shape) => (
                        <button
                          key={shape}
                          type="button"
                          onClick={() => {
                            const targetId = selected.id;
                            setEntities((prev) => updateEntityCollider(prev, targetId, { kind: shape }));
                          }}
                          className={`touch-btn rounded-lg border px-2.5 text-[11px] font-bold uppercase ${
                            selected.collider.kind === shape
                              ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                              : 'border-(--border) bg-(--surface) text-(--text)'
                          }`}
                        >
                          {shape}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selected.collider.kind === 'box' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[11px] text-(--muted)">
                        Box W: <span className="font-mono-num font-bold text-(--text)">{selected.collider.w}px</span>
                        <input
                          type="range"
                          min={12}
                          max={200}
                          value={selected.collider.w}
                          onChange={(e) => setEntities(updateEntityCollider(entities, selected.id, { w: Number(e.target.value) }))}
                          className="mt-1 w-full accent-(--accent)"
                        />
                      </label>
                      <label className="text-[11px] text-(--muted)">
                        Box H: <span className="font-mono-num font-bold text-(--text)">{selected.collider.h}px</span>
                        <input
                          type="range"
                          min={12}
                          max={160}
                          value={selected.collider.h}
                          onChange={(e) => setEntities(updateEntityCollider(entities, selected.id, { h: Number(e.target.value) }))}
                          className="mt-1 w-full accent-(--accent)"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="block text-[11px] text-(--muted)">
                      Circle Radius: <span className="font-mono-num font-bold text-(--text)">{selected.collider.radius}px</span>
                      <input
                        type="range"
                        min={8}
                        max={100}
                        value={selected.collider.radius}
                        onChange={(e) => setEntities(updateEntityCollider(entities, selected.id, { radius: Number(e.target.value) }))}
                        className="mt-1 w-full accent-(--accent)"
                      />
                    </label>
                  )}

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-[11px] text-(--muted)">
                      Offset X: <span className="font-mono-num font-bold text-(--text)">{selected.collider.offsetX}</span>
                      <input
                        type="range"
                        min={-48}
                        max={48}
                        value={selected.collider.offsetX}
                        onChange={(e) => setEntities(updateEntityCollider(entities, selected.id, { offsetX: Number(e.target.value) }))}
                        className="mt-1 w-full accent-(--accent)"
                      />
                    </label>
                    <label className="text-[11px] text-(--muted)">
                      Offset Y: <span className="font-mono-num font-bold text-(--text)">{selected.collider.offsetY}</span>
                      <input
                        type="range"
                        min={-48}
                        max={48}
                        value={selected.collider.offsetY}
                        onChange={(e) => setEntities(updateEntityCollider(entities, selected.id, { offsetY: Number(e.target.value) }))}
                        className="mt-1 w-full accent-(--accent)"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 text-(--muted)">Select an entity from the HierarchyPanel.</div>
          )}
        </section>
      </div>
    </div>
  );
}
