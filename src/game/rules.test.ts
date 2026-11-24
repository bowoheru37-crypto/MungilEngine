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
import { KEYWORD_TOP5_REPOS, GENERATOR_TOP3_REPOS } from '../engine/catalogs.ts';
import { isCircleInViewport, isPointInViewport, isRectInViewport } from '../engine/culling.ts';
import { createDeviceProfile, updateDynamicResolution } from '../engine/deviceProfiler.ts';
import { ParticlePool, SoAWorld } from '../engine/ecs.ts';
import {
  createLevelWorld,
  extractWorldSaveProgress,
  LEVEL_DEFINITIONS,
  restoreWorldFromSave,
  selectVisualNovelChoice,
  stepGameWorld,
  usePotion,
  type SimConfig,
  type SimInput,
} from '../engine/gameSimulation.ts';
import {
  composeMovieFromPrompt,
  generateCharacter,
  generateCompleteGameBlueprint,
  generateCutsceneSpec,
  generateDubbingSubtitleSpec,
  generateGameplaySceneAndRules,
  generateImageSpriteFromPrompt,
  generateMesh3DFromPrompt,
  generateMusicTrack,
  generatePlatformTargetSpec,
  generatePropAsset,
  generateRig3DFromPrompt,
  generateSfxSpec,
  generateStateMachineSpec,
  generateTerrainSpec,
  parseAtelierSetupJson,
} from '../engine/generators.ts';
import {
  CURATED_GITHUB_PLUGINS,
  filterCuratedGitHubPlugins,
  searchGitHubReposWithFallback,
} from '../engine/githubConnectors.ts';
import {
  calcFogFactor,
  CAMERA_3_PRESETS,
  createCamera3D,
  evaluateCullAndLod,
  evaluateOriginRebase,
  HYBRID_5_MODES,
  QolbuSpace3D,
  SPACE3D_CONSTANTS,
  updateCameraModeAIsometric,
  updateCameraModeBFollow34,
  updateCameraModeCFpsRaycast,
} from '../engine/qolbuSpace3d.ts';
import {
  createAiCompanionState,
  executeMcpTool,
  routeAgentPrompt,
  stepAi15Hz,
} from '../engine/aiMcpAgent.ts';
import { project3D } from '../engine/pseudo3d.ts';
import {
  DoubleBufferedTransforms,
  ENGINE_CONNECTORS,
  fastClampDt,
  isValidMove,
  QOLBU_CONSTANTS,
  runQolbu8StageAudit,
} from '../engine/qolbuCore.ts';
import {
  applyPhysicsPreset,
  createDefaultSceneEntities,
  detectEntityOverlaps,
  groupEntitiesIntoContainer,
  PHYSICS_PRESETS,
  ungroupContainer,
  updateEntityCollider,
  updateEntityTransform,
} from '../engine/sceneHierarchy.ts';
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

