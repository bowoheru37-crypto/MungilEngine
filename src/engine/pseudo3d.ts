/**
 * Cleanroom Fake 3D & Pseudo-3D Renderer (Mungil Engine V7).
 * Fuses architectural patterns from Top-5 repos across Fake 3D, Pseudo 3D, & 2.5D:
 * - Sprite-Stack / Zdog layered depth shading for 3D characters
 * - OutRun / Mode-7 scanline perspective ground & horizon projection
 * - DDA Raycaster column slicing with distance fog
 * - Voxel Space heightmap column ray-marching for 3D terrain generation
 * Runs 100% on Canvas 2D with zero WebGL shader compilation stutter (Itel A70 friendly).
 */

import {
  calcFogFactor,
  composeModelMatrix,
  computeLookAtMatrix,
  computePerspectiveMatrix,
  createCamera3D,
  multiplyMat4,
  projectPointWithMatrix,
  updateCameraModeAIsometric,
  updateCameraModeBFollow34,
  updateCameraModeCFpsRaycast,
} from './qolbuSpace3d';
import type {
  ArtStyleSpec,
  Camera3DPresetId,
  CharacterAnimState,
  GeneratedCharacterSpec,
  GeneratedMesh3DSpec,
  GeneratedTerrainSpec,
  StyleOverrides,
} from './types';

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

const PREVIEW_VIEW_MAT = new Float32Array(16);
const PREVIEW_PROJ_MAT = new Float32Array(16);
const PREVIEW_MODEL_MAT = new Float32Array(16);
const PREVIEW_MVP_MAT = new Float32Array(16);

/**
 * Renders a GeneratedMesh3DSpec using the exact QolbuSpace3D 5-Space / 3-Matrix Pipeline:
 * Model (T*R*S) -> View (LookAt) -> Perspective (FOV=60, Near=0.1, Far=100) -> Screen (/ w),
 * plus Painter's Depth Sort, Forward Mobile Lambert shading, Distance Fog, and Blob Shadow.
 */
