/** Pure saturation & scaling — docs/COMBAT-MODEL.md §5, §5.4b */

/** Global tuning — hydrate from scaling_curves.json in production */
export const TUNING = {
  EPSILON: 0.0001,
  /** Pierce fraction scalar λ_p */
  LAMBDA_P: 1.0,
  F_SCALE: 1.0,
  /** Saturation shape κ */
  KAPPA: 2.0,
  CRIT_BONUS: 1.5,
  SPREAD_DELTA: 0.03,
  /** Level scaling S_L coefficients */
  L_SCALING: { c0: 10, c1: 1, c2: 10, c3: 1 },
} as const;

/** Strike modality ψ tuning — §5.4b (replace from JSON in production) */
export const MODALITY_TUNING = {
  /** How much move-level pierce applies per channel */
  PIERCE_SHARE_CONCUSSIVE: 0.15,
  PIERCE_SHARE_PIERCING: 1.0,
  PIERCE_SHARE_SLASHING: 0.35,
  PSI_CLAMP_MIN: 0.55,
  PSI_CLAMP_MAX: 1.45,
  CON_RIG_COEFF: 0.45,
  CON_POR_COEFF: -0.2,
  PIER_RIG_COEFF: 0.55,
  SLASH_RIG_COEFF: 0.25,
  SLASH_POR_COEFF: -0.35,
} as const;

export interface StrikeModalities {
  concussive: number;
  piercing: number;
  slashing: number;
}

export function normalizeStrikeModalities(m?: StrikeModalities): StrikeModalities {
  if (!m) return { concussive: 1, piercing: 0, slashing: 0 };
  const sum = m.concussive + m.piercing + m.slashing;
  if (sum <= 0) return { concussive: 1, piercing: 0, slashing: 0 };
  return {
    concussive: m.concussive / sum,
    piercing: m.piercing / sum,
    slashing: m.slashing / sum,
  };
}

export function calcLevelScaling(lA: number, lD: number): number {
  const { c0, c1, c2, c3 } = TUNING.L_SCALING;
  return (c0 + c1 * lA) / (c2 + c3 * lD);
}

export function calcEffectiveDefense(def: number, pierce: number): number {
  return Math.max(0, def * (1 - pierce * TUNING.LAMBDA_P));
}

/** §5.4b — pierce_move weighted per modality channel */
export function effectiveDefenseForModality(
  resistance: number,
  pierceMove: number,
  pierceChannelShare: number
): number {
  return calcEffectiveDefense(resistance, pierceMove * pierceChannelShare);
}

export function calcStrikeResistanceTriplet(
  bulwarkEff: number,
  mat: { rigidity: number; porosity: number }
): { rCon: number; rPier: number; rSlas: number } {
  const R = mat.rigidity;
  const P = mat.porosity;
  const clampPsi = (v: number) =>
    Math.max(MODALITY_TUNING.PSI_CLAMP_MIN, Math.min(MODALITY_TUNING.PSI_CLAMP_MAX, v));

  const psiCon = clampPsi(
    1 + MODALITY_TUNING.CON_RIG_COEFF * R + MODALITY_TUNING.CON_POR_COEFF * P
  );
  const psiPier = clampPsi(1 + MODALITY_TUNING.PIER_RIG_COEFF * R);
  const psiSlas = clampPsi(
    1 + MODALITY_TUNING.SLASH_RIG_COEFF * R + MODALITY_TUNING.SLASH_POR_COEFF * P
  );

  return {
    rCon: bulwarkEff * psiCon,
    rPier: bulwarkEff * psiPier,
    rSlas: bulwarkEff * psiSlas,
  };
}

export function calcCoreSaturation(
  A: number,
  D: number,
  movePower: number,
  sL: number
): { dCore: number; sigma: number } {
  const x = Math.max(A / TUNING.EPSILON, TUNING.EPSILON);
  const y = D / x;
  const sigma = 1 - Math.exp((-TUNING.KAPPA * 1) / (1 + y));
  const dCore = TUNING.F_SCALE * movePower * sigma * sL;
  return { dCore, sigma };
}
