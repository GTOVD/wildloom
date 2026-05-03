# Wildloom — gameplay systems (affinities, field, progression)

**Status:** Design draft aligned with [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) and [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md). Layer 1 chart values and rule IDs remain **data-driven** until balance passes.

**Related:** [`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md) — continuous flows, pedagogy, integration contract. [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) — **twelve-affinity** target, Sonic/Corrosive/Plasmic, full chart, stances, statuses, biomes (phase in after MVP).

**Implementation:** Reference resolver lives in [`packages/combat`](../packages/combat/README.md).

---

## 1. Nine-affinity framework (Layer 1)

To keep the matchup chart readable (under ~10 affinities) while supporting physics-flavored depth in Layers 2–3, we use **original names** that imply states and energy—not third-party franchises.

| Affinity | Theme & metaphor | Identity / playstyle |
|----------|------------------|----------------------|
| **Thermal** | Heat, combustion, plasma | Burst pressure; builds `heat_load`; melting hooks. |
| **Cryo** | Cold, entropy, crystallization | Tempo pressure; brittle setups; draws thermal energy down. |
| **Aqueous** | Liquids, solutions, pressure | Utility; sets `wetness`; pairs with `porosity`. |
| **Galvanic** | Electricity, magnetism, charge | Tempo; chains via `conductivity`; control spikes. |
| **Mineral** | Earth, crystal, metals | Physical mitigation; `rigidity` / shatter loops. |
| **Flora** | Biomass, vines, spores | Sustain / drains (DoT); often higher `thermal_mass`. |
| **Aero** | Gas, pressure waves, wind | Evasion hooks; spreads field accumulators. |
| **Luminous** | Light, lasers, radiation | Surge-focused piercing; interacts with `ward` more than `bulwark`. |
| **Void** | Gravity, vacuum, isolation | Compression on `vitality`; deliberately orthogonal physics hooks. |

**Open decision:** Keep this “physics-first” naming, push further into non-element metaphors, or split “identity” vs “damage flavor” for readability—finalize before shipping tutorial copy.

**Post-MVP expansion:** Three additional affinities (**Sonic**, **Corrosive**, **Plasmic**), dual-affinity blend defaults, and the complete matchup matrix are specified in [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §§1–2—implement after the nine-type chart ships.

---

## 2. Layer 2 & 3 interaction catalog

### 2.1 Core accumulators (Layer 3)

Accumulators are continuous battle scalars (per combatant unless noted). They decay or integrate per subtick (see [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §6).

| Key | Build sources (examples) | Mechanical role |
|-----|--------------------------|-----------------|
| `fracture` | Heavy **strike** stress on high-`rigidity` bodies | Reduces effective `bulwark` via saturation path coupling (tuning γ). |
| `heat_load` | Thermal moves, exertion, hot fields | DoT or overload thresholds; `thermal_mass` slows heating **and** cooling. |
| `wetness` | Aqueous moves, humidity | Amplifies galvanic pathways; enables steam / shock rules. |
| `concussion` | Concussive-heavy strikes ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §5.4b; weight ω_con) | Tempo / accuracy decay via smooth coupling—[`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md) §3.5. |
| `laceration` | Slashing-heavy strikes (weight ω_slash), esp. high porosity/wetness | Feeds bleed **`d(HP)/dt`** channels §3.6; Layer 2 gates severity caps. |

Additional scalars (`charge_buildup`, etc.) stay in `Combatant.scalars` per [`packages/combat`](../packages/combat/src/types.ts).

### 2.2 Signature reaction rules (Layer 2)

Author as data (`reaction_rules/*`) with priorities. Examples:

1. **Thermal shock**  
   - **When:** Cryo-tagged move hits defender with **high** `heat_load` **and** high `rigidity`.  
   - **Then:** Clear part of `heat_load`, spike `fracture`, optional flat burst + log line for UI.

2. **Superconduct**  
   - **When:** Galvanic move; defender `wetness > 0.5` **or** `conductivity > 0.8`.  
   - **Then:** Temporary pierce on **ward** (not automatic everywhere—scope per rule), optional splash to bench (PvP ruleset gated).

