/**
 * QOLBU SPACE 3D — Correct 3D Math + Cheap Itel A70 Render Pipeline.
 *
 * Conventions:
 * - Y-Up (+Y sky, +X right, -Z forward), Right-Handed coordinates, 1 unit = 1 meter.
 * - Pre-allocated Float32Array SoA buffers for MAX_ENTITIES = 128 (0 GC in hot loop).
 * - Full 5-Space / 3-Matrix Pipeline:
 *     Local -> World (Model = T * R * S) -> View (LookAt) -> Clip (Perspective) -> Screen (/ w)
 * - Itel A70 Safeguards:
 *     - Origin Rebasing when |player| > 500m (eliminates float jitter across 1000km2)
 *     - 35m Max Distance Culling + NDC Frustum Cull + 1-Bit Occlusion flag
 *     - 3-Level LOD (<10m LOD0, 10-25m LOD1, >25m LOD2 / CULL) + Distance Fog (22m..35m)
 *     - 3 Standard Cameras: Camera A (Fixed Isometric), Camera B (Follow 3/4), Camera C (FPS Raycast)
 */

import type { Camera3DPresetId, HybridRender5Mode } from './types';

export const SPACE3D_CONSTANTS = {
  MAX_ENTITIES: 128,
  FOV_DEG: 60,
  NEAR_M: 0.1,
  FAR_M: 100.0,
  REBASE_THRESHOLD_M: 500.0,
  CULL_DISTANCE_M: 35.0,
  LOD0_MAX_M: 10.0,
  LOD1_MAX_M: 25.0,
  FOG_START_M: 22.0,
  FOG_END_M: 35.0,
  CHAR_TRIS_LIMIT: 800,
  PROP_TRIS_LIMIT: 200,
  BOX_TRIS: 12,
  MAX_DRAW_CALLS: 35,
  IDEAL_DRAW_CALLS: 20,
  MAX_TRIS_FRAME: 44000,
} as const;

export type LodLevel = 0 | 1 | 2 | -1;

export interface Camera3DState {
  preset: Camera3DPresetId;
  eyeX: number;
  eyeY: number;
  eyeZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  yawRad: number;
  fovDeg: number;
  aspect: number;
  near: number;
  far: number;
}

export interface ScreenProjectionOut {
  sx: number;
  sy: number;
  ndcX: number;
  ndcY: number;
  ndcZ: number;
  clipW: number;
  visible: boolean;
}

export interface OriginRebaseResult {
  rebased: boolean;
  shiftX: number;
  shiftZ: number;
  worldOffsetX: number;
  worldOffsetZ: number;
}

export function createCamera3D(
  preset: Camera3DPresetId = 'follow_3_4',
  aspect = 720 / 1612
): Camera3DState {
  if (preset === 'iso_fixed') {
    return {
      preset,
      eyeX: 12,
      eyeY: 14,
      eyeZ: 12,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      yawRad: Math.PI * 0.25,
      fovDeg: SPACE3D_CONSTANTS.FOV_DEG,
      aspect,
      near: SPACE3D_CONSTANTS.NEAR_M,
      far: SPACE3D_CONSTANTS.FAR_M,
    };
  }
  if (preset === 'fps_raycast') {
    return {
      preset,
      eyeX: 0,
      eyeY: 1.65,
      eyeZ: 0,
      targetX: 0,
      targetY: 1.65,
      targetZ: -10,
      yawRad: 0,
      fovDeg: SPACE3D_CONSTANTS.FOV_DEG,
      aspect,
      near: SPACE3D_CONSTANTS.NEAR_M,
      far: SPACE3D_CONSTANTS.FAR_M,
    };
  }
  return {
    preset: 'follow_3_4',
    eyeX: 0,
    eyeY: 8,
    eyeZ: 8,
    targetX: 0,
    targetY: 1,
    targetZ: 0,
    yawRad: 0,
    fovDeg: SPACE3D_CONSTANTS.FOV_DEG,
    aspect,
    near: SPACE3D_CONSTANTS.NEAR_M,
    far: SPACE3D_CONSTANTS.FAR_M,
  };
}

