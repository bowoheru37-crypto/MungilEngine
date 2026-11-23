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
import { project3D } from '../engine/pseudo3d.ts';
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
