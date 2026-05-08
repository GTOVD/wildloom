// §3.2 — Procedural creature spawn pipeline.

import {
  encounterTiers,
  getBiome,
  getFrame,
  getSpecies,
  growthCurves,
} from "@wildloom/data";
import {
  AFFINITY_IDS,
  CORE_STAT_KEYS,
  MATERIAL_AXES,
  MVP_AFFINITY_IDS,
  type AffinityID,
  type AffinityEmphasis,
  type AppearanceGene,
  type CoreStats,
  type CreatureInstance,
  type MaterialProfile,
  type ModalityWeights,
  type MoveInstance,
} from "@wildloom/types";

import {
  betaSample,
  dirichletSample,
  makeRng,
  normalSample,
  weightedChoice,
} from "./rng";

export type Tier = "common" | "uncommon" | "rare" | "epic" | "legendary";

const TIERS = ["common", "uncommon", "rare", "epic", "legendary"] as const;

/// Roll an encounter tier from the catalog weights.
export function rollTier(rng: () => number): Tier {
  const weights = encounterTiers.tier_weights as Record<Tier, number>;
  return weightedChoice(rng, weights);
}

// ---------------------------------------------------------------------------
// Step 1 — Affinity emphasis (Dirichlet)
// ---------------------------------------------------------------------------

export function rollAffinityEmphasis(
  biomeId: string,
  seed: string,
): AffinityEmphasis {
  const biome = getBiome(biomeId);
  const rng = makeRng(seed, "emphasis", biomeId);

  // 5% neutral chance — emphasis spread evenly across all 12 affinities.
  if (rng() < 0.05) {
    const out = {} as AffinityEmphasis;
    for (const id of AFFINITY_IDS) out[id] = 1 / AFFINITY_IDS.length;
    return out;
  }

  // Sample Dirichlet across MVP affinities only (engine supports 12; spawn
  // pipeline only seeds the 9 MVP). Non-MVP get tiny baseline so emphasis is
  // never strictly zero.
  const ids = MVP_AFFINITY_IDS;
  const alphas = ids.map((id) => biome.dirichlet_alpha[id] ?? 0.1);
  const samples = dirichletSample(rng, alphas);

  const emphasis = {} as AffinityEmphasis;
  for (const id of AFFINITY_IDS) emphasis[id] = 0;
  for (let i = 0; i < ids.length; i++) emphasis[ids[i]!] = samples[i]!;
  return emphasis;
}

// ---------------------------------------------------------------------------
// Step 2 — Core stat aptitudes (Normal per tier)
// ---------------------------------------------------------------------------

function clipStat(v: number): number {
  return Math.max(encounterTiers.stat_min, Math.min(encounterTiers.stat_max, v));
}

export function rollCoreStats(
  tier: Tier,
  level: number,
  seed: string,
): CoreStats {
  const rng = makeRng(seed, "stats", tier);
  const tierConfig = encounterTiers.tiers[tier] as Record<string, { mu: number; sigma: number }>;

  const stats = {} as CoreStats;
  for (const k of CORE_STAT_KEYS) {
    const c = tierConfig[k]!;
    const z = normalSample(rng);
    const apt = clipStat(c.mu + z * c.sigma);
    // Phase A growth multiplier B(L)
    const ga = growthCurves.phase_a;
    const fGrowth =
      level <= 100
        ? ga.c0 + ga.c1 * level + ga.c2 * level * level
        : phaseB(level);
    stats[k] = Math.round(apt * fGrowth);
  }
  return stats;
}

function phaseB(L: number): number {
  const gb = growthCurves.phase_b;
  const ga = growthCurves.phase_a;
  const baseAt100 = ga.c0 + ga.c1 * 100 + ga.c2 * 100 * 100;
  return baseAt100 + gb.B_cap * Math.tanh(gb.c_b * (L - gb.L_ref) / 100);
}

// ---------------------------------------------------------------------------
// Step 3 — Material profile (Beta)
// ---------------------------------------------------------------------------

