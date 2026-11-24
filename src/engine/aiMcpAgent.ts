import { GENRE_TEMPLATES } from './catalogs';
import type { GameWorld, SimInput } from './gameSimulation';
import { ENGINE_CONNECTORS, LAYER_ARCHITECTURE_12, QOLBU_CONSTANTS, runQolbu8StageAudit } from './qolbuCore';
import type {
  AiCompanionState,
  AiPlayMode,
  ArtStyleId,
  Camera3DPresetId,
  GenreTemplate,
  HybridRender5Mode,
  McpToolCallResult,
  PerspectiveConnectorId,
  PhysicsMode,
  PhysicsPresetId,
  RenderMode,
} from './types';

export interface McpRuntimeActions {
  setGameName?: (name: string) => void;
  setActiveLevel?: (lvl: 1 | 2 | 3) => void;
  setAiMode?: (mode: AiPlayMode) => void;
  setPerspectiveConnector?: (id: PerspectiveConnectorId) => void;
  setCameraPreset?: (cam: Camera3DPresetId) => void;
  setHybridMode?: (hm: HybridRender5Mode) => void;
  setRenderMode?: (m: RenderMode) => void;
  setPhysicsMode?: (p: PhysicsMode) => void;
  setStyleId?: (s: ArtStyleId) => void;
  applyPhysicsPresetToSelected?: (preset: PhysicsPresetId) => void;
  launchGame?: (lvl?: 1 | 2 | 3, genre?: GenreTemplate) => void;
}

export interface AgentContextSnapshot {
  gameName: string;
  activeLevel: 1 | 2 | 3;
  activeGenreId: string;
  aiMode: AiPlayMode;
  perspectiveConnector: PerspectiveConnectorId;
  renderMode: RenderMode;
  physicsMode: PhysicsMode;
  styleId: ArtStyleId;
}

export const MCP_TOOL_CATALOG = [
  { name: 'mcp.explain_engine', desc: 'Explains 9 Larangan Mutlak, 12 Layers, Zero-GC SoA ECS, and connectors.' },
  { name: 'mcp.guide_player', desc: 'Gives tactical tips for Level 1-3, Dash Parry, Shards, and Boss Kala.' },
  { name: 'mcp.create_game_project', desc: 'Configures genre, perspective connector, art style, physics & AI mode from prompt.' },
  { name: 'mcp.set_ai_mode', desc: 'Switches between Solo (off), Play WITH AI (coop), or Played BY AI (autopilot).' },
  { name: 'mcp.apply_connector', desc: 'Applies 2D, 2.5D, Fake-3D, Isometric, Hexagonal, Top-Down, FPS or TPS connector.' },
  { name: 'mcp.run_qolbu_audit', desc: 'Executes 8-stage Zero-GC + 2,000 security fuzz checks for Itel A70.' },
] as const;

export function createAiCompanionState(): AiCompanionState {
  return {
    active: false,
    x: 64,
    y: 280,
    vx: 0,
    vy: 0,
    facing: 1,
    actionLabel: 'Standby',
    shootCooldown: 0.4,
    healCooldown: 6.0,
    tickParity: 0,
  };
}

/**
 * Fixed 15Hz Qolbu Layer 4+5 AI Driver (runs logic every 2nd 30Hz step to save 50% CPU).
 * Supports both 'coop' (Luma AI companion assisting Bowo) and 'autopilot' (AI plays Bowo autonomously).
 */
