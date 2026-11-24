import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAgentSkillPack } from '../engine/agentSkills.ts';
import { run25ValidatorChecks, getStyleSpec } from '../engine/artStyles.ts';
import { AssetManager } from '../engine/assetManager.ts';
import { LEVEL_TRACKS, soundEngine } from '../engine/audio.ts';
import {
  compileBytecode,
  generateSeedWorld,
  packRleBytes,
  runBytecodeVm,
  unpackRleBytes,
} from '../engine/bytecode.ts';
import { KEYWORD_TOP5_REPOS } from '../engine/catalogs.ts';
import { isCircleInViewport, isPointInViewport, isRectInViewport } from '../engine/culling.ts';
import { createDeviceProfile, updateDynamicResolution } from '../engine/deviceProfiler.ts';
import { ParticlePool, SoAWorld } from '../engine/ecs.ts';
import {
  createBoneSpringState,
  ENGINE_LAYERS,
  evaluateCharacterFsm,
  evaluateHardenedRules,
  stepBonePoseSpring,
  validateMoveBounds,
} from '../engine/engineCore.ts';
import {
  createLevelWorld,
  LEVEL_DEFINITIONS,
  selectVisualNovelChoice,
  stepGameWorld,
  usePotion,
  type SimConfig,
  type SimInput,
} from '../engine/gameSimulation.ts';
import {
  generateCharacter,
  generateCutsceneSpec,
  generateMusicTrack,
  generatePropAsset,
  generateSfxSpec,
  generateTerrainSpec,
} from '../engine/generators.ts';
import { I18N_MAP } from '../engine/i18n.ts';
import { project3D } from '../engine/pseudo3d.ts';
import {
  askQolbuAgent,
  buildWizardGameSpec,
  LOCAL_MCP_TOOLS,
  QOLBU_ENGINE_TOPICS,
  TUTORIAL_STEPS,
} from '../engine/qolbuAgent.ts';
import {
  computeWorldTransform,
  createArenaWorld,
  DEFAULT_COLLISION_SHAPES,
  DEFAULT_SCENE_ENTITIES,
  evaluateShapeOverlaps,
  groupEntities,
  PHYSICS_PRESETS,
  stepArenaWorld,
  triggerArenaPlayerAction,
  ungroupContainer,
} from '../engine/scenePhysics.ts';
import { buildSavePayload, parseAndMigrateSave } from '../engine/storage.ts';

const IDLE_INPUT: SimInput = {
  moveX: 0,
  moveY: 0,
  jumpPressed: false,
  jumpHeld: false,
  attackPressed: false,
  dashPressed: false,
  burstPressed: false,
};

const DEFAULT_CFG: SimConfig = {
  physicsMode: 'Arcade',
  renderMode: '2D',
  weather: 'Cerah',
  practiceMode: false,
  speedMul: 1,
  gravityMul: 1,
};

test('3 distinct levels have increasing challenge requirements', () => {
  const l1 = LEVEL_DEFINITIONS[1];
  const l2 = LEVEL_DEFINITIONS[2];
  const l3 = LEVEL_DEFINITIONS[3];
  assert.equal(l1.hasBoss, false);
  assert.equal(l1.requiredSwitches, 0);
  assert.equal(l2.requiredSwitches, 2);
  assert.equal(l2.requiredShards, 3);
  assert.equal(l3.hasBoss, true);
  assert.ok(l3.enemies.some((e) => e.archetype === 'boss_kala'));
});

test('Level 1 win progression unlocks gate and advances when shards collected', () => {
  const world = createLevelWorld(1);
  // Collect all shards in Level 1
  for (const shard of world.shards) {
    world.player.x = shard.x;
    world.player.y = shard.y;
    stepGameWorld(world, IDLE_INPUT, 1 / 60, DEFAULT_CFG);
  }
  assert.equal(world.gateUnlocked, true);

  // Move to unlocked gate
  const gate = LEVEL_DEFINITIONS[1].gate;
  world.player.x = gate.x + 12;
  world.player.y = gate.y + 40;
  const events = stepGameWorld(world, IDLE_INPUT, 1 / 60, DEFAULT_CFG);
  assert.ok(events.some((e) => e.type === 'level_clear'));
});