/**
 * Camera B: Follow 3/4 Camera — eye = target + (0, 8, 8) smoothed via exponential lerp (10 * dt).
 */
export function updateCameraModeBFollow34(
  cam: Camera3DState,
  targetX: number,
  targetY: number,
  targetZ: number,
  dt: number
): void {
  const alpha = Math.min(1, Math.max(0, 10 * dt));
  const wantEyeX = targetX;
  const wantEyeY = targetY + 8;
  const wantEyeZ = targetZ + 8;
  cam.eyeX += (wantEyeX - cam.eyeX) * alpha;
  cam.eyeY += (wantEyeY - cam.eyeY) * alpha;
  cam.eyeZ += (wantEyeZ - cam.eyeZ) * alpha;
  cam.targetX += (targetX - cam.targetX) * alpha;
  cam.targetY += (targetY - cam.targetY) * alpha;
  cam.targetZ += (targetZ - cam.targetZ) * alpha;
}

/**
 * Camera A: Fixed Isometric — zero camera chase allocations; only anchor look offset if moved explicitly.
 */
export function updateCameraModeAIsometric(cam: Camera3DState): void {
  cam.preset = 'iso_fixed';
  cam.eyeX = 12;
  cam.eyeY = 14;
  cam.eyeZ = 12;
  cam.targetX = 0;
  cam.targetY = 0;
  cam.targetZ = 0;
}

/**
 * Camera C: First-Person Raycast — yaw-only rotation, flat horizon (no free pitch tilt).
 */
export function updateCameraModeCFpsRaycast(
  cam: Camera3DState,
  playerX: number,
  playerY: number,
  playerZ: number,
  yawRad: number
): void {
  cam.preset = 'fps_raycast';
  cam.yawRad = yawRad;
  cam.eyeX = playerX;
  cam.eyeY = playerY + 1.65;
  cam.eyeZ = playerZ;
  cam.targetX = playerX + Math.sin(yawRad) * 10;
  cam.targetY = playerY + 1.65;
  cam.targetZ = playerZ - Math.cos(yawRad) * 10;
}

/**
 * Column-major 4x4 View Matrix (LookAt, Y-Up Right-Handed). Writes into `out` (length >= 16).
 */
export function computeLookAtMatrix(
  out: Float32Array,
  eyeX: number,
  eyeY: number,
  eyeZ: number,
  targetX: number,
  targetY: number,
  targetZ: number
): Float32Array {
  let zx = eyeX - targetX;
  let zy = eyeY - targetY;
  let zz = eyeZ - targetZ;
  let len = Math.hypot(zx, zy, zz);
  if (len < 1e-6) {
    zx = 0;
    zy = 0;
    zz = 1;
    len = 1;
  }
  zx /= len;
  zy /= len;
  zz /= len;

  // up = (0, 1, 0), xAxis = normalize(up x zAxis) = (zz, 0, -zx)
  let xx = zz;
  const xy = 0;
  let xz = -zx;
  const xLen = Math.hypot(xx, xz);
  if (xLen < 1e-6) {
    xx = 1;
    xz = 0;
  } else {
    xx /= xLen;
    xz /= xLen;
  }

  // yAxis = zAxis x xAxis
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  out[0] = xx;
  out[1] = yx;
  out[2] = zx;
  out[3] = 0;

  out[4] = xy;
  out[5] = yy;
  out[6] = zy;
  out[7] = 0;

  out[8] = xz;
  out[9] = yz;
  out[10] = zz;
  out[11] = 0;

  out[12] = -(xx * eyeX + xy * eyeY + xz * eyeZ);
  out[13] = -(yx * eyeX + yy * eyeY + yz * eyeZ);
  out[14] = -(zx * eyeX + zy * eyeY + zz * eyeZ);
  out[15] = 1;
  return out;
}

