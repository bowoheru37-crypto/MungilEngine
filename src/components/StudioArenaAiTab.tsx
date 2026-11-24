import { Cpu, Heart, RotateCcw, Shield, Swords, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { soundEngine } from '../engine/audio';
import {
  createArenaWorld,
  stepArenaWorld,
  triggerArenaPlayerAction,
  type ArenaWorld,
} from '../engine/scenePhysics';
import type {
  ArenaCoachDirective,
  ArenaCompanionOrder,
  ArenaDifficulty,
  ArenaMode,
  WizardGameSpec,
} from '../engine/types';

interface StudioArenaAiTabProps {
  activeSpec: WizardGameSpec | null;
  forcedMode?: ArenaMode;
}

export function StudioArenaAiTab({ activeSpec, forcedMode }: StudioArenaAiTabProps) {
  const initialMode: ArenaMode =
    forcedMode ??
    (activeSpec?.aiMode === 'Sendiri' ? 'solo' : activeSpec?.aiMode === 'Lawan' ? 'vs' : 'coplay');

  const [mode, setMode] = useState<ArenaMode>(initialMode);
  const [coachDirective, setCoachDirective] = useState<ArenaCoachDirective>('Seimbang');
  const [companionOrder, setCompanionOrder] = useState<ArenaCompanionOrder>('Ikut');
  const [speedMul, setSpeedMul] = useState<1 | 2>(1);
  const [showPath, setShowPath] = useState(true);
  const [difficulty, setDifficulty] = useState<ArenaDifficulty>(activeSpec?.difficulty ?? 'Normal');
  const [autoDifficulty, setAutoDifficulty] = useState(true);

  const arenaRef = useRef<ArenaWorld>(createArenaWorld(initialMode, activeSpec));
  const inputRef = useRef({ moveX: 0, moveY: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [snap, setSnap] = useState(() => ({
    playerHp: arenaRef.current.player.hp,
    playerMaxHp: arenaRef.current.player.maxHp,
    playerFsm: arenaRef.current.player.fsm,
    compHp: arenaRef.current.companion.hp,
    revives: arenaRef.current.companionReviveLeft,
    enemies: arenaRef.current.enemies.map((e) => ({ ...e })),
    score: arenaRef.current.score,
    status: arenaRef.current.status,
    aiThinkText: arenaRef.current.aiThinkText,
    adaptiveRule: arenaRef.current.adaptiveRule,
    lastMoves: [...arenaRef.current.lastPlayerMoves],
    logText: arenaRef.current.logText,
    difficulty: arenaRef.current.difficulty,
  }));

  const resetArena = (nextMode: ArenaMode) => {
    const next = createArenaWorld(nextMode, activeSpec);
    next.difficulty = difficulty;
    next.autoDifficulty = autoDifficulty;
    arenaRef.current = next;
    setMode(nextMode);
  };

  // Sync when launched from Wizard or MCP tool
  useEffect(() => {
    const targetMode: ArenaMode =
      forcedMode ??
      (activeSpec?.aiMode === 'Sendiri' ? 'solo' : activeSpec?.aiMode === 'Lawan' ? 'vs' : 'coplay');
    arenaRef.current = createArenaWorld(targetMode, activeSpec);
    setMode(targetMode);
    if (activeSpec) setDifficulty(activeSpec.difficulty);
  }, [activeSpec, forcedMode]);

  useEffect(() => {
    arenaRef.current.difficulty = difficulty;
    arenaRef.current.autoDifficulty = autoDifficulty;
  }, [autoDifficulty, difficulty]);

  // Keyboard support (WASD / Arrows + J/K/H)
  useEffect(() => {
    const keys = new Set<string>();
    const syncKeys = () => {
      let mx = 0;
      let my = 0;
      if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
      if (keys.has('d') || keys.has('arrowright')) mx += 1;
      if (keys.has('w') || keys.has('arrowup')) my -= 1;
      if (keys.has('s') || keys.has('arrowdown')) my += 1;
      inputRef.current = { moveX: mx, moveY: my };
    };

    const onDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
      const k = e.key.toLowerCase();
      keys.add(k);
      syncKeys();
      if (k === 'j') {
        if (triggerArenaPlayerAction(arenaRef.current, 'attack')) soundEngine.playSfx('attack');
      } else if (k === 'k') {
        if (triggerArenaPlayerAction(arenaRef.current, 'dash')) soundEngine.playSfx('dash');
      } else if (k === 'h') {
        if (triggerArenaPlayerAction(arenaRef.current, 'heal')) soundEngine.playSfx('coin');
      }
    };

    const onUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
      syncKeys();
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Main Arena Simulation + Render Loop (30Hz Eco-friendly step)
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let hudTimer = 0;

    const loop = (now: number) => {
      raf = window.requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) * 0.001);
      last = now;

      const world = arenaRef.current;
      stepArenaWorld(world, dt, inputRef.current, {
        coachDirective,
        companionOrder,
        speedMul,
      });

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.fillStyle = world.hitFlashTimer > 0 ? '#1b1128' : '#090f1d';
          ctx.fillRect(0, 0, w, h);

          // Arena ring border
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.lineWidth = 2;
          ctx.strokeRect(14, 14, w - 28, h - 28);

          // Optional AI path line
          if (showPath && world.aiPath.length >= 2) {
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(world.aiPath[0].x, world.aiPath[0].y);
            ctx.lineTo(world.aiPath[1].x, world.aiPath[1].y);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Items
          for (const item of world.items) {
            if (item.collected) continue;
            ctx.fillStyle = item.kind === 'potion' ? '#34d399' : '#fbbf24';
            ctx.beginPath();
            ctx.arc(item.x, item.y, 7, 0, Math.PI * 2);
            ctx.fill();
          }

          // Enemies
          for (const e of world.enemies) {
            if (e.dead) continue;
            const r = e.isBoss ? 18 : 12;
            ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : e.isBoss ? '#a855f7' : '#f43f5e';
            ctx.beginPath();
            ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
            ctx.fill();

            if (e.telegraph > 0) {
              ctx.strokeStyle = '#fbbf24';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(e.x, e.y, r + 6, 0, Math.PI * 2);
              ctx.stroke();
            }

            // Enemy HP bar
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(e.x - 16, e.y - r - 8, 32, 4);
            ctx.fillStyle = '#f43f5e';
            ctx.fillRect(e.x - 16, e.y - r - 8, 32 * (e.hp / e.maxHp), 4);
          }

          // Co-Play Companion Qolbu
          if (world.mode === 'coplay') {
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(world.companion.x, world.companion.y, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#d1fae5';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText('Qolbu', world.companion.x - 14, world.companion.y - 14);
          }

          // Player Bowo
          ctx.fillStyle = world.player.invuln > 0 ? '#bae6fd' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(world.player.x, world.player.y, 13, 0, Math.PI * 2);
          ctx.fill();
          if (world.player.attackCd > 0.2) {
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(world.player.x, world.player.y, 30, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText(world.player.name, world.player.x - 14, world.player.y - 16);
        }
      }

      hudTimer += dt;
      if (hudTimer >= 0.08) {
        hudTimer = 0;
        setSnap({
          playerHp: world.player.hp,
          playerMaxHp: world.player.maxHp,
          playerFsm: world.player.fsm,
          compHp: world.companion.hp,
          revives: world.companionReviveLeft,
          enemies: world.enemies.map((e) => ({ ...e })),
          score: world.score,
          status: world.status,
          aiThinkText: world.aiThinkText,
          adaptiveRule: world.adaptiveRule,
          lastMoves: [...world.lastPlayerMoves],
          logText: world.logText,
          difficulty: world.difficulty,
        });
      }
    };

    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [coachDirective, companionOrder, showPath, speedMul]);

  const setMove = (mx: number, my: number) => {
    inputRef.current = { moveX: mx, moveY: my };
  };

  return (
    <div className="space-y-4">
      {/* Mode Bar */}
      <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-(--border) bg-(--surface) p-3.5 text-xs">
        <div>
          <div className="font-extrabold text-(--text)">
            Qolbu Arena AI {activeSpec ? `· ${activeSpec.name}` : ''}
          </div>
          <div className="text-[11px] text-(--muted)">
            15Hz AI Tick · IsValidMove Guard · Solo Utility AI / Co-Play Companion / Boss Kala Adaptif
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['solo', '1. AI Main Sendiri'],
              ['coplay', '2. Main Bareng Qolbu'],
              ['vs', '3. Lawan Boss Kala'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_tab');
                resetArena(id);
              }}
              className={`touch-btn rounded-xl px-3 font-bold ${
                mode === id
                  ? 'bg-(--accent) text-(--accent-ink)'
                  : 'border border-(--border) bg-(--surface-2) text-(--text)'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => resetArena(mode)}
            className="touch-btn inline-flex items-center gap-1 rounded-xl border border-(--border) bg-(--surface-2) px-3 font-bold"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Arena Stage + Touch Controls */}
        <section className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="font-mono-num font-bold text-(--text)">
              HP: {snap.playerHp}/{snap.playerMaxHp} · Skor: {snap.score} · Status:{' '}
              <span
                className={
                  snap.status === 'victory'
                    ? 'text-emerald-400'
                    : snap.status === 'gameover'
                      ? 'text-rose-400'
                      : 'text-(--accent)'
                }
              >
                {snap.status.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSpeedMul((s) => (s === 1 ? 2 : 1))}
                className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-2.5 text-xs font-bold"
              >
                Speed {speedMul}x
              </button>
              <button
                type="button"
                onClick={() => setShowPath((v) => !v)}
                className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-2.5 text-xs font-bold"
              >
                Path: {showPath ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={360}
            height={240}
            className="aspect-3/2 w-full rounded-xl border border-(--border) bg-slate-950"
          />

          {/* Touch Controls (>=44px .touch-btn) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid grid-cols-3 gap-1.5">
              <div />
              <button
                type="button"
                onPointerDown={() => setMove(0, -1)}
                onPointerUp={() => setMove(0, 0)}
                onPointerLeave={() => setMove(0, 0)}
                className="touch-btn w-12 rounded-xl border border-(--border) bg-(--surface-2) text-xs font-extrabold"
              >
                ↑
              </button>
              <div />
              <button
                type="button"
                onPointerDown={() => setMove(-1, 0)}
                onPointerUp={() => setMove(0, 0)}
                onPointerLeave={() => setMove(0, 0)}
                className="touch-btn w-12 rounded-xl border border-(--border) bg-(--surface-2) text-xs font-extrabold"
              >
                ←
              </button>
              <button
                type="button"
                onPointerDown={() => setMove(0, 1)}
                onPointerUp={() => setMove(0, 0)}
                onPointerLeave={() => setMove(0, 0)}
                className="touch-btn w-12 rounded-xl border border-(--border) bg-(--surface-2) text-xs font-extrabold"
              >
                ↓
              </button>
              <button
                type="button"
                onPointerDown={() => setMove(1, 0)}
                onPointerUp={() => setMove(0, 0)}
                onPointerLeave={() => setMove(0, 0)}
                className="touch-btn w-12 rounded-xl border border-(--border) bg-(--surface-2) text-xs font-extrabold"
              >
                →
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (triggerArenaPlayerAction(arenaRef.current, 'attack')) soundEngine.playSfx('attack');
                }}
                className="touch-btn inline-flex items-center gap-1.5 rounded-xl bg-(--accent) px-4 text-xs font-extrabold text-(--accent-ink)"
              >
                <Swords className="h-4 w-4" />
                <span>Serang (J)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (triggerArenaPlayerAction(arenaRef.current, 'dash')) soundEngine.playSfx('dash');
                }}
                className="touch-btn inline-flex items-center gap-1.5 rounded-xl border border-(--border) bg-(--surface-2) px-3.5 text-xs font-bold"
              >
                <Zap className="h-4 w-4 text-sky-400" />
                <span>Dash (K)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (triggerArenaPlayerAction(arenaRef.current, 'heal')) soundEngine.playSfx('coin');
                }}
                className="touch-btn inline-flex items-center gap-1.5 rounded-xl border border-(--border) bg-(--surface-2) px-3.5 text-xs font-bold"
              >
                <Heart className="h-4 w-4 text-emerald-400" />
                <span>Heal (H)</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-(--surface-2) px-3 py-2 text-xs font-medium text-(--text)">{snap.logText}</div>
        </section>

        {/* Right: Mode Controls + Otak AI Readout */}
        <section className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4 lg:col-span-5">
          {mode === 'solo' && (
            <div className="space-y-2 rounded-xl border border-(--border) bg-(--surface-2) p-3 text-xs">
              <div className="font-extrabold text-(--text)">Coach Directives (AI Main Sendiri)</div>
              <div className="grid grid-cols-2 gap-1.5">
                {(['Agresif', 'Seimbang', 'Bertahan', 'Farming'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCoachDirective(d)}
                    className={`touch-btn rounded-lg border font-bold ${
                      coachDirective === d
                        ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                        : 'border-(--border) bg-(--surface)'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'coplay' && (
            <div className="space-y-2 rounded-xl border border-(--border) bg-(--surface-2) p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-(--text)">Perintah Companion Qolbu</span>
                <span className="font-mono-num text-[11px] text-emerald-400">Revive: {snap.revives}x</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Ikut', 'Serang', 'Bertahan', 'Ambil Item', 'Heal'] as const).map((ord) => (
                  <button
                    key={ord}
                    type="button"
                    onClick={() => setCompanionOrder(ord)}
                    className={`touch-btn rounded-lg border px-2 font-bold ${
                      companionOrder === ord
                        ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                        : 'border-(--border) bg-(--surface)'
                    }`}
                  >
                    {ord}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'vs' && (
            <div className="space-y-2 rounded-xl border border-(--border) bg-(--surface-2) p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-(--text)">Kesulitan Boss Kala Adaptif</span>
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-bold">
                  <input
                    type="checkbox"
                    checked={autoDifficulty}
                    onChange={(e) => setAutoDifficulty(e.target.checked)}
                    className="h-4 w-4 accent-(--accent)"
                  />
                  <span>Auto</span>
                </label>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Easy', 'Normal', 'Hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`touch-btn rounded-lg border font-bold ${
                      snap.difficulty === diff
                        ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                        : 'border-(--border) bg-(--surface)'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Real-Time Otak AI Panel */}
          <div className="space-y-2 rounded-xl border border-(--border) bg-(--surface-2) p-3 text-xs">
            <div className="flex items-center gap-1.5 font-extrabold text-(--accent)">
              <Cpu className="h-4 w-4" />
              <span>Otak AI Real-Time (Sense -&gt; Think -&gt; Act)</span>
            </div>
            <div className="rounded-lg bg-slate-950 p-2.5 text-[11px] text-emerald-300">
              <div>FSM Player: <strong className="uppercase">{snap.playerFsm}</strong> · AI Rate: <strong>15Hz</strong></div>
              <div className="mt-1">Decision: {snap.aiThinkText}</div>
              <div className="mt-1 text-amber-300">Adaptif: {snap.adaptiveRule}</div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-(--muted)">10 Gerak Terakhir Pemain:</div>
              <div className="font-mono-num mt-1 flex flex-wrap gap-1">
                {snap.lastMoves.length === 0 ? (
                  <span className="text-[11px] text-(--muted)">Belum ada aksi</span>
                ) : (
                  snap.lastMoves.map((mv, idx) => (
                    <span key={idx} className="rounded bg-(--surface) px-1.5 py-0.5 text-[10px] font-bold">
                      {mv}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-bold text-(--muted)">
                <Shield className="h-3.5 w-3.5" />
                <span>Status Lawan ({snap.enemies.filter((e) => !e.dead).length} aktif):</span>
              </div>
              {snap.enemies.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-[11px]">
                  <span>{e.name} {e.isBoss ? `(F${e.phase})` : ''}</span>
                  <span className="font-mono-num font-bold">
                    {e.dead ? 'KO' : `${e.hp}/${e.maxHp}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
