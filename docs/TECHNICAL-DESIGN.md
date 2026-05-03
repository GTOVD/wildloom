# Wildloom — technical design (planning)

**Status:** Planning document. Additions and revisions land here until implementation kickoff. Treat sections marked **Open decision** as unresolved.

**Related:** [`PROJECT-BRIEF.md`](./PROJECT-BRIEF.md) — vision and guardrails. [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) — attributes, affinities, damage pipeline (implementable spec).

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

### Progression (infinite levels, two-phase curve)

- **No fixed level cap.** Levels run **1 → ∞**, but growth is tuned so power and labels do not “run away” casually to absurd numbers without a **modern MMO–style grind** past the early curve.
- **Phase A — levels 1–100:** Stat and XP curves intentionally mirror the **classic handheld RPG feel** (fast early steps, recognizable pacing). Constants live in data so we can match nostalgia closely without copying proprietary formulas verbatim.
- **Phase B — level 101+:** Switch to a **separate XP and budget curve**: sharply increasing XP-per-level (super grind), and **strongly diminishing marginal gains** to effective power per level so competitive parity stays reachable and numerical explosion is avoided.
  - **Budget sketch:** `B(L)` for `L ≤ 100` follows the classic segment. For `L > 100`, add something like `B(L) = B(100) + B_extra(L)` where `B_extra` grows slowly—e.g. approaches an asymptote (`B_extra(∞) ≤ B_cap`) or scales like `α · log(L)` / fractional powers—so level 10 000 is achievable only for deeply committed players and does not obsolete sub-cap play in the same bracket without deliberate tuning.
  - **Why two curves:** Keeps the first hundred hours familiar; everything after reads as “expansion/MMO endgame” without an unnatural cliff if blending is smoothed at 99–101 (crossfade XP and first derivative where possible).

### World difficulty & session scaling (host / party)

Rooms expose **scaling metadata** chosen at creation (and optionally adjusted before first combat):

- **Host anchor:** Creator picks a **target level band** (e.g. “around level 40”) or a **floor/ceiling** for wild encounters and rewards.
- **Party aggregate:** Optional mode: world difficulty derives from a **combined party statistic**—e.g. weighted mean/median of active players’ levels, trimmed mean to resist one outlier smurf, or “expectation profile” the host saves for their regular group.
- **Join rules:** Players browsing rooms see **recommended level** / band; mismatched joins remain allowed but **optional sidekick scaling** (temporary stat clamps or encounter skew) can be a later feature—document as **Open decision** per room type.

**Technical sketch:**

- `RoomConfig` persisted server-side: `{ scalingMode, levelAnchor, bandWidth?, aggregateWeights?, allowMismatch }`.
- Spawn tables and loot rolls keyed off **effective room level** `L_room = f(hostAnchor, partyLevels, config)`—pure function, deterministic given roster snapshot at encounter roll.
- Sync `L_room` (or tier enum) to clients for UI only; **never** trust client for encounter outcomes.

### Progression vs fairness (summary)

- Avoid mandatory power cliffs between stages; infinite levels coexist with **bracketed competitive play** (matchmaking / tournaments can snap to level bands or use standardized test leagues—design layer on top of raw `L`).

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
3. **World state** — tiles, collisions, spawns (species, rarity), interactables; **room scaling config** feeding spawn resolution.
4. **Encounter model** — wild encounters optional; **PvP:** propose → accept → battle instance.
5. **Battle engine** — deterministic, server-authoritative, seedable RNG for replays and debugging; **element/reaction resolver** — see [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) for full pipeline (Layers 1–3, stats, formulas).
6. **Creature model** — species, stage, level, deep stat blocks, training vectors, moves, held item, **appearance seed**, **variant flags** (e.g. lustrous/coveted).
7. **Trading** — two-phase commit (offer → confirm) + server journal so duplication exploits are not possible.
8. **Persistence** — party, box, progression; reconnect to same room or global lobby (**product decision**).
9. **Content pipeline** — data files for species × stages, moves, **reaction rules**, balance tooling (Monte Carlo / sensitivities).
10. **Rendering hooks** — shader/uniform pipeline driven by **appearance genes** (§7); optional quality tiers for low-end devices.

---

