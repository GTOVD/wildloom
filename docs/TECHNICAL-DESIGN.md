# Wildloom — technical design (planning)

**Status:** Planning document. Additions and revisions land here until implementation kickoff. Treat sections marked **Open decision** as unresolved.

**Related:** [`PROJECT-BRIEF.md`](./PROJECT-BRIEF.md) — vision and guardrails. [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) — **single spec** for combat pipeline, affinities, abilities, field/progression. [`PROCEDURAL-GENERATION.md`](./PROCEDURAL-GENERATION.md) — biome-conditioned spawn, neutral-primary and secondary-chip rarity, tier-gated bell-curve aptitudes, composite rarity on instances. [`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md) — continuous dynamics & stealth physics literacy. [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) — twelve-affinity expansion, chart, biomes, combos, extended artifacts.

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

#### Procedural identity (every instance is its own build)

**Intent:** Avoid “same jellyfish, same Galvanic/Aero spread” clones. Wild captures and hatchlings resolve from **`SpawnContext`** — **`biome_id`**, **`seed`**, **`level_band`**, **`ruleset_id`** ([`PROCEDURAL-GENERATION.md`](./PROCEDURAL-GENERATION.md)) — so **core stats**, **extended stats**, **material profiles**, **`affinity_emphasis`**, **appearance genes**, and eventually **learned move loadouts** differ widely even within one species line.

**Biome-forward elemental identity:** Rolled **`affinity_emphasis`** uses **biome-conditioned priors** — the creature’s **primary elemental chip** is *usually* coherent with the biome it spawned in (volcanic skews Thermal, etc.), with **tail odds** for rare off-biome natives and **`p_neutral_primary`** for **no dominant elemental** “wild-type” outcomes.

**Secondary chip & rarity:** **Secondary affinity may be absent or present** — independent stochastic axis that stacks with **aptitude tier**, neutral-primary, and cosmetics for **composite rarity** ([`PROCEDURAL-GENERATION.md`](./PROCEDURAL-GENERATION.md) §3).

**Bell-curve aptitudes:** Nine stats draw from **tier-gated truncated normals** (or Beta-on-bracket) — Pokémon-like **effective stat spreads** with fat middles and rare highs/lows inside each **`aptitude_tier`**.

**No species-fixed stat sheet (hard rule):** A **species line** (dex / catalog row) does **not** define canonical base stats, substats, material means, or guaranteed affinity weights for combat. Those live only on **creature instances** (rolled at spawn/capture/hatch). Optional catalog fields `primary_affinity`, `secondary_affinity`, and `affinity_emphasis_hint` are flavor or tooling only — affinities may be **`null`** on the row so catalog ≠ typing. Spawn-time knobs will live in a **versioned parameter set** when implementation starts (see [`PROCEDURAL-GENERATION.md`](./PROCEDURAL-GENERATION.md)).

**Abilities contrast:** Players **compose** moves from templates — statuses, accumulators, passive affinity hooks are **bounded customization**, not biome RNG ([`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md)).

- **Typing as composition, not a preset pair:** Display labels combine biology/flavor + **rolled affinity_emphasis** vectors (e.g. “floral–luminous jellyfish”). Optional `primary`/`secondary` summaries are **collapsed views** derived from the vector or omitted.
- **Ability acquisition:** Moves and passives come from a **broad learnable pool**; soft gates use stats, materials, and affinity emphasis (e.g. high `conductivity` + Galvanic tendency unlocks chain arcs faster)—not a single rigid tree per species. Players and procedural trainers both assign **sliding coefficients** within authored bounds (`base_power`, modality weights, tag intensities).
- **Moves as authored compositions:** **Templates** (e.g. **Blast**, **Slam**) expose numeric bands + optional affinity slots; **surges** add **`delivery_modalities`** (concussive / piercing / slashing ω) like strikes; **`cooldown_scaling`** ties recharge wait to **`base_power`**. Players bind sliders at resolve time — including future **status**, **accumulator impulse**, and **passive hook** slots aligned with creature battle state ([`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §5.4b, §3 and [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md)). **Display:** untouched frame ⇒ **`system_display_title`** is just **Blast**; tokens (**Plasmic**, **Channeled**, **Corrosive**, …) append **only** from explicit selections + composer thresholds — never from **`damage_kind_default`**, uniform ω, or catalog slider defaults ([`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) *Dynamic display names & nicknames*); optional **nickname** above subtitle.

### World & battles

