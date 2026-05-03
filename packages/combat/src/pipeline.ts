/**
 * Damage pipeline Layers 1–3 ordering — docs/COMBAT-MODEL.md §5.
 * Stubs: chart + reaction rules hydrate from JSON/YAML artifacts.
 */

import type { BattleContext, Combatant, DamageBreakdown, HitResult, Move } from './types.js';
import {
  MODALITY_TUNING,
  TUNING,
  calcCoreSaturation,
  calcEffectiveDefense,
  calcLevelScaling,
  calcStrikeResistanceTriplet,
  effectiveDefenseForModality,
  normalizeStrikeModalities,
} from './math.js';

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

function computeStrikeDCore(
  attacker: Combatant,
  defender: Combatant,
  move: Move,
  D_raw: number,
  S_L: number
): Pick<DamageBreakdown, 'D_core' | 'sigma' | 'modalities'> {
  const A = attacker.stats_eff.might;

  if (move.strike_modalities === undefined) {
    const D_eff = calcEffectiveDefense(D_raw, move.pierce);
    const { dCore, sigma } = calcCoreSaturation(A, D_eff, move.base_power, S_L);
    return { D_core: dCore, sigma };
  }

  const ω = normalizeStrikeModalities(move.strike_modalities);
  const { rCon, rPier, rSlas } = calcStrikeResistanceTriplet(D_raw, defender.materials);

  const D_con = effectiveDefenseForModality(
    rCon,
    move.pierce,
    MODALITY_TUNING.PIERCE_SHARE_CONCUSSIVE
  );
  const D_pier = effectiveDefenseForModality(
    rPier,
    move.pierce,
    MODALITY_TUNING.PIERCE_SHARE_PIERCING
  );
  const D_slas = effectiveDefenseForModality(
    rSlas,
    move.pierce,
    MODALITY_TUNING.PIERCE_SHARE_SLASHING
  );

  const cC = calcCoreSaturation(A, D_con, move.base_power, S_L);
  const cP = calcCoreSaturation(A, D_pier, move.base_power, S_L);
  const cS = calcCoreSaturation(A, D_slas, move.base_power, S_L);

  const D_core =
    ω.concussive * cC.dCore + ω.piercing * cP.dCore + ω.slashing * cS.dCore;
  const sigma =
    ω.concussive * cC.sigma + ω.piercing * cP.sigma + ω.slashing * cS.sigma;

  return {
    D_core,
    sigma,
    modalities: {
      omega_c: ω.concussive,
      omega_p: ω.piercing,
      omega_s: ω.slashing,
      sigma_c: cC.sigma,
      sigma_p: cP.sigma,
      sigma_s: cS.sigma,
      d_core_c: cC.dCore,
      d_core_p: cP.dCore,
      d_core_s: cS.dCore,
    },
  };
}

export function resolveHit(
  attacker: Combatant,
  defender: Combatant,
  move: Move,
  ctx: BattleContext
): HitResult {
  if (move.damage_kind !== 'endurance') {
    return { hit: true, stamina_loss: 0, breakdown: { ...ZERO_BREAKDOWN } };
  }

  const p_hit = move.accuracy !== undefined ? move.accuracy / 100 : 1;
  if (ctx.rng() > p_hit) {
    return { hit: false, stamina_loss: 0, breakdown: { ...ZERO_BREAKDOWN } };
  }

  if (move.category === 'true') {
    return resolveTrueDamage(move, ctx);
  }

  let D_core: number;
  let sigma: number;
  let modalities: DamageBreakdown['modalities'];

  const S_L = calcLevelScaling(attacker.level, defender.level);

  if (move.category === 'strike') {
    let D_raw = defender.stats_eff.bulwark;
    const fracture = defender.accumulators.fracture ?? 0;
    D_raw *= 1 - FRACTURE_DEFENSE_GAMMA * Math.tanh(fracture);

    const sc = computeStrikeDCore(attacker, defender, move, D_raw, S_L);
    D_core = sc.D_core;
    sigma = sc.sigma;
    modalities = sc.modalities;
  } else {
    const D_raw = defender.stats_eff.ward;
    const A = attacker.stats_eff.insight;
    const D_eff = calcEffectiveDefense(D_raw, move.pierce);
    const core = calcCoreSaturation(A, D_eff, move.base_power, S_L);
    D_core = core.dCore;
    sigma = core.sigma;
    modalities = undefined;
  }

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
  const stamina_loss = Math.max(0, Math.floor(D_final_raw));

  return {
    hit: true,
    stamina_loss,
    breakdown: {
      S_L,
      sigma,
      D_core,
      m1: m1_final,
      m2,
      flat2,
      crit_mult,
      spread,
      modalities,
    },
  };
}

function resolveTrueDamage(move: Move, ctx: BattleContext): HitResult {
  const spread = ctx.rng() * 2 * TUNING.SPREAD_DELTA - TUNING.SPREAD_DELTA;
  const stamina_loss = Math.max(0, Math.floor(move.base_power * (1 + spread)));
  return {
    hit: true,
    stamina_loss,
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
