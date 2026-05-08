// Concussive ψ kernel (§11.1) — bulk stress / impulse transfer.

import { scalingCurves } from "@wildloom/data";
import type { MaterialProfile } from "@wildloom/types";

import { clamp } from "../math";

const CFG = scalingCurves.psi_kinetic.concussive;

/// ψ_c(M) = 1 + α1·rigidity − α2·porosity − α3·thermal_mass.
/// Bounded to [0.5, 1.5] when applied (master doc §11.1).
export function psiConcussive(m: MaterialProfile): number {
  const raw =
    1 +
    CFG.alpha1_rigidity * m.rigidity -
    CFG.alpha2_porosity * m.porosity -
    CFG.alpha3_thermal_mass * m.thermal_mass;
  return clamp(raw, 0.5, 1.5);
}
