# Wildloom — gameplay systems (affinities, field, progression)

**Status:** Design draft aligned with [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) and [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md). Layer 1 uses **dynamic `m1`** (§5.5) anchored by **`CHART₀`** ([`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §2). **Twelve** affinity IDs are the target roster; **nine** ship first in MVP enums ([§1](#1-affinity-framework--twelve-ids-mvp-ships-nine)).

**Related:** [`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md) — continuous flows, pedagogy, integration contract. [`PROCEDURAL-GENERATION.md`](./PROCEDURAL-GENERATION.md) — **biome-conditioned spawn**, neutral-primary odds, bell-curve aptitudes, composite rarity. [`ATTACK-CATALOG.md`](./ATTACK-CATALOG.md) — customizable moves vs spawned creatures. [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) — **twelve-affinity** target, Sonic/Corrosive/Plasmic, full chart, stances, statuses, biomes (phase in after MVP).

**Implementation:** Reference resolver lives in [`packages/combat`](../packages/combat/README.md).

---

## 1. Affinity framework — twelve IDs, MVP ships nine

**Interactions:** Layer 1 dynamic **`m1`** reshapes baseline matchup tendencies (**`CHART₀`**) using emphasis vectors, stats, materials, move fusion, and field ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §5.5). Layer 2 predicate catalog below + [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) combos/stances. Layer 3 accumulators couple heat, wetness, fracture, charge, **sonic_stress**, **corrosion**, **ionization**, etc. ([`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §§8–9).

### 1.0 Twelve-affinity roster (target content IDs)

| ID | Affinity | Theme (short) |
|----|----------|----------------|
| `TH` | **Thermal** | Heat, combustion, convection |
| `CY` | **Cryo** | Cold, entropy, brittle setups |
| `AQ` | **Aqueous** | Liquids, wetness, pressure |
| `GA` | **Galvanic** | Charge, circuits, arcs |
| `MI` | **Mineral** | Stone, crystal, grounding |
| `FL` | **Flora** | Biomass, sustain, DoT |
| `AE` | **Aero** | Gas, wind, field spread |
| `LU` | **Luminous** | Light, surge pierce |
| `VO` | **Void** | Vacuum / isolation, compression flavors |
| `SO` | **Sonic** | Resonance, impedance, medium |
| `CR` | **Corrosive** | Acid/base kinetics, armor erosion |
| `PL` | **Plasmic** | Ionized burst, ionization field |

Authoritative **`CHART₀`**, Sonic/Corrosive/Plasmic mechanics, statuses, and biomes: [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §§1–2, §§8–13.

### 1.1 MVP nine (resolver ships first)

Early engine enums may omit **`sonic`**, **`corrosive`**, **`plasmic`** until content hooks land; design assumes they eventually participate in the **same** Layer 1–3 machinery.

To keep the matchup chart readable during onboarding, tutorials may **collapse** affinities into the nine-row summary below (still physics-flavored naming).

| Affinity | Theme & metaphor | Identity / playstyle |
|----------|------------------|----------------------|
| **Thermal** | Heat, combustion, plasma | Burst pressure; builds `heat_load`; melting hooks. |
| **Cryo** | Cold, entropy, crystallization | Tempo pressure; brittle setups; draws thermal energy down. |
| **Aqueous** | Liquids, solutions, pressure | Utility; sets `wetness`; pairs with `porosity`. |
| **Galvanic** | Electricity, magnetism, charge | Tempo; chains via `conductivity`; control spikes. |
| **Mineral** | Earth, crystal, metals | Physical mitigation; `rigidity` / shatter loops. |
| **Flora** | Biomass, vines, spores | Sustain / drains (DoT); often higher `thermal_mass`. |
| **Aero** | Gas, pressure waves, wind | Evasion hooks; spreads field accumulators. |
| **Luminous** | Light, lasers, radiation | Surge-focused piercing; interacts with **`special_mitigation`** more than **`physical_mitigation`**. |
| **Void** | Gravity, vacuum, isolation | Compression on effective **`stamina` / endurance ceiling**; deliberately orthogonal physics hooks. |

**Open decision:** Keep this “physics-first” naming, push further into non-element metaphors, or split “identity” vs “damage flavor” for readability—finalize before shipping tutorial copy.

---

## 1.2 Procedural uniqueness, composed typings, and move authoring

**Creature instances:** Spawns and hatchlings roll from **`biome_id` + seed** — elemental emphasis is **biased to the biome**, with **`p_neutral_primary`** for no dominant affinity and a **secondary-chip roll** for dual-type rarity ([`PROCEDURAL-GENERATION.md`](./PROCEDURAL-GENERATION.md)). **Nine stats** use **tier-gated bell-curve** draws (truncated normal / Beta-on-bracket), not species-fixed sheets. The species catalog row is **identity only** (names, stages, habitat). Examples: [`SPECIES-INSTANCE-EXAMPLES.md`](./SPECIES-INSTANCE-EXAMPLES.md).

**Typing:** Combat uses **`affinity_emphasis`** vectors over the twelve IDs (or nine until unlocked). **Authoritative** emphasis always comes from the instance payload.

**Abilities & moves:** **`attack_templates.catalog.json`** lists frames with **bounds only**. Players resolve knobs including affinities, power, pierce, modalities, cooldown — and **the same families of effects creatures feel in battle** — **status payloads**, **accumulator impulses**, optional **passive affinity emphasis** on slot-local passives — all within template budgets ([`ATTACK-CATALOG.md`](./ATTACK-CATALOG.md) — [Status effects, accumulators, passive hooks](#status-effects-accumulators-passive-hooks-planned-hydration)); [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §3). **Soft unlock gates** use rolled stats/materials/emphasis.

**Battles:** Arenas compose from **biome / field primitives** with procedural seeds while replay stays deterministic ([`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §12; [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §1 *World & battles*).

---

## 1.3 Ability payloads mirror creature battle hooks

**Design rule:** Anything that can meaningfully attach to a **creature instance** in combat — **volatile statuses**, **Layer 3 accumulator deltas**, **passive affinity shaping**, aura ticks — must also be expressible as **player-authored selections** on **moves / passives / slot augments**, bounded per template so builders cannot silently exceed authored ceilings.

| Hook family | On creatures | On abilities (templates → resolved move) |
|-------------|--------------|------------------------------------------|
| Elemental emphasis | Rolled at spawn from biome + RNG | Player picks **`primary` / `secondary` / `affinity_weights`** within template |
| Stats | Rolled aptitudes + growth | N/A directly — abilities scale off **attacker stats** via resolver |
| **Status guard** (resist / cleanse buffers) | Creature **`status_guard`** (per-family + global) softens incoming disables / DoTs | Moves allocate **`status_guard_shred_share`** to attack those defenses on the same swing as **`status_delivery_share`** and optional **`endurance_share`** ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §3.1) |
| Statuses | Boss auras, terrain, items apply | **`on_hit_status`**, **`self_status`**, **`target_status`** payloads with potency/duration/chance bands |
| **Field identity** | Arena **`terrain_id`**, **`field_flags`**, ambient scalars ([`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §12) | **`utility_field_share`** transitions field toward authored targets; **`utility_pressure_share`** applies transient foe stat hooks during the shift ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §3.1) |
| Accumulators | Trait passives integrate \(\mathrm{d}u/\mathrm{d}t\) | **`accumulator_impulses`** — e.g. +\(\Delta\)heat_load, +\(\Delta\)wetness on hit; decay rules data-owned |
| Passive affinity | Species/flavor can bias Layer 2 | **`passive_affinity_emphasis`** optional vector on **passive shell** tied to ability slot |

Resolver ordering stays **`COMBAT-MODEL.md`** §5 — impulses feed **Layer 3** after Layer 2 predicates unless a rule declares preempt.

---

## 2. Layer 2 & 3 interaction catalog

### 2.1 Core accumulators (Layer 3)

Accumulators are continuous battle scalars (per combatant unless noted). They decay or integrate per subtick (see [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §6). **Moves** also push structured deltas into the same keys via **`accumulator_impulses`** on resolved instances ([§1.3](#13-ability-payloads-mirror-creature-battle-hooks); [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §3).

| Key | Build sources (examples) | Mechanical role |
|-----|--------------------------|-----------------|
| `fracture` | Heavy **strike** stress on high-`rigidity` bodies | Reduces effective **`physical_mitigation`** via saturation path coupling (tuning γ). |
| `heat_load` | Thermal moves, exertion, hot fields | DoT or overload thresholds; `thermal_mass` slows heating **and** cooling. |
| `wetness` | Aqueous moves, humidity | Amplifies galvanic pathways; enables steam / shock rules. |
| `concussion` | Concussive-heavy strikes ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §5.4b; weight ω_con) | Tempo / accuracy decay via smooth coupling—[`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md) §3.5. |
| `laceration` | Slashing-heavy strikes (weight ω_slash), esp. high porosity/wetness | Feeds bleed **`\mathrm{d}S/\mathrm{d}t`** channels §3.6; Layer 2 gates severity caps. |

Additional scalars (`charge_buildup`, **`cryo_load`**, **`corrosion`**, **`radiation`**, **`sonic_stress`**, **`ionization`**, **`compression`**, **`bio_resonance`**, **`magnetic_flux`**, …) ship per [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §9; MVP code may subset until rules land — [`packages/combat`](../packages/combat/src/types.ts).

### 2.2 Signature reaction rules (Layer 2)

Author as data (`reaction_rules/*`) with priorities. Examples:

1. **Thermal shock**  
   - **When:** Cryo-tagged move hits defender with **high** `heat_load` **and** high `rigidity`.  
   - **Then:** Clear part of `heat_load`, spike `fracture`, optional flat burst + log line for UI.

2. **Superconduct**  
   - **When:** Galvanic move; defender `wetness > 0.5` **or** `conductivity > 0.8`.  
   - **Then:** Temporary pierce on **`special_mitigation`** (not automatic everywhere—scope per rule), optional splash to bench (PvP ruleset gated).

3. **Steam expansion**  
   - **When:** Thermal move; defender `wetness > 0.5`.  
   - **Then:** Consume/drain `wetness`, apply **initiative** penalty debuff, set Layer 2 multiplier bump (e.g. `m2 × 1.3` cap-checked).

4. **Armor pierce alignment**  
   - **When:** Move tag `armor_piercing` **and** defender `fracture > θ`.  
   - **Then:** Temporarily boost **`pierce` scalar** or piercing modality pierce-share—keep audit trail per [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §5.2 vs §5.4b separation.

5. **Concussion spike**  
   - **When:** `concussion` crosses threshold **and** defender lacks stance buff.  
   - **Then:** Force slower **initiative** segment / accuracy slump—avoid hard stun RNG where possible (smooth debuffs).

6. **Open shear**  
   - **When:** `laceration` rising **and** follow-up slashing hit while `wetness` high.  
   - **Then:** Amplify DoT potency cap-checked—requires bracket governance for competitive modes.

Exact numbers ship from balance JSON, not this prose.

---

## 3. Field scalars & ambient states

Replace binary weather with **continuous environment** where possible; seed from terrain / overworld room config.

| Scalar | Example default | Mechanics sketch |
|--------|-----------------|------------------|
| `ambient_temp` | 20 (dimensionless UI units or °C—pick one and normalize) | Modulates `heat_load` decay; optional tiny Thermal surge bias per degree above baseline. |
| `humidity` | 0.5 (0–1) | High humidity adds passive `wetness` ticks; low humidity evaporates `wetness`. |
| `terrain_id` | `neutral` | Typed overrides—e.g. `conductive_grid` boosts conductivity; `overgrown_roots` grants Flora regen ticks. |

Server owns authoritative values; clients interpolate for VFX only.

Optional **derived field cues** (author decides whether to expose raw numbers): e.g. a saturation-like composite of `ambient_temp` + `humidity` drives passive wetness gain (“sticky air” intuition)—keep formulas monotonic and documented so players aren’t fooled into fake thermodynamics.

---

## 4. Stat growth — fully rolled aptitudes + visible Resonance

**Goals:** Every instance’s combat math comes from **rolls + training**, not from a hidden species spreadsheet. Compatible with infinite-level **`B(L)`** ([`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §1, §5).

### 4.1 Rolled aptitudes (no species base vector)

- At creation/capture, sample a **raw aptitude vector** over the six core stats (and separately over extended stats if enabled) from **global/stage/encounter** distributions scaled by **`B(L)`** — **not** from species id.
- Apply **genetic jitter** (e.g. narrow noise per axis), **fully visible** immediately.
- **Material profile:** independent roll over **twelve** axes ([`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §4) — species line does not fix morphology numbers.

### 4.2 Resonance (training allocation)

Working name: **Resonance** — transparent spendable budget (replaces invisible EV grind).

- **Accrual:** per level through phase boundaries; post-100 diminishing accrual consistent with grind philosophy (data-owned).
- **Allocation:** hubs (“tuning stations”) into whichever stats the design exposes (six core + optional **precision / recovery / coupling**).
- **Hard cap:** e.g. no single stat >40% of allocated pool at a snapshot — avoids breaking saturation math.

### 4.3 Combined stat formula (conceptual)

For a core stat `S` at level `L`:

\[
S_{\text{final}} = \Bigl( A_{\text{rolled}} + R_{\text{allocated}} \Bigr) \cdot f_{\text{growth}}(L)
\]

- \(A_{\text{rolled}}\) is the **instance** aptitude draw (+ jitter), **never** a species table lookup.
- \(f_{\text{growth}}(L)\) follows Phase A / B ([`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §1).
- Extended stats either roll independently or use **global** maps \(g_j(A_{\text{rolled}})\), not per-species curves ([`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §3.3 migration is **default prior for simulators**, not a creature definition).

---

## 5. Stealth physics-literacy map (affinities → intuition targets)

### 5.1 Energy / material affinities

Not lesson plans—**design targets** for observable behavior + copy. Real classrooms optional.

| Affinity | Player-learnable intuition | Observable hooks |
|----------|---------------------------|------------------|
| Thermal | Heat accumulates and dissipates toward ambient | `heat_load` meter relaxes faster/slower with mass |
| Cryo | Removing heat stresses brittle structures | spike rules when hot+rigid |
| Aqueous | Moisture couples to environment | wetness ↔ humidity exchange |
| Galvanic | Stored charge leaks faster when conductive paths exist | `charge_buildup`, wetness gates |
| Mineral | Stiff materials concentrate stress → fracture | fracture ↔ rigidity |
| Flora | Mass dampens thermal swings | slower \(dH/dt\) ramps |
| Aero | Fluids carry scalars (spread/dilute) | field clears / spreads accumulators |
| Luminous | Energy carriers bypass some material paths | surge-first tuning |
| Void | Isolation / compression metaphors | **`stamina` / \(S_{\max}\)** compression separate from chemical physics |
| Sonic | Periodic forcing + impedance | `sonic_stress`; resonance combos vs rigid bodies |
| Corrosive | Rate laws erode defense over time | `corrosion`; long-fight pressure |
| Plasmic | Ionized burst + field coupling | `ionization`; synergizes with Galvanic hooks |

### 5.2 Strike modalities (concussive / piercing / slashing)

| Modality | Physics metaphor (toy fidelity) | Literacy hook |
|----------|---------------------------------|---------------|
| Concussive | Momentum transfer through shells/tissue | Shock lingers as `concussion`; rigid shells may transmit more unless damped |
| Piercing modality | Contact pressure / stress concentration | Uses move **`pierce`** strongly; couples to `fracture` on brittle faces |
| Slashing | Shear + tear along surfaces | Opens `laceration`; humidity/porosity amplify bleed drivers—not realistic surgery |

---

## 6. Extended accumulators (reference)

Full Layer 3 registry, cross-coupling notes, UI tiers: [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §9. MVP builds may implement a subset; **do not** imply species-specific fixed accumulator priors — starting battle scalars reset from rules + field, not from catalog rows.

| Key | Role sketch |
|-----|-------------|
| `ionization` | Plasma / Plasmic bridges; field leaks ([`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §§7–8). |
| `sonic_stress` | Sonic resonance path to `deafened` / combos. |
| `corrosion` | CR catalyst + armor shred thresholds. |
| `cryo_load` | Gates `frozen` with `heat_load`. |
| `compression` | Void-heavy compression meter. |
| `bio_resonance` | Flora sustained economy / biome coupling. |

---

## 7. Document changelog

| Date | Change |
|------|--------|
| 2026-05-03 | Initial import: nine affinities, accumulator/reaction catalog, field scalars, resonance framing |
| 2026-05-03 | Physics-literacy map; optional accumulators; simulation doc link; §4 stat growth restored |
| 2026-05-03 | `concussion` / `laceration`; modality reaction sketches; §5.2 strike modality literacy |
| 2026-05-03 | Related [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md); §1 post-MVP twelve-affinity pointer |
| 2026-05-03 | Void / bleed copy aligned with endurance pool \(S\) and **`stamina`** ceiling ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §2, §6). |
| 2026-05-03 | Core stat vocabulary aligned with [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §2.1 — **`physical_mitigation`**, **`special_mitigation`**, **`initiative`**, **`precision` / `recovery` / `coupling`** in prose |
