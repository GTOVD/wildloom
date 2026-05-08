// Test fixtures for combat tests — minimal builders.

import {
  AFFINITY_IDS,
  emptyAccumulators,
  emptyStatusGuard,
  type AffinityID,
  type AffinityEmphasis,
  type CombatantState,
  type CoreStats,
  type CreatureInstance,
  type FieldState,
  type MaterialProfile,
  type MoveInstance,
} from "@wildloom/types";

export function makeStats(overrides: Partial<CoreStats> = {}): CoreStats {
  return {
    stamina: 100,
    physical_offense: 100,
    physical_mitigation: 100,
    special_offense: 100,
    special_mitigation: 100,
    initiative: 100,
    precision: 100,
    recovery: 100,
    coupling: 100,
    ...overrides,
  };
}

export function makeMaterial(overrides: Partial<MaterialProfile> = {}): MaterialProfile {
  return {
    thermal_mass: 0.5,
    conductivity: 0.5,
    rigidity: 0.5,
    porosity: 0.5,
    polarity: 0.5,
    density: 0.5,
    elasticity: 0.5,
    reflectivity: 0.5,
    acoustic_impedance: 0.5,
    chemical_reactivity: 0.5,
    magnetization: 0.5,
    permeability: 0.5,
    ...overrides,
  };
}

export function makeEmphasis(weights: Partial<Record<AffinityID, number>>): AffinityEmphasis {
  const out = {} as AffinityEmphasis;
  for (const id of AFFINITY_IDS) out[id] = 0;
  let total = 0;
  for (const [id, v] of Object.entries(weights)) {
    out[id as AffinityID] = v ?? 0;
    total += v ?? 0;
  }
  // Normalize.
  if (total > 0) {
    for (const id of AFFINITY_IDS) out[id] /= total;
  }
  return out;
}

let CREATURE_COUNTER = 0;
export function makeCreature(opts: {
  speciesId?: string;
  level?: number;
  stage?: 1 | 2 | 3;
  stats?: Partial<CoreStats>;
  material?: Partial<MaterialProfile>;
  emphasis: Partial<Record<AffinityID, number>>;
  s_max?: number;
}): CreatureInstance {
  return {
    instance_id: `creature_${++CREATURE_COUNTER}`,
    species_id: opts.speciesId ?? "001",
    stage: opts.stage ?? 2,
    level: opts.level ?? 28,
    affinity_emphasis: makeEmphasis(opts.emphasis),
    core_stats: makeStats(opts.stats),
    material_profile: makeMaterial(opts.material),
    status_guard: emptyStatusGuard(),
    appearance_gene: { axes: [0.5, 0.5, 0.5, 0.5, 0.5], lustrous: false },
    passive_ability_ids: [],
    move_instances: [],
    s_max: opts.s_max ?? 200,
    resonance_pool: 0,
    resonance_allocation: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function makeCombatant(creature: CreatureInstance): CombatantState {
  return {
    instance: creature,
    current_s: creature.s_max,
    accumulators: emptyAccumulators(),
    active_statuses: [],
    stance: "grounded",
    cooldowns: {},
    combo_charges: [],
  };
}

let MOVE_COUNTER = 0;
export function makeMove(overrides: Partial<MoveInstance> = {}): MoveInstance {
  return {
    move_id: `move_${++MOVE_COUNTER}`,
    frame_id: "blast",
    system_display_title: "Test Move",
    category: "surge",

    kinetic_share: 0.15,
    strike_modalities: { concussive: 0.0, piercing: 0.0, slashing: 1.0 },
    delivery_modalities: { concussive: 0.1, piercing: 0.7, slashing: 0.2 },

    primary_affinity: "TH",
    blend_eta: 0.0,

    base_power: 55,
    accuracy: 95,
    cooldown_turns: 1,
    pierce: 0.25,

    endurance_share: 0.85,
    status_guard_shred_share: 0.10,
    status_delivery_share: 0.05,
    utility_field_share: 0.0,
    utility_pressure_share: 0.0,

    status_payloads: [],
    accumulator_impulses: { heat_load: 0.04, fracture: 0.03 },
    passive_hooks: [],
    infusion_coeffs: {},

    priority_tier: 0,
    contact: false,
    tags: ["surge"],
    patch_hash: "test",
    ...overrides,
  };
}

export function makeField(overrides: Partial<FieldState> = {}): FieldState {
  return {
    biome_id: "neutral_arena",
    ambient_temp: 20,
    humidity: 0.5,
    luminance: 0.5,
    acoustic_reflection: 0.5,
    field_flags: [],
    affinity_power_modifiers: {},
    passive_per_turn: {},
    ...overrides,
  };
}
