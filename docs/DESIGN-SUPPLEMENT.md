# Wildloom — expanded design supplement

**Companion to:** [`COMBAT-MODEL.md`](./COMBAT-MODEL.md), [`GAMEPLAY-SYSTEMS.md`](./GAMEPLAY-SYSTEMS.md), [`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md), [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md)

**Purpose:** Fills gaps and expands systems that are framework-only elsewhere. Sections are organized for implementation. Where existing docs define structure, this doc adds concrete first-pass targets, extra mechanics, and extended physics-education hooks.

**Scope:** [`GAMEPLAY-SYSTEMS.md`](./GAMEPLAY-SYSTEMS.md) describes the **nine-affinity MVP** and **twelve-ID** roster. This supplement defines the **twelve-affinity** chart (`CHART₀`), nine core stats (+ three extended), twelve material axes, extended move categories, stances, statuses, biomes, combos, and data artifacts—**phase in**; numbers require Monte Carlo before shipping. Stat naming follows [`COMBAT-MODEL.md`](./COMBAT-MODEL.md): **`stamina`** + **endurance** \(S(t)\), DoTs as \(\mathrm{d}S/\mathrm{d}t\).

**Creature data rule:** Species catalog rows **never** author fixed stats, materials, or combat affinity weights — those properties exist **only** on rolled **instances** ([`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §1, §5). Examples: [`SPECIES-INSTANCE-EXAMPLES.md`](./SPECIES-INSTANCE-EXAMPLES.md).

**Status:** Design expansion — first-pass balance targets; run Monte Carlo before shipping.

---

## Table of contents

