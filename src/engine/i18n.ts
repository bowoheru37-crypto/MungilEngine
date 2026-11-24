import type { LanguageCode } from './types';

export interface Translations {
  appTitle: string;
  appSubtitle: string;
  playGame: string;
  resumeGame: string;
  openStudio: string;
  controlsBtn: string;
  installApp: string;
  offlineBadge: string;
  onlineBadge: string;
  titleHint: string;
  pausedTitle: string;
  victoryTitle: string;
  gameOverTitle: string;
  retryLevel: string;
  nextLevel: string;
  backToTitle: string;
  levelLabel: string;
  hpLabel: string;
  energyLabel: string;
  shardsLabel: string;
  switchesLabel: string;
  coinsLabel: string;
  scoreLabel: string;
  gateOpenMsg: string;
  gateLockedMsg: string;
  practiceMode: string;
  saveProgress: string;
  loadProgress: string;
  continueSaved: string;
  quickSaveLabel: string;
  autoSaveLabel: string;
  slotLabel: string;
  emptySlotLabel: string;
  savedNotice: string;
  loadedNotice: string;
  tabs: {
    play: string;
    scene: string;
    agent: string;
    assets: string;
    generators: string;
    controls: string;
    art: string;
    lab: string;
    skills: string;
    services: string;
    export: string;
  };
  actions: {
    jump: string;
    attack: string;
    dash: string;
    burst: string;
    potion: string;
    pause: string;
  };
}

const ID: Translations = {
  appTitle: 'Mungil Engine V7',
  appSubtitle: 'Bowo: Penjaga Cahaya',
  playGame: 'Mainkan Game',
  resumeGame: 'Lanjutkan',
  openStudio: 'Engine Studio',
  controlsBtn: 'Pengaturan Kontrol',
  installApp: 'Pasang Aplikasi (PWA)',
  offlineBadge: 'Offline Siap',
  onlineBadge: 'Online',
  titleHint: 'WASD/Panah gerak · Spasi lompat · J serang · K dash/parry · L burst · Esc jeda',
  pausedTitle: 'Permainan Dijeda',
  victoryTitle: 'Cahaya Kembali!',
  gameOverTitle: 'Bowo Gugur',
  retryLevel: 'Ulangi Babak',
  nextLevel: 'Lanjut ke Babak Berikutnya',
  backToTitle: 'Kembali ke Layar Judul',
  levelLabel: 'Babak',
  hpLabel: 'HP',
  energyLabel: 'Energi',
  shardsLabel: 'Pecahan',
  switchesLabel: 'Saklar',
  coinsLabel: 'Koin',
  scoreLabel: 'Skor',
  gateOpenMsg: 'Gerbang Cahaya Terbuka — Masuk untuk lanjut!',
  gateLockedMsg: 'Kumpulkan Pecahan & aktifkan saklar untuk membuka gerbang',
  practiceMode: 'Mode Latihan',
  saveProgress: 'Simpan',
  loadProgress: 'Muat',
  continueSaved: 'Lanjutkan Progres Tersimpan',
  quickSaveLabel: 'Simpan / Muat Cepat',
  autoSaveLabel: 'Simpan Otomatis',
  slotLabel: 'Slot',
  emptySlotLabel: 'Kosong',
  savedNotice: 'Tersimpan ke',
  loadedNotice: 'Dimuat dari',
  tabs: {
    play: 'Main',
    scene: 'Scene Editor',
    agent: 'AI + MCP',
    assets: 'Aset',
    generators: 'Generator',
    controls: 'Kontrol',
    art: '12 Style',
    lab: 'Engine Lab',
    skills: 'AI Skills',
    services: 'Layanan',
    export: 'Ekspor & Docs',
  },
  actions: {
    jump: 'Lompat',
    attack: 'Serang',
    dash: 'Dash',
    burst: 'Burst',
    potion: 'Potion',
    pause: 'Jeda',
  },
};

