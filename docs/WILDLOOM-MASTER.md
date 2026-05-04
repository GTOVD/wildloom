# Wildloom — Master Design Document
**Version:** 2026-05-03 · Consolidated  
**Status:** Authoritative planning spec. Implementation may phase systems; this document is the full target.  
**Rule:** When this document contradicts any earlier partial doc, this document wins.

---

## Table of Contents

1. [Core Philosophy](#1-core-philosophy)
2. [Terminology Glossary](#2-terminology-glossary)
3. [Creature Instances — Procedural Generation](#3-creature-instances--procedural-generation)
4. [Core Stats (Nine)](#4-core-stats-nine)
5. [Material Profile (Twelve Axes)](#5-material-profile-twelve-axes)
6. [Affinities (Twelve IDs)](#6-affinities-twelve-ids)
7. [Baseline Affinity Chart CHART₀](#7-baseline-affinity-chart-chart)
8. [The Dynamic Move System — Ability Composer](#8-the-dynamic-move-system--ability-composer)
9. [Move Instance Fields — Complete Schema](#9-move-instance-fields--complete-schema)
10. [The Damage Pipeline](#10-the-damage-pipeline)
11. [Layer 1 — Dynamic m1](#11-layer-1--dynamic-m1)
12. [Layer 2 — Predicate Rules](#12-layer-2--predicate-rules)
13. [Layer 3 — Accumulator Registry](#13-layer-3--accumulator-registry)
14. [Status Conditions](#14-status-conditions)
15. [Damage Over Time and Coupled Flows](#15-damage-over-time-and-coupled-flows)
16. [Stances](#16-stances)
17. [Passive Abilities](#17-passive-abilities)
18. [Battle Phase Structure](#18-battle-phase-structure)
19. [Team and Party Rules](#19-team-and-party-rules)
20. [Biomes and Field Scalars](#20-biomes-and-field-scalars)
21. [Named Combo System](#21-named-combo-system)
22. [Stat Growth and Resonance](#22-stat-growth-and-resonance)
23. [Physics Education Map](#23-physics-education-map)
24. [UI Tiers — Novice to Analyst](#24-ui-tiers--novice-to-analyst)
25. [Data Artifact Checklist](#25-data-artifact-checklist)
26. [Open Decisions](#26-open-decisions)

---

## 1. Core Philosophy

Wildloom is a real-time multiplayer creature-battle game built on three interlocking design commitments:

**1. Procedural identity.** No two creature instances are the same. Stats, material profiles, affinity emphasis, and appearance are all rolled at spawn. Species rows in the catalog are flavor and morphology hints — not combat formulas.

**2. Dynamic moves.** Players do not select from a fixed spell list. They select a *frame* (a move template like "Blast" or "Slam") and then tune affinities, modality weights, outcome splits, and effect riders within the frame's envelope. The move's display name assembles dynamically from the choices made. High skill expression comes from knowing how to build a move for a specific matchup, not from memorizing a fixed moveset.

**3. Stealth physics literacy.** The simulation is built from real physics metaphors — ODEs, wave mechanics, reaction kinetics, thermodynamics, impedance. Players who engage deeply develop correct intuitions about these concepts without ever seeing a formula unless they opt into the Analyst UI tier.

---

## 2. Terminology Glossary

| Term | Definition |
|---|---|
| **Affinity** | One of twelve elemental identities. On creatures: expressed as an `affinity_emphasis` weight vector across all twelve IDs. On moves: expressed as `affinity_weights` simplex, the primary attacker side of Layer 1. |
| **CHART₀** | The 12×12 baseline matchup matrix. Used as the *prior* for Layer 1 computation. Not the final `m1` on its own. |
| **Composer** | The UI + ruleset by which players build move instances from frames. |
| **Current endurance S(t)** | The battle-state scalar that hits deplete. Analogous to HP. Reaches zero → creature is incapacitated. |
| **Delivery modalities** | The ω simplex `{concussive, piercing, slashing}` on a **surge** move. Same math as strike modalities, but saturates against `special_mitigation`. |
| **Frame** | A move template. Defines the envelope (min/max bands per knob), allowed hook families, cooldown shape, and display seed. Not the damage type — the feasible region. |
| **Incapacitated** | S ≤ 0. Combat loss condition. Switch-in and XP behave as a knockout. |
| **Layer 1 / m1** | Affinity multiplier. Computed as a smooth function of CHART₀, emphasis vectors, stats, materials, and field — not a flat table lookup. |
| **Layer 2** | Predicate → modifier rules evaluated in priority order after m1. Physics-flavored hooks. |
| **Layer 3** | Continuous accumulators (fracture, heat_load, wetness, …) updated each subtick. Feed Layer 2 predicates and reshape effective stats. |
| **Material profile** | Twelve normalized scalars per creature instance describing physical/chemical composition. Keys Layer 2–3 only; invisible to beginners. |
| **Pierce (scalar field)** | The `pierce` field on a move instance. Trims effective mitigation in each modality channel before saturation. Different from **piercing ω** (the simplex weight). |
| **Resonance** | The training budget. Spent at tuning stations into stats. Fully visible to the player. Replaces hidden EV mechanics. |
| **Stamina (stat)** | Schema ID for endurance *capacity* — the ceiling S_max. Derived from rolled aptitudes + Resonance + level. |
| **Strike modalities** | The ω simplex `{concussive, piercing, slashing}` on a **strike** move. Saturates against `physical_mitigation`. |
| **ω simplex** | Three non-negative weights summing to 1.0: `{ω_con, ω_pier, ω_slas}`. Describes how a move routes its coupling effort across three damage geometry channels. |

---

## 3. Creature Instances — Procedural Generation

### 3.1 No species base-stat tables

**Species catalog rows contain:** species ID, display name, stage count (always 3), habitat biome hints, morphology flavor text, appearance gene seed range, and a non-authoritative `affinity_emphasis_hint`. They do **not** contain combat stats or material profile values.

**All combat math uses the rolled instance.** The spawn pipeline below produces the authoritative instance payload.

### 3.2 Spawn pipeline

```
Input:  biome_id, encounter_tier, level_L, seed
Output: CreatureInstance

Step 1 — Affinity emphasis roll
  Draw affinity_emphasis[12] from a Dirichlet distribution
  biome_id biases the concentration toward 2–3 affinity IDs
  Small p_neutral_primary chance of near-uniform spread (gives "mixed" creatures)
  Normalize to sum = 1.0

Step 2 — Core stat aptitude roll
  For each of 9 stats: draw A_raw ~ Normal(μ_tier, σ_tier) where
    μ_tier and σ_tier come from encounter_tier tables (not species rows)
  Apply level budget B(L) from §22 growth curve
  Apply genetic jitter: A_final = A_raw * (1 + jitter) where jitter ~ Uniform(-0.05, 0.05)
  Clamp to [stat_min, stat_max] from balance JSON

Step 3 — Material profile roll
  For each of 12 axes: draw from Beta(α_biome_k, β_biome_k)
  biome_id sets the Beta parameters per axis
  (Example: volcanic biome → high thermal_mass α, low porosity α)
  No per-species override

Step 4 — Appearance gene
  Draw appearance_gene: compact seed vector [float * N_gene_axes]
  Species line determines which gene axes map to which shader uniforms
  Lustrous flag: rolled at p_lustrous (~1/512 base); separate gene overrides

Step 5 — Move loadout
  N_moves slots; each starts with a default frame from biome/tier table
  Wild instances have pre-composed moves (procedurally tuned within frame envelopes)
  Players who catch/bond with a creature can recompose moves at tuning stations

Step 6 — Passive ability draw
  Stage 1: 1 passive from the species ability pool (species row provides the pool list only)
  Stage 2: 1 additional passive or reactive (player chooses from unlocked options at advancement)
  Stage 3: 1 additional advanced passive

Step 7 — Persist instance
  Store: affinity_emphasis, stat_aptitudes, material_profile, appearance_gene, move_loadout,
         passive_abilities, lustrous_flag, level, resonance_allocated, species_id
  Validate: all vectors normalized, all values in declared bounds
  Emit: InstanceCreated event with full payload + checksum
```

### 3.3 What the instance payload looks like (abbreviated)

```json
{
  "instance_id": "uuid",
  "species_id": "embervolt_stage2",
  "level": 42,
  "affinity_emphasis": {
    "TH": 0.55, "GA": 0.28, "AQ": 0.03,
    "CY": 0.01, "MI": 0.04, "FL": 0.01,
    "AE": 0.03, "LU": 0.02, "VO": 0.01,
    "SO": 0.01, "CR": 0.00, "PL": 0.01
  },
  "stat_aptitudes": {
    "stamina": 142, "physical_offense": 88, "physical_mitigation": 71,
    "special_offense": 103, "special_mitigation": 69, "initiative": 95,
    "precision": 77, "recovery": 58, "coupling": 84
  },
  "resonance_allocated": {
    "physical_offense": 40, "special_offense": 52, "initiative": 28
  },
  "material_profile": {
    "thermal_mass": 0.41, "conductivity": 0.72, "rigidity": 0.38,
    "porosity": 0.22, "polarity": 0.81, "density": 0.55,
    "elasticity": 0.44, "reflectivity": 0.18, "acoustic_impedance": 0.47,
    "chemical_reactivity": 0.31, "magnetization": 0.67, "permeability": 0.26
  },
  "move_loadout": ["<move_instance_1>", "<move_instance_2>", "<move_instance_3>", "<move_instance_4>"],
  "passive_abilities": ["charge_accumulation", "arc_discharge"],
  "appearance_gene": [0.72, 0.14, 0.88, 0.33, ...],
  "lustrous": false
}
```

### 3.4 Advancement (stage transitions)

Stage 1 → Stage 2, Stage 2 → Stage 3. Requirements are level + optional bond/training threshold. Advancement:
- Rerolls material profile with a *narrowed* distribution (the creature's morphology matures toward a more defined shape)
- Unlocks the Stage 2 / Stage 3 ability slot
- Does **not** change affinity_emphasis (the creature's elemental identity is stable)
- Recalculates S_max from new level budget
- The creature's appearance_gene carries forward; the species shader uses a stage-index to pick body template

---

## 4. Core Stats (Nine)

| Schema ID | Player-facing Name | Role | Notes |
|---|---|---|---|
| `stamina` | Endurance capacity | S_max ceiling | Current S is battle state, not stored stat. |
| `physical_offense` | Physical offense | Strike scaling | Saturates vs `physical_mitigation` in pipeline. |
| `physical_mitigation` | Physical mitigation | Strike defense | Reshaped by fracture, stance, materials. |
| `special_offense` | Special offense | Surge scaling | Saturates vs `special_mitigation`. |
| `special_mitigation` | Special mitigation | Surge defense | Separate stat — same offensive pattern, different physics metaphor. |
| `initiative` | Initiative | Turn order, evasion hooks | Used in accuracy/evasion sigmoid optionally. |
| `precision` | Precision | Accuracy driver, focused-move bonus | Feeds hit probability sigmoid; acuity effects. |
| `recovery` | Recovery | Accumulator decay rate τ modifier | High recovery → faster return to accumulator baseline between hits. |
| `coupling` | Coupling | Accumulator impulse magnitude (outgoing) | How aggressively this creature builds accumulators on its targets per hit. |

**Important separation:** `physical_mitigation` and `special_mitigation` govern **endurance loss** (S depletion) through the saturation pipeline. They do **not** govern status resistance. Status resistance is a separate `status_guard` vector per creature instance (per affinity family and global), addressed separately in the outcome partition (§10.3).

**Derived stats (cached per battle tick, not stored):**

```
effective_physical_offense = physical_offense * product(active_modifiers_offensive)
effective_physical_mitigation = physical_mitigation * product(active_modifiers_defensive)
  * (1 - γ * tanh(fracture))   ← Layer 3 fracture coupling
... same pattern for all nine stats
```

---

## 5. Material Profile (Twelve Axes)

All components normalized to approximately [0, 1]. Rolled at spawn from biome-shaped Beta distributions. **Not** set by species.

| Component | Physics Meaning | Key Layer 2/3 Effects |
|---|---|---|
| `thermal_mass` | Heat stored per unit temperature change | τ in heat_load ODE; dampens spikes in both directions |
| `conductivity` | Thermal + electrical transmission rate | Galvanic chain multiplier; heat equilibration speed |
| `rigidity` | Brittleness vs flexibility (0=rubber, 1=ceramic) | Fracture ψ coefficient; Cryo vulnerability; concussive transmission |
| `porosity` | Fluid-accessible void fraction | wetness retention; corrosion ingress; laceration depth |
| `polarity` | Electric dipole strength (permanent or induced) | charge_buildup leakage rate; Galvanic resonance hooks |
| `density` | Mass per volume; inertia | Void scaling; sonic impedance Z≈ρv; concussive baseline resistance |
| `elasticity` | Deformation energy storage and return | Concussive rebound on contact; laceration healing analog |
| `reflectivity` | Electromagnetic surface reflectance | Reduces Luminous damage; high values → beam reflect Layer 2 rules |
| `acoustic_impedance` | Z≈ρ×sound_speed; mismatch → reflection | Sonic attack efficiency; mismatch reflects coupling away |
| `chemical_reactivity` | Kinetics multiplier | corrosion impulse ∝ reactivity^1.5 × porosity |
| `magnetization` | Ferro/paramagnetic susceptibility | magnetic_flux accumulator sensitivity; GA/PL hooks |
| `permeability` | Gas/fluid penetration through body volume | Corrosive DoT ingress; Aero dehydration rate; deep-tissue flooding |

**Composite shortcuts** (computed once per tick, cached for predicate rules):

```
acoustic_transparency    = 1.0 - acoustic_impedance
fracture_susceptibility  = rigidity * (1.0 - elasticity)
corrosion_rate           = chemical_reactivity * porosity
ionic_coupling           = conductivity * polarity
thermal_stability        = thermal_mass * (1.0 - conductivity)
void_compression_factor  = density * (1.0 - elasticity)
```

---

## 6. Affinities (Twelve IDs)

MVP ships nine; three (SO, CR, PL) are content-locked until Phase 2 hooks land. All twelve participate in the same Layer 1–3 machinery from day one in the engine; content lock means no wild instances or player moves use those IDs initially.

| ID | Name | Theme | Playstyle | Layer 3 Key Built |
|---|---|---|---|---|
| `TH` | **Thermal** | Heat, combustion, convection | Pressure buildup; long-fight heat accumulation | `heat_load` |
| `CY` | **Cryo** | Cold, entropy, phase transition | Tempo pressure; brittle setup; heat_load drain | `cryo_load`, `heat_load` (negative) |
| `AQ` | **Aqueous** | Liquids, solutions, pressure gradients | Utility; sets wetness; enables downstream chains | `wetness` |
| `GA` | **Galvanic** | Charge, circuits, electromagnetic induction | Control; chains via conductivity; arc spikes | `charge_buildup`, `magnetic_flux` |
| `MI` | **Mineral** | Stone, crystal, metals, grounding | Physical mitigation; rigidity/shatter combos | `fracture` (resists), acoustic ground |
| `FL` | **Flora** | Biomass, vines, spores, mycelium | Sustain; DoT drains; long-fight; `bio_resonance` | `bio_resonance` |
| `AE` | **Aero** | Gas, pressure waves, turbulence | Evasion hooks; spreads and clears field accumulators | (clears wetness, sonic_stress) |
| `LU` | **Luminous** | Light, lasers, UV, radiation | Surge-focused pierce; bypasses material paths | `radiation` |
| `VO` | **Void** | Gravity, vacuum, isolation, compression | Compression on S_max; removes medium | `compression` |
| `SO` | **Sonic** | Sound waves, resonance, vibration, impedance | Setup/detonate combos; resonant shattering | `sonic_stress` |
| `CR` | **Corrosive** | Acid/base chemistry, oxidation kinetics | Armor erosion over time; long-fight specialization | `corrosion` |
| `PL` | **Plasmic** | Ionized plasma, 4th-state matter | High burst; ionization field coupling | `ionization` |

---

## 7. Baseline Affinity Chart CHART₀

This is the **prior** for Layer 1 computation. The resolved `m1` is shaped continuously from this baseline using emphasis vectors, stats, materials, and field (see §11). This table is not the final matchup — it is the physics-motivated starting point.

**Reading:** Row = attacking move's affinity. Column = defending creature's dominant affinity. Value = baseline m1 prior before dynamic reshape.

`2.0` = strong advantage · `1.5` = advantage · `1.0` = neutral · `0.75` = resist · `0.5` = strong resist · `0.0` = immune

| ATK↓ DEF→ | TH | CY | AQ | GA | MI | FL | AE | LU | VO | SO | CR | PL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **TH** | 0.5 | **2.0** | 0.75 | 0.75 | 0.75 | **2.0** | **1.5** | 0.75 | 0.5 | 1.0 | **1.5** | 0.5 |
| **CY** | 0.5 | 0.5 | **1.5** | 1.0 | **1.5** | **1.5** | 1.0 | 1.0 | 0.75 | 0.75 | **1.5** | 0.5 |
| **AQ** | 0.75 | 0.75 | 0.5 | **1.5** | **1.5** | 0.75 | 1.0 | 1.0 | 0.5 | **1.5** | 0.75 | **1.5** |
| **GA** | 1.0 | 1.0 | **1.5** | 0.5 | 0.5 | **1.5** | **2.0** | 1.0 | 0.75 | **1.5** | 1.0 | 0.5 |
| **MI** | 1.0 | 1.0 | 0.75 | **2.0** | 0.75 | **1.5** | 1.0 | 0.75 | 0.75 | **2.0** | 0.5 | 0.75 |
| **FL** | 0.5 | 0.5 | **1.5** | 0.5 | 0.5 | 0.75 | 0.75 | 1.0 | **1.5** | 1.0 | 0.5 | 0.5 |
| **AE** | 0.75 | **1.5** | **1.5** | 0.75 | 0.5 | **1.5** | 0.5 | 0.75 | 0.5 | 0.75 | **1.5** | 0.75 |
| **LU** | 1.0 | **1.5** | 1.0 | **1.5** | 0.75 | 1.0 | **1.5** | 0.5 | 0.5 | **1.5** | **1.5** | 0.75 |
| **VO** | **1.5** | 0.75 | **1.5** | **1.5** | **1.5** | **2.0** | **2.0** | 0.75 | 0.5 | **2.0** | 1.0 | **1.5** |
| **SO** | 1.0 | **1.5** | **1.5** | 0.75 | **2.0** | 1.0 | 0.5 | 0.75 | **0.0** | 0.5 | 1.0 | **1.5** |
| **CR** | 0.75 | 1.0 | **1.5** | **1.5** | **2.0** | **1.5** | 0.75 | 0.75 | 0.5 | 1.0 | 0.5 | 1.0 |
| **PL** | 0.75 | **2.0** | **2.0** | 0.75 | **1.5** | **2.0** | **1.5** | 1.0 | 0.75 | **1.5** | **1.5** | 0.5 |

**Notable physics rationale (inform tutorial copy):**

- GA→AE: 2.0 — lightning discharges through ionized air (dielectric breakdown)
- GA→AQ: 1.5 — ionic solution is a conductor; current paths through body
- MI→GA: 2.0 — electrical grounding; Faraday cage effect
- SO→MI: 2.0 — resonant frequency shattering of crystal lattice (Tacoma Narrows)
- SO→VO: 0.0 — sound requires a medium; vacuum blocks wave propagation entirely
- VO→AE: 2.0 — vacuum removes the gas Aero creatures depend on
- CR→MI: 2.0 — acid dissolves minerals: H⁺ + CaCO₃ → CO₂ + H₂O
- PL→FL: 2.0 — plasma instantly incinerates organic matter
- TH→CR: 1.5 — Arrhenius: heat accelerates reaction rates exponentially (k = Ae^{−Ea/RT})
- CY→MI: 1.5 — freeze-thaw cycling shatters rock (real geological weathering)

---

## 8. The Dynamic Move System — Ability Composer

### 8.1 Core design intent

Players do not choose from a fixed list of named spells. They choose a **frame** and compose a **move instance** by making a series of decisions within the frame's envelope. The result is a unique, precisely tuned move. Two players using the "Blast" frame can end up with completely different moves optimized for different matchups.

The name assembles automatically from the choices made. The system rewards deep thinking about physics matchups rather than moveset memorization.

### 8.2 The eight frame categories

| Category | What It Is | Saturates Against |
|---|---|---|
| `strike` | Contact / physical hit | `physical_mitigation` |
| `surge` | Energy / field packet | `special_mitigation` |
| `true` | Direct endurance loss; skips saturation | (no mitigation saturation) |
| `field` | Rewrites arena field scalars | (no direct endurance damage) |
| `reactive` | Triggered response; declared in Primed stance | Varies by sub-type |
| `channel` | Sustained beam/drain over subticks | Varies by sub-type |
| `resonance` | Scales with Resonance allocation in a stat | Varies by sub-type |
| `catalyst` | Primes a combo charge on target | (sets flag; minimal damage) |

### 8.3 Composer panels (ordered)

Each panel is a decision point in the UI. Together they produce the move instance persisted to the database.

---

**Panel 1 — Category**
Pick one of the eight categories above. This determines which defense stat is saturated and which subsequent panels are available.

---

**Panel 2 — Frame**
Pick a frame within the chosen category. The frame defines:
- `base_power` min/max band
- `accuracy` min/max band
- Which effect hook families are allowed (e.g., only Blast frames can carry `radiation` impulse)
- Cooldown scaling formula
- Default display seed word (the root of the auto-generated name)

Illustrative frame roster:

| Frame ID | Display Seed | Category | Notes |
|---|---|---|---|
| `blast` | Blast | surge | General energy burst; wide affinity range |
| `lance` | Lance | surge | High pierce; low concussive ω |
| `burst` | Burst | surge | Short range; higher spread potential |
| `siphon` | Siphon | surge | Steals accumulator; low endurance damage |
| `prism` | Prism | surge | Multi-affinity fusion; `affinity_weights` enabled |
| `noiseburst` | Noiseburst | surge | Sonic-gated; high `sonic_stress` impulse |
| `collapse` | Collapse | surge | Void-gated; compression delivery |
| `slam` | Slam | strike | High concussive ω default; low pierce |
| `thrust` | Thrust | strike | High piercing ω default; high `pierce` band |
| `rend` | Rend | strike | High slashing ω default; high `laceration` impulse |
| `tempered` | Tempered | strike | Balanced ω; bonus on `focused` status |
| `gale_drive` | Gale Drive | strike | Aero-gated; spreads attacker accumulators |
| `spike` | Spike | true | Fixed endurance loss; no saturation |
| `field_seed` | Field Seed | field | Arena scalar rewrite |
| `focus_bridge` | Focus Bridge | channel | Sustained; ramp builds each subtick |
| `parried_arc` | Parried Arc | reactive | Fires on-hit trigger |
| `etch` | Etch | catalyst | Primes `acid_primed` combo charge |
| `resonance_surge` | Surge | resonance | Scales with Resonance allocation |

---

**Panel 3 — Affinity**
- **Primary affinity:** one of twelve IDs (or `null` for non-elemental)
- **Secondary affinity (optional):** must differ from primary
- **Blend eta η:** continuous in [0.0, frame_max_eta]; controls primary/secondary blend in m1
- **Advanced — `affinity_weights` simplex:** for multi-fusion builds (e.g., 40% TH, 35% GA, 25% none). Only available if frame allows it.

The STAB bonus applies if the attacker's `affinity_emphasis` score on the move's primary affinity exceeds a threshold:
```
stab_factor = 1.0 + stab_scale * tanh(attacker.affinity_emphasis[move.primary_affinity] / stab_ref)
```
This makes STAB a smooth continuous bonus proportional to how strongly the creature embodies that affinity, not a binary on/off.

---

**Panel 4 — Modality shape (ω simplex)**
Three non-negative weights summing to 1.0: **Bludgeon · Pierce · Slash**

In schema: `{concussive: ω_c, piercing: ω_p, slashing: ω_s}`

For `strike` moves → stored as `strike_modalities`, saturates vs `physical_mitigation`  
For `surge` moves → stored as `delivery_modalities`, saturates vs `special_mitigation`

The frame sets default ω and min/max bands per axis. "Thrust" defaults to `{0.1, 0.75, 0.15}` with high piercing floor. "Slam" defaults to `{0.85, 0.10, 0.05}` with high bludgeon floor.

Also in this panel: **`pierce`** scalar [0.0, frame_max_pierce]. This is armor bypass applied *after* the ω split — see §9 for the distinction.

---

**Panel 5 — Potency**
- **`base_power`:** continuous in frame band. Higher power → more endurance damage → longer cooldown.
- **`accuracy`:** continuous in frame band.
- **`cooldown_turns`:** derived from `cooldown_scaling(base_power)` per frame formula; not independently slidable (anti-spam contract).

---

**Panel 6 — Outcome budget**
Continuous shares summing to 1.0. Splits where the move's resolved coupling budget lands:

| Share | Field | What It Does |
|---|---|---|
| α | `endurance_share` | Fraction → direct S depletion on defender |
| β | `status_guard_shred_share` | Fraction → smooth delta on defender's `status_guard` vector (softens their status resist for future riders) |
| γ | `status_delivery_share` | Fraction → amplifies proc reliability and potency ceiling of status payloads on *this* hit |
| φ | `utility_field_share` | Fraction → drives arena transition (field moves primarily) |
| ψ | `utility_pressure_share` | Fraction → transient stat penalties on foes during field transition |

Pure endurance move: α=1.0, others=0. Status specialist: large γ, reduced α. Field controller: large φ, moderate ψ.

---

**Panel 7 — Effects and riders**

| Bucket | Field | Content |
|---|---|---|
| Status payloads | `status_payloads[]` | Array of `{status_id, lane, potency, duration, proc_chance}`. Bounded per frame. |
| Accumulator impulses | `accumulator_impulses{}` | Map of `{accumulator_key: delta}`. Keys from §13 registry. Bounded per frame. |
| Passive hooks | `passive_hooks[]` | Optional passive-flavored effects: aura ticks, stance couplings, affinity bias. |

---

### 8.4 Dynamic display name assembly

The name is **deterministic** given the move instance. No manual naming required (player can set an optional nickname in addition, not instead).

**Assembly rules:**
1. Start with the frame's display seed word (e.g., "Blast")
2. If primary affinity is set and has prominence (affinity_emphasis > 0.3): prepend affinity display name (e.g., "Thermal Blast")
3. If secondary affinity is set and η > 0.3: append secondary as a suffix word (e.g., "Thermal Blast — Corrosive")
4. If a modality ω is dominant (> 0.65) AND it is non-default for this frame: prepend modality adjective

| Modality | Adjective |
|---|---|
| concussive-dominant | Crushing / Driving / Hammering |
| piercing-dominant | Piercing / Lancing / Penetrating |
| slashing-dominant | Rending / Shearing / Cutting |

5. If a status payload has proc_chance > 0.70 AND the status is thematic (e.g., `seared` on Thermal): append status hint (e.g., "Scorching Thermal Blast")
6. If category is `channel`: prepend "Sustained"
7. If category is `catalyst`: append "— Primed"
8. Balanced modality ω (no dominant) → no modality adjective
9. Silent defaults (no affinity, standard ω for frame) → just the frame word

**Examples:**

| Choices Made | Generated Name |
|---|---|
| Blast frame, TH primary, default ω | "Thermal Blast" |
| Blast frame, TH primary, AQ secondary η=0.4, default ω | "Thermal Blast — Aqueous" |
| Slam frame, no affinity, crushing ω=0.90 (non-default) | "Crushing Slam" |
| Thrust frame, LU primary, pierce=0.70, high piercing ω | "Luminous Lance" |
| Focus Bridge frame, TH primary | "Sustained Thermal Focus Bridge" |
| Etch frame, CR primary | "Corrosive Etch — Primed" |
| Blast frame, no affinity, balanced ω, no status | "Blast" |

Player nickname (optional): displayed as headline. System-generated title: displayed as subtitle always. Replay always records system title for disambiguation.

### 8.5 Frame envelopes enforce balance

The economy has three layers:

| Layer | Mechanism |
|---|---|
| Frame envelope | Hard min/max per knob. Can't exceed. |
| Loadout budget | Total budget across all 4 move slots. High-power moves cost more budget, leaving less for other moves. |
| Cooldown curve | `cooldown = base_cooldown * (base_power / power_ref)^exponent` per frame. Stronger moves take longer to reuse. |

Dragging every slider to max is not the optimal strategy — it produces one slow, expensive move and three weak ones.

---

## 9. Move Instance Fields — Complete Schema

Every move in the database (player-built or procedurally generated) has these fields:

```typescript
interface MoveInstance {
  // Identification
  move_id: string;                    // UUID
  frame_id: string;                   // e.g. "blast", "slam"
  system_display_title: string;       // auto-generated; deterministic
  move_nickname?: string;             // optional player label

  // Category
  category: 'strike'|'surge'|'true'|'field'|'reactive'|'channel'|'resonance'|'catalyst';

  // Affinity
  primary_affinity?: AffinityID;      // null → non-elemental
  secondary_affinity?: AffinityID;    // optional; must differ from primary
  blend_eta: number;                  // [0, frame_max_eta]; blend of primary/secondary in m1
  affinity_weights?: Record<AffinityID, number>; // advanced multi-fusion; sums to 1

  // Modality (ω simplex) — use one field depending on category
  strike_modalities?: {concussive: number, piercing: number, slashing: number}; // strike only
  delivery_modalities?: {concussive: number, piercing: number, slashing: number}; // surge only

  // Potency
  base_power: number;                 // within frame band
  accuracy: number;                   // [0, 100] within frame band
  cooldown_turns: number;             // derived; not independently set
  pierce: number;                     // [0, frame_max_pierce]; armor bypass scalar

  // Outcome budget (sums to 1.0)
  endurance_share: number;            // α
  status_guard_shred_share: number;   // β
  status_delivery_share: number;      // γ
  utility_field_share: number;        // φ (field/utility moves)
  utility_pressure_share: number;     // ψ (field/utility moves)

  // Effects
  status_payloads: StatusPayload[];
  accumulator_impulses: Record<AccumulatorKey, number>;
  passive_hooks: PassiveHook[];
  infusion_coeffs: Record<string, number>; // advanced continuous tuning

  // Channel-specific (category: channel)
  channel_duration?: number;          // subtick count
  ramp_eta?: number;                  // exposure ramp factor

  // Reactive-specific (category: reactive)
  reactive_trigger?: ReactiveTrigger;
  reactive_condition?: string;        // predicate string

  // Catalyst-specific (category: catalyst)
  catalyst_id?: string;               // combo charge key primed on target
  catalyst_duration_turns?: number;

  // Combo detonation
  combo_detonate?: string;            // combo charge key consumed for bonus
  combo_bonus_mult?: number;          // damage multiplier when detonating

  // Misc
  priority_tier: number;              // [-3, +3]; default 0
  contact: boolean;                   // triggers contact-based passives
  tags: string[];                     // predicate tags: "thermal", "aqueous", "contact", ...
  patch_hash: string;                 // content hash for replay versioning
}
```

**Important:** `strike_modalities` XOR `delivery_modalities` — never both. Category determines which field is used.

**`pierce` vs piercing ω — never confuse these:**
- **`pierce` (scalar):** "How much of the defender's mitigation stat do we ignore?" Applied per channel after ω splits the hit. This is armor bypass / shield-break tuning.
- **`piercing` component of ω:** "What fraction of this attack's coupling uses stab-shaped geometry?" Determines which material ψ kernels apply, which saturation branch runs, how much feeds `fracture`. A bludgeoning shockwave can have `pierce=0.80` (ignores armor) with `ω={0.9,0.05,0.05}` (shaped like a hammer, not a needle). These are fully independent.

---

## 10. The Damage Pipeline

Execute steps in strict order. Each step is labeled so audit logs and replays can name every modifier.

```
Start hit
  → §10.1 Hit resolution (accuracy → miss or proceed)
  → §10.2 Effective defense computation (pierce trim per channel)
  → §10.3 Level scaling S_L
  → §10.4 Core saturation D_core
     ├─ Single path (surge fallback or true): one σ
     └─ Modality blend (strike/surge with ω): three parallel σ → blend
  → §10.5 Outcome budget split (α·D_core → endurance; β → status_guard; γ → status amplify)
  → §10.6 Layer 1 m1 (dynamic, bounded — see §11)
  → §10.7 Layer 2 predicate rules m2, flat2 (see §12)
  → §10.8 Layer 3 accumulator impulses (see §13)
  → §10.9 Crit and variance RNG
  → §10.10 Final application → ΔS on defender
  → Emit HitResolved {stamina_loss, breakdown{...all multipliers, modalities...}}
```

### 10.1 Hit resolution

```
p_hit = clamp(0, 1, accuracy_factor(attacker.precision) / evasion_factor(defender.initiative))
```

Physics-shaped upgrade (optional, author coefficients in balance JSON):
```
p_hit = sigmoid(α_acc + β_acc * attacker.precision_eff - γ_acc * defender.initiative_eff)
```

If miss: emit `miss`, ΔS=0, no on-hit Layer 2 triggers, no accumulator impulses.

### 10.2 Effective defense and pierce

Single-path (surge fallback):
```
Def_eff = relevant_mitigation_eff * (1 - pierce_move * λ_p)
```

Modality-blend path: pierce is applied per channel after ω split with channel-specific weights:
```
D_k = R_k * (1 - pierce_move * λ_k * λ_p)   for k ∈ {con, pier, slas}
```
where `λ_pier ≈ 1.0`, `λ_con` and `λ_slas` are smaller (data-tuned).

### 10.3 Level scaling

```
S_L = (c0 + c1 * L_attacker) / (c2 + c3 * L_defender)
```
Coefficients in `scaling_curves.json`. Prevents low-level stat exploits.

### 10.4 Core saturation

Let A = effective offense, D = effective defense post-pierce.

```
x = max(A / ε, ε)          -- ε = small constant; avoids division hazard
y = D / x                  -- defense-heavy ratio
σ = 1 - exp(-κ / (1 + y)) -- bounded (0,1); smooth nonlinear
D_core = F_scale * base_power_modified * σ * S_L
```

**Modality blend variant (strike with ω, or surge with delivery ω):**

For each channel k ∈ {con, pier, slas}:
```
R_k = B_eff * ψ_k(M_d)       -- B_eff = physical_mitigation_eff (strike) or special_mitigation_eff (surge)
                               -- ψ_k = material kernel from scaling_curves.json
D_k = R_k * (1 - pierce * λ_k * λ_p)
x   = max(A / ε, ε)
y_k = D_k / x
σ_k = 1 - exp(-κ / (1 + y_k))
D_core_k = F_scale * base_power_modified * σ_k * S_L
```

Blend:
```
D_core = ω_c * D_core_con + ω_p * D_core_pier + ω_s * D_core_slas
```

**Material kernels ψ (toy fidelity — author in `scaling_curves.json`):**
- `ψ_con(M)`: rises with `rigidity` (rigid shells transmit shock) and `density`; falls with `elasticity` (compliant absorbs)
- `ψ_pier(M)`: rises with `rigidity` (hard to penetrate) unless `fracture` high (softened face); modulated by `acoustic_impedance`
- `ψ_slas(M)`: mixes `rigidity` (cut resistance) with `porosity` and wetness hooks

### 10.5 Outcome budget application

```
stamina_budget     = α * D_core  → goes to step 10.9 and then ΔS
status_guard_delta = β * D_core  → smooth delta on defender.status_guard[] (logged per affinity lane)
status_amp         = γ * D_core  → scale status_payloads proc reliability / potency ceiling this hit
field_push         = φ * D_core  → integrate field_state toward authored target profile (field moves)
pressure_delta     = ψ * D_core  → transient debuffs on defender stats_eff or accumulator influx
```

### 10.6 Layer 1 — m1 (see §11 for full formula)

```
m1 = compute_m1(move.affinity_weights, attacker.affinity_emphasis, defender.affinity_emphasis,
                defender.material_profile, field, move.infusion_coeffs)
m1 = clamp(m_min, m_max, m1)
```

### 10.7 Layer 2 — predicate rules

```
m2 = 1.0; flat2 = 0.0
for rule in sorted(all_rules, key=priority):
  if rule.when(battle_context):
    m2 *= rule.mult ?? 1.0
    flat2 += rule.add ?? 0.0
    apply_side_effects(rule)   -- accumulator bumps, status primes, etc.

D_after_layers = stamina_budget * m1 * m2 + flat2
```

### 10.8 Layer 3 accumulator impulses

```
for (key, delta) in move.accumulator_impulses:
  delta_effective = delta * attacker.coupling_eff * coupling_scale
  u_d[key] = clamp(u_d[key] + delta_effective, u_min[key], u_max[key])

-- Also: any Layer 2 side effects that bumped accumulators
-- Apply accumulator → stat coupling:
  physical_mitigation_eff *= (1 - γ_frac * tanh(u_d.fracture))
  heat_load → seared/hypothermic threshold checks (see §14)
  etc.
```

### 10.9 Crit and variance

```
C = if bernoulli(p_crit): crit_bonus else 1.0     -- seeded RNG
Ξ = 1 + uniform(-δ, +δ)                           -- δ ≈ 0.03
D_final_raw = D_after_layers * C * Ξ
```

E[ΔS | hit] = D_after_layers * (1 + p_crit*(crit_bonus-1)) — use this for build previews (before floor).

### 10.10 Final application

```
stamina_loss = max(0, floor(D_final_raw))
S_d -= stamina_loss
emit HitResolved {
  stamina_loss,
  breakdown: {
    D_core, m1, m2, flat2, C, Ξ,
    modalities: {ω, σ_k, D_core_k},   // when ω blend used
    outcome_budget: {α, β, γ, φ, ψ},
    accumulator_impulses_applied,
    rules_fired: [rule_id, ...],
    layer2_multipliers: {m2_per_rule},
    miss: false
  }
}
```

---

## 11. Layer 1 — Dynamic m1

m1 is a **smooth, bounded, deterministic** function of the battle snapshot. Not a table lookup. CHART₀ provides the physics-motivated prior; creature stats, materials, emphasis vectors, and field reshape it continuously.

```python
def compute_m1(move, attacker, defender, field):
  # Step 1: Baseline from CHART₀ with emphasis blending
  # attacker side: dot product of move.affinity_weights with CHART₀[*][defender_dominant_row]
  # defender side: weighted blend across defender.affinity_emphasis
  B = sum(
    move.affinity_weights[a_id] * sum(
      defender.affinity_emphasis[d_id] * CHART0[a_id][d_id]
      for d_id in all_affinity_ids
    )
    for a_id in all_affinity_ids
  )
  # B is a smooth weighted average of the baseline chart

  # Step 2: Attacker alignment — how strongly the attacker embodies this move's affinities
  A_att = dot(normalize(attacker.affinity_emphasis), move_affinity_axis(move))
  # → positive when attacker is "in their element"

  # Step 3: Defender resistance — material and stat shaped
  R_def = resist_kernel(
    defender.material_profile,
    defender.stat_eff,
    move.primary_affinity,
    move.tags,
    field
  )
  # resist_kernel is authored per affinity; smooth, bounded [0, 1]
  # Examples: Mineral resist_kernel for Corrosive = f(chemical_reactivity, porosity)
  #           Thermal resist_kernel = f(thermal_mass, conductivity)

  # Step 4: Compose
  # κ1, κ2 from scaling_curves.json
  m1_raw = B * exp(κ1 * tanh(A_att)) * exp(-κ2 * tanh(R_def))

  # Step 5: STAB — continuous, not binary
  stab = 1.0 + stab_scale * tanh(attacker.affinity_emphasis[move.primary_affinity] / stab_ref)
  m1_raw *= stab

  # Step 6: Infusion gates (optional per frame)
  m1_raw *= infusion_gate(move.infusion_coeffs, field)

  # Step 7: Clamp
  return clamp(m_min, m_max, m1_raw)
  # m_min and m_max from balance JSON; typical: [0.0, 2.0]
```

**Requirements:**
- Deterministic given sealed battle snapshot. No hidden RNG in Layer 1.
- Beginner UI: show rounded m1 + color bucket (weak/neutral/sharp)
- Analyst UI: show contributing terms (B, A_att, R_def, stab, infusion_gate values)
- Balance tooling: compute ∂m1/∂(defender.material[k]) numerically per matchup for sensitivity reports

---

## 12. Layer 2 — Predicate Rules

Rules are authored as YAML data and evaluated in priority order (stable sort) after m1. Each rule fires at most once per hit resolution.

**Rule schema:**
```yaml
rule_id: "thermal_shock"
priority: 100          # lower = fires earlier
when:
  - tag_on_move: "cryo"
  - accumulator_gt: [heat_load, 0.60]
  - material_gt: [rigidity, 0.65]
then:
  mult: 1.35
  accumulator_delta:
    fracture: 0.18
    heat_load: -0.30   # rapid cooling consumes heat
  status_apply:
    target: defender
    status_id: fractured
    proc_chance: 0.40
  log_line: "Thermal shock! The heat differential fractures the rigid surface."
```

**Complete example rule set (illustrative — numbers from balance JSON):**

| Rule ID | When | Then |
|---|---|---|
| `thermal_shock` | Cryo move + defender heat_load>0.60 + rigidity>0.65 | m2×1.35; fracture+0.18; heat_load−0.30 |
| `superconduct` | Galvanic move + (defender wetness>0.50 OR conductivity>0.80) | Temporary pierce on special_mitigation |
| `steam_expansion` | Thermal move + defender wetness>0.50 | Drain wetness−0.40; m2×1.30; initiative penalty |
| `armor_pierce_align` | Move tag `armor_piercing` + defender fracture>0.60 | Pierce scalar boost; add to audit trail |
| `concussion_spike` | concussion>0.70 + defender has no stance buff | Accuracy slump −30%; initiative −20% |
| `open_shear` | laceration rising + slashing hit + defender wetness>0.40 | DoT potency cap amplified |
| `resonant_fracture` | Sonic move + defender sonic_stress>0.30 + rigidity>0.60 | m2×1.60; fracture+0.25 |
| `acid_etch_detonate` | Move has combo_detonate=`acid_primed` + target has acid_primed flag | m2×1.80; remove acid_primed |
| `flash_freeze` | Cryo move + defender wetness>0.60 within 1 turn of AQ move | m2×1.60; frozen status proc |
| `lightning_rod` | Galvanic move + terrain_id=`conductive_stone` | m2×1.70; charge_buildup doubles |
| `photoelectric_strike` | Luminous surge > ward threshold + within 2 turns | Galvanic follow-up: ×1.45; charge_buildup+0.25 |

**Evaluation caps:** Maximum 16 rules per hit for CPU predictability. Rule linter in tooling detects contradictions and unreachable predicates.

---

## 13. Layer 3 — Accumulator Registry

All 14 accumulators. Per-combatant unless stated. Starting values from field snapshot at encounter start, not from species. Keys are stable — ship MVP subset, Phase 2 adds the rest without renaming.

| Key | Ship | Build Sources | Role | Status Gate |
|---|---|---|---|---|
| `fracture` | MVP | Heavy strikes; Cryo on rigid; seismic | Reduces `physical_mitigation_eff` via tanh coupling | `fractured` |
| `heat_load` | MVP | Thermal moves; field ambient_temp | Hot/cold DoT thresholds; Seared/Hypothermic | `seared`, `hypothermic` |
| `wetness` | MVP | Aqueous moves; humidity | Galvanic chain; steam rules | `waterlogged` |
| `concussion` | MVP | Concussive-dominant hits (ω_con) | Initiative/precision decay | `concussed` |
| `laceration` | MVP | Slashing-dominant hits; high porosity | Bleed dS/dt channel | `bleeding` |
| `charge_buildup` | MVP | Galvanic moves; passive generation; ionization overflow | Paralysis | `paralyzed` |
| `cryo_load` | Phase 2 | Cryo sustained; cold biomes | Works with low heat_load for freeze | `frozen` (with hypothermic) |
| `corrosion` | Phase 2 | Corrosive moves; catalyst primes | Armor/mitigation shred over time | `corroded` |
| `radiation` | Phase 2 | Luminous high-intensity; irradiation biomes | Special mitigation pressure; slow DoT | `irradiated` |
| `sonic_stress` | Phase 2 | Sonic moves; reflective material feedback | Resonance combos; deafening | `deafened` |
| `ionization` | Phase 2 | Plasmic moves; charge_buildup overflow | Field coupling for GA/PL allies | `ionized` |
| `magnetic_flux` | Phase 2 | Sustained Galvanic/Plasmic | Modulates GA/PL received damage | (hooks, minor flags) |
| `compression` | Phase 2 | Void moves; vacuum biomes | S_max compression; vitality pressure | minor VO stress flag |
| `bio_resonance` | Phase 2 | Flora sustained; rainforest biomes | Fuels Flora passive economy | ability gates |

### 13.1 ODE sketches (authoritative coefficients in `accumulators.json`)

```
fracture:      dF/dt = η * I_strike * ψ(rigidity) - λ_F * F
heat_load:     dH/dt = α_TH * thermal_intensity - (H - T_ambient) / τ(thermal_mass)
wetness:       dW/dt = β1 * humidity * porosity - β2 * W * (1 - humidity) - β3 * φ(aero_wind)
concussion:    dC/dt = ζ_in * ω_con * J_hit - C / τ_C(stamina, initiative)
laceration:    dL/dt = ξ_in * ω_slas * φ(W, porosity) * J_hit - γ_clot(M, L) * L
charge_buildup: dQ/dt = γ_in(galvanic_flux) - ρ(conductivity, W) * Q
cryo_load:     dK/dt = α_CY * cryo_intensity + max(0, T_threshold - H) / τ_cryo - μ_K * K
corrosion:     dR/dt = ξ_CR * CR_flux * chemical_reactivity * porosity - δ_R * R
radiation:     dRad/dt = φ_rad * LU_power_above_threshold - μ_rad * Rad  (slow decay)
sonic_stress:  dS/dt = ζ_SO * SO_flux * acoustic_transparency - S / τ_SO(acoustic_impedance)
ionization:    dI/dt = γ_PL * PL_flux + ε * max(0, Q - Q_overflow) - ρ_ion * I
magnetic_flux: dM/dt = ν_in * (GA_flux + PL_flux) * magnetization - σ_leak * M
compression:   dV/dt = κ_VO * VO_flux * (1 - elasticity) - χ_V * V
bio_resonance: dB/dt = ρ_FL * FL_flux * sqrt(luminance_field) - ε_bio * B
```

**Recovery stat coupling:**
```
τ_effective(u) = τ_base(u) * (1 + α_recovery * recovery_eff / 100)
```
High `recovery` stat → faster return to baseline for all accumulators.

**Coupling stat coupling (outgoing impulses):**
```
impulse_applied = impulse_authored * (1 + β_coupling * coupling_eff / 100)
```

### 13.2 Cross-coupling (dominant pathways — tune weights in balance JSON)

| Driver ↑ | heat_load | wetness | fracture | charge_buildup | corrosion | ionization |
|---|---|---|---|---|---|---|
| heat_load ↑ | — | evaporates ↓ | CY combo accel | slight joule ↑ | Arrhenius accel ↑ | plasma heating ↑ |
| wetness ↑ | cools ↓ | — | — | leakage accel ↑ | solvent accel ↑ | — |
| fracture ↑ | — | — | — | — | surface area ↑ | — |
| charge_buildup ↑ | slight ↑ | — | — | — | electrochemical ↑ | overflow → ↑ |
| corrosion ↑ | — | — | accelerates ↑ | accelerates ↑ | — | slight ↑ |
| sonic_stress ↑ | — | — | resonance accel ↑ | — | — | — |

### 13.3 Accumulator → stat coupling (how Layer 3 reshapes the pipeline)

```
physical_mitigation_eff *= (1 - γ_frac * tanh(fracture))
initiative_eff          *= (1 - γ_conc * tanh(concussion))
precision_eff           *= (1 - γ_conc * 0.5 * tanh(concussion))
S_max                   *= (1 - γ_comp * tanh(compression))    -- Void
special_mitigation_eff  *= (1 - γ_rad  * tanh(radiation))
```

---

## 14. Status Conditions

Statuses are **threshold-crossing events**: a Layer 3 accumulator value crosses a boundary, and a persistent modifier is added to the battle context. They are distinct from accumulators (continuous scalars) — statuses are on/off states (or tiered) with specific mechanical effects.

Status resist is the `status_guard` vector on the creature instance (per affinity family + global). The β outcome budget share depletes this vector. Creatures can be high `physical_mitigation` (tanks endurance well) but low fire `status_guard` (still ignites easily). These are completely independent surfaces.

### 14.1 Twelve status conditions

| ID | Trigger | Active Effects | Cure Conditions | Physics Hook |
|---|---|---|---|---|
| `seared` | heat_load > 0.85 | DoT 3% S_max/turn; physical_offense −10%; no HP regen | Aqueous move OR ambient cooling over 3 turns | Sustained heat above tissue tolerance threshold |
| `hypothermic` | heat_load < −0.60 | initiative −25%; special_offense −15%; DoT 2% S_max/turn | Thermal move OR ambient warmth over 3 turns | Cold reduces metabolic/enzymatic rate |
| `frozen` | hypothermic AND cryo_load > 0.70 | 50% skip-turn probability; physical_mitigation ×1.20; special_mitigation ×0.70 | Thermal hit (×1.5 bonus against frozen) | Phase transition to solid; rigid but brittle |
| `waterlogged` | wetness > 0.90 | GA damage received ×1.50; AE damage ×1.30; SO damage +25%; initiative −10% | Aero field move OR high ambient_temp over 2 turns | Water saturation: ionic conduction, acoustic transmission both increase |
| `paralyzed` | charge_buildup > 0.80 | initiative −50%; 25% fail-move chance | Mineral grounding move; decay over 4 turns | Neuromuscular disruption; uncontrolled charge; action potential disruption |
| `fractured` | fracture > 0.75 | physical_mitigation −30%; piercing ×1.30 vs this; slashing ×1.20 vs this | Mend moves; slow natural recovery (5 turns) | Structural integrity lost; stress concentrators at crack tips amplify all stress |
| `concussed` | concussion > 0.70 | accuracy −30%; initiative −20%; precision-based effects halved | Recovery stat-based duration (5 - recovery/20); Focus-restore moves | Impulse loading disrupts processing; recovery proportional to severity |
| `bleeding` | laceration > 0.65 | DoT 2.5% S_max/turn; AQ moves extend duration +1 turn per hit | Cryo move (clotting); cauterize moves; 4 turns | Shear-opened vessels sustain fluid loss; cold → vasoconstriction |
| `corroded` | corrosion > 0.75 | physical_mitigation −20%; special_mitigation −20%; CR damage ×1.35 | Aqueous flush; 5 turns (very slow) | Dissolved structural layer; reduced load-bearing cross-section |
| `irradiated` | radiation > 0.60 | special_mitigation −25%; recovery moves 50% effective; DoT 1.5% S_max/turn | Time only (6 turns); rad-flush items | Ionizing radiation disrupts repair mechanisms; lasting |
| `deafened` | sonic_stress > 0.70 | Own Sonic moves deal 0 damage (overwhelmed); precision halved; incoming SO damage −50% | Void affinity move; 3 turns | Acoustic overload saturates receptor; partial immunity at extreme amplitudes |
| `ionized` | ionization > 0.50 | **Ambivalent:** GA and PL damage received ×1.25; passive charge_buildup field effect (+0.01/turn all); if ally is GA/PL their STAB ×1.10 | Mineral grounding OR Aqueous flush | Ionized body becomes charge reservoir; couples EM energy to environment |

### 14.2 Status escalation

Some statuses have severity tiers when their accumulator continues rising past the initial threshold:

```
hypothermic → (cryo_load continues rising) → frozen
waterlogged + GA hit → "chain lightning" Layer 2 rule: AoE surge to nearby allies (PvP ruleset)
paralyzed → (initiative reaches 0) → "locked" (1 turn full action loss)
bleeding → (laceration > 0.90) → "hemorrhage" (DoT doubles; emergency heal required within 3 turns or faint)
```

---

## 15. Damage Over Time and Coupled Flows

DoTs are **first-class dS/dt terms** integrated per subtick. They are not re-run through the full pipeline (no second m1 or Layer 2) unless a rule explicitly routes partial damage back through saturation.

### 15.1 Coupled state equation

Let **u** = all Layer 3 accumulators, **f** = field scalars:

```
dS/dt = - Σ_k potency_k(u) + recovery(S, u)
du/dt = g(u, f, materials, ...)
```

Current endurance S and accumulator vector u evolve between discrete hits. Each hit applies:
- Discrete jump ΔS (from §10 pipeline)  
- Impulse Δu (from move.accumulator_impulses and Layer 2 side effects)

### 15.2 Integration policy

Fixed N subticks per turn (default: 10). Explicit Euler for determinism:
```
u^{n+1} = u^n + Δt * g(u^n, f^n, materials)
```

After each subtick:
1. Evaluate threshold queues (stable priority sort by rule_id)
2. Fire threshold events in order
3. Apply rule effects (multipliers, flat damage, further impulses)

This ordering prevents same-frame races between continuous decay and discrete triggers.

### 15.3 Multi-hit exposure ramp

For moves with multiple hits (H total hits):
```
E_{i+1} = E_i + ΔE(hit_i, defender_posture)
damage_i *= (1 + η * tanh(E_i))
```
Total ΔS = sum across hits. RNG stream advances once per hit. Interpretation: discrete sampling of an exposure intensity curve that rises with defender posture degradation.

### 15.4 Stack policies

| Behavior | Rule |
|---|---|
| Same DoT from same source | Refresh duration; potency capped at source max |
| Same DoT from different sources | Stack up to a global max_stacks; potency harmonic summed |
| Status duration in standby (benched) | Ticks down at 3× rate (benched recovery) |

---

## 16. Stances

### 16.1 Five stances

| Stance | physical_offense / special_offense | physical_mitigation / special_mitigation | initiative | precision | Special Rules |
|---|---|---|---|---|---|
| **Grounded** (default) | ×1.0 | ×1.0 | ×1.0 | ×1.0 | No special rules |
| **Assault** | ×1.20 | ×0.80 | ×1.05 | ×0.90 | Crit rate +8%; cannot declare Reactive moves |
| **Fortified** | ×0.85 | ×1.30 | ×0.80 | ×1.10 | Accumulator impulses received ×0.70; status threshold +15% |
| **Fluid** | ×0.90 | ×0.90 | ×1.25 | ×1.10 | Evasion +15%; switch-out is free action; AQ/AE affinity moves biased |
| **Primed** | ×1.00 | ×0.85 | ×0.95 | ×1.20 | Enables one Reactive move declaration; crit bonus +10%; focused buff +1 turn |

### 16.2 Stance transition rules

- Declaring a stance change is your action for priority tier +1 (happens before standard moves)
- You cannot change stance AND use a move in the same action unless the move has `stance_sets` field (auto-transition after execution)
- Fortified → Assault is blocked in the same turn you take damage exceeding 25% S_max

### 16.3 Stance-accumulator coupling

```
if stance == FORTIFIED:
  Δu_incoming *= 0.70          -- all accumulator impulses received reduced
if stance == ASSAULT:
  Δu_outgoing_self *= 1.15     -- own moves push more accumulator into target
if stance == FLUID:
  wetness     -= 0.03 per turn -- movement disperses moisture
  sonic_stress -= 0.04 per turn -- movement detunes resonance
if stance == PRIMED:
  ionization_self += 0.02 per turn  -- focused mental state creates charge
```

---

## 17. Passive Abilities

### 17.1 Slots by stage

- Stage 1: 1 passive
- Stage 2: 1 passive + 1 passive-or-reactive (player chooses at advancement from species pool)
- Stage 3: 1 passive + 1 reactive + 1 advanced passive

Abilities are authored as Layer 2 rules tagged with the ability_id. Species rows provide the pool (2–3 candidates per slot); players choose which to keep at advancement.

### 17.2 Passive ability examples

| Ability | Affinity | Effect | Physics Hook |
|---|---|---|---|
| **Thermal Inertia** | TH | heat_load decay rate ×0.60 | Thermal mass stores energy longer |
| **Backdraft** | TH | When heat_load drops from >0.70 to <0.20 in one turn: 15% S_max true damage to attacker | Rapid phase transition releases latent heat |
| **Brittle Resonance** | CY | Sonic moves against this creature: fracture impulse ×1.50 | Cold materials have lower fracture toughness |
| **Supercooling** | CY | At heat_load < −0.50: next AQ hit is converted to CY affinity with ×1.50 | Liquid water freezes explosively on contact |
| **Hydraulic Memory** | AQ | AQ-tagged moves gain pierce+0.10 when target wetness > 0.40 | Water exploits pre-existing openings |
| **Charge Accumulation** | GA | +0.015 charge_buildup per subtick passively | High-tension resting state |
| **Arc Discharge** | GA | When charge_buildup > 0.75: free surge (power 60); charge_buildup → 0.30 | Capacitor discharge at breakdown voltage |
| **Load Bearing** | MI | Equivalent to +12% physical_mitigation_eff at mid-armor σ (curve offset) | Structural optimization; pre-stressed concrete |
| **Crystalline Memory** | MI | When fracture < 0.10 after full recovery: physical_mitigation ×1.15 for 2 turns | Recrystallization produces denser microstructure |
| **Photosynthesis** | FL | In fields with luminance > 0.50: recover 2% S_max/turn | ATP production from photon energy |
| **Spore Cloud** | FL | On taking damage > 15% S_max: 30% chance to apply corrosion+0.10 to attacker if `contact:true` | Chemical defense; contact-activated irritant |
| **Low Profile** | AE | Base evasion +12%; VO damage received ×1.50 | Aero bodies disperse in gravity wells |
| **Photon Skin** | LU | First LU-affinity hit each battle: ×0.50 (EM reflection) | Fresnel reflection at first exposure |
| **Coherent Pulse** | LU | While `focused`: LU surge moves gain pierce+0.20 | Laser coherence: all photons in phase |
| **Mass Distortion** | VO | All initiative values on all battlers rounded down each turn | Gravitational time dilation (toy) |
| **Resonant Body** | SO | Sonic STAB increases to ×1.30; risk: sonic_stress self > 0.60 → 5% S_max passive/turn | Resonant amplification; self-coupling risk |
| **Destructive Interference** | SO | Once per battle: negate one incoming Sonic move entirely | Destructive wave interference |
| **Reactive Surface** | CR | Contact moves against this creature: corrosion+0.08 to attacker | Surface-activated chemical reaction |
| **Runaway Heating** | PL | heat_load > 0.60 → Plasmic moves +20% damage | Thermal runaway: positive feedback loop |

### 17.3 Reactive ability examples (Primed stance only)

| Ability | Trigger | Effect | Physics Hook |
|---|---|---|---|
| **Counter-Current** | on_hit (contact) | 60-power True surge back to attacker; costs 10% self heat_load | Newton's 3rd law; reaction forces |
| **Work Hardening** | on_damage_gt(0.18) | physical_mitigation ×1.25 for 2 turns | Metals harden under mechanical deformation |
| **Phase Collapse** | on_accumulator_cross(heat_load, 0.80) | Convert 40% of heat_load → one-time Plasmic surge (power = heat_load × 120) | Phase transition: stored thermal → kinetic |
| **Frequency Lock** | on_hit(affinity: SO) | Reflect Sonic damage = 50% received | Wave reflection; impedance matching at boundary |
| **Quench** | on_accumulator_cross(ally.heat_load, 0.75) | Ally heat_load −0.45; excess → AQ field wetness | Quenching in metallurgy; rapid controlled cooling |

---

## 18. Battle Phase Structure

### 18.1 Full turn flow

```
PRE-TURN
  1. Passive accumulator generation (ability passive ticks)
  2. Field scalar passive evolution (ambient_temp, humidity ticks per biome rules)
  3. Bench accumulator decay (all accumulators decay at 3× rate for benched creatures)
  4. Bench status duration decrement (statuses still count down while benched)

ACTION DECLARATION (simultaneous, sealed)
  Each player selects one of:
    (a) Move: select move instance + target
    (b) Switch: select replacement creature
    (c) Item (if enabled in ruleset)
    (d) Forfeit
  Also declare: stance change (if changing), reactive move (if Primed stance)

PRIORITY RESOLUTION (strict order)
  Tier +3: Emergency items (ruleset-gated)
  Tier +2: Quick-tagged moves; flee/forfeit
  Tier +1: Stance transitions; priority strike/surge moves
  Tier  0: Standard moves; field moves; catalyst moves
  Tier -1: Resonance moves; heavy surge moves
  Tier -2: Channel moves; full-power setup moves
  Tie-break: compare initiative_eff; if equal → seeded RNG from BattleContext

EXECUTION (per move, in priority order)
  For each move in resolved priority order:
    1. Hit resolution (§10.1)
    2. If miss: emit Miss event; no on-hit triggers
    3. If hit:
       a. Category dispatch (strike/surge/true/etc.)
       b. Full damage pipeline (§10)
       c. Layer 3 accumulator impulses (§13)
       d. Layer 2 rule evaluation (post-impulse state check)
       e. Reactive move trigger check (defender's reactive fires if conditions met)
       f. Combo prime: if catalyst move, set flag on target
       g. Combo detonate: if move has combo_detonate and flag present, apply bonus
       h. HitResolved event emitted with full breakdown
       i. Status threshold checks; new statuses applied

END-OF-TURN
  1. DoT and status damage (integrate dS/dt terms for active statuses)
  2. Subtick integration loop (N=10 by default; explicit Euler):
       for each substep:
         u ← u + Δt * g(u, field, materials)
         evaluate threshold queue (stable sort by rule priority)
         fire threshold events
  3. Combo charge decay (−1 turn from all active catalyst primes)
  4. Status duration decrement; expired statuses removed
  5. Faint check (S ≤ 0 → incapacitated; switch-in triggered)
  6. Switch-in effects (passive ability on_switch_in triggers)
  7. Turn counter increment; snapshot for replay frame
```

### 18.2 Channel move specifics

- Attacker is locked (no other actions while channeling)
- Each subtick fires a partial hit at `base_power / channel_duration`
- Exposure ramp η builds potency toward the end
- Accuracy checked once at start; miss ends channel immediately
- A move with `channel_break: true` and `priority_tier >= +1` can interrupt the channel

### 18.3 Reactive move specifics

- Declared as part of Primed stance action (not a separate action)
- Fires immediately after the triggering hit completes, before the next priority move
- One reactive per turn maximum
- If the trigger condition never fires, the reactive does not consume a cooldown

### 18.4 Replay guarantee

Full turn is deterministic given:
- Both players' declared actions (sealed; server receives simultaneously)
- `BattleContext.rng` seeded from `room_id + turn_number + salt`
- All effective stats and accumulator states

Replay frame: `{ turn_id, action_a, action_b, rng_seed_delta, pre_state_hash }`

---

## 19. Team and Party Rules

### 19.1 Party size

- 6 creatures per player
- Singles mode: 1 active battler (ship first)
- Doubles mode: 2 active battlers (Phase 2; catalyst/combo design has cross-party coordination hooks)

### 19.2 Switching

- Switching is your action (Tier +1 priority; no move the same turn)
- Forced switch (after faint): free; announced before opponent's next declaration
- Pivot moves (category: strike or surge with `pivot: true`): deal damage then allow free switch; slightly lower `base_power` band than equivalent non-pivot frames

### 19.3 Bench dynamics

Benched creatures are not frozen:
- Accumulators decay at 3× rate (rest promotes homeostasis)
- HP does **not** recover unless a specific passive or field applies (no stall-cycle exploit)
- Status conditions tick down at normal rate
- Switch-in: creature receives current field snapshot instantly; on_switch_in passives fire

### 19.4 Affinity Resonance (team passive)

If 3+ creatures on a team share the same dominant affinity (highest weight in `affinity_emphasis`):
- That affinity's passive field scalar for their side improves slightly (+5% ambient modifier aligned to affinity)
- Incentivizes thematic teams without mandating them

---

## 20. Biomes and Field Scalars

### 20.1 Field scalar schema

```typescript
interface FieldState {
  ambient_temp: number;          // dimensionless normalized; 0 = baseline
  humidity: number;              // [0, 1]
  terrain_id: string;            // typed string; predicate rules key on this
  field_flags: string[];         // e.g. "conductive_ground", "no_atmosphere", "crystal_lattice"
  luminance: number;             // [0, 1]; affects Photosynthesis, Luminous affinity
  acoustic_reflection: number;   // [0, 1]; 0=anechoic, 1=echo chamber
  passive_per_turn: Record<AccumulatorKey, number>; // per-turn delta applied to all battlers
  affinity_power_modifiers: Record<AffinityID, number>; // multiplier into base_power
}
```

Field state is server-authoritative. Clients interpolate for VFX only. Field moves and biome evolution can change these values mid-battle.

### 20.2 Ten biome definitions

**1 — Neutral Arena**
Standard competitive play. All affinity_power_modifiers = 1.0. No passive accumulator deltas. Used for ranked matches.
```
ambient_temp: 0, humidity: 0.50, luminance: 0.60, acoustic_reflection: 0.30
```

**2 — Volcanic Rift**
TH and PL dominant. Cryo creatures must manage heat_load or sear passively.
```
ambient_temp: +35, humidity: 0.10, luminance: 0.80, acoustic_reflection: 0.40
passive_per_turn: { heat_load: +0.04, wetness: -0.03 }
affinity_power_modifiers: { TH: 1.15, CY: 0.85, PL: 1.20 }
field_flags: ["volcanic_rock", "thermal_upwelling"]
physics_hook: "Geothermal heat flux; convection; radiative heat transfer"
```

**3 — Tundra Shelf**
CY dominant. Thermal creatures must actively maintain heat_load. Fracture combos trigger faster.
```
ambient_temp: -25, humidity: 0.35, luminance: 0.40, acoustic_reflection: 0.50
passive_per_turn: { heat_load: -0.035, cryo_load: +0.02 }
affinity_power_modifiers: { CY: 1.15, TH: 0.85, AQ: 0.90 }
field_flags: ["permafrost", "ice_surface"]
physics_hook: "Freeze-thaw cycles; permafrost chemistry; cold reaction kinetics"
```

**4 — Deep Ocean Trench**
GA extremely dangerous. SO has maximum range. VO loses leverage.
```
ambient_temp: +4, humidity: 1.0, luminance: 0.05, acoustic_reflection: 0.90
initial_wetness_bonus: +0.40
passive_per_turn: { wetness: +0.05 }
affinity_power_modifiers: { AQ: 1.20, GA: 1.40, SO: 1.35, VO: 0.70, LU: 0.60 }
field_flags: ["deep_water", "high_pressure", "conductive_medium"]
physics_hook: "Acoustic speed in water (4.3× air); P=ρgh; ionic conductivity"
```

**5 — Thunderhead Storm Cell**
Universal charge_buildup generation. Paralysis threshold triggers at 0.65 instead of 0.80.
```
ambient_temp: +15, humidity: 0.80, luminance: 0.30, acoustic_reflection: 0.55
passive_per_turn: { charge_buildup: +0.05, wetness: +0.03 }
affinity_power_modifiers: { GA: 1.25, AE: 1.15, AQ: 1.10 }
field_flags: ["ionized_atmosphere", "conductive_rain"]
modified_status_threshold: { paralyzed: 0.65 }
physics_hook: "Triboelectric charging; lightning formation; storm electrostatics"
```

**6 — Crystalline Cavern**
SO massive advantage. passive sonic_stress builds for everyone. fracture accumulates faster.
```
ambient_temp: -5, humidity: 0.30, luminance: 0.25, acoustic_reflection: 0.95
passive_per_turn: { sonic_stress: +0.03 }
affinity_power_modifiers: { SO: 1.35, MI: 1.20, CY: 1.10, LU: 0.70 }
field_flags: ["crystal_lattice", "high_acoustic_reflection"]
modified_accumulator_rate: { fracture: 1.20 }
special_rule: "if any battler fracture > 0.50: cave resonance deals 2% S_max passive/turn"
physics_hook: "Crystal lattice; piezoelectric effect; acoustic resonance in enclosed space"
```

**7 — Ancient Rainforest**
FL dominant. bio_resonance builds fastest. GA secondary threat via constant wetness.
```
ambient_temp: +28, humidity: 0.95, luminance: 0.50, acoustic_reflection: 0.20
initial_wetness_bonus: +0.20
passive_per_turn: { wetness: +0.04, bio_resonance: +0.05 }
affinity_power_modifiers: { FL: 1.25, GA: 1.10, TH: 0.85 }
field_flags: ["overgrown", "mycelium_network"]
physics_hook: "Nutrient cycling; mycelial networks; latent heat of transpiration"
```

**8 — Near-Vacuum Expanse**
Void absolute control. SO and AE creatures take passive damage.
```
ambient_temp: -270, humidity: 0.0, luminance: 0.15, acoustic_reflection: 0.0
passive_per_turn: { heat_load: -0.025 }
affinity_power_modifiers: { VO: 1.35, SO: 0.0, AE: 0.0 }
field_flags: ["no_atmosphere", "vacuum", "microgravity"]
passive_damage: { SO_primary: 3%_S_max_per_turn, AE_primary: 4%_S_max_per_turn }
physics_hook: "Vacuum: no wave medium; blackbody radiation cooling; microgravity"
```

**9 — Magma Chamber**
PL and TH extreme. All accumulator rates ×1.35 in extreme heat.
```
ambient_temp: +80, humidity: 0.05, luminance: 0.95, acoustic_reflection: 0.60
passive_per_turn: { heat_load: +0.07, ionization: +0.04 }
affinity_power_modifiers: { PL: 1.30, TH: 1.20, LU: 1.10 }
field_flags: ["extreme_heat", "ionized_gas"]
modified_accumulator_rate: { all: 1.35 }
physics_hook: "Stefan-Boltzmann law (P=εσT⁴); plasma state; Arrhenius at extreme T"
```

**10 — Prismatic Salt Flat**
LU advantage from reflectivity. CR benefits from ionic salts. radiation builds passively.
```
ambient_temp: +18, humidity: 0.15, luminance: 0.90, acoustic_reflection: 0.30
passive_per_turn: { radiation: +0.03, charge_buildup: +0.02 }
affinity_power_modifiers: { LU: 1.25, CR: 1.15, GA: 1.10 }
field_flags: ["salt_surface", "high_UV", "ionic_ground", "reflective"]
physics_hook: "UV reflectance; ionic dissociation; photoelectric effect from salt surface"
```

### 20.3 Biome evolution

Field moves accumulate a per-affinity counter. When a threshold is crossed, the biome transitions partially:

```yaml
biome_evolution_rule:
  id: "rainforest_burning"
  biome: "rainforest"
  trigger: "cumulative_TH_PL_field_moves >= 3"
  effect:
    humidity: "*= 0.70"
    ambient_temp: "+= 8"
    affinity_power_modifiers.FL: "*= 0.90"
    field_flags.add: "smoke_pall"
    field_flags.remove: "mycelium_network"
    message: "The canopy burns. Smoke fills the air."
```

Track `field_move_accumulator[biome_id][affinity_id]` as a battle-state scalar.

---

## 21. Named Combo System

Combos are sequences of moves where a **catalyst** primes a charge on the target, and a **detonator** move with matching `combo_detonate` key consumes it for bonus effects.

### 21.1 How combos work mechanically

1. Attacker uses a `catalyst` category move (or any move with `accumulator_impulses` that crosses a threshold as a side effect)
2. Target receives a `combo_charge` flag with the `catalyst_id` key and a duration in turns
3. On any subsequent hit by any move with `combo_detonate: <matching_id>`: bonus multiplier and effects apply; flag is consumed

### 21.2 Ten named combos

| Combo | Prime Condition | Detonate Condition | Bonus | Physics Mechanism |
|---|---|---|---|---|
| **Flash Freeze** | AQ move → wetness > 0.60 | CY move within 1 turn | Cryo ×1.60; `frozen` proc | Explosive liquid-to-solid phase transition |
| **Thermal Runaway** | Two successive TH moves | PL move while heat_load > 0.70 | PL +50%; ionization +0.30 | Positive feedback: heat → more heat → plasma ignition |
| **Lightning Rod** | MI grounding move OR `conductive_stone` field | GA move next turn | GA ×1.70; charge_buildup doubles | Ground path: charge flows to lowest potential |
| **Resonant Fracture** | SO move → sonic_stress > 0.30 | Physical strike (any modality) within 1 turn | Strike ×1.80; fracture +0.25 impulse | Pre-stressed resonant structure fails under applied force |
| **Acid Etch** | CR catalyst move (sets `acid_primed` flag) | MI or physical strike within 3 turns | ×1.80; physical_mitigation −15% extra | Corrosion creates stress concentration sites |
| **Steam Explosion** | AQ → wetness > 0.70 | TH move while ambient_temp > 20 | TH ×1.40; initiative debuff −25% for 2 turns | Water→steam: 1600× volume expansion |
| **Void Silence** | VO field move OR vacuum_pocket | SO move against same target | SO damage = 0; VO ×1.50 to that target | Sound cannot propagate in vacuum; energy collapses to compression |
| **Photoelectric Strike** | LU surge > special_mitigation threshold | GA move within 2 turns | GA ×1.45; charge_buildup +0.25 | Photoelectric effect frees electrons; charge injection amplified |
| **Catalytic Oxidation** | AE field move (introduces oxygen marker) | CR move next turn | CR ×1.60; corrosion rate ×2.0 for 2 turns | Oxygen as oxidizer accelerates corrosion |
| **Cryo-Shock** | CY → cryo_load > 0.50 | TH move same turn (Doubles) or specific combo moves | TH ×1.90; fracture +0.30 | Thermal shock: rapid ΔT creates catastrophic stress in brittle materials |

### 21.3 Combo UI

- Active combo charge on target: subtle glow icon; visible in battle log
- When detonation move is declared: "COMBO PRIMED" banner before damage calc
- Analyst tier: shows exact state values that qualified the detonation condition
- Discovery: players learn combos through play; combo journal records witnessed combos

---

## 22. Stat Growth and Resonance

### 22.1 Level budget curve B(L)

Two-phase:

**Phase A (L 1–100):** Mirrors classic handheld RPG pacing. Stat growth formula uses coefficients designed to feel familiar without copying proprietary constants. Fast early gains, steady mid-game, slight taper toward 100.

```
B_A(L) = c_A0 + c_A1 * L + c_A2 * L^2    -- coefficients in balance JSON
```

**Phase B (L > 100):** Super-grind territory. Sharply increasing XP per level. Power grows logarithmically toward a soft cap, ensuring level 10,000 is achievable but not required for competitive play.

```
B_B(L) = B_A(100) + B_cap * tanh(c_B * (L - 100) / L_ref)
```

`B_cap` is chosen so level 10,000 gains approximately `0.98 * B_cap` above the L=100 baseline — diminishing returns ensure brackets remain relevant.

**Why two phases:** Early hundreds feel nostalgic. Above 100 reads as "MMO endgame" without an unnatural cliff. Smooth the first derivative at L=98–102 (crossfade XP rate).

### 22.2 Stat formula for a given instance

```
S_final = (A_rolled + R_allocated) * f_growth(L)
```

- `A_rolled`: instance aptitude draw (§3.2 spawn pipeline); never a species table lookup
- `R_allocated`: Resonance points allocated to this stat
- `f_growth(L)`: derived from B(L) phase curve; same for all creatures of same stage at same L

### 22.3 Resonance economy

**Accrual:** Flat Resonance per level through Phase A; diminishing Resonance-per-level in Phase B (data-tuned).

**Allocation:** Players spend at tuning stations (hub buildings). Respec policy: product decision (free in dev rooms; costed or time-gated in production).

**Hard cap:** No single stat may hold more than 40% of total allocated Resonance at a snapshot. Prevents degenerate builds that stress-break saturation math.

**Resonance moves:** Moves with `category: resonance` scale their effect by:
```
R_allocated_relevant = Resonance allocated in the stat aligned to this move
R_factor = 1 + resonance_scale * tanh(R_allocated_relevant / R_ref)
effective_power *= R_factor
```
`resonance_scale` capped at 1.2 per frame. Teaches smooth diminishing returns as an observable mechanic.

---

## 23. Physics Education Map

**The design principle:** Never require physics knowledge. Always reward correct physical intuition developed through play. The education is stealth — observation → meter → optional tooltip → optional glossary → optional Analyst formula.

### 23.1 Observable → concept pipeline

| Step | What happens |
|---|---|
| **Observation** | Player notices "why did that do so much damage?" |
| **Meter** | UI surfaces the accumulator or modifier that caused it |
| **Tooltip (opt-in)** | One sentence: "Sound waves at a crystal's natural frequency cause structural failure" |
| **Glossary (opt-in)** | One paragraph: named phenomenon, real-world example, no equation |
| **Analyst (opt-in)** | The actual formula with variable names |

### 23.2 Per-affinity education targets

| Affinity | Observable | Physics Concept | Analyst Formula |
|---|---|---|---|
| Thermal | heat_load rises, relaxes toward ambient | Newton's cooling; heat capacity | dH/dt = −(H−Ta)/τ |
| Cryo | Cold accumulates slower in high-mass creatures; brittle cracks | Thermal mass; freeze-thaw fracture | Latent heat: Q=mL |
| Aqueous | Wetness equilibrates with humidity; amplifies others | Specific heat of water; osmotic pressure | dW/dt = β₁hP − β₂W(1−h) |
| Galvanic | Charge builds, leaks faster when wet | Ohm's law; RC circuit decay | dQ/dt = I − Q/RC |
| Mineral | High rigidity amplifies fracture; grounds charge | Young's modulus; stress concentration | σ=F/A; K_Ic fracture toughness |
| Flora | Long fights reward; photosynthesis in bright fields | Metabolic rate; ATP production | Michaelis-Menten enzyme saturation |
| Aero | Evaporates wetness; disrupts Sonic | Bernoulli; viscosity; Reynolds number | Re = ρvL/μ |
| Luminous | Bypasses some material paths; photoelectric combo | Photon energy; Beer-Lambert absorption | E=hf; I=I₀e^{−αx} |
| Void | Removes medium for AE/SO; compresses dense bodies | Vacuum; pressure; gravitational potential | P=ρgh; escape velocity |
| Sonic | Resonant shattering of MI; no effect on VO | Mechanical resonance; wave propagation | x''+2βx'+ω₀²x=Fcos(ωt) |
| Corrosive | Armor erodes faster in hot fields; long fights | Arrhenius; rate laws; acid-base | k=Ae^{−Ea/RT}; Rate=[A]^n |
| Plasmic | Power scales steeply with heat_load | Stefan-Boltzmann; Debye shielding | P=εσT⁴; plasma frequency |

### 23.3 Mechanics-as-calculus map

| Game Mechanic | Math Concept |
|---|---|
| Saturation curve σ = 1−e^{−κ/(1+y)} | Smooth bounded functions; asymptotic behavior; diminishing returns |
| Accumulator decay toward equilibrium | Exponential decay; e-folding time constant τ |
| Combo damage from accumulator state | Conditional dependence; threshold functions; piecewise dynamics |
| Multi-hit exposure ramp E_{i+1} = E_i + ΔE | Riemann sums; numerical integration of intensity curves |
| heat_load equilibrates toward ambient | Differential equations; stable equilibrium; steady-state |
| Rate laws in Corrosive mechanics | First/second-order ODEs |
| Acoustic impedance mismatch | Wave reflection at interfaces: R=((Z₂−Z₁)/(Z₂+Z₁))² |
| Stefan-Boltzmann in Plasmic | Power laws; T⁴ non-linear scaling |
| Resonance at natural frequency | Eigenvalues; driven harmonic oscillators; structural resonance |
| STAB as tanh function of affinity_emphasis | Smooth saturation; continuous bonuses vs threshold bonuses |

---

## 24. UI Tiers — Novice to Analyst

| Tier | Player Sees | Hidden Machinery |
|---|---|---|
| **Novice** | Endurance bar (labeled "Fight Stamina"); affinity color badge; super/not super/resist indicator; Bludgeon/Pierce/Slash glyph strip summing to 100% | All ODEs; Layer 3; material profile; m1 terms |
| **Competitor** | All MVP accumulators as compact icons + status badges when thresholds fire; tag-trigger callouts ("Thermal shock!"); simplified layer 2 log | Exact numbers; subtick integration; ψ kernels |
| **Analyst** | Full numerical values for all accumulators + trend arrows (du/dt direction); per-channel σ and D_core_k; m1 contributing terms; active coupling pair highlights; one-line mechanism tooltips | Nothing — full visibility |

**Formal STEM knowledge is never a gate.** A player who never opens the Analyst tier and never reads a tooltip can still reach competitive mastery by following observable patterns.

---

## 25. Data Artifact Checklist

When implementing, these are the authoritative data files to version and hash into replay headers.

| Artifact | Status | Contents |
|---|---|---|
| `affinities.json` | **Required** | 12 IDs; display names; icon keys; content-lock flags for SO/CR/PL |
| `affinity_chart.json` | **Required** | 12×12 CHART₀ matrix (§7); feeds m1 baseline |
| `scaling_curves.json` | **Required** | S_L coefficients; saturation κ, ε, F_scale; pierce λ_p, λ_k; modality ψ kernels; m1 reshape κ₁, κ₂, m_min, m_max, stab_scale, stab_ref; resist_kernel formulas per affinity |
| `accumulators.json` | **Required** | 14 accumulator entries; ODE sketch parameters; cross-coupling weights; u_min, u_max; recovery/coupling stat coupling coefficients |
| `status_conditions.json` | **Required** | 12 status entries; trigger thresholds; active effects; cure conditions; escalation rules |
| `frames/*.yaml` | **Required** | Per-frame: display seed, category, min/max per knob, allowed hook families, cooldown_scaling formula, default ω |
| `display_composer_rules.json` | **Required** | Token ordering; prominence floors; system_display_title assembly rules (§8.4) |
| `reaction_rules/*.yaml` | **Required** | Layer 2 predicate rules; priorities; when/then schemas |
| `material_axes.json` | **Required** | 12 component definitions; composite shortcut formulas; biome Beta parameters for roll |
| `combos.json` | **Required** | 10 named combos; catalyst_id keys; detonation bonuses; physics rationale |
| `biomes.json` | **Required** | 10 biome definitions; passive tick effects; affinity_power_modifiers; evolution rules |
| `stances.json` | **Required** | 5 stances; stat multipliers; special rules; transition constraints |
| `abilities/*.yaml` | **Required** | All passive/reactive ability definitions as Layer 2 rules; species pool assignments |
| `growth_curves.json` | **Required** | Phase A and B B(L) coefficients; Resonance accrual per level; hard cap fractions |
| `species_catalog/*.yaml` | **Required** | Per-species: id, display name, stages, habitat biome hints, appearance gene axis mapping, ability pool per slot; **no combat stats** |
| `encounter_tiers.json` | **Required** | μ_tier, σ_tier per stat per encounter tier; biome Beta overrides for material profile |
| `move_instances/*.json` | **Per-creature** | Resolved move payloads per §9 schema; patch_hash; display title |

**Versioning:** Every artifact file carries a `version` field and a `content_hash`. Replay headers store hashes for all files referenced. Competitive disputes can be replayed deterministically against the same artifact versions.

---

## 26. Open Decisions

These must be resolved before shipping the relevant feature. Record decision + rationale in this section when made.

| Decision | Options | Notes | Status |
|---|---|---|---|
| **Room model** | (A) Separate world per room; (B) Shared world + instanced battles; (C) Hybrid | Blocking for world server design | **Pending** |
| **Secondary affinity η default** | 0.25 / 0.35 / 0.50 | Higher = more predictable dual matchups; lower = primary dominates | **Pending** |
| **Doubles launch timing** | Phase 1 vs Phase 2 | Catalyst/combo design assumes cross-party coordination; Doubles needed for Cryo-Shock combo | **Pending** |
| **Stance change action cost** | Uses your action (current spec) vs costs initiative priority vs free | Affects combat pacing significantly | **Pending** |
| **Resonance respec cost** | Free / costed gold / time-gated / free in dev | Product/monetization policy | **Pending** |
| **Combo UI visibility** | Always visible / only after first witness / always hidden | Discovery vs onboarding tension | **Pending** |
| **Biome selection** | Random / host-selected / competitive neutral-mandated | Room config design | **Pending** |
| **Item ruleset** | Full items / no items (competitive) / items Phase 2 | Items introduce significant balance surface | **Pending** |
| **SO/CR/PL content lock** | At what point does Phase 2 content unlock? | Milestone or time-based gate | **Pending** |
| **True damage Layer 2 bypass** | Yes (current default) / No / Per-rule-flag | Keep simple: yes, with rare exception flags | **Recommend yes; pending confirm** |
| **Lustrous trade rules** | Freely tradeable / trade-locked / limited trades | Market effects; duplication exploit surface | **Pending** |
| **Affinity names final** | Physics-first (current) / push further into original metaphors / split identity vs damage flavor | Finalize before tutorial copy ships | **Pending** |
| **STAB implementation** | Continuous tanh (current spec) / discrete ×1.15 primary / ×1.15 primary + ×1.08 secondary | Continuous rewards high emphasis specialization smoothly | **Recommend tanh; pending confirm** |

---

## Appendix A — Spawn Example (Full Walkthrough)

```
Input: biome_id="volcanic_rift", encounter_tier=3, level=28, seed=0xA3F1C8

Step 1 — Affinity emphasis
  Volcanic biome: TH concentration=6.0, PL concentration=2.5, others=0.5
  Dirichlet draw → TH=0.51, GA=0.19, PL=0.14, MI=0.07, others sum=0.09
  p_neutral_primary=0.05 (not drawn; this is a themed creature)
  affinity_emphasis = {TH:0.51, GA:0.19, PL:0.14, MI:0.07, AQ:0.03, ...}

Step 2 — Stat aptitude roll
  encounter_tier=3: μ={stamina:120, phys_off:85, phys_mit:78, spec_off:95, spec_mit:70, init:88, prec:72, rec:55, coup:80}
  σ_tier=8 for all (tier 3 moderate variance)
  B(28) from growth curve = 2.84 (phase A)
  Draws (before jitter): stamina=118, phys_off=91, etc.
  Final after jitter and B(L) scaling: stamina=136, phys_off=104, phys_mit=89, ...

Step 3 — Material profile roll
  Volcanic biome Betas:
    thermal_mass: Beta(5.0, 2.0) → draw 0.73
    conductivity: Beta(2.0, 4.0) → draw 0.39
    rigidity:     Beta(3.0, 3.5) → draw 0.47
    porosity:     Beta(1.5, 5.0) → draw 0.22
    ... etc.

Step 4 — Appearance gene
  species="embervolt_stage1" → 16 gene axes
  Draw: [0.82, 0.14, 0.67, 0.93, 0.05, 0.44, ...]
  Lustrous roll: 0.0019 < 0.00195 → YES LUSTROUS (rare!)
  lustrous=true; gene overrides: axis[6] → 0.95 (heightened particle preset)

Step 5 — Move loadout (wild; procedurally tuned)
  Slot 1: Frame=blast, TH primary, ω={0.2,0.6,0.2}, pierce=0.20, base_power=55
    → system_display_title: "Thermal Blast"
  Slot 2: Frame=slam, no affinity, ω={0.80,0.10,0.10}, base_power=70
    → system_display_title: "Slam"
  Slot 3: Frame=field_seed, TH primary, φ=0.80, ambient_temp delta +6
    → system_display_title: "Thermal Field Seed"
  Slot 4: Frame=rend, GA secondary η=0.35, ω={0.15,0.20,0.65}, base_power=50
    → system_display_title: "Rending Gale Drive" [wait: GA/AE blend + slashing dominant]

Step 6 — Passive abilities (Stage 1: 1 passive)
  Species pool: ["thermal_inertia", "runaway_heating", "charge_accumulation"]
  Wild draw: "thermal_inertia"

Persisted instance: all fields above; checksum over payload
```

---

## Appendix B — Damage Calculation Example (Full Walkthrough)

```
Attacker: Embervolt (TH:0.51, GA:0.19); level 28
  physical_offense_eff = 104 (base) × 1.20 (Assault stance) = 124.8
  coupling_eff = 80

Defender: Crystalite (MI:0.65, CY:0.20); level 25
  physical_mitigation_eff = 130 (base) × (1 - 0.18*tanh(0.40)) = 130 × 0.827 = 107.5
  (fracture = 0.40 from prior hits)

Move: "Thermal Blast" — Thrust frame, TH primary, delivery_modalities={0.1,0.7,0.2}
  base_power = 55; pierce = 0.25; accuracy = 90

Step 1: Hit resolution
  p_hit = clamp(0,1, accuracy/100 × precision_factor) = 0.90 × 1.05 = 0.945
  RNG draw: 0.73 < 0.945 → HIT

Step 2: Effective defense (modality blend; surge → special_mitigation)
  B_eff = special_mitigation_eff = 95 (Crystalite special_mitigation, no fracture coupling on special)
  R_con = B_eff × ψ_con(M) = 95 × 0.45 = 42.75
  R_pier= B_eff × ψ_pier(M) = 95 × 0.82 = 77.90  (high rigidity → high piercing resistance)
  R_slas= B_eff × ψ_slas(M) = 95 × 0.55 = 52.25
  λ_pier=1.0, λ_con=0.4, λ_slas=0.6
  D_con = 42.75 × (1 - 0.25 × 0.4 × 1.0) = 42.75 × 0.90 = 38.48
  D_pier= 77.90 × (1 - 0.25 × 1.0 × 1.0) = 77.90 × 0.75 = 58.43
  D_slas= 52.25 × (1 - 0.25 × 0.6 × 1.0) = 52.25 × 0.85 = 44.41

Step 3: Level scaling
  S_L = (1 + 0.02 × 28) / (1 + 0.02 × 25) = 1.56 / 1.50 = 1.040

Step 4: Core saturation (per channel)
  A = special_offense_eff = 110; x = max(110/0.001, 0.001) = 110000 (ε tiny)
  x = A / ε... let's use x = A for simplicity: x=110
  κ = 1.80 (from scaling_curves.json); F_scale = 0.45

  σ_con = 1 - exp(-1.80 / (1 + 38.48/110)) = 1 - exp(-1.80/1.35) = 1 - exp(-1.33) = 0.735
  σ_pier= 1 - exp(-1.80 / (1 + 58.43/110)) = 1 - exp(-1.80/1.531) = 1 - exp(-1.176) = 0.692
  σ_slas= 1 - exp(-1.80 / (1 + 44.41/110)) = 1 - exp(-1.80/1.404) = 1 - exp(-1.282) = 0.722

  D_core_con  = 0.45 × 55 × 0.735 × 1.040 = 18.91
  D_core_pier = 0.45 × 55 × 0.692 × 1.040 = 17.80
  D_core_slas = 0.45 × 55 × 0.722 × 1.040 = 18.57

  ω = {0.1, 0.7, 0.2}
  D_core = 0.1×18.91 + 0.7×17.80 + 0.2×18.57
         = 1.891 + 12.460 + 3.714 = 18.07

Step 5: Outcome budget
  α = 0.85 (endurance_share); others minor
  stamina_budget = 0.85 × 18.07 = 15.36

Step 6: Layer 1 m1
  B = CHART0[TH][MI] × 0.51 × 0.65 + CHART0[TH][CY] × 0.51 × 0.20 + ...
    ≈ 0.75 × 0.332 + 2.0 × 0.102 + ... blended = ~0.98 (MI resists TH partially)
  A_att = 0.51 (attacker TH emphasis aligned to TH move)
  R_def = resist_kernel(TH, MI materials) = 0.55 (moderate MI thermal resistance)
  m1_raw = 0.98 × exp(0.3 × tanh(0.51)) × exp(-0.3 × tanh(0.55))
         = 0.98 × 1.133 × 0.851 = 0.944
  STAB: stab_factor = 1 + 0.15 × tanh(0.51/0.40) = 1 + 0.15 × 0.79 = 1.118
  m1 = clamp(0, 2, 0.944 × 1.118) = clamp(0, 2, 1.055) = 1.055

Step 7: Layer 2
  Check "thermal_shock": requires heat_load>0.60 — Crystalite heat_load=0.22 → NO
  Check "armor_pierce_align": fracture=0.40 > 0.60? → NO
  m2 = 1.0; flat2 = 0

  D_after_layers = 15.36 × 1.055 × 1.0 + 0 = 16.20

Step 8: Layer 3 impulses
  move.accumulator_impulses = {fracture: 0.06}
  impulse_effective = 0.06 × (1 + 0.01 × 80) = 0.06 × 1.80 = 0.108
  Crystalite.fracture = clamp(0.40 + 0.108, 0, 1) = 0.508
  → physical_mitigation_eff recalculated next turn: 130 × (1 - 0.18×tanh(0.508)) = 130 × 0.815 = 106.0

Step 9: Crit and variance
  p_crit = 0.05; crit_bonus = 1.50; δ = 0.03
  RNG: C=1.0 (no crit); Ξ=0.982
  D_final_raw = 16.20 × 1.0 × 0.982 = 15.91

Step 10: Final application
  stamina_loss = max(0, floor(15.91)) = 15
  Crystalite.S -= 15

Emit HitResolved {
  stamina_loss: 15,
  breakdown: {
    D_core: 18.07, m1: 1.055, m2: 1.0, flat2: 0, C: 1.0, Ξ: 0.982,
    modalities: { ω: {0.1,0.7,0.2}, σ: {0.735,0.692,0.722}, D_core_k: {18.91,17.80,18.57} },
    outcome_budget: { α: 0.85 },
    accumulator_impulses: { fracture: 0.108 },
    rules_fired: [],
    S_L: 1.040
  }
}
```

---

*End of Wildloom Master Design Document*

**Changelog:**
| Date | Change |
|---|---|
| 2026-05-03 | Full consolidation: all prior docs (COMBAT-MODEL, GAMEPLAY-SYSTEMS, SIMULATION-AND-PEDAGOGY, TECHNICAL-DESIGN, EXPANDED-DESIGN) merged into single authoritative spec. Resolved all naming conflicts (stamina/HP, m1 dynamic/static, modality naming). Added complete spawn pipeline, full stat schema, dual-affinity blend, full biome set, complete status conditions, complete accumulator ODEs with coupling/recovery stat hooks, full composer panel spec with name assembly rules, and two worked examples. |
