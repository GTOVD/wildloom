// Math primitives used across the §10 damage pipeline.

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function smoothMult(
  alpha: number,
  factors: Array<{ x: number; x0: number; scale: number }>,
): number {
  let m = 1;
  for (const f of factors) {
    const t = Math.tanh((f.x - f.x0) / Math.max(1e-6, f.scale));
    m *= 1 + alpha * t;
  }
  return m;
}

/// Smooth single-tanh modifier: 1 + α·tanh((x − x0)/Δ).
export function smoothModifier(
  alpha: number,
  x: number,
  x0: number,
  scale: number,
): number {
  return 1 + alpha * Math.tanh((x - x0) / Math.max(1e-6, scale));
}

/// Stable 64-bit-ish hash from a hex/string seed.
export function hashStringToU32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/// Mulberry32 — deterministic and fast. One generator per (rng_seed, stage_offset).
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/// Make a sub-RNG from (battleSeed, label). Independent streams per stage.
export function subRng(battleSeed: string, label: string): () => number {
  const a = hashStringToU32(battleSeed);
  const b = hashStringToU32(label);
  return mulberry32((a ^ Math.imul(b, 0x9e3779b9)) >>> 0);
}
