/**
 * 4-Channel Web Audio Tracker + Procedural SFX Synthesizer.
 * - Zero audio file dependencies (0 KB asset footprint)
 * - Essential SFX for player movement, actions, UI interactions, & game events
 * - 3 distinct multi-channel procedural BGM compositions (Levels 1, 2, 3)
 * - +/- 8% pitch randomization to prevent ear fatigue
 * - 30% BGM ducking during SFX impact & clean suspend/resume
 */

import type { GeneratedSfxSpec, GeneratedTrackSpec } from './types';

export type SfxKind =
  | 'footstep'
  | 'land'
  | 'jump'
  | 'dash'
  | 'attack'
  | 'hit'
  | 'parry'
  | 'potion'
  | 'coin'
  | 'shard'
  | 'switch'
  | 'gate'
  | 'burst'
  | 'hurt'
  | 'boss_phase'
  | 'level_clear'
  | 'victory'
  | 'gameover'
  | 'ui_click'
  | 'ui_hover'
  | 'ui_tab'
  | 'ui_toggle'
  | 'ui_error';

export interface LevelTrackConfig {
  level: 1 | 2 | 3;
  title: string;
  bpm: number;
  leadWave: OscillatorType;
  bassWave: OscillatorType;
  lead: number[];
  bass: number[];
  perc: number[];
}

