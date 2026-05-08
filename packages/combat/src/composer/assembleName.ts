// Deterministic display-title assembly per §8.4.

import { AFFINITY_DISPLAY_NAME, type AffinityID, type MoveInstance } from "@wildloom/types";
import { getFrame } from "@wildloom/data";

const MODALITY_PREFIX: Record<string, string> = {
  concussive: "Crushing",
  piercing: "Piercing",
  slashing: "Rending",
};

const CATEGORY_SUFFIX: Record<string, string> = {
  strike: "",
  surge: "Surge",
  true: "True",
  field: "Field",
  reactive: "Counter",
  channel: "Channel",
  resonance: "Resonance",
  catalyst: "Brand",
};

export function assembleDisplayName(move: MoveInstance): string {
  const frame = getFrame(move.frame_id);

  const parts: string[] = [];

  // 1. Affinity tag (unless non-elemental)
  if (move.primary_affinity) {
    let aff = AFFINITY_DISPLAY_NAME[move.primary_affinity];
    if (move.secondary_affinity && move.blend_eta >= 0.20) {
      aff = `${aff}-${AFFINITY_DISPLAY_NAME[move.secondary_affinity]}`;
    }
    parts.push(aff);
  }

  // 2. Dominant modality prefix (if very lopsided)
  const omega = move.kinetic_share > 0.5 ? move.strike_modalities : move.delivery_modalities;
  let domKey: string | null = null;
  let domVal = 0;
  for (const k of ["concussive", "piercing", "slashing"] as const) {
    if (omega[k] > domVal) {
      domVal = omega[k];
      domKey = k;
    }
  }
  if (domKey && domVal > 0.7) {
    parts.push(MODALITY_PREFIX[domKey] ?? "");
  }

  // 3. Frame display seed
  parts.push(frame.display_seed);

  // 4. Category suffix
  const suffix = CATEGORY_SUFFIX[move.category];
  if (suffix) parts.push(suffix);

  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
