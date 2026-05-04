/** Domain types for Wildloom combat resolution — see docs/COMBAT-MODEL.md */

export type Affinity = string;

export type MoveCategory = 'strike' | 'surge' | 'true';

export interface CoreStats {
  /** Endurance capacity — maximum battle pool \(S_{\max}\); see COMBAT-MODEL §2.1 */
  stamina: number;
  /** Strike scaling — physical offense */
  physical_offense: number;
  /** Strike saturation defense — physical mitigation */
  physical_mitigation: number;
  /** Surge scaling — special offense (field / non-contact potency) */
  special_offense: number;
  /** Surge saturation defense — special mitigation */
  special_mitigation: number;
  /** Turn order and tempo hooks — initiative */
  initiative: number;
}

export interface MaterialProfile {
  thermal_mass: number;
  conductivity: number;
  rigidity: number;
  porosity: number;
  polarity: number;
}

export interface StrikeModalities {
  concussive: number;
  piercing: number;
  slashing: number;
}

export interface Combatant {
  id: string;
  level: number;
  primary_affinity: Affinity;
  secondary_affinity?: Affinity;
  species_tags: string[];
  /** Effective stats after staged modifiers */
  stats_eff: CoreStats;
  materials: MaterialProfile;
  /** Layer 3 accumulators e.g. fracture, heat_load */
  accumulators: Record<string, number>;
  /** Per-combatant scalars e.g. wetness */
  scalars: Record<string, number>;
}

export interface Move {
  id: string;
  category: MoveCategory;
  base_power: number;
  /** Chart key + stab hooks — omit or empty when move is non-elemental (neutral Layer 1 baseline). */
  affinity?: Affinity;
  tags: string[];
  /** Fraction in `[0, 1]` — armor bypass; strongest on piercing modality by default */
  pierce: number;
  /** `endurance` — depletes defender's battle stamina pool (legacy docs may say “HP”). */
  damage_kind: 'endurance' | 'status' | 'utility';
  /** 0–100 optional; if omitted treat as automatic hit */
  accuracy?: number;
  /** §5.4b — contact strike delivery mix */
  strike_modalities?: StrikeModalities;
  /** Same ω simplex — surge paths (e.g. Blast) blend blunt vs pierce vs slash into special mitigation */
  delivery_modalities?: StrikeModalities;
  /** From template cooldown_scaling × base_power at equip time (turn scheduler; not read in resolveHit). */
  cooldown_turns?: number;
  /**
   * Planned — hydrated from `attack_templates.catalog.json` customization bands (COMBAT-MODEL §3).
   * Resolver applies after hit confirmation; shape finalized with `status_catalog`.
   */
  status_payloads?: unknown;
  /** Per-event Layer 3 impulses (e.g. on_hit heat_load Δ); see GAMEPLAY-SYSTEMS §2.1. */
  accumulator_impulses?: unknown;
  /** Slot-bound passive affinity ε / stance coupling; optional. */
  passive_hooks?: unknown;
  /** Deterministic composed UI title from frame + build (cache optional). See ATTACK-CATALOG “Dynamic display names”. */
  system_display_title?: string;
  /** Player headline; subtitle still shows system_display_title when both set. */
  move_nickname?: string;
}

export interface BattleContext {
  ambient_temp: number;
  humidity: number;
  terrain_id: string;
  /** Deterministic PRNG stream consumer — server-owned */
  rng: () => number;
}

/** Per-channel audit trail — §5.4b */
export interface ModalHitBreakdown {
  omega_c: number;
  omega_p: number;
  omega_s: number;
  sigma_c: number;
  sigma_p: number;
  sigma_s: number;
  d_core_c: number;
  d_core_p: number;
  d_core_s: number;
}

/** Values aligned with docs/COMBAT-MODEL.md §5 breakdown */
export interface DamageBreakdown {
  S_L: number;
  sigma: number;
  D_core: number;
  m1: number;
  m2: number;
  flat2: number;
  crit_mult: number;
  spread: number;
  modalities?: ModalHitBreakdown;
}

export interface HitResult {
  hit: boolean;
  /** Loss applied to defender's current endurance pool for this resolution step */
  stamina_loss: number;
  breakdown: DamageBreakdown;
}
