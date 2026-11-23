import { Download } from 'lucide-react';
import { useState } from 'react';

import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  label: string;
  compact?: boolean;
}

export function PWAInstallButton({ label, compact = false }: PWAInstallButtonProps) {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);

  if (isInstalled) return null;

  if (canInstall) {
    return (
      <button
        type="button"
        onClick={() => void promptInstall()}
        className={`touch-btn inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 font-semibold text-emerald-300 transition hover:bg-emerald-500/25 ${
          compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
        }`}
      >
        <Download className="h-4 w-4" />
        <span>{label}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setShowIosGuide((v) => !v)}
          className={`touch-btn inline-flex items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/15 font-semibold text-sky-200 transition hover:bg-sky-500/25 ${
            compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
          }`}
        >
          <Download className="h-4 w-4" />
          <span>{label}</span>
        </button>
        {showIosGuide && (
          <div className="mt-2 rounded-xl border border-(--border) bg-(--surface) p-3 text-xs text-(--text) shadow-lg">
            Tap Safari Share icon and select <strong>Add to Home Screen</strong> to install offline.
          </div>
        )}
      </div>
    );
  }

  return null;
}
