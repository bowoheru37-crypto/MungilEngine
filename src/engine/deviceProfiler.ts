import type { DeviceProfile, DeviceTierId, RendererBackend } from './types';

export function detectHardwareSpecs(): { deviceMemoryGb: number; cpuCores: number; renderer: RendererBackend } {
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { deviceMemory?: number; gpu?: unknown }) : undefined;
  const deviceMemoryGb = typeof nav?.deviceMemory === 'number' && nav.deviceMemory > 0 ? nav.deviceMemory : 2;
  const cpuCores = typeof nav?.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 ? nav.hardwareConcurrency : 4;

  let renderer: RendererBackend = 'Canvas';
  if (typeof document !== 'undefined') {
    if (nav && 'gpu' in nav && nav.gpu) {
      renderer = 'WebGPU';
    } else {
      try {
        const probe = document.createElement('canvas');
        if (probe.getContext('webgl2')) {
          renderer = 'WebGL2';
        }
      } catch {
        renderer = 'Canvas';
      }
    }
  }
  return { deviceMemoryGb, cpuCores, renderer };
}

export function resolveDeviceTier(requested: DeviceTierId, deviceMemoryGb: number, cpuCores: number): 'eco' | 'mid' | 'hd' {
  if (requested !== 'auto') return requested;
  // Itel A70 / low-entry class profile: <= 2GB RAM or <= 4 cores -> eco
  if (deviceMemoryGb <= 2 || cpuCores <= 4) return 'eco';
  if (deviceMemoryGb >= 6 && cpuCores >= 8) return 'hd';
  return 'mid';
}

export function createDeviceProfile(
  requestedTier: DeviceTierId = 'auto',
  powerSaveAuto = true
): DeviceProfile {
  const { deviceMemoryGb, cpuCores, renderer } = detectHardwareSpecs();
  const activeTier = resolveDeviceTier(requestedTier, deviceMemoryGb, cpuCores);

  const targetFps: 30 | 60 = activeTier === 'eco' ? 30 : 60;
  const initialScale = activeTier === 'eco' ? 0.72 : activeTier === 'mid' ? 0.88 : 1.0;

  return {
    requestedTier,
    activeTier,
    deviceMemoryGb,
    cpuCores,
    targetFps,
    fixedStepSec: 1 / targetFps,
    dynamicScale: initialScale,
    minScale: 0.6,
    maxScale: 1.0,
    maxParticles: activeTier === 'eco' ? 60 : activeTier === 'mid' ? 110 : 160,
    maxEnemies: activeTier === 'eco' ? 12 : activeTier === 'mid' ? 20 : 32,
    powerSaveAuto,
    powerSaveActive: activeTier === 'eco' && powerSaveAuto,
    renderer,
  };
}

/**
 * Exponential Moving Average dynamic resolution controller.
 * Keeps frame time stable on Itel A70 by scaling internal canvas buffer between 0.60x and 1.00x.
 */
export function updateDynamicResolution(
  profile: DeviceProfile,
  emaFrameMs: number,
  currentScale: number
): { nextScale: number; powerSaveActive: boolean } {
  const budgetMs = 1000 / profile.targetFps;
  let nextScale = currentScale;

  if (emaFrameMs > budgetMs * 1.16) {
    nextScale = Math.max(profile.minScale, currentScale - 0.04);
  } else if (emaFrameMs < budgetMs * 0.78) {
    nextScale = Math.min(profile.maxScale, currentScale + 0.02);
  }

  const powerSaveActive = profile.powerSaveAuto && (nextScale <= 0.68 || emaFrameMs > budgetMs * 1.25 || profile.activeTier === 'eco');
  return {
    nextScale: Math.round(nextScale * 100) / 100,
    powerSaveActive,
  };
}

export function getHeapMb(): number {
  if (typeof performance !== 'undefined') {
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
    if (perf.memory?.usedJSHeapSize) {
      return Math.round((perf.memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10;
    }
  }
  return 14.2;
}