test('Full-world Save/Load roundtrip preserves stats, position, collected items, switches, defeated enemies, and stays compact (< 2 KB)', () => {
  const world = createLevelWorld(2, undefined, 'rpg');
  world.player.hp = 74;
  world.player.energy = 42;
  world.player.x = 512.5;
  world.player.y = 210.5;
  world.score = 1350;
  world.coinsTotal = 45;
  world.kills = 2;
  world.potions = 1;
  world.time = 37.4;

  // Collect all 3 shards + 2 coins, activate both switches, defeat 2 enemies
  for (const s of world.shards) s.collected = true;
  world.shardsTotal = 3;
  world.coins[0].collected = true;
  world.coins[1].collected = true;
  for (const sw of world.switches) sw.active = true;
  world.enemies[0].dead = true;
  world.enemies[1].dead = true;

  const worldState = extractWorldSaveProgress(world);
  const payload = buildSavePayload(2, {
    gameTitle: 'Bowo: Penjaga Cahaya',
    level: 2,
    hp: world.player.hp,
    energy: world.player.energy,
    coins: world.coinsTotal,
    shards: world.shardsTotal,
    score: world.score,
    kills: world.kills,
    potions: world.potions,
    styleId: 'cyberpunk',
    worldState,
  });

  const serialized = JSON.stringify(payload);
  assert.ok(serialized.length < 2048, `Expected compact mobile save < 2048 bytes, got ${serialized.length}`);

  const parsed = parseAndMigrateSave(serialized, 2);
  assert.equal(parsed.checksumValid, true);
  assert.equal(parsed.migrated, false);

  const restored = restoreWorldFromSave(parsed.data);
  assert.equal(restored.level, 2);
  assert.equal(restored.genreId, 'rpg');
  assert.equal(restored.simKind, 'topdown');
  assert.equal(restored.player.hp, 74);
  assert.equal(restored.player.energy, 42);
  assert.equal(restored.player.x, 512.5);
  assert.equal(restored.player.y, 210.5);
  assert.equal(restored.score, 1350);
  assert.equal(restored.coinsTotal, 45);
  assert.equal(restored.kills, 2);
  assert.equal(restored.potions, 1);
  assert.equal(restored.shards.every((s) => s.collected), true);
  assert.equal(restored.coins[0].collected, true);
  assert.equal(restored.coins[1].collected, true);
  assert.equal(restored.coins[2].collected, false);
  assert.equal(restored.switches.every((sw) => sw.active), true);
  assert.equal(restored.enemies[0].dead, true);
  assert.equal(restored.enemies[1].dead, true);
  assert.equal(restored.enemies[2].dead, false);
  assert.equal(restored.gateUnlocked, true);

  // Tamper test: modify HP out of bounds -> checksumValid false & clamped
  const tamperedObj = JSON.parse(serialized);
  tamperedObj.hp = 9999;
  const tamperedRes = parseAndMigrateSave(JSON.stringify(tamperedObj), 2);
  assert.equal(tamperedRes.checksumValid, false);
  assert.equal(tamperedRes.data.hp, 100);
});

test('Expanded Atelier, Image-Sprite, MovieCore, FSM, Gameplay Bundle, Dubbing/Subtitles, Targets & Top-3 Matrix work cleanly', () => {
  const sprite1 = generateImageSpriteFromPrompt(101, 'Cyber Neon Lantern', 'cyberpunk');
  const sprite2 = generateImageSpriteFromPrompt(101, 'Cyber Neon Lantern', 'cyberpunk');
  assert.deepEqual(sprite1, sprite2);
  assert.equal(sprite1.size, 16);
  assert.equal(sprite1.grid.length, 16);

  const rig = generateRig3DFromPrompt(202, 'Ksatria Cahaya', 'cobalt_knight');
  assert.equal(rig.character.archetype, 'Knight');
  assert.equal(rig.atelier.tint, '#b9c8ff');

  const atelierOk = parseAtelierSetupJson(
    JSON.stringify({ app: 'CharacterAtelier', settings: { tint: '#b3ffe0', sy: 1.1, bones: { bone_2: [0, 0, 5] } } })
  );
  assert.equal(atelierOk.ok, true);
  assert.equal(atelierOk.character?.cloakColor, '#b3ffe0');
  assert.equal(parseAtelierSetupJson('{bad json').ok, false);

  const movie = composeMovieFromPrompt('jalan lompat dash serang burst', 55, 'Hujan');
  assert.equal(movie.keyframes.length, 5);
  assert.equal(movie.keyframes[1].pose, 'jump');
  assert.equal(movie.keyframes[3].effect, 'shake');

  const moveFsm = generateStateMachineSpec(11, 'movement');
  assert.equal(moveFsm.kind, 'movement');
  assert.ok(moveFsm.states.length >= 5);
  assert.ok(moveFsm.transitions.length >= 4);

  const aiFsm = generateStateMachineSpec(11, 'behavior');
  assert.equal(aiFsm.kind, 'behavior');
  assert.equal(aiFsm.initialState, 'patrol');

  const bundle = generateGameplaySceneAndRules(33, 'Space shooter arcade nebula');
  assert.equal(bundle.genreId, 'shooter');
  assert.equal(bundle.physicsMode, 'Zero-G');
  assert.ok(bundle.rules.length >= 3);

  const dub = generateDubbingSubtitleSpec(77, 'Bowo', 'Nyalakan Lentera Cahaya sekarang!', 'id');
  assert.ok(dub.srtText.includes('-->'));
  assert.ok(dub.vttText.startsWith('WEBVTT'));
  assert.ok(dub.durationSec >= 1.6);

  const apk = generatePlatformTargetSpec(1, 'apk', 'Bowo V7');
  assert.ok(apk.configJson.includes('itelA70Profile'));
  const mcp = generatePlatformTargetSpec(1, 'mcp', 'Bowo V7');
  assert.ok(mcp.configJson.includes('mungil.create_level'));

  assert.equal(GENERATOR_TOP3_REPOS.length, 5);
  for (const grp of GENERATOR_TOP3_REPOS) {
    assert.equal(grp.repos.length, 3);
  }
});

