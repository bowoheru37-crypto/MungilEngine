import { Wifi, WifiOff, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { t } from '../engine/i18n';
import type { GameShellState, LanguageCode } from '../engine/types';

interface OfflineToastProps {
  isOnline: boolean;
  lang: LanguageCode;
  shellState: GameShellState;
}

export function OfflineToast({ isOnline, lang, shellState }: OfflineToastProps) {
  const tr = t(lang);
  const [visibleMode, setVisibleMode] = useState<'offline' | 'back_online' | null>(() =>
    !isOnline ? 'offline' : null
  );
  const prevOnlineRef = useRef<boolean>(isOnline);
  const hadOfflineRef = useRef<boolean>(!isOnline);

  useEffect(() => {
    const prev = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (!isOnline) {
      hadOfflineRef.current = true;
      setVisibleMode('offline');
    } else if (!prev && isOnline && hadOfflineRef.current) {
      setVisibleMode('back_online');
    }
  }, [isOnline]);

  useEffect(() => {
    if (!visibleMode) return;
    const delayMs = visibleMode === 'offline' ? 6500 : 3200;
    const timer = window.setTimeout(() => {
      setVisibleMode(null);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [visibleMode]);

  if (!visibleMode) return null;

  const isGameActive = shellState === 'playing' || shellState === 'paused' || shellState === 'title';
  const positionClass = isGameActive
    ? 'top-14 left-1/2 -translate-x-1/2'
    : 'bottom-4 left-1/2 -translate-x-1/2';

  const isOffline = visibleMode === 'offline';

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-mode-toast"
      className={`pointer-events-none fixed z-50 w-[min(92vw,420px)] px-2 transition-all duration-200 ${positionClass}`}
    >
      <div
        className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-3.5 py-2.5 shadow-lg ${
          isOffline
            ? 'border-amber-500/50 bg-slate-900/95 text-amber-50'
            : 'border-emerald-500/50 bg-slate-900/95 text-emerald-50'
        }`}
      >
        <div
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
            isOffline ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
          }`}
        >
          {isOffline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
        </div>

        <div className="min-w-0 flex-1 text-xs leading-snug">
          <div className="font-extrabold tracking-tight">
            {isOffline ? tr.offlineToastTitle : tr.onlineBadge}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-300">
            {isOffline ? tr.offlineToastBody : tr.backOnlineToast}
          </div>
        </div>

        <button
          type="button"
          aria-label={tr.dismissLabel}
          onClick={() => setVisibleMode(null)}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