/**
 * Column-major 4x4 Perspective Projection Matrix (FOV=60 deg, Near=0.1m, Far=100m).
 */
export function computePerspectiveMatrix(
  out: Float32Array,
  fovDeg: number = SPACE3D_CONSTANTS.FOV_DEG,
  aspect = 16 / 9,
  near: number = SPACE3D_CONSTANTS.NEAR_M,
  far: number = SPACE3D_CONSTANTS.FAR_M
): Float32Array {
  const safeAspect = Number.isFinite(aspect) && aspect > 0.05 ? aspect : 1;
  const f = 1.0 / Math.tan(((fovDeg * Math.PI) / 180) * 0.5);
  const nf = 1 / (near - far);

  out.fill(0);
  out[0] = f / safeAspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

/**
 * Composes Model = T * Ry * Rx * S into column-major `out` (at `offset`, zero allocation).
 */
export function composeModelMatrix(
  out: Float32Array,
  offset: number,
  tx: number,
  ty: number,
  tz: number,
  rx: number,
  ry: number,
  sx = 1,
  sy = 1,
  sz = 1
): void {
  const cy = Math.cos(ry);
  const syr = Math.sin(ry);
  const cx = Math.cos(rx);
  const sxr = Math.sin(rx);

  // R = Ry * Rx
  out[offset + 0] = cy * sx;
  out[offset + 1] = 0;
  out[offset + 2] = -syr * sx;
  out[offset + 3] = 0;

  out[offset + 4] = syr * sxr * sy;
  out[offset + 5] = cx * sy;
  out[offset + 6] = cy * sxr * sy;
  out[offset + 7] = 0;

  out[offset + 8] = syr * cx * sz;
  out[offset + 9] = -sxr * sz;
  out[offset + 10] = cy * cx * sz;
  out[offset + 11] = 0;

  out[offset + 12] = tx;
  out[offset + 13] = ty;
  out[offset + 14] = tz;
  out[offset + 15] = 1;
}

/**
 * Multiplies two column-major 4x4 matrices: out[outOffset..] = a[aOff..] * b[bOff..].
 */
export function multiplyMat4(
  out: Float32Array,
  outOff: number,
  a: Float32Array,
  aOff: number,
  b: Float32Array,
  bOff: number
): void {
  const a00 = a[aOff + 0], a01 = a[aOff + 1], a02 = a[aOff + 2], a03 = a[aOff + 3];
  const a10 = a[aOff + 4], a11 = a[aOff + 5], a12 = a[aOff + 6], a13 = a[aOff + 7];
  const a20 = a[aOff + 8], a21 = a[aOff + 9], a22 = a[aOff + 10], a23 = a[aOff + 11];
  const a30 = a[aOff + 12], a31 = a[aOff + 13], a32 = a[aOff + 14], a33 = a[aOff + 15];

  for (let col = 0; col < 4; col++) {
    const cOff = bOff + col * 4;
    const b0 = b[cOff + 0];
    const b1 = b[cOff + 1];
    const b2 = b[cOff + 2];
    const b3 = b[cOff + 3];
    const dst = outOff + col * 4;
    out[dst + 0] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
    out[dst + 1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
    out[dst + 2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
    out[dst + 3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
  }
}

/**
 * Projects a point through an MVP (or VP for world coordinates) into Screen Space.
 * Writes directly into `out` so callers inside render loops incur zero heap allocations.
 */
export function projectPointWithMatrix(
  mvp: Float32Array,
  mvpOff: number,
  x: number,
  y: number,
  z: number,
  viewportW: number,
  viewportH: number,
  out: ScreenProjectionOut
): ScreenProjectionOut {
  const cx = mvp[mvpOff + 0] * x + mvp[mvpOff + 4] * y + mvp[mvpOff + 8] * z + mvp[mvpOff + 12];
  const cy = mvp[mvpOff + 1] * x + mvp[mvpOff + 5] * y + mvp[mvpOff + 9] * z + mvp[mvpOff + 13];
  const cz = mvp[mvpOff + 2] * x + mvp[mvpOff + 6] * y + mvp[mvpOff + 10] * z + mvp[mvpOff + 14];
  const cw = mvp[mvpOff + 3] * x + mvp[mvpOff + 7] * y + mvp[mvpOff + 11] * z + mvp[mvpOff + 15];

  out.clipW = cw;
  if (cw <= 0.001) {
    out.visible = false;
    out.ndcX = 0;
    out.ndcY = 0;
    out.ndcZ = -2;
    out.sx = -9999;
    out.sy = -9999;
    return out;
  }

  const invW = 1 / cw;
  const ndcX = cx * invW;
  const ndcY = cy * invW;
  const ndcZ = cz * invW;

  out.ndcX = ndcX;
  out.ndcY = ndcY;
  out.ndcZ = ndcZ;
  out.sx = (ndcX * 0.5 + 0.5) * viewportW;
  out.sy = (0.5 - ndcY * 0.5) * viewportH;
  out.visible = ndcZ >= -1 && ndcZ <= 1 && ndcX >= -1.25 && ndcX <= 1.25 && ndcY >= -1.25 && ndcY <= 1.25;
  return out;
}

/**
 * Origin Rebasing (Floating Origin):
 * When |playerX| or |playerZ| exceeds 500m, shifts local world coordinates back by quantized 500m chunks
 * and tracks cumulative worldOffset so 1000km2 worlds remain jitter-free in Float32.
 */
export function evaluateOriginRebase(
  playerX: number,
  playerZ: number,
  prevOffsetX = 0,
  prevOffsetZ = 0,
  threshold = SPACE3D_CONSTANTS.REBASE_THRESHOLD_M
): OriginRebaseResult {
  const shiftX = Math.abs(playerX) > threshold ? Math.trunc(playerX / threshold) * threshold : 0;
  const shiftZ = Math.abs(playerZ) > threshold ? Math.trunc(playerZ / threshold) * threshold : 0;
  return {
    rebased: shiftX !== 0 || shiftZ !== 0,
    shiftX,
    shiftZ,
    worldOffsetX: prevOffsetX + shiftX,
    worldOffsetZ: prevOffsetZ + shiftZ,
  };
}

/**
 * 3-Level LOD + 35m Max Distance Culling + 1-Bit Occlusion Check.
 * Returns -1 when culled; 0 (<10m Low-Poly+HD), 1 (10..25m Billboard LD), 2 (25..35m 1 Quad).
 */
export function evaluateCullAndLod(
  distanceM: number,
  inFrustum = true,
  occludedByWall = false
): LodLevel {
  if (!Number.isFinite(distanceM) || distanceM < 0) return -1;
  if (!inFrustum || occludedByWall || distanceM > SPACE3D_CONSTANTS.CULL_DISTANCE_M) {
    return -1;
  }
  if (distanceM < SPACE3D_CONSTANTS.LOD0_MAX_M) return 0;
  if (distanceM <= SPACE3D_CONSTANTS.LOD1_MAX_M) return 1;
  return 2;
}

/**
 * Linear distance fog factor [0 = clear near, 1 = fully faded into sky/fog at 35m].
 */
export function calcFogFactor(distanceM: number): number {
  if (distanceM <= SPACE3D_CONSTANTS.FOG_START_M) return 0;
  if (distanceM >= SPACE3D_CONSTANTS.FOG_END_M) return 1;
  return (distanceM - SPACE3D_CONSTANTS.FOG_START_M) / (SPACE3D_CONSTANTS.FOG_END_M - SPACE3D_CONSTANTS.FOG_START_M);
}

/**
 * Pre-allocated Zero-GC Spatial Pipeline (`QolbuSpace3D`):
 * Stores transforms + Model + MVP matrices for up to 128 entities in flat Float32Arrays.
 */
export class QolbuSpace3D {
  readonly capacity = SPACE3D_CONSTANTS.MAX_ENTITIES;
  readonly active = new Uint8Array(SPACE3D_CONSTANTS.MAX_ENTITIES);
  readonly occluded = new Uint8Array(SPACE3D_CONSTANTS.MAX_ENTITIES);
  readonly lodLevel = new Int8Array(SPACE3D_CONSTANTS.MAX_ENTITIES);

  readonly posX = new Float32Array(SPACE3D_CONSTANTS.MAX_ENTITIES);
  readonly posY = new Float32Array(SPACE3D_CONSTANTS.MAX_ENTITIES);
  readonly posZ = new Float32Array(SPACE3D_CONSTANTS.MAX_ENTITIES);
  readonly rotX = new Float32Array(SPACE3D_CONSTANTS.MAX_ENTITIES);
  readonly rotY = new Float32Array(SPACE3D_CONSTANTS.MAX_ENTITIES);
  readonly scaleX = new Float32Array(SPACE3D_CONSTANTS.MAX_ENTITIES);
  readonly scaleY = new Float32Array(SPACE3D_CONSTANTS.MAX_ENTITIES);
  readonly scaleZ = new Float32Array(SPACE3D_CONSTANTS.MAX_ENTITIES);

  readonly modelMatrices = new Float32Array(SPACE3D_CONSTANTS.MAX_ENTITIES * 16);
  readonly mvpMatrices = new Float32Array(SPACE3D_CONSTANTS.MAX_ENTITIES * 16);

  readonly viewMatrix = new Float32Array(16);
  readonly projMatrix = new Float32Array(16);
  readonly vpMatrix = new Float32Array(16);

  readonly scratchProj: ScreenProjectionOut = {
    sx: 0,
    sy: 0,
    ndcX: 0,
    ndcY: 0,
    ndcZ: 0,
    clipW: 1,
    visible: false,
  };

  worldOffsetX = 0;
  worldOffsetZ = 0;
  camera: Camera3DState;
  visibleCount = 0;
  culledCount = 0;

  constructor(preset: Camera3DPresetId = 'follow_3_4', aspect = 720 / 1612) {
    this.camera = createCamera3D(preset, aspect);
    this.scaleX.fill(1);
    this.scaleY.fill(1);
    this.scaleZ.fill(1);
  }

  setEntity(
    idx: number,
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    sx = 1,
    sy = 1,
    sz = 1,
    occludedBit = 0
  ): boolean {
    if (idx < 0 || idx >= this.capacity) return false;
    this.active[idx] = 1;
    this.posX[idx] = x;
    this.posY[idx] = y;
    this.posZ[idx] = z;
    this.rotX[idx] = rx;
    this.rotY[idx] = ry;
    this.scaleX[idx] = sx;
    this.scaleY[idx] = sy;
    this.scaleZ[idx] = sz;
    this.occluded[idx] = occludedBit;
    return true;
  }

  /**
   * Rebase all active entity coordinates + camera when player moves beyond +/-500m.
   */
  rebaseIfNeeded(playerX: number, playerZ: number): OriginRebaseResult {
    const res = evaluateOriginRebase(playerX, playerZ, this.worldOffsetX, this.worldOffsetZ);
    if (!res.rebased) return res;

    this.worldOffsetX = res.worldOffsetX;
    this.worldOffsetZ = res.worldOffsetZ;
    this.camera.eyeX -= res.shiftX;
    this.camera.eyeZ -= res.shiftZ;
    this.camera.targetX -= res.shiftX;
    this.camera.targetZ -= res.shiftZ;

    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 0) continue;
      this.posX[i] -= res.shiftX;
      this.posZ[i] -= res.shiftZ;
    }
    return res;
  }

  /**
   * Single-pass per-frame update: View * Proj once, then Model + MVP + Culling + LOD once per active entity.
   */
  updateAll(viewportW: number, viewportH: number): { visible: number; culled: number } {
    this.camera.aspect = viewportH > 0 ? viewportW / viewportH : 1;
    computeLookAtMatrix(
      this.viewMatrix,
      this.camera.eyeX,
      this.camera.eyeY,
      this.camera.eyeZ,
      this.camera.targetX,
      this.camera.targetY,
      this.camera.targetZ
    );
    computePerspectiveMatrix(
      this.projMatrix,
      this.camera.fovDeg,
      this.camera.aspect,
      this.camera.near,
      this.camera.far
    );
    multiplyMat4(this.vpMatrix, 0, this.projMatrix, 0, this.viewMatrix, 0);

    let visible = 0;
    let culled = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 0) continue;
      const dist = Math.hypot(
        this.posX[i] - this.camera.eyeX,
        this.posY[i] - this.camera.eyeY,
        this.posZ[i] - this.camera.eyeZ
      );
      const proj = projectPointWithMatrix(
        this.vpMatrix,
        0,
        this.posX[i],
        this.posY[i],
        this.posZ[i],
        viewportW,
        viewportH,
        this.scratchProj
      );
      const lod = evaluateCullAndLod(dist, proj.visible, this.occluded[i] === 1);
      this.lodLevel[i] = lod;
      if (lod < 0) {
        culled += 1;
        continue;
      }
      visible += 1;
      const off = i * 16;
      composeModelMatrix(
        this.modelMatrices,
        off,
        this.posX[i],
        this.posY[i],
        this.posZ[i],
        this.rotX[i],
        this.rotY[i],
        this.scaleX[i],
        this.scaleY[i],
        this.scaleZ[i]
      );
      multiplyMat4(this.mvpMatrices, off, this.vpMatrix, 0, this.modelMatrices, off);
    }

    this.visibleCount = visible;
    this.culledCount = culled;
    return { visible, culled };
  }
}