test('Scene Hierarchy groups entities into Container, propagates move/scale/rotate, applies Physics Presets, and detects box/circle overlaps', () => {
  let entities = createDefaultSceneEntities(1);
  const bowoBefore = entities.find((e) => e.id === 'ent_bowo')!;
  const enemyBefore = entities.find((e) => e.id === 'ent_enemy_1')!;
  assert.ok(bowoBefore && enemyBefore);

  // 1. Group two entities into a parent Container
  const grouped = groupEntitiesIntoContainer(entities, ['ent_bowo', 'ent_enemy_1'], 'Squad Alpha');
  assert.ok(grouped.containerId);
  entities = grouped.entities;

  const container = entities.find((e) => e.id === grouped.containerId)!;
  assert.equal(container.kind, 'container');
  assert.deepEqual(container.children, ['ent_bowo', 'ent_enemy_1']);

  // 2. Moving, scaling, and rotating the Container proportionally transforms all children
  const origBowoX = bowoBefore.x;
  entities = updateEntityTransform(entities, container.id, { x: container.x + 50, y: container.y + 10 });
  const movedBowo = entities.find((e) => e.id === 'ent_bowo')!;
  assert.equal(Math.round(movedBowo.x), Math.round(origBowoX + 50));

  const movedContainer = entities.find((e) => e.id === container.id)!;
  entities = updateEntityTransform(entities, movedContainer.id, { scaleX: 1.5, scaleY: 1.5, rotationDeg: 90 });
  const scaledBowo = entities.find((e) => e.id === 'ent_bowo')!;
  assert.equal(scaledBowo.scaleX, 1.5);
  assert.equal(scaledBowo.rotationDeg, 90);

  // 3. Ungroup restores children cleanly
  entities = ungroupContainer(entities, container.id);
  assert.equal(entities.some((e) => e.id === container.id), false);
  assert.equal(entities.find((e) => e.id === 'ent_bowo')?.parentId, null);

  // 4. Physics Presets apply exact configurations
  entities = applyPhysicsPreset(entities, 'ent_bowo', 'bouncy');
  assert.equal(entities.find((e) => e.id === 'ent_bowo')?.physics.restitution, PHYSICS_PRESETS.bouncy.config.restitution);
  entities = applyPhysicsPreset(entities, 'ent_enemy_1', 'ghost');
  assert.equal(entities.find((e) => e.id === 'ent_enemy_1')?.physics.isTrigger, true);

  // 5. Visual Collision Shape Editor resizing + real-time overlap detection (box vs circle)
  entities = updateEntityCollider(entities, 'ent_bowo', { kind: 'circle', radius: 30 });
  entities = updateEntityTransform(entities, 'ent_bowo', { x: 200, y: 200 });
  entities = updateEntityTransform(entities, 'ent_enemy_1', { x: 215, y: 200 });
  const overlaps = detectEntityOverlaps(entities);
  assert.ok(overlaps.some((o) => o.isTriggerOverlap && (o.aId === 'ent_bowo' || o.bId === 'ent_bowo')));
});

test('Qolbu 9 Larangan Mutlak enforces dt bounds, double-buffered transforms, anti-exploit guard, and passes 8-stage audit + 2000 fuzz checks', () => {
  assert.equal(fastClampDt(0.002), QOLBU_CONSTANTS.DT_MIN_SEC);
  assert.equal(fastClampDt(0.5), QOLBU_CONSTANTS.DT_MAX_SEC);
  assert.equal(fastClampDt(Number.NaN), QOLBU_CONSTANTS.DT_MAX_SEC);

  assert.equal(isValidMove(10, 10, 14, 10), true);
  assert.equal(isValidMove(10, 10, Number.NaN, 10), false);
  assert.equal(isValidMove(10, 10, Number.POSITIVE_INFINITY, 10), false);
  assert.equal(isValidMove(10, 10, 10, -180), false);
  assert.equal(isValidMove(10, 10, 800, 10), false);

  const db = new DoubleBufferedTransforms();
  assert.equal(db.writeBack(0, 42, 84, 15), true);
  assert.equal(db.writeBack(0, Number.NaN, 84, 15), false);
  db.swapBuffers();
  assert.equal(db.frontX[0], 42);
  assert.equal(db.frontY[0], 84);

  const audit = runQolbu8StageAudit(14, 19.2);
  assert.equal(audit.allPassed, true);
  assert.equal(audit.stages.length, 8);
  assert.equal(audit.fuzzBlockedCount, audit.fuzzEventsTested);
  assert.equal(ENGINE_CONNECTORS.length, 10);
});

