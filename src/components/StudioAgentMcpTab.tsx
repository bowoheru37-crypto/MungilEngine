import { Bot, CheckCircle2, Compass, Copy, Download, Play, PlusCircle, Send, Sparkles, Terminal, Trash2, Wand2 } from 'lucide-react';
import { useState } from 'react';

import { soundEngine } from '../engine/audio';
import {
  askQolbuAgent,
  buildWizardGameSpec,
  LOCAL_MCP_TOOLS,
  MCP_CONFIG_JSON,
  QOLBU_ENGINE_TOPICS,
  TUTORIAL_STEPS,
} from '../engine/qolbuAgent';
import type { HudSnapshot, PhysicsPresetId, StudioTab, WizardGameSpec } from '../engine/types';

interface StudioAgentMcpTabProps {
  hud: HudSnapshot;
  myGames: WizardGameSpec[];
  setMyGames: (updater: WizardGameSpec[] | ((prev: WizardGameSpec[]) => WizardGameSpec[])) => void;
  mcpLogs: string[];
  onExecuteMcpTool: (toolId: string) => void;
  onNavigateTab: (tab: StudioTab) => void;
  onPlayWizardGame: (game: WizardGameSpec) => void;
}

type AgentSubTab = 'guide' | 'explain' | 'wizard';

