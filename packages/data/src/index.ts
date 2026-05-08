// @wildloom/data — typed accessors over the balance JSON artifacts.
//
// All JSON files live under packages/data/json/ and are imported via Node's
// JSON module support. Bundlers (Next.js, esbuild, tsx) all support this.

import type {
  AccumulatorKey,
  AffinityID,
  AffinityVector,
  ModalityWeights,
  StanceID,
} from "@wildloom/types";

import affinityChart from "../json/affinity_chart_chart0.json" with { type: "json" };
import affinityVectors from "../json/affinity_vectors.json" with { type: "json" };
import scalingCurves from "../json/scaling_curves.json" with { type: "json" };
import accumulators from "../json/accumulators.json" with { type: "json" };
import statusConditions from "../json/status_conditions.json" with { type: "json" };
import materialAxes from "../json/material_axes.json" with { type: "json" };
import combos from "../json/combos.json" with { type: "json" };
import biomes from "../json/biomes.json" with { type: "json" };
import stances from "../json/stances.json" with { type: "json" };
import growthCurves from "../json/growth_curves.json" with { type: "json" };
import encounterTiers from "../json/encounter_tiers.json" with { type: "json" };
import affinityStressKernels from "../json/affinity_stress_kernels.json" with { type: "json" };
import reactionRules from "../json/reaction_rules.json" with { type: "json" };
import frames from "../json/frames.json" with { type: "json" };
import speciesCatalog from "../json/species_catalog.json" with { type: "json" };

export {
  affinityChart,
  affinityVectors,
  scalingCurves,
  accumulators,
  statusConditions,
  materialAxes,
  combos,
  biomes,
  stances,
  growthCurves,
  encounterTiers,
  affinityStressKernels,
  reactionRules,
  frames,
  speciesCatalog,
};

// ---------------------------------------------------------------------------
// Convenience accessors
// ---------------------------------------------------------------------------

const VECS = affinityVectors.vectors as Record<AffinityID, number[]>;

export function getAffinityVector(id: AffinityID): AffinityVector {
  const v = VECS[id];
  if (!v || v.length !== 6) {
    throw new Error(`Missing/invalid affinity vector for ${id}`);
  }
  return v as unknown as AffinityVector;
}

export function dotVec(a: AffinityVector, b: AffinityVector): number {
  let s = 0;
  for (let i = 0; i < 6; i++) s += a[i]! * b[i]!;
  return s;
}

export function getBiomeIds(): string[] {
  return Object.keys(biomes.biomes);
}

export type BiomeId = string;

export interface BiomeConfig {
  display_name: string;
  tile_color_hex: string;
  ambient_temp: number;
  humidity: number;
  luminance: number;
  acoustic_reflection: number;
  passive_per_turn: Record<string, number>;
  affinity_modifiers: Partial<Record<AffinityID, number>>;
  dirichlet_alpha: Record<AffinityID, number>;
  material_beta: Record<string, [number, number]>;
  encounter_rate: number;
}

export function getBiome(id: BiomeId): BiomeConfig {
  const b = (biomes.biomes as unknown as Record<string, BiomeConfig>)[id];
  if (!b) throw new Error(`Unknown biome: ${id}`);
  return b;
}

export interface FrameConfig {
  category: string;
  display_seed: string;
  default_omega: ModalityWeights | null;
  kinetic_share_band: [number, number];
  base_power_band: [number, number];
  accuracy_band: [number, number];
  pierce_band: [number, number];
  frame_max_eta: number;
  outcome_default: {
    alpha: number;
    beta: number;
    gamma: number;
    phi: number;
    psi: number;
  };
  priority_tier: number;
  contact: boolean;
  tags: string[];
  cooldown_formula: { a: number; b: number };
  channel_duration_subticks?: number;
  ramp_eta?: number;
  reactive_trigger?: string;
  catalyst_id?: string;
  catalyst_duration_turns?: number;
}

export function getFrame(id: string): FrameConfig {
  const f = (frames.frames as unknown as Record<string, FrameConfig>)[id];
  if (!f) throw new Error(`Unknown frame: ${id}`);
  return f;
}

export function getFrameIds(): string[] {
  return Object.keys(frames.frames);
}

export interface StanceConfig {
  physical_offense: number;
  physical_mitigation: number;
  special_offense: number;
  special_mitigation: number;
  initiative: number;
  precision: number;
  extras: Record<string, unknown>;
}

export function getStance(id: StanceID): StanceConfig {
  const s = (stances as unknown as Record<string, StanceConfig>)[id];
  if (!s) throw new Error(`Unknown stance: ${id}`);
  return s;
}

export interface AccumulatorConfig {
  phase: "MVP" | "P2";
  u_min: number;
  u_max: number;
  decay_lambda?: number;
  decay_tau?: number;
  decay_mu?: number;
  decay_delta?: number;
  decay_rho?: number;
  decay_eps?: number;
  tau_ref?: number;
  tau_base?: number;
  build_eta?: number;
  build_zeta?: number;
  build_xi?: number;
  build_alpha?: number;
  build_phi?: number;
  build_gamma?: number;
  build_rho?: number;
  alpha_TH?: number;
  decay_to_ambient?: boolean;
  humidity_uptake_beta1?: number;
  drying_beta2?: number;
  aero_purge_beta3?: number;
  clot_gamma?: number;
  leak_rho?: number;
  wet_leak_amp?: number;
  status_gate?: string;
  threshold?: number;
  status_gates?: { id: string; above?: number; below?: number }[];
}

export function getAccumulatorConfig(key: AccumulatorKey): AccumulatorConfig {
  const cfg = (accumulators.registry as unknown as Record<string, AccumulatorConfig>)[key];
  if (!cfg) throw new Error(`Unknown accumulator: ${key}`);
  return cfg;
}

export interface SpeciesConfig {
  id: string;
  stage_names: [string, string, string];
  appearance_axes: number;
  ability_pool: string[];
  mvp_spawn?: boolean;
}

export function getSpecies(id: string): SpeciesConfig {
  const s = (speciesCatalog.species as unknown as SpeciesConfig[]).find(
    (x) => x.id === id,
  );
  if (!s) throw new Error(`Unknown species: ${id}`);
  return s;
}

export function getMvpSpawnSpecies(): SpeciesConfig[] {
  return (speciesCatalog.species as unknown as SpeciesConfig[]).filter(
    (s) => s.mvp_spawn === true,
  );
}

export const DATA_PACKAGE_VERSION = "0.1.0";
