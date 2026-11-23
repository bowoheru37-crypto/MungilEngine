/**
 * Zero-GC Screen-Space Culling Helpers (Mungil Engine V7).
 * Used by GameShell renderer and Physics Debug visualizer to skip off-screen
 * draw calls on Itel A70 and low-entry Android devices.
 */

export interface ViewportBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function isRectInViewport(
  x: number,
  y: number,
  w: number,
  h: number,
  vp: ViewportBounds,
  margin = 48
): boolean {
  return (
    x + w >= vp.left - margin &&
    x <= vp.right + margin &&
    y + h >= vp.top - margin &&
    y <= vp.bottom + margin
  );
}

export function isCircleInViewport(
  cx: number,
  cy: number,
  r: number,
  vp: ViewportBounds,
  margin = 48
): boolean {
  return (
    cx + r >= vp.left - margin &&
    cx - r <= vp.right + margin &&
    cy + r >= vp.top - margin &&
    cy - r <= vp.bottom + margin
  );
}

export function isPointInViewport(
  x: number,
  y: number,
  vp: ViewportBounds,
  margin = 32
): boolean {
  return (
    x >= vp.left - margin &&
    x <= vp.right + margin &&
    y >= vp.top - margin &&
    y <= vp.bottom + margin
  );
}