- Overworld and **battle arenas** assemble from **biome primitives** (field scalars, terrain ids, passive ticks, evolution rules — [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §12): procedural draws keep encounters tactically fresh while staying replay-deterministic given a stored seed.

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

**Why this stack:** One TypeScript codebase can share **simulation packages** (combat resolver, protocol, spawn helpers) between browser and server so core simulation is **not** implemented twice (a common source of bugs in MMO-like games).

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
5. **Battle engine** — deterministic, server-authoritative, seedable RNG; resolver [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) (dynamic **`m1`**, continuous flows [`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md)); **arena field state** from procedural biome composition.
6. **Creature model** — species line (**identity only**), stage, level; **spawn context** (`biome_id`, seed, band) drives **rolled** emphasis (**biome-primary bias**, optional **neutral primary**, optional **secondary** as rarity), **bell-curve aptitudes** within tier, materials, training vectors, **appearance seed**, variant flags; **moves** are player-composed templates (status / accumulator / passive hooks bounded per frame — [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md)); held item.
7. **Trading** — two-phase commit (offer → confirm) + server journal so duplication exploits are not possible.
8. **Persistence** — party, box, progression; reconnect to same room or global lobby (**product decision**).
9. **Content pipeline** — species **identity** table (~100 lines), move content, **reaction rules**, balance tooling — formats TBD at build. **Combat stats are not authored per catalog row** — they live on instances.
10. **Rendering hooks** — shader/uniform pipeline driven by **appearance genes** (§7); optional quality tiers for low-end devices.

---

## 4. “Calculus-based” damage (realistic, still shippable)

“Calculus” here does **not** mean obscure math for its own sake. It means **continuous, nonlinear, coupled dynamics** instead of a single linear formula everywhere—aligned with players who enjoy **systems they can reason about** (rates, equilibria, thresholds) rather than opaque buckets. **Primary defeat condition:** depletion of **endurance** \(S(t)\) (capacity to continue fighting), driven by both discrete hits and integrated DoT—not a metaphorical “life bar” as the headline mechanic.

### Patterns that map well to implementation

- **Mitigation as a smooth asymptote:** effective **endurance loss** uses saturation-style curves (e.g. offense versus mitigation approaching a ceiling) so defense does not behave like a straight percentage forever.
- **DoT / erosion:** explicit \(\mathrm{d}S/\mathrm{d}t\) contributions from burns, bleeds, toxins, etc., with decay/resist channels—stacking caps from equilibrium limits or data caps.
- **Stamina / recovery:** `stamina` sets \(S_{\max}\); recovery terms in \(\mathrm{d}S/\mathrm{d}t\) are usually small or rule-gated so pacing stays tactical.
- **Multi-hit and exposure:** total **endurance loss** over a combo approximates an integral of a hit curve modulated by how enemy posture / stagger builds smoothly.
- **Strike modalities:** blunt impulse vs penetration vs shear channels blend separate nonlinear saturation branches tied to material ψ maps (`COMBAT-MODEL` §5.4b)—distinct from move-field **`pierce`** scalar bypass.
- **Probability-shaped hits:** miss/crit/spread form an explicit **random variable** law on top of the continuous core; conditional expectations \(\mathbb{E}[\Delta S \mid \mathrm{hit}]\) factor when independence holds (`COMBAT-MODEL` §§5.0, 5.8).
- **Balance tooling:** expose sensitivities (e.g. impact of +1 defense on win rate) via Monte Carlo or closed-form approximations so tuning uses gradients, not only trial and error.

All of this runs as **numeric integration per tick** on the server — no symbolic computer algebra required in production.

At **very high progression tiers**, mechanics can deliberately expose **coupled variables** (thermal stress ↔ material phase ↔ fracture thresholds) so mastery looks like **physical intuition**—but the **HUD and tutorials** must still teach the metaphor; formal physics education should never be a hard gate to enjoy the game.

### Pedagogy & continuous simulation (expanded)

Depth uses **calculus-flavored modeling** (flows between turns, smooth nonlinear mitigation, exposure ramps)—not player-facing quizzes. Fidelity is intentionally **toy-physical**: directional intuition matches real science where cheap, without claiming CFD/FEM-grade simulation.

**Full write-up:** [`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md) — battle state as \(\mathbf{u}(t)\), subtick integration contract, exemplar rate laws (thermal storage, wetness exchange, charge leakage, fracture relaxation), ordering of threshold events vs Layer 2, multi-hit exposure interpretation, offline \(\partial J/\partial \theta\) sensitivities, UI tiers, honesty bar for marketing/engineering.

Cross-links: [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §6–§7, §5.4b, §15–§16; [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §5–§6.

### Fairness vs nostalgia

Classic JRPG “feel” often conflicts with extreme realism (sleep RNG, crit spikes, legacy quirks). **Decide early** which behaviors are homage versus modern fairness.

---

## 5. Stage fairness (competitive at any stage, infinite `L`)

**Concrete pattern (fully rolled budgets):**

- Define total stat budget **B(L)** per level (same global formula for every creature at `L`; see §1 for two-phase behavior).
- **Per instance**, sample how **B(L)** is **partitioned** across the core stat tuple (**`stamina`**, **`physical_offense`**, **`physical_mitigation`**, **`special_offense`**, **`special_mitigation`**, **`initiative`**, …) using a **random compositional draw** (e.g. Dirichlet / bounded independent rolls), optionally conditioned only on **stage** **s ∈ {1,2,3}** via global hyperparameters—not on species id. Two Ash Mantles at the same level can land on opposite spreads.
- **Extended stats** (**`precision`**, **`recovery`**, **`coupling`** — [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §3) roll from their own distributions or derive from the rolled core tuple via **global** curves; species lines do not author per-line formulas.
- **Training / Resonance** applies on top as a bounded tunable allocation **t(L)** with diminishing returns and bracket caps (percentage of **B(L)** or parallel budget pools—data-owned).
- **Stage advancement** unlocks moves/passives and may widen/narrow roll variance or training caps via **global stage rules**, but **must not** bake a hidden higher **B(L)** than another creature at the same level under the same ruleset. Competitive meta = **roles and reactions**, not species-tier privilege.

---

## 6. Elements, materials, and “physics-forward” interactions

**Design intent:** Take the clarity of **modern type charts** (predictable strengths/weaknesses, readable counters) and enrich them with **secondary axes** so interactions feel like **material science + elementary physics metaphors**—heat vs insulation, thermal shock on brittle surfaces, conductivity when wet, etc.—without requiring the player to solve textbook problems mid-turn.

### Representation (technical)

- **Affinity catalog:** Nine IDs ship first in code paths; **twelve** IDs (**Thermal … Void** plus **Sonic**, **Corrosive**, **Plasmic**) are the target set — IDs, `CHART₀`, and rationale in [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §§1–2. [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §1 summarizes both tiers.
- **Instance emphasis:** Resolver consumes **rolled `affinity_emphasis`** over active affinity IDs + dynamic **`m1`** ([`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §5.5); catalog “primary” is not authoritative (§1 *Creatures*).
- **Latent traits:** Material vector + Layer 3 accumulators (`thermal_mass`, `rigidity`, `wetness`, `sonic_stress`, `corrosion`, `ionization`, … — full list [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §§4, §9) — surfaced gradually via inspect UI / meters.
- **Battle state fields:** Ambient and local scalars the resolver reads (`wetness`, `temperature_delta`, `stress_fracture_accumulator`, …) updated by moves, weather, terrain, and reactions.

### Resolver shape

**Detailed ordering, formulas, stacking policy, and data artifacts:** [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md).

Summary:

- **Layer 1:** Effectiveness is **not** only a flat table lookup: a **baseline chart** (optional prior) is **reshaped by creature stats, material profiles, affinity emphasis vectors, move composition, and field state** into a bounded multiplier—typically **smooth in inputs** so “super effective” **slides** with build and context (details [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §5.5). Beginner UI may still show a single collapsed chip.
- **Layer 2:** **Predicate → modifier** rules authored in data: e.g. `(affinity_fire ∧ surface_glass ∧ ΔT > θ) ⇒ bonus_shatter_chance + armor_saturation drop`.
- **Layer 3:** Small integrated **ODE-ish accumulators** for cracks, corrosion, overheating—reuse patterns from §4.

**Tooling:** Rule linter detects contradictions and unreachable predicates; simulation fuzz tests random pairings for exploding damage variance.

**Legal/branding:** All affinity names, charts, and metaphors are original—no reuse of proprietary type sets.

**Concrete affinity catalog & example Layer 2 rules:** [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md).

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
3. Battle engine v0 (1v1, shared TS, unit tests, logging); **`CHART₀` baseline** + (later) **dynamic `m1` reshape** per [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §5.5 before relying on tournament fairness.
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
| **Physics metaphor drift** | Internal “honesty bar” in [`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md) §9—marketing never implies CFD/FEM fidelity |
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
| 2026-05-03 | Infinite progression; scaling; procedural genes; [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) incl. strike modalities §5.4b; [`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md); §4 pedagogy |
| 2026-05-03 | Linked [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) — post-MVP systems (12 affinities, biomes, combos, artifacts) |
| 2026-05-03 | §4 endurance-first framing: DoT as \(\mathrm{d}S/\mathrm{d}t\); core stat **`stamina`** (replaces HP metaphor in progression spread). |
| 2026-05-03 | Creatures: procedural per-instance stats/materials/typing composition; broad ability learning; compositional moves. Battles: procedural biome assembly. Layer 1: stat-shaped multiplier (not flat-only chart). |
| 2026-05-03 | Species **identity** catalog intent (~100 dex lines); generator/tooling deferred until implementation. |
| 2026-05-03 | §1/§5: **No species-fixed stats** — all combat numbers roll per instance; catalog affinity fields are flavor-only. §6: twelve-affinity target + emphasis note. |
