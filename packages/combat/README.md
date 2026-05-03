# `@wildloom/combat`

Pure, deterministic combat math aligned with [`docs/COMBAT-MODEL.md`](../../docs/COMBAT-MODEL.md).

- **`types.ts`** — immutable snapshot interfaces (`Combatant` with `CoreStats` — `stamina`, `physical_offense`, `physical_mitigation`, `special_offense`, `special_mitigation`, `initiative`; `Move.damage_kind` including `'endurance'`; `HitResult.stamina_loss`, …).
- **`math.ts`** — level scaling, pierce, saturation (`σ`, `D_core`); **`MODALITY_TUNING`**, `calcStrikeResistanceTriplet`, `normalizeStrikeModalities`; **`expectedDamageMeanBeforeFloor`**, **`coreSaturationOffenseLogElasticity`** / **`coreSaturationDefenseLogElasticity`** (§5.8 / §13 expectation & elasticity helpers).
- **`pipeline.ts`** — ordered resolver (`resolveHit`), optional **`strike_modalities`** blend (§5.4b); stubs for chart + reaction rules.

## Usage

```typescript
import { resolveHit, TUNING } from '@wildloom/combat';

const rng = seededRandom(seed); // implement PRNG on server
const ctx = { ambient_temp: 20, humidity: 0.5, terrain_id: 'neutral', rng };
const result = resolveHit(attacker, defender, move, ctx);
// result.stamina_loss — subtract from defender's current endurance pool S
```

Hydrate `lookupAffinityChart` and `evaluateReactionRules` from `affinities.json`, `affinity_chart.json`, and `reaction_rules/*` (see gameplay catalog in [`docs/GAMEPLAY-SYSTEMS.md`](../../docs/GAMEPLAY-SYSTEMS.md)).

## Build

```bash
npm run build -w @wildloom/combat
```