export function rollMaterialProfile(
  biomeId: string,
  seed: string,
): MaterialProfile {
  const biome = getBiome(biomeId);
  const rng = makeRng(seed, "material", biomeId);
  const out = {} as MaterialProfile;
  for (const axis of MATERIAL_AXES) {
    const ab = biome.material_beta[axis] ?? [1.5, 1.5];
    out[axis] = clamp01(betaSample(rng, ab[0]!, ab[1]!));
  }
  return out;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// ---------------------------------------------------------------------------
// Step 4 — Appearance gene
// ---------------------------------------------------------------------------

export function rollAppearanceGene(
  speciesId: string,
  seed: string,
): AppearanceGene {
  const sp = getSpecies(speciesId);
  const rng = makeRng(seed, "appearance", speciesId);
  const axes: number[] = [];
  for (let i = 0; i < sp.appearance_axes; i++) axes.push(rng());
  const lustrous = rng() < 1 / 512;
  return { axes, lustrous };
}

// ---------------------------------------------------------------------------
// Step 5 — Move loadout (deterministic by seed; stage-gated)
// ---------------------------------------------------------------------------

export interface MoveLoadoutContext {
  stage: 1 | 2 | 3;
  biomeId: string;
  tier: Tier;
  level: number;
  emphasis: AffinityEmphasis;
}

const FRAMES_BY_CATEGORY: Record<string, string[]> = {
  strike: ["slam", "thrust", "rend", "crush", "impale", "cleave"],
  surge: ["blast", "lance", "burst", "siphon", "prism", "cascade"],
  channel: ["focus_bridge", "plasma_beam", "acid_rain"],
  field: ["heatwave", "deluge", "ionosphere", "permafrost_layer"],
  reactive: ["parried_arc", "repulsion_field", "static_discharge"],
  catalyst: ["frost_mark", "charge_mark", "thermal_brand"],
};

const SLOTS_PER_STAGE: Record<1 | 2 | 3, number> = { 1: 4, 2: 6, 3: 8 };

function dominantAffinity(em: AffinityEmphasis): AffinityID {
  let best: AffinityID = "TH";
  let bestVal = -1;
  for (const id of AFFINITY_IDS) {
    if (em[id] > bestVal) {
      bestVal = em[id];
      best = id;
    }
  }
  return best;
}

function uniformOmega(rng: () => number): ModalityWeights {
  const a = rng();
  const b = rng();
  // Rejection sample inside the simplex via uniform partition.
  const cut = [Math.min(a, b), Math.max(a, b)];
  return {
    concussive: cut[0]!,
    piercing: cut[1]! - cut[0]!,
    slashing: 1 - cut[1]!,
  };
}

export function rollMoveLoadout(
  ctx: MoveLoadoutContext,
  ownerCreatureId: string,
  seed: string,
): MoveInstance[] {
  const slots = SLOTS_PER_STAGE[ctx.stage];
  const moves: MoveInstance[] = [];
  const dom = dominantAffinity(ctx.emphasis);
  const sortedAffinities = [...AFFINITY_IDS].sort((a, b) => ctx.emphasis[b] - ctx.emphasis[a]);
  const second = sortedAffinities[1] ?? "TH";

  // Distribute slots across categories: 2 strikes + 2 surges + (rest)
  const categoryPlan: Array<keyof typeof FRAMES_BY_CATEGORY> =
    ctx.stage === 1
      ? ["strike", "strike", "surge", "surge"]
      : ctx.stage === 2
        ? ["strike", "strike", "surge", "surge", "field", "channel"]
        : ["strike", "strike", "surge", "surge", "field", "channel", "reactive", "catalyst"];

  for (let s = 0; s < slots; s++) {
    const rng = makeRng(seed, "move", ownerCreatureId, s);
    const category = categoryPlan[s] ?? "strike";
    const frames = FRAMES_BY_CATEGORY[category]!;
    const frameId = frames[Math.floor(rng() * frames.length)]!;
    const frame = getFrame(frameId);

    const ks_band = frame.kinetic_share_band;
    const W_k = ks_band[0] + rng() * (ks_band[1] - ks_band[0]);

    const omega_k = frame.default_omega ?? uniformOmega(rng);
    const omega_e = frame.default_omega ?? uniformOmega(rng);

    const bp_band = frame.base_power_band;
    const base_power = Math.round(bp_band[0] + rng() * (bp_band[1] - bp_band[0]));

    const acc_band = frame.accuracy_band;
    const accuracy = acc_band[0] + rng() * (acc_band[1] - acc_band[0]);

    const pierce_band = frame.pierce_band;
    const pierce = pierce_band[0] + rng() * (pierce_band[1] - pierce_band[0]);

    const useSecondary = rng() < 0.4 && frame.frame_max_eta > 0;
    const blend_eta = useSecondary ? rng() * frame.frame_max_eta : 0;

    const cooldown_turns = Math.max(
      1,
      Math.round(frame.cooldown_formula.a + frame.cooldown_formula.b * base_power),
    );

    const move: MoveInstance = {
      move_id: `${ownerCreatureId}::slot${s}`,
      frame_id: frameId,
      system_display_title: "", // assembled by caller via @wildloom/combat
      category: frame.category as MoveInstance["category"],
      kinetic_share: W_k,
      strike_modalities: omega_k,
      delivery_modalities: omega_e,
      primary_affinity: dom,
      secondary_affinity: useSecondary ? second : undefined,
      blend_eta,
      base_power,
      accuracy,
      cooldown_turns,
      pierce,
      endurance_share: frame.outcome_default.alpha,
      status_guard_shred_share: frame.outcome_default.beta,
      status_delivery_share: frame.outcome_default.gamma,
      utility_field_share: frame.outcome_default.phi,
      utility_pressure_share: frame.outcome_default.psi,
      status_payloads: [],
      accumulator_impulses: defaultImpulsesForAffinity(dom, base_power),
      passive_hooks: [],
      infusion_coeffs: {},
      priority_tier: frame.priority_tier,
      contact: frame.contact,
      tags: frame.tags,
      patch_hash: "v0",
    };
    if (frame.channel_duration_subticks)
      move.channel_duration = frame.channel_duration_subticks;
    if (frame.ramp_eta) move.ramp_eta = frame.ramp_eta;
    if (frame.reactive_trigger)
      move.reactive_trigger = frame.reactive_trigger as MoveInstance["reactive_trigger"];
    if (frame.catalyst_id) move.catalyst_id = frame.catalyst_id;
    if (frame.catalyst_duration_turns)
      move.catalyst_duration_turns = frame.catalyst_duration_turns;

    moves.push(move);
  }

  return moves;
}

function defaultImpulsesForAffinity(
  aff: AffinityID,
  base_power: number,
): MoveInstance["accumulator_impulses"] {
  const scale = 0.04 * (base_power / 60);
  switch (aff) {
    case "TH": return { heat_load: scale };
    case "CY": return { cryo_load: scale, heat_load: -scale * 0.5 };
    case "AQ": return { wetness: scale };
    case "GA": return { charge_buildup: scale };
    case "MI": return { fracture: scale };
    case "FL": return { bio_resonance: scale };
    case "AE": return { wetness: -scale * 0.5 };
    case "LU": return { radiation: scale * 0.5 };
    case "VO": return { compression: scale };
    case "SO": return { sonic_stress: scale };
    case "CR": return { corrosion: scale };
    case "PL": return { ionization: scale, heat_load: scale * 0.5 };
    default: return {};
  }
}

// ---------------------------------------------------------------------------
// Step 6 — Passive abilities (per species pool)
// ---------------------------------------------------------------------------

export function rollPassives(
  speciesId: string,
  stage: 1 | 2 | 3,
  seed: string,
): string[] {
  const sp = getSpecies(speciesId);
  const rng = makeRng(seed, "passives", speciesId);
  const count = stage; // §16: 1 at S1, 2 at S2, 3 at S3
  const pool = [...sp.ability_pool];
  const picked: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    picked.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  return picked;
}

// ---------------------------------------------------------------------------
// Composite: spawn a full CreatureInstance
// ---------------------------------------------------------------------------

export interface SpawnContext {
  speciesId: string;
  biomeId: string;
  tier?: Tier;
  level?: number;
  stage?: 1 | 2 | 3;
  seed: string;
}

let SPAWN_COUNTER = 0;

export function spawnCreature(ctx: SpawnContext): CreatureInstance {
  const rng = makeRng(ctx.seed, "spawn", ctx.speciesId);
  const tier = ctx.tier ?? rollTier(rng);
  const level = ctx.level ?? Math.floor(2 + rng() * 8); // 2-9
  const stage = ctx.stage ?? 1;

  const emphasis = rollAffinityEmphasis(ctx.biomeId, ctx.seed);
  const stats = rollCoreStats(tier, level, ctx.seed);
  const material = rollMaterialProfile(ctx.biomeId, ctx.seed);
  const appearance = rollAppearanceGene(ctx.speciesId, ctx.seed);
  const passives = rollPassives(ctx.speciesId, stage, ctx.seed);
  const instance_id = `c_${++SPAWN_COUNTER}_${ctx.seed.slice(0, 6)}`;

  const moves = rollMoveLoadout(
    { stage, biomeId: ctx.biomeId, tier, level, emphasis },
    instance_id,
    ctx.seed,
  );

  const s_max = Math.round(stats.stamina * 1.2);
  const now = new Date().toISOString();

  return {
    instance_id,
    species_id: ctx.speciesId,
    stage,
    level,
    affinity_emphasis: emphasis,
    core_stats: stats,
    material_profile: material,
    status_guard: defaultStatusGuard(),
    appearance_gene: appearance,
    passive_ability_ids: passives,
    move_instances: moves,
    s_max,
    resonance_pool: 0,
    resonance_allocation: {},
    created_at: now,
    updated_at: now,
  };
}

function defaultStatusGuard(): Record<string, number> {
  return {
    seared: 1, hypothermic: 1, frozen: 1, waterlogged: 1, paralyzed: 1,
    fractured: 1, concussed: 1, bleeding: 1, corroded: 1, irradiated: 1,
    deafened: 1, ionized: 1,
  };
}
