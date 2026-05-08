// §10 — Damage pipeline stages.
//
// Each stage is a small pure function that mutates an in-progress breakdown.
// The resolver chains them; tests can call any stage directly.

import { scalingCurves } from "@wildloom/data";
import {
  type AccumulatorKey,
  type BattleSnapshot,
  type CombatantState,
  type FieldState,
  type HitBreakdown,
  type ModalityWeights,
  type MoveInstance,
} from "@wildloom/types";

import { effectiveStats } from "./effective_stats";
import { psiConcussive } from "./kernels/concussive";
import { piercingResponse } from "./kernels/piercing";
import { psiSlashing } from "./kernels/slashing";
import { computeM1, type M1Breakdown } from "./layer1_m1";
import { applyLayer2, type Layer2Result } from "./layer2_rules";
import { clamp, sigmoid, subRng } from "./math";

const SC = scalingCurves;

// ---------------------------------------------------------------------------
// Stage 0 — Hit resolution (§10.1)
// ---------------------------------------------------------------------------

export function stage0_hitResolution(
  move: MoveInstance,
  attacker: CombatantState,
  defender: CombatantState,
  rngSeed: string,
  layer2AccuracyMult: number = 1,
): { p_hit: number; hit: boolean; miss_reason?: string } {
  const accStats = effectiveStats(attacker);
  const defStats = effectiveStats(defender);

  // Sigmoid form. accuracy is treated as base accuracy 0–100 scaled into the
  // logit domain.
  const baseLogit =
    SC.hit_resolution.alpha_acc +
    move.accuracy / 50 + // doubles the accuracy field's slope contribution
    SC.hit_resolution.beta_acc * accStats.precision -
    SC.hit_resolution.gamma_acc * defStats.initiative;

  let p_hit = sigmoid(baseLogit) * layer2AccuracyMult;
  p_hit = clamp(p_hit, SC.hit_resolution.min_p_hit, SC.hit_resolution.max_p_hit);

  const rng = subRng(rngSeed, "stage0_hit");
  const roll = rng();
  const hit = roll < p_hit;
  return hit
    ? { p_hit, hit: true }
    : { p_hit, hit: false, miss_reason: "below_p_hit" };
}

// ---------------------------------------------------------------------------
// Stage 1 — Payload routing (§10.2)
// ---------------------------------------------------------------------------

export interface PayloadRouting {
  W_k: number;
  W_e: number;
  P_k: number;
  P_e: number;
  A_k: number;
  A_e: number;
  omega_k: ModalityWeights;
  omega_e: ModalityWeights;
}

export function stage1_payloadRouting(
  move: MoveInstance,
  attacker: CombatantState,
): PayloadRouting {
  const W_k = clamp(move.kinetic_share, 0, 1);
  const W_e = 1 - W_k;
  const stats = effectiveStats(attacker);

  // §10.2 + Appendix C: A_k = physical_offense × W_k × (base_power / 55),
  // A_e = special_offense × W_e × (base_power / 55). 55 is the canonical
  // reference base_power used in the Appendix walkthrough. P_k_scale is kept
  // as an extra tuning multiplier (default 1.0).
  const baseScale = move.base_power / 55;
  const P_k = move.base_power * W_k;
  const P_e = move.base_power * W_e;

  return {
    W_k,
    W_e,
    P_k,
    P_e,
    A_k: stats.physical_offense * W_k * baseScale,
    A_e: stats.special_offense * W_e * baseScale,
    omega_k: move.strike_modalities,
    omega_e: move.delivery_modalities,
  };
}

// ---------------------------------------------------------------------------
// Stage 2 — Effective defense (§10.3) + ψ kernel-shaped per-channel D_eff.
// ---------------------------------------------------------------------------

export interface DefenseChannels {
  D_k_con: number;
  D_k_pier: number;
  D_k_slas: number;
  D_e_con: number;
  D_e_pier: number;
  D_e_slas: number;
  D_k_eff: number;
  D_e_eff: number;
  R_k_con: number;
  R_k_pier: number;
  R_k_slas: number;
  R_e_con: number;
  R_e_pier: number;
  R_e_slas: number;
}

function applyDeffCouplings(D: number, accumulators: Record<string, number>, table: Record<string, number>): number {
  let m = 1;
  for (const [k, gamma] of Object.entries(table)) {
    const u = accumulators[k] ?? 0;
    m *= 1 - gamma * Math.tanh(u);
  }
  return D * Math.max(0.05, m);
}