const EN: Translations = {
  appTitle: 'Mungil Engine V7',
  appSubtitle: 'Bowo: Guardian of Light',
  playGame: 'Play Game',
  resumeGame: 'Resume',
  openStudio: 'Engine Studio',
  controlsBtn: 'Touch Controls',
  installApp: 'Install App (PWA)',
  offlineBadge: 'Offline Ready',
  onlineBadge: 'Online',
  titleHint: 'WASD/Arrows move · Space jump · J attack · K dash/parry · L burst · Esc pause',
  pausedTitle: 'Game Paused',
  victoryTitle: 'Light Restored!',
  gameOverTitle: 'Bowo Fallen',
  retryLevel: 'Retry Level',
  nextLevel: 'Next Level',
  backToTitle: 'Return to Title',
  levelLabel: 'Level',
  hpLabel: 'HP',
  energyLabel: 'Energy',
  shardsLabel: 'Shards',
  switchesLabel: 'Switches',
  coinsLabel: 'Coins',
  scoreLabel: 'Score',
  gateOpenMsg: 'Gate of Light Open — Enter to advance!',
  gateLockedMsg: 'Collect Shards & trigger switches to unlock the gate',
  practiceMode: 'Practice Mode',
  saveProgress: 'Save',
  loadProgress: 'Load',
  continueSaved: 'Continue Saved Game',
  quickSaveLabel: 'Quick Save / Load',
  autoSaveLabel: 'Auto-Save',
  slotLabel: 'Slot',
  emptySlotLabel: 'Empty',
  savedNotice: 'Saved to',
  loadedNotice: 'Loaded from',
  tabs: {
    play: 'Play',
    scene: 'Scene Editor',
    agent: 'AI + MCP',
    assets: 'Assets',
    generators: 'Generators',
    controls: 'Controls',
    art: '12 Styles',
    lab: 'Engine Lab',
    skills: 'AI Skills',
    services: 'Services',
    export: 'Export & Docs',
  },
  actions: {
    jump: 'Jump',
    attack: 'Attack',
    dash: 'Dash',
    burst: 'Burst',
    potion: 'Potion',
    pause: 'Pause',
  },
};

const JA: Translations = {
  ...EN,
  appSubtitle: 'ボウォ：光の守護者',
  playGame: 'ゲーム開始',
  resumeGame: '再開',
  openStudio: 'エンジンスタジオ',
  controlsBtn: 'タッチ操作設定',
  installApp: 'アプリをインストール',
  pausedTitle: '一時停止中',
  victoryTitle: '光が戻った！',
  gameOverTitle: 'ゲームオーバー',
  retryLevel: 'リトライ',
  nextLevel: '次のステージ',
  backToTitle: 'タイトルへ戻る',
  levelLabel: 'ステージ',
  shardsLabel: '光の欠片',
  switchesLabel: 'スイッチ',
  coinsLabel: 'コイン',
  scoreLabel: 'スコア',
  continueSaved: 'セーブデータから再開',
  saveProgress: 'セーブ',
  loadProgress: 'ロード',
  quickSaveLabel: 'クイックセーブ / ロード',
  autoSaveLabel: 'オートセーブ',
  slotLabel: 'スロット',
  emptySlotLabel: '空き',
};

const KO: Translations = {
  ...EN,
  appSubtitle: '보우: 빛의 수호자',
  playGame: '게임 시작',
  resumeGame: '계속하기',
  openStudio: '엔진 스튜디오',
  controlsBtn: '터치 컨트롤',
  installApp: '앱 설치 (PWA)',
  pausedTitle: '일시 정지',
  victoryTitle: '빛이 돌아왔다!',
  gameOverTitle: '게임 오버',
  retryLevel: '다시 도전',
  nextLevel: '다음 레벨',
  backToTitle: '타이틀로',
  levelLabel: '레벨',
  shardsLabel: '조각',
  switchesLabel: '스위치',
  coinsLabel: '코인',
  scoreLabel: '점수',
  continueSaved: '저장된 게임 이어하기',
  saveProgress: '저장',
  loadProgress: '불러오기',
  quickSaveLabel: '빠른 저장 / 불러오기',
  autoSaveLabel: '자동 저장',
  slotLabel: '슬롯',
  emptySlotLabel: '비어 있음',
};

const ES: Translations = {
  ...EN,
  appSubtitle: 'Bowo: Guardián de la Luz',
  playGame: 'Jugar',
  resumeGame: 'Reanudar',
  openStudio: 'Estudio Motor',
  controlsBtn: 'Controles Táctiles',
  installApp: 'Instalar App (PWA)',
  pausedTitle: 'Juego en Pausa',
  victoryTitle: '¡Luz Restaurada!',
  gameOverTitle: 'Derrota',
  retryLevel: 'Reintentar Nivel',
  nextLevel: 'Siguiente Nivel',
  backToTitle: 'Volver al Título',
  levelLabel: 'Nivel',
  shardsLabel: 'Fragmentos',
  switchesLabel: 'Interruptores',
  coinsLabel: 'Monedas',
  scoreLabel: 'Puntuación',
  continueSaved: 'Continuar Partida Guardada',
  saveProgress: 'Guardar',
  loadProgress: 'Cargar',
  quickSaveLabel: 'Guardado / Carga Rápida',
  autoSaveLabel: 'Autoguardado',
  slotLabel: 'Ranura',
  emptySlotLabel: 'Vacío',
};

export const I18N_MAP: Record<LanguageCode, Translations> = {
  id: ID,
  en: EN,
  ja: JA,
  ko: KO,
  es: ES,
};

export const LANGUAGE_NAMES: Array<{ code: LanguageCode; label: string }> = [
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'es', label: 'Español' },
];

export function t(lang: LanguageCode): Translations {
  return I18N_MAP[lang] ?? I18N_MAP.id;
}
