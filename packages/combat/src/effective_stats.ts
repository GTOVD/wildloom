// Effective stats — applies stance multipliers + active status mods.

import { getStance, statusConditions } from "@wildloom/data";
import {
  CORE_STAT_KEYS,
  type CombatantState,
  type CoreStats,
} from "@wildloom/types";

import { clamp } from "./math";

/// Returns {stat: effective_value} after stance + status modifiers.
export function effectiveStats(c: CombatantState): CoreStats {
  const stance = getStance(c.stance);
  const out = {} as CoreStats;

  for (const k of CORE_STAT_KEYS) {
    let v = c.instance.core_stats[k];
    const stanceMult = (stance as unknown as Record<string, number>)[k] ?? 1;
    v *= stanceMult;
    out[k] = v;
  }

  for (const s of c.active_statuses) {
    const cfg = (statusConditions as unknown as Record<
      string,
      { stat_mods?: Partial<Record<string, number>> }
    >)[s.status_id];
    if (!cfg?.stat_mods) continue;
    for (const [k, mult] of Object.entries(cfg.stat_mods)) {
      if (k in out) {
        out[k as keyof CoreStats] *= mult ?? 1;
      }
    }
  }

  // Soft clamp per scaling_curves (avoid runaway compounding).
  for (const k of CORE_STAT_KEYS) {
    out[k] = clamp(out[k], 5, out[k] * 5);
  }

  return out;
}
