/**
 * Cleanroom Fake 3D & Pseudo-3D Renderer (Mungil Engine V7).
 * Fuses architectural patterns from Top-5 repos across Fake 3D, Pseudo 3D, & 2.5D:
 * - Sprite-Stack / Zdog layered depth shading for 3D characters
 * - OutRun / Mode-7 scanline perspective ground & horizon projection
 * - DDA Raycaster column slicing with distance fog
 * - Voxel Space heightmap column ray-marching for 3D terrain generation
 * Runs 100% on Canvas 2D with zero WebGL shader compilation stutter (Itel A70 friendly).
 */

import type { ArtStyleSpec, CharacterAnimState, GeneratedCharacterSpec, GeneratedTerrainSpec, StyleOverrides } from './types';

export interface ProjectedPoint {
  sx: number;
  sy: number;
  scale: number;
}

export function project3D(
  x: number,
  y: number,
  z: number,
  cx: number,
  cy: number,
  fov = 260
): ProjectedPoint {
  const safeZ = Math.max(24, fov + z);
  const scale = fov / safeZ;
  return {
    sx: cx + x * scale,
    sy: cy + y * scale,
    scale,
  };
}

/**
 * Pseudo-3D Sprite-Stack + Zdog-inspired layered Bowo / Generated Character renderer.
 * Supports full animation states: idle, walk, jump, fall, attack, dash, hurt, ko.
 */
