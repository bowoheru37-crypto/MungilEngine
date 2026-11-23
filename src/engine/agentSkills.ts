/**
 * Multi-Platform AI Agent & Complete Engine Skills Exporter (Mungil Engine V7).
 * Installable instruction sets & skill packs for:
 * - Claude Code / Anthropic (.claude/skills/mungil-engine/SKILL.md + CLAUDE.md)
 * - Gemini CLI / AI Studio (GEMINI.md + skills/mungil-engine/SKILL.md)
 * - Grok (GROK_INSTRUCTIONS.md)
 * - Qwen Agent / Qwen-Coder (QWEN_AGENT.md)
 * - Universal AGENTS.md + MCP Tool JSON Manifest
 */

import type { AgentPlatformId, AgentSkillFile } from './types';

const CORE_ENGINE_SKILL_BODY = `# Mungil Engine V7 — Complete Mobile & Pseudo-3D Game Development Skill

## 1. Core Architecture & Performance Contracts (Itel A70 / Low-Entry Android)
- Fixed-timestep simulation loop: 1/30s (Eco), 1/60s (Mid/HD), clamped dt <= 0.05s, max 3 catch-up steps.
- Zero-GC SoA ECS (\`SoAWorld\`): TypedArrays (\`Float32Array\`, \`Uint16Array\`) with O(1) free-list & dense active list.
- Particle ring buffer (\`ParticlePool\`, 160 slots): update in-place, never allocate inside \`requestAnimationFrame\`.
- Dynamic resolution scaling via EMA frame-time tracking (0.60x–1.00x) with >24px resize hysteresis.
- Asset Manager (\`AssetManager\`): Ref-counted LRU eviction under 2 MB Eco / 4 MB Standard budget. Unload prior level biomes automatically via \`assetManager.loadLevelBundle(level)\`.

## 2. Procedural 2D / 2.5D / Fake-3D Rendering APIs
- \`drawBowoCharacter(ctx, x, y, size, style, opts)\`: Supports 8 animation states (\`idle | walk | jump | fall | attack | dash | hurt | ko\`) across all 12 Art Styles and \`3D-Stack\` pseudo-3D depth layering.
- \`drawCharacter3DStack(...)\`: Zdog + Sprite-Stack layered torso prism + yaw shading + articulated sword arc.
- \`renderRaycastCorridor(...)\`: Cleanroom DDA column raycaster with distance fog.
- \`renderMode7Horizon(...)\`: Scanline perspective ground strip projection.
- \`renderVoxelHeightmapTerrain(...)\`: Column heightmap ray-marching for 2D/3D terrains.

## 3. Procedural Audio (Zero-KB Footprint)
- \`soundEngine.startTracker(level)\`: 3-channel Web Audio tracker (lead + bass + kick/hi-hat) per level (1–3).
- \`soundEngine.playSfx(kind, panX)\`: Movement (\`footstep\`, \`land\`, \`jump\`, \`dash\`), Combat (\`attack\`, \`hit\`, \`parry\`, \`burst\`, \`hurt\`, \`potion\`), Game Events (\`coin\`, \`shard\`, \`switch\`, \`gate\`, \`boss_phase\`, \`level_clear\`, \`victory\`, \`gameover\`), and UI (\`ui_click\`, \`ui_tab\`, \`ui_toggle\`).

## 4. Procedural Generators & Bytecode VM
- \`generateCharacter(seed, dim, archetype)\`, \`generateMusicTrack(seed, scale, bpm)\`, \`generateSfxSpec(seed, preset)\`
- \`generateCutsceneSpec(seed, weather)\`, \`generateTerrainSpec(seed, mode, biome)\`, \`generatePropAsset(seed, kind)\`
- \`compileBytecode(src)\` & \`runBytecodeVm(words)\`: 16-bit \`short[]\` VM with \`Int32Array(16)\` registers.
- \`MungilE\` 1-line API: \`E.create\`, \`E.move\`, \`E.on\`, \`E.playSound\`, \`E.setMode\`, \`E.setPhysics\`, \`E.cameraShake\`.

## 5. Verification Checklist Before Shipping
1. Run \`npx --yes tsx --test src/game/rules.test.ts\` (0 failures).
2. Keep heap <= 48 MB, draw passes <= 24/frame, touch targets >= 44px, and offline PWA cache active.
3. Preserve all existing constructors and public exports when extending engine modules.
`;