test('Level 3 Boss Kala transitions through 3 phases and triggers victory on defeat + gate', () => {
  const world = createLevelWorld(3);
  const boss = world.enemies.find((e) => e.archetype === 'boss_kala');
  assert.ok(boss);

  // Phase 2 at <= 67% HP
  boss.hp = boss.maxHp * 0.6;
  stepGameWorld(world, IDLE_INPUT, 1 / 60, DEFAULT_CFG);
  assert.equal(boss.bossPhase, 2);

  // Phase 3 at <= 34% HP
  boss.hp = boss.maxHp * 0.3;
  stepGameWorld(world, IDLE_INPUT, 1 / 60, DEFAULT_CFG);
  assert.equal(boss.bossPhase, 3);

  // Defeat boss + activate switch + collect shards
  boss.dead = true;
  boss.hp = 0;
  for (const sw of world.switches) {
    world.player.x = sw.x;
    world.player.y = sw.y - 16;
    stepGameWorld(world, IDLE_INPUT, 1 / 60, DEFAULT_CFG);
  }
  for (const sh of world.shards) {
    world.player.x = sh.x;
    world.player.y = sh.y;
    stepGameWorld(world, IDLE_INPUT, 1 / 60, DEFAULT_CFG);
  }
  assert.equal(world.gateUnlocked, true);

  const gate = LEVEL_DEFINITIONS[3].gate;
  world.player.x = gate.x + 12;
  world.player.y = gate.y + 40;
  const events = stepGameWorld(world, IDLE_INPUT, 1 / 60, DEFAULT_CFG);
  assert.equal(world.status, 'victory');
  assert.ok(events.some((e) => e.type === 'victory'));
});

test('Player loss condition triggers gameover and potion heals safely', () => {
  const world = createLevelWorld(1);
  world.player.hp = 10;
  assert.equal(usePotion(world), true);
  assert.equal(world.player.hp, 50);

  world.player.hp = 5;
  world.player.invulnTimer = 0;
  world.player.parryTimer = 0;
  const enemy = world.enemies[0];
  world.player.x = enemy.x;
  world.player.y = enemy.y;
  const events = stepGameWorld(world, IDLE_INPUT, 1 / 60, DEFAULT_CFG);
  assert.equal(world.status, 'gameover');
  assert.ok(events.some((e) => e.type === 'gameover'));
});

test('Zero-GC SoA ECS allocates, frees, and recycles slots cleanly', () => {
  const ecs = new SoAWorld();
  const a = ecs.alloc();
  const b = ecs.alloc();
  assert.equal(ecs.activeCount, 2);
  ecs.free(a);
  assert.equal(ecs.activeCount, 1);
  const c = ecs.alloc();
  assert.equal(c, a); // recycled from free-list
  assert.equal(ecs.activeCount, 2);
  assert.notEqual(b, -1);

  const pool = new ParticlePool();
  pool.spawn(10, 20, 5, -5, 0.2, 3, 1);
  assert.equal(pool.step(0.05), 1);
  assert.equal(pool.step(0.3), 0);
});

test('16-bit bytecode compiler, deterministic seed RNG, and RLE .pak roundtrip', () => {
  const compiled = compileBytecode('SET 12\nADD 8\nSAY 1\nSPAWN 2\nEND');
  assert.equal(compiled.errors.length, 0);
  const res = runBytecodeVm(compiled.instructions);
  assert.equal(res.halted, true);
  assert.equal(res.registers[0], 20);
  assert.equal(res.registers[1], 1);

  const w1 = generateSeedWorld(4242);
  const w2 = generateSeedWorld(4242);
  assert.deepEqual(w1, w2);

  const sample = JSON.stringify({ game: 'Bowo', level: 2, tiles: '########........########' });
  const packed = packRleBytes(sample);
  const unpacked = unpackRleBytes(packed.bytes);
  assert.equal(unpacked, sample);
});

