# Mungil Engine V7 — Bowo: Guardian of Light (Android)

Native Kotlin + Jetpack Compose + Material 3 rewrite of **Mungil Engine V7**, optimized for low-entry Android devices (target 30–60 FPS, minimal allocations).

## Features
- **3-Chapter Action RPG (`Bowo: Penjaga Cahaya`)**: Play Desa Fajar, Jembatan Badai, and Menara Kala (3-phase Boss Kala) with customizable Virtual Joystick, Dash Parry, Burst, coyote time, and 16 playable genre templates.
- **12 Studio Tabs**: Play, Scene & Physics Inspector (6 presets, drag-and-drop Box/Circle/Polygon collision editor, Keep-World grouping), AI & Local 16-Tool MCP Hub, Qolbu Arena AI (Solo Coach, Co-Play Companion, VS Boss Kala), Asset Manager (2 MB LRU + 16x16 Pixel & 12x8 Tilemap editors), Procedural Generators (Character 3D-Stack, Low-Poly 3D Mesh `.obj`/`.gltf`, Music Tracker, SFX/TTS+SRT/VTT, Cutscene, Terrain, Complete Game Forge), Touch Controls & Accessibility (Dark/Light/High Contrast, 5 languages), 12 Art Styles + Palette/Shader editor, Bytecode VM + No-Code Event Sheet + 25 Validators + 8-Stage Security Audit, AI Skills (`CLAUDE.md`, `GEMINI.md`, etc.), Offline 3-Slot+Auto Saves (`SharedPreferences` with FNV-1a checksum & v6.1->v7.0 migration), and SAF File Export (`JSON`, `MPAK7` RLE `.pak`, `HTML`, Android SDK target config).
- **Zero-KB Procedural Audio**: Native Android `AudioTrack` PCM synthesizer with 3-channel chiptune tracker, spatial attenuation, and `TextToSpeech` dubbing.

## Build
Open in Android Studio or build with Gradle (`compileSdk = 36`, `minSdk = 24`, Kotlin + Jetpack Compose):
```bash
gradle assembleDebug
gradle :app:testDebugUnitTest
```
