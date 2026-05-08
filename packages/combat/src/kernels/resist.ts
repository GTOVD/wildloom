// Per-affinity resist kernel R_def (§12). Encodes "self-resist" and material
// resistance to specific affinities — the asymmetric/diagonal piece that
// the symmetric a_i·a_j cannot capture.

import { affinityStressKernels } from "@wildloom/data";
import type { AffinityID, FieldState, MaterialProfile } from "@wildloom/types";

import { clamp, sigmoid } from "../math";
import { composites } from "../material";

interface ResistEntry {
  form: "sigmoid";
  expr: string;
}

const ENTRIES = affinityStressKernels.resist_kernel as unknown as Record<
  AffinityID,
  ResistEntry
>;

/// Evaluate R_def for a given affinity against the defender's material
/// profile. Returns a value in [0, 1].
export function resistKernel(
  affinity: AffinityID,
  m: MaterialProfile,
  _field: FieldState,
): number {
  // We pre-compute composites and evaluate hand-coded per-affinity formulas
  // that mirror the JSON `expr` strings. Full string-evaluation is overkill
  // for a fixed-set kernel system; we keep the JSON descriptive and the
  // numeric path here authoritative.
  const c = composites(m);

  let raw: number;
  switch (affinity) {
    case "TH": raw = c.thermal_stability * 1.6 - 0.4; break;
    case "CY": raw = (1 - c.thermal_stability) * 1.4 - 0.2; break;
    case "AQ": raw = (1 - m.porosity) * 1.4 - 0.4; break;
    case "GA": raw = (1 - m.conductivity) * 1.5 - 0.3; break;
    case "MI": raw = m.rigidity * 1.2 - 0.1; break;
    case "FL": raw = (1 - m.porosity) * 1.3 - 0.2; break;
    case "AE": raw = m.density * 1.4 - 0.3; break;
    case "LU": raw = m.reflectivity * 2.0 - 0.6; break;
    case "VO": raw = m.density * 1.0 - 0.2; break;
    case "SO": raw = m.acoustic_impedance * 1.6 - 0.3; break;
    case "CR": raw = (1 - m.chemical_reactivity) * 1.3 - 0.2; break;
    case "PL": raw = (1 - m.conductivity) * 0.8 + (1 - m.chemical_reactivity) * 0.4 - 0.3; break;
    default:   raw = 0;
  }
  // Reference ENTRIES so the JSON file remains the ground-truth design surface;
  // future iterations may parse `expr` here.
  void ENTRIES[affinity];
  return clamp(sigmoid(raw * 2.0), 0, 1);
}