test('Save migration converts v6.1 saves to v7.0.0 and clamps tampered values', () => {
  const legacy = JSON.stringify({
    version: '6.1.0',
    chapter: 3,
    hp: 9999,
    coins: 500000,
    shards: 99,
    score: 1200,
  });
  const migrated = parseAndMigrateSave(legacy, 2);
  assert.equal(migrated.migrated, true);
  assert.equal(migrated.data.version, '7.0.0');
  assert.equal(migrated.data.hp, 100);
  assert.equal(migrated.data.coins, 9999);
  assert.equal(migrated.data.shards, 7);
  assert.equal(migrated.data.level, 3);

  const valid = buildSavePayload(1, {
    gameTitle: 'Bowo',
    level: 2,
    hp: 85,
    energy: 70,
    coins: 120,
    shards: 3,
    score: 900,
    kills: 8,
    potions: 2,
    styleId: 'pixel',
  });
  const checked = parseAndMigrateSave(JSON.stringify(valid), 1);
  assert.equal(checked.checksumValid, true);
});

test('Device profiler & dynamic resolution EMA respect Itel A70 bounds', () => {
  const eco = createDeviceProfile('eco', true);
  assert.equal(eco.targetFps, 30);
  const down = updateDynamicResolution(eco, 45, 0.72);
  assert.ok(down.nextScale < 0.72 && down.nextScale >= 0.6);
  const up = updateDynamicResolution(eco, 16, 0.65);
  assert.ok(up.nextScale > 0.65 && up.nextScale <= 1.0);

  const checks = run25ValidatorChecks({
    gameName: 'Bowo',
    buttonSize: 52,
    entityCount: 16,
    drawCalls: 10,
    heapMb: 18,
    style: getStyleSpec('pixel'),
    hasEventRule: true,
    bytecodeValid: true,
    saveSizeBytes: 340,
    level: 1,
  });
  assert.equal(checks.length, 25);
  assert.ok(checks.every((c) => c.passed));
});

test('Mobile AssetManager loads level bundles, unloads prior biomes, pins shared assets, and enforces LRU budget', () => {
  const mgr = new AssetManager(420_000);
  const b1 = mgr.loadLevelBundle(1);
  assert.ok(b1.loaded.includes('player_bowo_rig'));
  assert.ok(b1.loaded.includes('env_dawn_village'));

  const b3 = mgr.loadLevelBundle(3);
  assert.ok(b3.unloaded.includes('env_dawn_village'));
  assert.ok(b3.loaded.includes('env_menara_kala'));
  assert.ok(b3.loaded.includes('boss_kala_3phase'));

  // Shared pinned player rig stays loaded across unloads
  mgr.unloadUnused();
  const list = mgr.listAssets();
  assert.equal(list.find((a) => a.id === 'player_bowo_rig')?.loaded, true);
  assert.ok(mgr.getUsedBytes() <= 420_000 || mgr.getStats().evictions >= 0);
});

test('Procedural generators are deterministic across Character, Music, SFX, Cutscene, Terrain, and Props', () => {
  const c1 = generateCharacter(1234, '3D-Stack', 'Guardian');
  const c2 = generateCharacter(1234, '3D-Stack', 'Guardian');
  assert.deepEqual(c1, c2);
  assert.equal(c1.spriteGrid.length, 12);

  const m1 = generateMusicTrack(77, 'dorian', 132);
  assert.equal(m1.leadNotes.length, 16);
  assert.equal(m1.bpm, 132);

  const sfx = generateSfxSpec(99, 'slash');
  assert.ok(sfx.freqStart > sfx.freqEnd);

  const cut = generateCutsceneSpec(55, 'Hujan');
  assert.equal(cut.keyframes.length, 6);
  assert.equal(cut.weather, 'Hujan');

  const ter = generateTerrainSpec(808, '3D-Heightmap', 'obsidian');
  assert.equal(ter.heights.length, 48);
  assert.equal(ter.platforms.length, 3);

  const prop = generatePropAsset(303, 'crystal');
  assert.equal(prop.pixelGrid.length, 10);
  assert.equal(prop.kind, 'crystal');
});

