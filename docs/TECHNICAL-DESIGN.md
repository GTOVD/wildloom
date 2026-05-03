# Wildloom — technical design (planning)

**Status:** Planning document. Additions and revisions land here until implementation kickoff. Treat sections marked **Open decision** as unresolved.

**Related:** [`PROJECT-BRIEF.md`](./PROJECT-BRIEF.md) — vision and guardrails.

---

## Executive summary

Wildloom is a large, multi-subsystem game: sessions, world sync, combat authority, economy/trading, creature design, and progression. Shipping everything as one monolith is acceptable **if phased**: deliver a battle- and trade-correct, small-map MVP before a full open world.

---

## 1. Product slice

### Session model

- **Rooms** = lightweight game servers: host creates a room, shares code/link, friends join.
- Each room runs an **authoritative server simulation**; clients focus on prediction and rendering.

### World

- Grid-and-routes inspired **feel** at a high level: NPC-less social layer — other players are real entities.
- **Start small:** one region / few maps so networking and tooling do not become the bottleneck.

### Creatures

- **100** unique species lines; each line has **3 stages** (working names: e.g. morph → ascension → zenith — finalize naming outside franchise-adjacent terms).
- “Exclusive” can mean limited cosmetic variants, seasonal distribution, or per-room spawns — **design choice later**.

### Progression

- **Max level 100.**
- Avoid a mandatory power cliff for advancing stages.
- **Suggested clean design:**
  - One **global effective power budget** per level B(L): same total “area under the curve” for every trainer at level 100.
  - **Stage** controls how that budget is **split** (stat spread, typings, move pool, passives), **not** a larger budget.
  - Late-game viability comes from **training, moves, team composition, items** — not “you stayed stage 1 so you lose.”

---

## 2. Tech stack (recommended default)

| Layer | Choice | Role |
|--------|--------|------|
| Client | TypeScript + React (or Svelte) | UI, menus, trade, party; fast iteration |
| Map / sprites | Phaser 3 or PixiJS (TS) | Tilemaps, animation, camera; battle VFX optional in Phase 2 |
| Real-time | WebSocket (single TCP; binary messages optional later) | Positions, battles, trades |
| Game server | Node 22 + TypeScript | Same language as client for shared combat formulas and types |
| Room / process model | One OS process per room (Docker/K8s later), **or** multi-room in one process with strict isolation | MVP: single process, many rooms — private instances without 100 VMs on day one |
| Database | PostgreSQL | Accounts, characters, creatures, trade log, audit |
| Cache / presence | Redis (optional at MVP) | Room discovery, session tokens, rate limits |
| Auth | OAuth + invite codes (e.g. Auth.js / Clerk + short room codes) | Friends join; guest mode possible later |
| Deploy | Fly.io, Railway, or small VPS | Web + WebSocket on same host initially |

**Why this stack:** One TypeScript codebase can share `packages/combat`, `packages/protocol`, `packages/creatures` between browser and server so core simulation is **not** implemented twice (a common source of bugs in MMO-like games).

### Alternatives (trade-offs)

| Option | Notes |
|--------|--------|
| **Colyseus (TS)** | Faster room boilerplate; slightly more abstraction; still reasonable |
| **Phoenix (Elixir)** | Excellent for many concurrent rooms; loses trivial TS sharing unless you duplicate logic or use WASM/ports |
| **Godot / Unity Web** | Strong game feel; heavier pipeline; weaker web-first hosting story unless committed |

**Recommendation:** TS full-stack + Phaser or Pixi unless a native client is an explicit goal later.

---

## 3. Modules to build

1. **Protocol** — message schemas: connect, move, encounter, battle action, trade offer, chat (optional).
2. **Room server** — tick loop (e.g. 10–20 Hz simulation), interest management (who sees whom), anti-cheat (server validates movement).
3. **World state** — tiles, collisions, spawns (species, rarity), interactables.
4. **Encounter model** — wild encounters optional; **PvP:** propose → accept → battle instance.
5. **Battle engine** — deterministic, server-authoritative, seedable RNG for replays and debugging.
6. **Creature model** — species, stage, level, EV/IV-like knobs or a cleaner training vector, moves, held item.
7. **Trading** — two-phase commit (offer → confirm) + server journal so duplication exploits are not possible.
8. **Persistence** — party, box, progression; reconnect to same room or global lobby (**product decision**).
9. **Content pipeline** — data files (JSON/CSV) for 100×3 species stats/moves; tooling to validate balance.

