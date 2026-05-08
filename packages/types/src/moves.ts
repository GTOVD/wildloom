// Move-related types — §8 and §9 of WILDLOOM-MASTER-V2.md

import type { AccumulatorKey } from "./accumulators";
import type { AffinityID, ModalityWeights } from "./affinity";

export const MOVE_CATEGORIES = [
  "strike",
  "surge",
  "true",
  "field",
  "reactive",
  "channel",
  "resonance",
  "catalyst",
] as const;

export type MoveCategory = (typeof MOVE_CATEGORIES)[number];

export interface StatusPayload {
  status_id: string;
  proc_chance: number; // [0,1]
  potency: number;
  duration: number; // turns
}

export interface PassiveHook {
  hook_id: string;
  params?: Record<string, number | string | boolean>;
}

export type ReactiveTrigger =
  | "on_hit"
  | "on_hit_contact"
  | "on_hit_special"
  | "on_damage_gt"
  | "on_accumulator_cross";

/// §9 schema — one full move instance.
export interface MoveInstance {
  move_id: string;
  frame_id: string;
  system_display_title: string;
  move_nickname?: string;

  category: MoveCategory;

  /// W_k ∈ [0,1]; W_e = 1 - W_k.
  kinetic_share: number;
  /// ω simplex for the kinetic payload (concussive/piercing/slashing).
  strike_modalities: ModalityWeights;
  /// ω simplex for the energetic payload — analogue geometry routing for W_e.
  delivery_modalities: ModalityWeights;

  primary_affinity?: AffinityID;
  secondary_affinity?: AffinityID;
  blend_eta: number; // [0, frame_max_eta]
  /// Optional advanced multi-fusion: full simplex over all 12 affinities (sums to 1).
  affinity_weights?: Partial<Record<AffinityID, number>>;

  base_power: number;
  accuracy: number; // [0,100]
  cooldown_turns: number;
  pierce: number; // [0, frame_max_pierce]

  /// Outcome budget — must sum to 1.0.
  endurance_share: number; // α
  status_guard_shred_share: number; // β
  status_delivery_share: number; // γ
  utility_field_share: number; // φ
  utility_pressure_share: number; // ψ

  status_payloads: StatusPayload[];
  accumulator_impulses: Partial<Record<AccumulatorKey, number>>;
  passive_hooks: PassiveHook[];
  infusion_coeffs: Record<string, number>;

  channel_duration?: number;
  ramp_eta?: number;
  reactive_trigger?: ReactiveTrigger;
  reactive_condition?: string;
  catalyst_id?: string;
  catalyst_duration_turns?: number;
  combo_detonate?: string;
  combo_bonus_mult?: number;

  priority_tier: number; // [-3, +3]
  contact: boolean;
  tags: string[];
  patch_hash: string;
}
