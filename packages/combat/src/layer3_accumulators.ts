// Layer 3 — accumulator ODE integrator (§14).
//
// Fixed N=10 explicit Euler subticks per turn. Threshold events for status
// transitions are emitted post-integration.

import { accumulators as ACCS, getAccumulatorConfig } from "@wildloom/data";
import {
  ACCUMULATOR_KEYS,
  type AccumulatorKey,
  type AccumulatorVector,
  type CombatantState,
  type FieldState,
} from "@wildloom/types";

import { clamp } from "./math";

const SUBTICKS = (ACCS as { subticks_per_turn?: number }).subticks_per_turn ?? 10;
const ALPHA_R = (ACCS as { recovery_alpha?: number }).recovery_alpha ?? 0.012;
const BETA_C = (ACCS as { coupling_beta?: number }).coupling_beta ?? 0.012;

/// Apply one accumulator impulse, scaled by attacker coupling.
export function applyImpulse(
  acc: AccumulatorVector,
  key: AccumulatorKey,
  delta: number,
  attackerCouplingStat: number,
): number {
  const cfg = getAccumulatorConfig(key);
  const scaled = delta * (1 + BETA_C * (attackerCouplingStat / 100));
  const next = clamp(acc[key] + scaled, cfg.u_min, cfg.u_max);
  acc[key] = next;
  return scaled;
}

/// Integrate accumulators across one turn (N=10 subticks). Field-driven decay
/// + ambient rebalancing per §14.2.
export function integrateTurn(
  combatant: CombatantState,
  field: FieldState,
): { triggered_statuses: string[]; cleared_statuses: string[] } {
  const triggered: string[] = [];
  const cleared: string[] = [];

  const recoveryStat = combatant.instance.core_stats.recovery;
  const recoveryFactor = 1 + ALPHA_R * (recoveryStat / 100);

  const dt = 1 / SUBTICKS;

  for (let n = 0; n < SUBTICKS; n++) {
    for (const key of ACCUMULATOR_KEYS) {
      const cfg = getAccumulatorConfig(key);
      const u = combatant.accumulators[key];
      let du_dt = 0;

      // Generic decay — reuse whichever decay constant the accumulator has.
      const lambda =
        cfg.decay_lambda ??
        cfg.decay_mu ??
        cfg.decay_delta ??
        cfg.decay_rho ??
        cfg.decay_eps ??
        0;
      du_dt -= lambda * u;

      if (cfg.decay_to_ambient) {
        const ambient = (field.ambient_temp - 20) / 80; // crude normalization
        du_dt += (ambient - u) / Math.max(1, cfg.tau_ref ?? 8) * recoveryFactor;
      }

      // Field passive contributions
      const passive = field.passive_per_turn?.[key] ?? 0;
      du_dt += passive / SUBTICKS;

      const next = clamp(u + dt * du_dt, cfg.u_min, cfg.u_max);
      combatant.accumulators[key] = next;
    }
  }

  // Threshold check
  for (const key of ACCUMULATOR_KEYS) {
    const cfg = getAccumulatorConfig(key);
    const u = combatant.accumulators[key];

    if (cfg.status_gate && cfg.threshold !== undefined) {
      const gate = cfg.status_gate;
      const isAbove = u >= cfg.threshold;
      const has = combatant.active_statuses.some((s) => s.status_id === gate);
      if (isAbove && !has) triggered.push(gate);
      if (!isAbove && has && u <= cfg.threshold * 0.5) cleared.push(gate);
    }
    if (cfg.status_gates) {
      for (const g of cfg.status_gates) {
        const has = combatant.active_statuses.some((s) => s.status_id === g.id);
        const isMet =
          (g.above !== undefined && u >= g.above) ||
          (g.below !== undefined && u <= g.below);
        if (isMet && !has) triggered.push(g.id);
      }
    }
  }

  return { triggered_statuses: triggered, cleared_statuses: cleared };
}
