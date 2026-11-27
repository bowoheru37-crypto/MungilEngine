# Desain Engine Ringan untuk Itel A70 (Java 7, AIDE)

Status: rancangan. Angka adalah **target anggaran**, belum diukur di perangkat. Verifikasi di A70 di setiap gerbang (bagian 8).

---

## 1. Hasil Kurasi 100 Repo

Dari 100 repo, hanya sebagian kecil yang berguna. Sisanya dibuang atau jadi bacaan saja.

### Tier A: pola yang diadopsi (tulis ulang, bukan salin)

| Repo | Lisensi | Pola yang diambil | Adaptasi Java 7 / A70 |
|---|---|---|---|
| libgdx/libgdx | Apache-2.0 | SpriteBatch, Pool, TextureAtlas, fixed timestep | Satu batch = satu draw call; pool untuk semua objek hidup-singkat |
| nicolasgramlich/AndEngine | Apache-2.0 | Struktur scene/layer di Android | Hanya ide scene graph datar, tanpa hirarki dalam |
| libgdx/gdx-ai | Apache-2.0 | Steering, behavior tree, pathfinding | Behavior tree berbasis array `int[]` node, tanpa objek per tick |
| skypjack/entt | MIT | Sparse set ECS | Struct-of-arrays (SoA), id entity = indeks `int` |
| sschmid/Entitas | MIT | Sistem reaktif, grup entity | Sistem iterasi array padat; flag dirty berupa bitmask |
| erincatto/box2d | MIT | Broadphase, solver impuls berurutan | Hanya AABB + circle + satu solver sederhana; tanpa joint kompleks |
| liabru/matter-js, piqnt/planck.js | MIT | Referensi API fisika | Dipakai sebagai pembanding perilaku, bukan sumber kode |
| prettymuchbryce/easystarjs | MIT | A* bertahap | A* per frame dibatasi N node; hasil ke `int[]` |
| recastnavigation | Zlib | Navmesh | Tidak dipakai (berat). Cukup grid A* |
| EsotericSoftware/kryo, MemoryPack | BSD-3 / MIT | Serialisasi biner tanpa refleksi | Format aset biner buatan sendiri (bagian 5) |
| Orama-Interactive/Pixelorama, maierfelix/poxi | MIT / BSD-2 | Model layer, frame, palet editor pixel | Layer = `byte[]` terindeks palet; undo = delta rect |
| ejoy/ejoy2d | MIT | Engine 2D mobile yang sangat kecil | Bahan studi ukuran minimum |
| aduros/wasm4 | ISC | Batas ketat konsol fantasi (memori, palet) | Filosofi: batasan keras = performa terjamin |
| Monogatari, VoidNovelEngine | MIT | Skrip adegan visual novel | Skrip diubah ke bytecode `short[]` (bagian 5) |
| koala-interactive/frenchkiss.js | MIT | i18n sangat kecil | Tabel `String[]` per bahasa, kunci = `int` |
| plattysoft/Leonids | Apache-2.0 | Partikel dengan pool | Emitter dengan array tetap, tanpa alokasi |

### Tier B: referensi arsitektur saja (terlalu berat)

Godot, Bevy, Babylon.js, Phaser, PixiJS, Flame, Ebiten, Fyrox, Stride, Excalibur, Piccolo, Galacean, LayaAir, Corona/Solar2D. Pelajari desainnya; jangan diintegrasikan.

### Tier C: dibuang (noise hasil pencarian)

`awesome-game-security`, `RoseWish`, `canvas-nest.js`, `particleground`, `Poco`, `godot-mcp`, `godogen`, `awesome-gamedev-agent-skills`, `graphhopper` (routing peta), `infinigen`/`terrain-diffusion` (butuh GPU kuat), `PBRVulkan`, `L7`, `Konfetti`.

### Celah yang tidak tertutup daftar ini

Synth audio/musik ringan dan generator prosedural 2D tidak punya kandidat bagus di daftar. Untuk itu kita rancang sendiri (bagian 4).

---

## 2. Anggaran Perangkat (target)

