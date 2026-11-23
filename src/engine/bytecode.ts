import type { LanguageCode, PhysicsMode, RenderMode } from './types';

export const OPCODES: Record<string, number> = {
  SAY: 1,
  CHOICE: 2,
  SET: 3,
  ADD: 4,
  CMP: 5,
  JMP: 6,
  JZ: 7,
  SPAWN: 8,
  PLAY: 9,
  WAIT: 10,
  END: 63,
};

export interface CompiledBytecode {
  instructions: Int16Array;
  linesCompiled: number;
  errors: string[];
}

export interface VmRunResult {
  steps: number;
  registers: number[];
  logs: string[];
  halted: boolean;
}

/**
 * Compiles Mungil Engine DSL lines into 16-bit packed instructions:
 * bits 15..10 = 6-bit opcode, bits 9..0 = signed/unsigned 10-bit operand.
 */
export function compileBytecode(source: string): CompiledBytecode {
  const lines = source.split(/\r?\n/);
  const packed: number[] = [];
  const errors: string[] = [];

  lines.forEach((raw, idx) => {
    const clean = raw.replace(/#.*$/, '').trim();
    if (!clean) return;
    const tokens = clean.split(/\s+/);
    const opName = tokens[0]?.toUpperCase() ?? '';
    const op = OPCODES[opName];
    if (op === undefined) {
      errors.push(`Line ${idx + 1}: unknown opcode "${tokens[0]}"`);
      return;
    }
    const arg = Number.parseInt(tokens[1] ?? '0', 10);
    const safeArg = Number.isFinite(arg) ? (arg & 0x3ff) : 0;
    packed.push(((op & 0x3f) << 10) | safeArg);
  });

  if (packed.length === 0) {
    packed.push((OPCODES.END << 10) | 0);
  }

  return {
    instructions: Int16Array.from(packed),
    linesCompiled: packed.length,
    errors,
  };
}

/**
 * Deterministic 16-bit bytecode VM with fixed Int32Array registers & max-step guard.
 */
export function runBytecodeVm(instructions: Int16Array, maxSteps = 256): VmRunResult {
  const regs = new Int32Array(16);
  const logs: string[] = [];
  let pc = 0;
  let cmpFlag = 0;
  let steps = 0;
  let halted = false;

  while (pc >= 0 && pc < instructions.length && steps < maxSteps) {
    const word = instructions[pc] & 0xffff;
    const op = (word >>> 10) & 0x3f;
    const arg = word & 0x3ff;
    steps += 1;
    pc += 1;

    switch (op) {
      case OPCODES.SAY:
        logs.push(`SAY#${arg}: Dialog frame triggered`);
        break;
      case OPCODES.CHOICE:
        logs.push(`CHOICE#${arg}: Branch A/B active`);
        break;
      case OPCODES.SET:
        regs[0] = arg;
        logs.push(`SET r0=${arg}`);
        break;
      case OPCODES.ADD:
        regs[0] += arg;
        logs.push(`ADD r0+=${arg} -> ${regs[0]}`);
        break;
      case OPCODES.CMP:
        cmpFlag = regs[0] === arg ? 0 : regs[0] < arg ? -1 : 1;
        break;
      case OPCODES.JMP:
        pc = Math.max(0, Math.min(instructions.length - 1, arg));
        break;
      case OPCODES.JZ:
        if (cmpFlag === 0) pc = Math.max(0, Math.min(instructions.length - 1, arg));
        break;
      case OPCODES.SPAWN:
        regs[1] += 1;
        logs.push(`SPAWN entityType=${arg} (count=${regs[1]})`);
        break;
      case OPCODES.PLAY:
        logs.push(`PLAY track=${arg}`);
        break;
      case OPCODES.WAIT:
        logs.push(`WAIT ${arg} ticks`);
        break;
      case OPCODES.END:
      default:
        halted = true;
        pc = instructions.length;
        break;
    }
  }

  return {
    steps,
    registers: Array.from(regs.slice(0, 4)),
    logs,
    halted,
  };
}

/**
 * Deterministic xorshift32 PRNG for reproducible worlds, loot, and maps.
 */
export function createSeedRng(seed: number): () => number {
  let state = (seed | 0) || 123456789;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

export interface ProceduralSeedWorld {
  seed: number;
  guardianName: string;
  loot: string;
  rarity: number;
  width: number;
  height: number;
  grid: string[];
}

export function generateSeedWorld(seed: number): ProceduralSeedWorld {
  const rng = createSeedRng(seed);
  const names = ['Bowo', 'Nara', 'Kala', 'Sari', 'Raka', 'Luna'];
  const loots = ['Light Potion', 'Sun Key', 'Aether Blade', 'Light Shard'];
  const guardianName = `${names[Math.floor(rng() * names.length)]}-${Math.floor(rng() * 900 + 100)}`;
  const loot = loots[Math.floor(rng() * loots.length)];
  const rarity = Math.floor(rng() * 100);
  const width = Math.floor(rng() * 6 + 8);
  const height = Math.floor(rng() * 4 + 6);
  const grid: string[] = [];
  for (let y = 0; y < height; y++) {
    let row = '';
    for (let x = 0; x < width; x++) {
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        row += '#';
      } else {
        row += rng() > 0.74 ? '#' : '.';
      }
    }
    grid.push(row);
  }
  return { seed, guardianName, loot, rarity, width, height, grid };
}

/**
 * Real Run-Length Encoding (.pak) binary packer + unpacker with MPAK7 header & checksum.
 */
export function computeChecksum(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function packRleBytes(jsonText: string): { bytes: Uint8Array; rawSize: number; packedSize: number; ratioPct: number; checksum: string } {
  const encoder = new TextEncoder();
  const raw = encoder.encode(jsonText);
  const out: number[] = [77, 80, 65, 75, 55]; // "MPAK7"

  let i = 0;
  while (i < raw.length) {
    const val = raw[i];
    let run = 1;
    while (i + run < raw.length && raw[i + run] === val && run < 255) {
      run += 1;
    }
    out.push(run, val);
    i += run;
  }

  const bytes = Uint8Array.from(out);
  const ratioPct = raw.length > 0 ? Math.max(0, Math.round((1 - bytes.length / raw.length) * 100)) : 0;
  return {
    bytes,
    rawSize: raw.length,
    packedSize: bytes.length,
    ratioPct,
    checksum: computeChecksum(jsonText),
  };
}

export function unpackRleBytes(bytes: Uint8Array): string {
  if (bytes.length < 5 || bytes[0] !== 77 || bytes[1] !== 80 || bytes[2] !== 65 || bytes[3] !== 75 || bytes[4] !== 55) {
    throw new Error('Invalid MPAK7 header');
  }
  const raw: number[] = [];
  for (let i = 5; i + 1 < bytes.length; i += 2) {
    const run = bytes[i];
    const val = bytes[i + 1];
    for (let c = 0; c < run; c++) {
      raw.push(val);
    }
  }
  return new TextDecoder().decode(Uint8Array.from(raw));
}

/**
 * KAPLAY-inspired 1-line Engine API (`E.*`) preserving backward compatibility with Mungil Engine V7 constructors.
 */
export interface EngineApiCallbacks {
  onCreateEntity: (id: string, x: number, y: number) => void;
  onSprite: (id: string, sprite: string) => void;
  onMove: (id: string, dx: number, dy: number) => void;
  onSound: (name: string) => void;
  onSave: (slot: 1 | 2 | 3) => void;
  onLoad: (slot: 1 | 2 | 3) => void;
  onLang: (lang: LanguageCode) => void;
  onTheme: (theme: 'dark' | 'light') => void;
  onMode: (mode: RenderMode) => void;
  onPhysics: (physics: PhysicsMode) => void;
  onShake: (intensity: number, duration: number) => void;
}

export class MungilEngineApi {
  private readonly handlers = new Map<string, Array<(payload?: unknown) => void>>();
  private readonly callbacks: Partial<EngineApiCallbacks>;

  constructor(callbacks: Partial<EngineApiCallbacks> = {}) {
    this.callbacks = callbacks;
  }

  create(id: string, x: number, y: number): void {
    this.callbacks.onCreateEntity?.(id, x, y);
  }

  sprite(id: string, name: string): void {
    this.callbacks.onSprite?.(id, name);
  }

  move(id: string, dx: number, dy: number): void {
    this.callbacks.onMove?.(id, dx, dy);
  }

  on(event: string, fn: (payload?: unknown) => void): () => void {
    const list = this.handlers.get(event) ?? [];
    list.push(fn);
    this.handlers.set(event, list);
    return () => {
      const next = (this.handlers.get(event) ?? []).filter((f) => f !== fn);
      this.handlers.set(event, next);
    };
  }

  emit(event: string, payload?: unknown): void {
    const list = this.handlers.get(event);
    if (!list) return;
    for (const fn of list) {
      fn(payload);
    }
  }

  playSound(name: string): void {
    this.callbacks.onSound?.(name);
  }

  save(slot: 1 | 2 | 3): void {
    this.callbacks.onSave?.(slot);
  }

  load(slot: 1 | 2 | 3): void {
    this.callbacks.onLoad?.(slot);
  }

  setLang(lang: LanguageCode): void {
    this.callbacks.onLang?.(lang);
  }

  setTheme(theme: 'dark' | 'light'): void {
    this.callbacks.onTheme?.(theme);
  }

  setMode(mode: RenderMode): void {
    this.callbacks.onMode?.(mode);
  }

  setPhysics(physics: PhysicsMode): void {
    this.callbacks.onPhysics?.(physics);
  }

  cameraShake(intensity: number, duration = 0.25): void {
    this.callbacks.onShake?.(intensity, duration);
  }
}
