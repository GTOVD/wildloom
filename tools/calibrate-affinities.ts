/**
 * Offline calibrator: solves for 12 unit vectors in R^6 such that
 *   1 + tanh(a_i · a_j) ≈ CHART_0[i][j] for all (i,j).
 *
 * CHART_0 is asymmetric in places (e.g. GA→AE=2.0, AE→GA=0.75) but
 * dot products are symmetric. We fit the symmetric average of each pair
 * and log per-cell residuals. Cells with |residual| > 0.30 are flagged.
 *
 * Output: packages/data/json/affinity_vectors.json
 *
 * Usage: pnpm calibrate:affinities
 */

import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type Mat12 = number[][];

const AFFINITIES = [
  "TH", "CY", "AQ", "GA", "MI", "FL", "AE", "LU", "VO", "SO", "CR", "PL",
] as const;

const N = AFFINITIES.length; // 12
const D = 6; // latent dimension per §7.2

// ---------------------------------------------------------------------------
// Load CHART_0
// ---------------------------------------------------------------------------

const chartPath = resolve(
  process.cwd(),
  "packages/data/json/affinity_chart_chart0.json",
);
const chartRaw = JSON.parse(readFileSync(chartPath, "utf8")) as {
  matrix: Record<string, Record<string, number>>;
};

// Build CHART_0 as a 12x12 matrix indexed by AFFINITIES order.
const chart0: Mat12 = AFFINITIES.map((rowId) =>
  AFFINITIES.map((colId) => chartRaw.matrix[rowId]![colId]!),
);

// Symmetric target: average of (i,j) and (j,i). Each cell is independent
// during loss computation; symmetric target is what dot products *can* fit.
const targetSym: Mat12 = Array.from({ length: N }, (_, i) =>
  Array.from({ length: N }, (_, j) => (chart0[i]![j]! + chart0[j]![i]!) / 2),
);

// Convert target to s = a_i·a_j space: target_s = artanh(target - 1).
// Clamp argument to (-0.999, 0.999) to keep artanh finite.
function artanh(x: number): number {
  const c = Math.max(-0.999, Math.min(0.999, x));
  return 0.5 * Math.log((1 + c) / (1 - c));
}
const targetS: Mat12 = targetSym.map((row) => row.map((v) => artanh(v - 1)));

// ---------------------------------------------------------------------------
// Optimization: minimize Σ (1 + tanh(a_i·a_j) - CHART_0[i][j])^2 over the
// asymmetric chart. We optimize 12 vectors of dim D, with a soft unit-norm
// penalty.
// ---------------------------------------------------------------------------

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}

function normalize(v: number[]): number[] {
  const n = Math.sqrt(dot(v, v));
  return n > 1e-9 ? v.map((x) => x / n) : v.slice();
}

function copyVecs(v: number[][]): number[][] {
  return v.map((x) => x.slice());
}

/**
 * Diagonal cells (CHART_0[i][i] = 0.5) are inherently unfittable by unit
 * dot products — a unit vector's self-dot is always 1.0, so 1 + tanh(1) ≈ 1.76.
 * Per design, the diagonal "self-resist" effect is captured by the resist
 * kernel R_def in §12 (e.g. high thermal_mass + low conductivity → strong TH
 * resist), not by B_vec. We exclude diagonals from the calibration loss.
 */
function loss(vecs: number[][]): { total: number; residSum: number } {
  let total = 0;
  let residSum = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      const s = dot(vecs[i]!, vecs[j]!);
      const pred = 1 + Math.tanh(s);
      const r = pred - chart0[i]![j]!;
      total += r * r;
      residSum += Math.abs(r);
    }
  }
  return { total, residSum };
}

function computeGradient(vecs: number[][]): number[][] {
  const grads: number[][] = vecs.map(() => Array(D).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      const s = dot(vecs[i]!, vecs[j]!);
      const t = Math.tanh(s);
      const dpred_ds = 1 - t * t;
      const r = 1 + t - chart0[i]![j]!;
      const factor = 2 * r * dpred_ds;
      for (let d = 0; d < D; d++) {
        grads[i]![d]! += factor * vecs[j]![d]!;
        grads[j]![d]! += factor * vecs[i]![d]!;
      }
    }
  }
  return grads;
}

function projectUnitSphere(vecs: number[][]): void {
  for (let i = 0; i < N; i++) vecs[i] = normalize(vecs[i]!);
}