## 4. “Calculus-based” damage (realistic, still shippable)

“Calculus” here does **not** mean obscure math for its own sake. It means **continuous, nonlinear, coupled dynamics** instead of a single linear formula everywhere—aligned with players who enjoy **systems they can reason about** (rates, equilibria, thresholds) rather than opaque buckets.

### Patterns that map well to implementation

- **Mitigation as a smooth asymptote:** effective damage uses saturation-style curves (e.g. piercing versus mitigation approaching a ceiling) so armor does not behave like a straight percentage forever.
- **DoT / erosion:** damage-over-time as rate-of-change of HP with resist decay; stacking caps defined by equilibrium limits or explicit caps.
- **Stamina / focus:** resources as continuous recovery rate as a function of current resource and stress; actions spend discrete chunks with smooth penalties near empty — not staircase “you have 0 MP.”
- **Multi-hit and exposure:** total damage over a combo approximates an integral of a hit curve modulated by how enemy posture / stagger builds smoothly.
- **Balance tooling:** expose sensitivities (e.g. impact of +1 defense on win rate) via Monte Carlo or closed-form approximations so tuning uses gradients, not only trial and error.

All of this runs as **numeric integration per tick** on the server — no symbolic computer algebra required in production.

At **very high progression tiers**, mechanics can deliberately expose **coupled variables** (thermal stress ↔ material phase ↔ fracture thresholds) so mastery looks like **physical intuition**—but the **HUD and tutorials** must still teach the metaphor; formal physics education should never be a hard gate to enjoy the game.

### Fairness vs nostalgia

Classic JRPG “feel” often conflicts with extreme realism (sleep RNG, crit spikes, legacy quirks). **Decide early** which behaviors are homage versus modern fairness.

---

## 5. Stage fairness (competitive at any stage, infinite `L`)

**Concrete pattern:**

- Define total stat budget **B(L)** per level for every creature (same formula for all stages at a given `L`; see §1 for two-phase behavior).
- Each stage **s ∈ {1, 2, 3}** has a base spread vector **w_s** over core stats (HP, physical offense/defense, special offense/defense, speed — exact schema TBD) that **sums to 1**.
- **Training** adds a bounded tunable vector **t(L)** with **diminishing returns** as `L` grows so incremental grind shifts distribution without breaking brackets—caps may be **percentage of B(L)** rather than a single L=100 constant.
- **Stage advancement** unlocks moves/passives and may shift **w_s**, but **must not** grant a hidden higher **B(L)** than another creature at the same level/stage ruleset. Competitive meta = **roles and reactions**, not raw tier.

---

## 6. Elements, materials, and “physics-forward” interactions

**Design intent:** Take the clarity of **modern type charts** (predictable strengths/weaknesses, readable counters) and enrich them with **secondary axes** so interactions feel like **material science + elementary physics metaphors**—heat vs insulation, thermal shock on brittle surfaces, conductivity when wet, etc.—without requiring the player to solve textbook problems mid-turn.

### Representation (technical)

- **Primary affinity:** Small discrete set (order-of tens), tuned for readability.
- **Secondary tags / latent traits:** Bitmask or vector (e.g. `thermal_mass`, `rigidity`, `porosity`, `charge_buildup`) used by the resolver—not shown in full to new players; surfaced via inspect UI / lore / battle log over time.
- **Battle state fields:** Ambient and local scalars the resolver reads (`wetness`, `temperature_delta`, `stress_fracture_accumulator`, …) updated by moves, weather, terrain, and reactions.

### Resolver shape

**Detailed ordering, formulas, stacking policy, and data artifacts:** [`COMBAT-MODEL.md`](./COMBAT-MODEL.md).

Summary:

- **Layer 1:** Familiar effectiveness multipliers (baseline balance).
- **Layer 2:** **Predicate → modifier** rules authored in data: e.g. `(affinity_fire ∧ surface_glass ∧ ΔT > θ) ⇒ bonus_shatter_chance + armor_saturation drop`.
- **Layer 3:** Small integrated **ODE-ish accumulators** for cracks, corrosion, overheating—reuse patterns from §4.

**Tooling:** Rule linter detects contradictions and unreachable predicates; simulation fuzz tests random pairings for exploding damage variance.