export const HYBRID_5_MODES: Array<{
  id: HybridRender5Mode;
  label: string;
  targetDc: string;
  desc: string;
}> = [
  {
    id: 'hybrid_2_5d_billboard',
    label: 'Mode 1 · Hybrid 2.5D+ Billboard',
    targetDc: '14–22 DC',
    desc: 'Primary Itel A70 mode: low-poly 3D floor/walls + Y-billboard sprites + Blob shadow.',
  },
  {
    id: 'real_3d_lowpoly',
    label: 'Mode 2 · Real 3D Low-Poly',
    targetDc: '18–30 DC',
    desc: '<=800 char tris, <=200 prop tris, 12-tri boxes, Forward Lambert + Distance Fog.',
  },
  {
    id: 'raycast_pseudo3d',
    label: 'Mode 3 · Raycast Pseudo-3D',
    targetDc: '12–28 DC',
    desc: '16x16 grid DDA raycast corridor (120 rays max) with floor/ceiling shading.',
  },
  {
    id: 'mode7_voxel',
    label: 'Mode 4 · Mode-7 & Voxel Space',
    targetDc: '12–18 DC',
    desc: 'Scanline perspective road + heightmap horizon stripping at <14ms GPU cost.',
  },
  {
    id: 'isometric_painter',
    label: 'Mode 5 · Isometric 2.5D',
    targetDc: '12–20 DC',
    desc: 'Fixed Isometric Camera A + depth painter sort + zero per-frame matrix re-bake.',
  },
];

export const CAMERA_3_PRESETS: Array<{
  id: Camera3DPresetId;
  label: string;
  shortTag: string;
  desc: string;
}> = [
  {
    id: 'iso_fixed',
    label: 'Camera A · Fixed Isometric',
    shortTag: 'CAM-A ISO',
    desc: 'Zero camera matrix recomputation per frame. Ideal for tactics & town defense.',
  },
  {
    id: 'follow_3_4',
    label: 'Camera B · Follow 3/4',
    shortTag: 'CAM-B 3/4',
    desc: 'eye = player + (0, 8, 8) with 10*dt exponential smoothing.',
  },
  {
    id: 'fps_raycast',
    label: 'Camera C · FPS Raycast',
    shortTag: 'CAM-C FPS',
    desc: 'Yaw-only horizontal rotation & flat horizon for ultra-cheap mobile first-person.',
  },
];
