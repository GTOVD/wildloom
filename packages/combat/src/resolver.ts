// Top-level damage resolver — runs the full §10 pipeline and emits HitResult.

import {
  type AccumulatorKey,
  type BattleSnapshot,
  type HitBreakdown,
  type HitResult,
  type MoveInstance,
} from "@wildloom/types";

import {
  computeSL,
  stage0_hitResolution,
  stage1_payloadRouting,
  stage2_effectiveDefense,
  stage3_coreSaturation,
  stage4_outcomeBudget,
  stage5_layer1_m1,
  stage6_layer2_rules,
  stage7_layer3_impulses,
  stage8_critVariance,
  stage9_apply,
} from "./stages";

export function resolveHit(
  snapshot: BattleSnapshot,
  move: MoveInstance,
  combo_detonate_ids: string[] = [],
): HitResult {
  const { attacker, defender, field, rng_seed } = snapshot;

  // Stage 6 needs to run early so we have an accuracy multiplier for stage 0.
  const layer2 = stage6_layer2_rules(move, attacker, defender, field, combo_detonate_ids);

  const stage0 = stage0_hitResolution(
    move,
    attacker,
    defender,
    rng_seed,
    layer2.accuracy_attacker_mult,
  );

  if (!stage0.hit) {
    const empty_breakdown = makeEmptyBreakdown(move);
    empty_breakdown.p_hit = stage0.p_hit;
    empty_breakdown.hit = false;
    empty_breakdown.miss_reason = stage0.miss_reason ?? "miss";
    empty_breakdown.rules_fired = layer2.rules_fired;
    return {
      hit: false,
      stamina_loss: 0,
      breakdown: empty_breakdown,
      triggered_statuses: [],
    };
  }

  const payload = stage1_payloadRouting(move, attacker);
  const defense = stage2_effectiveDefense(move, defender, payload, layer2.pierce_boost);
  const S_L = computeSL(attacker, defender);
  const saturation = stage3_coreSaturation(payload, defense, S_L);
  const outcomeBudget = stage4_outcomeBudget(move, saturation, S_L);
  const m1 = stage5_layer1_m1(move, attacker, defender, field);

  const layer3 = stage7_layer3_impulses(
    move,
    attacker,
    outcomeBudget,
    m1,
    layer2.m2,
    layer2.flat2,
    layer2.accumulator_deltas,
  );

  const cv = stage8_critVariance(layer3.D_after, rng_seed);
  const finalDmg = stage9_apply(cv.D_post_crit, defender.instance.s_max);

  const breakdown: HitBreakdown = {
    p_hit: stage0.p_hit,
    hit: true,

    W_k: payload.W_k,
    W_e: payload.W_e,
    P_k: payload.P_k,
    P_e: payload.P_e,
    A_k: payload.A_k,
    A_e: payload.A_e,

    D_k_eff: defense.D_k_eff,
    R_k_con: defense.R_k_con,
    R_k_pier: defense.R_k_pier,
    R_k_slas: defense.R_k_slas,
    sigma_k_con: saturation.sigma_k_con,
    sigma_k_pier: saturation.sigma_k_pier,
    sigma_k_slas: saturation.sigma_k_slas,
    D_core_k_con: saturation.D_core_k_con,
    D_core_k_pier: saturation.D_core_k_pier,
    D_core_k_slas: saturation.D_core_k_slas,
    D_core_kinetic: saturation.D_core_kinetic,

    D_e_eff: defense.D_e_eff,
    R_e_con: defense.R_e_con,
    R_e_pier: defense.R_e_pier,
    R_e_slas: defense.R_e_slas,
    sigma_e_con: saturation.sigma_e_con,
    sigma_e_pier: saturation.sigma_e_pier,
    sigma_e_slas: saturation.sigma_e_slas,
    D_core_e_con: saturation.D_core_e_con,
    D_core_e_pier: saturation.D_core_e_pier,
    D_core_e_slas: saturation.D_core_e_slas,
    D_core_energetic: saturation.D_core_energetic,
    D_core: saturation.D_core,
    S_L: outcomeBudget.S_L,

    outcome_budget: {
      alpha: outcomeBudget.alpha,
      beta: outcomeBudget.beta,
      gamma: outcomeBudget.gamma,
      phi: outcomeBudget.phi,
      psi: outcomeBudget.psi,
    },
    stamina_budget: outcomeBudget.stamina_budget,
    status_guard_delta: outcomeBudget.status_guard_delta,
    status_amplification: outcomeBudget.status_amplification,
    field_push_budget: outcomeBudget.field_push_budget,
    pressure_budget: outcomeBudget.pressure_budget,

    m1: m1.m1,
    m1_terms: {
      B_vec: m1.B_vec,
      A_att: m1.A_att,
      R_def: m1.R_def,
      stab: m1.stab,
      field_gate: m1.field_gate,
    },

    m2: layer2.m2,
    flat2: layer2.flat2,
    rules_fired: layer2.rules_fired,

    D_after: layer3.D_after,
    accumulator_impulses_applied: layer3.accumulator_impulses_queued,

    crit: cv.crit,
    crit_mult: cv.crit_mult,
    variance: cv.variance,

    D_final: finalDmg.D_final,
    stamina_loss: finalDmg.stamina_loss,
  };

  return {
    hit: true,
    stamina_loss: finalDmg.stamina_loss,
    breakdown,
    triggered_statuses: layer2.status_forces,
  };
}

function makeEmptyBreakdown(move: MoveInstance): HitBreakdown {
  return {
    p_hit: 0, hit: false,
    W_k: move.kinetic_share, W_e: 1 - move.kinetic_share,
    P_k: 0, P_e: 0, A_k: 0, A_e: 0,
    D_k_eff: 0, D_e_eff: 0,
    R_k_con: 0, R_k_pier: 0, R_k_slas: 0,
    R_e_con: 0, R_e_pier: 0, R_e_slas: 0,
    sigma_k_con: 0, sigma_k_pier: 0, sigma_k_slas: 0,
    sigma_e_con: 0, sigma_e_pier: 0, sigma_e_slas: 0,
    D_core_k_con: 0, D_core_k_pier: 0, D_core_k_slas: 0,
    D_core_e_con: 0, D_core_e_pier: 0, D_core_e_slas: 0,
    D_core_kinetic: 0, D_core_energetic: 0, D_core: 0, S_L: 1,
    outcome_budget: { alpha: 0, beta: 0, gamma: 0, phi: 0, psi: 0 },
    stamina_budget: 0, status_guard_delta: 0, status_amplification: 0,
    field_push_budget: 0, pressure_budget: 0,
    m1: 1, m1_terms: { B_vec: 1, A_att: 0, R_def: 0, stab: 1, field_gate: 1 },
    m2: 1, flat2: 0, rules_fired: [],
    D_after: 0, accumulator_impulses_applied: {},
    crit: false, crit_mult: 1, variance: 1,
    D_final: 0, stamina_loss: 0,
  };
}
