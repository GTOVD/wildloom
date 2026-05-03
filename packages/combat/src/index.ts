export type {
  Affinity,
  BattleContext,
  Combatant,
  CoreStats,
  DamageBreakdown,
  HitResult,
  MaterialProfile,
  ModalHitBreakdown,
  Move,
  MoveCategory,
  StrikeModalities,
} from './types.js';

export {
  MODALITY_TUNING,
  TUNING,
  calcCoreSaturation,
  calcEffectiveDefense,
  calcLevelScaling,
  calcStrikeResistanceTriplet,
  coreSaturationDefenseLogElasticity,
  coreSaturationOffenseLogElasticity,
  effectiveDefenseForModality,
  expectedDamageMeanBeforeFloor,
  normalizeStrikeModalities,
} from './math.js';
export {
  evaluateReactionRules,
  lookupAffinityChart,
  resolveHit,
} from './pipeline.js';