export function buildAgentSkillPack(): AgentSkillFile[] {
  return [
    {
      filename: 'CLAUDE.md',
      platform: 'claude',
      title: 'Claude Code Project Instructions + Skill Loader',
      summary: 'Place in project root or ~/.claude/skills/mungil-engine/SKILL.md for Claude Code & Claude Desktop.',
      content: `# CLAUDE.md — Mungil Engine V7 Agent Guide

When building, optimizing, or extending games in this workspace:
- Always preserve existing engine constructors (\`SoAWorld\`, \`AssetManager\`, \`SoundEngine\`, \`MungilEngineApi\`).
- Target low-entry mobile Android (Itel A70): <= 24 draw calls/frame, <= 48 MB heap, >= 44px touch hitboxes, zero \`backdrop-filter\` over live canvas.
- Load \`src/engine/assetManager.ts\` level bundles before spawning biomes and unload unused scenes cleanly.
- Verify logic changes with \`npx --yes tsx --test src/game/rules.test.ts\` and \`npm run build\`.

---
${CORE_ENGINE_SKILL_BODY}`,
    },
    {
      filename: 'GEMINI.md',
      platform: 'gemini',
      title: 'Gemini CLI & AI Studio Skill Definition',
      summary: 'Place in project root as GEMINI.md or .gemini/skills/mungil-engine/SKILL.md.',
      content: `---
name: mungil-engine-v7
description: Mobile-first 2D, 2.5D, and Pseudo-3D game engine skill for Itel A70 optimization, SoA ECS, AssetManager, Web Audio synthesis, and procedural generators.
---

# GEMINI.md — Mungil Engine V7 Agent Instructions

1. Inspect \`src/engine/\` modules before editing; extend cleanly without breaking existing exports.
2. Route 2D/3D characters through \`drawBowoCharacter\` / \`drawCharacter3DStack\` and terrains through \`renderMode7Horizon\` / \`renderVoxelHeightmapTerrain\`.
3. Attach \`soundEngine.playSfx\` to every movement, UI interaction, and level/boss event.
4. Ensure responsive mobile layouts (390px) and desktop layouts (1440px) have zero horizontal overflow.

${CORE_ENGINE_SKILL_BODY}`,
    },
    {
      filename: 'GROK_INSTRUCTIONS.md',
      platform: 'grok',
      title: 'Grok Custom System Instructions & Engine Rules',
      summary: 'Paste into Grok Workspaces / Custom Instructions for Mungil Engine V7 game synthesis.',
      content: `# Grok Agent Instructions — Mungil Engine V7

You are a senior mobile & Web game engine engineer specializing in ultra-lightweight 2D, 2.5D, and Fake-3D Canvas architectures.

## Strict Coding Directives
- Never import heavy desktop WebGL libraries when \`src/engine/pseudo3d.ts\` (\`drawCharacter3DStack\`, \`renderRaycastCorridor\`, \`renderMode7Horizon\`, \`renderVoxelHeightmapTerrain\`) solves the visual effect in Canvas 2D with <24 draw calls.
- Keep zero-allocation loops: mutate pre-allocated TypedArrays in \`SoAWorld\` and \`ParticlePool\`.
- Always pair visual feedback with \`soundEngine.playSfx\` and \`assetManager.loadLevelBundle\`.

${CORE_ENGINE_SKILL_BODY}`,
    },
    {
      filename: 'QWEN_AGENT.md',
      platform: 'qwen',
      title: 'Qwen-Coder / Qwen Agent Tooling & Skill Spec',
      summary: 'Compatible with Qwen-Agent, Cline/RooCode, and Qwen3-Coder workspace rules.',
      content: `# QWEN_AGENT.md — Mungil Engine V7 Specification

\`\`\`yaml
agent_name: mungil-v7-game-architect
runtime_target: android_low_entry_itel_a70
fps_budget: 30-60
memory_budget_mb: 48
skills:
  - soa_ecs_zero_gc
  - pseudo3d_sprite_stack_raycast
  - procedural_audio_4ch_tracker
  - asset_manager_lru_unload
  - procedural_character_terrain_video_generators
\`\`\`

${CORE_ENGINE_SKILL_BODY}`,
    },
    {
      filename: 'AGENTS.md',
      platform: 'universal',
      title: 'Universal AGENTS.md + MCP Tool Manifest (JSON)',
      summary: 'Standard AGENTS.md + JSON tool schema usable across Claude, Gemini, Grok, Qwen, Codex, and Cursor.',
      content: `# AGENTS.md — Universal AI Agent Contract (Mungil Engine V7)

Works across Claude, Gemini, Grok, Qwen, OpenAI Codex, Cursor, and Windsurf.

## Available Engine MCP / Tool Commands
\`\`\`json
{
  "tools": [
    { "name": "asset_load_level", "params": { "level": "1 | 2 | 3" }, "returns": "AssetManagerStats" },
    { "name": "gen_character", "params": { "seed": "number", "dimension": "2D | 3D-Stack" }, "returns": "GeneratedCharacterSpec" },
    { "name": "gen_music", "params": { "seed": "number", "scale": "pentatonic | dorian | phrygian", "bpm": "number" } },
    { "name": "gen_sfx", "params": { "seed": "number", "preset": "jump | slash | coin | laser | impact | ui_chime" } },
    { "name": "gen_cutscene", "params": { "seed": "number", "weather": "Cerah | Hujan | Salju" } },
    { "name": "gen_terrain", "params": { "seed": "number", "mode": "2D | 3D-Heightmap", "biome": "meadow | storm | obsidian" } }
  ]
}
\`\`\`

${CORE_ENGINE_SKILL_BODY}`,
    },
  ];
}

export function getInstallCommandSnippet(platform: AgentPlatformId): string {
  switch (platform) {
    case 'claude':
      return 'mkdir -p .claude/skills/mungil-engine && cp CLAUDE.md .claude/skills/mungil-engine/SKILL.md';
    case 'gemini':
      return 'mkdir -p .gemini/skills/mungil-engine && cp GEMINI.md .gemini/skills/mungil-engine/SKILL.md';
    case 'grok':
      return '# Copy GROK_INSTRUCTIONS.md into Grok Project / System Instructions';
    case 'qwen':
      return 'mkdir -p .qwen/skills && cp QWEN_AGENT.md .qwen/skills/mungil-engine.md';
    case 'universal':
    default:
      return 'cp AGENTS.md ./AGENTS.md';
  }
}

export function exportFullAgentBundleJson(): string {
  const files = buildAgentSkillPack();
  return JSON.stringify(
    {
      bundle: 'Mungil-Engine-V7-AI-Agent-Skills',
      version: '7.1.0',
      platforms: ['claude', 'gemini', 'grok', 'qwen', 'universal'],
      files,
    },
    null,
    2
  );
}