export const LEVEL_TRACKS: Record<1 | 2 | 3, LevelTrackConfig> = {
  1: {
    level: 1,
    title: 'Dawn Village Breeze',
    bpm: 118,
    leadWave: 'triangle',
    bassWave: 'sine',
    lead: [261.63, 329.63, 392.0, 523.25, 440.0, 392.0, 329.63, 293.66, 261.63, 329.63, 392.0, 440.0, 523.25, 440.0, 392.0, 329.63],
    bass: [130.81, 0, 130.81, 164.81, 196.0, 0, 146.83, 164.81, 130.81, 0, 174.61, 0, 196.0, 0, 146.83, 0],
    perc: [1, 0, 2, 0, 1, 0, 2, 1, 1, 0, 2, 0, 1, 2, 1, 2],
  },
  2: {
    level: 2,
    title: 'Storm Bridge Pulse',
    bpm: 136,
    leadWave: 'square',
    bassWave: 'triangle',
    lead: [220.0, 261.63, 329.63, 440.0, 392.0, 349.23, 329.63, 293.66, 220.0, 293.66, 349.23, 440.0, 493.88, 440.0, 392.0, 329.63],
    bass: [110.0, 110.0, 0, 146.83, 164.81, 0, 130.81, 146.83, 110.0, 110.0, 0, 174.61, 196.0, 0, 164.81, 146.83],
    perc: [1, 2, 1, 2, 1, 0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1],
  },
  3: {
    level: 3,
    title: 'Menara Kala — Three Shadows',
    bpm: 150,
    leadWave: 'sawtooth',
    bassWave: 'sawtooth',
    lead: [196.0, 207.65, 293.66, 392.0, 369.99, 311.13, 293.66, 233.08, 196.0, 261.63, 311.13, 392.0, 466.16, 415.3, 392.0, 293.66],
    bass: [98.0, 98.0, 130.81, 98.0, 116.54, 98.0, 146.83, 130.81, 98.0, 98.0, 155.56, 130.81, 146.83, 116.54, 98.0, 87.31],
    perc: [1, 2, 1, 1, 1, 2, 1, 2, 1, 2, 1, 1, 1, 2, 1, 2],
  },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private bgmEnabled = true;
  private bgmStep = 0;
  private bgmTimer: number | null = null;
  private activeLevel: 1 | 2 | 3 = 1;
  private customTrack: LevelTrackConfig | null = null;
  private duckUntil = 0;
  private lastUiClickAt = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopTracker();
      if (this.ctx && this.ctx.state === 'running') {
        void this.ctx.suspend().catch(() => {});
      }
    } else if (this.bgmEnabled && this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setBgmEnabled(enabled: boolean): void {
    this.bgmEnabled = enabled;
    if (!enabled) this.stopTracker();
  }

  suspend(): void {
    this.stopTracker();
    if (this.ctx && this.ctx.state === 'running') {
      void this.ctx.suspend().catch(() => {});
    }
  }

  resume(): void {
    if (this.muted) return;
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
  }

  getTrackConfig(level: 1 | 2 | 3): LevelTrackConfig {
    return LEVEL_TRACKS[level] ?? LEVEL_TRACKS[1];
  }

  startTracker(level: 1 | 2 | 3): void {
    const levelChanged = this.activeLevel !== level;
    this.activeLevel = level;
    this.customTrack = null;
    if (this.muted || !this.bgmEnabled || typeof window === 'undefined') return;
    if (levelChanged && this.bgmTimer !== null) {
      this.stopTracker();
    }
    if (this.bgmTimer !== null) return;

    this.bgmStep = 0;
    const track = LEVEL_TRACKS[this.activeLevel] ?? LEVEL_TRACKS[1];
    const stepMs = Math.max(120, Math.round((60_000 / track.bpm) / 2));

    this.bgmTimer = window.setInterval(() => {
      this.tickTrackerStep();
    }, stepMs);
  }

  playCustomTrack(track: GeneratedTrackSpec): void {
    this.stopTracker();
    this.customTrack = {
      level: 1,
      title: track.title,
      bpm: track.bpm,
      leadWave: track.scale === 'phrygian' ? 'sawtooth' : track.scale === 'dorian' ? 'square' : 'triangle',
      bassWave: 'triangle',
      lead: track.leadNotes,
      bass: track.bassNotes,
      perc: track.percHits,
    };
    if (this.muted || !this.bgmEnabled || typeof window === 'undefined') return;
    this.bgmStep = 0;
    const stepMs = Math.max(115, Math.round((60_000 / track.bpm) / 2));
    this.bgmTimer = window.setInterval(() => {
      this.tickTrackerStep();
    }, stepMs);
  }

  private tickTrackerStep(): void {
    if (this.muted || !this.bgmEnabled || document.hidden) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    const track = this.customTrack ?? (LEVEL_TRACKS[this.activeLevel] ?? LEVEL_TRACKS[1]);
    const idx = this.bgmStep % track.lead.length;
    const now = ctx.currentTime;
    const duckScale = now < this.duckUntil ? 0.35 : 1;

    // Channel 1: Lead voice
    const leadFreq = track.lead[idx];
    if (leadFreq > 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = track.leadWave;
      osc.frequency.setValueAtTime(leadFreq, now);
      gain.gain.setValueAtTime(0.024 * duckScale, now);
      gain.gain.exponentialRampToValueAtTime(0.0007, now + 0.17);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    }

    // Channel 2: Bass voice
    const bassFreq = track.bass[idx % track.bass.length];
    if (bassFreq > 0) {
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = track.bassWave;
      bOsc.frequency.setValueAtTime(bassFreq, now);
      bGain.gain.setValueAtTime(0.026 * duckScale, now);
      bGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.19);
      bOsc.connect(bGain);
      bGain.connect(ctx.destination);
      bOsc.start(now);
      bOsc.stop(now + 0.2);
    }

    // Channel 3: Lightweight synth kick / hi-hat pulse
    const percCode = track.perc[idx % track.perc.length];
    if (percCode === 1) {
      const pOsc = ctx.createOscillator();
      const pGain = ctx.createGain();
      pOsc.type = 'sine';
      pOsc.frequency.setValueAtTime(115, now);
      pOsc.frequency.exponentialRampToValueAtTime(42, now + 0.07);
      pGain.gain.setValueAtTime(0.022 * duckScale, now);
      pGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.08);
      pOsc.connect(pGain);
      pGain.connect(ctx.destination);
      pOsc.start(now);
      pOsc.stop(now + 0.085);
    } else if (percCode === 2) {
      const hOsc = ctx.createOscillator();
      const hGain = ctx.createGain();
      hOsc.type = 'triangle';
      hOsc.frequency.setValueAtTime(980, now);
      hOsc.frequency.exponentialRampToValueAtTime(420, now + 0.03);
      hGain.gain.setValueAtTime(0.009 * duckScale, now);
      hGain.gain.exponentialRampToValueAtTime(0.0006, now + 0.035);
      hOsc.connect(hGain);
      hGain.connect(ctx.destination);
      hOsc.start(now);
      hOsc.stop(now + 0.04);
    }

    this.bgmStep = (this.bgmStep + 1) % track.lead.length;
  }

  stopTracker(): void {
    if (this.bgmTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  playCustomSfx(spec: GeneratedSfxSpec): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = spec.wave;
    osc.frequency.setValueAtTime(Math.max(40, spec.freqStart), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(35, spec.freqEnd), now + spec.durationSec);
    gain.gain.setValueAtTime(Math.min(0.25, spec.volume), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + spec.durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + spec.durationSec + 0.02);
  }

  playSfx(kind: SfxKind, panOffsetX = 0): void {
    if (this.muted) return;
    if (kind === 'ui_hover') {
      const t = performance.now();
      if (t - this.lastUiClickAt < 70) return;
      this.lastUiClickAt = t;
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const isUi = kind.startsWith('ui_');
    if (!isUi && kind !== 'footstep') {
      this.duckUntil = now + 0.24;
    }

    const jitter = isUi ? 1 : 0.92 + Math.random() * 0.16; // +/- 8%
    const distanceAtten = isUi ? 1 : Math.max(0.35, 1 - Math.min(1, Math.abs(panOffsetX) / 480) * 0.55);

    const tone = (freq: number, endFreq: number, dur: number, type: OscillatorType, vol = 0.12, delay = 0) => {
      const t0 = now + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq * jitter, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(38, endFreq * jitter), t0 + dur);
      gain.gain.setValueAtTime(vol * distanceAtten, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.015);
    };

    switch (kind) {
      case 'footstep':
        tone(145, 82, 0.045, 'triangle', 0.045);
        break;
      case 'land':
        tone(135, 58, 0.08, 'sine', 0.085);
        break;
      case 'jump':
        tone(310, 560, 0.11, 'triangle', 0.11);
        break;
      case 'dash':
        tone(540, 210, 0.12, 'triangle', 0.1);
        break;
      case 'attack':
        tone(420, 190, 0.09, 'square', 0.08);
        break;
      case 'hit':
        tone(190, 85, 0.11, 'sawtooth', 0.13);
        break;
      case 'parry':
        tone(760, 1180, 0.16, 'triangle', 0.15);
        break;
      case 'potion':
        tone(440, 880, 0.16, 'sine', 0.12);
        tone(660, 1180, 0.14, 'triangle', 0.09, 0.06);
        break;
      case 'coin':
        tone(680, 1020, 0.1, 'sine', 0.11);
        break;
      case 'shard':
        tone(520, 1040, 0.22, 'triangle', 0.14);
        break;
      case 'switch':
        tone(380, 620, 0.14, 'square', 0.1);
        break;
      case 'gate':
        tone(280, 740, 0.28, 'triangle', 0.15);
        break;
      case 'burst':
        tone(220, 880, 0.26, 'sawtooth', 0.14);
        break;
      case 'hurt':
        tone(170, 75, 0.18, 'sawtooth', 0.14);
        break;
      case 'boss_phase':
        tone(130, 260, 0.28, 'sawtooth', 0.15);
        tone(196, 392, 0.24, 'square', 0.09, 0.08);
        break;
      case 'level_clear':
        tone(392, 523.25, 0.14, 'triangle', 0.13, 0);
        tone(523.25, 659.25, 0.16, 'triangle', 0.13, 0.11);
        tone(659.25, 783.99, 0.22, 'triangle', 0.14, 0.22);
        break;
      case 'victory':
        tone(523.25, 587.33, 0.14, 'triangle', 0.14, 0);
        tone(659.25, 783.99, 0.15, 'triangle', 0.14, 0.12);
        tone(783.99, 1046.5, 0.3, 'triangle', 0.16, 0.24);
        break;
      case 'gameover':
        tone(293.66, 220, 0.18, 'sawtooth', 0.13, 0);
        tone(220, 146.83, 0.22, 'sawtooth', 0.13, 0.16);
        tone(146.83, 88, 0.34, 'triangle', 0.12, 0.32);
        break;
      case 'ui_click':
        tone(620, 440, 0.045, 'sine', 0.065);
        break;
      case 'ui_hover':
        tone(520, 560, 0.025, 'sine', 0.028);
        break;
      case 'ui_tab':
        tone(480, 680, 0.055, 'triangle', 0.06);
        break;
      case 'ui_toggle':
        tone(420, 620, 0.05, 'sine', 0.06);
        break;
      case 'ui_error':
        tone(210, 140, 0.12, 'square', 0.08);
        break;
    }
  }
}

export const soundEngine = new SoundEngine();
