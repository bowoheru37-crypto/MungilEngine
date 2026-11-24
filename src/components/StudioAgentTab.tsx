import { Bot, Box, Cpu, GitBranch, Play, Plug, Search, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';

import {
  MCP_TOOL_CATALOG,
  routeAgentPrompt,
  type AgentContextSnapshot,
  type McpRuntimeActions,
} from '../engine/aiMcpAgent';
import { soundEngine } from '../engine/audio';
import { GENRE_TEMPLATES } from '../engine/catalogs';
import { getHeapMb } from '../engine/deviceProfiler';
import {
  CURATED_GITHUB_PLUGINS,
  GITHUB_CATEGORY_LABELS,
  searchGitHubReposWithFallback,
} from '../engine/githubConnectors';
import {
  ENGINE_CONNECTORS,
  LAYER_ARCHITECTURE_12,
  QOLBU_CONSTANTS,
  runQolbu8StageAudit,
  VISUAL_QUALITY_PROFILES,
} from '../engine/qolbuCore';
import { CAMERA_3_PRESETS, HYBRID_5_MODES } from '../engine/qolbuSpace3d';
import type {
  AgentChatMessage,
  AiPlayMode,
  ArtStyleId,
  Camera3DPresetId,
  GenreTemplate,
  GitHubRepoCategory,
  GitHubRepoPlugin,
  HybridRender5Mode,
  PerspectiveConnectorId,
  PhysicsMode,
  QolbuAuditReport,
  RenderMode,
  VisualQualityPresetId,
} from '../engine/types';

interface StudioAgentTabProps {
  gameName: string;
  setGameName: (v: string) => void;
  activeLevel: 1 | 2 | 3;
  setActiveLevel: (l: 1 | 2 | 3) => void;
  activeGenreId: string;
  aiMode: AiPlayMode;
  setAiMode: (m: AiPlayMode) => void;
  perspectiveConnector: PerspectiveConnectorId;
  setPerspectiveConnector: (c: PerspectiveConnectorId) => void;
  cameraPreset: Camera3DPresetId;
  setCameraPreset: (c: Camera3DPresetId) => void;
  hybridMode: HybridRender5Mode;
  setHybridMode: (m: HybridRender5Mode) => void;
  activeGitHubRepoId: string;
  setActiveGitHubRepoId: (id: string) => void;
  visualQuality: VisualQualityPresetId;
  setVisualQuality: (q: VisualQualityPresetId) => void;
  renderMode: RenderMode;
  setRenderMode: (m: RenderMode) => void;
  physicsMode: PhysicsMode;
  setPhysicsMode: (p: PhysicsMode) => void;
  styleId: ArtStyleId;
  setStyleId: (s: ArtStyleId) => void;
  onLaunchGame: (lvl?: 1 | 2 | 3, genre?: GenreTemplate, aiModeOverride?: AiPlayMode) => void;
}

export function StudioAgentTab({
  gameName,
  setGameName,
  activeLevel,
  setActiveLevel,
  activeGenreId,
  aiMode,
  setAiMode,
  perspectiveConnector,
  setPerspectiveConnector,
  cameraPreset,
  setCameraPreset,
  hybridMode,
  setHybridMode,
  activeGitHubRepoId,
  setActiveGitHubRepoId,
  visualQuality,
  setVisualQuality,
  renderMode,
  setRenderMode,
  physicsMode,
  setPhysicsMode,
  styleId,
  setStyleId,
  onLaunchGame,
}: StudioAgentTabProps) {
  const [promptInput, setPromptInput] = useState('');
  const [ghQuery, setGhQuery] = useState('');
  const [ghCategory, setGhCategory] = useState<GitHubRepoCategory | 'all'>('all');
  const [ghResults, setGhResults] = useState<GitHubRepoPlugin[]>(CURATED_GITHUB_PLUGINS);
  const [ghSyncing, setGhSyncing] = useState(false);
  const [ghStatusNote, setGhStatusNote] = useState(
    `${CURATED_GITHUB_PLUGINS.length} curated GitHub plug-in patterns ready offline.`
  );
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: 'welcome_1',
      role: 'agent',
      text: 'Halo! Saya Qolbu AI + MCP Agent. Tanyakan cara kerja engine, minta panduan Babak 1–3, buat game baru dengan konektor 2D/Isometric/Hex/Fake-3D, atau aktifkan mode Main Bersama AI (Luma) & AI Auto-Play.',
      createdAt: 'Now',
    },
  ]);
  const [auditReport, setAuditReport] = useState<QolbuAuditReport>(() => runQolbu8StageAudit(14, getHeapMb()));
  const [showLayers, setShowLayers] = useState(false);

  const ctxSnapshot: AgentContextSnapshot = {
    gameName,
    activeLevel,
    activeGenreId,
    aiMode,
    perspectiveConnector,
    renderMode,
    physicsMode,
    styleId,
  };

  const actions: McpRuntimeActions = {
    setGameName,
    setActiveLevel,
    setAiMode,
    setPerspectiveConnector,
    setCameraPreset,
    setHybridMode,
    setRenderMode,
    setPhysicsMode,
    setStyleId,
    launchGame: onLaunchGame,
  };

  const submitPrompt = (textOverride?: string) => {
    const raw = (textOverride ?? promptInput).trim();
    if (!raw) return;
    soundEngine.playSfx('ui_click');
    const result = routeAgentPrompt(raw, ctxSnapshot, actions);
    const nowLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev.slice(-8),
      { id: `u_${Date.now()}`, role: 'user', text: raw, createdAt: nowLabel },
      { id: `a_${Date.now() + 1}`, role: 'agent', text: result.reply, toolTrace: result.toolTrace, createdAt: nowLabel },
    ]);
    if (result.toolTrace.tool === 'mcp.run_qolbu_audit') {
      setAuditReport(runQolbu8StageAudit(14, getHeapMb()));
    }
    if (!textOverride) setPromptInput('');
  };

  const aiArenaTemplate = GENRE_TEMPLATES.find((g) => g.id === 'ai_arena') ?? GENRE_TEMPLATES[0];

  return (
    <div className="space-y-5 text-xs">
      {/* 1. AI CO-OP & AI AUTO-PLAY ARENA + IN-APP AI AGENT + MCP */}
      <section className="grid gap-4 lg:grid-cols-12">
        {/* In-App AI Agent + MCP Chat */}
        <div className="rounded-xl border border-(--border) bg-(--surface) p-4 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-(--accent)" />
              <div>
                <h3 className="text-sm font-extrabold text-(--text)">AI Agent + In-App MCP Assistant</h3>
                <p className="text-[11px] text-(--muted)">
                  Guides players, explains engine architecture, builds games &amp; executes live MCP tools offline.
                </p>
              </div>
            </div>
            <span className="font-mono-num text-[11px] font-bold text-(--accent)">{MCP_TOOL_CATALOG.length} MCP Tools</span>
          </div>

          {/* 1-Tap Quick Agent Prompts */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              'Jelaskan Qolbu 0-GC & 9 Larangan',
              'Pandu aku menang Babak 3 Boss Kala',
              'Buatkan game baru: Isometric Cyber Arena',
              'Aktifkan mode Co-Op bersama AI Luma',
              'Jalankan Qolbu Audit & Fuzzing',
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => submitPrompt(q)}
                className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-2.5 text-[11px] font-bold text-(--text) hover:border-(--accent)"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Feed */}
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-(--border) bg-slate-950/75 p-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl p-2.5 ${
                  m.role === 'user'
                    ? 'ml-6 bg-(--accent)/15 text-(--text)'
                    : 'mr-4 border border-slate-800 bg-slate-900 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-(--muted)">
                  <span>{m.role === 'user' ? 'Developer / Player' : 'Qolbu AI + MCP'}</span>
                  <span>{m.createdAt}</span>
                </div>
                <p className="mt-1 leading-relaxed">{m.text}</p>
                {m.toolTrace && (
                  <div className="font-mono-num mt-1.5 rounded-lg bg-slate-950 px-2 py-1 text-[10px] text-emerald-300">
                    MCP: {m.toolTrace.tool} · {m.toolTrace.ok ? 'OK' : 'WARN'}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form
            className="mt-2.5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submitPrompt();
            }}
          >
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Tanya cara kerja engine, panduan, atau suruh buat game baru..."
              className="touch-btn flex-1 rounded-xl border border-(--border) bg-(--surface-2) px-3 text-xs text-(--text) outline-none focus:border-(--accent)"
            />
            <button
              type="submit"
              className="touch-btn inline-flex items-center gap-1.5 rounded-xl bg-(--accent) px-4 font-extrabold text-(--accent-ink)"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Ask MCP</span>
            </button>
          </form>
        </div>

        {/* Play WITH AI / Played BY AI Controller */}
        <div className="rounded-xl border border-(--border) bg-(--surface) p-4 lg:col-span-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-(--accent)" />
            <div>
              <h3 className="text-sm font-extrabold text-(--text)">AI Game Mode: Play WITH AI or BY AI</h3>
              <p className="text-[11px] text-(--muted)">
                Fixed {QOLBU_CONSTANTS.AI_TICK_HZ}Hz tactical AI (-50% CPU on Itel A70).
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {(
              [
                {
                  id: 'coop',
                  title: 'Play WITH AI (Co-Op Luma)',
                  desc: 'AI Luma fights beside Bowo, fetches coins, fires bolts & heals HP.',
                },
                {
                  id: 'autopilot',
                  title: 'Played BY AI (Autonomous Pilot)',
                  desc: 'Watch the AI Bot play Bowo, parry shots, gather shards & clear levels.',
                },
                {
                  id: 'off',
                  title: 'Classic Solo Control',
                  desc: '100% manual control without AI companion.',
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  soundEngine.playSfx('ui_toggle');
                  setAiMode(opt.id);
                }}
                className={`touch-btn w-full rounded-xl border p-2.5 text-left transition ${
                  aiMode === opt.id
                    ? 'border-(--accent) bg-(--accent)/15'
                    : 'border-(--border) bg-(--surface-2) hover:border-(--accent)'
                }`}
              >
                <div className="flex items-center justify-between font-extrabold text-(--text)">
                  <span>{opt.title}</span>
                  {aiMode === opt.id && <span className="text-[10px] uppercase text-(--accent)">Active</span>}
                </div>
                <div className="mt-0.5 text-[11px] text-(--muted)">{opt.desc}</div>
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_click');
                setAiMode('coop');
                onLaunchGame(activeLevel, aiArenaTemplate, 'coop');
              }}
              className="touch-btn inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-(--accent) px-3 font-extrabold text-(--accent-ink)"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Play WITH AI</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_click');
                setAiMode('autopilot');
                onLaunchGame(activeLevel, aiArenaTemplate, 'autopilot');
              }}
              className="touch-btn inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-(--border) bg-(--surface-2) px-3 font-extrabold text-(--text) hover:border-(--accent)"
            >
              <Bot className="h-3.5 w-3.5 text-(--accent)" />
              <span>Watch AI Play</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. UNIVERSAL PLUG-IN CONNECTORS & FIDELITY PROFILES */}
      <section className="rounded-xl border border-(--border) bg-(--surface) p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-(--accent)" />
            <div>
              <h3 className="text-sm font-extrabold text-(--text)">Universal Perspective &amp; Visual Plug-in Connectors</h3>
              <p className="text-[11px] text-(--muted)">
                One-tap adapters for 2D, 2.5D, Fake-3D, Isometric, Hexagonal, Top-Down, FPS, TPS, and Pixel-to-UltraHD fidelity.
              </p>
            </div>
          </div>
          <span className="font-mono-num text-[11px] font-bold text-(--accent)">{ENGINE_CONNECTORS.length} Connectors</span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {ENGINE_CONNECTORS.map((c) => {
            const active = perspectiveConnector === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  soundEngine.playSfx('ui_tab');
                  setPerspectiveConnector(c.id);
                  setRenderMode(c.renderMode);
                  setPhysicsMode(c.physicsMode);
                  setStyleId(c.recommendedStyle);
                }}
                className={`touch-btn flex flex-col justify-between rounded-xl border p-2.5 text-left ${
                  active ? 'border-(--accent) bg-(--accent)/15' : 'border-(--border) bg-(--surface-2) hover:border-(--accent)'
                }`}
              >
                <div>
                  <div className="font-extrabold text-(--text)">{c.label}</div>
                  <div className="font-mono-num mt-0.5 text-[10px] text-(--accent)">
                    {c.renderMode} · {c.physicsMode}
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-(--muted)">{c.summary}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {VISUAL_QUALITY_PROFILES.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_toggle');
                setVisualQuality(q.id);
              }}
              className={`touch-btn rounded-xl border p-2.5 text-left ${
                visualQuality === q.id ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2) text-(--text)'
              }`}
            >
              <div className="font-extrabold">{q.label}</div>
              <div className={`mt-0.5 text-[11px] ${visualQuality === q.id ? 'opacity-85' : 'text-(--muted)'}`}>{q.detail}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 2B. QOLBU SPACE 3D: 3 STANDARD CAMERAS & 5 HYBRID RENDER MODES (ITEL A70 SPEC) */}
      <section className="rounded-xl border border-(--border) bg-(--surface) p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-(--accent)" />
            <div>
              <h3 className="text-sm font-extrabold text-(--text)">QolbuSpace3D · 3 Cameras &amp; 5-Mode Hybrid Pipeline</h3>
              <p className="text-[11px] text-(--muted)">
                Y-Up Right-Handed (1 unit = 1m) · Origin Rebasing (&gt;500m) · 35m Cull + 3-Level LOD · &lt;35 Draw Calls
              </p>
            </div>
          </div>
          <span className="font-mono-num text-[11px] font-bold text-(--accent)">FOV 60° · 30 FPS Lock</span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {CAMERA_3_PRESETS.map((cam) => (
            <button
              key={cam.id}
              type="button"
              data-testid={`cam-preset-${cam.id}`}
              onClick={() => {
                soundEngine.playSfx('ui_toggle');
                setCameraPreset(cam.id);
              }}
              className={`touch-btn rounded-xl border p-2.5 text-left ${
                cameraPreset === cam.id ? 'border-(--accent) bg-(--accent)/15' : 'border-(--border) bg-(--surface-2) hover:border-(--accent)'
              }`}
            >
              <div className="flex items-center justify-between gap-1 font-extrabold text-(--text)">
                <span>{cam.label}</span>
                <span className="font-mono-num text-[10px] text-(--accent)">{cam.shortTag}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-(--muted)">{cam.desc}</p>
            </button>
          ))}
        </div>

        <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {HYBRID_5_MODES.map((hm) => (
            <button
              key={hm.id}
              type="button"
              data-testid={`hybrid-mode-${hm.id}`}
              onClick={() => {
                soundEngine.playSfx('ui_tab');
                setHybridMode(hm.id);
                setRenderMode(hm.id === 'real_3d_lowpoly' || hm.id === 'raycast_pseudo3d' ? '3D Ringan' : '2.5D');
              }}
              className={`touch-btn flex flex-col justify-between rounded-xl border p-2.5 text-left ${
                hybridMode === hm.id ? 'border-(--accent) bg-(--accent)/15' : 'border-(--border) bg-(--surface-2) hover:border-(--accent)'
              }`}
            >
              <div>
                <div className="font-extrabold text-(--text)">{hm.label}</div>
                <div className="font-mono-num text-[10px] text-emerald-400">{hm.targetDc}</div>
              </div>
              <p className="mt-1 text-[10px] text-(--muted)">{hm.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* 2C. GITHUB REPOSITORY-CONNECTED PLUG-IN CONNECTOR HUB */}
      <section className="rounded-xl border border-(--border) bg-(--surface) p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-(--accent)" />
            <div>
              <h3 className="text-sm font-extrabold text-(--text)">GitHub Repository Plug-in Connectors</h3>
              <p className="text-[11px] text-(--muted)">{ghStatusNote}</p>
            </div>
          </div>
          <form
            className="flex flex-wrap items-center gap-1.5"
            onSubmit={async (e) => {
              e.preventDefault();
              setGhSyncing(true);
              const res = await searchGitHubReposWithFallback(ghQuery, ghCategory);
              setGhResults(res.results);
              setGhStatusNote(res.note);
              setGhSyncing(false);
            }}
          >
            <input
              type="search"
              data-testid="github-repo-search"
              value={ghQuery}
              onChange={(e) => {
                const next = e.target.value;
                setGhQuery(next);
                setGhResults(
                  CURATED_GITHUB_PLUGINS.filter((item) => {
                    if (ghCategory !== 'all' && item.category !== ghCategory) return false;
                    if (!next.trim()) return true;
                    const q = next.toLowerCase();
                    return item.repo.toLowerCase().includes(q) || item.dnaPattern.toLowerCase().includes(q);
                  })
                );
              }}
              placeholder="Search GitHub repos (e.g. cub3d, axmol, tripo)..."
              className="touch-btn w-52 rounded-xl border border-(--border) bg-(--surface-2) px-3 text-xs text-(--text)"
            />
            <button
              type="submit"
              disabled={ghSyncing}
              className="touch-btn inline-flex items-center gap-1 rounded-xl bg-(--accent) px-3 font-extrabold text-(--accent-ink)"
            >
              <Search className="h-3.5 w-3.5" />
              <span>{ghSyncing ? 'Syncing...' : 'Sync GitHub'}</span>
            </button>
          </form>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {(['all', ...Object.keys(GITHUB_CATEGORY_LABELS)] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                const typedCat = cat as GitHubRepoCategory | 'all';
                setGhCategory(typedCat);
                setGhResults(
                  CURATED_GITHUB_PLUGINS.filter((item) => {
                    if (typedCat !== 'all' && item.category !== typedCat) return false;
                    if (!ghQuery.trim()) return true;
                    const q = ghQuery.toLowerCase();
                    return item.repo.toLowerCase().includes(q) || item.dnaPattern.toLowerCase().includes(q);
                  })
                );
              }}
              className={`touch-btn rounded-lg border px-2.5 text-[11px] font-bold ${
                ghCategory === cat ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
              }`}
            >
              {cat === 'all' ? 'All Repos' : GITHUB_CATEGORY_LABELS[cat as GitHubRepoCategory]}
            </button>
          ))}
        </div>

        <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {ghResults.map((repo) => {
            const bound = activeGitHubRepoId === repo.id;
            return (
              <div
                key={repo.id}
                className={`flex flex-col justify-between rounded-xl border p-2.5 ${
                  bound ? 'border-(--accent) bg-(--accent)/12' : 'border-(--border) bg-(--surface-2)'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate font-extrabold text-(--text)">{repo.repo}</span>
                    <span className="font-mono-num shrink-0 text-[10px] font-bold text-amber-300">
                      {repo.starsLabel} · {repo.license}
                    </span>
                  </div>
                  <div className="font-mono-num mt-0.5 text-[10px] text-emerald-400">
                    &lt;={repo.maxDrawCallsBudget} DC · &lt;={repo.maxTrisBudget} tris · {repo.recommendedCamera}
                  </div>
                  <p className="mt-1 text-[11px] text-(--muted)">{repo.dnaPattern}</p>
                </div>
                <button
                  type="button"
                  data-testid={`bind-repo-${repo.id}`}
                  onClick={() => {
                    soundEngine.playSfx('ui_toggle');
                    setActiveGitHubRepoId(repo.id);
                    setHybridMode(repo.recommendedHybridMode);
                    setCameraPreset(repo.recommendedCamera);
                    if (repo.supportedPerspectives[0]) {
                      setPerspectiveConnector(repo.supportedPerspectives[0]);
                    }
                    setRenderMode(
                      repo.recommendedHybridMode === 'real_3d_lowpoly' || repo.recommendedHybridMode === 'raycast_pseudo3d'
                        ? '3D Ringan'
                        : '2.5D'
                    );
                  }}
                  className={`touch-btn mt-2 w-full rounded-lg border px-2.5 font-bold ${
                    bound ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface) hover:border-(--accent)'
                  }`}
                >
                  {bound ? 'Bound to Engine' : 'Bind Repo Pattern'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. QOLBU 8-STAGE VERIFICATION + 9 LARANGAN MUTLAK + 12-LAYER ARCHITECTURE */}
      <section className="rounded-xl border border-(--border) bg-(--surface) p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-extrabold text-(--text)">Qolbu Core 8-Stage Verification &amp; 9 Larangan Mutlak</h3>
              <p className="text-[11px] text-(--muted)">
                Zero-GC · Zero-FC · Zero-ANR · Zero-NPE · Zero-Leak · Zero-OOM · Zero-Lag · Zero-Heat · Strict Naming
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowLayers((v) => !v)}
              className="touch-btn rounded-xl border border-(--border) bg-(--surface-2) px-3 font-bold text-(--text)"
            >
              {showLayers ? 'Hide 12 Layers' : 'Show 12 Layers'}
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_click');
                setAuditReport(runQolbu8StageAudit(14, getHeapMb()));
              }}
              className="touch-btn inline-flex items-center gap-1.5 rounded-xl bg-(--accent) px-3.5 font-extrabold text-(--accent-ink)"
            >
              <Cpu className="h-4 w-4" />
              <span>Run 8-Stage Audit &amp; Fuzz</span>
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {auditReport.stages.map((st) => (
            <div key={st.stage} className="rounded-xl border border-(--border) bg-(--surface-2) p-2.5">
              <div className="flex items-center justify-between gap-1 font-bold text-(--text)">
                <span>
                  #{st.stage} {st.name}
                </span>
                <span className={`font-mono-num text-[10px] font-extrabold ${st.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {st.passed ? 'PASS' : 'WARN'}
                </span>
              </div>
              <div className="font-mono-num mt-1 text-[11px] text-(--muted)">{st.metric}</div>
            </div>
          ))}
        </div>

        {showLayers && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {LAYER_ARCHITECTURE_12.map((ly) => (
              <div key={ly.layer} className="rounded-xl border border-(--border) bg-(--surface-2) p-2.5">
                <div className="flex items-center justify-between font-bold text-(--text)">
                  <span>
                    Layer {ly.layer}: {ly.name}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-(--accent)">{ly.itelMode}</div>
                <div className="font-mono-num text-[10px] text-(--muted)">{ly.module}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