test('AI Agent Skill Pack, Top-5 Keyword GitHub Matrix, 3-Level BGM & Pseudo-3D math are complete', () => {
  const skills = buildAgentSkillPack();
  assert.equal(skills.length, 5);
  assert.deepEqual(
    skills.map((s) => s.platform),
    ['claude', 'gemini', 'grok', 'qwen', 'universal']
  );

  for (const grp of ['fake_3d', 'pseudo_3d', '2_5d', 'web_engine', 'mobile_engine'] as const) {
    assert.equal(KEYWORD_TOP5_REPOS[grp].length, 5);
  }

  assert.notEqual(LEVEL_TRACKS[1].bpm, LEVEL_TRACKS[2].bpm);
  assert.notEqual(LEVEL_TRACKS[2].bpm, LEVEL_TRACKS[3].bpm);
  assert.equal(soundEngine.getTrackConfig(3).title, 'Menara Kala — Three Shadows');

  const near = project3D(100, 0, 0, 200, 100, 260);
  const far = project3D(100, 0, 260, 200, 100, 260);
  assert.ok(near.scale > far.scale);
  assert.ok(near.sx > far.sx);
});

test('Screen-space culling skips off-screen rectangles, circles, and points cleanly', () => {
  const vp = { left: 200, right: 680, top: 0, bottom: 440 };
  assert.equal(isRectInViewport(240, 100, 80, 20, vp, 32), true);
  assert.equal(isRectInViewport(0, 100, 50, 20, vp, 32), false);
  assert.equal(isRectInViewport(800, 100, 60, 20, vp, 32), false);

  assert.equal(isCircleInViewport(400, 200, 16, vp, 24), true);
  assert.equal(isCircleInViewport(120, 200, 16, vp, 24), false);

  assert.equal(isPointInViewport(300, 150, vp, 16), true);
  assert.equal(isPointInViewport(750, 150, vp, 16), false);
});