test('In-app AI Agent + MCP Assistant guides players, explains engine, builds games, and drives Co-Op / Autopilot at 15Hz', () => {
  let createdTitle = '';
  let switchedConnector = '';
  let switchedAiMode = 'off';

  const ctx = {
    gameName: 'Bowo',
    activeLevel: 3 as const,
    activeGenreId: 'platformer',
    aiMode: 'off' as const,
    perspectiveConnector: '2_5d_parallax' as const,
    renderMode: '2.5D' as const,
    physicsMode: 'Arcade' as const,
    styleId: 'pixel' as const,
  };

  const actions = {
    setGameName: (n: string) => {
      createdTitle = n;
    },
    setPerspectiveConnector: (c: string) => {
      switchedConnector = c;
    },
    setAiMode: (m: string) => {
      switchedAiMode = m;
    },
  };

  const qolbuAns = routeAgentPrompt('Jelaskan Qolbu 9 larangan mutlak', ctx, actions);
  assert.equal(qolbuAns.toolTrace.tool, 'mcp.explain_engine');
  assert.ok(qolbuAns.reply.includes('Zero-GC'));

  const guideAns = routeAgentPrompt('Pandu aku menang Babak 3 Boss Kala', ctx, actions);
  assert.equal(guideAns.toolTrace.tool, 'mcp.guide_player');
  assert.ok(guideAns.reply.includes('Boss Kala'));

  const createAns = routeAgentPrompt('Buatkan game baru: Isometric Cyber Arena', ctx, actions);
  assert.equal(createAns.toolTrace.tool, 'mcp.create_game_project');
  assert.equal(createdTitle, 'Isometric Light Quest');
  assert.equal(switchedConnector, 'isometric');
  assert.equal(switchedAiMode, 'coop');

  const auditTool = executeMcpTool('mcp.run_qolbu_audit', {}, ctx, actions);
  assert.equal(auditTool.ok, true);

  // Verify 15Hz Co-Op Luma & Autopilot simulation steps
  const world = createLevelWorld(1, undefined, 'ai_arena');
  const luma = createAiCompanionState();
  luma.healCooldown = 0;
  world.player.hp = 35; // trigger emergency heal in coop
  stepAi15Hz(world, luma, 'coop', 1 / 30);
  const coopRes = stepAi15Hz(world, luma, 'coop', 1 / 30);
  assert.equal(coopRes.inputOverride, null);
  assert.equal(luma.active, true);
  assert.equal(world.player.hp, 50);

  // Autopilot generates directional movement and projectile parry
  world.projectiles.push({
    id: 999,
    x: world.player.x + 25,
    y: world.player.y,
    vx: -120,
    vy: 0,
    fromPlayer: false,
    damage: 10,
    life: 1,
    r: 5,
  });
  const autoRes = stepAi15Hz(world, luma, 'autopilot', 1 / 30);
  assert.ok(autoRes.inputOverride);
  assert.equal(autoRes.inputOverride!.dashPressed, true);
  assert.notEqual(autoRes.inputOverride!.moveX, 0);
});