| Sumber daya | Target | Alasan |
|---|---|---|
| Heap Java puncak | ≤ 48 MB | ~1 GB RAM dibagi dengan sistem; hindari OOM-kill |
| Atlas tekstur | ≤ 1024×1024 (maks 2 atlas aktif) | Memori GPU berbagi dengan RAM |
| Frame rate | 30 fps stabil (opsi 60 di mode performa) | Panas dan baterai |
| Draw call per frame | ≤ 20 | Satu batch per atlas |
| Alokasi per frame di loop render | 0 | Cegah GC jank |
| Ukuran APK engine inti | ≤ 3 MB | Muat cepat, instal mudah |

---

## 3. Arsitektur Inti (minimal)

```
Engine
 ├─ Loop        fixed timestep 1/30s, akumulator, batas catch-up 3 langkah
 ├─ Render      SpriteBatch (GLES2) + fallback Canvas; resolusi dinamis
 ├─ World       ECS SoA: array paralel, id = int, free-list
 ├─ Physics     AABB/circle, spatial hash, solver 4 iterasi
 ├─ Input       pool event; tombol virtual dapat dikustom; layout tersimpan
 ├─ Audio       SoundPool (SFX) + synth PCM kecil (musik prosedural)
 ├─ Script      interpreter bytecode short[] (logic tanpa kode)
 ├─ Assets      loader biner + atlas + RLE/palet
 ├─ Power       pengatur fps/resolusi berdasar suhu, baterai, durasi sesi
 └─ Services    interface: Save, Analytics, Billing, Auth, Push (stub offline)
```

Aturan: modul hanya bicara lewat interface kecil; tidak ada singleton tersembunyi selain `Engine`.

### Contoh inti zero-GC (Java 7)

```java
// Penyimpanan entity SoA: tanpa objek per entity
final class World {
    static final int MAX = 1024;
    final float[] x = new float[MAX], y = new float[MAX];
    final float[] vx = new float[MAX], vy = new float[MAX];
    final short[] sprite = new short[MAX];
    final int[] flags = new int[MAX];
    private final int[] free = new int[MAX];
    private int freeTop = 0, count = 0;

    int create() {
        int id = freeTop > 0 ? free[--freeTop] : count++;
        flags[id] = 1; // aktif
        return id;
    }
    void destroy(int id) { flags[id] = 0; free[freeTop++] = id; }
}
```

```java
// Fixed timestep tanpa alokasi
long prev = System.nanoTime();
long acc = 0;
final long STEP = 33333333L; // 30 fps
while (running) {
    long now = System.nanoTime();
    acc += now - prev; prev = now;
    int guard = 0;
    while (acc >= STEP && guard++ < 3) { update(); acc -= STEP; }
    if (guard >= 3) acc = 0;        // buang tunggakan, hindari spiral
    render(acc / (float) STEP);     // interpolasi
}
```

```java
// Resolusi dinamis: skala dari waktu frame rata-rata (EMA)
avgMs = avgMs * 0.9f + frameMs * 0.1f;
if (avgMs > 36f && scale > 0.6f) scale -= 0.05f;      // turun bila berat
else if (avgMs < 28f && scale < 1.0f) scale += 0.025f; // naik pelan-pelan
```

---

## 4. Modul dan Cara Menyempurnakan (tanpa mengganti constructor lama)

Prinsip integrasi: constructor dan nama yang ada dipertahankan. Fitur baru masuk lewat **adapter** atau **overload tambahan**, bukan penggantian.

1. **Render:** tambah SpriteBatch di belakang API gambar lama; panggilan lama diteruskan ke batch.
2. **Fisika:** spatial hash 32 px, sleeping body, solver terbatas. Batas jumlah kontak per frame.
3. **AI:** behavior tree bytecode + A* grid bertahap (anggaran node per frame).
4. **Audio/Musik:** pola tracker 4 kanal (pulse, triangle, noise, sample) menghasilkan PCM 22 kHz mono ke `AudioTrack` buffer tetap. Musik = data pola, bukan file besar.
5. **Prosedural:** generator seed deterministik (xorshift) untuk peta, dungeon, nama, loot. Seed tersimpan, bukan hasil.
6. **Editor pixel/animator:** layer berindeks palet, onion skin, atlas pack otomatis.
7. **Visual novel/RPG:** skrip adegan dan dialog ke bytecode; tabel statistik berbasis `int`.
8. **UI:** tema terang/gelap lewat tabel warna tunggal; skala font; target sentuh ≥ 48 dp; label aksesibilitas pada kontrol.
9. **Power manager:** turunkan fps/resolusi saat suhu atau baterai rendah, kurangi partikel, matikan efek opsional.