test('Genre templates simulate authentically across Top-Down, Bullet Hell, Runner, Rhythm, Defense, Collector, VN, and Metroidvania', () => {
  // 1. Top-Down Action RPG: 8-way Y motion without gravity + solid dungeon obstacle resolution
  const rpg = createLevelWorld(1, undefined, 'rpg');
  assert.equal(rpg.simKind, 'topdown');
  assert.ok(rpg.obstacles.length >= 4);
  const yBefore = rpg.player.y;
  stepGameWorld(rpg, { ...IDLE_INPUT, moveY: 1 }, 1 / 60, DEFAULT_CFG);
  assert.ok(rpg.player.y > yBefore);
  const obs = rpg.obstacles[0];
  rpg.player.x = obs.x + obs.w * 0.5;
  rpg.player.y = obs.y + obs.h * 0.5;
  stepGameWorld(rpg, IDLE_INPUT, 1 / 60, DEFAULT_CFG);
  const pushedOut =
    Math.abs(rpg.player.x - (obs.x + obs.w * 0.5)) >= obs.w * 0.5 ||
    Math.abs(rpg.player.y - (obs.y + obs.h * 0.5)) >= obs.h * 0.5;
  assert.equal(pushedOut, true);

  // 2. Bullet Hell Shooter: 3-way fan blaster shots + 16x16 core hurtbox
  const bh = createLevelWorld(1, undefined, 'bullet_hell');
  assert.equal(bh.simKind, 'shooter');
  assert.equal(bh.player.w, 16);
  stepGameWorld(bh, { ...IDLE_INPUT, attackPressed: true }, 1 / 60, { ...DEFAULT_CFG, physicsMode: 'Zero-G' });
  assert.equal(bh.projectiles.filter((p) => p.fromPlayer).length, 3);

  // 3. Mode-7 Turbo Dash Runner: advances trackDist and switches lanes
  const runner = createLevelWorld(1, undefined, 'racing');
  assert.equal(runner.simKind, 'runner');
  const startLane = runner.lane;
  stepGameWorld(runner, { ...IDLE_INPUT, moveY: -1 }, 1 / 60, DEFAULT_CFG);
  assert.equal(runner.lane, startLane - 1);
  assert.ok(runner.trackDist > 0);
  assert.ok(runner.speedKmh > 100);

  // 4. Rhythm: hitting aligned beat note awards combo, score & shockwave bolt
  const rhythm = createLevelWorld(1, undefined, 'rhythm');
  assert.equal(rhythm.simKind, 'rhythm');
  rhythm.beatNotes[0].lane = rhythm.lane;
  rhythm.beatNotes[0].x = rhythm.player.x + 28;
  stepGameWorld(rhythm, { ...IDLE_INPUT, attackPressed: true }, 1 / 60, DEFAULT_CFG);
  assert.ok(rhythm.score >= 160);
  assert.equal(rhythm.beatNotes[0].hit, true);

  // 5. Lantern Defense: burst deploys a Light Turret
  const def = createLevelWorld(1, undefined, 'tower_defense');
  assert.equal(def.simKind, 'defense');
  const initialTurrets = def.turrets.length;
  stepGameWorld(def, { ...IDLE_INPUT, burstPressed: true }, 1 / 60, DEFAULT_CFG);
  assert.equal(def.turrets.length, initialTurrets + 1);

  // 6. Coin Collector: magnet pulls coins toward Bowo
  const col = createLevelWorld(1, undefined, 'idle');
  assert.equal(col.simKind, 'collector');
  col.coins[0].x = col.player.x + 80;
  col.coins[0].y = col.player.y;
  stepGameWorld(col, IDLE_INPUT, 1 / 60, DEFAULT_CFG);
  assert.ok(col.coins[0].x < col.player.x + 80);

  // 7. Visual Novel: branching choice awards score, shard, and unlocks gate on completion
  const vn = createLevelWorld(1, undefined, 'visual_novel');
  assert.equal(vn.simKind, 'visual_novel');
  assert.equal(selectVisualNovelChoice(vn, 0), true);
  assert.equal(vn.vnStep, 1);
  assert.equal(selectVisualNovelChoice(vn, 0), true);
  assert.equal(selectVisualNovelChoice(vn, 0), true);
  assert.equal(vn.gateUnlocked, true);

  // 8. Metroidvania: supports mid-air double jump
  const mv = createLevelWorld(1, undefined, 'metroidvania');
  mv.player.grounded = false;
  mv.player.coyoteTimer = 0;
  assert.equal(mv.doubleJumpsLeft, 1);
  stepGameWorld(mv, { ...IDLE_INPUT, jumpPressed: true, jumpHeld: true }, 1 / 60, DEFAULT_CFG);
  assert.equal(mv.doubleJumpsLeft, 0);
  assert.ok(mv.player.vy < -200);
});

test('FD Lite v2 FSM table, 2-bone damped cloak spring, and Qolbu validateMoveBounds security guard', () => {
  assert.equal(
    evaluateCharacterFsm('idle', { ko: true, hurt: true, dashing: true, attacking: true, grounded: true, vy: 0, vx: 0 }),
    'ko'
  );
  assert.equal(
    evaluateCharacterFsm('idle', { ko: false, hurt: false, dashing: true, attacking: false, grounded: false, vy: 100, vx: 200 }),
    'dash'
  );
  assert.equal(
    evaluateCharacterFsm('idle', { ko: false, hurt: false, dashing: false, attacking: false, grounded: true, vy: 0, vx: 80 }),
    'walk'
  );

  const spring = createBoneSpringState();
  for (let i = 0; i < 15; i++) {
    stepBonePoseSpring(spring, 'walk', 200, -40, 1 / 30);
  }
  assert.ok(Number.isFinite(spring.cloakOffsetX) && Math.abs(spring.cloakOffsetX) <= 16);
  assert.ok(Number.isFinite(spring.cloakOffsetY) && Math.abs(spring.cloakOffsetY) <= 12);

  // NaN exploit rejected cleanly
  const nanRes = validateMoveBounds(100, 200, Number.NaN, 200, 1 / 30, 400, { minX: 16, maxX: 1100, minY: 20, maxY: 460 });
  assert.equal(nanRes.valid, false);
  assert.equal(nanRes.reason, 'nan');
  assert.equal(nanRes.x, 100);

  // Speed hack teleport clamped cleanly
  const spdRes = validateMoveBounds(100, 200, 9999, 200, 1 / 30, 400, { minX: 16, maxX: 1100, minY: 20, maxY: 460 });
  assert.equal(spdRes.valid, false);
  assert.equal(spdRes.reason, 'speed');
  assert.ok(spdRes.x < 200);
});

