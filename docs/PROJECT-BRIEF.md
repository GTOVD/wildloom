# Wildloom — project brief

## Vision

- Web-based, real-time multiplayer in shared sessions.
- Host-created private rooms (instances); invite others via link or code.
- Player-driven world: no computer-controlled stand-ins for human rivals; PvP challenges and trading between players.
- One hundred unique creature species lines; each line has three transformational stages (naming TBD — not using “evolve” as a franchise hook).
- **Instances are procedurally unique:** each spawn rolls from **`biome_id` + seed** — **primary elemental emphasis** is biased to that biome (with odds for **neutral primary** and rare off-biome natives); a **secondary affinity** may or may not appear as its **own rarity axis**. **Stats** draw from **tier-gated bell curves** (effective spreads akin to variable IVs — fat middle, rare tails inside each tier). **Abilities** are the mirror image: players **compose** moves from templates with the **same combat hooks** — statuses, accumulator impulses, passive affinity picks — fully bounded per frame, not biome RNG ([`PROCEDURAL-GENERATION.md`](./PROCEDURAL-GENERATION.md), [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md), [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §1).
- **Uncapped levels:** progression mirrors classic handheld pacing for early levels, then shifts to a deliberate super-grind curve; see [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §1. Training budgets stay comparable across stages within a bracket so stage choice stays strategic, not a permanent handicap.
- Combat is **server-authoritative**, with **calculus-flavored** coupling: discrete hits inject impulses into **current endurance** \(S(t)\), while burns, bleeds, and fatigue accumulate as \(\mathrm{d}S/\mathrm{d}t\) ([`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md)). Defeat is **incapacity** when \(S \le 0\)—capacity to fight exhausted—not a separate “HP fatality” metaphor.
- Systems modeling favors **coupled flows and equilibria** so engaged players pick up physical intuition from mechanics—not from homework ([`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md)).

## Legal / branding

Wildloom is an independent work. Do not use trademarks, distinctive character names, or copy-protected assets from other games. Design documents and code should use our own terminology and lore.

## Next steps

- Architecture and phased plan: [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) (updated during planning).
- Gameplay / combat / abilities (single spec): [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md).
- Continuous dynamics & pedagogy: [`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md).
- Post-MVP combat expansion (twelve affinities, biomes, combos): [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md).
- Monorepo layout (`apps/web`, `apps/server`, `packages/*`).
- Protocol and room server MVP.
- Shared battle engine (deterministic, tested).
