// Creature-related types — §3 of WILDLOOM-MASTER-V2.md

import type { AccumulatorVector } from "./accumulators";
import type { AffinityID, MaterialProfile } from "./affinity";
import type { MoveInstance } from "./moves";
import type { CoreStats, StatusGuard } from "./stats";

/// Per-affinity emphasis weight vector. Sums to 1 across all 12 IDs.
export type AffinityEmphasis = Record<AffinityID, number>;

/// Appearance gene — uniform draw per species; species defines axis count.
/// Stored as a flat number array for serialization simplicity.
export interface AppearanceGene {
  axes: number[];
  lustrous: boolean;
}

export type StanceID = "grounded" | "assault" | "fortified" | "fluid" | "primed";

/// Status condition (§15) — staged on/off state with persistent modifiers.
export interface ActiveStatus {
  status_id: string;
  remaining_turns: number;
  potency?: number;
  source_move_id?: string;
}

/// One creature instance (full payload). Stored as JSONB in `creatures.payload`.
export interface CreatureInstance {
  instance_id: string;
  species_id: string;
  stage: 1 | 2 | 3;
  level: number;
  bond?: number;

  affinity_emphasis: AffinityEmphasis;
  core_stats: CoreStats;
  material_profile: MaterialProfile;
  status_guard: StatusGuard;

  appearance_gene: AppearanceGene;
  passive_ability_ids: string[];

  /// 8 fixed slots. Stage gates which are unlocked at battle-start (§31.6).
  /// Stored on the creature for cross-room consistency; per-battle live state
  /// (current S, active statuses, accumulators) lives in BattleSnapshot.
  move_instances: MoveInstance[];

  /// Endurance ceiling cached from level/stat budget; current S lives in battle state.
  s_max: number;

  resonance_pool: number;
  resonance_allocation: Partial<CoreStats>;

  created_at: string; // ISO
  updated_at: string; // ISO
}

/// Per-battle live state for one combatant. Not persisted; derived at battle start.
export interface CombatantState {
  instance: CreatureInstance;
  current_s: number;
  accumulators: AccumulatorVector;
  active_statuses: ActiveStatus[];
  stance: StanceID;
  cooldowns: Record<string, number>; // move_id -> turns remaining
  combo_charges: Array<{ id: string; turns_left: number }>;
}

/// Snapshot passed to the damage resolver — sealed at action declaration.
export interface BattleSnapshot {
  attacker: CombatantState;
  defender: CombatantState;
  field: FieldState;
  turn: number;
  rng_seed: string; // hex
}

/// §21 Biome / field state.
export interface FieldState {
  biome_id: string;
  ambient_temp: number;
  humidity: number;
  luminance: number;
  acoustic_reflection: number;
  field_flags: string[];
  affinity_power_modifiers: Partial<Record<AffinityID, number>>;
  passive_per_turn: Record<string, number>;
}

export function emptyStatusGuard(): StatusGuard {
  return {
    seared: 1.0,
    hypothermic: 1.0,
    frozen: 1.0,
    waterlogged: 1.0,
    paralyzed: 1.0,
    fractured: 1.0,
    concussed: 1.0,
    bleeding: 1.0,
    corroded: 1.0,
    irradiated: 1.0,
    deafened: 1.0,
    ionized: 1.0,
  };
}
