import { useEffect, useRef } from 'react';

import { ART_STYLES, DEFAULT_STYLE_OVERRIDES, getStyleSpec, renderStylePreviewCanvas } from '../engine/artStyles';
import { DEFAULT_TOUCH_CONFIG } from '../engine/storage';
import type { ArtStyleId, StyleOverrides, TouchControlConfig } from '../engine/types';

interface StudioControlsTabProps {
  touchConfig: TouchControlConfig;
  setTouchConfig: (next: TouchControlConfig) => void;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  fontSizePx: number;
  setFontSizePx: (n: number) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  reduceShake: boolean;
  setReduceShake: (v: boolean) => void;
}

export function StudioControlsTab({
  touchConfig,
  setTouchConfig,
  theme,
  setTheme,
  fontSizePx,
  setFontSizePx,
  highContrast,
  setHighContrast,
  reduceShake,
  setReduceShake,
}: StudioControlsTabProps) {
  const update = (patch: Partial<TouchControlConfig>) => setTouchConfig({ ...touchConfig, ...patch });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-(--border) bg-(--surface) p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-(--text)">Mobile Touch Controls Customizer</h3>
          <button
            type="button"
            onClick={() => setTouchConfig(DEFAULT_TOUCH_CONFIG)}
            className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 text-xs font-bold"
          >
            Reset Defaults
          </button>
        </div>

        <div className="mt-3 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => update({ joystickSide: 'left' })}
              className={`touch-btn rounded-xl border font-bold ${
                touchConfig.joystickSide === 'left'
                  ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                  : 'border-(--border) bg-(--surface-2)'
              }`}
            >
              Joystick Left
            </button>
            <button
              type="button"
              onClick={() => update({ joystickSide: 'right' })}
              className={`touch-btn rounded-xl border font-bold ${
                touchConfig.joystickSide === 'right'
                  ? 'border-(--accent) bg-(--accent) text-(--accent-ink)'
                  : 'border-(--border) bg-(--surface-2)'
              }`}
            >
              Joystick Right (Left-Handed)
            </button>
          </div>

          <label className="block">
            <div className="mb-1 flex justify-between font-semibold">
              <span>Action Button Size (min 44px)</span>
              <span className="font-mono-num">{touchConfig.buttonSize}px</span>
            </div>
            <input
              type="range"
              min={44}
              max={80}
              value={touchConfig.buttonSize}
              onChange={(e) => update({ buttonSize: Number(e.target.value) })}
              className="w-full accent-(--accent)"
            />
          </label>

          <label className="block">
            <div className="mb-1 flex justify-between font-semibold">
              <span>Joystick Diameter</span>
              <span className="font-mono-num">{touchConfig.joystickSize}px</span>
            </div>
            <input
              type="range"
              min={88}
              max={152}
              value={touchConfig.joystickSize}
              onChange={(e) => update({ joystickSize: Number(e.target.value) })}
              className="w-full accent-(--accent)"
            />
          </label>

          <label className="block">
            <div className="mb-1 flex justify-between font-semibold">
              <span>Joystick Edge Offset X</span>
              <span className="font-mono-num">{touchConfig.joystickOffsetX}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={64}
              value={touchConfig.joystickOffsetX}
              onChange={(e) => update({ joystickOffsetX: Number(e.target.value) })}
              className="w-full accent-(--accent)"
            />
          </label>

          <label className="block">
            <div className="mb-1 flex justify-between font-semibold">
              <span>Controls Opacity</span>
              <span className="font-mono-num">{touchConfig.opacity}%</span>
            </div>
            <input
              type="range"
              min={40}
              max={100}
              value={touchConfig.opacity}
              onChange={(e) => update({ opacity: Number(e.target.value) })}
              className="w-full accent-(--accent)"
            />
          </label>

          <label className="block">
            <div className="mb-1 flex justify-between font-semibold">
              <span>Stick Deadzone</span>
              <span className="font-mono-num">{touchConfig.deadzone.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={5}
              max={35}
              value={Math.round(touchConfig.deadzone * 100)}
              onChange={(e) => update({ deadzone: Number(e.target.value) / 100 })}
              className="w-full accent-(--accent)"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-(--border) bg-(--surface-2) px-3 py-2.5 font-semibold">
              <span>Haptic Feedback</span>
              <input
                type="checkbox"
                checked={touchConfig.haptics}
                onChange={(e) => update({ haptics: e.target.checked })}
                className="h-5 w-5 accent-(--accent)"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-(--border) bg-(--surface-2) px-3 py-2.5 font-semibold">
              <span>Button Text Labels</span>
              <input
                type="checkbox"
                checked={touchConfig.showLabels}
                onChange={(e) => update({ showLabels: e.target.checked })}
                className="h-5 w-5 accent-(--accent)"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {/* Live Touch Layout Preview */}
        <div className="rounded-xl border border-(--border) bg-(--surface) p-4">
          <h3 className="text-sm font-extrabold text-(--text)">Live Touch Layout Preview</h3>
          <div
            className="relative mt-3 flex h-36 items-end justify-between rounded-xl border border-(--border) bg-slate-950 p-3"
            style={{ opacity: touchConfig.opacity / 100 }}
          >
            <div
              className={`flex items-center justify-center rounded-full border-2 border-white/30 bg-slate-800/80 ${
                touchConfig.joystickSide === 'right' ? 'order-2' : 'order-1'
              }`}
              style={{
                width: Math.min(82, touchConfig.joystickSize * 0.65),
                height: Math.min(82, touchConfig.joystickSize * 0.65),
              }}
            >
              <div className="h-7 w-7 rounded-full bg-emerald-400/80" />
            </div>
            <div className={`flex items-center gap-2 ${touchConfig.joystickSide === 'right' ? 'order-1' : 'order-2'}`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500 text-xs font-extrabold text-slate-950">
                {touchConfig.showLabels ? 'Dash' : 'K'}
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 text-xs font-extrabold text-white">
                {touchConfig.showLabels ? 'Atk' : 'J'}
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400 text-xs font-extrabold text-slate-950">
                {touchConfig.showLabels ? 'Jump' : 'A'}
              </span>
            </div>
          </div>
        </div>

        {/* Accessibility & Dark Mode */}
        <div className="rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
          <h3 className="text-sm font-extrabold text-(--text)">Accessibility & Eye Comfort</h3>
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`touch-btn rounded-xl border font-bold ${
                  theme === 'dark' ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                }`}
              >
                Dark Mode (Night Eye Care)
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`touch-btn rounded-xl border font-bold ${
                  theme === 'light' ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--border) bg-(--surface-2)'
                }`}
              >
                Light Mode
              </button>
            </div>

            <label className="block">
              <div className="mb-1 flex justify-between font-semibold">
                <span>UI Font Scale</span>
                <span className="font-mono-num">{fontSizePx}px</span>
              </div>
              <input
                type="range"
                min={12}
                max={18}
                value={fontSizePx}
                onChange={(e) => setFontSizePx(Number(e.target.value))}
                className="w-full accent-(--accent)"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-(--border) bg-(--surface-2) px-3 py-2.5 font-semibold">
                <span>High Contrast</span>
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  className="h-5 w-5 accent-(--accent)"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-(--border) bg-(--surface-2) px-3 py-2.5 font-semibold">
                <span>Reduce Shake</span>
                <input
                  type="checkbox"
                  checked={reduceShake}
                  onChange={(e) => setReduceShake(e.target.checked)}
                  className="h-5 w-5 accent-(--accent)"
                />
              </label>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

interface StudioArtTabProps {
  styleId: ArtStyleId;
  setStyleId: (id: ArtStyleId) => void;
  customPalettes: Partial<Record<ArtStyleId, string[]>>;
  setCustomPalettes: (p: Partial<Record<ArtStyleId, string[]>>) => void;
  styleOverrides: StyleOverrides;
  setStyleOverrides: (o: StyleOverrides) => void;
}

export function StudioArtTab({
  styleId,
  setStyleId,
  customPalettes,
  setCustomPalettes,
  styleOverrides,
  setStyleOverrides,
}: StudioArtTabProps) {
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const activeStyle = getStyleSpec(styleId, customPalettes);

  useEffect(() => {
    renderStylePreviewCanvas(previewRef.current, activeStyle, styleOverrides, 0.35);
  }, [activeStyle, styleOverrides]);

  const updateOverride = (patch: Partial<StyleOverrides>) => setStyleOverrides({ ...styleOverrides, ...patch });

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-(--border) bg-(--surface) p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-(--text)">Active Style: {activeStyle.name}</h3>
              <p className="text-xs text-(--muted)">{activeStyle.desc}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStyleOverrides(DEFAULT_STYLE_OVERRIDES);
                setCustomPalettes({});
              }}
              className="touch-btn rounded-lg border border-(--border) bg-(--surface-2) px-3 text-xs font-bold"
            >
              Reset Style
            </button>
          </div>

          <canvas
            ref={previewRef}
            width={360}
            height={176}
            className={`mt-3 w-full rounded-xl border border-(--border) ${
              styleId === 'pixel' || styleId === 'retro' ? 'pixel-crisp' : ''
            }`}
            style={{
              filter: `brightness(${styleOverrides.brightness}%) contrast(${styleOverrides.contrast}%) saturate(${styleOverrides.saturation}%)`,
            }}
          />

          {/* 10-Color Live Swatch Bar */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {activeStyle.palette.map((hex, idx) => (
              <label key={idx} className="flex cursor-pointer flex-col items-center gap-0.5">
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => {
                    const next = [...activeStyle.palette];
                    next[idx] = e.target.value;
                    setCustomPalettes({ ...customPalettes, [styleId]: next });
                  }}
                  className="h-8 w-8 cursor-pointer rounded border border-(--border) bg-transparent p-0"
                />
                <span className="font-mono-num text-[10px] text-(--muted)">C{idx}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-(--border) bg-(--surface) p-4 text-xs">
          <h3 className="text-sm font-extrabold text-(--text)">Shader & Outline Inspector</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(
              [
                ['outlineOn', 'Outline'],
                ['shadowOn', 'Drop Shadow'],
                ['glowOn', 'Neon/Aura Glow'],
                ['scanline', 'CRT Scanline'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center justify-between rounded-xl border border-(--border) bg-(--surface-2) px-3 py-2 font-semibold">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={styleOverrides[key]}
                  onChange={(e) => updateOverride({ [key]: e.target.checked })}
                  className="h-5 w-5 accent-(--accent)"
                />
              </label>
            ))}
          </div>

          <div className="mt-3 space-y-2.5">
            <label className="block">
              <div className="mb-1 flex justify-between font-semibold">
                <span>Outline Width</span>
                <span className="font-mono-num">{styleOverrides.outlineW}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={3}
                value={styleOverrides.outlineW}
                onChange={(e) => updateOverride({ outlineW: Number(e.target.value) })}
                className="w-full accent-(--accent)"
              />
            </label>
            <label className="block">
              <div className="mb-1 flex justify-between font-semibold">
                <span>Brightness</span>
                <span className="font-mono-num">{styleOverrides.brightness}%</span>
              </div>
              <input
                type="range"
                min={70}
                max={135}
                value={styleOverrides.brightness}
                onChange={(e) => updateOverride({ brightness: Number(e.target.value) })}
                className="w-full accent-(--accent)"
              />
            </label>
            <label className="block">
              <div className="mb-1 flex justify-between font-semibold">
                <span>Contrast</span>
                <span className="font-mono-num">{styleOverrides.contrast}%</span>
              </div>
              <input
                type="range"
                min={70}
                max={140}
                value={styleOverrides.contrast}
                onChange={(e) => updateOverride({ contrast: Number(e.target.value) })}
                className="w-full accent-(--accent)"
              />
            </label>
          </div>
        </div>
      </section>

      {/* All 12 Procedural Art Styles */}
      <section className="rounded-xl border border-(--border) bg-(--surface) p-4">
        <h3 className="text-sm font-extrabold text-(--text)">All 12 Live Procedural Art Styles</h3>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {ART_STYLES.map((st) => {
            const active = st.id === styleId;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setStyleId(st.id)}
                className={`touch-btn flex flex-col items-start rounded-xl border p-3 text-left transition ${
                  active ? 'border-(--accent) bg-(--surface-2)' : 'border-(--border) bg-transparent hover:bg-(--surface-2)'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-(--text)">{st.name}</span>
                  <div className="flex gap-1">
                    {st.palette.slice(0, 4).map((hex, i) => (
                      <span key={i} className="h-3 w-3 rounded-sm border border-black/20" style={{ backgroundColor: hex }} />
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-xs text-(--muted)">{st.desc}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
