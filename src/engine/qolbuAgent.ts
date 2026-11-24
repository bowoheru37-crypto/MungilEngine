import type { McpToolSpec, StudioTab, WizardGameSpec } from './types';

export interface TutorialStep {
  step: number;
  title: string;
  desc: string;
  targetTab: StudioTab;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { step: 1, title: 'Pilih Chapter & Genre', desc: 'Pilih Desa Fajar, Jembatan Badai, Menara Kala, atau 14 genre di tab Play.', targetTab: 'play' },
  { step: 2, title: 'Atur Tombol Sentuh', desc: 'Sesuaikan ukuran tombol >=44px & layout D-Pad untuk jempol Itel A70.', targetTab: 'controls' },
  { step: 3, title: 'Ganti Art Style 1-Tap', desc: 'Coba Pixel, Anime, Cyberpunk, Watercolor, hingga Raycast 3D.', targetTab: 'art' },
  { step: 4, title: 'Buat Hero & Musik Sendiri', desc: 'Generate karakter 2D/3D-Stack & BGM chiptune di tab Generators.', targetTab: 'generators' },
  { step: 5, title: 'Pasang Physics Preset', desc: 'Pilih Bouncy, Heavy, Ghost, atau Slippery di Scene & Inspector.', targetTab: 'scene' },
  { step: 6, title: 'Grup & Edit Collision', desc: 'Gabungkan beberapa objek ke CONTAINER dan geser titik Polygon hitbox.', targetTab: 'scene' },
  { step: 7, title: 'Cek Rules & 15Hz AI', desc: 'Tambahkan aturan WHEN -> THEN No-Code dan cek 9 Larangan Mutlak di Lab.', targetTab: 'lab' },
  { step: 8, title: 'Rakit Game via Wizard', desc: 'Gunakan Pembantu Buat Game 5 langkah untuk menciptakan game barumu.', targetTab: 'agent' },
  { step: 9, title: 'Main Bareng / Lawan AI', desc: 'Uji Mode Solo AI, Co-Play Qolbu, atau Boss Kala Adaptif di Arena AI.', targetTab: 'arena' },
  { step: 10, title: 'Export Offline / APK Pack', desc: 'Simpan bundle HTML, MPAK7 .pak, atau Android Gradle Build Pack.', targetTab: 'export' },
];

export interface QolbuEngineTopic {
  id: string;
  title: string;
  summary: string;
  detail: string;
  tab: StudioTab;
}

