// Battle resolution result types — output of packages/combat resolveHit().

import type { AccumulatorKey } from "./accumulators";

export interface HitBreakdown {
  /// Pipeline stage values for replay/audit + Analyst-tier UI.
  p_hit: number;
  hit: boolean;
  miss_reason?: string;

  // Stage 1
  W_k: number;
  W_e: number;
  P_k: number;
  P_e: number;
  A_k: number;
  A_e: number;

  // Stage 2-3 — kinetic channels
  D_k_eff: number;
  R_k_con: number;
  R_k_pier: number;
  R_k_slas: number;
  sigma_k_con: number;
  sigma_k_pier: number;
  sigma_k_slas: number;
  D_core_k_con: number;
  D_core_k_pier: number;
  D_core_k_slas: number;
  D_core_kinetic: number;

  // Stage 2-3 — energetic channels
  D_e_eff: number;
  R_e_con: number;
  R_e_pier: number;
  R_e_slas: number;
  sigma_e_con: number;
  sigma_e_pier: number;
  sigma_e_slas: number;
  D_core_e_con: number;
  D_core_e_pier: number;
  D_core_e_slas: number;
  D_core_energetic: number;

  D_core: number;
  S_L: number;

  // Stage 4
  outcome_budget: {
    alpha: number;
    beta: number;
    gamma: number;
    phi: number;
    psi: number;
  };
  stamina_budget: number;
  status_guard_delta: number;
  status_amplification: number;
  field_push_budget: number;
  pressure_budget: number;

  // Stage 5
  m1: number;
  m1_terms: {
    B_vec: number;
    A_att: number;
    R_def: number;
    stab: number;
    field_gate: number;
  };

  // Stage 6
  m2: number;
  flat2: number;
  rules_fired: string[];

  // Stage 7
  D_after: number;
  accumulator_impulses_applied: Partial<Record<AccumulatorKey, number>>;

  // Stage 8
  crit: boolean;
  crit_mult: number;
  variance: number;

  // Stage 9
  D_final: number;
  stamina_loss: number;
}

export interface HitResult {
  hit: boolean;
  stamina_loss: number;
  breakdown: HitBreakdown;
  /// Status threshold events triggered (resolved end-of-turn).
  triggered_statuses: string[];
}