---

## 4. “Calculus-based” damage (realistic, still shippable)

“Calculus” here does **not** mean obscure math for its own sake. It means **continuous, nonlinear, coupled dynamics** instead of a single linear formula everywhere.

### Patterns that map well to implementation

- **Mitigation as a smooth asymptote:** effective damage uses saturation-style curves (e.g. piercing versus mitigation approaching a ceiling) so armor does not behave like a straight percentage forever.
- **DoT / erosion:** damage-over-time as rate-of-change of HP with resist decay; stacking caps defined by equilibrium limits or explicit caps.
- **Stamina / focus:** resources as continuous recovery rate as a function of current resource and stress; actions spend discrete chunks with smooth penalties near empty — not staircase “you have 0 MP.”
- **Multi-hit and exposure:** total damage over a combo approximates an integral of a hit curve modulated by how enemy posture / stagger builds smoothly.
- **Balance tooling:** expose sensitivities (e.g. impact of +1 defense on win rate) via Monte Carlo or closed-form approximations so tuning uses gradients, not only trial and error.

All of this runs as **numeric integration per tick** on the server — no symbolic computer algebra required in production.

### Fairness vs nostalgia

Classic JRPG “feel” often conflicts with extreme realism (sleep RNG, crit spikes, legacy quirks). **Decide early** which behaviors are homage versus modern fairness.

---

## 5. Stage fairness (competitive at any stage)

**Concrete pattern:**

- Define total stat budget B(L) at level L (same for all stages).
- Each stage s in {1, 2, 3} has a base spread vector w_s over core stats (HP, physical offense/defense, special offense/defense, speed — exact schema TBD) that **sums to 1**.
- **Training** adds a small tunable vector t with a **hard global cap** so at L = 100 everyone reaches the same B(100); only **distribution** differs.
- **Stage advancement** (rename in lore) unlocks moves/passives and may shift w_s, but **must not** increase B(L). Competitive meta = **roles**, not raw tier.

---

## 6. Suggested build order

1. Monorepo (`apps/web`, `apps/server`, `packages/*`) + shared types.
2. Room join + movement sync on a tiny test map (no creatures yet).
3. Battle engine v0 (1v1, shared TS, unit tests, logging).
4. Creatures v0 (~10 species × 3 stages) to prove budget math.
5. PvP challenge flow wired to battle.
6. Trading v0 (items/creatures with server journal).
7. Scale content toward 100 species; expand world.

---

## 7. Risks (named up front)

| Risk | Mitigation |
|------|------------|
| **Scope** | Full nostalgic-scale map + 100 species + polish is multi-year indie scope; phased MVP reduces burnout |
| **Cheating** | Anything client-trusted (damage, catches) will be exploited; **server is law** |
| **Fairness vs nostalgia** | True era quirks are often unfair; decide deliberately |

---

## 8. Open decisions

### 8.1 Room model (blocking for written spec)

Choose one to lock into design before heavy implementation:

- **A) Separate worlds per room** — host’s own spawns, economy, “season,” isolated progression surface per room.
- **B) Shared world + instanced battles** — one coherent overworld (or shared ruleset); battles/trades instanced.
- **Hybrid** — short written variant if neither pure option fits.

**Recorded choice:** _pending — add decision + rationale here when chosen._

### 8.2 Other (backlog)

- Persistence: reconnect to **same room** vs **global lobby** default.
- Guest accounts vs accounts-required for join.
- Redis from day one vs add when discovery/rate limits hurt.

---

## Document changelog

| Date | Change |
|------|--------|
| Planning | Initial consolidation from planning chat into repo |