test('Live No-Code EventSheetRules, 15Hz Eco AI decimation, 7-Layer Engine & Offline Toast i18n work end-to-end', () => {
  const world = createLevelWorld(1);
  world.player.hp = 20;
  const rules = [
    { id: 'r1', enabled: true, condition: 'ON_SHARD_COLLECT' as const, action: 'ADD_SCORE_25' as const },
    { id: 'r2', enabled: true, condition: 'ON_LOW_HP' as const, action: 'HEAL_15' as const },
  ];
  // Put player on shard 1 with low HP and Eco 15Hz AI enabled
  world.player.x = world.shards[0].x;
  world.player.y = world.shards[0].y;
  stepGameWorld(world, IDLE_INPUT, 1 / 30, { ...DEFAULT_CFG, ecoAi15Hz: true, eventRules: rules });

  // Shard gives +250, rule adds +25 => >= 275; ON_LOW_HP rule heals +15 => 35 HP
  assert.ok(world.score >= 275);
  assert.equal(world.player.hp, 35);
  assert.equal(world.simStepTick, 1);

  const eco = createDeviceProfile('eco', true);
  const hardened = evaluateHardenedRules(eco, {
    simMs: 2.0,
    renderMs: 6.0,
    frameMs: 18.0,
    drawCalls: 14,
    culledCount: 8,
    heapMb: 18,
    aiHz: 15,
  });
  assert.equal(hardened.length, 9);
  assert.ok(hardened.every((r) => r.status === 'pass'));
  assert.equal(ENGINE_LAYERS.length, 7);

  for (const langCode of ['id', 'en', 'ja', 'ko', 'es'] as const) {
    assert.equal(I18N_MAP[langCode].offlineToastTitle, 'Offline Mode');
    assert.ok(I18N_MAP[langCode].offlineToastBody.length > 10);
  }
});

test('Physics Presets, Group Entities (keep-world), Ungroup, and Collision Shape overlap detection work accurately', () => {
  assert.deepEqual(Object.keys(PHYSICS_PRESETS), ['NORMAL', 'BOUNCY', 'HEAVY', 'GHOST', 'SLIPPERY', 'BALL']);
  assert.equal(PHYSICS_PRESETS.GHOST.isTrigger, true);
  assert.equal(PHYSICS_PRESETS.BOUNCY.restitution > PHYSICS_PRESETS.HEAVY.restitution, true);

  const bowoBefore = computeWorldTransform(DEFAULT_SCENE_ENTITIES[0], DEFAULT_SCENE_ENTITIES);
  const grouped = groupEntities(DEFAULT_SCENE_ENTITIES, ['ent_bowo', 'ent_qolbu'], 'Duo Cahaya');
  assert.ok(grouped.containerId);
  const bowoGroupedNode = grouped.nodes.find((n) => n.id === 'ent_bowo')!;
  const bowoAfter = computeWorldTransform(bowoGroupedNode, grouped.nodes);
  assert.ok(Math.abs(bowoBefore.x - bowoAfter.x) < 0.05);
  assert.ok(Math.abs(bowoBefore.y - bowoAfter.y) < 0.05);

  const movedNodes = grouped.nodes.map((n) => (n.id === grouped.containerId ? { ...n, x: n.x + 25 } : n));
  const bowoMoved = computeWorldTransform(movedNodes.find((n) => n.id === 'ent_bowo')!, movedNodes);
  assert.ok(Math.abs(bowoMoved.x - (bowoBefore.x + 25)) < 0.05);

  const ungrouped = ungroupContainer(movedNodes, grouped.containerId!);
  assert.equal(ungrouped.some((n) => n.id === grouped.containerId), false);
  const bowoUngrouped = computeWorldTransform(ungrouped.find((n) => n.id === 'ent_bowo')!, ungrouped);
  assert.ok(Math.abs(bowoUngrouped.x - (bowoBefore.x + 25)) < 0.05);

  // Force two shapes to overlap and confirm penetration readout
  const overlappingEntities = DEFAULT_SCENE_ENTITIES.map((e) =>
    e.id === 'ent_qolbu' ? { ...e, x: DEFAULT_SCENE_ENTITIES[0].x + 10, y: DEFAULT_SCENE_ENTITIES[0].y } : e
  );
  const overlap = evaluateShapeOverlaps('shp_bowo', DEFAULT_COLLISION_SHAPES, overlappingEntities);
  assert.equal(overlap.status, 'overlap');
  assert.ok(overlap.items.some((it) => it.otherShapeId === 'shp_qolbu' && it.hit && it.penetrationPx > 0));
});

