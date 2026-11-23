# 🎮 T3D-WASM Mobile Engine — Complete Prompt Engineering Guide
## Google AI Studio: Zero to Production Prompt List
### Target: itel A70 (Android 5+, 1-4GB RAM, Mali-G57 MP1, 720p)
### Stack: React 19 + TypeScript + Vite + Rust WASM + WebGL 2.0
### Architecture: 4-Layer Hybrid (UI → Bridge → WASM → Runtime)

---

> **Cara Penggunaan:**
> 1. Buka [Google AI Studio](https://aistudio.google.com)
> 2. Buat project baru → Pilih "Web App"
> 3. Copy-paste **SATU prompt** per sesi (jangan semua sekaligus)
> 4. Setelah output di-generate, download ZIP
> 5. Extract, integrasikan, lalu lanjut ke prompt berikutnya
> 6. Jika AI Studio timeout, pecah prompt menjadi sub-prompt yang lebih kecil

---

## 📋 PROMPT #0: PROJECT SETUP & ARCHITECTURE SCAFFOLD

```
You are the Principal Architect for a next-generation mobile game engine. 
Create a COMPLETE, PRODUCTION-READY project scaffold.

PROJECT NAME: T3D-WASM Mobile Engine
TARGET: Android 5+ (API 21), iOS 12+, Web — optimized for itel A70 specs
  - SoC: Unisoc T603 (2x A75 + 6x A55 @ 1.8GHz)
  - GPU: Mali-G57 MP1 (1 core)
  - RAM: 1-4GB (budget 512MB for app)
  - Screen: 720x1600 (portrait primary, landscape game)
  - Storage: 64GB eMMC

ARCHITECTURE (4-Layer Hybrid):
┌─────────────────────────────────────────────┐
│ LAYER 1: UI SHELL (React 19 + TypeScript)   │
│  - Menu, HUD, Editor panels, Settings       │
│  - State: Zustand (lightweight, no Redux)   │
│  - Styling: Tailwind CSS + CSS Modules      │
│  - Touch: 48dp minimum target, gesture lib  │
├─────────────────────────────────────────────┤
│ LAYER 2: BRIDGE (wasm-bindgen + Comlink)    │
│  - Zero-copy via SharedArrayBuffer          │
│  - Batched FFI calls per frame              │
│  - OffscreenCanvas in Web Worker            │
├─────────────────────────────────────────────┤
│ LAYER 3: WASM CORE (Rust → wasm32-unknown)  │
│  - ECS: hecs (fast archetype-based)         │
│  - Math: glam (SIMD-ready)                  │
│  - Physics: rapier2d/rapier3d (deterministic│
│  - Audio: symphonia (decode OGG/FLAC)       │
│  - NavMesh: spade (Delaunay triangulation)  │
│  - ProcGen: noise-rs (Perlin/Simplex/Worley)│
│  - Memory: fixed 128MB linear heap          │
├─────────────────────────────────────────────┤
│ LAYER 4: MOBILE RUNTIME (Browser Engine)    │
│  - Render: WebGL 2.0 (primary)              │
│  - Fallback: WebGPU (experimental)          │
│  - Audio: WebAudio API + AudioWorklet       │
│  - Input: Touch/Gamepad/Gyro/Accel          │
│  - Storage: IndexedDB + OPFS                │
└─────────────────────────────────────────────┘

DELIVERABLES (generate ALL files):
1. package.json — deps: react@19, react-dom@19, typescript@5.5, vite@6, 
   tailwindcss@3, zustand@4, comlink@4, vite-plugin-wasm@3, 
   @types/react, @types/react-dom, @vitejs/plugin-react
2. vite.config.ts — with wasm plugin, worker config, build optimization
3. tsconfig.json — strict mode, path aliases (@/core, @/wasm, @/ui)
4. index.html — viewport meta for mobile, PWA manifest link, preload wasm
5. Cargo.toml (in wasm/ folder) — crate-type = ["cdylib"], 
   deps: wasm-bindgen@0.2, js-sys, web-sys (with WebGL2 features), 
   hecs, glam, rapier3d (f32), symphonia, noise-rs, spade
6. wasm/src/lib.rs — entry point with panic hook, console_error_panic_hook
7. .cargo/config.toml — target wasm32-unknown-unknown, opt-level = "z"
8. public/manifest.json — PWA manifest, icons, display: standalone
9. public/sw.js — Service Worker for offline cache (Cache-first strategy)
10. src/main.tsx — React 19 root render, StrictMode OFF (performance)
11. src/App.tsx — root component with lazy-loaded screens
12. src/index.css — Tailwind directives, CSS custom properties for theming
13. src/vite-env.d.ts — type declarations for ?wasm imports
14. README.md — build instructions: wasm-pack build + npm run dev

CRITICAL CONSTRAINTS:
- WASM binary must be < 2MB after wasm-opt -Oz + brotli
- JS bundle must be < 500KB gzipped (split chunks)
- Total initial load < 3MB on 3G network
- No external CDN dependencies (all bundled)
- Support both Portrait (UI) and Landscape (Game) orientations

OUTPUT FORMAT: Provide each file with its FULL path and COMPLETE source code.
Do NOT use placeholders like "// TODO" or "...". Every file must be runnable.
```

---

## 📋 PROMPT #1: DEVICE TIER DETECTOR & QUALITY PRESET SYSTEM

```
You are a Mobile Performance Engineer. Implement the device auto-detection 
and dynamic quality preset system for T3D-WASM Engine.

CONTEXT:
The engine must automatically detect device capabilities on first launch 
and select the appropriate quality preset to maintain 60fps (or 30fps fallback).

DEVICE TIERS:
┌──────────┬──────────────────────────────────────────────────────────────┐
│ TIER     │ DETECTION CRITERIA                                           │
├──────────┼──────────────────────────────────────────────────────────────┤
│ LOW      │ deviceMemory <= 2 OR hardwareConcurrency <= 4               │
│          │ OR no WebGL 2.0 OR GPU renderer contains "Mali-G57"         │
│          │ OR screen.width < 1080                                       │
├──────────┼──────────────────────────────────────────────────────────────┤
│ MID      │ deviceMemory 3-4 AND hardwareConcurrency 6-8                │
│          │ AND WebGL 2.0 available AND GPU mid-range (Adreno 6xx)      │
├──────────┼──────────────────────────────────────────────────────────────┤
│ HIGH     │ deviceMemory >= 6 AND hardwareConcurrency >= 8              │
│          │ AND WebGPU available AND GPU high-end (Adreno 7xx/Mali-G78) │
└──────────┴──────────────────────────────────────────────────────────────┘

QUALITY PRESETS (TypeScript interfaces):

interface QualityPreset {
  name: string;
  renderScale: number;
  shadowMapSize: number;
  shadowCascades: number;
  maxDrawCalls: number;
  maxParticles: number;
  textureFormat: 'etc2_rgb8' | 'etc2_rgba8' | 'astc_4x4' | 'rgba8';
  textureMaxSize: number;
  anisotropy: number;
  antialias: boolean;
  postProcess: { bloom: boolean; ssao: boolean; motionBlur: boolean; colorGrading: boolean; };
  physicsHz: number;
  physicsMaxBodies: number;
  aiHz: number;
  aiMaxAgents: number;
  aiPathfinding: 'none' | 'simple' | 'full';
  chunkLoadDistance: number;
  lodDistance: [number, number, number, number, number];
  maxEntities: number;
  audioChannels: number;
  audioQuality: 'low' | 'medium' | 'high';
  thermalThrottle: boolean;
  fpsCap: 30 | 60 | 120;
}

PRESET VALUES:
LOW:  renderScale=0.75, shadowMapSize=512, shadowCascades=1, maxDrawCalls=80,
      maxParticles=50, textureFormat='etc2_rgb8', textureMaxSize=512, anisotropy=1,
      antialias=false, postProcess={bloom:false, ssao:false, motionBlur:false, colorGrading:false},
      physicsHz=30, physicsMaxBodies=100, aiHz=5, aiMaxAgents=50, aiPathfinding='simple',
      chunkLoadDistance=3, lodDistance=[10,25,50,100,200], maxEntities=500,
      audioChannels=8, audioQuality='low', thermalThrottle=true, fpsCap=30

MID:  renderScale=0.9, shadowMapSize=1024, shadowCascades=2, maxDrawCalls=200,
      maxParticles=200, textureFormat='etc2_rgba8', textureMaxSize=1024, anisotropy=4,
      antialias=true, postProcess={bloom:true, ssao:false, motionBlur:false, colorGrading:true},
      physicsHz=60, physicsMaxBodies=500, aiHz=10, aiMaxAgents=200, aiPathfinding='full',
      chunkLoadDistance=5, lodDistance=[15,40,80,150,300], maxEntities=2000,
      audioChannels=16, audioQuality='medium', thermalThrottle=true, fpsCap=60

HIGH: renderScale=1.0, shadowMapSize=2048, shadowCascades=4, maxDrawCalls=500,
      maxParticles=1000, textureFormat='astc_4x4', textureMaxSize=2048, anisotropy=16,
      antialias=true, postProcess={bloom:true, ssao:true, motionBlur:true, colorGrading:true},
      physicsHz=60, physicsMaxBodies=2000, aiHz=30, aiMaxAgents=1000, aiPathfinding='full',
      chunkLoadDistance=8, lodDistance=[20,60,120,250,500], maxEntities=10000,
      audioChannels=32, audioQuality='high', thermalThrottle=false, fpsCap=60

FILES TO GENERATE:
1. src/core/DeviceProfiler.ts
2. src/core/QualityPreset.ts
3. src/core/SettingsManager.ts
4. src/core/ThermalMonitor.ts
5. src/core/FrameBudget.ts
6. src/core/MemoryBudget.ts
7. src/screens/SettingsScreen.tsx

OUTPUT: Complete source code for all 7 files with proper TypeScript types.
```

---

## 📋 PROMPT #2: WASM ENGINE CORE — ECS & MATH FOUNDATION

```
You are a Systems Programmer writing Rust code that compiles to WebAssembly.
Implement the foundational ECS (Entity Component System) and math library 
for the T3D-WASM game engine.

CONTEXT:
This code runs inside a 128MB WebAssembly linear memory. It must be:
- Zero-allocation during gameplay (pre-allocated pools)
- Cache-friendly (SoA where possible)
- Deterministic (fixed-point or consistent float behavior for replays)
- Bindable to JavaScript via wasm-bindgen

FILES TO GENERATE (all in wasm/src/):

1. wasm/src/ecs/mod.rs — ECS module exports
2. wasm/src/ecs/world.rs — Wrapper around hecs::World with:
   - spawn_entity(components: JsValue) -> u32
   - despawn_entity(entity_id: u32) -> bool
   - query_components(query_desc: &str) -> JsValue (JSON array)
   - add_component(entity_id: u32, component_type: &str, data: JsValue)
   - remove_component(entity_id: u32, component_type: &str)
   - get_entity_count() -> usize
   - MAX_ENTITIES: 10,000 (configurable via tier)

3. wasm/src/ecs/components.rs — Component definitions:
   struct Transform { position: Vec3, rotation: Quat, scale: Vec3 }
   struct Velocity { linear: Vec3, angular: Vec3 }
   struct MeshRenderer { mesh_id: u32, material_id: u32, visible: bool }
   struct Collider { shape: ColliderShape, layer: u32, trigger: bool }
   enum ColliderShape { Sphere(f32), Box(Vec3), Capsule(f32, f32) }
   struct RigidBody { mass: f32, body_type: BodyType }
   enum BodyType { Static, Kinematic, Dynamic }
   struct Animator { animation_id: u32, time: f32, speed: f32, loop: bool }
   struct AIAgent { behavior_tree_id: u32, target: Option<u32> }
   struct Health { current: f32, max: f32, regen: f32 }
   struct PlayerInput { move_x: f32, move_y: f32, jump: bool, attack: bool }

4. wasm/src/ecs/systems.rs — System scheduler:
   - System trait: fn run(&mut self, world: &mut World, dt: f32)
   - SystemScheduler: maintains ordered list of systems
   - Systems: PhysicsSystem, AnimationSystem, AISystem, HealthRegenSystem
   - Parallel execution where safe

5. wasm/src/math/mod.rs — Math module
6. wasm/src/math/vec.rs — Vec2, Vec3, Vec4 with glam re-exports + JS bindings
7. wasm/src/math/mat.rs — Mat4 (column-major)
8. wasm/src/math/quat.rs — Quaternion
9. wasm/src/math/noise.rs — Procedural noise (Perlin, Simplex, FBM, Worley)
10. wasm/src/lib.rs — Updated entry point

WASM-BINDGEN REQUIREMENTS:
- All public structs must derive #[wasm_bindgen]
- Methods exposed to JS must be #[wasm_bindgen]
- Use JsValue for complex types passed to/from JS
- Panic hook: console_error_panic_hook::set_once()

PERFORMANCE REQUIREMENTS:
- Vec3 operations: inline always, no heap alloc
- Mat4 multiply: < 100ns per call
- Noise generation: < 500ns per sample
- ECS query: O(1) archetype lookup
- World spawn/despawn: amortized O(1)

OUTPUT: Complete Rust source code for all files. Include unit tests.
```

---

## 📋 PROMPT #3: PHYSICS ENGINE INTEGRATION (Rapier3D WASM)

```
You are a Physics Programmer integrating Rapier3D into our WASM game engine.
Implement a deterministic, tier-scalable physics simulation.

FILES TO GENERATE:

1. wasm/src/physics/mod.rs
2. wasm/src/physics/world.rs — PhysicsWorld:
   - new(gravity: Vec3)
   - step(dt: f32, substeps: u32)
   - create_rigid_body(entity_id, body_type, position, rotation, mass) -> u32
   - create_collider(body_handle, shape, params, friction, restitution) -> u32
   - remove_body(handle)
   - apply_force(handle, force, point)
   - apply_impulse(handle, impulse, point)
   - set_velocity(handle, velocity)
   - get_transform(handle) -> (Vec3, Quat)
   - raycast(origin, direction, max_dist) -> RaycastHit
   - shapecast(shape, params, origin, direction, max_dist) -> Vec<ShapeHit>
   - set_gravity(gravity)
   - set_time_scale(scale)
   - enable_ccd(handle, enabled)
   - sleep_threshold

3. wasm/src/physics/character.rs — KinematicCharacterController
4. wasm/src/physics/joints.rs — Joint types
5. wasm/src/physics/destruction.rs — Simple destruction
6. wasm/src/physics/query.rs — Spatial queries
7. src/core/PhysicsProxy.ts — JS bridge with batched commands

TIER SCALING:
- LOW: 30Hz, 1 substep, max 100 bodies, no CCD
- MID: 60Hz, 2 substeps, max 500 bodies, CCD for fast objects
- HIGH: 60Hz, 4 substeps, max 2000 bodies, full CCD

OUTPUT: Complete Rust physics module + TypeScript proxy.
Include example: character controller walking on terrain with 10 boxes.
```

---

## 📋 PROMPT #4: WEBGL 2.0 FORWARD RENDERER

```
You are a Graphics Programmer implementing a mobile-optimized forward renderer
using WebGL 2.0. Target: 60fps at 720p on Mali-G57 MP1 (1 GPU core).

RENDER PIPELINE:
1. Shadow Pass (1-4 cascades)
2. Opaque Pass (Forward PBR)
3. Transparent Pass
4. Post-Process (Bloom, Tone Map, FXAA)

FILES TO GENERATE:
1. src/render/WebGL2Context.ts
2. src/render/ShaderCache.ts
3. src/render/MeshBuffer.ts
4. src/render/TextureAtlas.ts
5. src/render/RenderQueue.ts
6. src/render/PostProcess.ts
7. src/render/Camera.ts
8. src/render/Lighting.ts
9. src/render/Material.ts

SHADER REQUIREMENTS (GLSL ES 3.0):
- precision mediump float
- in/out instead of varying
- PCF 3x3 shadow
- Simplified Disney BRDF

OPTIMIZATION:
- Draw call batching: < 100 calls for low tier
- Instancing for vegetation/crowd
- Texture compression: ETC2/ASTC
- Avoid framebuffer readback

OUTPUT: Complete TypeScript + GLSL shader sources.
Include test scene: 3 cubes, ground plane, directional light with shadow.
```

---

## 📋 PROMPT #5: WORLD STREAMING & PROCEDURAL GENERATION

```
You are a World Generation Engineer. Implement chunk-based world streaming
and procedural terrain generation for an open-world mobile game.

World size: theoretically infinite, 500m x 500m chunks.
Player max speed: 83m/s. No loading screens.

FILES TO GENERATE:
1. wasm/src/procgen/mod.rs
2. wasm/src/procgen/terrain.rs — FBM noise heightmaps
3. wasm/src/procgen/biome.rs — 7 biome types with blending
4. wasm/src/procgen/vegetation.rs — Poisson disk scattering
5. wasm/src/world/mod.rs
6. wasm/src/world/chunk.rs — Chunk data with serialization
7. wasm/src/world/streamer.rs — Predictive chunk loading
8. wasm/src/world/lod.rs — 5 LOD levels
9. src/core/ChunkStreamerProxy.ts — JS bridge
10. src/world/TerrainRenderer.ts — GPU terrain rendering

MEMORY BUDGET:
- Heightmap per chunk: 16.9KB
- 25 chunks loaded: ~423KB heightmaps
- Total terrain memory: < 32MB

OUTPUT: Complete Rust + TypeScript. Demo: 3x3 chunk grid with wireframe toggle.
```

---

## 📋 PROMPT #6: AI SYSTEM — PERCEPTION, BEHAVIOR & PATHFINDING

```
You are an AI Programmer implementing a scalable agent AI system.
Handle 50 agents (low) to 1000 agents (high) efficiently.

FILES TO GENERATE:
1. wasm/src/ai/mod.rs
2. wasm/src/ai/perception.rs — Sight, Hearing, Smell, Touch
3. wasm/src/ai/memory.rs — Spatial memory with decay
4. wasm/src/ai/behavior.rs — Behavior Trees (Selector, Sequence, Action, Condition)
5. wasm/src/ai/tactical.rs — Squad AI with formations
6. wasm/src/ai/scheduler.rs — Time-sliced updates
7. wasm/src/nav/mod.rs
8. wasm/src/nav/mesh.rs — NavMesh from terrain
9. wasm/src/nav/pathfind.rs — A*, Theta*, RVO, Funnel
10. wasm/src/nav/crowd.rs — Crowd simulation with flow fields

TIER SCALING:
- LOW: 50 agents, 5Hz, simple FSM, no pathfinding
- MID: 200 agents, 10Hz, behavior trees, A*, 5 squads
- HIGH: 1000 agents, 30Hz, full BT, Theta*+RVO, 20 squads

OUTPUT: Complete Rust AI + Navigation. Example BT:
"Patrol → If See Player → Chase → If In Range → Attack → If Health<30% → Flee"
```

---

## 📋 PROMPT #7: ANIMATION & CHARACTER SYSTEM

```
You are an Animation Programmer implementing runtime animation for mobile.
Skeletal animation with up to 64 bones, blending, IK, root motion, facial.

FILES TO GENERATE:
1. wasm/src/anim/mod.rs
2. wasm/src/anim/skeleton.rs — 64 bones max
3. wasm/src/anim/pose.rs — Local/global pose, blend, delta
4. wasm/src/anim/clip.rs — Keyframed animation clips
5. wasm/src/anim/blend.rs — Layers, cross-fade, 1D/2D blendspace
6. wasm/src/anim/ik.rs — TwoBoneIK, FABRIK, FootIK, HandIK, LookAtIK
7. wasm/src/anim/state_machine.rs — Animation states with transitions
8. wasm/src/anim/facial.rs — 52 FACS blendshapes, lip sync, eye tracking
9. wasm/src/anim/root_motion.rs — Extract and apply root motion
10. src/render/Skinning.ts — GPU skinning

TIER SCALING:
- LOW: 32 bones, no IK, 1D blendspace
- MID: 64 bones, foot IK, 2D blendspace, 4 facial shapes
- HIGH: 64 bones, full IK, 52 facial shapes, root motion

OUTPUT: Complete Rust animation + TS skinning. Example: walk cycle with foot IK.
```

---

## 📋 PROMPT #8: AUDIO ENGINE — 3D SPATIAL AUDIO & MIXER

```
You are an Audio Programmer implementing 3D spatial audio.
WebAudio API + WASM symphonia decoder.

FILES TO GENERATE:
1. wasm/src/audio/mod.rs
2. wasm/src/audio/decoder.rs — OGG/FLAC/WAV decode
3. wasm/src/audio/mixer.rs — Multi-channel mixing with ducking
4. wasm/src/audio/spatial.rs — HRTF, attenuation, Doppler, occlusion
5. wasm/src/audio/reverb.rs — FDN reverb, material-based zones
6. src/audio/AudioEngine.ts — WebAudio bridge
7. src/audio/AudioWorkletProcessor.ts — Real-time WASM mixer
8. src/audio/SoundBank.ts — LRU asset management

TIER SCALING:
- LOW: mono, no spatial, 8 channels, no reverb
- MID: stereo, distance atten, 16 channels, simple reverb
- HIGH: HRTF binaural, full occlusion, 32 channels, convolution reverb

OUTPUT: Complete Rust audio + TS WebAudio. Example: looping ambient with distance.
```

---

## 📋 PROMPT #9: INPUT SYSTEM — TOUCH, GAMEPAD & SENSORS

```
You are an Input Programmer implementing comprehensive mobile input.
Multi-touch, virtual controls, gamepad, gyro, accessibility.

FILES TO GENERATE:
1. src/input/InputManager.ts — Central hub with action mapping
2. src/input/TouchInput.ts — Gestures: tap, swipe, pinch, pan, rotate
3. src/input/GamepadInput.ts — Standard mapping, deadzone, vibration
4. src/input/SensorInput.ts — Gyro, accel, magnetometer, fusion
5. src/input/ActionMap.ts — Context-sensitive bindings
6. src/input/GestureRecognizer.ts — Shape/letter recognition
7. src/input/AccessibilityInput.ts — Switch, voice, eye tracking
8. src/ui/VirtualControls.tsx — React on-screen joystick + buttons

ACCESSIBILITY:
- aria-labels, screen reader, color-blind symbols, adjustable sizes

OUTPUT: Complete TS input system + React virtual controls.
Demo: joystick controlling circle on screen.
```

---

## 📋 PROMPT #10: UI SYSTEM — HUD, MENUS & EDITOR PANELS

```
You are a UI/UX Engineer implementing complete UI with React 19 + Tailwind.
Thumb-friendly, responsive, accessible, 60fps.

DESIGN SYSTEM:
- Material You colors, Inter font, 4dp grid
- 12dp cards, 8dp buttons, 50% FAB
- 200ms motion standard

FILES TO GENERATE:
1. src/ui/components/Button.tsx — 5 variants, 3 sizes
2. src/ui/components/Card.tsx — Elevation slots
3. src/ui/components/Modal.tsx — Focus trap, slide-up
4. src/ui/components/Slider.tsx — Continuous/discrete
5. src/ui/components/Toggle.tsx — Animated switch
6. src/ui/components/Progress.tsx — Linear/circular
7. src/ui/components/Toast.tsx — Swipe dismiss
8. src/ui/components/VirtualList.tsx — Windowing
9. src/ui/screens/MainMenuScreen.tsx — Particle background
10. src/ui/screens/HUDScreen.tsx — Health, minimap, crosshair, subtitles
11. src/ui/screens/PauseScreen.tsx — Blur background
12. src/ui/screens/SettingsScreen.tsx — 6 tabs
13. src/ui/screens/LoadingScreen.tsx — Progress + tips
14. src/ui/screens/EditorScreen.tsx — Resizable panels

OUTPUT: Complete React + TS + Tailwind for all 14 files.
```

---

## 📋 PROMPT #11: GAME LOOP & ENGINE ORCHESTRATOR

```
You are an Engine Programmer implementing the main game loop.
Fixed timestep, lifecycle, profiling, debugging, saving.

FILES TO GENERATE:
1. src/core/EngineLoop.ts — Fixed + variable timestep, accumulator clamp
2. src/core/SystemManager.ts — Ordered updates, time-slicing, degradation
3. src/core/SceneManager.ts — Load/unload, transitions, hot reload
4. src/core/GameStateManager.ts — State machine: Boot→Menu→Play→Pause→Over
5. src/core/Profiler.ts — CPU/GPU/memory, overlay, export
6. src/core/Debugger.ts — Console, inspector, physics/render/AI debug
7. src/core/LifecycleManager.ts — Visibility, resize, orientation, battery
8. src/core/SaveManager.ts — Local + cloud, FlatBuffers, LZ4, AES-256
9. src/core/AssetManager.ts — Load/unload, LRU, hot reload, .t3pak
10. wasm/src/engine/mod.rs — WASM entry: init, step, get commands

OUTPUT: Complete TS orchestrator + Rust engine entry.
Integration test: boot → load scene → 60 frames → shutdown.
```

---

## 📋 PROMPT #12: NETWORKING & MULTIPLAYER FOUNDATION

```
You are a Network Programmer implementing client-server multiplayer.
Server-authoritative, client prediction, WebSocket + WebRTC voice.

FILES TO GENERATE:
1. wasm/src/net/mod.rs
2. wasm/src/net/protocol.rs — FlatBuffers messages, LZ4, AES-256-GCM
3. wasm/src/net/snapshot.rs — Delta compression, interest management
4. wasm/src/net/prediction.rs — Input history, reconciliation, smoothing
5. wasm/src/net/lag_compensation.rs — Rewind, hit validation
6. src/net/NetworkClient.ts — WebSocket client, jitter buffer, reconnect
7. src/net/NetworkManager.ts — Host, join, matchmaking, party, spectator
8. src/net/VoiceChat.ts — WebRTC, Opus, spatial voice, RNNoise
9. src/net/AntiCheat.ts — Input validation, physics check, wall hack
10. src/net/server/*.ts — GameServer, WorldSimulation, Matchmaker

TIER SCALING:
- LOW: single player (networking disabled)
- MID: co-op 4 players, P2P, 10Hz
- HIGH: MMO 100 players, dedicated server, 20Hz

OUTPUT: Complete Rust protocol + TS client + server skeleton.
Example: 2 clients connect, one moves, other sees it < 100ms latency.
```

---

## 📋 PROMPT #13: BUILD PIPELINE & ASSET COMPRESSION

```
You are a Build Engineer creating automated build and asset pipeline.

FILES TO GENERATE:
1. scripts/build.js — Orchestrator: clean → wasm → js → compress → package
2. scripts/compile-wasm.js — wasm-pack + wasm-opt + wasm-strip + brotli
3. scripts/optimize-assets.js — Textures→KTX2, Meshes→Draco, Audio→OGG
4. scripts/pak-assets.js — .t3pak format with LZ4/ZSTD + AES-256
5. scripts/package-pwa.js — Manifest, SW, preload hints
6. scripts/package-twa.js — Android TWA wrapper generation
7. scripts/bundle-analyzer.js — Treemap, size analysis
8. vite.config.ts — Code splitting, compression, CSS extraction
9. .github/workflows/ci.yml — Lint, test, build, e2e, deploy
10. docker/Dockerfile — Rust + Node build environment

BUILD TARGETS:
- Development: WASM 5MB, JS 2MB
- Production: WASM < 1MB (brotli 300KB), JS < 500KB (gzip 150KB)

OUTPUT: Complete build scripts + configs.
Example: npm run build:production → verify sizes.
```

---

## 📋 PROMPT #14: SECURITY & ANTI-TAMPER SYSTEM

```
You are a Security Engineer implementing anti-cheat and anti-tamper.

FILES TO GENERATE:
1. wasm/src/security/mod.rs
2. wasm/src/security/integrity.rs — Runtime hash, anti-debug
3. wasm/src/security/memory.rs — XOR encryption, checksums
4. wasm/src/security/obfuscation.rs — String encryption, fake decoys
5. src/security/RootDetector.ts — Root/jailbreak detection
6. src/security/CertificatePinning.ts — MITM prevention
7. src/security/PacketEncryption.ts — AES-256-GCM, ECDH, PFS
8. src/security/AntiCheatClient.ts — Speed hack, aim bot detection
9. wasm/src/security/replay.rs — Deterministic replay validation
10. src/security/SecureStorage.ts — AES-256-GCM saves

OUTPUT: Complete Rust + TS security. Example: detect root → disable ranked.
```

---

## 📋 PROMPT #15: TESTING & QA FRAMEWORK

```
You are a QA Engineer creating comprehensive testing infrastructure.

FILES TO GENERATE:
1. src/test/setup.ts — Jest, mock WebGL/WebAudio/sensors
2. wasm/src/test/mod.rs — Rust test helpers, quickcheck, criterion
3. src/test/unit/math.test.ts — 100+ math test cases
4. src/test/unit/ecs.test.ts — Spawn, query, system order
5. src/test/unit/physics.test.ts — Gravity, collision, determinism
6. src/test/unit/render.test.ts — Context, shaders, framebuffers
7. src/test/unit/input.test.ts — Gestures, joystick, remapping
8. src/test/integration/gameplay.test.ts — Full game loop
9. src/test/e2e/mobile.test.ts — Playwright mobile emulation
10. src/test/performance/benchmarks.ts — FPS, memory, load time
11. src/test/fuzz/fuzz_targets.rs — Asset, network, input fuzzing
12. .github/workflows/qa.yml — CI pipeline

OUTPUT: Complete testing framework with 50+ test files.
```

---

## 📋 PROMPT #16: DEPLOYMENT & DISTRIBUTION

```
You are a DevOps Engineer creating deployment pipelines.

TARGETS: Web PWA, Android TWA, iOS PWA, Desktop

FILES TO GENERATE:
1. firebase.json — Hosting config, CSP, redirects
2. .github/workflows/deploy-web.yml — Firebase production deploy
3. .github/workflows/deploy-android.yml — Play Console upload
4. fastlane/Fastfile — Beta, release, screenshots, metadata
5. scripts/release-checklist.js — Validation before release
6. public/robots.txt + sitemap.xml
7. src/analytics/Analytics.ts — GA4, Firebase, custom events
8. src/crash/CrashReporter.ts — Sentry, breadcrumbs, offline queue
9. src/telemetry/Telemetry.ts — FPS, memory, battery, thermal

CHECKLIST:
□ PWA manifest valid
□ TWA asset links verified
□ APK signed
□ Play Store screenshots
□ Privacy policy
□ Age rating
□ Staged rollout

OUTPUT: Complete deployment configs + one-command deploy.
```

---

## 📋 PROMPT #17: DOCUMENTATION & ONBOARDING

```
You are a Technical Writer creating comprehensive documentation.

DOCUMENTATION SET:
1. docs/ARCHITECTURE.md — 4-layer diagram, data flow, memory layout
2. docs/API.md — WASM exports, JS modules, React components
3. docs/BUILD.md — Prerequisites, setup, commands, troubleshooting
4. docs/CONTRIBUTING.md — Code style, git workflow, testing
5. docs/PERFORMANCE.md — Frame budget, memory budget, optimization
6. docs/MOBILE_OPTIMIZATION.md — Tier detection, thermal, battery
7. docs/SECURITY.md — Threat model, anti-cheat, encryption
8. docs/TROUBLESHOOTING.md — Common issues and solutions
9. docs/CHANGELOG.md — Keep a Changelog format
10. README.md — Badges, quick start, features, benchmarks

OUTPUT: Complete markdown docs with Mermaid diagrams and code blocks.
```

---

## 📋 PROMPT #18: FINAL INTEGRATION & SMOKE TEST

```
You are the Lead Engineer performing final integration.

SMOKE TEST SCENARIO: "First Boot Experience"
1. Open app on itel A70 → detect LOW tier → apply preset
2. Splash → Main Menu → Tap Play
3. Load procedural terrain (3x3 chunks)
4. Spawn player, walk with virtual joystick
5. Physics: gravity, ground collision
6. Camera follows (3rd person)
7. 5 AI agents patrol, detect player, chase
8. Jump button → animation plays, foot IK
9. Footstep SFX based on terrain
10. Pause → Settings → change to MID → reload shaders
11. Resume, auto-save after 60s
12. Exit → "Save successful"

VERIFICATION:
□ No JS errors, no Rust panics
□ WASM heap < 128MB, JS heap < 64MB
□ Frame time < 33ms (30fps minimum)
□ No memory leaks
□ Touch latency < 50ms
□ Audio no stutter
□ APK < 15MB, PWA load < 3s
□ Lighthouse > 80

FILES TO GENERATE:
1. src/smoke/SmokeTest.ts — Automated scenario
2. src/smoke/scenarios/*.ts — Boot, Gameplay, Settings, Stress
3. scripts/smoke-test.js — Headless runner with HTML report
4. src/demo/DemoScene.ts — Integrated demo scene

OUTPUT: Complete smoke test suite + demo scene.
Run: npm run smoke-test → generates report with screenshots.
```

---

# 🗺️ ROADMAP PENGEMBANGAN (18 Prompt = 18 Phase)

| Phase | Prompt | Durasi Estimasi | Deliverable |
|-------|--------|-----------------|-------------|
| 1 | #0 Project Setup | 1 hari | Project scaffold runnable |
| 2 | #1 Device Detector | 0.5 hari | Auto-quality selection |
| 3 | #2 ECS & Math | 2 hari | Core engine foundation |
| 4 | #3 Physics | 2 hari | Character controller + collision |
| 5 | #4 WebGL Renderer | 3 hari | Forward PBR renderer |
| 6 | #5 World Streaming | 2 hari | Procedural terrain |
| 7 | #6 AI System | 2 hari | Behavior trees + pathfinding |
| 8 | #7 Animation | 2 hari | Skeletal + IK |
| 9 | #8 Audio Engine | 1.5 hari | 3D spatial audio |
| 10 | #9 Input System | 1 hari | Touch + gamepad + gyro |
| 11 | #10 UI System | 2 hari | Complete UI screens |
| 12 | #11 Game Loop | 1 hari | System orchestration |
| 13 | #12 Networking | 2 hari | Multiplayer foundation |
| 14 | #13 Build Pipeline | 1 hari | Automated builds |
| 15 | #14 Security | 1 hari | Anti-cheat + encryption |
| 16 | #15 Testing | 1 hari | Test framework |
| 17 | #16 Deployment | 0.5 hari | CI/CD pipelines |
| 18 | #17-18 Docs & Integration | 1 hari | Documentation + smoke test |
| **TOTAL** | | **~26 hari** | **Production-ready engine** |

> Durasi estimasi: 1 engineer full-time dengan Google AI Studio sebagai
> pair programmer (3-5x lebih cepat dari manual coding).

---

# 💡 TIPS PENGGUNAAN AI STUDIO

1. **Satu prompt per sesi.** AI Studio memiliki context limit.
   Jangan input semua sekaligus.

2. **Pecah jika timeout.** Contoh: Prompt #4 bisa dipecah menjadi:
   - 4a: WebGL2Context + ShaderCache
   - 4b: MeshBuffer + TextureAtlas
   - 4c: RenderQueue + PostProcess
   - 4d: Camera + Lighting + Material

3. **Gunakan "Continue"** jika output terpotong.
   Ketik: "Continue dari file [nama] baris terakhir."

4. **Validasi dengan compile:**
   - Rust: `cargo check` atau `wasm-pack build`
   - TypeScript: `npx tsc --noEmit`
   - Jika error, paste ke AI Studio: "Fix compile error: [error]"

5. **Simpan checkpoint** setiap phase:
   ```bash
   git add .
   git commit -m "phase-4-renderer-complete"
   git tag phase-4
   ```

6. **Iterative refinement:**
   - Phase 1-3: Core functionality
   - Phase 4-8: Visual dan gameplay feel
   - Phase 9-12: Polish dan multiplayer
   - Phase 13-18: Production readiness

---

# 📎 APPENDIX: SPESIFIKASI TEKNIS

## Device Target: itel A70
- SoC: Unisoc T603 (12nm, 2x A75 @ 1.8GHz + 6x A55 @ 1.6GHz)
- GPU: Mali-G57 MP1 (1 core, 650MHz)
- RAM: 4GB (system ~2GB, app budget: 512MB-1GB)
- Storage: 64GB eMMC 5.1
- Display: 720x1600, 90Hz (target 60fps stable)
- Android: 12 (Go Edition)
- Browser: Chrome 120+ (WebGL 2.0, WASM, WebAudio)

## Memory Budget (512MB)
| Category | Budget |
|----------|--------|
| WASM Heap | 128MB |
| JS Heap | 64MB |
| GPU Textures | 64MB |
| GPU Meshes | 32MB |
| GPU Framebuffers | 32MB |
| Audio Buffers | 16MB |
| Runtime (ECS, etc) | 64MB |
| Streaming Cache | 64MB |
| UI & Overhead | 32MB |
| Reserve | 16MB |

## Frame Budget (16.67ms @ 60fps)
| System | Budget |
|--------|--------|
| Input | 0.1ms |
| Physics | 2.0ms |
| AI | 1.0ms |
| Animation | 1.0ms |
| Game Logic | 1.0ms |
| Culling | 0.5ms |
| Render Submit | 1.0ms |
| GPU | 7.0ms |
| Audio | 0.5ms |
| UI | 1.0ms |
| Misc | 1.57ms |

## Build Targets
| Target | Size | Format |
|--------|------|--------|
| PWA Initial | < 2MB | Brotli compressed |
| PWA Total | < 50MB | Cached assets |
| TWA APK | < 5MB | Android launcher |
| WASM Binary | < 1MB | wasm-opt + Brotli |
| JS Bundle | < 500KB | Code split + gzip |

---

*Dokumen ini merupakan panduan lengkap untuk pengembangan T3D-WASM Mobile
Engine menggunakan Google AI Studio. Setiap prompt dirancang untuk
menghasilkan kode production-ready yang dapat langsung di-compile dan dijalankan.*

*Versi: 1.0.0*  
*Tanggal: 2026-08-31*  
*Target: itel A70 (Android 5+, 1-4GB RAM)*