export function stage2_effectiveDefense(
  move: MoveInstance,
  defender: CombatantState,
  payload: PayloadRouting,
  pierceBoost: number,
): DefenseChannels {
  const stats = effectiveStats(defender);
  const accs = defender.accumulators as unknown as Record<string, number>;

  const D_k_eff_base = applyDeffCouplings(
    stats.physical_mitigation,
    accs,
    SC.deff_couplings.physical_mitigation as unknown as Record<string, number>,
  );
  const D_e_eff_base = applyDeffCouplings(
    stats.special_mitigation,
    accs,
    SC.deff_couplings.special_mitigation as unknown as Record<string, number>,
  );

  const m = defender.instance.material_profile;
  const fracture = defender.accumulators.fracture;
  const wetness = defender.accumulators.wetness;

  const psi_k_con = psiConcussive(m);
  const piercingK = piercingResponse(m, fracture, payload.A_k * payload.omega_k.piercing);
  const psi_k_pier = piercingK.psi * (1 - 0.6 * piercingK.P_pen); // penetration trims resistance
  const psi_k_slas = psiSlashing(m, fracture, wetness);

  const psi_e_con = SC.psi_energetic.concussive;
  const psi_e_pier = SC.psi_energetic.piercing;
  const psi_e_slas = SC.psi_energetic.slashing;

  const pierce = clamp(move.pierce + pierceBoost, 0, 1);

  const trim = (lambda_channel: number) =>
    1 - pierce * lambda_channel * SC.pierce.lambda_p;

  const R_k_con = psi_k_con * trim(SC.pierce.lambda_concussive);
  const R_k_pier = psi_k_pier * trim(SC.pierce.lambda_piercing);
  const R_k_slas = psi_k_slas * trim(SC.pierce.lambda_slashing);
  const R_e_con = psi_e_con * trim(SC.pierce.lambda_concussive);
  const R_e_pier = psi_e_pier * trim(SC.pierce.lambda_piercing);
  const R_e_slas = psi_e_slas * trim(SC.pierce.lambda_slashing);

  return {
    D_k_eff: D_k_eff_base,
    D_e_eff: D_e_eff_base,
    D_k_con: D_k_eff_base * R_k_con,
    D_k_pier: D_k_eff_base * R_k_pier,
    D_k_slas: D_k_eff_base * R_k_slas,
    D_e_con: D_e_eff_base * R_e_con,
    D_e_pier: D_e_eff_base * R_e_pier,
    D_e_slas: D_e_eff_base * R_e_slas,
    R_k_con, R_k_pier, R_k_slas,
    R_e_con, R_e_pier, R_e_slas,
  };
}

// ---------------------------------------------------------------------------
// Stage 3 — Core saturation (§10.4)
// ---------------------------------------------------------------------------

export interface SaturationChannels {
  sigma_k_con: number; sigma_k_pier: number; sigma_k_slas: number;
  sigma_e_con: number; sigma_e_pier: number; sigma_e_slas: number;
  D_core_k_con: number; D_core_k_pier: number; D_core_k_slas: number;
  D_core_e_con: number; D_core_e_pier: number; D_core_e_slas: number;
  D_core_kinetic: number; D_core_energetic: number; D_core: number;
}

function saturate(A: number, D: number): number {
  const t = SC.saturation.kappa / (1 + D / Math.max(1e-6, A));
  return 1 - Math.exp(-t);
}

export function stage3_coreSaturation(
  payload: PayloadRouting,
  defense: DefenseChannels,
  S_L: number = 1,
): SaturationChannels {
  // §10.4 + Appendix C: σ uses full A (per side, not split by ω). Per-channel
  // D_core uses full A and per-channel σ; ω blends them at the end.
  const A_k = payload.A_k;
  const A_e = payload.A_e;
  const F = SC.saturation.F_scale;

  const sigma_k_con = saturate(A_k, defense.D_k_con);
  const sigma_k_pier = saturate(A_k, defense.D_k_pier);
  const sigma_k_slas = saturate(A_k, defense.D_k_slas);
  const sigma_e_con = saturate(A_e, defense.D_e_con);
  const sigma_e_pier = saturate(A_e, defense.D_e_pier);
  const sigma_e_slas = saturate(A_e, defense.D_e_slas);

  const D_core_k_con = F * A_k * sigma_k_con * S_L;
  const D_core_k_pier = F * A_k * sigma_k_pier * S_L;
  const D_core_k_slas = F * A_k * sigma_k_slas * S_L;
  const D_core_e_con = F * A_e * sigma_e_con * S_L;
  const D_core_e_pier = F * A_e * sigma_e_pier * S_L;
  const D_core_e_slas = F * A_e * sigma_e_slas * S_L;

  const w_k = payload.omega_k;
  const w_e = payload.omega_e;
  const D_core_kinetic =
    w_k.concussive * D_core_k_con + w_k.piercing * D_core_k_pier + w_k.slashing * D_core_k_slas;
  const D_core_energetic =
    w_e.concussive * D_core_e_con + w_e.piercing * D_core_e_pier + w_e.slashing * D_core_e_slas;

  return {
    sigma_k_con, sigma_k_pier, sigma_k_slas,
    sigma_e_con, sigma_e_pier, sigma_e_slas,
    D_core_k_con, D_core_k_pier, D_core_k_slas,
    D_core_e_con, D_core_e_pier, D_core_e_slas,
    D_core_kinetic, D_core_energetic,
    D_core: D_core_kinetic + D_core_energetic,
  };
}