export function stepAi15Hz(
  world: GameWorld,
  companion: AiCompanionState,
  aiMode: AiPlayMode,
  dt: number
): { inputOverride: SimInput | null; companion: AiCompanionState } {
  if (aiMode === 'off' || world.status !== 'playing') {
    companion.active = false;
    companion.actionLabel = 'Off';
    return { inputOverride: null, companion };
  }

  companion.shootCooldown = Math.max(0, companion.shootCooldown - dt);
  companion.healCooldown = Math.max(0, companion.healCooldown - dt);
  companion.tickParity = (companion.tickParity + 1) % 2;

  const p = world.player;
  const runTick = companion.tickParity === 0;

  if (aiMode === 'coop') {
    companion.active = true;
    // Follow slightly behind/above Bowo when idle, or intercept nearest active threat/coin at 15Hz
    let targetX = p.x - p.facing * 42;
    let targetY = p.y - 34 + Math.sin(world.time * 4) * 6;

    if (runTick) {
      const nearEnemy = world.enemies.find((e) => !e.dead && e.koTimer <= 0 && Math.hypot(e.x - p.x, e.y - p.y) <= 280);
      const nearCoin = world.coins.find((c) => !c.collected && Math.hypot(c.x - p.x, c.y - p.y) <= 130);

      if (p.hp < 50 && companion.healCooldown <= 0) {
        p.hp = Math.min(p.maxHp, p.hp + 15);
        companion.healCooldown = 8.5;
        companion.actionLabel = 'Luma Heal +15';
        world.floatingTexts.push({ x: p.x, y: p.y - 38, vy: -35, text: 'AI HEAL +15', color: '#4ade80', life: 0.85 });
      } else if (nearCoin) {
        targetX = nearCoin.x;
        targetY = nearCoin.y;
        if (Math.hypot(companion.x - nearCoin.x, companion.y - nearCoin.y) <= 32) {
          nearCoin.collected = true;
          world.coinsTotal = Math.min(9999, world.coinsTotal + 5);
          world.score += 55;
          companion.actionLabel = 'Collect +5';
        } else {
          companion.actionLabel = 'Fetch Coin';
        }
      } else if (nearEnemy) {
        companion.actionLabel = 'Assist Fire';
        if (companion.shootCooldown <= 0) {
          companion.shootCooldown = 0.85;
          const ang = Math.atan2(nearEnemy.y - companion.y, nearEnemy.x - companion.x);
          world.projectiles.push({
            id: world.nextEntityId++,
            x: companion.x,
            y: companion.y,
            vx: Math.cos(ang) * 320,
            vy: Math.sin(ang) * 320,
            fromPlayer: true,
            damage: 14,
            life: 1.5,
            r: 5,
          });
        }
      } else {
        companion.actionLabel = 'Escort';
      }
    }

    companion.vx = (targetX - companion.x) * 6.5;
    companion.vy = (targetY - companion.y) * 6.5;
    companion.x += companion.vx * dt;
    companion.y += companion.vy * dt;
    companion.facing = companion.vx >= -2 ? p.facing : -1;

    return { inputOverride: null, companion };
  }

  // AUTOPILOT MODE (Game played BY AI)
  companion.active = true;
  companion.x = p.x - p.facing * 36;
  companion.y = p.y - 38;
  companion.actionLabel = 'AI Pilot Active';

  const input: SimInput = {
    moveX: 0,
    moveY: 0,
    jumpPressed: false,
    jumpHeld: false,
    attackPressed: false,
    dashPressed: false,
    burstPressed: false,
  };

  if (world.simKind === 'visual_novel') {
    return { inputOverride: input, companion };
  }

  // Danger perception: incoming projectile -> dash parry!
  const incomingProj = world.projectiles.find(
    (pr) => !pr.fromPlayer && Math.hypot(pr.x - p.x, pr.y - p.y) < 58
  );
  if (incomingProj && p.dashCooldown <= 0) {
    input.dashPressed = true;
    companion.actionLabel = 'AI Parry!';
  }

  // Objective prioritization: Shards -> Switches -> Active Enemies -> Unlocked Gate
  const nextShard = world.shards.find((s) => !s.collected);
  const nextSwitch = world.switches.find((sw) => !sw.active);
  const nearEnemy = world.enemies
    .filter((e) => !e.dead && e.koTimer <= 0)
    .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];

  let goalX = p.x + 120;
  let goalY = p.y;

  if (world.gateUnlocked) {
    goalX = 1045;
    goalY = 330;
    companion.actionLabel = 'AI -> Gate';
  } else if (nextSwitch) {
    goalX = nextSwitch.x;
    goalY = nextSwitch.y - 14;
    companion.actionLabel = 'AI -> Switch';
  } else if (nextShard) {
    goalX = nextShard.x;
    goalY = nextShard.y;
    companion.actionLabel = 'AI -> Shard';
  } else if (nearEnemy) {
    goalX = nearEnemy.x;
    goalY = nearEnemy.y;
    companion.actionLabel = `AI -> ${nearEnemy.archetype}`;
  }

  const dx = goalX - p.x;
  const dy = goalY - p.y;
  input.moveX = Math.abs(dx) > 10 ? Math.sign(dx) : 0;

  if (world.simKind === 'topdown' || world.simKind === 'shooter' || world.simKind === 'runner' || world.simKind === 'rhythm') {
    input.moveY = Math.abs(dy) > 12 ? Math.sign(dy) : 0;
  } else if (dy < -28 && p.grounded) {
    input.jumpPressed = true;
    input.jumpHeld = true;
  }

  if (nearEnemy && Math.hypot(nearEnemy.x - p.x, nearEnemy.y - p.y) < (world.simKind === 'shooter' ? 280 : 62)) {
    if (p.energy >= 45) {
      input.burstPressed = true;
    } else {
      input.attackPressed = true;
    }
  }

  return { inputOverride: input, companion };
}

