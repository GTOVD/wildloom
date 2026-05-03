# Wildloom — expanded design supplement

**Companion to:** [`COMBAT-MODEL.md`](./COMBAT-MODEL.md), [`GAMEPLAY-SYSTEMS.md`](./GAMEPLAY-SYSTEMS.md), [`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md), [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md)

**Purpose:** Fills gaps and expands systems that are framework-only elsewhere. Sections are organized for implementation. Where existing docs define structure, this doc adds concrete first-pass targets, extra mechanics, and extended physics-education hooks.

**Scope:** [`GAMEPLAY-SYSTEMS.md`](./GAMEPLAY-SYSTEMS.md) describes the **nine-affinity MVP**. This supplement defines the **twelve-affinity** target, nine core stats, twelve material axes, extended move categories, stances, statuses, biomes, combos, and data artifacts—**phase in**; numbers require Monte Carlo before shipping.

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
| `VO` | **Void** | Gravity, vacuum, isolation | Compression on vitality; removes medium | Gravitational potential, tidal stress |
| `SO` | **Sonic** *(new)* | Sound, resonance, vibration | Setup / detonation; resonant shattering | Wave equation, impedance, resonance |
| `CR` | **Corrosive** *(new)* | Acid/base, oxidation | Accumulator erosion; armor degradation over time | Rate laws, Arrhenius, Le Chatelier |
| `PL` | **Plasmic** *(new)* | Ionized plasma, high-energy matter | Burst; breaches bulwark + ward angles | Ionization, Debye shielding; \(T^4\) radiative flavor |

### 1.3 Identity notes (new affinities)

- **Sonic:** Resonance matching — sustained `sonic_stress` enables tuned follow-ups (destructive resonance metaphor). Educational: periodic forcing near natural frequency.
- **Corrosive:** Dominates **long** fights via `corrosion` accumulator — teaches rate laws and concentration.
- **Plasmic:** High variance; `ionization` field play with Galvanic allies; steep scaling flavor with heat / energy (balance via fragility and costs per §16).

---

## 2. The complete 12×12 affinity chart

`CHART[attacker][defender_primary]` — Layer 1 multiplier `m1` before STAB / Layer 2 / Layer 3.

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

| Matchup | Value | Physics reasoning |
|---------|-------|-------------------|
| GA → AE | 2.0 | Breakdown / discharge paths in ionized gas |
| AQ → GA | 1.5 | Ionic conduction — water bridges paths |
| MI → GA | 2.0 | Grounding / shunting metaphor |
| SO → MI | 2.0 | Resonance vs brittle lattice |
| SO → VO | 0.0 | No propagating medium — vacuum |
| VO → AE / SO | 2.0 | Removes gas / acoustic medium |
| CR → MI | 2.0 | Dissolution / acid–base attack on mineral |
| PL → FL / CY / AQ | 2.0 | Extreme energy vs organics / cold / wet targets (tune in MC) |

### 2.2 Dual-affinity blend (secondary)

Per [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §5.5 — suggested default \(\eta = 0.35\):

```
m1_final = m1_primary * (1 - η) + CHART[attack][defender_secondary] * η
```

---

## 3. Expanded core stats — 6 → 9

### 3.1 Nine-stat core

| Id | Role | Combat use | Hook |
|----|------|------------|------|
| `vitality` | HP capacity | Max HP | — |
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

`acuity = insight * 0.6`, `resilience = vitality * 0.4`, `flux = (might + insight) * 0.2` — **migration baselines only**; species should diverge. Optional **classic mode** fixes three stats to constants.

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

### 4.2 Authoring examples

See original supplement YAML (**Volcanic Tortoise**, **Storm Jellyfish**) — replicate in `species/*.yaml` under `material_profile`.

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

### 5.3–5.7 Field, reactive, channel, resonance, catalyst

**Field moves** — mutate `BattleContext` / global scalars (`ambient_temp`, `humidity`, `terrain_id`, flags like `sonic_damage_multiplier`). Examples: `volcanic_surge`, `aqua_veil`, `seismic_grid`, `vacuum_pocket`.

**Reactive** — declared in **Primed** stance; triggers `on_hit`, `on_damage_gt`, `on_accumulator_cross`, etc.; resolved after triggering hit per §10.

**Channel** — `base_power / duration` per subtick; exposure ramp §7; `channel_break` interrupts.

**Resonance:** \(R_{\mathrm{factor}} = 1 + \mathrm{resonance\_scale}\cdot\tanh(R_{\mathrm{allocated}}/R_{\mathrm{ref}})\).

**Catalyst** — primes `catalyst_id`; detonate via `combo_detonate` for bonus mult — corrosion-assisted cracking metaphor.

---

## 6. Stance system

Five stances — stat multipliers and rules:

| Stance | might/insight | bulwark/ward | tempo | acuity | Special |
|--------|----------------|--------------|-------|--------|---------|
| **Grounded** | ×1.0 | ×1.0 | ×1.0 | ×1.0 | Default |
| **Assault** | ×1.20 | ×0.80 | ×1.05 | ×0.90 | +crit%; no reactive declare |
| **Fortified** | ×0.85 | ×1.30 | ×0.80 | ×1.10 | Incoming impulses ×0.70; status thresholds +15% |
| **Fluid** | ×0.90 | ×0.90 | ×1.25 | ×1.10 | Evasion +15%; wetness / sonic_stress shed |
| **Primed** | ×1.00 | ×0.85 | ×0.95 | ×1.20 | One reactive declaration; focus duration +1 |

Transitions: declare with action; stance changes at priority +1; coupling rules (Fortified → Assault lock under heavy damage) — full detail in `stances.json`.

**Pedagogy:** trade-offs as damping / impedance metaphors (tooltip-only).

---

## 7. Ability framework

- **Stage 1:** 1 passive  
- **Stage 2:** 1 passive + choice  
- **Stage 3:** + reactive + advanced passive  

Author as Layer 2 rules with `ability_id`. Illustrative table (Thermal Inertia, Backdraft, Brittle Resonance, Arc Discharge, Resonant Body, Ion Shield, …) lives in `abilities/*.yaml` — see original supplement §7.2–7.3 for full example list.

---

## 8. Status condition registry — 12 named thresholds

**Philosophy:** Status = threshold-crossing on accumulators → persistent modifier + cure rules.

| ID | Trigger (accumulator) | Effects (summary) | Cure sketch |
|----|------------------------|-------------------|-------------|
| `seared` | `heat_load > 0.85` | DoT; power down | AQ / cool field |
| `hypothermic` | `heat_load < -0.60` | Tempo / insight down | Heat / ambient rise |
| `frozen` | hypothermic ∧ `cryo_load > 0.70` | Action skip chance; defense skew | Thermal break |
| `waterlogged` | `wetness > 0.90` | GA/AE/SO mods | Aero / dry field |
| `paralyzed` | `charge_buildup > 0.80` | Tempo collapse | Ground / decay |
| `fractured` | `fracture > 0.75` | Bulwark down; pierce/slash mods | Mend |
| `concussed` | `concussion > 0.70` | Accuracy / tempo | Resilience / focus |
| `bleeding` | `laceration > 0.65` | DoT | Cryo clot / heal |
| `corroded` | `corrosion > 0.75` | Bulwark ∧ ward down | Flush |
| `irradiated` | `radiation > 0.60` | Ward down; heal penalty | Time / rad-flush |
| `deafened` | `sonic_stress > 0.70` | Sonic / acuity quirks | Void medium strip / time |
| `ionized` | `ionization > 0.50` | GA/PL damage amp; field charge leak | Ground / AQ flush |

**Escalation tiers:** e.g. bleeding → hemorrhage at higher `laceration` — UI pulse on tier.

---

## 9. Expanded Layer 3 accumulator registry

### 9.1 Fourteen accumulators (target list)

**Existing / planned core:** `fracture`, `heat_load`, `wetness`, `concussion`, `laceration`, `charge_buildup`

**Additional:** `cryo_load`, `corrosion`, `radiation`, `sonic_stress`, `ionization`, `magnetic_flux`, `compression`, `bio_resonance`

Each ships ODE parameters in `accumulators.json` (§15). Cross-coupling matrix (heat ↔ wetness ↔ corrosion ↔ charge ↔ ionization ↔ sonic_stress ↔ fracture) informs rule authoring order — see supplement §9.2 in source brief.

### 9.2 UI tiers

Align with [`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md) §8: novice subset → competitor full icons → analyst \(du/dt\) arrows + coupling highlights.

---

## 10. Battle phase structure

Ordered phases: **PRE-TURN** (passives, field tick, bench decay) → **ACTION DECLARATION** (sealed) → **PRIORITY RESOLUTION** (tiers −3..+3, tempo tie-break, seeded RNG) → **EXECUTION** (hit → dispatch → pipeline → impulses → Layer 2 → reactive → status checks) → **END-OF-TURN** (DoT, Euler substeps, threshold queue, catalyst decay, status ticks, faint, switch-in, replay snapshot).

**Replay:** `ReplayFrame { turn_id, actions, rng_seed_delta, pre_state_hash }` — deterministic given declarations + stats.

---

## 11. Team and party composition

- Party **6**; active **1** (Singles MVP) or **2** (Doubles backlog).  
- Switch = action; faint switch free.  
- Bench: accumulators decay **3×** faster; HP regen only via abilities / fields (anti-stall).  
- Synergy passives: thematic field bias; “conductor chain” GA–AQ–PL education archetype.

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

### 12.1–12.10 Reference presets

**Neutral Arena** — `ambient_temp: 0`, `humidity: 0.50`, `luminance: 0.60`, `acoustic_reflection: 0.30`; no passive deltas; ranked baseline.

**Volcanic Rift** — `ambient_temp: +35`, `humidity: 0.10`; passive `heat_load_change +0.04`, `wetness_delta -0.03`; mods TH ×1.15, CY ×0.85, PL ×1.20; flags `volcanic_rock`, `thermal_upwelling`.

**Tundra Shelf** — `ambient_temp: -25`, passive cooling `heat_load_change -0.035`, `cryo_load_change +0.02`; CY favored.

**Deep Ocean Trench** — `humidity: 1.0`, `luminance: 0.05`, `acoustic_reflection: 0.90`, `initial_wetness_bonus +0.40`, passive `wetness_delta +0.05`; AQ/GA/SO up; VO/LU down; flags `deep_water`, `high_pressure`, `conductive_medium`.

**Thunderhead Storm Cell** — rain + charge; passive `charge_buildup_delta +0.05`, `wetness_delta +0.03`; GA/AE up; flags `ionized_atmosphere`, `conductive_rain`.

**Crystalline Cavern** — passive `sonic_stress_delta +0.03`; SO/MI up; fracture rate ×1.20; lattice resonance hazard.

**Ancient Rainforest** — high humidity, passive `bio_resonance_delta +0.05`, `wetness_delta +0.04`; FL dominant.

**Near-Vacuum Expanse** — `humidity: 0`, `acoustic_reflection: 0`; passive cooling; SO ×0 **field**, AE harmed; passive HP drain on AE/SO-primary bodies; VO ×1.35; flags `no_atmosphere`, `vacuum`.

**Magma Chamber** — `ambient_temp +80`, `humidity: 0.05`, `luminance: 0.95`, `acoustic_reflection: 0.60`; passive `heat_load_change +0.07`, `ionization_delta +0.04`; affinity mods PL ×1.30, TH ×1.20, LU ×1.10; flags `extreme_heat`, `ionized_gas`.

**Prismatic Salt Flat** — `ambient_temp +18`, `humidity: 0.15`, `luminance: 0.90`, `acoustic_reflection: 0.30`; passive `radiation_delta +0.03`, `charge_buildup_delta +0.02`; LU ×1.25, CR ×1.15, GA ×1.10; flags `salt_surface`, `high_UV`, `ionic_ground`.

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

Deepened hooks for TH–VO; dedicated rows for **SO**, **CR**, **PL** (resonance, Arrhenius, Stefan–Boltzmann, Debye, impedance reflection).

**Tutorial policy:** Action → meter → one-sentence tooltip → glossary paragraph → Analyst formula (`SIMULATION-AND-PEDAGOGY` alignment).

---

## 15. Updated data artifacts checklist

**Extends [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §9:**

| Artifact | Role |
|----------|------|
| `affinities.json` | 12 entries + IDs |
| `affinity_chart.json` | **§2 matrix — source of truth** |
| `status_conditions.json` | §8 registry |
| `accumulators.json` | §9 ODE + coupling |
| `stances.json` | §6 |
| `abilities/*.yaml` | §7 |
| `combos.json` | §13 |
| `biomes.json` | §12 + evolution |
| `moves/*.yaml` | Split by category optional |
| `species/*.yaml` | 12-component `material_profile`, abilities |

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