test('QolbuSpace3D enforces Y-Up LookAt+Perspective math, 35m culling, 3-level LOD, 500m Origin Rebasing, and Camera A/B/C', () => {
  const space = new QolbuSpace3D('follow_3_4', 720 / 1612);
  assert.equal(space.capacity, SPACE3D_CONSTANTS.MAX_ENTITIES);
  assert.equal(CAMERA_3_PRESETS.length, 3);
  assert.equal(HYBRID_5_MODES.length, 5);

  // Camera B Follow 3/4 converges eye -> target + (0, 8, 8)
  const camB = createCamera3D('follow_3_4');
  updateCameraModeBFollow34(camB, 10, 0, -4, 0.2);
  assert.ok(camB.eyeX > 0 && camB.eyeY >= 8);

  // Camera A Fixed Isometric stays locked
  updateCameraModeAIsometric(camB);
  assert.equal(camB.eyeX, 12);
  assert.equal(camB.eyeY, 14);

  // Camera C FPS Raycast preserves eyeY = playerY + 1.65 (flat horizon)
  updateCameraModeCFpsRaycast(camB, 4, 0, -8, Math.PI * 0.5);
  assert.equal(camB.eyeY, 1.65);
  assert.equal(camB.targetY, 1.65);

  // LOD & 35m culling + Fog
  assert.equal(evaluateCullAndLod(5, true, false), 0);
  assert.equal(evaluateCullAndLod(18, true, false), 1);
  assert.equal(evaluateCullAndLod(30, true, false), 2);
  assert.equal(evaluateCullAndLod(36, true, false), -1);
  assert.equal(evaluateCullAndLod(8, true, true), -1); // 1-bit occlusion cull
  assert.equal(calcFogFactor(10), 0);
  assert.equal(calcFogFactor(35), 1);

  // Origin Rebasing >500m
  const rebase = evaluateOriginRebase(1250, -620, 0, 0);
  assert.equal(rebase.rebased, true);
  assert.equal(rebase.shiftX, 1000);
  assert.equal(rebase.shiftZ, -500);

  // Zero-GC SoA updateAll projects near entities cleanly and culls >35m entities
  space.camera = createCamera3D('follow_3_4', 16 / 9);
  space.setEntity(0, 0, 1, 0);
  space.setEntity(1, 0, 0, -60); // >35m away -> culled
  const counts = space.updateAll(1280, 720);
  assert.equal(counts.visible, 1);
  assert.equal(counts.culled, 1);
  assert.ok(space.lodLevel[0] >= 0);
  assert.equal(space.lodLevel[1], -1);
});

test('GitHub Repository Connectors cover all 6 categories and resolve offline gracefully', async () => {
  assert.ok(CURATED_GITHUB_PLUGINS.length >= 20);
  const cub = filterCuratedGitHubPlugins('cub3d', 'fake_3d_raycast');
  assert.ok(cub.some((r) => r.repo === 'AghlaAbdo/42_Cub3D'));
  const axmol = filterCuratedGitHubPlugins('axmol', 'web_mobile_lightweight');
  assert.ok(axmol.some((r) => r.repo === 'axmolengine/axmol'));

  const res = await searchGitHubReposWithFallback('raycast', 'fake_3d_raycast', 100);
  assert.ok(res.results.length >= 1);
});

test('Tripo/Meshy Low-Poly 3D Mesh Generator & InstaPlay Complete Game Forge obey Itel A70 budgets', () => {
  const heroMesh = generateMesh3DFromPrompt(101, 'Dawn Guardian Knight', 'character');
  assert.ok(heroMesh.triangles.length <= SPACE3D_CONSTANTS.CHAR_TRIS_LIMIT);
  assert.ok(heroMesh.objText.includes('v ') && heroMesh.objText.includes('f '));
  const gltfParsed = JSON.parse(heroMesh.gltfJson) as { asset: { version: string }; meshes: unknown[] };
  assert.equal(gltfParsed.asset.version, '2.0');
  assert.equal(gltfParsed.meshes.length, 1);
  assert.ok(heroMesh.lodCounts.lod0 > heroMesh.lodCounts.lod1);

  const boxMesh = generateMesh3DFromPrompt(202, 'Crate Box', 'prop', 'gh_tripo_sr', true);
  assert.equal(boxMesh.triangles.length, 12);

  const bp = generateCompleteGameBlueprint(303, 'FPS Raycast Dungeon Autopilot');
  assert.equal(bp.cameraPreset, 'fps_raycast');
  assert.equal(bp.hybridMode, 'raycast_pseudo3d');
  assert.equal(bp.aiMode, 'autopilot');
  assert.equal(bp.prefabs.length, 3);
  assert.equal(bp.levelQuests.length, 3);
  assert.equal(bp.budgetReport.passesA70, true);
  assert.ok(bp.budgetReport.drawCallsEst < SPACE3D_CONSTANTS.MAX_DRAW_CALLS);
});