// ---------------------------------------------------------------------------
// Stage 4 — Outcome budget (§10.5)
// ---------------------------------------------------------------------------

export interface OutcomeBudget {
  alpha: number; beta: number; gamma: number; phi: number; psi: number;
  stamina_budget: number;
  status_guard_delta: number;
  status_amplification: number;
  field_push_budget: number;
  pressure_budget: number;
  S_L: number;
}

export function computeSL(
  attacker: CombatantState,
  defender: CombatantState,
): number {
  const La = attacker.instance.level;
  const Ld = defender.instance.level;
  return (
    (SC.level_scaling.c0 + SC.level_scaling.c1 * La) /
    (SC.level_scaling.c2 + SC.level_scaling.c3 * Ld)
  );
}

export function stage4_outcomeBudget(
  move: MoveInstance,
  saturation: SaturationChannels,
  S_L: number,
): OutcomeBudget {
  // D_core already includes S_L from stage3.
  const D = saturation.D_core;
  return {
    alpha: move.endurance_share,
    beta: move.status_guard_shred_share,
    gamma: move.status_delivery_share,
    phi: move.utility_field_share,
    psi: move.utility_pressure_share,
    stamina_budget: move.endurance_share * D,
    status_guard_delta: move.status_guard_shred_share * D,
    status_amplification: move.status_delivery_share * D,
    field_push_budget: move.utility_field_share * D,
    pressure_budget: move.utility_pressure_share * D,
    S_L,
  };
}

// ---------------------------------------------------------------------------
// Stage 5 — Layer 1 m1 (delegates to layer1_m1.ts)
// ---------------------------------------------------------------------------

export function stage5_layer1_m1(
  move: MoveInstance,
  attacker: CombatantState,
  defender: CombatantState,
  field: FieldState,
): M1Breakdown {
  return computeM1(move, attacker, defender, field);
}

// ---------------------------------------------------------------------------
// Stage 6 — Layer 2 rules (delegates to layer2_rules.ts)
// ---------------------------------------------------------------------------

export function stage6_layer2_rules(
  move: MoveInstance,
  attacker: CombatantState,
  defender: CombatantState,
  field: FieldState,
  combo_detonate_ids: string[] = [],
): Layer2Result {
  return applyLayer2(move, attacker, defender, field, combo_detonate_ids);
}

// ---------------------------------------------------------------------------
// Stage 7 — Layer 3 impulses (queues; integration runs end-of-turn)
// ---------------------------------------------------------------------------

export interface Layer3Result {
  D_after: number;
  accumulator_impulses_queued: Partial<Record<AccumulatorKey, number>>;
}

export function stage7_layer3_impulses(
  move: MoveInstance,
  attacker: CombatantState,
  outcomeBudget: OutcomeBudget,
  m1: M1Breakdown,
  m2: number,
  flat2: number,
  layer2_deltas: Partial<Record<AccumulatorKey, number>>,
): Layer3Result {
  const D_after = outcomeBudget.stamina_budget * m1.m1 * m2 + flat2;

  // Accumulator impulses scaled by attacker coupling, plus Layer 2 deltas.
  const queued: Partial<Record<AccumulatorKey, number>> = {};
  const couplingFactor = 1 + 0.012 * (attacker.instance.core_stats.coupling / 100);

  for (const [k, v] of Object.entries(move.accumulator_impulses) as Array<
    [AccumulatorKey, number]
  >) {
    queued[k] = (queued[k] ?? 0) + v * couplingFactor * m1.m1;
  }
  for (const [k, v] of Object.entries(layer2_deltas) as Array<
    [AccumulatorKey, number]
  >) {
    queued[k] = (queued[k] ?? 0) + (v ?? 0);
  }
  return { D_after, accumulator_impulses_queued: queued };
}

// ---------------------------------------------------------------------------
// Stage 8 — Crit + variance (§10.9)
// ---------------------------------------------------------------------------

export interface CritVariance {
  crit: boolean;
  crit_mult: number;
  variance: number;
  D_post_crit: number;
}

export function stage8_critVariance(
  D_after: number,
  rngSeed: string,
): CritVariance {
  const rng = subRng(rngSeed, "stage8_crit");
  const crit = rng() < SC.crit.p_crit_default;
  const crit_mult = crit ? SC.crit.crit_mult_default : 1;

  const v = (rng() * 2 - 1) * SC.crit.variance_delta;
  const variance = 1 + v;

  return {
    crit,
    crit_mult,
    variance,
    D_post_crit: D_after * crit_mult * variance,
  };
}

// ---------------------------------------------------------------------------
// Stage 9 — Apply (§10.10)
// ---------------------------------------------------------------------------

export interface FinalDamage {
  D_final: number;
  stamina_loss: number;
}

export function stage9_apply(D: number, defenderSMax: number): FinalDamage {
  const D_final = Math.max(0, Math.floor(D));
  const stamina_loss = Math.min(defenderSMax, D_final);
  return { D_final, stamina_loss };
}
