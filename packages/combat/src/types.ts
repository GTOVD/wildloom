/** Domain types for Wildloom combat resolution — see docs/COMBAT-MODEL.md */

export type Affinity = string;

export type MoveCategory = 'strike' | 'surge' | 'true';

export interface CoreStats {
  /** Maximum endurance capacity — maps to battle pool size; see COMBAT-MODEL §2.1 */
  stamina: number;
  might: number;
  bulwark: number;
  insight: number;
  ward: number;
  tempo: number;
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
  affinity: Affinity;
  tags: string[];
  /** Fraction in `[0, 1]` — armor bypass; strongest on piercing modality by default */
  pierce: number;
  /** `endurance` — depletes defender's battle stamina pool (legacy docs may say “HP”). */
  damage_kind: 'endurance' | 'status' | 'utility';
  /** 0–100 optional; if omitted treat as automatic hit */
  accuracy?: number;
  /** §5.4b — omit for legacy single-path strike saturation */
  strike_modalities?: StrikeModalities;
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