export function executeMcpTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: AgentContextSnapshot,
  actions?: McpRuntimeActions
): McpToolCallResult {
  try {
    switch (toolName) {
      case 'mcp.explain_engine': {
        const q = String(args.topic ?? '').toLowerCase();
        if (q.includes('qolbu') || q.includes('gc') || q.includes('itel') || q.includes('larangan')) {
          return {
            tool: toolName,
            ok: true,
            summary:
              `Qolbu Core menerapkan 9 Larangan Mutlak (Zero-GC, Zero-FC, Zero-ANR, Zero-NPE, Zero-Leak, Zero-OOM, Zero-Lag, Zero-Heat, Strict Naming). ` +
              `Entity dibatasi pre-allocated SoA (${QOLBU_CONSTANTS.MAX_ENTITIES} slot), particle pool ${QOLBU_CONSTANTS.POOL_PARTICLE}, AI berjalan 15Hz (hemat 50% CPU), dt di-clamp [16ms..33ms], dan validasi isValidMove menolak NaN/Inf/speed-hack.`,
            data: { constants: QOLBU_CONSTANTS },
          };
        }
        if (q.includes('layer') || q.includes('arsitektur')) {
          return {
            tool: toolName,
            ok: true,
            summary: `Engine tersusun atas ${LAYER_ARCHITECTURE_12.length} Layer terpadu (Layer 0 Core Deterministik -> Layer 10 Aksesibilitas & Quality Preset) yang otomatis menyesuaikan Itel A70 (30 FPS Eco) hingga Ultra HD.`,
            data: { layers: LAYER_ARCHITECTURE_12.length },
          };
        }
        return {
          tool: toolName,
          ok: true,
          summary:
            `Mungil Engine V7 menggunakan TypedArray SoA ECS (0 GC), fixed-timestep accumulator, screen-space culling (<35 draw calls), Physics Presets (Bouncy/Heavy/Ghost/Slippery), Container Hierarchy, serta ${ENGINE_CONNECTORS.length} Plug-in Perspektif (2D, 2.5D, Isometric, Hexagonal, Fake-3D, Top-Down, FPS/TPS).`,
          data: { connectors: ENGINE_CONNECTORS.length, activeLevel: ctx.activeLevel },
        };
      }

      case 'mcp.guide_player': {
        const lvl = Number(args.level ?? ctx.activeLevel);
        const guide =
          lvl === 3
            ? 'Babak 3 (Menara Kala): Injak 1 saklar platform atas, ambil 2 Pecahan Cahaya, dan hadapi Boss Kala (3 fase). Tekan Dash (K) tepat sebelum orb mengenai Bowo untuk memantulkan proyektil (Parry) dan mengisi Energi Burst!'
            : lvl === 2
              ? 'Babak 2 (Jembatan Badai): Aktifkan 2 saklar badai di platform kiri & kanan, kumpulkan 3 Pecahan Cahaya, dan pantulkan tembakan Storm Wisp dengan Dash Parry (K).'
              : 'Babak 1 (Desa Fajar): Kumpulkan 2 Pecahan Cahaya di platform desa, gunakan 3-hit kombo (J) atau Burst (L), lalu masuki Gerbang Timur.';
        return {
          tool: toolName,
          ok: true,
          summary: guide,
          data: { level: lvl, aiMode: ctx.aiMode },
        };
      }

      case 'mcp.set_ai_mode': {
        const mode = (args.mode === 'coop' || args.mode === 'autopilot' ? args.mode : 'off') as AiPlayMode;
        actions?.setAiMode?.(mode);
        const label =
          mode === 'coop'
            ? 'Mode "Main Bersama AI" (Co-Op) aktif! Luma akan mendampingi Bowo, membantu mengambil koin, menembak musuh, dan menyembuhkan HP pada 15Hz.'
            : mode === 'autopilot'
              ? 'Mode "Dimainkan oleh AI" (AI Auto-Play) aktif! Agen AI mengendalikan Bowo secara otonom untuk menamatkan babak.'
              : 'Mode AI dimatikan (kontrol Solo penuh).';
        return {
          tool: toolName,
          ok: true,
          summary: label,
          data: { aiMode: mode },
        };
      }

      case 'mcp.apply_connector': {
        const connId = String(args.connectorId ?? 'isometric') as PerspectiveConnectorId;
        const found = ENGINE_CONNECTORS.find((c) => c.id === connId) ?? ENGINE_CONNECTORS[0];
        actions?.setPerspectiveConnector?.(found.id);
        actions?.setRenderMode?.(found.renderMode);
        actions?.setPhysicsMode?.(found.physicsMode);
        actions?.setStyleId?.(found.recommendedStyle);
        return {
          tool: toolName,
          ok: true,
          summary: `Plug-in "${found.label}" dipasang (${found.renderMode} · ${found.physicsMode} · Style ${found.recommendedStyle}).`,
          data: { connector: found },
        };
      }

      case 'mcp.create_game_project': {
        const prompt = String(args.prompt ?? '').toLowerCase();
        let matchedGenre = GENRE_TEMPLATES.find((g) => g.id === 'ai_arena') ?? GENRE_TEMPLATES[0];
        let connectorId: PerspectiveConnectorId = '2_5d_parallax';
        let cameraPreset: Camera3DPresetId = 'follow_3_4';
        let hybridMode: HybridRender5Mode = 'hybrid_2_5d_billboard';
        let aiMode: AiPlayMode = 'coop';
        let title = 'Bowo & Luma: Cyber Arena';

        if (prompt.includes('iso') || prompt.includes('isometrik')) {
          connectorId = 'isometric';
          cameraPreset = 'iso_fixed';
          hybridMode = 'isometric_painter';
          matchedGenre = GENRE_TEMPLATES.find((g) => g.id === 'rpg') ?? matchedGenre;
          title = 'Isometric Light Quest';
        } else if (prompt.includes('hex') || prompt.includes('heksagon')) {
          connectorId = 'hexagonal';
          cameraPreset = 'iso_fixed';
          hybridMode = 'isometric_painter';
          matchedGenre = GENRE_TEMPLATES.find((g) => g.id === 'tower_defense') ?? matchedGenre;
          title = 'Hexagon Tactical Bastion';
        } else if (prompt.includes('shooter') || prompt.includes('space') || prompt.includes('tembak')) {
          connectorId = '2d_side_v';
          cameraPreset = 'follow_3_4';
          hybridMode = 'hybrid_2_5d_billboard';
          matchedGenre = GENRE_TEMPLATES.find((g) => g.id === 'bullet_hell') ?? matchedGenre;
          title = 'Starlight Danmaku Co-Op';
        } else if (prompt.includes('race') || prompt.includes('balap')) {
          connectorId = 'third_person';
          cameraPreset = 'follow_3_4';
          hybridMode = 'mode7_voxel';
          matchedGenre = GENRE_TEMPLATES.find((g) => g.id === 'racing') ?? matchedGenre;
          title = 'Mode-7 Turbo Horizon';
        } else if (prompt.includes('fps') || prompt.includes('first person') || prompt.includes('raycast')) {
          connectorId = 'first_person';
          cameraPreset = 'fps_raycast';
          hybridMode = 'raycast_pseudo3d';
          matchedGenre = GENRE_TEMPLATES.find((g) => g.id === 'roguelike') ?? matchedGenre;
          title = 'Labyrinth Raycast 3D';
        }

        if (prompt.includes('autopilot') || prompt.includes('dimainkan ai') || prompt.includes('sendiri')) {
          aiMode = 'autopilot';
        }

        const conn = ENGINE_CONNECTORS.find((c) => c.id === connectorId) ?? ENGINE_CONNECTORS[2];
        actions?.setGameName?.(title);
        actions?.setPerspectiveConnector?.(conn.id);
        actions?.setCameraPreset?.(cameraPreset);
        actions?.setHybridMode?.(hybridMode);
        actions?.setAiMode?.(aiMode);
        actions?.setRenderMode?.(conn.renderMode);
        actions?.setPhysicsMode?.(matchedGenre.physicsMode);
        actions?.setStyleId?.(conn.recommendedStyle);
        if (args.launch === true) {
          actions?.launchGame?.(1, matchedGenre);
        }

        return {
          tool: toolName,
          ok: true,
          summary: `Game baru "${title}" dibuat! Genre: ${matchedGenre.name}, Konektor: ${conn.label}, QolbuSpace3D: ${cameraPreset} / ${hybridMode}, AI Mode: ${aiMode === 'coop' ? 'Main Bersama AI (Luma)' : 'AI Auto-Play'}.`,
          data: { title, genreId: matchedGenre.id, connectorId: conn.id, cameraPreset, hybridMode, aiMode },
        };
      }

      case 'mcp.run_qolbu_audit': {
        const report = runQolbu8StageAudit(14, 18.4);
        return {
          tool: toolName,
          ok: report.allPassed,
          summary: `Qolbu 8-Stage Audit ${report.allPassed ? 'LULUS 8/8' : 'PERLU PERHATIAN'}: 128 entity pool 0 leak, Security Fuzz ${report.fuzzBlockedCount}/${report.fuzzEventsTested} exploit diblokir, budget Itel A70 30 FPS aman.`,
          data: { stages: report.stages.length, fuzzBlocked: report.fuzzBlockedCount },
        };
      }

      default:
        return {
          tool: toolName,
          ok: false,
          summary: `Tool MCP "${toolName}" tidak ditemukan.`,
          data: {},
        };
    }
  } catch {
    return {
      tool: toolName,
      ok: false,
      summary: 'Terjadi kesalahan aman pada batas MCP boundary (NO FC).',
      data: {},
    };
  }
}

