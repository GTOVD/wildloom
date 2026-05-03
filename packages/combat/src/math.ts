/** Pure saturation & scaling — docs/COMBAT-MODEL.md §5 */

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

export function calcLevelScaling(lA: number, lD: number): number {
  const { c0, c1, c2, c3 } = TUNING.L_SCALING;
  return (c0 + c1 * lA) / (c2 + c3 * lD);
}

export function calcEffectiveDefense(def: number, pierce: number): number {
  return Math.max(0, def * (1 - pierce * TUNING.LAMBDA_P));
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
