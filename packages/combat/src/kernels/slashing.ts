// Slashing ψ kernel (§11.3) — shear stress / surface cohesion.

import { scalingCurves } from "@wildloom/data";
import type { MaterialProfile } from "@wildloom/types";

import { clamp } from "../math";

const CFG = scalingCurves.psi_kinetic.slashing;

/// ψ_s(M) base shape, plus wet amplification.
export function psiSlashing(
  m: MaterialProfile,
  fracture: number,
  wetness: number,
): number {
  const base =
    1 +
    CFG.gamma1_porosity * m.porosity +
    CFG.gamma2_fracture * fracture -
    CFG.gamma3_elasticity * m.elasticity;
  const wet =
    1 + CFG.wet_amp_delta * Math.tanh(wetness / Math.max(1e-6, CFG.W_ref));
  return clamp(base * wet, 0.5, 1.6);
}
