/** Domain types for Wildloom combat resolution — see docs/COMBAT-MODEL.md */

export type Affinity = string;

export type MoveCategory = 'strike' | 'surge' | 'true';

export interface CoreStats {
  vitality: number;
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
  /** Fraction in [0, 1] — ignores part of opposing defense */
  pierce: number;
  damage_kind: 'hp' | 'status' | 'utility';
  /** 0–100 optional; if omitted treat as automatic hit */
  accuracy?: number;
}

export interface BattleContext {
  ambient_temp: number;
  humidity: number;
  terrain_id: string;
  /** Deterministic PRNG stream consumer — server-owned */
  rng: () => number;
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
}

export interface HitResult {
  hit: boolean;
  damage_hp: number;
  breakdown: DamageBreakdown;
}