3. **Steam expansion**  
   - **When:** Thermal move; defender `wetness > 0.5`.  
   - **Then:** Consume/drain `wetness`, apply tempo penalty debuff, set Layer 2 multiplier bump (e.g. `m2 × 1.3` cap-checked).

4. **Armor pierce alignment**  
   - **When:** Move tag `armor_piercing` **and** defender `fracture > θ`.  
   - **Then:** Temporarily boost **`pierce` scalar** or piercing modality pierce-share—keep audit trail per [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §5.2 vs §5.4b separation.

5. **Concussion spike**  
   - **When:** `concussion` crosses threshold **and** defender lacks stance buff.  
   - **Then:** Force slower tempo segment / accuracy slump—avoid hard stun RNG where possible (smooth debuffs).

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

## 4. Stat growth — genetic variance & resonance pool

**Goals:** Remove opaque hidden rolls, keep identity variance, stay compatible with infinite-level **`B(L)`** from [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md).

### 4.1 Base & genetic variance

- Species defines a **base six-vector** over core stats.
- On creation/capture, roll a **variance vector** (e.g. ±5% per stat), **fully visible** in UI immediately.

### 4.2 Resonance (training allocation)

Working name: **Resonance** — a transparent spendable budget (replaces classic invisible EV grind).

- **Accrual:** e.g. flat Resonance per level through phase boundaries; past level 100 use diminishing Resonance-per-level consistent with post-100 grind philosophy (**tune in data**).
- **Allocation:** Spent at hubs (“tuning stations”) into the six core stats; **respec rules** are product policy (costed vs free in dev rooms).
- **Hard cap:** No single stat may hold more than a fixed fraction (e.g. 40%) of **total allocated Resonance at that level** to avoid degenerate builds that stress-break saturation math.

### 4.3 Combined stat formula (conceptual)

For a core stat `S` at level `L`:

\[
S_{\text{final}} = \Bigl( S_{\text{base}} \cdot (1 + V_{\text{variance}}) + R_{\text{allocated}} \Bigr) \cdot f_{\text{growth}}(L)
\]

- \(f_{\text{growth}}(L)\) follows **Phase A / Phase B** piecewise progression (technical design §1).
- Wire \(R_{\text{allocated}}\) and caps into the same modifier-stacking policy as combat (`COMBAT-MODEL` §8).

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
| Void | Isolation / compression metaphors | vitality compression separate from chemical physics |

### 5.2 Strike modalities (concussive / piercing / slashing)

| Modality | Physics metaphor (toy fidelity) | Literacy hook |
|----------|---------------------------------|---------------|
| Concussive | Momentum transfer through shells/tissue | Shock lingers as `concussion`; rigid shells may transmit more unless damped |
| Piercing modality | Contact pressure / stress concentration | Uses move **`pierce`** strongly; couples to `fracture` on brittle faces |
| Slashing | Shear + tear along surfaces | Opens `laceration`; humidity/porosity amplify bleed drivers—not realistic surgery |

---

## 6. Extended accumulators (optional backlog)

Add only when rules justify CPU + UX:

| Key | Role sketch |
|-----|-------------|
| `ionization` | Track plasma-friendly Layer 2 bridges between Thermal ↔ Galvanic (high complexity—flag gated). |
| `surface_charge` | Separate from bulk `charge_buildup` for layered conductive skins. |
| `plastic_strain` | Slow irreversible bulwark creep under sustained strikes (advanced bracket only). |

Each requires explicit decay law in [`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md) style before authoring predicates.

---

## 7. Document changelog

| Date | Change |
|------|--------|
| 2026-05-03 | Initial import: nine affinities, accumulator/reaction catalog, field scalars, resonance framing |
| 2026-05-03 | Physics-literacy map; optional accumulators; simulation doc link; §4 stat growth restored |
| 2026-05-03 | `concussion` / `laceration`; modality reaction sketches; §5.2 strike modality literacy |
| 2026-05-03 | Related [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md); §1 post-MVP twelve-affinity pointer |
