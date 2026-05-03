/**
 * Damage pipeline Layers 1–3 ordering — docs/COMBAT-MODEL.md §5.
 * Stubs: chart + reaction rules hydrate from JSON/YAML artifacts.
 */

import type { BattleContext, Combatant, DamageBreakdown, HitResult, Move } from './types.js';
import { TUNING, calcCoreSaturation, calcEffectiveDefense, calcLevelScaling } from './math.js';

const ZERO_BREAKDOWN: DamageBreakdown = {
  S_L: 0,
  sigma: 0,
  D_core: 0,
  m1: 0,
  m2: 0,
  flat2: 0,
  crit_mult: 0,
  spread: 0,
};

/** Layer 3 coupling: fracture reduces effective physical defense (tuning γ). */
const FRACTURE_DEFENSE_GAMMA = 0.2;

export function resolveHit(
  attacker: Combatant,
  defender: Combatant,
  move: Move,
  ctx: BattleContext
): HitResult {
  if (move.damage_kind !== 'hp') {
    return { hit: true, damage_hp: 0, breakdown: { ...ZERO_BREAKDOWN } };
  }

  const p_hit = move.accuracy !== undefined ? move.accuracy / 100 : 1;
  if (ctx.rng() > p_hit) {
    return { hit: false, damage_hp: 0, breakdown: { ...ZERO_BREAKDOWN } };
  }

  if (move.category === 'true') {
    return resolveTrueDamage(move, ctx);
  }

  let A = 0;
  let D_raw = 0;

  if (move.category === 'strike') {
    A = attacker.stats_eff.might;
    D_raw = defender.stats_eff.bulwark;
  } else {
    A = attacker.stats_eff.insight;
    D_raw = defender.stats_eff.ward;
  }

  const fracture = defender.accumulators.fracture ?? 0;
  D_raw *= 1 - FRACTURE_DEFENSE_GAMMA * Math.tanh(fracture);

  const D_eff = calcEffectiveDefense(D_raw, move.pierce);
  const S_L = calcLevelScaling(attacker.level, defender.level);
  const { dCore: D_core, sigma } = calcCoreSaturation(A, D_eff, move.base_power, S_L);

  const m1 = lookupAffinityChart(move.affinity, defender.primary_affinity, defender.secondary_affinity);
  const stab =
    move.affinity === attacker.primary_affinity
      ? 1.15
      : move.affinity === attacker.secondary_affinity
        ? 1.08
        : 1;
  const m1_final = Math.max(0.25, Math.min(m1 * stab, 4.0));

  const { m2, flat2 } = evaluateReactionRules(attacker, defender, move, ctx);

  const D_after_chart = D_core * m1_final * m2 + flat2;

  const isCrit = ctx.rng() < 0.05;
  const crit_mult = isCrit ? TUNING.CRIT_BONUS : 1.0;
  const spread = ctx.rng() * 2 * TUNING.SPREAD_DELTA - TUNING.SPREAD_DELTA;

  const D_final_raw = D_after_chart * crit_mult * (1 + spread);
  const damage_hp = Math.max(0, Math.floor(D_final_raw));

  return {
    hit: true,
    damage_hp,
    breakdown: { S_L, sigma, D_core, m1: m1_final, m2, flat2, crit_mult, spread },
  };
}

function resolveTrueDamage(move: Move, ctx: BattleContext): HitResult {
  const spread = ctx.rng() * 2 * TUNING.SPREAD_DELTA - TUNING.SPREAD_DELTA;
  const damage_hp = Math.max(0, Math.floor(move.base_power * (1 + spread)));
  return {
    hit: true,
    damage_hp,
    breakdown: {
      S_L: 1,
      sigma: 1,
      D_core: move.base_power,
      m1: 1,
      m2: 1,
      flat2: 0,
      crit_mult: 1,
      spread,
    },
  };
}

/** Hydrate from affinity_chart.json */
export function lookupAffinityChart(moveAff: string, defPri: string, defSec?: string): number {
  void moveAff;
  void defPri;
  void defSec;
  return 1.0;
}

/** Hydrate from reaction_rules AST */
export function evaluateReactionRules(
  attacker: Combatant,
  defender: Combatant,
  move: Move,
  ctx: BattleContext
): { m2: number; flat2: number } {
  void attacker;
  void defender;
  void move;
  void ctx;
  return { m2: 1.0, flat2: 0 };
}
