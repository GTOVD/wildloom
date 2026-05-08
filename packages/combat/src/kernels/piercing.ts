// Piercing ψ kernel (§11.2) — yield-stress penetration.

import { scalingCurves } from "@wildloom/data";
import type { MaterialProfile } from "@wildloom/types";

import { clamp, sigmoid } from "../math";
import { composites } from "../material";

const CFG = scalingCurves.psi_kinetic.piercing;

export interface PiercingResponse {
  /// Sigmoid penetration probability (no threshold cliff).
  P_pen: number;
  /// Material kernel ψ_p(M) — bounded [min, max].
  psi: number;
  /// Yield strength threshold derived from material.
  Y: number;
}

/// Compute piercing response. `applied_pressure` corresponds to A_k·ω_p
/// (no division by area — area constants fold into k_p sharpness).
export function piercingResponse(
  m: MaterialProfile,
  fracture: number,
  applied_pressure: number,
): PiercingResponse {
  const Y = CFG.Y_lambda1_rigidity * m.rigidity + CFG.Y_lambda2_density * m.density;
  // Smooth penetration probability.
  const P_pen = sigmoid(CFG.k_p_sharpness * (applied_pressure / Math.max(1, Y) - 1));
  const c = composites(m);
  // Higher fracture progressively collapses the resistance.
  const psi_raw =
    0.5 + 0.5 * c.yield_strength * (1 - Math.tanh(2 * fracture));
  return { P_pen, Y, psi: clamp(psi_raw, CFG.min_psi, CFG.max_psi) };
}
