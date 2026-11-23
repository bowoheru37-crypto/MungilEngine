import { Check, Copy, Download, Package } from 'lucide-react';
import { useState } from 'react';

import { buildAgentSkillPack, exportFullAgentBundleJson, getInstallCommandSnippet } from '../engine/agentSkills';
import { soundEngine } from '../engine/audio';
import { KEYWORD_TOP5_REPOS } from '../engine/catalogs';
import type { AgentPlatformId } from '../engine/types';

function triggerDownload(filename: string, content: string, mime = 'text/markdown') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type RepoKeyword = keyof typeof KEYWORD_TOP5_REPOS;

export function StudioSkillsTab() {
  const packs = buildAgentSkillPack();
  const [selectedPlatform, setSelectedPlatform] = useState<AgentPlatformId>('claude');
  const [copiedId, setCopiedId] = useState<string>('');
  const [keyword, setKeyword] = useState<RepoKeyword>('fake_3d');

  const activePack = packs.find((p) => p.platform === selectedPlatform) ?? packs[0];
  const installCmd = getInstallCommandSnippet(selectedPlatform);

  const copyText = (id: string, text: string) => {
    soundEngine.playSfx('ui_click');
    void navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(''), 1800);
  };

  return (
    <div className="space-y-5">
      {/* AI Agent + Complete Skills Installer */}
      <section className="rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-(--text)">AI Agent &amp; Complete Skills Pack (Multi-LLM)</h3>
            <p className="mt-0.5 text-(--muted)">
              Installable system instructions, architecture rules, and tool schemas for Claude, Gemini, Grok, Qwen, and Universal AGENTS.md.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playSfx('ui_click');
              triggerDownload('mungil-v7-agent-skills-bundle.json', exportFullAgentBundleJson(), 'application/json');
            }}
            className="touch-btn inline-flex items-center gap-1.5 rounded-xl bg-(--accent) px-4 font-extrabold text-(--accent-ink)"
          >
            <Package className="h-4 w-4" />
            <span>Download Full Bundle (.json)</span>
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {packs.map((p) => (
            <button
              key={p.platform}
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_tab');
                setSelectedPlatform(p.platform);
              }}
              className={`touch-btn rounded-xl border px-3.5 font-bold uppercase ${
                selectedPlatform === p.platform
                  ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                  : 'border-(--border) bg-(--surface-2) text-(--text)'
              }`}
            >
              {p.platform}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-(--border) bg-(--surface-2) p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-extrabold text-(--text)">
                {activePack.filename} — {activePack.title}
              </div>
              <div className="text-(--muted)">{activePack.summary}</div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => copyText(activePack.filename, activePack.content)}
                className="touch-btn inline-flex items-center gap-1.5 rounded-lg border border-(--border) bg-(--surface) px-3 font-bold text-(--text)"
              >
                {copiedId === activePack.filename ? <Check className="h-3.5 w-3.5 text-(--accent)" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedId === activePack.filename ? 'Copied' : 'Copy Skill'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playSfx('ui_click');
                  triggerDownload(activePack.filename, activePack.content);
                }}
                className="touch-btn inline-flex items-center gap-1.5 rounded-lg border border-(--border) bg-(--surface) px-3 font-bold text-(--text)"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download {activePack.filename}</span>
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg bg-slate-950 px-3 py-2 font-mono-num text-[11px] text-emerald-300">
            <span className="truncate">{installCmd}</span>
            <button
              type="button"
              onClick={() => copyText('cmd', installCmd)}
              className="shrink-0 font-bold text-sky-300 hover:underline"
            >
              {copiedId === 'cmd' ? 'Copied' : 'Copy'}
            </button>
          </div>

          <pre className="font-mono-num mt-3 max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-200">
            {activePack.content}
          </pre>
        </div>
      </section>

      {/* Top 5 GitHub Repositories per Keyword (Cleanroom Adopted Matrix) */}
      <section className="rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-(--text)">Top-5 GitHub Architectures per Keyword</h3>
            <p className="text-(--muted)">
              25 cleanroom engine patterns adopted across Fake 3D, Pseudo 3D, 2.5D, Web Engine, and Mobile Engine keywords.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['fake_3d', 'Fake 3D (5)'],
                ['pseudo_3d', 'Pseudo 3D (5)'],
                ['2_5d', '2.5D (5)'],
                ['web_engine', 'Web Engine (5)'],
                ['mobile_engine', 'Mobile Engine (5)'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  soundEngine.playSfx('ui_tab');
                  setKeyword(k);
                }}
                className={`touch-btn rounded-lg border px-3 font-bold ${
                  keyword === k
                    ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                    : 'border-(--border) bg-(--surface-2) text-(--text)'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {KEYWORD_TOP5_REPOS[keyword].map((repo) => (
            <div key={repo.name} className="rounded-xl border border-(--border) bg-(--surface-2) p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-(--text)">{repo.name}</span>
                <span className="font-mono-num text-[11px] text-(--muted)">{repo.license}</span>
              </div>
              <div className="mt-1 text-(--muted)">{repo.what}</div>
              <div className="mt-1.5 font-semibold text-(--accent)">Adopted: {repo.adapt}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