export const QOLBU_ENGINE_TOPICS: QolbuEngineTopic[] = [
  {
    id: 'gc',
    title: 'Zero-GC SoA Game Loop',
    summary: 'Array pre-allocated TypedArray tanpa new/delete di tengah frame.',
    detail: 'Mencegah GC pause 150ms di Android RAM 3GB (Itel A70) dengan recycle slot free-list.',
    tab: 'lab',
  },
  {
    id: 'layers',
    title: '7-Layer Unified Core',
    summary: 'Foundation -> Assets -> World -> FD Lite Render -> FSM -> 15Hz AI -> Audio Pool.',
    detail: 'Menyatukan 25+ teknik top repo GitHub agar semua sistem tetap di bawah 35 draw call.',
    tab: 'lab',
  },
  {
    id: 'presets',
    title: '6 Physics Presets',
    summary: 'Normal, Bouncy, Heavy, Ghost, Slippery, dan Ball siap pakai 1-tap.',
    detail: 'Langsung mengisi mass, friction, restitution, gravityScale, linearDamp, isTrigger, & CCD.',
    tab: 'scene',
  },
  {
    id: 'group',
    title: 'Group Entities & Container',
    summary: 'Parent-child hierarchy dengan keep-world math (world = parentWorld * local).',
    detail: 'Move/Scale/Rotate Container menggerakkan seluruh child secara proporsional tanpa bergeser saat group.',
    tab: 'scene',
  },
  {
    id: 'collision',
    title: 'Collision Shape Editor',
    summary: 'Box, Circle, dan Polygon interaktif dengan deteksi overlap real-time.',
    detail: 'Menampilkan status Aman (hijau), Dekat <8px (kuning), atau Overlap + kedalaman penetrasi px (merah).',
    tab: 'scene',
  },
  {
    id: 'ai15hz',
    title: '15Hz Eco AI Decimation',
    summary: 'AI berpikir tiap 2 frame pada tier Eco — hemat 50% CPU & baterai.',
    detail: 'Fisika & render tetap halus 30/60 FPS, sementara evaluasi Utility AI/FSM dijalankan di 15Hz.',
    tab: 'arena',
  },
  {
    id: 'mcp',
    title: 'Local MCP Hub (16 Tools)',
    summary: 'Protokol Client -> Server -> Editor Bridge lokal tanpa token rahasia.',
    detail: 'Menghubungkan agen Qolbu langsung ke Scene, Generator, Lab, Arena AI, dan Export.',
    tab: 'agent',
  },
  {
    id: 'fsm',
    title: 'Table-Driven FSM + Spring',
    summary: '8 pose karakter + 2-bone damped spring untuk jubah Bowo.',
    detail: 'Menggantikan if/else panjang dengan tabel prioritas + pegas ringan tanpa cloth mesh berat.',
    tab: 'art',
  },
  {
    id: 'security',
    title: 'IsValidMove Security Guard',
    summary: 'Tolak koordinat NaN/Infinity dan clamp speed-hack teleportasi.',
    detail: 'Berjalan di kernel simulasi utama dan Qolbu Arena AI sebelum resolusi batas dunia.',
    tab: 'lab',
  },
  {
    id: 'audio',
    title: '16-Channel Web Audio Pool',
    summary: 'Musik 3-channel chiptune & spatial pan SFX 0 KB aset eksternal.',
    detail: 'Otomatis mute/suspend saat tab disembunyikan dan meredupkan BGM saat efek pukul aktif.',
    tab: 'generators',
  },
  {
    id: 'memory',
    title: '2 MB Eco LRU Asset Budget',
    summary: 'Auto-evict biome lama saat pindah chapter agar bebas OOM.',
    detail: 'Hero rig di-pin di memori, sedangkan peta chapter sebelumnya dibersihkan otomatis.',
    tab: 'assets',
  },
  {
    id: 'apk',
    title: 'PWA Offline & APK Build Pack',
    summary: 'Main tanpa internet dengan Service Worker + manifest Android Studio.',
    detail: 'Menghasilkan AndroidManifest, build.gradle.kts, ProGuard, dan migrasi API deprecated.',
    tab: 'export',
  },
];

