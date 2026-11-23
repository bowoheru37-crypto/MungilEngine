# Aetherfall — Mobile / itel A70 Optimization Pass

## Status

This pass refines the existing **React + TanStack Start + Three.js web/PWA game**. It does not convert the project to a native Android application and does not produce an APK. The app remains compatible with the existing PWA/preview integration and platform branding.

The target is an entry-level Android phone such as the itel A70. The conservative default is intended for devices with a coarse/touch pointer and either up to 4 GB of reported device memory or 8 or fewer logical CPU cores. Browser implementations may omit `navigator.deviceMemory`; the CPU-core fallback remains active.

## Implemented changes

### 1. Device-aware graphics profiles

A new `src/game/performance.ts` centralizes device classification and performance budgets.

| Setting | Auto on constrained touch devices | Eco | Balanced |
|---|---:|---:|---:|
| Render pixel-ratio cap | 1.0 | 1.0 | 1.25 on touch / 1.5 on desktop |
| Main render target | ~30 FPS | ~30 FPS | ~45 FPS touch / ~60 FPS desktop |
| Terrain segments | 56 | 56 | 72 |
| Trees drawn | 75% | 75% | 100% |
| Rocks drawn | Up to 26 | Up to 26 | Up to 40 |
| Shadow map | Disabled | Disabled | 512² touch / 1024² desktop |
| Tone mapping | Standard/no tone map | Standard/no tone map | ACES filmic |
| Mobile anti-aliasing | Off | Off | Off |

The frame scheduler uses a timer before the next animation frame for lower refresh budgets, reducing unnecessary 60 Hz JavaScript wakeups while retaining animation-frame synchronization. Simulation updates remain fixed-step at 60 Hz, with a bounded catch-up window to avoid a runaway backlog after a slow frame.

The quality selector is available from the main menu and persists the selection locally. Switching between Eco and Balanced updates the terrain geometry and visible instanced counts at runtime; it does not keep duplicate high- and low-detail terrain meshes resident simultaneously.

### 2. Three.js rendering and resource lifecycle

- Uses `low-power` WebGL preference in the automatically selected Eco profile and `mediump` shader precision.
- Disables expensive mobile MSAA/antialiasing and shadow rendering in Eco.
- Caps drawing-buffer pixel ratio to limit fill-rate and memory bandwidth.
- Uses a lighter `MeshStandardMaterial` for water instead of `MeshPhysicalMaterial`.
- Reduces vegetation and rock instance counts in Eco while preserving the full instance buffers for Balanced mode.
- Explicitly marks initial instance matrices for GPU upload.
- Builds terrain at 56 or 72 segments and disposes the previous geometry when quality changes.
- Reuses the visible-entity set during rendering instead of allocating a new set every frame.
- Disposes geometry and unique materials when temporary entity groups leave the scene; shared team/environment materials are retained until world teardown.
- Defers the ~1 MB animated Herald GLB load in Eco; Balanced mode requests it lazily.
- Keeps existing instancing for minions/projectiles and existing distance-based character animation LOD.
- Widens the mobile camera FOV and moves it farther back to expose more of the battlefield on a narrow screen.

### 3. Game-loop, lifecycle and touch-input stability

- Stops the animation loop when the document becomes hidden.
- Automatically pauses an active match when the app is backgrounded, clears held controls, and requires an explicit Resume after returning.
- Suspends the Web Audio context and music scheduler while hidden; resumes them when the app becomes visible.
- Closes the AudioContext and clears the music timer on game disposal.
- Reduces music scheduling frequency from 280 ms to 320 ms and avoids running the timer while muted or backgrounded.
- Bounds simulation catch-up to four 60 Hz steps per rendered frame.
- Prevents stale movement, attack, cast, camera, or shop inputs from carrying into a new match or after returning to the menu.
- Adds pointer-cancel/lost-pointer-capture handling for the joystick, camera controls, and attack button.
- Updates the joystick knob with a direct transform rather than triggering React state updates on every pointer movement.
- Throttles minimap redraws to approximately 9 Hz rather than repainting it on every frame.
- Guards local record writes so storage quota/private-mode failures do not interrupt the match.

### 4. Mobile UI and startup/network cost

- Adds safe-area-aware top and bottom spacing for notched Android screens and edge-to-edge layouts.
- Preserves touch controls with 44 px minimum action targets.
- Adds a compact Auto / Eco / Balanced selector with local persistence.
- Removes the external Google Fonts stylesheet dependency. Display and body typography now use system font stacks, so the first render does not wait for a third-party font request and does not spend mobile data on font downloads.

## Files changed

- `src/game/performance.ts` — new device/profile policy.
- `src/game/performance.test.ts` — new profile and frame-budget unit tests.
- `src/game/render.ts` — WebGL quality, dynamic terrain/instance levels, group disposal and render-cost reductions.
- `src/game/createGame.ts` — frame scheduler, background pause, input cleanup, minimap throttling and storage guard.
- `src/game/audio.ts` — audio suspend/resume, scheduler lifecycle and context disposal.
- `src/components/aetherfall/RiftApp.tsx` — saved graphics selector, safe-area layout and robust mobile pointer controls.
- `src/routes/__root.tsx` and `src/styles.css` — remove remote fonts and use system font stacks.
- `package.json` — register the new performance tests in the test script.

## Source archive handling

The supplied `attachments/studio (1).html` CharacterAtelier page and its JSON/MIDI companion files are preserved unchanged in `attachments/`. They are a separate large studio/editor artifact and reference assets under `mable-mobile.invalid`; they are not embedded into the active match UI because those asset URLs are not a usable runtime asset source. The playable Aetherfall app continues to use its own local `public/models/herald.glb` and `public/music/*.mid` assets.

## Validation performed

- New performance-policy tests: **5 passed**.
- Dependency-free existing TypeScript utility tests plus the new tests: **15 passed**.
- Existing project script tests, excluding `scripts/grok-pwa-plugin.test.mjs`: **148 passed**.
- TypeScript syntax transpilation for all 7 edited TS/TSX files: **7/7 passed**.

## Validation blocked / not claimed

The workspace did not include `node_modules`. Installing dependencies was attempted but failed because DNS resolution for `registry.npmjs.org` returned `EAI_AGAIN`. Consequently:

- A complete `tsc --noEmit` type-check could not run because `@types/node` and `vite/client` were unavailable.
- Two dependency-backed existing test files could not import `@tanstack/react-start/server` and `jose`.
- Eight tests in the untouched PWA-injector test file reported app-identity/title expectation mismatches (`Aetherfall` metadata versus test fixture titles); no platform injector code was changed.
- Vite production build, dev preview, browser smoke screenshots, and runtime gameplay QA were not run.
- No physical itel A70 frame-time, thermal, battery, memory, or touch-latency measurements were collected.

The stated FPS values are **frame-budget targets**, not measured performance guarantees. A final device pass should measure sustained frame time and memory during a full match, particularly after 10–15 minutes of play, with Eco selected.

## Recommended final device acceptance targets

1. Hold a stable 30 FPS target through a full match on itel A70 in Auto/Eco; inspect 1% low frame time, not only average FPS.
2. Confirm no visual gaps or missing foliage after toggling Eco ↔ Balanced repeatedly.
3. Confirm app background/resume does not continue simulation or leave any movement/attack input latched.
4. Check WebGL context-loss behavior and Android Chrome memory pressure while switching apps.
5. Verify PWA installation, orientation changes, safe areas, and touch targets on the physical phone.
6. Only after these checks, create a native wrapper/TWA or Android Studio project if an APK is required.