export function renderMesh3DPreview(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mesh: GeneratedMesh3DSpec,
  opts: {
    yawRad: number;
    pitchRad?: number;
    cameraPreset: Camera3DPresetId;
    lod: 0 | 1 | 2;
    wireframe?: boolean;
  }
): { drawnTris: number; drawCalls: number } {
  // Sky + Horizon Fog backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#070b14');
  bg.addColorStop(1, '#132033');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const cam = createCamera3D(opts.cameraPreset, h > 0 ? w / h : 1);
  if (opts.cameraPreset === 'iso_fixed') {
    updateCameraModeAIsometric(cam);
    cam.eyeX = 3.2;
    cam.eyeY = 3.1;
    cam.eyeZ = 3.2;
    cam.targetY = 0.9;
  } else if (opts.cameraPreset === 'fps_raycast') {
    updateCameraModeCFpsRaycast(cam, 0, -0.5, 3.3, 0);
    cam.targetY = 0.95;
  } else {
    updateCameraModeBFollow34(cam, 0, 0.9, 0, 1);
    cam.eyeX = 0;
    cam.eyeY = 2.6;
    cam.eyeZ = 4.2;
  }

  computeLookAtMatrix(PREVIEW_VIEW_MAT, cam.eyeX, cam.eyeY, cam.eyeZ, cam.targetX, cam.targetY, cam.targetZ);
  computePerspectiveMatrix(PREVIEW_PROJ_MAT, cam.fovDeg, cam.aspect, cam.near, cam.far);
  composeModelMatrix(PREVIEW_MODEL_MAT, 0, 0, 0, 0, opts.pitchRad ?? 0, opts.yawRad, 1, 1, 1);
  multiplyMat4(PREVIEW_MVP_MAT, 0, PREVIEW_PROJ_MAT, 0, PREVIEW_VIEW_MAT, 0);
  multiplyMat4(PREVIEW_MVP_MAT, 0, PREVIEW_MVP_MAT, 0, PREVIEW_MODEL_MAT, 0);

  // Project all vertices once
  const projected = mesh.vertices.map((v) =>
    projectPointWithMatrix(
      PREVIEW_MVP_MAT,
      0,
      v.x,
      v.y,
      v.z,
      w,
      h,
      { sx: 0, sy: 0, ndcX: 0, ndcY: 0, ndcZ: 0, clipW: 1, visible: false }
    )
  );

  // Ground reference plane + Blob shadow at (0, 0, 0)
  const originProj = projectPointWithMatrix(
    PREVIEW_MVP_MAT,
    0,
    0,
    0,
    0,
    w,
    h,
    { sx: 0, sy: 0, ndcX: 0, ndcY: 0, ndcZ: 0, clipW: 1, visible: false }
  );
  if (originProj.visible && mesh.blobShadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(originProj.sx, originProj.sy + 4, 42, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Respect requested LOD count (LOD0 full, LOD1 45%, LOD2 <=12 tris)
  const triLimit =
    opts.lod === 2 ? mesh.lodCounts.lod2 : opts.lod === 1 ? mesh.lodCounts.lod1 : mesh.lodCounts.lod0;
  const activeTris = mesh.triangles.slice(0, triLimit);

  // Transform world vertices by Model Y rotation for Lambert lighting + Painter's Z-sort
  const cosY = Math.cos(opts.yawRad);
  const sinY = Math.sin(opts.yawRad);
  const sorted = activeTris
    .map((tri) => {
      const pa = projected[tri.a];
      const pb = projected[tri.b];
      const pc = projected[tri.c];
      if (!pa || !pb || !pc || !pa.visible || !pb.visible || !pc.visible) return null;
      const depth = (pa.clipW + pb.clipW + pc.clipW) / 3;
      const va = mesh.vertices[tri.a];
      const vb = mesh.vertices[tri.b];
      const vc = mesh.vertices[tri.c];

      // Rotate edge vectors for directional sun light (0.45, 0.78, 0.42)
      const ux = vb.x - va.x;
      const uy = vb.y - va.y;
      const uz = vb.z - va.z;
      const vx = vc.x - va.x;
      const vy = vc.y - va.y;
      const vz = vc.z - va.z;
      const nxRaw = uy * vz - uz * vy;
      const nyRaw = uz * vx - ux * vz;
      const nzRaw = ux * vy - uy * vx;
      const nx = nxRaw * cosY + nzRaw * sinY;
      const ny = nyRaw;
      const nz = -nxRaw * sinY + nzRaw * cosY;
      const nLen = Math.hypot(nx, ny, nz) || 1;
      const lambert = Math.max(0.28, (nx * 0.45 + ny * 0.78 + nz * 0.42) / nLen * 0.65 + 0.45);
      const fog = calcFogFactor(depth * 2.2);
      return { tri, pa, pb, pc, depth, lambert, fog };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.depth - a.depth);

  for (const item of sorted) {
    ctx.beginPath();
    ctx.moveTo(item.pa.sx, item.pa.sy);
    ctx.lineTo(item.pb.sx, item.pb.sy);
    ctx.lineTo(item.pc.sx, item.pc.sy);
    ctx.closePath();

    if (!opts.wireframe) {
      ctx.fillStyle = item.tri.color;
      ctx.globalAlpha = Math.max(0.25, item.lambert * (1 - item.fog * 0.5));
      ctx.fill();
    }
    ctx.globalAlpha = opts.wireframe ? 0.9 : 0.35;
    ctx.strokeStyle = opts.wireframe ? '#38bdf8' : '#0f172a';
    ctx.lineWidth = opts.wireframe ? 1.2 : 0.75;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Compact HUD readout inside canvas corner
  ctx.fillStyle = 'rgba(2,6,23,0.72)';
  ctx.fillRect(8, 8, 178, 22);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`LOD${opts.lod} · ${sorted.length} tris · ${opts.cameraPreset}`, 14, 22);

  return { drawnTris: sorted.length, drawCalls: mesh.drawCallsEst };
}