export const LOCAL_MCP_TOOLS: McpToolSpec[] = [
  { id: 'list_tools', name: 'list_tools', desc: 'Tampilkan daftar seluruh 16 tool MCP lokal aktif.', params: '{}' },
  { id: 'explain_engine', name: 'explain_engine', desc: 'Jelaskan layer arsitektur, Zero-GC, atau 15Hz AI.', params: '{ topic: "gc" }' },
  { id: 'guide_player', name: 'guide_player', desc: 'Beri panduan langkah tutorial & hint HP/stuck.', params: '{ step: 1 }' },
  { id: 'create_game', name: 'create_game', desc: 'Buat game baru dari Wizard dan simpan ke Koleksi.', params: '{ genre: "Arena" }' },
  { id: 'spawn_entity', name: 'spawn_entity', desc: 'Tambah entitas baru ke Scene Hierarchy.', params: '{ type: "Enemy", preset: "BOUNCY" }' },
  { id: 'set_physics_preset', name: 'set_physics_preset', desc: 'Terapkan Physics Preset ke entitas terpilih.', params: '{ preset: "SLIPPERY" }' },
  { id: 'group_entities', name: 'group_entities', desc: 'Gabungkan 2+ entitas menjadi CONTAINER grup.', params: '{ name: "Squad Alpha" }' },
  { id: 'edit_collision_shape', name: 'edit_collision_shape', desc: 'Ubah bentuk collider ke Box/Circle/Polygon.', params: '{ type: "Circle", r: 24 }' },
  { id: 'generate_asset', name: 'generate_asset', desc: 'Sintesis karakter 3D-Stack baru untuk Bowo.', params: '{ archetype: "Knight" }' },
  { id: 'generate_level', name: 'generate_level', desc: 'Bangkitkan terrain & platform baru secara prosedural.', params: '{ biome: "storm" }' },
  { id: 'generate_dialog', name: 'generate_dialog', desc: 'Buat dialog pembuka chapter dari tema saat ini.', params: '{ chapter: 2 }' },
  { id: 'validate_game', name: 'validate_game', desc: 'Jalankan audit cepat 9 Larangan Mutlak & 25 Check.', params: '{}' },
  { id: 'export_game', name: 'export_game', desc: 'Buka tab Export untuk download HTML/JSON/APK Pack.', params: '{ target: "apk_pack" }' },
  { id: 'play_ai', name: 'play_ai', desc: 'Jalankan Qolbu Arena dalam mode Solo AI (Coach).', params: '{ mode: "solo" }' },
  { id: 'co_play_ai', name: 'co_play_ai', desc: 'Main Co-Op bersama Companion Qolbu AI.', params: '{ mode: "coplay" }' },
  { id: 'vs_ai', name: 'vs_ai', desc: 'Tantang Boss Kala Adaptif di Arena VS AI.', params: '{ mode: "vs" }' },
];

export const MCP_CONFIG_JSON = JSON.stringify(
  {
    mcpServers: {
      'mungil-qolbu-local': {
        transport: 'in-app-bridge',
        endpoint: 'local://mungil-engine-v7/mcp',
        offlineReady: true,
        requireApiKey: false,
        tools: LOCAL_MCP_TOOLS.map((t) => t.name),
      },
    },
  },
  null,
  2
);

