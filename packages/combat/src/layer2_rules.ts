// Layer 2 — smooth predicate rules (§13).
//
// Each rule's `smooth_mult` evaluates as Π_i (1 + α·tanh((x_i − x0)/Δ)) when
// gate predicates pass. Rules also emit accumulator deltas, status forces,
// pierce boosts, and free-form side-effect tags for the BattleRoom to apply.

import { reactionRules } from "@wildloom/data";
import {
  type AccumulatorKey,
  type CombatantState,
  type FieldState,
  type MoveInstance,
} from "@wildloom/types";

import { smoothMult } from "./math";

interface SmoothFactor {
  var: string;
  x0: number;
  scale: number;
}

interface AccumulatorDeltaSpec {
  base: number;
  tanh: { var: string; x0: number; scale: number; amp: number } | null;
}

interface RuleDef {
  rule_id: string;
  priority: number;
  when: {
    tag_on_move?: string;
    affinity_on_move?: string;
    modality_dominant?: "concussive" | "piercing" | "slashing";
    combo_detonate_id?: string;
    flag_on_target?: string;
    no_stance?: string;
    ranges?: Array<{
      kind: "accumulator" | "material";
      key: string;
      min?: number;
      max?: number;
    }>;
    any?: Array<{
      kind: "accumulator" | "material";
      key: string;
      min?: number;
      max?: number;
    }>;
  };
  smooth_mult?: { alpha: number; factors: SmoothFactor[] };
  accumulator_delta?: Record<string, AccumulatorDeltaSpec>;
  side_effect?: Record<string, number>;
  stat_debuff?: Record<string, number>;
  stat_debuff_target?: Record<string, number>;
  accuracy_mult_attacker?: { form?: string; alpha: number; x0: number; scale: number };
  pierce_boost?: { form: string };
  log_line?: string;
  force_status?: string;
  consume_combo_charge?: string;
}

const RULES = (reactionRules.rules as unknown as RuleDef[]).slice().sort(
  (a, b) => a.priority - b.priority,
);

export interface Layer2Result {
  m2: number;
  flat2: number;
  rules_fired: string[];
  accumulator_deltas: Partial<Record<AccumulatorKey, number>>;
  pierce_boost: number;
  accuracy_attacker_mult: number;
  stat_debuffs_target: Record<string, number>;
  status_forces: string[];
  consume_combo_charges: string[];
  log_lines: string[];
}

function getAccumulator(
  c: CombatantState,
  key: string,
): number {
  return (c.accumulators as unknown as Record<string, number>)[key] ?? 0;
}

function getMaterial(
  c: CombatantState,
  key: string,
): number {
  return (c.instance.material_profile as unknown as Record<string, number>)[key] ?? 0;
}

function dominantOmega(move: MoveInstance): "concussive" | "piercing" | "slashing" | null {
  const w = move.kinetic_share > 0.5 ? move.strike_modalities : move.delivery_modalities;
  let max = 0;
  let key: "concussive" | "piercing" | "slashing" | null = null;
  for (const k of ["concussive", "piercing", "slashing"] as const) {
    if (w[k] > max) {
      max = w[k];
      key = k;
    }
  }
  return max > 0.65 ? key : null;
}