export function StudioAgentMcpTab({
  hud,
  myGames,
  setMyGames,
  mcpLogs,
  onExecuteMcpTool,
  onNavigateTab,
  onPlayWizardGame,
}: StudioAgentMcpTabProps) {
  const [subTab, setSubTab] = useState<AgentSubTab>('guide');
  const [completedSteps, setCompletedSteps] = useState<number[]>([1]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>(QOLBU_ENGINE_TOPICS[0].id);

  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ from: 'user' | 'qolbu'; text: string; tab?: StudioTab }>>([
    {
      from: 'qolbu',
      text: 'Halo! Aku Qolbu AI. Aku bisa memandu bermain, menjelaskan cara kerja engine, atau membantumu merakit game baru offline.',
    },
  ]);

  // 5-Step Game Creation Wizard state
  const [wizStep, setWizStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [wizName, setWizName] = useState('Pendekar Lentera');
  const [wizGenre, setWizGenre] = useState<WizardGameSpec['genre']>('Arena');
  const [wizSprite, setWizSprite] = useState('Bowo Guardian');
  const [wizCharName, setWizCharName] = useState('Bowo');
  const [wizPreset, setWizPreset] = useState<PhysicsPresetId>('NORMAL');
  const [wizMap, setWizMap] = useState<WizardGameSpec['map']>('Arena Qolbu');
  const [wizEnemies, setWizEnemies] = useState(3);
  const [wizItems, setWizItems] = useState(3);
  const [wizAiMode, setWizAiMode] = useState<WizardGameSpec['aiMode']>('Bareng');
  const [wizDifficulty, setWizDifficulty] = useState<WizardGameSpec['difficulty']>('Normal');
  const [wizDuration, setWizDuration] = useState(90);

  const [copiedConfig, setCopiedConfig] = useState(false);

  const activeTopic = QOLBU_ENGINE_TOPICS.find((x) => x.id === selectedTopicId) ?? QOLBU_ENGINE_TOPICS[0];

  const handleAskChat = () => {
    const q = chatInput.trim();
    if (!q) return;
    soundEngine.playSfx('ui_click');
    const reply = askQolbuAgent(q);
    setChatHistory((prev) => [
      ...prev,
      { from: 'user', text: q },
      { from: 'qolbu', text: reply.answer, tab: reply.recommendedTab },
    ]);
    setChatInput('');
  };

  const handleCreateWizardGame = (playImmediately: boolean) => {
    const spec = buildWizardGameSpec({
      name: wizName,
      genre: wizGenre,
      sprite: wizSprite,
      characterName: wizCharName,
      preset: wizPreset,
      map: wizMap,
      enemies: wizEnemies,
      items: wizItems,
      aiMode: wizAiMode,
      difficulty: wizDifficulty,
      durationSec: wizDuration,
    });
    soundEngine.playSfx('ui_click');
    setMyGames((prev) => [spec, ...prev]);
    if (playImmediately) {
      onPlayWizardGame(spec);
    }
  };

  const handleDownloadMcpConfig = () => {
    const blob = new Blob([MCP_CONFIG_JSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mungil-mcp-config.json';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Contextual hints synced to live HUD
  const liveHints: string[] = [];
  if (hud.hp <= 40) liveHints.push('HP rendah! Gunakan Potion (tombol Heal) atau minta Co-Play Qolbu Auto-Heal.');
  if (hud.shards < hud.requiredShards) {
    liveHints.push(`Kumpulkan ${hud.requiredShards - hud.shards} Light Shard lagi untuk membuka gerbang.`);
  }
  if (hud.switchesActive < hud.requiredSwitches) {
    liveHints.push(`Aktifkan ${hud.requiredSwitches - hud.switchesActive} saklar lantai agar gerbang terbuka.`);
  }
  if (hud.fps < 28) liveHints.push('FPS terdeteksi turun: aktifkan Eco Tier 30Hz di tab Play untuk menghemat CPU.');
  if (liveHints.length === 0) liveHints.push('Semua indikator sehat! Lanjutkan eksplorasi atau uji Arena AI.');

  return (
    <div className="space-y-5">
      {/* Top Banner + Sub-Tabs */}
      <section className="rounded-xl border border-(--border) bg-(--surface) p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--accent)/15 text-(--accent)">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-(--text) sm:text-base">
                Agen AI Qolbu &amp; 16-Tool Local MCP Hub
              </h2>
              <p className="text-xs text-(--muted)">
                Berjalan 100% lokal tanpa API key — memandu pemain, menjelaskan arsitektur engine, dan merakit game baru.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['guide', 'Pemandu Pemain'],
                ['explain', 'Penjelas Engine'],
                ['wizard', 'Buat Game Baru'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  soundEngine.playSfx('ui_tab');
                  setSubTab(id);
                }}
                className={`touch-btn rounded-xl px-3.5 text-xs font-bold ${
                  subTab === id
                    ? 'bg-(--accent) text-(--accent-ink)'
                    : 'border border-(--border) bg-(--surface-2) text-(--text)'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Sub-Tab 1: Pemandu Pemain */}
      {subTab === 'guide' && (
        <div className="grid gap-4 lg:grid-cols-12">
          <section className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4 lg:col-span-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-(--text)">Live Quest Tracker &amp; Hint Kontekstual</h3>
              <span className="font-mono-num text-xs font-bold text-(--accent)">Lv.{hud.level}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-(--surface-2) p-2.5">
                <div className="text-[11px] text-(--muted)">HP Bowo</div>
                <div className="font-mono-num font-bold">{hud.hp} / {hud.maxHp}</div>
              </div>
              <div className="rounded-lg bg-(--surface-2) p-2.5">
                <div className="text-[11px] text-(--muted)">Light Shards</div>
                <div className="font-mono-num font-bold">{hud.shards} / {hud.requiredShards}</div>
              </div>
              <div className="rounded-lg bg-(--surface-2) p-2.5">
                <div className="text-[11px] text-(--muted)">Saklar Aktif</div>
                <div className="font-mono-num font-bold">{hud.switchesActive} / {hud.requiredSwitches}</div>
              </div>
              <div className="rounded-lg bg-(--surface-2) p-2.5">
                <div className="text-[11px] text-(--muted)">Gerbang</div>
                <div className={`font-bold ${hud.gateUnlocked ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {hud.gateUnlocked ? 'TERBUKA' : 'TERKUNCI'}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 rounded-xl border border-(--border) bg-(--surface-2) p-3 text-xs">
              <div className="font-bold text-(--accent)">Saran Qolbu Saat Ini:</div>
              {liveHints.map((hint, idx) => (
                <div key={idx} className="text-(--text)">• {hint}</div>
              ))}
            </div>
          </section>

          <section className="space-y-2.5 rounded-xl border border-(--border) bg-(--surface) p-4 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-(--text)">Tutorial Interaktif 10 Langkah</h3>
              <span className="font-mono-num text-xs font-bold text-emerald-400">
                {completedSteps.length}/10 Selesai
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {TUTORIAL_STEPS.map((st) => {
                const done = completedSteps.includes(st.step);
                return (
                  <div key={st.step} className="rounded-xl border border-(--border) bg-(--surface-2) p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCompletedSteps((prev) =>
                            prev.includes(st.step) ? prev.filter((x) => x !== st.step) : [...prev, st.step]
                          )
                        }
                        className="flex items-center gap-1.5 text-left font-bold text-(--text)"
                      >
                        <CheckCircle2 className={`h-4 w-4 shrink-0 ${done ? 'text-emerald-400' : 'text-(--muted)'}`} />
                        <span>{st.step}. {st.title}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigateTab(st.targetTab)}
                        className="rounded-md bg-(--accent)/15 px-2 py-0.5 text-[10px] font-bold text-(--accent)"
                      >
                        Buka
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-(--muted)">{st.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Sub-Tab 2: Penjelas Engine */}
      {subTab === 'explain' && (
        <div className="grid gap-4 lg:grid-cols-12">
          <section className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4 lg:col-span-7">
            <h3 className="text-sm font-extrabold text-(--text)">12 Topik Cara Kerja Engine</h3>
            <div className="flex flex-wrap gap-1.5">
              {QOLBU_ENGINE_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`touch-btn rounded-lg border px-2.5 text-xs font-bold ${
                    selectedTopicId === topic.id
                      ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                      : 'border-(--border) bg-(--surface-2) text-(--text)'
                  }`}
                >
                  {topic.title}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-(--border) bg-(--surface-2) p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-extrabold text-(--text)">{activeTopic.title}</div>
                <button
                  type="button"
                  onClick={() => onNavigateTab(activeTopic.tab)}
                  className="touch-btn inline-flex items-center gap-1 rounded-lg bg-(--accent) px-3 text-xs font-extrabold text-(--accent-ink)"
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span>Lompat ke Tab {activeTopic.tab.toUpperCase()}</span>
                </button>
              </div>
              <p className="mt-1.5 font-semibold text-(--accent)">{activeTopic.summary}</p>
              <p className="mt-1 leading-relaxed text-(--muted)">{activeTopic.detail}</p>
            </div>
          </section>

          <section className="flex flex-col justify-between space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4 lg:col-span-5">
            <div>
              <h3 className="text-sm font-extrabold text-(--text)">Tanya Jawab Qolbu (Offline Chat)</h3>
              <div className="mt-2.5 max-h-56 space-y-2 overflow-y-auto pr-1 text-xs">
                {chatHistory.map((m, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-2.5 ${
                      m.from === 'user'
                        ? 'ml-6 bg-(--accent)/15 text-(--text)'
                        : 'mr-4 border border-(--border) bg-(--surface-2) text-(--text)'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase text-(--muted)">
                      {m.from === 'user' ? 'Kamu' : 'Qolbu AI'}
                    </div>
                    <div className="mt-0.5 leading-relaxed">{m.text}</div>
                    {m.tab && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab(m.tab!)}
                        className="mt-1.5 rounded-md bg-(--accent) px-2 py-0.5 text-[10px] font-extrabold text-(--accent-ink)"
                      >
                        Buka Tab {m.tab}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskChat();
                }}
                placeholder="Tanya: Zero-GC, preset, group, MCP, APK..."
                className="touch-btn min-w-0 flex-1 rounded-xl border border-(--border) bg-(--surface-2) px-3 text-xs"
              />
              <button
                type="button"
                onClick={handleAskChat}
                className="touch-btn inline-flex items-center gap-1 rounded-xl bg-(--accent) px-3.5 text-xs font-extrabold text-(--accent-ink)"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Tanya</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Sub-Tab 3: Pembantu Buat Game (5-Step Wizard + Koleksi Game Saya) */}
      {subTab === 'wizard' && (
        <div className="grid gap-4 lg:grid-cols-12">
          <section className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4 lg:col-span-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-(--text)">
                <Wand2 className="h-4 w-4 text-(--accent)" />
                <span>Wizard Buat Game (Langkah {wizStep}/5)</span>
              </h3>
              <div className="flex gap-1">
                {([1, 2, 3, 4, 5] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setWizStep(s)}
                    className={`h-7 w-7 rounded-lg text-xs font-bold ${
                      wizStep === s ? 'bg-(--accent) text-(--accent-ink)' : 'bg-(--surface-2) text-(--muted)'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {wizStep === 1 && (
              <div className="space-y-2.5 text-xs">
                <div className="font-bold text-(--accent)">1. Ide &amp; Genre Game</div>
                <label className="block">
                  <span className="text-(--muted)">Judul Game Baru</span>
                  <input
                    type="text"
                    value={wizName}
                    onChange={(e) => setWizName(e.target.value)}
                    className="touch-btn mt-1 w-full rounded-xl border border-(--border) bg-(--surface-2) px-3 font-semibold"
                  />
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                  {(['Platformer', 'Fighter', 'RPG', 'Runner', 'Arena'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setWizGenre(g)}
                      className={`touch-btn rounded-lg border font-bold ${
                        wizGenre === g ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {wizStep === 2 && (
              <div className="space-y-2.5 text-xs">
                <div className="font-bold text-(--accent)">2. Karakter &amp; Physics Preset</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-(--muted)">Nama Karakter Utama</span>
                    <input
                      type="text"
                      value={wizCharName}
                      onChange={(e) => setWizCharName(e.target.value)}
                      className="touch-btn mt-1 w-full rounded-xl border border-(--border) bg-(--surface-2) px-3 font-semibold"
                    />
                  </label>
                  <label className="block">
                    <span className="text-(--muted)">Gaya Sprite</span>
                    <input
                      type="text"
                      value={wizSprite}
                      onChange={(e) => setWizSprite(e.target.value)}
                      className="touch-btn mt-1 w-full rounded-xl border border-(--border) bg-(--surface-2) px-3 font-semibold"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['NORMAL', 'BOUNCY', 'HEAVY', 'GHOST', 'SLIPPERY', 'BALL'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setWizPreset(p)}
                      className={`touch-btn rounded-lg border text-[11px] font-bold ${
                        wizPreset === p ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {wizStep === 3 && (
              <div className="space-y-2.5 text-xs">
                <div className="font-bold text-(--accent)">3. Level, Musuh &amp; Item</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Arena Qolbu', 'Desa Fajar', 'Jembatan Cahaya'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWizMap(m)}
                      className={`touch-btn rounded-lg border px-2 text-[11px] font-bold ${
                        wizMap === m ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span>Jumlah Musuh ({wizEnemies})</span>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      value={wizEnemies}
                      onChange={(e) => setWizEnemies(Number(e.target.value))}
                      className="w-full accent-(--accent)"
                    />
                  </label>
                  <label>
                    <span>Jumlah Item ({wizItems})</span>
                    <input
                      type="range"
                      min={2}
                      max={6}
                      value={wizItems}
                      onChange={(e) => setWizItems(Number(e.target.value))}
                      className="w-full accent-(--accent)"
                    />
                  </label>
                </div>
              </div>
            )}

            {wizStep === 4 && (
              <div className="space-y-2.5 text-xs">
                <div className="font-bold text-(--accent)">4. Aturan AI, Kesulitan &amp; Durasi</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Sendiri', 'Bareng', 'Lawan'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWizAiMode(m)}
                      className={`touch-btn rounded-lg border font-bold ${
                        wizAiMode === m ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                      }`}
                    >
                      AI {m}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Easy', 'Normal', 'Hard'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setWizDifficulty(d)}
                      className={`touch-btn rounded-lg border font-bold ${
                        wizDifficulty === d ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <label className="block">
                  <span>Durasi Ronde ({wizDuration} detik)</span>
                  <input
                    type="range"
                    min={30}
                    max={180}
                    step={15}
                    value={wizDuration}
                    onChange={(e) => setWizDuration(Number(e.target.value))}
                    className="w-full accent-(--accent)"
                  />
                </label>
              </div>
            )}

            {wizStep === 5 && (
              <div className="space-y-2 rounded-xl border border-(--border) bg-(--surface-2) p-3 text-xs">
                <div className="font-extrabold text-(--accent)">5. Ringkasan &amp; Play Test</div>
                <div>
                  <strong>{wizName}</strong> ({wizGenre}) · Karakter: {wizCharName} · Preset: {wizPreset}
                </div>
                <div className="text-(--muted)">
                  Map: {wizMap} · Musuh: {wizEnemies} · Item: {wizItems} · Mode AI: {wizAiMode} ({wizDifficulty})
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCreateWizardGame(true)}
                    className="touch-btn inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-(--accent) px-3 font-extrabold text-(--accent-ink)"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Simpan &amp; Mainkan di Arena</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateWizardGame(false)}
                    className="touch-btn inline-flex items-center gap-1 rounded-xl border border-(--border) bg-(--surface) px-3 font-bold"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Simpan Saja</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-1 text-xs">
              <button
                type="button"
                disabled={wizStep === 1}
                onClick={() => setWizStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4 | 5)}
                className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 font-bold disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={wizStep === 5}
                onClick={() => setWizStep((s) => Math.min(5, s + 1) as 1 | 2 | 3 | 4 | 5)}
                className="touch-btn rounded-lg bg-(--accent) px-3 font-extrabold text-(--accent-ink) disabled:opacity-40"
              >
                Lanjut
              </button>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4 lg:col-span-6">
            <h3 className="text-sm font-extrabold text-(--text)">Koleksi Game Saya ({myGames.length})</h3>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1 text-xs">
              {myGames.map((game) => (
                <div
                  key={game.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-(--border) bg-(--surface-2) p-3"
                >
                  <div>
                    <div className="font-extrabold text-(--text)">{game.name}</div>
                    <div className="text-[11px] text-(--muted)">
                      {game.genre} · {game.map} · Preset {game.preset} · AI {game.aiMode} ({game.difficulty})
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onPlayWizardGame(game)}
                      className="touch-btn inline-flex items-center gap-1 rounded-lg bg-(--accent) px-3 font-extrabold text-(--accent-ink)"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Play</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWizName(game.name);
                        setWizGenre(game.genre);
                        setWizCharName(game.characterName);
                        setWizPreset(game.preset);
                        setWizMap(game.map);
                        setWizEnemies(game.enemies);
                        setWizItems(game.items);
                        setWizAiMode(game.aiMode);
                        setWizDifficulty(game.difficulty);
                        setWizStep(1);
                      }}
                      className="touch-btn rounded-lg border border-(--border) bg-(--surface) px-2.5 font-bold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Hapus ${game.name}`}
                      onClick={() => setMyGames((prev) => prev.filter((x) => x.id !== game.id))}
                      className="touch-btn rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Local 16-Tool MCP Hub */}
      <section className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-(--text)">
              <Terminal className="h-4 w-4 text-(--accent)" />
              <span>MCP Hub Lokal (16 Executable Tools)</span>
            </h3>
            <p className="text-[11px] text-(--muted)">
              Arsitektur: Client (Agen Qolbu) -&gt; MCP Server Lokal -&gt; Editor Bridge (Scene, Generators, Lab, Arena, Export).
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(MCP_CONFIG_JSON);
                setCopiedConfig(true);
                window.setTimeout(() => setCopiedConfig(false), 1800);
              }}
              className="touch-btn inline-flex items-center gap-1 rounded-xl border border-(--border) bg-(--surface-2) px-3 text-xs font-bold"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{copiedConfig ? 'Config Copied' : 'Copy MCP Config'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadMcpConfig}
              className="touch-btn inline-flex items-center gap-1 rounded-xl border border-(--border) bg-(--surface-2) px-3 text-xs font-bold"
            >
              <Download className="h-3.5 w-3.5" />
              <span>JSON Config</span>
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {LOCAL_MCP_TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_click');
                onExecuteMcpTool(tool.id);
              }}
              className="touch-btn flex flex-col justify-between rounded-xl border border-(--border) bg-(--surface-2) p-2.5 text-left text-xs transition hover:border-(--accent)"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono-num font-extrabold text-(--accent)">{tool.name}</span>
                <Sparkles className="h-3 w-3 shrink-0 text-(--muted)" />
              </div>
              <div className="mt-1 text-[11px] text-(--muted)">{tool.desc}</div>
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-slate-950 p-3 text-[11px]">
          <div className="font-bold text-slate-400">Live MCP Execution Log:</div>
          <div className="font-mono-num mt-1 max-h-28 space-y-0.5 overflow-y-auto text-emerald-300">
            {mcpLogs.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
