// Core stats (§4) and stat-derived types.

export const CORE_STAT_KEYS = [
  "stamina",
  "physical_offense",
  "physical_mitigation",
  "special_offense",
  "special_mitigation",
  "initiative",
  "precision",
  "recovery",
  "coupling",
] as const;

export type CoreStatKey = (typeof CORE_STAT_KEYS)[number];

export type CoreStats = Record<CoreStatKey, number>;

/// Per-instance status resistance vector — independent surface from special_mitigation (§4).
export type StatusGuard = Record<string, number>;
