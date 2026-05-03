export type {
  Affinity,
  BattleContext,
  Combatant,
  CoreStats,
  DamageBreakdown,
  HitResult,
  MaterialProfile,
  Move,
  MoveCategory,
} from './types.js';

export { TUNING, calcCoreSaturation, calcEffectiveDefense, calcLevelScaling } from './math.js';
export {
  evaluateReactionRules,
  lookupAffinityChart,
  resolveHit,
} from './pipeline.js';