function calibrate(seed = 42, iters = 4000, lr = 0.02): number[][] {
  const rand = seededRng(seed);
  // Random init from physical-axis hints: thermal/EM/mechanical/chemical/wave/grav.
  const seedInit: Record<string, [number, number, number, number, number, number]> = {
    TH: [+1.0, +0.1, +0.0, +0.2, +0.0, +0.0],
    CY: [-1.0, +0.0, +0.1, +0.2, +0.0, +0.0],
    AQ: [+0.0, +0.2, +0.3, +0.6, +0.4, +0.0],
    GA: [+0.0, +1.0, +0.0, +0.1, +0.3, +0.0],
    MI: [+0.0, -0.3, +0.9, +0.0, +0.2, +0.1],
    FL: [+0.1, +0.0, +0.0, +0.9, +0.0, +0.2],
    AE: [+0.0, +0.0, +0.4, +0.0, +0.6, -0.3],
    LU: [+0.4, +0.7, +0.0, +0.0, +0.4, +0.0],
    VO: [-0.1, -0.1, -0.2, -0.1, -0.4, +1.0],
    SO: [+0.0, +0.0, +0.4, +0.0, +1.0, -0.4],
    CR: [+0.2, +0.2, -0.2, +0.9, +0.0, +0.0],
    PL: [+0.6, +0.6, +0.0, +0.0, +0.2, +0.0],
  };

  let vecs: number[][] = AFFINITIES.map((id) => {
    const base = seedInit[id]!.slice();
    return base.map((v) => v + (rand() - 0.5) * 0.1);
  });
  projectUnitSphere(vecs);

  let bestLoss = Infinity;
  let bestVecs = copyVecs(vecs);

  // Adam optimizer
  const m: number[][] = vecs.map(() => Array(D).fill(0));
  const v: number[][] = vecs.map(() => Array(D).fill(0));
  const beta1 = 0.9;
  const beta2 = 0.999;
  const eps = 1e-8;

  for (let it = 1; it <= iters; it++) {
    const grads = computeGradient(vecs);
    for (let i = 0; i < N; i++) {
      for (let d = 0; d < D; d++) {
        m[i]![d] = beta1 * m[i]![d]! + (1 - beta1) * grads[i]![d]!;
        v[i]![d] = beta2 * v[i]![d]! + (1 - beta2) * grads[i]![d]! ** 2;
        const mhat = m[i]![d]! / (1 - beta1 ** it);
        const vhat = v[i]![d]! / (1 - beta2 ** it);
        vecs[i]![d]! -= (lr * mhat) / (Math.sqrt(vhat) + eps);
      }
    }
    projectUnitSphere(vecs);

    if (it % 500 === 0) {
      const { total } = loss(vecs);
      // eslint-disable-next-line no-console
      console.log(`  iter ${it}: loss=${total.toFixed(4)}`);
      if (total < bestLoss) {
        bestLoss = total;
        bestVecs = copyVecs(vecs);
      }
    }
  }

  const final = loss(vecs);
  if (final.total < bestLoss) {
    bestLoss = final.total;
    bestVecs = copyVecs(vecs);
  }

  return bestVecs;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log("Calibrating affinity vectors against CHART_0…");

// Multiple restarts; keep the best.
let best: number[][] = [];
let bestLoss = Infinity;
for (let restart = 0; restart < 5; restart++) {
  console.log(`Restart ${restart + 1}/5 (seed=${42 + restart})`);
  const vecs = calibrate(42 + restart, 4000, 0.02);
  const { total } = loss(vecs);
  if (total < bestLoss) {
    bestLoss = total;
    best = vecs;
  }
}

const finalLoss = loss(best);
const rms = Math.sqrt(finalLoss.total / (N * N));
console.log(`\nBest loss: ${finalLoss.total.toFixed(4)} (RMS=${rms.toFixed(4)})`);

// Per-cell residual table (off-diagonal only — diagonals handled by R_def).
const flagged: string[] = [];
let maxAbsResid = 0;
const residuals: Record<string, Record<string, number>> = {};
for (let i = 0; i < N; i++) {
  const rowId = AFFINITIES[i]!;
  residuals[rowId] = {};
  for (let j = 0; j < N; j++) {
    const colId = AFFINITIES[j]!;
    const s = dot(best[i]!, best[j]!);
    const pred = 1 + Math.tanh(s);
    const r = i === j ? 0 : pred - chart0[i]![j]!;
    residuals[rowId][colId] = Number(r.toFixed(4));
    if (i !== j) {
      if (Math.abs(r) > Math.abs(maxAbsResid)) maxAbsResid = r;
      if (Math.abs(r) > 0.30) {
        flagged.push(
          `${rowId}->${colId}: target=${chart0[i]![j]!.toFixed(2)} pred=${pred.toFixed(2)} resid=${r.toFixed(2)}`,
        );
      }
    }
  }
}

console.log(`Max |residual|: ${Math.abs(maxAbsResid).toFixed(4)}`);
if (flagged.length > 0) {
  console.log(`\nCells with |residual| > 0.30 (${flagged.length}):`);
  for (const line of flagged) console.log("  " + line);
} else {
  console.log("\nAll cells within ±0.30 tolerance.");
}

// ---------------------------------------------------------------------------
// Write result
// ---------------------------------------------------------------------------

const out = {
  _doc: "Calibrated unit vectors in R^6 such that 1 + tanh(a_i·a_j) ≈ CHART_0[i][j]. Generated by tools/calibrate-affinities.ts. Re-run via `pnpm calibrate:affinities`.",
  dimension: D,
  axis_order: AFFINITIES,
  rms_residual: Number(rms.toFixed(4)),
  max_abs_residual: Number(Math.abs(maxAbsResid).toFixed(4)),
  flagged_count: flagged.length,
  vectors: Object.fromEntries(
    AFFINITIES.map((id, i) => [
      id,
      best[i]!.map((v) => Number(v.toFixed(6))),
    ]),
  ),
  residuals,
};

const outPath = resolve(
  process.cwd(),
  "packages/data/json/affinity_vectors.json",
);
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(`\nWrote ${outPath}`);