export function applyLayer2(
  move: MoveInstance,
  attacker: CombatantState,
  defender: CombatantState,
  _field: FieldState,
  combo_detonate_ids: string[] = [],
): Layer2Result {
  const result: Layer2Result = {
    m2: 1,
    flat2: 0,
    rules_fired: [],
    accumulator_deltas: {},
    pierce_boost: 0,
    accuracy_attacker_mult: 1,
    stat_debuffs_target: {},
    status_forces: [],
    consume_combo_charges: [],
    log_lines: [],
  };

  for (const rule of RULES) {
    if (!checkPredicate(rule, move, attacker, defender, combo_detonate_ids)) continue;

    if (rule.smooth_mult) {
      const factors = rule.smooth_mult.factors.map((f) => ({
        x: resolveVar(f.var, defender),
        x0: f.x0,
        scale: f.scale,
      }));
      result.m2 *= smoothMult(rule.smooth_mult.alpha, factors);
    }

    if (rule.accumulator_delta) {
      for (const [key, spec] of Object.entries(rule.accumulator_delta)) {
        let delta = spec.base;
        if (spec.tanh) {
          const x = resolveVar(spec.tanh.var, defender);
          delta += spec.tanh.amp * Math.tanh((x - spec.tanh.x0) / Math.max(1e-6, spec.tanh.scale));
        }
        result.accumulator_deltas[key as AccumulatorKey] =
          (result.accumulator_deltas[key as AccumulatorKey] ?? 0) + delta;
      }
    }

    if (rule.side_effect?.pierce_special) {
      result.pierce_boost = Math.max(result.pierce_boost, rule.side_effect.pierce_special);
    }

    if (rule.accuracy_mult_attacker) {
      const acc = rule.accuracy_mult_attacker;
      const x = resolveVar("concussion", defender);
      const m = 1 - acc.alpha * Math.tanh((x - acc.x0) / Math.max(1e-6, acc.scale));
      result.accuracy_attacker_mult *= Math.max(0.1, m);
    }

    if (rule.pierce_boost?.form) {
      const x = resolveVar("fracture", defender);
      const boost = 0.20 * Math.tanh((x - 0.55) / 0.12);
      result.pierce_boost = Math.max(result.pierce_boost, Math.max(0, boost));
    }

    if (rule.stat_debuff_target) {
      for (const [k, v] of Object.entries(rule.stat_debuff_target)) {
        result.stat_debuffs_target[k] = (result.stat_debuffs_target[k] ?? 1) * v;
      }
    }

    if (rule.force_status) result.status_forces.push(rule.force_status);
    if (rule.consume_combo_charge)
      result.consume_combo_charges.push(rule.consume_combo_charge);

    if (rule.log_line) result.log_lines.push(rule.log_line);
    result.rules_fired.push(rule.rule_id);

    if (result.rules_fired.length >= 16) break; // §13 cap
  }

  return result;
}

function checkPredicate(
  rule: RuleDef,
  move: MoveInstance,
  attacker: CombatantState,
  defender: CombatantState,
  combo_detonate_ids: string[],
): boolean {
  const w = rule.when;

  if (w.tag_on_move) {
    const matched =
      move.tags?.includes(w.tag_on_move) ||
      (w.tag_on_move === "thermal" && move.primary_affinity === "TH") ||
      (w.tag_on_move === "cryo" && move.primary_affinity === "CY");
    if (!matched) return false;
  }
  if (w.affinity_on_move && move.primary_affinity !== w.affinity_on_move) return false;
  if (w.modality_dominant && dominantOmega(move) !== w.modality_dominant) return false;
  if (w.combo_detonate_id && !combo_detonate_ids.includes(w.combo_detonate_id))
    return false;
  if (w.no_stance && attacker.stance === w.no_stance) return false;

  if (w.ranges) {
    for (const r of w.ranges) {
      const x =
        r.kind === "accumulator"
          ? getAccumulator(defender, r.key)
          : getMaterial(defender, r.key);
      if (r.min !== undefined && x < r.min) return false;
      if (r.max !== undefined && x > r.max) return false;
    }
  }
  if (w.any) {
    let ok = false;
    for (const r of w.any) {
      const x =
        r.kind === "accumulator"
          ? getAccumulator(defender, r.key)
          : getMaterial(defender, r.key);
      if (
        (r.min === undefined || x >= r.min) &&
        (r.max === undefined || x <= r.max)
      ) {
        ok = true;
        break;
      }
    }
    if (!ok) return false;
  }

  return true;
}

function resolveVar(name: string, defender: CombatantState): number {
  // Variables are resolved against defender state (accumulators or materials).
  const m = defender.instance.material_profile as unknown as Record<string, number>;
  if (name in m) return m[name]!;
  return getAccumulator(defender, name);
}