1. [Affinity expansion — 9 → 12](#1-affinity-expansion--9--12)
2. [The complete 12×12 affinity chart](#2-the-complete-1212-affinity-chart)
3. [Expanded core stats — 6 → 9](#3-expanded-core-stats--6--9)
4. [Expanded material profile — 5 → 12 components](#4-expanded-material-profile--5--12-components)
5. [Complete move taxonomy — 8 categories](#5-complete-move-taxonomy--8-categories)
6. [Stance system](#6-stance-system)
7. [Ability framework](#7-ability-framework)
8. [Status condition registry — 12 named thresholds](#8-status-condition-registry--12-named-thresholds)
9. [Expanded Layer 3 accumulator registry](#9-expanded-layer-3-accumulator-registry)
10. [Battle phase structure](#10-battle-phase-structure)
11. [Team and party composition](#11-team-and-party-composition)
12. [Environmental biomes — 10 types](#12-environmental-biomes--10-types)
13. [Physics-forward combo system](#13-physics-forward-combo-system)
14. [Expanded physics education map](#14-expanded-physics-education-map)
15. [Updated data artifacts checklist](#15-updated-data-artifacts-checklist)
16. [Balance notes and open tuning decisions](#16-balance-notes-and-open-tuning-decisions)

---

## 1. Affinity expansion — 9 → 12

### 1.1 Rationale for three additions

The original nine affinities cover thermodynamics, electromagnetism, matter phases, and ecology well. Three domains are under-represented for the calculus / physics-literacy goal:

| New affinity | Physics domain covered | Gap it fills |
|--------------|------------------------|--------------|
| **Sonic** | Wave mechanics — frequency, resonance, impedance, interference | Wave-equation concepts |
| **Corrosive** | Chemical kinetics — rate laws, equilibrium, pH, Arrhenius | Chemistry / reaction-rate concepts |
| **Plasmic** | Plasma physics — ionization, Debye shielding, magnetic confinement | Fourth state of matter; Thermal + Galvanic overlap |

### 1.2 Full 12-affinity catalog

| ID | Name | Theme & metaphor | Playstyle identity | Physics hook |
|----|------|------------------|-------------------|--------------|
| `TH` | **Thermal** | Heat, combustion, convection | Pressure buildup; `heat_load`; melting hooks | Thermodynamics, heat capacity, Newton cooling |
| `CY` | **Cryo** | Cold, entropy, crystallization | Tempo pressure; fracture setups; draws thermal energy down | Phase transitions, latent heat, freeze-thaw |
| `AQ` | **Aqueous** | Liquids, solutions, pressure | Utility; wetness; galvanic / sonic chains | Fluid dynamics, osmotic pressure |
| `GA` | **Galvanic** | Electricity, circuits, charge flow | Tempo; conductivity chains; control spikes | Ohm's law, RC decay, electrostatics |
| `MI` | **Mineral** | Earth, crystal, metals, stone | Physical mitigation; rigidity / shatter; grounding | Solid mechanics, Young's modulus |
| `FL` | **Flora** | Biomass, vines, spores, mycelium | Sustain / DoT; thermal_mass; entanglement | Biochemistry, metabolic rate |
| `AE` | **Aero** | Gas, pressure waves, turbulence | Evasion; spreads / clears field scalars | Bernoulli, Reynolds number |
| `LU` | **Luminous** | Light, lasers, UV, radiation | Surge pierce; bypasses some material paths | \(E = hf\), spectrum |
| `VO` | **Void** | Gravity, vacuum, isolation | Compression on **`stamina` / endurance ceiling**; removes medium | Gravitational potential, tidal stress |
| `SO` | **Sonic** *(new)* | Sound, resonance, vibration | Setup / detonation; resonant shattering | Wave equation, impedance, resonance |
| `CR` | **Corrosive** *(new)* | Acid/base, oxidation | Accumulator erosion; armor degradation over time | Rate laws, Arrhenius, Le Chatelier |
| `PL` | **Plasmic** *(new)* | Ionized plasma, high-energy matter | Burst; breaches bulwark + ward angles | Ionization, Debye shielding; \(T^4\) radiative flavor |

### 1.3 Identity notes (new affinities)

- **Sonic:** Resonance matching — sustained `sonic_stress` enables tuned follow-ups (destructive resonance metaphor). Educational: periodic forcing near natural frequency.
- **Corrosive:** Dominates **long** fights via `corrosion` accumulator — teaches rate laws and concentration.
- **Plasmic:** High variance; `ionization` field play with Galvanic allies; steep scaling flavor with heat / energy (balance via fragility and costs per §16).

---

## 2. The complete 12×12 affinity chart

**Resolver contract:** This matrix is **`CHART₀` — a baseline prior** for physics metaphors and spreadsheet tuning. **Shipped `m1`** is **`reshape(CHART₀, attacker_stats, defender_stats, materials, affinity_emphasis, move fusion weights, field)`** per [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §5.5, typically **bounded** in a band such as **`[0, 2]`** (exact clamps balance-owned). Beginner UI may **collapse** the outcome to “weak / neutral / sharp.”

`CHART₀[attacker_affinity][defender_primary]` — tendency **before** dynamic reshape (used inside §5.5’s `B` / `blend_chart` step).

Values: `2.0` super effective · `1.5` effective · `1.0` neutral · `0.75` resistant · `0.5` very resistant · `0.0` immune.

| ATK ↓ / DEF → | TH | CY | AQ | GA | MI | FL | AE | LU | VO | SO | CR | PL |
|---------------|----|----|----|----|----|----|----|----|----|----|----|-----|
| **TH** Thermal | 0.5 | **2.0** | 0.75 | 0.75 | 0.75 | **2.0** | **1.5** | 0.75 | 0.5 | 1.0 | **1.5** | 0.5 |
| **CY** Cryo | 0.5 | 0.5 | **1.5** | 1.0 | **1.5** | **1.5** | 1.0 | 1.0 | 0.75 | 0.75 | **1.5** | 0.5 |
| **AQ** Aqueous | 0.75 | 0.75 | 0.5 | **1.5** | **1.5** | 0.75 | 1.0 | 1.0 | 0.5 | **1.5** | 0.75 | **1.5** |
| **GA** Galvanic | 1.0 | 1.0 | **1.5** | 0.5 | 0.5 | **1.5** | **2.0** | 1.0 | 0.75 | **1.5** | 1.0 | 0.5 |
| **MI** Mineral | 1.0 | 1.0 | 0.75 | **2.0** | 0.75 | **1.5** | 1.0 | 0.75 | 0.75 | **2.0** | 0.5 | 0.75 |
| **FL** Flora | 0.5 | 0.5 | **1.5** | 0.5 | 0.5 | 0.75 | 0.75 | 1.0 | **1.5** | 1.0 | 0.5 | 0.5 |
| **AE** Aero | 0.75 | **1.5** | **1.5** | 0.75 | 0.5 | **1.5** | 0.5 | 0.75 | 0.5 | 0.75 | **1.5** | 0.75 |
| **LU** Luminous | 1.0 | **1.5** | 1.0 | **1.5** | 0.75 | 1.0 | **1.5** | 0.5 | 0.5 | **1.5** | **1.5** | 0.75 |
| **VO** Void | **1.5** | 0.75 | **1.5** | **1.5** | **1.5** | **2.0** | **2.0** | 0.75 | 0.5 | **2.0** | 1.0 | **1.5** |
| **SO** Sonic | 1.0 | **1.5** | **1.5** | 0.75 | **2.0** | 1.0 | 0.5 | 0.75 | **0.0** | 0.5 | 1.0 | **1.5** |
| **CR** Corrosive | 0.75 | 1.0 | **1.5** | **1.5** | **2.0** | **1.5** | 0.75 | 0.75 | 0.5 | 1.0 | 0.5 | 1.0 |
| **PL** Plasmic | 0.75 | **2.0** | **2.0** | 0.75 | **1.5** | **2.0** | **1.5** | 1.0 | 0.75 | **1.5** | **1.5** | 0.5 |

### 2.1 Notable matchup rationale (tutorial copy seeds)

| Matchup | Value | Physics reasoning | Educational hook (tooltip seed) |
|---------|-------|-------------------|--------------------------------|
| GA → AE | 2.0 | Breakdown / discharge paths in ionized gas | Electric field breakdown in gas; dielectric strength |
| AQ → GA | 1.5 | Ionic conduction — water bridges paths | \(\sigma = nq\mu\); ionic solution as conductor |
| MI → GA | 2.0 | Grounding / shunting metaphor | Earthing; Faraday cage intuition |
| SO → MI | 2.0 | Resonance vs brittle lattice | Eigenfrequency; Tacoma Narrows-class metaphor |
| SO → VO | 0.0 | No propagating medium — vacuum | Waves need medium; “no sound in space” |
| VO → AE / SO | 2.0 | Removes gas / acoustic medium | Near-zero pressure kills gas-phase coupling |
| CR → MI | 2.0 | Dissolution / acid–base attack on mineral | Acid–carbonate / oxide dissolution |
| PL → FL / CY / AQ | 2.0 | Extreme energy vs organics / cold / wet | Plasma torch; energy ≫ latent heat barriers (tune in MC) |
| TH → CR | 1.5 | Heat accelerates chemistry | Arrhenius: \(k = A e^{-E_a/RT}\) |
| LU → GA | 1.5 | Charge redistribution under illumination | Photoelectric / \(E = hf\) intuition |
| FL → VO | 1.5 | Life as local negentropy pocket | Open thermodynamic systems vs gravity wells |

### 2.2 Dual-affinity blend (secondary)

Suggested **baseline blend** before dynamic **`m1`** reshape — default \(\eta = 0.35\) ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §5.5):

```
B = CHART₀[attack][def_primary] * (1 - η) + CHART₀[attack][def_secondary] * η
-- then m1 = clamp(m_min, m_max, reshape(B, stats, materials, emphasis, move, field))
```

---

## 3. Expanded core stats — 6 → 9

### 3.1 Nine-stat core

| Id | Role | Combat use | Hook |
|----|------|------------|------|
| `stamina` | Endurance capacity | \(S_{\max}\); pool sized by stat + level/budget | — |
| `might` | Physical offense | Strike | \(F = ma\) metaphor |
| `bulwark` | Physical mitigation | Strike saturation | Stress–strain |
| `insight` | Special offense | Surge / resonance moves | Energy / amplitude |
| `ward` | Special mitigation | Surge | Absorption |
| `tempo` | Speed / initiative | Turn order, evasion | Reaction time |
| `acuity` *(new)* | Precision / focus | Accuracy; focused moves; Layer 2 quality | SNR / measurement precision |
| `resilience` *(new)* | Recovery rate | Faster accumulator decay toward baseline | \(\tau\) homeostasis |
| `flux` *(new)* | Rate coupling | Outgoing accumulator impulses; field adoption speed | \(\partial u/\partial t\) sensitivity |

### 3.2 New stat mechanics (sketch)

- **Acuity:** while `focused`, next move power \(\times \bigl(1 + 0.4 \tanh(\mathrm{acuity}_{\mathrm{eff}}/100)\bigr)\) (tune).
- **Resilience:** \(\tau_{\mathrm{eff}}(u) = \tau_{\mathrm{base}}(u)\cdot(1 + \alpha_{\mathrm{res}}\cdot \mathrm{resilience}_{\mathrm{eff}}/100)\).
- **Flux:** outgoing impulses \(\times (1 + \beta_{\mathrm{flux}}\cdot\ldots)\); field adoption \(\times (1 + \gamma_{\mathrm{flux}}\cdot\ldots)\).

### 3.3 Migration defaults

`acuity = insight * 0.6`, `resilience = stamina * 0.4`, `flux = (might + insight) * 0.2` — **migration baselines only** for tooling when extended stats are omitted; **individual creatures do not inherit these from a species row**—either roll the three stats directly or apply this map **globally** as a dev default. Optional **classic mode** fixes three stats to constants.

---

## 4. Expanded material profile — 5 → 12 components

### 4.1 Twelve-component profile

Normalized \([0,1]\) unless noted. Keys Layer 2 / Layer 3.

| Component | Meaning | Examples |
|-----------|---------|----------|
| `thermal_mass` | Heat stored per degree | \(\tau\) thermal; damp spikes |
| `conductivity` | Thermal + electrical transmission | Galvanic / heat equilibration |
| `rigidity` | Brittleness vs flexibility | Fracture ψ; concussive transmission |
| `porosity` | Void fraction; fluid hold | Wetness; corrosion ingress; laceration |
| `polarity` | Dipole strength | Charge leakage; GA hooks |
| `density` *(new)* | Inertial resistance | Void scaling; sonic impedance \(Z \sim \rho v\) |
| `elasticity` *(new)* | Stored elastic energy | Concussive rebound; clotting / snap-back |
| `reflectivity` *(new)* | EM reflectance | LU mitigation; beam reflect rules |
| `acoustic_impedance` *(new)* | \(Z\) mismatch → reflection | Sonic efficiency |
| `chemical_reactivity` *(new)* | Corrosion kinetics multiplier | `corrosion` impulse scaling |
| `magnetization` *(new)* | Magnetic susceptibility | `magnetic_flux`; GA + PL hooks |
| `permeability` *(new)* | Gas/fluid penetration | Aero dehydration; CR ingress |

### 4.2 Authoring examples (canonical species morphologies)

**Volcanic Tortoise** — Thermal / Mineral dual emphasis (shell geology):

```yaml
species_template_id: volcanic_tortoise
thermal_mass: 0.85
conductivity: 0.30
rigidity: 0.90
porosity: 0.15
polarity: 0.20
density: 0.80
elasticity: 0.10
reflectivity: 0.35
acoustic_impedance: 0.85
chemical_reactivity: 0.45
magnetization: 0.15
permeability: 0.10
```

**Storm Jellyfish** — Galvanic / Aero dual emphasis (ionic gel + shear):

```yaml
species_template_id: storm_jellyfish
thermal_mass: 0.20
conductivity: 0.90
rigidity: 0.05
porosity: 0.75
polarity: 0.85
density: 0.30
elasticity: 0.80
reflectivity: 0.10
acoustic_impedance: 0.20
chemical_reactivity: 0.65
magnetization: 0.40
permeability: 0.85
```

### 4.3 Composite shortcuts (cached per tick)

```
acoustic_transparency ≈ f(acoustic_impedance)
fracture_susceptibility ≈ rigidity * (1 - elasticity)
corrosion_rate ≈ chemical_reactivity * porosity
ionic_coupling ≈ conductivity * polarity
thermal_stability ≈ thermal_mass * (1 - conductivity)
void_compression_factor ≈ density * (1 - elasticity)
```

---

## 5. Complete move taxonomy — 8 categories

### 5.1 Categories

| Category | Offense | Defense | Strike modalities? | Notes |
|----------|---------|---------|---------------------|--------|
| `strike` | `might_eff` | `bulwark_eff` | Yes (`COMBAT-MODEL` §5.4b) | Physical |
| `surge` | `insight_eff` | `ward_eff` | No | Energy |
| `true` | — | — | No | Bypass saturation |
| `field` | — | — | No | Context scalars |
| `reactive` | Varies | Varies | Possible | Counter — Primed stance |
| `channel` | Varies | Varies | Possible | Subtick partial hits |
| `resonance` | `insight_eff * R_scale` | Varies | No | Training Resonance budget |
| `catalyst` | Partial | None | No | Primes reaction charge |

### 5.2 Extended move fields

Add to [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §3 when implementing: `priority_tier`, `channel_duration`, `catalyst_id`, `resonance_scale`, `stance_required`, `stance_sets`, `contact`, `focused_bonus`, `combo_setup`, `combo_detonate`, etc.

### 5.3 Field moves (examples)

Field moves reshape `BattleContext` scalars. They typically resolve at priority tier `0` unless authored otherwise; effects apply for `duration_turns` unless cleansed.

```yaml
id: volcanic_surge
category: field
affinity: TH
effect:
  ambient_temp: "+8"
  humidity: "* 0.70"
  duration_turns: 3
  message: "The arena superheats!"

id: aqua_veil
category: field
affinity: AQ
effect:
  humidity: "+0.40"
  wetness_all_active: "+0.15"
  duration_turns: 4

id: seismic_grid
category: field
affinity: MI
effect:
  terrain_id: conductive_stone
  acoustic_transmission_bonus: "+0.25"
  galvanic_resistance_bonus: "+0.30"
  duration_turns: 5

id: vacuum_pocket
category: field
affinity: VO
effect:
  humidity: "= 0"
  ambient_temp: "= -5"
  sonic_damage_multiplier: "= 0"
  aero_power_penalty: "-0.50"
  duration_turns: 2
```

### 5.4 Reactive moves

Declared from **Primed** stance; **one** reactive declaration per turn. Triggers include `on_hit`, `on_damage_gt(fraction_of_S_max)`, `on_accumulator_cross(id, threshold)`, `on_miss`, `on_switch_in`, `on_status_applied`.

```yaml
id: counter_shock
category: reactive
affinity: GA
trigger: on_hit
condition: attacker_has_contact == true
base_power: 80
fires_as_category: true   # resolves as true-category endurance hit
message: "The electrical discharge retaliates!"

id: thermal_rebound
category: reactive
affinity: TH
trigger: on_damage_gt
threshold_fraction: 0.20   # single hit > 20% of current S_max proxy
effect:
  heat_load_self: "+0.25"
  attacker_endurance_dot: "0.05 * attacker_S_max per turn (1 turn)"
```

Reactive resolutions **do not** consume the declared primary action slot; power is offset by Primed stance penalties (§6).

### 5.5 Channel moves

Continuous beam / sustain: each subtick runs a **partial** pipeline hit with `base_power / channel_duration`. Accuracy once at channel start; miss ends channel. Exposure ramp [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §7 applies.

```yaml
id: sustained_plasma_beam
category: channel
affinity: PL
base_power: 30
channel_duration: 4
ramp_eta: 0.30
channel_break: false
ionization_impulse_per_subtick: 0.08
```

Defender may **break** channel with `channel_break: true` and `priority_tier >= +1`.

### 5.6 Resonance moves

\[
R_{\mathrm{factor}} = 1 + \mathrm{resonance\_scale}\cdot\tanh(R_{\mathrm{allocated}} / R_{\mathrm{ref}})
\]

Keep `resonance_scale ∈ [0.5, 1.2]` per move data; \(R_{\mathrm{ref}}\) calibrates “how much training feels capped.”

### 5.7 Catalyst moves & combo primes

```yaml
id: acid_etch
category: catalyst
affinity: CR
base_power: 40
catalyst_id: acid_primed
catalyst_duration_turns: 3
effect:
  corrosion: "+0.15"
  message: "Acid seeps into structural gaps..."

id: structural_break
category: strike
affinity: MI
combo_detonate: acid_primed
combo_bonus_mult: 1.80
message: "The strike shatters the corroded structure!"
physics_note: "Stress concentration in pre-corroded material"
```

---

### 5.8 Strike modalities vs “force profile” (alignment note)

Canonical shipped schema uses **`strike_modalities`** `{ concussive, piercing, slashing }` as a **simplex** on strikes ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §5.4b). Older drafts sometimes call this `force_profile` + scalar \(\phi_{\mathrm{mode}}\); **do not** fork two saturation pipelines — treat `force_profile` language as narrative shorthand for **which modality weight dominates**.

---

## 6. Stance system

### 6.1 Five stances — stat multipliers and rules

| Stance | might/insight | bulwark/ward | tempo | acuity | Special |
|--------|----------------|--------------|-------|--------|---------|
| **Grounded** | ×1.0 | ×1.0 | ×1.0 | ×1.0 | Default |
| **Assault** | ×1.20 | ×0.80 | ×1.05 | ×0.90 | +crit%; no reactive declare |
| **Fortified** | ×0.85 | ×1.30 | ×0.80 | ×1.10 | Incoming impulses ×0.70; status thresholds +15% |
| **Fluid** | ×0.90 | ×0.90 | ×1.25 | ×1.10 | Evasion +15%; wetness / sonic_stress shed |
| **Primed** | ×1.00 | ×0.85 | ×0.95 | ×1.20 | One reactive declaration; focus duration +1 |

Transitions: declare with action; stance changes at priority +1; coupling rules (Fortified → Assault lock under heavy damage) — full detail in `stances.json`.

### 6.2 Transition rules (authoring detail)

- Stance changes are declared **as part of the action** and resolve at **priority tier +1** (before most strikes).
- You cannot change stance **and** spend a normal attack slot in the same sealed declaration unless the move carries `stance_sets` (post-move stance snap).
- Moves may be `stance_locked` to one stance only.
- **Fortified discipline:** if Fortified and you took endurance loss exceeding **25% of \(S_{\max}\)** this turn, you cannot enter Assault same turn (disruption lock).

### 6.3 Stance–accumulator coupling (reference pseudocode)

```
if stance == FORTIFIED:
  Δu_incoming *= 0.70

if stance == ASSAULT:
  Δu_outgoing *= 1.15

if stance == FLUID:
  wetness -= 0.03 per turn
  sonic_stress -= 0.04 per turn

if stance == PRIMED:
  ionization_self += 0.02 per turn   # charged focus flavor
```

### 6.4 Physics education (tooltip tier)

Stances teach **continuous offense/defense trade-offs**: Fortified matches higher damping in driven oscillators (lower steady amplitude); Fluid suggests impedance matching / reduced coupling cross-section. [`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md) §8 governs how deep copy goes.

---

## 7. Ability framework

### 7.1 Slots per creature

| Stage | Slots |
|-------|--------|
| **Stage 1** | 1 passive |
| **Stage 2** | 1 passive + **1** passive-or-choice unlock |
| **Stage 3** | 1 passive + **1** reactive + **1** advanced passive |

Species expose **2–3 candidates per slot**; picked at advancement. Effects are Layer 2 predicates keyed by `ability_id`.

### 7.2 Passive examples by affinity (illustrative)

| Affinity | Name | Effect summary |
|----------|------|------------------|
| TH | **Thermal Inertia** | `heat_load` decay ×0.60 — stores heat longer |
| TH | **Backdraft** | Rapid drop heat_load 0.70→\<0.20 → burst steam **true-category** chip vs attacker |
| CY | **Brittle Resonance** | Sonic hit → fracture impulse ×1.50 |
| CY | **Supercooling** | At `heat_load < -0.50`, next AQ vs self resolves as CY ×1.5 |
| AQ | **Hydraulic Memory** | AQ-tagged moves +10% pierce vs `wetness > 0.40` |
| AQ | **Surface Tension** | Slashing modality rejects 20% laceration impulse |
| GA | **Charge Accumulation** | `+0.015 charge_buildup` / subtick passive |
| GA | **Arc Discharge** | Cross 0.75 charge → free surge (power ~60), drains charge toward 0.30 |
| MI | **Load Bearing** | Bulwark saturation curve micro-shift (~+12% mid-band effective bulwark) |
| MI | **Crystalline Memory** | Fracture \<0.10 recovery → bulwark ×1.15 two turns |
| FL | **Photosynthesis** | Bright fields (`ambient_luminance > 0.50`) → +2% \(S_{\max}\) recovery / turn |
| FL | **Spore Cloud** | Damage burst >15% \(S_{\max}\) → 30% corrosion impulse vs attacker if contact |
| AE | **Low Profile** | +12% evasion; Void damage ×1.50 taken |
| AE | **Vortex Drag** | Aero moves may impose −10% defender tempo 1 turn |
| LU | **Photon Skin** | First LU hit each battle ×0.50 |
| LU | **Coherent Pulse** | While focused: LU surges treated laser-like; pierce bonus |
| VO | **Mass Distortion** | Tempo tie-breaking flavor (floor rounding narratively) |
| VO | **Event Horizon** | Next catastrophic hit capped — excess absorbed (author thresholds) |
| SO | **Resonant Body** | Sonic STAB ×1.30 vs baseline ×1.15; risk self sonic_stress >0.60 feedback |
| SO | **Destructive Interference** | Once / battle negate inbound Sonic |
| CR | **Reactive Surface** | Contact vs self → attacker corrosion impulse +0.08 |
| CR | **Catalytic Efficiency** | Catalyst primes faster / stronger detonation |
| PL | **Ion Shield** | First status / battle 50% → bleed into ionization field |
| PL | **Runaway Heating** | If `heat_load > 0.60`, PL moves +20% |

### 7.3 Reactive ability examples (Primed slot declarations)

| Name | Trigger | Effect | Hook |
|------|---------|--------|------|
| **Counter-Current** | `on_hit` contact | True-category retaliation (~power 60); pays heat_load | Newton III |
| **Hardening** | `on_damage_gt(0.18)` | Bulwark ×1.25 two turns | Work hardening |
| **Phase Collapse** | cross `heat_load 0.80` | Convert fraction → one-shot PL surge | Stored thermal release |
| **Frequency Lock** | Sonic hit | Reflect ~50% sonic endurance | Impedance / reflection |
| **Quench** | Ally crosses heat | Dump ally heat→ AQ wetness field | Metallurgical quench |

Full predicates ship in `abilities/*.yaml`.

---

## 8. Status condition registry — 12 named thresholds

**Philosophy:** Accumulators are continuous; statuses are **threshold-crossing** modifiers applied to [`BattleContext`](./COMBAT-MODEL.md) Layer 2; endurance drains (\(\mathrm{d}S/\mathrm{d}t\)) are explicit where noted ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §6).

| ID | Trigger | Active effects | Cure | Physics hook |
|----|---------|----------------|------|----------------|
| `seared` | `heat_load > 0.85` | DoT 3% \(S_{\max}\)/turn; move power −10%; blocks passive \(S\) regen unless noted | AQ move or ambient cooling trend ≥3 turns | Burn tolerance |
| `hypothermic` | `heat_load < −0.60` | Tempo −25%; insight −15%; DoT 2% \(S_{\max}\)/turn | TH move or ambient warming | Enzyme cold slowdown |
| `frozen` | hypothermic ∧ `cryo_load > 0.70` | 50% skip action; bulwark ×1.20, ward ×0.70 | TH breaking hit ×1.5 clears; or decay ≥3 turns | Solid-phase stiffness |
| `waterlogged` | `wetness > 0.90` | GA in ×1.50; AE in ×1.30; sonic attacks +25%; tempo −10% | Aero field / sustained heat dry-down | Conduction + acoustic coupling |
| `paralyzed` | `charge_buildup > 0.80` | Tempo −50%; 25% total action fail | MI grounding / timed decay | Runaway charge neuromuscular metaphor |
| `fractured` | `fracture > 0.75` | Bulwark −30%; piercing modality ×1.30; slashing ×1.20 | Mend moves / slow natural decay | Stress concentrators |
| `concussed` | `concussion > 0.70` | Accuracy −30%; tempo −20%; acuity specials halved | Resilience-scaled turns; focus restores | Neural impulse disruption |
| `bleeding` | `laceration > 0.65` | DoT 2.5% \(S_{\max}\)/turn; AQ hits extend | Cryo clot analogs / cautery / decay | Shear vessel damage |
| `corroded` | `corrosion > 0.75` | Bulwark −20%; ward −20%; CR in ×1.35 | AQ flush / very slow decay | Section loss |
| `irradiated` | `radiation > 0.60` | Ward −25%; recovery moves 50%; DoT 1.5% \(S_{\max}\)/turn | Time (~6t) / rad-flush | Repair inhibition |
| `deafened` | `sonic_stress > 0.70` | Own sonic moves suppressed; acuity halved; inbound sonic −50% | VO strips medium / decay | Sensory saturation |
| `ionized` | `ionization > 0.50` | GA & PL in ×1.25; leaks `+0.01 charge_buildup`/turn field-wide; ally GA/PL STAB ×1.10 | Ground / AQ flush | Plasma coupling reservoir |

### 8.3 Escalation tiers (examples)

```
hypothermic --(cryo_load pushes)--> frozen
waterlogged --(GA hit)--> chain_lightning_rules (AoE surge hooks)
paralyzed --(tempo hits 0)--> locked (full action loss 1 turn)
bleeding --(laceration > 0.90)--> hemorrhage (DoT doubles; rescuetimer pressure)
```

UI should pulse / recolor icons at escalation so threshold dynamics read visually.

---

## 9. Expanded Layer 3 accumulator registry

### 9.1 Accumulators + roles

**Core (existing combat docs):** `fracture`, `heat_load`, `wetness`, `concussion`, `laceration`, `charge_buildup`.

**Extended:** `cryo_load`, `corrosion`, `radiation`, `sonic_stress`, `ionization`, `magnetic_flux`, `compression`, `bio_resonance`.

| Key | Build flavor | Status / rule hooks | ODE sketch |
|-----|----------------|---------------------|------------|
| `fracture` | Strikes + Cryo rigid coupling | `fractured` | \(\mathrm{d}F=\eta I_\mathrm{strike}\psi(\mathrm{rigidity})-\lambda F\) |
| `heat_load` | TH exertion + ambient | `seared` / `hypothermic` | Newton cooling toward \(T_a\) |
| `wetness` | AQ + humidity | `waterlogged` | humidity exchange |
| `concussion` | Concussive modality weight | `concussed` | decay \(\tau_C\) vitality/tempo flavored |
| `laceration` | Slashing weight | `bleeding` | clotting \(\gamma_\mathrm{clot}\) |
| `charge_buildup` | GA + leaks | `paralyzed` | leaky RC analogy |
| `cryo_load` | CY sustained | enables `frozen` gate | coupled to low heat_load |
| `corrosion` | CR + catalyst | `corroded`, acid primes | rate \(\propto\) reactivity×porosity |
| `radiation` | LU intense | `irradiated` | slow decay \(\mu_\mathrm{rad}\) |
| `sonic_stress` | SO | `deafened`; resonance combos | transparency−reflection split |
| `ionization` | PL overflow pathways | `ionized` | coupling GA |
| `magnetic_flux` | GA sustained / PL confinement | mod GA/PL received | polarity match rules |
| `compression` | VO | minor vitality_max analogue stress | elasticity resist |
| `bio_resonance` | FL sustained / biome FL nets | FL mana-like unlocks | \(\sqrt{\mathrm{luminance}}\) gain |

### 9.2 Cross-coupling matrix (dominant pathways)

| Driver ↑ | heat_load | wetness | fracture | charge_buildup | corrosion | ionization |
|----------|-----------|---------|----------|----------------|-----------|------------|
| heat_load ↑ | — | evaporates | cryo combo accel | joule heating small | Arrhenius accel | indirect plasma heating |
| wetness ↑ | cools | — | — | leakage accel | solvent accel | — |
| fracture ↑ | — | — | — | — | surface area accel | — |
| charge_buildup ↑ | slight ↑ | — | — | — | electrochemical bridge | overflow feeds |
| corrosion ↑ | — | — | accelerates | accelerates | — | slight |
| sonic_stress ↑ | — | — | resonance accel | — | — | — |

Author coupling strengths numerically in `accumulators.json`.

### 9.3 UI tiers

Per [`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md) §8:

- **Novice:** `heat_load`, `fracture`, `charge_buildup` bars only.
- **Competitor:** full compact accumulator icons + status badges.
- **Analyst:** numeric \(u\), \(\mathrm{d}u/\mathrm{d}t\) arrows, active coupling highlights + one-line mechanism captions.

---

## 10. Battle phase structure

### 10.1 Ordered pseudocode (authoritative flow sketch)

```
PRE-TURN
  1. Passive accumulator ticks (abilities)
  2. Field scalar passive evolution (ambient humidity etc.)
  3. Bench decay accelerators (3× λ baseline)

ACTION DECLARATION (simultaneous sealed envelopes)
  1. Each player: move OR switch OR item OR forfeit
  2. Optional stance change declaration
  3. Optional reactive declaration (Primed)
  4. Channel continuation / cancel hooks

PRIORITY RESOLUTION
  Tier +3 emergency items (product flag)
  Tier +2 quick moves / flee
  Tier +1 stance transitions / interrupts / switch actions (unless free replacement)
  Tier  0 standard / field / catalyst
  Tier −1 resonance / slow surges
  Tier −2 heavy channels / setups
  Tie-break: tempo_eff then seeded RNG stream

EXECUTION (per resolved action in priority order)
  1. Accuracy check (channel: once at start)
  2. Miss → Miss event; skip on-hit hooks
  3. Hit → category dispatch → endurance pipeline ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §5)
  4. Apply Layer 3 impulses target (+ self recoil)
  5. Evaluate Layer 2 rules post-impulse
  6. Defender reactive checks (insert immediately after triggering step completes)
  7. Emit HitResolved analytics payload
  8. Status threshold evaluations / queue stable ordering

END-OF-TURN
  1. Apply explicit endurance DoT / recovery moves (dS/dt terms per COMBAT-MODEL §6)
  2. Subtick integrate accumulators (Euler or RK stub): u ← u + Δt·g(u,field,materials)
  3. Drain catalyst timers (−1 turn remaining)
  4. Decrement timed statuses; purge expired
  5. Incapacitation check (S ≤ 0 → replacement window rules)
  6. Switch-in pulses / bench snapshots
  7. Turn counter++; replay hash snapshot
```

### 10.2 Conflict examples

| Scenario | Resolution |
|----------|------------|
| Mirror tempo, same tier | RNG salt deterministically |
| Tier +2 quick vs Tier +1 switch | Quick resolves before switch completes targeting |
| Reactive satisfied mid-execution | Fire reactive immediately after triggering slice; resume priority queue |
| Active channel vs channel_break (+1) | Break cancels remainder; partial subtick effects retained |

### 10.3 Replay determinism

Given sealed declarations + full effective stats + `BattleContext.rng` (`room_id ⊕ turn ⊕ salt`), frames serialize identically — disputes replay from `ReplayFrame { turn_id, actions, rng_seed_delta, pre_state_hash }`.

---

## 11. Team and party composition

### 11.1 Party scaffolding

- **Party size:** 6 creatures standard bracket.
- **Active:** 1 Singles MVP / 2 Doubles backlog.
- **Switch cost:** consumes primary action slot at Tier +1 unless pivot move (`pivot: true`) or **free replacement** after incapacitation.
- **Forced replacement:** announced before opponent resolves following turn move selection window.

### 11.2 Bench dynamics

Bench creatures evolve faster toward homeostasis:

```
u_bench ← u_bench · exp( −3 · λ · Δt_turn )
```

\(S\) **does not** refill passively on bench unless ability / field states otherwise — anti-stall. Status timers tick while benched.

### 11.3 Synergy motifs

- **Affinity resonance:** ≥3 shared primaries → small passive field bias (+5% ambient alignment flavor).
- **Conductor chain:** AQ wetness → GA charge → PL ionization teach electrolytic coupling.
- **Thermal chain:** TH speeds corrosion kinetics → amplifies CR pressure — Arrhenius teaching loop.

### 11.4 Doubles backlog notes

Field moves global per arena plane; `splash: true` moves hit both foes at ×0.75 example scaling; catalyst primes team-detachable; shared ionization field leakage boosts GA/PL partner instantly.

---

## 12. Environmental biomes — 10 types

Biomes seed `BattleContext` field scalars and passive per-turn deltas.

```yaml
# Shared biome schema (authoring)
id: string
ambient_temp: float          # normalized
humidity: float              # [0, 1]
luminance: float             # [0, 1]
acoustic_reflection: float   # [0, 1]
terrain_id: string
initial_wetness_bonus: float # optional
passive_per_turn: { heat_load_change, wetness_delta, charge_buildup_delta, ... }
affinity_power_modifiers: { TH: 1.15, ... }
field_flags: []
```

### 12.1 Full authoring blobs (reference)

```yaml
id: neutral_arena
ambient_temp: 0
humidity: 0.50
luminance: 0.60
acoustic_reflection: 0.30
passive_per_turn: {}
affinity_power_modifiers: {}
field_flags: []
notes: Ranked baseline; equal footing.

---

id: volcanic_rift
ambient_temp: 35
humidity: 0.10
luminance: 0.80
acoustic_reflection: 0.40
passive_per_turn:
  heat_load_change: +0.04
  wetness_delta: -0.03
affinity_power_modifiers:
  TH: 1.15
  CY: 0.85
  PL: 1.20
field_flags: [volcanic_rock, thermal_upwelling]

---

id: tundra_shelf
ambient_temp: -25
humidity: 0.35
luminance: 0.40
acoustic_reflection: 0.50
passive_per_turn:
  heat_load_change: -0.035
  cryo_load_change: +0.02
affinity_power_modifiers:
  CY: 1.15
  TH: 0.85
  AQ: 0.90
field_flags: [permafrost, ice_surface]

---

id: deep_ocean_trench
ambient_temp: 4
humidity: 1.0
luminance: 0.05
acoustic_reflection: 0.90
initial_wetness_bonus: 0.40
passive_per_turn:
  wetness_delta: +0.05
affinity_power_modifiers:
  AQ: 1.20
  GA: 1.40
  SO: 1.35
  VO: 0.70
  LU: 0.60
field_flags: [deep_water, high_pressure, conductive_medium]

---

id: thunderhead_storm_cell
ambient_temp: 15
humidity: 0.80
luminance: 0.30
acoustic_reflection: 0.55
passive_per_turn:
  charge_buildup_delta: +0.05
  wetness_delta: +0.03
affinity_power_modifiers:
  GA: 1.25
  AE: 1.15
  AQ: 1.10
field_flags: [ionized_atmosphere, conductive_rain, gale_force]

---

id: crystalline_cavern
ambient_temp: -5
humidity: 0.30
luminance: 0.25
acoustic_reflection: 0.95
passive_per_turn:
  sonic_stress_delta: +0.03
affinity_power_modifiers:
  SO: 1.35
  MI: 1.20
  CY: 1.10
  LU: 0.70
field_flags: [crystal_lattice, high_acoustic_reflection, mineral_rich]

---

id: ancient_rainforest
ambient_temp: 28
humidity: 0.95
luminance: 0.50
acoustic_reflection: 0.20
initial_wetness_bonus: 0.20
passive_per_turn:
  wetness_delta: +0.04
  bio_resonance_delta: +0.05
affinity_power_modifiers:
  FL: 1.25
  GA: 1.10
  TH: 0.85
field_flags: [overgrown, mycelium_network, high_humidity]

---

id: near_vacuum_expanse
ambient_temp: -270
humidity: 0.0
luminance: 0.15
acoustic_reflection: 0.0
passive_per_turn:
  heat_load_change: -0.025
affinity_power_modifiers:
  VO: 1.35
  SO: 0.0
  AE: 0.0
field_flags: [no_atmosphere, vacuum, microgravity]
passive_endurance_loss_max_fraction_per_turn:
  AE_primary: 0.04
  SO_primary: 0.03

---

id: magma_chamber
ambient_temp: 80
humidity: 0.05
luminance: 0.95
acoustic_reflection: 0.60
passive_per_turn:
  heat_load_change: +0.07
  ionization_delta: +0.04
affinity_power_modifiers:
  PL: 1.30
  TH: 1.20
  LU: 1.10
field_flags: [extreme_heat, ionized_gas, volcanic_ejecta]

---

id: prismatic_salt_flat
ambient_temp: 18
humidity: 0.15
luminance: 0.90
acoustic_reflection: 0.30
passive_per_turn:
  radiation_delta: +0.03
  charge_buildup_delta: +0.02
affinity_power_modifiers:
  LU: 1.25
  CR: 1.15
  GA: 1.10
field_flags: [salt_surface, high_UV, ionic_ground, reflective]
```

### 12.11 Dynamic evolution

Field-move counters (`cumulative_TH_PL_field_moves`, etc.) may shift biome scalars with scripted thresholds (`biome_evolution_rules`).

---

## 13. Physics-forward combo system

| Combo | Step 1 (setup) | Step 2 (detonate) | Bonus | Mechanism |
|-------|----------------|-------------------|-------|-----------|
| **Flash Freeze** | AQ: `wetness > 0.60` | CY within 1 turn | +60% CY; fast-track `frozen` | Rapid freeze / latent heat |
| **Thermal Runaway** | Two TH hits same battle | PL while `heat_load > 0.70` | PL +50%; `ionization +0.30` | Positive feedback |
| **Lightning Rod** | MI field / grounding move | GA next turn | GA ×1.70; target charge doubles | Ground path |
| **Resonant Fracture** | SO: `sonic_stress > 0.30` | Physical strike next turn | Strike ×1.80; fracture impulse ×2 | Mechanical resonance |
| **Acid Etch** | CR catalyst | MI / strike detonate | ×1.80; extra bulwark shred | Corrosion + stress concentration |
| **Steam Explosion** | AQ `wetness > 0.70` | TH (hot field) | TH ×1.40; tempo debuff | Flash vapor expansion |
| **Void Silence** | VO vacuum field | SO vs same target | Sonic → 0; VO amp | No acoustic medium |
| **Photoelectric Strike** | LU surge over ward threshold | GA ≤2 turns | GA ×1.45; target `charge_buildup +0.25` | Photoemission chain |
| **Catalytic Oxidation** | Aero oxygen field | CR next turn | CR ×1.60; corrosion rate ×2 | Oxidizer availability |
| **Cryo-Shock** | CY `cryo_load > 0.50` | TH same sequencing window | TH ×1.90; `fracture +0.30` | Thermal shock |

Author in `combos.json`; tie to `catalyst_id` / `combo_detonate` fields (`§5`).

**UI:** primed glow + battle journal — stealth discovery vs codex (**Open decision** §16).

---

## 14. Expanded physics education map

### 14.1 Original nine affinities — deepened hooks

| Affinity | Observable behavior | Concept learned | Analyst-tier formalism (optional) |
|----------|---------------------|-----------------|-------------------------------------|
| Thermal | `heat_load` relaxes toward ambient | Heat capacity; Newton cooling | \(\mathrm{d}H/\mathrm{d}t \approx -(H-T_a)/\tau\) |
| Cryo | Cold stacks slower on massive bodies; brittle cracks | Phase change; fracture toughness | latent heat; \(K_{Ic}\) metaphor |
| Aqueous | `wetness` vs humidity | Specific heat; osmotic gradients | coupling to humidity driver |
| Galvanic | Charge builds / leaks; wet spikes | Ohm; leaky capacitor | \(\mathrm{d}Q/\mathrm{d}t = I_{\mathrm{in}} - Q/\tau\) |
| Mineral | Rigidity ↔ fracture coupling | Stress–strain; grounding | \(\sigma = F/A\) flavor |
| Flora | Long fights; sustained FL economy | Metabolism; chemical storage | saturation kinetics metaphor |
| Aero | Spreads / clears field scalars | Bernoulli; Reynolds | \( \mathrm{Re} = \rho v L/\mu\) |
| Luminous | Pierce / reflect loops | Spectrum; coherence | \(E = hf\); Beer–Lambert intuition |
| Void | Medium strip; compression flavor | Potential; pressure collapse | escape velocity metaphor |

### 14.2 New affinities — compact hooks

**Sonic:** resonance combos vs rigid targets; SO→VO immunity teaches medium requirement; impedance mismatch teaches reflection; exposure ramp teaches interference superposition.

**Corrosive:** stacking `corrosion` teaches rate laws; TH→CR chart teaches Arrhenius; dilution / flush teaches equilibrium shift.

**Plasmic:** burst + field `ionization` teaches collective plasma behavior; steep scaling vs heat teaches strongly nonlinear response (balance-owned); Debye / shielding flavor for Ion Shield-style abilities.

### 14.3 Mechanics as calculus education

| Mechanic | Math concept | How players learn it |
|----------|----------------|----------------------|
| Saturation curves | Bounded smooth maps; asymptotes | Diminishing returns past high defense |
| Accumulator decay | Exponential relaxation; \(\tau\) | Effects clear faster when resilience is high |
| Combo thresholds | Piecewise / conditional gains | Priming before finishing hits harder |
| Multi-hit exposure ramp | Discrete integration / buildup | Sequences beat isolated equal hits |
| Corrosion kinetics | Coupled rates | Long fights amplify CR unless cleansed |
| Acoustic impedance | Interface reflection | Sonic matchup depends on material |
| Environmental equilibration | Drivers toward fixed points | Fields pull all battlers toward shared scalars |

### 14.4 Tutorial layering (policy)

**Never** surface raw formulas in default combat HUD.

1. **Action** — player sees outcomes first.  
2. **Meter** — accumulator / modifier that caused it.  
3. **Tooltip** — one sentence, physics correct.  
4. **Glossary** — short paragraph with historical anchor when helpful.  
5. **Analyst tier** — equations with variable names tied to live battle state.

[`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md) §8 is normative for tier gating.

---

## 15. Updated data artifacts checklist

**Extends [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §9:**

| Artifact | Role |
|----------|------|
| `affinities.json` | **Updated** — 12 entries (post-MVP): Sonic, Corrosive, Plasmic + icon keys |
| `affinity_chart.json` | **`CHART₀` baseline** 12×12 + metadata — feeds §5.5 dynamic `m1`; not the sole multiplier |
| `layer1_shape.json` *(or fold into `scaling_curves.json`)* | κ₁, κ₂, `m_min`, `m_max`, `stab_factor`, `resist_kernel` — reshape tuning |
| `material_axes.json` / species ranges | **Updated** — 12 material components; normalization; Layer 2 shorthand coeffs |
| `scaling_curves.json` | Saturation \(\kappa\); material \(\psi\); new accumulator rate constants |
| `reaction_rules/*.yaml` | Layer 2 rules: new affinities, stance gates, combo detonations |
| `moves.json` or split YAML | Extended §5.2 fields; `category` enum (8); catalyst / combo IDs |
| `moves/field_moves.yaml` | Field scalar deltas (§5.3) |
| `moves/reactive_moves.yaml` | Reactive triggers + payloads |
| `moves/channel_moves.yaml` | Duration, ramp, break rules |
| `moves/resonance_moves.yaml` | `resonance_scale`, `R_ref` |
| `status_conditions.json` | §8 — thresholds, cures, effects |
| `accumulators.json` | §9 — ODE templates, cross-coupling weights, UI tier hints |
| `stances.json` | §6 |
| `abilities/*.yaml` | §7 predicates keyed by `ability_id` |
| `combos.json` | §13 named combos + linkage to catalyst IDs |
| `biomes.json` | §12 presets + `biome_evolution_rules` |
| `species/*.yaml` | Optional narrative/spawn metadata (**never** canonical stat rows); instances roll stats/materials/emphasis ([`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §1). |

Continue content hashing + `schema_version` per replay header.

---

## 16. Balance notes and open tuning decisions

### 16.1 Known concerns

- **Void** offensive breadth — compensate via stat budgets, slow tiers, `compression` pacing.  
- **Plasmic** burst — gate via channel/resonance costs, self heat, glass chassis.  
- **SO vs VO = 0** — biome passive harm for Sonic in vacuum so vacuum isn't a free blank.

### 16.2 Open decisions

Secondary \(\eta\), Doubles timing, stance action cost, Resonance respec policy, combo UI visibility, biome selection authority, channel-break priority math, accumulator caps — inherit / extend [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §10.

### 16.3 Monte Carlo targets

Chart symmetry, \(\kappa\) saturation bounds, status permanence without reinvestment, combo caps (>×2.0 scrutiny), PL/VO matchup spreads.

---

## Document changelog

| Date | Change |
|------|--------|
| 2026-05-03 | Initial comprehensive expansion imported into repo (affinities 12, chart, stats, materials, moves, stances, abilities, statuses, accumulators, phases, team, biomes, combos, pedagogy, artifacts, balance) |
| 2026-05-03 | Biome schema + preset bullets; full combo table §13; cross-links from TECH/COMBAT/GAMEPLAY/SIMULATION/README/PROJECT-BRIEF |
| 2026-05-03 | Aligned with endurance-first combat: **`stamina`**, \(\mathrm{d}S/\mathrm{d}t\) DoT language; faint → incapacitation |
| 2026-05-03 | §2: `CHART₀` = baseline prior; shipped **`m1`** dynamic per [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §5.5; artifact split (`layer1_shape`); **catalog = identity only**, instances roll builds |
| 2026-05-03 | Restored paste-depth §§5.3–5.7 YAML, §§6.2–6.4, §7 tables, §8–11 detail, §12 biome blobs, §14 tables; §5.8 modalities alignment; §15 artifact rows; link [`SPECIES-INSTANCE-EXAMPLES.md`](./SPECIES-INSTANCE-EXAMPLES.md) |
| 2026-05-03 | §3.3 & §15: no species-authored stat templates; optional `species/*.yaml` = narrative/spawn only |