export const STARTER_WIZARD_GAMES: WizardGameSpec[] = [
  {
    id: 'starter_lentera_runner',
    name: 'Lentera Runner',
    genre: 'Runner',
    sprite: 'Bowo Api',
    characterName: 'Bowo Kilat',
    preset: 'SLIPPERY',
    map: 'Jembatan Cahaya',
    enemies: 3,
    items: 4,
    aiMode: 'Sendiri',
    difficulty: 'Normal',
    durationSec: 60,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'starter_arena_kala',
    name: 'Arena Kala Mini',
    genre: 'Arena',
    sprite: 'Ksatria Cahaya',
    characterName: 'Guardian',
    preset: 'NORMAL',
    map: 'Arena Qolbu',
    enemies: 1,
    items: 3,
    aiMode: 'Lawan',
    difficulty: 'Hard',
    durationSec: 90,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'starter_rpg_fajar',
    name: 'RPG Desa Fajar',
    genre: 'RPG',
    sprite: 'Penjaga Desa',
    characterName: 'Bowo & Qolbu',
    preset: 'BOUNCY',
    map: 'Desa Fajar',
    enemies: 4,
    items: 5,
    aiMode: 'Bareng',
    difficulty: 'Easy',
    durationSec: 120,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export function buildWizardGameSpec(input: {
  name: string;
  genre: WizardGameSpec['genre'];
  sprite: string;
  characterName: string;
  preset: WizardGameSpec['preset'];
  map: WizardGameSpec['map'];
  enemies: number;
  items: number;
  aiMode: WizardGameSpec['aiMode'];
  difficulty: WizardGameSpec['difficulty'];
  durationSec: number;
}): WizardGameSpec {
  return {
    id: `game_${Date.now().toString(36)}_${Math.floor(Math.random() * 999)}`,
    name: input.name.trim() || `${input.genre} Qolbu`,
    genre: input.genre,
    sprite: input.sprite || 'Bowo Guardian',
    characterName: input.characterName.trim() || 'Bowo',
    preset: input.preset,
    map: input.map,
    enemies: Math.max(1, Math.min(6, Math.round(input.enemies))),
    items: Math.max(2, Math.min(6, Math.round(input.items))),
    aiMode: input.aiMode,
    difficulty: input.difficulty,
    durationSec: Math.max(30, Math.min(300, Math.round(input.durationSec))),
    createdAt: new Date().toISOString(),
  };
}

export function askQolbuAgent(question: string): { answer: string; recommendedTab?: StudioTab } {
  const q = question.toLowerCase().trim();
  if (!q) {
    return {
      answer: 'Tanyakan tentang Zero-GC, Physics Preset, Group Entities, Collision Editor, 15Hz AI, MCP, atau APK Build Pack!',
    };
  }
  if (q.includes('gc') || q.includes('lag') || q.includes('itel') || q.includes('memori') || q.includes('oom')) {
    return {
      answer:
        'Itel A70 dijaga oleh 9 Larangan Mutlak: SoA TypedArray 1024 slot (Zero-GC), AI 15Hz Eco (hemat 50% CPU), draw call <35, dan LRU Asset Budget 2 MB.',
      recommendedTab: 'lab',
    };
  }
  if (q.includes('preset') || q.includes('bouncy') || q.includes('heavy') || q.includes('ghost') || q.includes('fisika')) {
    return {
      answer:
        'Di tab Scene & Inspector tersedia 6 preset 1-tap: NORMAL, BOUNCY, HEAVY, GHOST (trigger tembus), SLIPPERY (licin), dan BALL (CCD anti-tembus).',
      recommendedTab: 'scene',
    };
  }
  if (q.includes('group') || q.includes('grup') || q.includes('container') || q.includes('parent')) {
    return {
      answer:
        'Centang >=2 entitas di Hierarchy lalu klik Group Entities. Math world = parentWorld * local menjaga posisi objek tetap akurat (keep world) saat digabung.',
      recommendedTab: 'scene',
    };
  }
  if (q.includes('collision') || q.includes('tabrak') || q.includes('hitbox') || q.includes('polygon')) {
    return {
      answer:
        'Collision Shape Editor mendukung Box, Circle, dan Polygon yang bisa digeser langsung di kanvas 360x240 dengan indikator Aman/Dekat <8px/Overlap.',
      recommendedTab: 'scene',
    };
  }
  if (q.includes('mcp') || q.includes('tool') || q.includes('bridge')) {
    return {
      answer:
        'MCP Hub lokal berjalan 100% di browser lewat arsitektur Client -> Server -> Editor Bridge dengan 16 tool aktif tanpa memerlukan API key eksternal.',
      recommendedTab: 'agent',
    };
  }
  if (q.includes('ai') || q.includes('arena') || q.includes('kala') || q.includes('co-op') || q.includes('main')) {
    return {
      answer:
        'Qolbu Arena AI mendukung 3 mode: Solo AI (Coach directive), Co-Play (Qolbu auto-heal <40% + 1x revive), dan VS Boss Kala (membaca 10 gerak terakhir).',
      recommendedTab: 'arena',
    };
  }
  if (q.includes('apk') || q.includes('android') || q.includes('export') || q.includes('gradle')) {
    return {
      answer:
        'Tab Export menyediakan APK Build Pack berisi AndroidManifest.xml, build.gradle.kts, ProGuard, dan tabel pengganti API Android deprecated ke AndroidX.',
      recommendedTab: 'export',
    };
  }
  if (q.includes('valid') || q.includes('isvalidmove') || q.includes('cheat') || q.includes('nan')) {
    return {
      answer:
        'validateMoveBounds() menolak koordinat NaN/Infinity dan membatasi jarak perpindahan per tick agar tidak terjadi speed-hack maupun jatuh keluar batas map.',
      recommendedTab: 'lab',
    };
  }
  return {
    answer:
      'Qolbu AI siap membantu! Gunakan tab Scene untuk Fisika/Grup/Collider, tab Agent & MCP untuk Wizard game baru, atau tab Arena AI untuk main bersama/lawan AI.',
    recommendedTab: 'agent',
  };
}