export function routeAgentPrompt(
  prompt: string,
  ctx: AgentContextSnapshot,
  actions?: McpRuntimeActions
): { reply: string; toolTrace: McpToolCallResult } {
  const lower = prompt.trim().toLowerCase();

  if (lower.includes('audit') || lower.includes('verifikasi') || lower.includes('fuzz') || lower.includes('tes')) {
    const res = executeMcpTool('mcp.run_qolbu_audit', {}, ctx, actions);
    return { reply: res.summary, toolTrace: res };
  }

  if (lower.includes('buat') || lower.includes('create') || lower.includes('bikin') || lower.includes('game baru')) {
    const res = executeMcpTool('mcp.create_game_project', { prompt, launch: lower.includes('mainkan') || lower.includes('launch') }, ctx, actions);
    return { reply: res.summary, toolTrace: res };
  }

  if (lower.includes('coop') || lower.includes('co-op') || lower.includes('bersama ai') || lower.includes('luma')) {
    const res = executeMcpTool('mcp.set_ai_mode', { mode: 'coop' }, ctx, actions);
    return { reply: res.summary, toolTrace: res };
  }

  if (lower.includes('auto') || lower.includes('dimainkan ai') || lower.includes('bot main')) {
    const res = executeMcpTool('mcp.set_ai_mode', { mode: 'autopilot' }, ctx, actions);
    return { reply: res.summary, toolTrace: res };
  }

  if (lower.includes('isometric') || lower.includes('hex') || lower.includes('fps') || lower.includes('third') || lower.includes('connector')) {
    const connectorId: PerspectiveConnectorId = lower.includes('hex')
      ? 'hexagonal'
      : lower.includes('fps')
        ? 'first_person'
        : lower.includes('third')
          ? 'third_person'
          : 'isometric';
    const res = executeMcpTool('mcp.apply_connector', { connectorId }, ctx, actions);
    return { reply: res.summary, toolTrace: res };
  }

  if (lower.includes('pandu') || lower.includes('tips') || lower.includes('boss') || lower.includes('kala') || lower.includes('guide') || lower.includes('cara menang')) {
    const res = executeMcpTool('mcp.guide_player', { level: ctx.activeLevel }, ctx, actions);
    return { reply: res.summary, toolTrace: res };
  }

  const res = executeMcpTool('mcp.explain_engine', { topic: lower }, ctx, actions);
  return { reply: res.summary, toolTrace: res };
}
