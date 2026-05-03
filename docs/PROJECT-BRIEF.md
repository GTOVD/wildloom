# Wildloom — project brief

## Vision

- Web-based, real-time multiplayer in shared sessions.
- Host-created private rooms (instances); invite others via link or code.
- Player-driven world: no computer-controlled stand-ins for human rivals; PvP challenges and trading between players.
- One hundred unique creature species lines; each line has three transformational stages (naming TBD — not using “evolve” as a franchise hook).
- **Uncapped levels:** progression mirrors classic handheld pacing for early levels, then shifts to a deliberate super-grind curve; see [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §1. Training budgets stay comparable across stages within a bracket so stage choice stays strategic, not a permanent handicap.
- Combat modeling favors rich, continuous mathematics (nonlinear mitigation, resource flows, integrative effects) with server authority.

## Legal / branding

Wildloom is an independent work. Do not use trademarks, distinctive character names, or copy-protected assets from other games. Design documents and code should use our own terminology and lore.

## Next steps

- Architecture and phased plan: [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) (updated during planning).
- Combat attributes / damage pipeline: [`COMBAT-MODEL.md`](./COMBAT-MODEL.md).
- Affinities, field, resonance progression: [`GAMEPLAY-SYSTEMS.md`](./GAMEPLAY-SYSTEMS.md).
- Monorepo layout (`apps/web`, `apps/server`, `packages/*`).
- Protocol and room server MVP.
- Shared battle engine (deterministic, tested).
