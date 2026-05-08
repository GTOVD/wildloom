// Layer 1 — Continuous affinity field m1 (§12).

import {
  dotVec,
  getAffinityVector,
  scalingCurves,
} from "@wildloom/data";
import {
  AFFINITY_IDS,
  type AffinityID,
  type AffinityVector,
  type CombatantState,
  type FieldState,
  type MoveInstance,
} from "@wildloom/types";

import { resistKernel } from "./kernels/resist";
import { clamp } from "./math";

export interface M1Breakdown {
  m1: number;
  B_vec: number;
  A_att: number;
  R_def: number;
  stab: number;
  field_gate: number;
}

const RESHAPE = scalingCurves.m1_reshape;

function moveAffinityWeights(move: MoveInstance): Record<AffinityID, number> {
  // If advanced affinity_weights provided, use it. Else build from primary +
  // optional secondary using blend_eta.
  const weights = {} as Record<AffinityID, number>;
  for (const id of AFFINITY_IDS) weights[id] = 0;

  if (move.affinity_weights) {
    let total = 0;
    for (const id of AFFINITY_IDS) {
      const w = move.affinity_weights[id] ?? 0;
      weights[id] = w;
      total += w;
    }
    if (total > 0) {
      for (const id of AFFINITY_IDS) weights[id] /= total;
    }
    return weights;
  }

  if (!move.primary_affinity) {
    return weights; // non-elemental — all zeros
  }

  if (move.secondary_affinity && move.blend_eta > 0) {
    const eta = clamp(move.blend_eta, 0, 0.95);
    weights[move.primary_affinity] = 1 - eta;
    weights[move.secondary_affinity] = eta;
  } else {
    weights[move.primary_affinity] = 1;
  }
  return weights;
}

/// Compose a "move affinity axis" used by attacker alignment: weighted sum of
/// the move's affinity vectors, normalized to a unit vector if non-zero.
function moveAffinityAxis(move: MoveInstance): AffinityVector | null {
  const w = moveAffinityWeights(move);
  let v: number[] = [0, 0, 0, 0, 0, 0];
  let any = false;
  for (const id of AFFINITY_IDS) {
    if (w[id] === 0) continue;
    any = true;
    const av = getAffinityVector(id);
    for (let i = 0; i < 6; i++) v[i]! += w[id] * av[i]!;
  }
  if (!any) return null;
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  if (norm < 1e-9) return null;
  return v.map((x) => x / norm) as unknown as AffinityVector;
}

/// Compute m1 per §12.
export function computeM1(
  move: MoveInstance,
  attacker: CombatantState,
  defender: CombatantState,
  field: FieldState,
): M1Breakdown {
  const moveW = moveAffinityWeights(move);
  const defE = defender.instance.affinity_emphasis;

  // Step 1: B_vec from weighted dot products.
  let s_raw = 0;
  for (const a_id of AFFINITY_IDS) {
    const wa = moveW[a_id];
    if (wa === 0) continue;
    const va = getAffinityVector(a_id);
    for (const d_id of AFFINITY_IDS) {
      const wd = defE[d_id];
      if (wd === 0) continue;
      const vd = getAffinityVector(d_id);
      s_raw += wa * wd * dotVec(va, vd);
    }
  }
  const B_vec = 1 + Math.tanh(s_raw);

  // Step 2: Attacker alignment.
  let A_att = 0;
  const moveAxis = moveAffinityAxis(move);
  if (moveAxis) {
    const attE = attacker.instance.affinity_emphasis;
    // Build attacker emphasis vector in latent space.
    let av: number[] = [0, 0, 0, 0, 0, 0];
    for (const id of AFFINITY_IDS) {
      const w = attE[id];
      if (w === 0) continue;
      const v = getAffinityVector(id);
      for (let i = 0; i < 6; i++) av[i]! += w * v[i]!;
    }
    const n = Math.sqrt(av.reduce((s, x) => s + x * x, 0));
    if (n > 1e-9) {
      const avNorm = av.map((x) => x / n);
      A_att = avNorm.reduce((s, x, i) => s + x * moveAxis[i]!, 0);
    }
  }

  // Step 3: R_def — resist kernel of move's primary affinity against material.
  const R_def = move.primary_affinity
    ? resistKernel(move.primary_affinity, defender.instance.material_profile, field)
    : 0;

  // Step 4: Continuous composition.
  let m1_raw =
    B_vec *
    Math.exp(RESHAPE.kappa1_attacker_alignment * Math.tanh(A_att)) *
    Math.exp(-RESHAPE.kappa2_defender_resist * Math.tanh(R_def));

  // Step 5: STAB — continuous (§12 step 5).
  let stab = 1;
  if (move.primary_affinity) {
    const e = attacker.instance.affinity_emphasis[move.primary_affinity];
    stab = 1 + RESHAPE.stab_scale * Math.tanh(e / Math.max(1e-6, RESHAPE.stab_ref));
    m1_raw *= stab;
  }

  // Step 6: field_gate — biome power modifiers per affinity.
  let field_gate = 1;
  if (move.primary_affinity) {
    const mods = field.affinity_power_modifiers ?? {};
    field_gate = mods[move.primary_affinity] ?? 1;
    m1_raw *= field_gate;
  }

  // Step 7: clamp.
  const m1 = clamp(m1_raw, RESHAPE.m_min, RESHAPE.m_max);
  return { m1, B_vec, A_att, R_def, stab, field_gate };
}