---

## 5. Format Biner dan Bytecode

**Aset (`.pak`)**: header 16 byte (magic, versi, jumlah entri) + tabel offset `int[]` + data. Palet maks 64 warna, piksel 1 byte, kompresi RLE untuk sprite datar. Baca sekali ke `byte[]` lalu akses via offset (tanpa parsing teks).

**Skrip (`short[]`)**: instruksi 16 bit: opcode 6 bit + operand 10 bit. Set awal: `JMP, JZ, SET, ADD, CMP, SAY, CHOICE, SPAWN, PLAY, WAIT, END`. Variabel = `int[256]`. Satu interpreter, tanpa string runtime (string lewat indeks tabel i18n).

---

## 6. Layanan Backend: lapisan abstraksi

Engine hanya menyediakan **interface dan implementasi offline**. SDK nyata dipasang di aplikasi.

| Layanan | Interface | Default offline | SDK yang disarankan |
|---|---|---|---|
| Cloud save | `Save.put/get(slot)` | Berkas lokal + versi | Firebase / Play Games Saved Games |
| Login sosial | `Auth.signIn()` | Mode tamu | Google Sign-In / Firebase Auth |
| Push | `Push.register()` | no-op | FCM |
| Analitik | `Analytics.log(evt)` | Antrean disk, kirim saat online | Firebase Analytics |
| Pembayaran | `Billing.buy(sku)` | Nonaktif | Google Play Billing |

Catatan penting:
- **Pembayaran dan data pribadi harus lewat SDK resmi.** Jangan membuat enkripsi atau validasi pembayaran sendiri; verifikasi pembelian dilakukan di server.
- Analitik dan login butuh persetujuan pengguna (opt-in) dan kebijakan privasi sebelum rilis.
- Perlindungan data: simpan token di Android Keystore, bukan berkas biasa; jangan simpan data sensitif di save game.

---

## 7. Mode Terang/Gelap, Multi-bahasa, Aksesibilitas

- Tema: satu `int[]` palet UI per mode; ganti tanpa membuat ulang view.
- Bahasa: `String[]` per lokal, kunci `int`; fallback ke bahasa Inggris.
- Aksesibilitas: kontras ≥ 4.5:1, ukuran teks dapat diskalakan, kontrol dapat dipindah/diubah ukuran, opsi kurangi getar dan kilatan.

---

## 8. Gerbang Verifikasi di Itel A70

| Gerbang | Lolos bila |
|---|---|
| G1 Inti | 1000 sprite @30 fps, 0 GC di loop (cek logcat) |
| G2 Fisika | 200 body, frame ≤ 25 ms |
| G3 Memori | heap puncak ≤ 48 MB setelah 30 menit |
| G4 Panas/baterai | sesi 30 menit tanpa throttle berat |
| G5 Aset | muat 1 level ≤ 2 detik |
| G6 Offline | seluruh game jalan tanpa jaringan |

Jika satu gerbang gagal, hentikan penambahan fitur dan perbaiki dulu.

---

## 9. Urutan Kerja yang Disarankan

1. Inti: loop, World, SpriteBatch, input, `.pak` loader (G1, G3, G5).
2. Fisika + AI + skrip (G2).
3. Audio tracker + prosedural.
4. Editor pixel/animator + UI tema/i18n/aksesibilitas.
5. Lapisan layanan (stub) lalu SDK.
6. Game contoh (RPG/idle/fighter retro) memakai semua modul + dokumentasi.

## 10. Lisensi

Tulis ulang pola; jika ada kode disalin, pertahankan notice aslinya di `THIRD_PARTY_NOTICES`. Hindari repo GPL/AGPL (sudah disaring dari daftar).