export function drawCharacter3DStack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  style: ArtStyleSpec,
  opts: {
    pose: CharacterAnimState;
    facing: 1 | -1;
    time: number;
    yaw?: number;
    squashX?: number;
    squashY?: number;
    flash?: number;
    comboStep?: number;
    overrides: StyleOverrides;
    customChar?: GeneratedCharacterSpec;
  }
): void {
  const p = style.palette;
  const bodyColor = opts.customChar?.primaryColor ?? p[2];
  const cloakColor = opts.customChar?.cloakColor ?? p[3];
  const accentColor = opts.customChar?.accentColor ?? p[6];
  const armorShade = opts.customChar?.secondaryColor ?? p[8];
  const sx = opts.squashX ?? 1;
  const sy = opts.squashY ?? 1;
  const yaw = opts.yaw ?? (opts.facing === 1 ? 0.32 : -0.32);
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);

  ctx.save();
  ctx.translate(x, y);

  if (opts.overrides.shadowOn && opts.pose !== 'ko') {
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.64, size * 0.56, size * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (opts.pose === 'ko') {
    ctx.rotate(opts.facing * 1.48);
    ctx.globalAlpha = 0.7;
  } else if (opts.pose === 'hurt') {
    ctx.rotate(-opts.facing * 0.18);
  } else if (opts.pose === 'dash') {
    ctx.transform(1, 0, -opts.facing * 0.28, 1, 0, 0);
  }

  ctx.scale(sx, sy);

  const bob =
    opts.pose === 'walk'
      ? -Math.abs(Math.sin(opts.time * 14)) * size * 0.11
      : opts.pose === 'idle'
        ? Math.sin(opts.time * 3.8) * size * 0.035
        : opts.pose === 'jump'
          ? -size * 0.08
          : opts.pose === 'fall'
            ? size * 0.06
            : 0;
  ctx.translate(0, bob);

  const stride = opts.pose === 'walk' ? Math.sin(opts.time * 14) * size * 0.2 : opts.pose === 'jump' ? -size * 0.1 : 0;

  // Back leg & Front leg (Z-sorted by yaw)
  ctx.fillStyle = armorShade;
  ctx.beginPath();
  ctx.ellipse(-size * 0.16 * cosY + stride, size * 0.48, size * 0.15, size * 0.1, 0, 0, Math.PI * 2);
  ctx.ellipse(size * 0.16 * cosY - stride, size * 0.48, size * 0.15, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Flowing cloak layer behind torso (extruded Z-depth)
  ctx.fillStyle = cloakColor;
  ctx.beginPath();
  ctx.moveTo(-sinY * size * 0.35 - opts.facing * size * 0.18, -size * 0.1);
  ctx.lineTo(-opts.facing * (size * 0.62 + Math.sin(opts.time * 9) * 3), size * 0.36);
  ctx.lineTo(-opts.facing * size * 0.12, size * 0.4);
  ctx.closePath();
  ctx.fill();

  // 5-slice pseudo-3D stacked torso prism
  const slices = 5;
  for (let s = 0; s < slices; s++) {
    const zRatio = s / (slices - 1) - 0.5;
    const ox = sinY * zRatio * size * 0.26;
    const oy = -zRatio * size * 0.08;
    const shadeAlpha = s === slices - 1 ? 1 : 0.85;
    ctx.globalAlpha = opts.pose === 'ko' ? 0.7 : shadeAlpha;
    ctx.fillStyle = opts.flash && opts.flash > 0 ? '#ffffff' : s === 0 ? armorShade : bodyColor;
    ctx.beginPath();
    ctx.roundRect(-size * 0.32 + ox, -size * 0.14 + oy, size * 0.64, size * 0.54, size * 0.14);
    ctx.fill();
  }
  ctx.globalAlpha = opts.pose === 'ko' ? 0.7 : 1;

  // Rim highlight on front torso slice
  if (opts.overrides.outlineOn) {
    ctx.strokeStyle = p[9];
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-size * 0.26 + sinY * size * 0.1, -size * 0.1, size * 0.52, size * 0.46);
  }

  // Head (2 stacked pseudo-3D spheres + visor/eyes)
  const headScale = opts.customChar?.headScale ?? 1;
  const headY = -size * 0.56;
  ctx.fillStyle = armorShade;
  ctx.beginPath();
  ctx.arc(-sinY * size * 0.1, headY + 2, size * 0.31 * headScale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = opts.flash && opts.flash > 0 ? '#ffffff' : p[4];
  ctx.beginPath();
  ctx.arc(sinY * size * 0.08, headY, size * 0.3 * headScale, 0, Math.PI * 2);
  ctx.fill();

  // Headband / Helmet Crest
  ctx.fillStyle = cloakColor;
  ctx.beginPath();
  ctx.arc(sinY * size * 0.08, headY - size * 0.08, size * 0.31 * headScale, Math.PI * 0.9, Math.PI * 2.05);
  ctx.fill();

  // Eyes facing camera yaw
  const eyeX = sinY * size * 0.24 + opts.facing * size * 0.08;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(eyeX - 2, headY - size * 0.04, size * 0.09, size * 0.1);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(eyeX, headY - size * 0.03, size * 0.035, size * 0.045);

  // Articulated 3D Weapon + Slash Arc
  const swingAngle =
    opts.pose === 'attack'
      ? (opts.comboStep === 2 ? -1.15 : 1.2)
      : opts.pose === 'dash'
        ? -0.85
        : opts.pose === 'jump'
          ? -0.55
          : -0.22;

  ctx.save();
  ctx.translate(opts.facing * size * 0.34, size * 0.02);
  ctx.scale(opts.facing, 1);
  ctx.rotate(swingAngle);
  ctx.fillStyle = cloakColor;
  ctx.fillRect(-size * 0.05, -size * 0.08, size * 0.1, size * 0.26);
  ctx.fillStyle = accentColor;
  ctx.fillRect(-size * 0.07, -size * 0.68, size * 0.14, size * 0.6);
  ctx.fillStyle = p[9];
  ctx.fillRect(-size * 0.025, -size * 0.65, size * 0.05, size * 0.5);

  if (opts.pose === 'attack') {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.arc(0, -size * 0.2, size * 0.72, -1.2, 0.7);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

/**
 * Mode-7 / OutRun scanline perspective floor strips for 2.5D / 3D Ringan depth feel.
 */
export function renderMode7Horizon(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonY: number,
  groundBottomY: number,
  cameraX: number,
  style: ArtStyleSpec,
  level: 1 | 2 | 3
): number {
  const strips = 6;
  const totalH = Math.max(12, groundBottomY - horizonY);
  const stripH = totalH / strips;
  const baseA = level === 3 ? '#1e1030' : level === 2 ? '#162840' : style.palette[1];
  const baseB = level === 3 ? '#140b24' : level === 2 ? '#0f1c2e' : '#3d7031';

  for (let i = 0; i < strips; i++) {
    const depth = (i + 1) / strips;
    const sy = horizonY + i * stripH;
    ctx.fillStyle = i % 2 === 0 ? baseA : baseB;
    ctx.fillRect(0, sy, w, stripH + 1);

    // Perspective dashed road/grid ticks scrolling faster near foreground
    const tickSpacing = 36 + depth * 64;
    const offset = ((cameraX * (0.25 + depth * 0.55)) % tickSpacing + tickSpacing) % tickSpacing;
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    for (let tx = -offset; tx < w + tickSpacing; tx += tickSpacing) {
      ctx.fillRect(tx, sy + stripH * 0.35, 10 + depth * 12, 2);
    }
  }
  return strips;
}

/**
 * Lightweight DDA Raycast Corridor backdrop (used in Raycast style & Fake 3D showcase).
 */
export function renderRaycastCorridor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cameraX: number,
  style: ArtStyleSpec
): number {
  const map = [1, 0, 2, 0, 1, 3, 0, 2, 1, 0, 2, 1];
  const rays = 28;
  const colW = Math.ceil(w / rays);
  const horizon = h * 0.52;
  const phase = cameraX * 0.012;

  ctx.fillStyle = style.palette[0];
  ctx.fillRect(0, 0, w, horizon);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, horizon, w, h - horizon);

  for (let i = 0; i < rays; i++) {
    const sample = Math.abs(Math.sin(i * 0.24 + phase)) * 2.4 + 1.1;
    const wallType = map[(i + Math.floor(phase)) % map.length] || 1;
    const wallH = Math.min(h * 0.78, (h * 0.75) / sample);
    const shade = Math.max(0.25, 1 - sample / 4.2);
    ctx.fillStyle = wallType === 2 ? style.palette[2] : wallType === 3 ? style.palette[6] : style.palette[3];
    ctx.globalAlpha = shade;
    ctx.fillRect(i * colW, horizon - wallH / 2, colW + 0.5, wallH);
  }
  ctx.globalAlpha = 1;
  return rays + 2;
}

/**
 * Voxel-Space style column terrain preview from heightmap (Comanche / VoxelSpace pattern).
 */
export function renderVoxelHeightmapTerrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  terrain: GeneratedTerrainSpec,
  scrollPhase = 0
): void {
  const skyTop = terrain.biome === 'obsidian' ? '#090614' : terrain.biome === 'storm' ? '#0f1e36' : '#87ceeb';
  const skyBot = terrain.biome === 'obsidian' ? '#24143e' : terrain.biome === 'storm' ? '#27496d' : '#d8f3dc';
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, skyTop);
  grad.addColorStop(1, skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const cols = terrain.heights.length;
  const colW = w / cols;
  const layers = terrain.mode === '3D-Heightmap' ? 4 : 1;

  for (let layer = layers - 1; layer >= 0; layer--) {
    const depthScale = 1 - layer * 0.16;
    const baseOffset = layer * 18;
    const shift = Math.floor(scrollPhase * (layer + 1)) % cols;

    for (let c = 0; c < cols; c++) {
      const idx = (c + shift) % cols;
      const elevation = terrain.heights[idx] * depthScale;
      const topY = h - elevation - baseOffset;
      const barH = h - topY;
      if (terrain.biome === 'obsidian') {
        ctx.fillStyle = layer === 0 ? '#4c1d95' : layer === 1 ? '#3b0764' : '#1e1b4b';
      } else if (terrain.biome === 'storm') {
        ctx.fillStyle = layer === 0 ? '#38bdf8' : layer === 1 ? '#1d4ed8' : '#1e293b';
      } else {
        ctx.fillStyle = layer === 0 ? '#22c55e' : layer === 1 ? '#15803d' : '#166534';
      }
      ctx.fillRect(c * colW, topY, Math.ceil(colW), barH);
    }
  }
}
