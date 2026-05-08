// Composite material shortcuts (§5).

import type { MaterialProfile } from "@wildloom/types";

export interface MaterialComposites {
  acoustic_transparency: number;
  fracture_susceptibility: number;
  corrosion_rate: number;
  ionic_coupling: number;
  thermal_stability: number;
  void_compression_factor: number;
  yield_strength: number;
  cohesion_no_fracture: number; // (1 - porosity); user must combine with fracture
}

export function composites(m: MaterialProfile): MaterialComposites {
  return {
    acoustic_transparency: 1 - m.acoustic_impedance,
    fracture_susceptibility: m.rigidity * (1 - m.elasticity),
    corrosion_rate: m.chemical_reactivity * m.porosity,
    ionic_coupling: m.conductivity * m.polarity,
    thermal_stability: m.thermal_mass * (1 - m.conductivity),
    void_compression_factor: m.density * (1 - m.elasticity),
    yield_strength: 0.6 * m.rigidity + 0.4 * m.density,
    cohesion_no_fracture: 1 - m.porosity,
  };
}

export function cohesion(m: MaterialProfile, fracture: number): number {
  return (1 - m.porosity) * (1 - fracture);
}
