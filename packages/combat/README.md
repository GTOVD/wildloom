# `@wildloom/combat`

Pure, deterministic combat math aligned with [`docs/COMBAT-MODEL.md`](../../docs/COMBAT-MODEL.md).

- **`types.ts`** — immutable snapshot interfaces (`Combatant` with `CoreStats`; `Move` including optional **`affinity`**, **`strike_modalities`**, **`delivery_modalities`**, **`cooldown_turns`**, and planned **`status_payloads` / `accumulator_impulses` / `passive_hooks`** hydrated from [`attack_templates.catalog.json`](../../data/moves/attack_templates.catalog.json); `HitResult.stamina_loss`, …).
- **`math.ts`** — level scaling, pierce, saturation (`σ`, `D_core`); **`MODALITY_TUNING`**, `calcStrikeResistanceTriplet`, `normalizeStrikeModalities`; **`resolveCooldownTurnsFromPower`** (cooldown vs **`base_power`**); **`expectedDamageMeanBeforeFloor`**, **`coreSaturationOffenseLogElasticity`** / **`coreSaturationDefenseLogElasticity`** (§5.8 / §13).
- **`pipeline.ts`** — `resolveHit`; §5.4b blend on strikes and surges via **`strike_modalities` / `delivery_modalities`**; chart/rules stubbed.

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
