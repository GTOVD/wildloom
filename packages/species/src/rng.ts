// Seeded RNG primitives for deterministic spawn rolls.

export function hashStringToU32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

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

export function makeRng(...parts: (string | number)[]): () => number {
  const key = parts.map(String).join("|");
  return mulberry32(hashStringToU32(key));
}

/// Sample from a Beta(α, β) distribution by inversion via Marsaglia & Tsang's
/// Gamma method. Returns a number in (0, 1).
export function betaSample(rng: () => number, alpha: number, beta: number): number {
  const x = gammaSample(rng, alpha);
  const y = gammaSample(rng, beta);
  return x / (x + y);
}

/// Marsaglia & Tsang gamma sampler (alpha ≥ 1). For α < 1 use boost trick.
export function gammaSample(rng: () => number, alpha: number): number {
  if (alpha < 1) {
    const u = rng();
    return gammaSample(rng, alpha + 1) * Math.pow(u, 1 / alpha);
  }
  const d = alpha - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number;
    let v: number;
    do {
      x = normalSample(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/// Box-Muller normal sample (mean 0, std 1).
export function normalSample(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/// Sample from a Dirichlet distribution. Returns array of N elements summing
/// to 1.
export function dirichletSample(rng: () => number, alphas: number[]): number[] {
  const ys = alphas.map((a) => gammaSample(rng, Math.max(1e-3, a)));
  const sum = ys.reduce((s, y) => s + y, 0);
  return ys.map((y) => y / sum);
}

/// Weighted sampler — given a weight map, return a key.
export function weightedChoice<T extends string>(
  rng: () => number,
  weights: Record<T, number>,
): T {
  let total = 0;
  for (const v of Object.values(weights)) total += v as number;
  let r = rng() * total;
  for (const [k, v] of Object.entries(weights) as Array<[T, number]>) {
    r -= v;
    if (r <= 0) return k;
  }
  return Object.keys(weights)[0]! as T;
}