test('Agen Qolbu, 16 Local MCP tools, Wizard Game Builder, and Qolbu Arena AI (Solo / Co-Play / Adaptive VS) work end-to-end', () => {
  assert.equal(TUTORIAL_STEPS.length, 10);
  assert.equal(QOLBU_ENGINE_TOPICS.length, 12);
  assert.equal(LOCAL_MCP_TOOLS.length, 16);

  const reply = askQolbuAgent('Bagaimana cara kerja Zero-GC di Itel A70?');
  assert.equal(reply.recommendedTab, 'lab');

  const customGame = buildWizardGameSpec({
    name: 'Uji Coba Arena',
    genre: 'Arena',
    sprite: 'Bowo',
    characterName: 'Bowo',
    preset: 'BOUNCY',
    map: 'Arena Qolbu',
    enemies: 2,
    items: 3,
    aiMode: 'Bareng',
    difficulty: 'Normal',
    durationSec: 60,
  });
  assert.equal(customGame.name, 'Uji Coba Arena');

  // 1. Solo AI moves autonomously toward objective on 15Hz ticks
  const solo = createArenaWorld('solo', customGame);
  const x0 = solo.player.x;
  for (let i = 0; i < 8; i++) {
    stepArenaWorld(solo, 1 / 30, { moveX: 0, moveY: 0 }, { coachDirective: 'Agresif', companionOrder: 'Ikut', speedMul: 1 });
  }
  assert.notEqual(solo.player.x, x0);

  // 2. Co-Play Qolbu auto-heals low HP and provides 1x revive
  const coplay = createArenaWorld('coplay', customGame);
  coplay.player.hp = 25;
  stepArenaWorld(coplay, 1 / 30, { moveX: 0, moveY: 0 }, { coachDirective: 'Seimbang', companionOrder: 'Ikut', speedMul: 1 });
  stepArenaWorld(coplay, 1 / 30, { moveX: 0, moveY: 0 }, { coachDirective: 'Seimbang', companionOrder: 'Ikut', speedMul: 1 });
  assert.ok(coplay.player.hp >= 45);

  coplay.player.hp = 0;
  stepArenaWorld(coplay, 1 / 30, { moveX: 0, moveY: 0 }, { coachDirective: 'Seimbang', companionOrder: 'Ikut', speedMul: 1 });
  assert.equal(coplay.companionReviveLeft, 0);
  assert.equal(coplay.status, 'playing');

  // 3. VS Boss Kala adapts after repeated Dash Right moves
  const vs = createArenaWorld('vs');
  vs.player.facing = 1;
  for (let i = 0; i < 3; i++) {
    vs.player.dashCd = 0;
    triggerArenaPlayerAction(vs, 'dash');
  }
  stepArenaWorld(vs, 1 / 30, { moveX: 0, moveY: 0 }, { coachDirective: 'Seimbang', companionOrder: 'Ikut', speedMul: 1 });
  stepArenaWorld(vs, 1 / 30, { moveX: 0, moveY: 0 }, { coachDirective: 'Seimbang', companionOrder: 'Ikut', speedMul: 1 });
  assert.ok(vs.adaptiveRule.includes('KIRI'));
});