**Legal/branding:** All affinity names, charts, and metaphors are original—no reuse of proprietary type sets.

---

## 7. Procedural appearance & collector rarity

### Continuous visual identity (“pattern genes”)

Inspired by **inspectable float ranges** in competitive shooters (every instance visually unique on a slider), each creature instance carries an **`appearanceGene`**: a compact seed or vector of **normalized coefficients** in `[0, 1]` (and optional small integers for discrete markings).

- **Client:** Maps coefficients to **shader uniforms / sprite layering**—hue twist, pattern phase offset, scale of stripes, speckle density, edge wear, glow intensity—within species-safe clamps so silhouettes remain readable.
- **Server:** Stores **seed + species + checksum** only; validation rejects out-of-range crafted payloads.
- **Bandwidth:** Do not stream textures per battle; regenerate locally from gene + species asset pack.

### Starter uniqueness & lustrous variants

- **Starters:** Roll **exclusive gene pools** or **narrowed distributions** at account creation so two starters of the same species remain visually distinguishable at a glance; rarity tier communicated in UI without paywall assumptions.
- **Lustrous / coveted variants** (working name—avoid “shiny” as generic trademark-adjacent slang in shipped marketing): **low probability** on generation or encounter; separate bitflag + optional gene overrides for particle/lighting presets; **full audit trail** in DB for trades.

### Collector layer

- Pokédex-style completion metrics can track **gene archetypes** seen, not only species—supports “super collector” endgame without forcing combat advantage.

---

## 8. Suggested build order

1. Monorepo (`apps/web`, `apps/server`, `packages/*`) + shared types.
2. Room join + movement sync on a tiny test map (no creatures yet); **`RoomConfig` stub** for future scaling.
3. Battle engine v0 (1v1, shared TS, unit tests, logging); **simple affinity chart** before full reaction engine.
4. Creatures v0 (~10 species × 3 stages); **`appearanceGene` persisted** with placeholder rendering.
5. PvP challenge flow wired to battle.
6. Trading v0 (items/creatures with server journal); **lustrous flag + gene** in trade payloads.
7. **Reaction rules v1** layered on battle engine; balance fuzz tests.
8. **Post-100 curve** + room scaling on encounters; content toward 100 species; world expansion.

---

## 9. Risks (named up front)

| Risk | Mitigation |
|------|------------|
| **Scope** | Full nostalgic-scale map + 100 species + polish is multi-year indie scope; phased MVP reduces burnout |
| **Cheating** | Anything client-trusted (damage, catches, genes) will be exploited; **server is law** |
| **Fairness vs nostalgia** | True era quirks are often unfair; decide deliberately |
| **Infinite progression power creep** | Asymptotic or log-like **B(L)** past 100 + bracketed PvP; constant Monte Carlo monitoring |
| **Reaction combinatorics** | Rule explosion → keep predicates scoped; automated linter + fuzz |
| **Accessibility vs depth** | Layer tutorials / “simple view” affinity chart; advanced inspect for trait stacks |
| **Visual noise from genes** | Hard clamps per species; team readability reviews |

---

## 10. Open decisions

### 10.1 Room model (blocking for written spec)

Choose one to lock into design before heavy implementation:

- **A) Separate worlds per room** — host’s own spawns, economy, “season,” isolated progression surface per room.
- **B) Shared world + instanced battles** — one coherent overworld (or shared ruleset); battles/trades instanced.
- **Hybrid** — short written variant if neither pure option fits.

**Recorded choice:** _pending — add decision + rationale here when chosen._

### 10.2 Other (backlog)

- Persistence: reconnect to **same room** vs **global lobby** default.
- Guest accounts vs accounts-required for join.
- Redis from day one vs add when discovery/rate limits hurt.
- **Sidekick / mismatch scaling** when a level 200 joins a level 30 room—normalize stats vs authenticity of difficulty?
- Exact **lustrous** rate and tradability rules (market effects).

---

## Document changelog

| Date | Change |
|------|--------|
| Planning | Initial consolidation from planning chat into repo |
| 2026-05-03 | Infinite progression; room/party scaling; physics-forward elements; procedural genes; build order + risks; linked [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) (attributes, Layers 1–3 damage pipeline) |
