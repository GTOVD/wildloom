# Wildloom — Master Design Document v2
**Version:** 2026-05-03 · Physics-Unified Continuous Model  
**Status:** Authoritative planning spec. Supersedes all prior partial docs.  
**Rule:** This document wins all conflicts.

---

## Table of Contents

1. [Core Philosophy](#1-core-philosophy)
2. [Terminology Glossary](#2-terminology-glossary)
3. [Creature Instances — Procedural Generation](#3-creature-instances--procedural-generation)
4. [Core Stats (Nine)](#4-core-stats-nine)
5. [Material Profile (Twelve Axes)](#5-material-profile-twelve-axes)
6. [Affinities (Twelve IDs)](#6-affinities-twelve-ids)
7. [Affinity Vector Space and CHART₀](#7-affinity-vector-space-and-chart)
8. [The Dynamic Move System — Ability Composer](#8-the-dynamic-move-system--ability-composer)
9. [Move Instance Fields — Complete Schema](#9-move-instance-fields--complete-schema)
10. [The Damage Pipeline — Continuous Physics Model](#10-the-damage-pipeline--continuous-physics-model)
11. [Stress-Response Physics — Modality Math](#11-stress-response-physics--modality-math)
12. [Layer 1 — Continuous Affinity Field m1](#12-layer-1--continuous-affinity-field-m1)
13. [Layer 2 — Smooth Predicate Rules](#13-layer-2--smooth-predicate-rules)
14. [Layer 3 — Accumulator Registry and ODEs](#14-layer-3--accumulator-registry-and-odes)
15. [Status Conditions](#15-status-conditions)
16. [Damage Over Time and Coupled Flows](#16-damage-over-time-and-coupled-flows)
17. [Stances](#17-stances)
18. [Passive Abilities](#18-passive-abilities)
19. [Battle Phase Structure](#19-battle-phase-structure)
20. [Team and Party Rules](#20-team-and-party-rules)
21. [Biomes and Field Scalars](#21-biomes-and-field-scalars)
22. [Named Combo System](#22-named-combo-system)
23. [Stat Growth and Resonance](#23-stat-growth-and-resonance)
24. [Physics Education Map](#24-physics-education-map)
25. [UI Tiers — Novice to Analyst](#25-ui-tiers--novice-to-analyst)
26. [Data Artifact Checklist](#26-data-artifact-checklist)
27. [Open Decisions](#27-open-decisions)
28. [Appendix A — 100 Species Roster](#28-appendix-a--100-species-roster)
29. [Appendix B — Move Frame Catalog](#29-appendix-b--move-frame-catalog)
30. [Appendix C — Full Damage Walkthrough](#30-appendix-c--full-damage-walkthrough)
31. [Technical Architecture and Engine Design](#31-technical-architecture-and-engine-design)

---

## 1. Core Philosophy

Wildloom is a real-time multiplayer creature-battle game built on four interlocking commitments:

**1. Procedural identity.** No two creature instances are the same. Stats, material profiles, affinity emphasis, and appearance are rolled at spawn from biome-shaped distributions. Species rows are flavor, not formulas.

**2. Dynamic moves.** Players build moves from frames — templates that define an envelope of feasible configurations. Affinities, modality weights, payload split, and effect riders are all tunable. The display name assembles deterministically from choices made. Skill comes from understanding the physics of your opponent's material composition, not memorizing a chart.

**3. Continuous physics.** Combat is a **coupled dynamical system** sampled at discrete subticks. Damage is not `base × multiplier`. It is the result of **stress applied to a material over time**, shaped by accumulator state, modality geometry, affinity field alignment, and thermodynamic history. Every formula is a smooth, bounded, differentiable function — no binary gates, no hidden discrete jumps.

**4. Stealth physics literacy.** The math is real physics in toy form. Players who pay attention develop correct intuitions about thermodynamics, wave mechanics, fracture, and reaction kinetics without ever seeing an equation unless they opt into the Analyst tier.

---

## 2. Terminology Glossary

| Term | Definition |
|---|---|
| **Affinity** | One of twelve elemental identities encoded as a vector in latent space. Creatures: `affinity_emphasis` weight vector. Moves: `affinity_weights` simplex. |
| **Affinity vector** | A unit vector **a** in the 6-dimensional affinity latent space. The dot product of two affinity vectors determines baseline interaction strength. |
| **CHART₀** | 12×12 matrix of calibration targets. Used to train the affinity vectors so that dot products reproduce known physics matchups. Not a lookup table in the live resolver. |
| **Composer** | The UI + ruleset by which players build move instances from frames. |
| **Coupling stat** | `coupling` — governs how strongly a creature's outgoing accumulator impulses scale. |
| **Current endurance S(t)** | The continuous battle-state scalar that hits deplete. Reaches zero → incapacitated. |
| **D_eff(u)** | State-coupled effective defense. Erodes smoothly as accumulators rise: D_eff = D · Π_j(1 − γ_j · tanh(u_j)). |
| **Energetic payload W_e** | The fraction of a move's power routed through energy-coherence-scaled channels (thermal, galvanic, radiant, etc.). Saturates against `special_mitigation`. |
| **Frame** | A move template. Defines the feasible envelope (min/max per knob), allowed hook families, cooldown shape, display seed. |
| **Incapacitated** | S ≤ 0. Combat loss condition. |
| **Kinetic payload W_k** | The fraction of a move's power routed through force-generation-scaled channels (concussive, piercing, slashing geometry). Saturates against `physical_mitigation`. |
| **Layer 1 / m1** | Affinity interaction multiplier. Continuous smooth function of affinity vectors, emphasis weights, materials, stats, field. Not a table lookup. |
| **Layer 2** | Predicate → smooth modifier rules. All multipliers are bounded continuous functions, never flat constants. |
| **Layer 3** | Continuous accumulators (fracture, heat_load, wetness, …) evolving each subtick as coupled ODEs. |
| **Material profile** | Twelve normalized scalars per instance describing physical and chemical composition. |
| **ω simplex** | Three non-negative weights summing to 1: {ω_con, ω_pier, ω_slas}. Routes kinetic payload across three stress geometry branches. |
| **pierce (scalar)** | Trim on effective defense per channel. Armor bypass. Distinct from piercing ω (geometry routing). |
| **Recovery stat** | `recovery` — modulates the time constant τ of every accumulator's decay toward baseline. |
| **Resonance** | Visible training budget. Spent at tuning stations into stats. Replaces hidden EV mechanics. |
| **σ(A, D)** | Core saturation scalar in (0,1). Smooth nonlinear coupling efficiency: σ = 1 − exp(−κ / (1 + D_eff/A)). |
| **Stamina (stat)** | `stamina` — endurance capacity ceiling S_max. |
| **Stress response φ_k(M)** | Material-shaped coefficient for modality k. Determines how the material's physical properties amplify or resist a given stress geometry. |

---

## 3. Creature Instances — Procedural Generation

### 3.1 Species rows contain flavor, not formulas

Species catalog rows: species ID, display name, stage count (3), habitat biome hints, morphology flavor text, appearance gene axis mapping, non-authoritative `affinity_emphasis_hint`, ability pool list. **No combat stats. No material values.**

All combat math flows from the rolled instance. The pipeline below is authoritative.

### 3.2 Spawn pipeline

```
Input:  biome_id, encounter_tier, level_L, seed
Output: CreatureInstance

Step 1 — Affinity emphasis
  Draw affinity_emphasis[12] from Dirichlet(α_biome)
  biome_id sets concentration parameters for ALL 12 IDs simultaneously:
    - Dominant biome affinities (e.g., TH, PL for Volcanic Rift): α >> 1 (high weight pull)
    - Present-but-minor affinities: α ≈ 0.5–1.0
    - Biome-excluded affinities (e.g., AQ in Near-Vacuum): α → 0.1
  p_neutral=0.05 chance of near-uniform Dirichlet(1.0,...,1.0) draw regardless of biome
  Normalize: Σ affinity_emphasis[i] = 1.0

  NO species-level affinity override exists. The same species ID can appear with
  any emphasis vector depending on where it spawns. Dex entries may show a "common
  emphasis hint" for flavor text only — this hint is never read by the resolver.

  Secondary affinity emerges naturally: if affinity_emphasis[i] > 0.20 for two or
  more IDs, the creature functionally has a secondary affinity. No explicit
  "secondary_affinity" flag is set — the full vector is always used.

Step 2 — Core stat aptitude roll
  For each of 9 stats:
    A_raw ~ Normal(μ_tier, σ_tier)  [encounter_tier tables, not species]
    A_final = clamp(A_raw * (1 + Uniform(-0.05, +0.05)), stat_min, stat_max)
  Scale by B(L) from §23 growth curve

Step 3 — Material profile roll
  For each of 12 axes:
    m_k ~ Beta(α_biome_k, β_biome_k)
  biome_id sets all 24 Beta parameters (tuned by biome designer)
  No species override

Step 4 — Appearance gene
  appearance_gene ~ Uniform[0,1]^N_axes  (species determines N and axis meanings)
  Lustrous: p_lustrous ≈ 1/512; separate gene overrides on lustrous
  Checksum appearance_gene + species_id; reject out-of-range crafted payloads

Step 5 — Move loadout (wild procedural)
  Fill only move slots unlocked for this stage (§31.6: Stage 1→4, 2→6, 3→8)
  Each filled slot: sample frame from biome/tier weighted table
  Tune all composer knobs via seeded uniform draws within frame envelope
  Assemble system_display_title deterministically
  Players recompose at tuning stations post-capture

Step 6 — Passive ability draw
  Stage 1: 1 passive drawn from species ability pool
  Stage 2: +1 passive or reactive (player chooses at advancement)
  Stage 3: +1 advanced passive

Step 7 — Persist
  Store full instance payload; validate all bounds; emit InstanceCreated + checksum
```

### 3.3 Advancement (stage transitions)

Stage 1 → 2 → 3 via level + optional bond threshold.
- Material profile re-rolled with **narrowed** Beta (morphology matures)
- Affinity emphasis unchanged (identity is stable)
- New ability slot unlocked
- S_max recalculated from new level budget
- Appearance gene carries forward; species shader uses stage index for body template

---

## 4. Core Stats (Nine)

| Schema ID | Player Name | Role | Notes |
|---|---|---|---|
| `stamina` | Endurance Capacity | S_max ceiling | Current S is battle state, not stored. |
| `physical_offense` | Physical Offense | Kinetic payload A_k | Scales concussive/piercing/slashing channels. |
| `physical_mitigation` | Physical Mitigation | Kinetic defense D_k | Reshaped by fracture, stance, ψ kernels. |
| `special_offense` | Special Offense | Energetic payload A_e | Scales thermal/galvanic/radiant channels. |
| `special_mitigation` | Special Mitigation | Energetic defense D_e | Separate from kinetic; different physics metaphor. |
| `initiative` | Initiative | Turn order, evasion | Hit probability sigmoid input. |
| `precision` | Precision | Accuracy, focused-move bonus | Feeds p_hit; scales focused buff effects. |
| `recovery` | Recovery | Accumulator τ modifier | Higher → faster return to baseline after each hit. |
| `coupling` | Coupling | Outgoing impulse scale | Δu_effective = Δu_authored × (1 + β_c · coupling/100). |

**Critical separation:** `physical_mitigation` / `special_mitigation` govern endurance loss through the saturation pipeline. **Status resistance** is a separate `status_guard` vector per instance. A creature can tank beams (high `special_mitigation`) but still ignite easily (low TH `status_guard`). These are independent surfaces.

**Effective stat (cached per tick):**
```
effective_stat = base_stat × Π(active_modifiers)
physical_mitigation_eff = physical_mitigation × Π(mods) × (1 − γ_frac · tanh(fracture))
```

---

## 5. Material Profile (Twelve Axes)

All components ∈ [0, 1] (Beta-distributed per biome at spawn). Not set by species.

| Component | Physical Meaning | Primary Combat Effect |
|---|---|---|
| `thermal_mass` | Heat stored per degree of temperature change | τ in heat_load ODE; dampens heat spikes both ways |
| `conductivity` | Thermal + electrical transmission rate | Galvanic chain multiplier; heat equilibration speed |
| `rigidity` | Brittleness vs compliance (0=rubber, 1=ceramic) | Fracture ψ; concussive transmission; Cryo vulnerability |
| `porosity` | Accessible void fraction; fluid uptake | wetness retention; corrosion ingress; laceration depth |
| `polarity` | Permanent or induced electrical dipole strength | charge_buildup leakage rate; Galvanic resonance hooks |
| `density` | Mass per unit volume; inertia | Void scaling; Z = ρv sonic impedance; concussive resistance |
| `elasticity` | Deformation energy storage and return fraction | Concussive rebound on contact moves; laceration recovery rate |
| `reflectivity` | Electromagnetic surface reflectance | Reduces Luminous damage; high values enable beam reflect rules |
| `acoustic_impedance` | Z ≈ ρ × c_sound; mismatch → reflection | Sonic efficiency: high Z mismatch reflects energy away from target |
| `chemical_reactivity` | Kinetics multiplier for reactive attack | corrosion impulse ∝ reactivity^1.5 × porosity |
| `magnetization` | Ferro/paramagnetic susceptibility | magnetic_flux accumulator sensitivity; GA/PL rule hooks |
| `permeability` | Gas/fluid penetration rate through body volume | Corrosive DoT ingress depth; Aero dehydration; deep flooding |

**Composite shortcuts** (computed once per tick, cached):

```
acoustic_transparency   = 1.0 − acoustic_impedance
fracture_susceptibility = rigidity × (1.0 − elasticity)
corrosion_rate          = chemical_reactivity × porosity
ionic_coupling          = conductivity × polarity
thermal_stability       = thermal_mass × (1.0 − conductivity)
void_compression_factor = density × (1.0 − elasticity)
yield_strength          = 0.6 × rigidity + 0.4 × density      ← piercing yield threshold
cohesion                = (1.0 − porosity) × (1.0 − fracture)  ← slashing resistance
```

---

## 6. Affinities (Twelve IDs)

MVP ships nine; SO, CR, PL content-locked until Phase 2. All twelve participate in the engine from day one; content lock means no wild instances use them initially.

| ID | Name | Theme | Core Accumulator Built |
|---|---|---|---|
| `TH` | **Thermal** | Heat, combustion, convection | `heat_load` |
| `CY` | **Cryo** | Cold, entropy, phase transition | `cryo_load`, `heat_load` (negative) |
| `AQ` | **Aqueous** | Liquids, solutions, pressure | `wetness` |
| `GA` | **Galvanic** | Charge, circuits, induction | `charge_buildup`, `magnetic_flux` |
| `MI` | **Mineral** | Stone, crystal, grounding | fracture resistance; acoustic ground |
| `FL` | **Flora** | Biomass, vines, spores, mycelium | `bio_resonance` |
| `AE` | **Aero** | Gas, pressure waves, turbulence | clears `wetness`, `sonic_stress` |
| `LU` | **Luminous** | Light, lasers, UV, radiation | `radiation` |
| `VO` | **Void** | Gravity, vacuum, isolation | `compression` |
| `SO` | **Sonic** | Sound waves, resonance, impedance | `sonic_stress` |
| `CR` | **Corrosive** | Acid/base kinetics, oxidation | `corrosion` |
| `PL` | **Plasmic** | Ionized plasma, 4th-state matter | `ionization` |

---

## 7. Affinity Vector Space and CHART₀

### 7.1 The problem with flat tables

A discrete 12×12 chart requires hard-coding 144 values, produces abrupt effectiveness cliffs, cannot smoothly represent mixed-affinity creatures, and has no natural extension to new affinities. It also contradicts the goal of continuous physics modeling.

### 7.2 Affinity as vectors in latent space

Each affinity ID maps to a unit vector **a** ∈ ℝ⁶. The latent space axes have approximate physical interpretations (thermal axis, electromagnetic axis, mechanical axis, chemical axis, wave axis, gravitational axis), but are calibrated numerically rather than hand-tuned.

The raw interaction score between a move affinity vector **a_move** and a defender affinity vector **a_def**:

$$s = \mathbf{a}_{\text{move}} \cdot \mathbf{a}_{\text{def}}$$

The smooth interaction multiplier baseline:

$$B_{\text{vec}} = 1 + \tanh(s)$$

**Properties:**
- s = +1 (aligned) → B ≈ 1.76 (strong advantage)
- s = 0 (orthogonal) → B = 1.0 (neutral)
- s = −1 (opposing) → B ≈ 0.24 (strong resist)
- s < −2.5 (near-zero alignment) → B ≈ 0 (functional immunity)
- **Smooth gradients everywhere.** No hard counter walls.

### 7.3 Calibrating vectors to CHART₀

CHART₀ remains the design tool — a 12×12 matrix of physicist-motivated *targets* for each matchup. The affinity vectors are solved so that `1 + tanh(a_i · a_j) ≈ CHART₀[i][j]` for all pairs.

This is a **nonlinear least-squares calibration** run offline. The resulting vectors live in `affinity_vectors.json` and are the authoritative source for the live resolver. CHART₀ is then the human-readable summary, not the runtime object.

**CHART₀ target values (physics rationale in §7.4):**

| ATK↓ DEF→ | TH | CY | AQ | GA | MI | FL | AE | LU | VO | SO | CR | PL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **TH** | 0.5 | 2.0 | 0.75 | 0.75 | 0.75 | 2.0 | 1.5 | 0.75 | 0.5 | 1.0 | 1.5 | 0.5 |
| **CY** | 0.5 | 0.5 | 1.5 | 1.0 | 1.5 | 1.5 | 1.0 | 1.0 | 0.75 | 0.75 | 1.5 | 0.5 |
| **AQ** | 0.75 | 0.75 | 0.5 | 1.5 | 1.5 | 0.75 | 1.0 | 1.0 | 0.5 | 1.5 | 0.75 | 1.5 |
| **GA** | 1.0 | 1.0 | 1.5 | 0.5 | 0.5 | 1.5 | 2.0 | 1.0 | 0.75 | 1.5 | 1.0 | 0.5 |
| **MI** | 1.0 | 1.0 | 0.75 | 2.0 | 0.75 | 1.5 | 1.0 | 0.75 | 0.75 | 2.0 | 0.5 | 0.75 |
| **FL** | 0.5 | 0.5 | 1.5 | 0.5 | 0.5 | 0.75 | 0.75 | 1.0 | 1.5 | 1.0 | 0.5 | 0.5 |
| **AE** | 0.75 | 1.5 | 1.5 | 0.75 | 0.5 | 1.5 | 0.5 | 0.75 | 0.5 | 0.75 | 1.5 | 0.75 |
| **LU** | 1.0 | 1.5 | 1.0 | 1.5 | 0.75 | 1.0 | 1.5 | 0.5 | 0.5 | 1.5 | 1.5 | 0.75 |
| **VO** | 1.5 | 0.75 | 1.5 | 1.5 | 1.5 | 2.0 | 2.0 | 0.75 | 0.5 | 2.0 | 1.0 | 1.5 |
| **SO** | 1.0 | 1.5 | 1.5 | 0.75 | 2.0 | 1.0 | 0.5 | 0.75 | 0.0 | 0.5 | 1.0 | 1.5 |
| **CR** | 0.75 | 1.0 | 1.5 | 1.5 | 2.0 | 1.5 | 0.75 | 0.75 | 0.5 | 1.0 | 0.5 | 1.0 |
| **PL** | 0.75 | 2.0 | 2.0 | 0.75 | 1.5 | 2.0 | 1.5 | 1.0 | 0.75 | 1.5 | 1.5 | 0.5 |

### 7.4 Notable matchup physics rationale

| Matchup | Value | Reasoning |
|---|---|---|
| GA → AE: 2.0 | Lightning discharges through ionized air (dielectric breakdown in gas) |
| MI → GA: 2.0 | Electrical grounding; Faraday cage; charge flows to lowest potential |
| SO → MI: 2.0 | Resonant frequency matching shatters crystal lattice; Tacoma Narrows |
| SO → VO: 0.0 | Sound requires a medium; vacuum blocks wave propagation entirely |
| VO → AE: 2.0 | Vacuum removes the gas medium Aero creatures depend on |
| CR → MI: 2.0 | Acid dissolves minerals: H⁺ + CaCO₃ → CO₂ + H₂O |
| PL → FL: 2.0 | Plasma instantly incinerates organic matter |
| TH → CR: 1.5 | Arrhenius: k = Ae^{−Ea/RT}; heat accelerates reaction rates exponentially |
| CY → MI: 1.5 | Freeze-thaw expansion shatters rock — real geological weathering |
| GA → AQ: 1.5 | Ionic solution conducts electricity; current paths through body |
| LU → GA: 1.5 | Photoelectric effect: photons free electrons, amplifying downstream charge |

---

## 8. The Dynamic Move System — Ability Composer

### 8.1 Core concept: kinetic/energetic payload split

Wildloom eliminates the strict "strike vs surge" binary. Instead, every move defines a **payload split**:

$$W = W_k + W_e, \quad W_k + W_e = 1$$

- **W_k (kinetic payload):** Scaled by `physical_offense`. Routes through concussive/piercing/slashing geometry. Saturates against `physical_mitigation`.
- **W_e (energetic payload):** Scaled by `special_offense`. Routes through affinity-specific energy delivery. Saturates against `special_mitigation`.

A "flaming sword strike" is W_k=0.5 (slashing-dominant ω) + W_e=0.5 (TH affinity). A "pure fireball" is W_k=0.0 + W_e=1.0. A "rock punch" is W_k=1.0 (concussive-dominant) + W_e=0.0.

The old `category: strike` and `category: surge` become **default payload presets** on certain frames, not engine-level categories. Players can deviate from defaults within frame bounds.

### 8.2 The eight frame categories

| Category | Default W_k | Default W_e | Description |
|---|---|---|---|
| `strike` | 0.85–1.0 | 0.0–0.15 | Contact/physical emphasis; defaults to high kinetic |
| `surge` | 0.0–0.15 | 0.85–1.0 | Energy/field emphasis; defaults to high energetic |
| `true` | 0 | 0 | Bypasses both saturation paths; direct S depletion |
| `field` | 0 | 0 | Rewrites arena field scalars; no endurance damage |
| `reactive` | varies | varies | Triggered action; payload inherits from chosen sub-frame |
| `channel` | varies | varies | Sustained partial hits over subticks; ramp builds |
| `resonance` | varies | varies | Scales with Resonance allocation; smooth diminishing returns |
| `catalyst` | 0 | 0 | Primes combo charge on target; minimal direct damage |

### 8.3 Composer panels

**Panel 1 — Category:** One of eight. Determines payload defaults and which panels are active.

**Panel 2 — Frame:** Pick from the frame roster (Appendix B). The frame defines envelope min/max per knob, display seed word, allowed hook families, cooldown formula.

**Panel 3 — Affinity:**
- Primary: one of 12 IDs (or null = non-elemental)
- Secondary (optional): differs from primary
- Blend η ∈ [0, frame_max_η]: weight of secondary in m1 computation
- Advanced: full `affinity_weights[12]` simplex for multi-fusion builds

**Panel 4 — Payload split:**
- W_k / W_e slider (within frame bounds)
- If W_k > 0: ω simplex = {ω_con, ω_pier, ω_slas} summing to 1 (how kinetic payload routes across stress geometries)
- `pierce` scalar ∈ [0, frame_max_pierce]: armor bypass after ω routing (independent of ω_pier)

**Panel 5 — Potency:**
- `base_power` ∈ frame band
- `accuracy` ∈ frame band
- `cooldown_turns` derived from `cooldown_scaling(base_power)` — not independently set

**Panel 6 — Outcome budget (sums to 1.0):**
- α `endurance_share`: fraction → direct S depletion
- β `status_guard_shred_share`: fraction → smooth delta on defender status_guard vector
- γ `status_delivery_share`: fraction → amplifies status payload proc reliability and potency
- φ `utility_field_share`: fraction → drives arena field transition (field moves)
- ψ `utility_pressure_share`: fraction → transient stat penalties during field transition

**Panel 7 — Effects and riders:**
- `status_payloads[]`: {status_id, proc_chance, potency, duration}
- `accumulator_impulses{}`: {key → delta} from §14 registry
- `passive_hooks[]`: aura ticks, stance couplings, affinity bias

### 8.4 Dynamic display name assembly

Deterministic from move instance. Player can add optional nickname as headline.

**Important:** Frame IDs and display seeds carry **zero affinity information**. "Blast" is not a fire attack. "Lance" is not a light attack. Affinity is applied entirely by the player in Panel 3 of the Composer. A player building a "Corrosive Lance" applies the CR affinity in Panel 3; the frame itself is neutral. This means every frame in Appendix B is available to every creature regardless of its `affinity_emphasis`. The dynamic name assembly rules in steps 1–9 below add affinity words to the title only after the player makes affinity choices — the frame word alone is always affinity-neutral.

Rules:
1. Start with frame display seed (e.g., "Blast")
2. If primary affinity set AND attacker affinity_emphasis[primary] > 0.3: prepend affinity name
3. If secondary set AND η > 0.3: append "— {secondary_name}"
4. If a modality ω > 0.65 AND non-default for this frame: prepend modality adjective

| Dominant modality | Adjective options |
|---|---|
| Concussive > 0.65 | Crushing / Driving / Hammering |
| Piercing > 0.65 | Piercing / Lancing / Penetrating |
| Slashing > 0.65 | Rending / Shearing / Cutting |

5. If status payload has proc_chance > 0.70 and thematic: append status hint
6. If category `channel`: prepend "Sustained"
7. If category `catalyst`: append "— Primed"
8. Balanced ω (none dominant) → no modality adjective
9. Silent defaults → frame word only

**Examples:**

| Choices | Name |
|---|---|
| Blast, TH primary | "Thermal Blast" |
| Blast, TH primary, AQ secondary η=0.4 | "Thermal Blast — Aqueous" |
| Slam, no affinity, ω_con=0.90 (non-default) | "Crushing Slam" |
| Thrust, LU primary, pierce=0.70 | "Luminous Lance" |
| Focus Bridge, TH primary | "Sustained Thermal Focus Bridge" |
| Etch, CR primary | "Corrosive Etch — Primed" |
| Blast, no affinity, balanced ω | "Blast" |

---

## 9. Move Instance Fields — Complete Schema

```typescript
interface MoveInstance {
  // Identity
  move_id: string;
  frame_id: string;
  system_display_title: string;   // deterministic; never invented from silent defaults
  move_nickname?: string;

  // Category
  category: 'strike'|'surge'|'true'|'field'|'reactive'|'channel'|'resonance'|'catalyst';

  // Payload split
  kinetic_share: number;          // W_k ∈ [0,1]; W_e = 1 - W_k
  // If kinetic_share > 0:
  strike_modalities: {concussive: number, piercing: number, slashing: number}; // ω; sums to 1
  // If kinetic_share < 1:
  delivery_modalities: {concussive: number, piercing: number, slashing: number}; // ω for energetic
  // (delivery_modalities governs energetic-side geometry; same math, different defense stat)

  // Affinity
  primary_affinity?: AffinityID;
  secondary_affinity?: AffinityID;
  blend_eta: number;
  affinity_weights?: Record<AffinityID, number>; // advanced multi-fusion; sums to 1

  // Potency
  base_power: number;
  accuracy: number;
  cooldown_turns: number;         // derived
  pierce: number;                 // armor bypass scalar [0, frame_max_pierce]

  // Outcome budget (sums to 1.0)
  endurance_share: number;        // α
  status_guard_shred_share: number; // β
  status_delivery_share: number;  // γ
  utility_field_share: number;    // φ
  utility_pressure_share: number; // ψ

  // Effects
  status_payloads: StatusPayload[];
  accumulator_impulses: Record<AccumulatorKey, number>;
  passive_hooks: PassiveHook[];
  infusion_coeffs: Record<string, number>;

  // Category-specific
  channel_duration?: number;      // subtick count; channel only
  ramp_eta?: number;              // exposure ramp factor; channel only
  reactive_trigger?: ReactiveTrigger;
  reactive_condition?: string;
  catalyst_id?: string;
  catalyst_duration_turns?: number;
  combo_detonate?: string;
  combo_bonus_mult?: number;

  // Metadata
  priority_tier: number;          // [-3, +3]
  contact: boolean;
  tags: string[];
  patch_hash: string;
}
```

**pierce vs ω_pier:** These are completely independent.
- **ω_pier** answers: "what fraction of this hit uses needle/stab geometry?" — determines which material ψ kernel applies, which σ branch runs, how much feeds fracture.
- **pierce** answers: "how much of the defender's mitigation stat do we discard before running those formulas?" — armor bypass, shield break.

A shockwave (ω_con=0.90) can still carry pierce=0.80 (breaks shields but hits like a hammer). A needle (ω_pier=0.90) can have pierce=0 (pure geometry, no bypass bonus).

---

## 10. The Damage Pipeline — Continuous Physics Model

### 10.0 Mathematical contract

Combat is not `base × multiplier`. Every hit is a **sample from a continuous stress-response model**:

$$\Delta S \approx \int_0^{\Delta t} \sigma(\tau) \cdot \chi\bigl(\mathbf{M}_d, \mathbf{u}(t+\tau)\bigr) \, d\tau$$

Discretized per-subtick for determinism. Each hit computes one sample from this law.

The pipeline below implements this integral in five ordered stages. **Execute in strict order.** Every stage consumes labeled modifiers so audit logs and replays can name every contributing factor.

### 10.1 Stage 0 — Hit resolution

$$p_{\text{hit}} = \text{sigmoid}\!\left(\alpha_{\text{acc}} + \beta_{\text{acc}} \cdot \text{precision}_{\text{eff}} - \gamma_{\text{acc}} \cdot \text{initiative}_{d,\text{eff}}\right)$$

Baseline stub: `p_hit = accuracy / 100 × precision_factor(attacker)`.

Physics-shaped upgrade (production): logistic sigmoid with balance JSON coefficients. Marginal gains in precision change hit odds smoothly — no cliffs.

If miss: emit `Miss`; ΔS=0; no Layer 2 triggers; no impulses.

### 10.2 Stage 1 — Stress application and payload routing

Split base_power into kinetic and energetic budgets:

```
P_k = base_power * W_k
P_e = base_power * W_e
```

Scale each by the relevant offensive stat:
```
A_k = physical_offense_eff × P_k_scale   ← kinetic amplitude
A_e = special_offense_eff  × P_e_scale   ← energetic amplitude
```

These are the A values that enter saturation below.

### 10.3 Stage 2 — State-coupled effective defense

The key upgrade from v1: defense is **not static**. It erodes as accumulators build.

$$D_{\text{eff}}(\mathbf{u}) = D_{\text{base}} \cdot \prod_j \bigl(1 - \gamma_j \cdot \tanh(u_j)\bigr)$$

Where the product runs over accumulators that couple to this defense stat (authored in `scaling_curves.json`). Example couplings:

```
For physical_mitigation:
  D_k_eff = physical_mitigation_eff × (1 − γ_frac·tanh(fracture))
                                     × (1 − γ_comp·tanh(compression))

For special_mitigation:
  D_e_eff = special_mitigation_eff × (1 − γ_rad·tanh(radiation))
                                    × (1 − γ_corr·tanh(corrosion))
```

Then apply pierce trim per modality channel (for kinetic path):
```
D_k_channel = D_k_eff × ψ_k(M_d) × (1 − pierce × λ_k × λ_p)
```
where ψ_k is the material stress-response kernel for channel k.

### 10.4 Stage 3 — Core saturation σ

For each active channel (kinetic branches and energetic path):

$$\sigma = 1 - \exp\!\left(-\frac{\kappa}{1 + D_{\text{eff}}/A}\right)$$

**Properties:**
- σ → 1 as A → ∞ (offense overwhelms defense)
- σ → 0 as D_eff → ∞ (defense overwhelms offense)
- dσ/dA > 0 (monotone in offense) with diminishing returns
- dσ/dD < 0 (monotone in defense) with diminishing returns
- When D_eff is eroded by accumulators: σ rises → more damage even without stat changes

Then:
```
D_core_channel = F_scale × A × σ × S_L
```

**Level scaling:**
```
S_L = (c0 + c1 × L_attacker) / (c2 + c3 × L_defender)
```

See §10.6 for the modality blend that assembles these per-channel cores into D_core.

### 10.5 Stage 4 — Outcome budget application

```
stamina_budget          = α × D_core  →  enters Stage 6 → ΔS
status_guard_delta      = β × D_core  →  smooth delta on defender.status_guard[]
status_amplification    = γ × D_core  →  scale status_payload proc/potency this hit
field_push_budget       = φ × D_core  →  integrate field_state toward authored target
pressure_budget         = ψ × D_core  →  transient debuffs on defender stats_eff
```

### 10.6 Stage 5 — Layer 1 m1 (see §12 for full formula)

$$m_1 = \text{clamp}(m_{\min}, m_{\max},\ m_1^{\text{raw}})$$

### 10.7 Stage 6 — Layer 2 smooth predicate rules (see §13)

```
D_after = stamina_budget × m1 × m2 + flat2
```

All m2 contributions are bounded smooth functions; see §13.

### 10.8 Stage 7 — Layer 3 accumulator impulses (see §14)

```
For (key, delta) in move.accumulator_impulses:
  Δu_eff = delta × (1 + β_c × coupling_eff / 100)
  u[key] = clamp(u[key] + Δu_eff, u_min, u_max)

Re-evaluate D_eff(u) with updated accumulators for next-turn defense
```

### 10.9 Stage 8 — Crit and variance

$$C = \begin{cases} c_{\text{crit}} & \text{w.p. } p_{\text{crit}} \\ 1 & \text{otherwise} \end{cases}, \quad \Xi = 1 + U, \quad U \sim \text{Uniform}[-\delta, \delta]$$

$$D_{\text{final}} = D_{\text{after}} \cdot C \cdot \Xi$$

Prefer small δ (≈ 0.03) — bounded variance, not heavy spikes.

**Expected value (for build previews):**
$$\mathbb{E}[\Delta S \mid \text{hit}] = D_{\text{after}} \cdot (1 + p_{\text{crit}}(c_{\text{crit}}-1))$$
Compute before floor() when comparing builds.

### 10.10 Stage 9 — Application

```
stamina_loss = max(0, floor(D_final))
S_d -= stamina_loss
emit HitResolved { stamina_loss, breakdown: { all stages logged } }
```

---

## 11. Stress-Response Physics — Modality Math

This section gives the full continuous physics model for each of the three kinetic stress geometries. These are the ψ kernels referenced in Stage 2–3.

### 11.1 Concussive — Bulk Stress / Impulse Transfer

**Physics:** Distributes force over a contact area, generating internal stress waves. Rigid bodies transmit the wave efficiently (worse outcome for the rigid creature). Compliant, porous, or massive bodies absorb and dissipate the wave.

**Applied stress:**
$$\sigma_c = \frac{F}{A_{\text{contact}}} = \frac{A_k \cdot \omega_c}{\text{contact\_area}}$$

**Material response kernel ψ_con(M):**
$$\psi_c(\mathbf{M}) = 1 + \alpha_1 \cdot \text{rigidity} - \alpha_2 \cdot \text{porosity} - \alpha_3 \cdot \text{thermal\_mass}$$

Interpretation: rigidity amplifies (the wave propagates rather than dissipating); porosity and thermal mass absorb (void fraction and mass inertia dampen the wave).

**Effective resistance for concussive channel:**
$$R_c = D_{k,\text{eff}} \cdot \text{clamp}(0.5, 1.5,\ \psi_c(\mathbf{M}))$$

**Layer 3 coupling:** Concussive fraction feeds `concussion` accumulator impulse:
$$\Delta u_{\text{concussion}} \propto \omega_c \cdot \sigma_c \cdot (1 + \text{rigidity})$$

### 11.2 Piercing — Localized Penetration / Yield Stress

**Physics:** Concentrates force into a minimal tip area, applying a pressure that may exceed the material's yield strength. Once yield is exceeded, the material deforms irreversibly and penetration occurs, largely bypassing bulk resistance.

**Applied pressure:**
$$\sigma_p = \frac{F}{A_{\text{tip}}} \gg \sigma_c \quad (\text{same force, much smaller area})$$

**Yield threshold (material-derived, not a stat):**
$$Y_d = \lambda_1 \cdot \text{rigidity} + \lambda_2 \cdot \text{density}$$

**Smooth penetration probability (no threshold cliff):**
$$P_{\text{pen}} = \frac{1}{1 + e^{-k_p(\sigma_p - Y_d)}}$$

This is the key improvement: penetration is a sigmoid, not binary. Players "feel" when they're approaching the yield point.

**Effective resistance after penetration probability:**
$$R_p = D_{k,\text{eff}} \cdot (1 - P_{\text{pen}} \cdot \text{clamp}(0, 1, \text{pierce}))$$

**Material response kernel ψ_pier(M):**
$$\psi_p(\mathbf{M}) = 0.5 + 0.5 \cdot \text{yield\_strength} \cdot (1 - \tanh(2 \cdot \text{fracture}))$$

Interpretation: high yield_strength (rigid+dense) resists piercing, but fracture progressively collapses the resistance — pre-fractured ceramic fails suddenly to penetration.

**Layer 3 coupling:** Piercing fraction spikes `fracture`:
$$\Delta u_{\text{fracture}} \propto \omega_p \cdot P_{\text{pen}} \cdot \text{rigidity}$$

### 11.3 Slashing — Shear Stress / Surface Cohesion

**Physics:** Applies lateral force parallel to the surface. Damage occurs when applied shear stress exceeds surface cohesion. Flexible materials resist shear; brittle, porous, or already-damaged materials fail catastrophically.

**Applied shear:**
$$\tau = \frac{F_\parallel}{A} = \frac{A_k \cdot \omega_s}{\text{shear\_area}}$$

**Material cohesion (composite shortcut):**
$$\text{cohesion} = (1 - \text{porosity}) \cdot (1 - \text{fracture})$$

**Slashing response modifier ψ_slas(M):**
$$\psi_s(\mathbf{M}) = 1 + \gamma_1 \cdot \text{porosity} + \gamma_2 \cdot \text{fracture} - \gamma_3 \cdot \text{elasticity}$$

Interpretation: porosity creates tear-propagation paths; existing fracture provides stress concentrators; elasticity resists shear by distributing the load.

**Wet amplification (Layer 2 hook):**
$$\psi_s \mathrel{*}= 1 + \delta_W \cdot \tanh(\text{wetness} / W_{\text{ref}})$$

**Layer 3 coupling:** Slashing fraction drives `laceration`:
$$\Delta u_{\text{laceration}} \propto \omega_s \cdot \tau \cdot (1 - \text{cohesion})$$

### 11.4 Energetic delivery — analogue geometry

The energetic payload W_e has its own `delivery_modalities` ω specifying how energy couples to `special_mitigation`:
- **Concussive energetic:** Shockwave/pressure-wave delivery (e.g., sonic boom, pressure pulse) — waves push against `special_mitigation` via density and acoustic_impedance
- **Piercing energetic:** Coherent beam (laser, focused plasma) — bypasses surface mitigation; pierce scalar most effective
- **Slashing energetic:** Arc/cutting discharge (galvanic arc, plasma edge) — surface interaction; conductivity gates

The same ψ_k math applies with `special_mitigation` as D_e_eff. Resistance kernels are re-calibrated per affinity family in `scaling_curves.json`.

### 11.5 D_core assembly (full blend)

**Kinetic channels (W_k > 0):**
$$D_{c,k} = F_{\text{scale}} \cdot A_k \cdot \sigma\!\left(\frac{A_k}{R_k}\right) \cdot S_L, \quad k \in \{c, p, s\}$$

$$D_{\text{core,kinetic}} = \omega_c \cdot D_{c,c} + \omega_p \cdot D_{c,p} + \omega_s \cdot D_{c,s}$$

**Energetic channels (W_e > 0):**

$$D_{\text{core,energetic}} = \omega_{c,e} \cdot D_{e,c} + \omega_{p,e} \cdot D_{e,p} + \omega_{s,e} \cdot D_{e,s}$$
(using `delivery_modalities` ω and `special_mitigation`)

**Total core:**
$$D_{\text{core}} = D_{\text{core,kinetic}} + D_{\text{core,energetic}}$$

---

## 12. Layer 1 — Continuous Affinity Field m1

### 12.1 Full formula

```python
def compute_m1(move, attacker, defender, field):
  # Step 1: Baseline from affinity vector dot product
  # Weighted by move's affinity_weights and defender's affinity_emphasis
  s_raw = 0.0
  for a_id in affinity_ids:
    for d_id in affinity_ids:
      s_raw += move.affinity_weights[a_id] * defender.affinity_emphasis[d_id] * dot(V[a_id], V[d_id])
  # V[id] = calibrated unit vector from affinity_vectors.json
  
  B_vec = 1.0 + tanh(s_raw)   # ∈ (0, 2); smooth; mirrors CHART₀ at calibration points

  # Step 2: Attacker alignment (how strongly attacker embodies this move's element)
  A_att = dot(normalize(attacker.affinity_emphasis), move_affinity_axis(move))
  # A_att > 0 when attacker is "in their element"

  # Step 3: Defender material resistance kernel
  # Authored per affinity family in scaling_curves.json; smooth, bounded [0,1]
  R_def = resist_kernel(move.primary_affinity, defender.material_profile, field)
  # Example: TH resist_kernel = sigmoid(thermal_mass * (1 - conductivity) - bias)
  # Example: SO resist_kernel = sigmoid(acoustic_impedance - bias) [high impedance = reflects sonic]

  # Step 4: Continuous composition
  # κ1, κ2 from scaling_curves.json
  m1_raw = B_vec * exp(κ1 * tanh(A_att)) * exp(-κ2 * tanh(R_def))

  # Step 5: Continuous STAB (not binary ×1.15)
  stab = 1.0 + stab_scale * tanh(attacker.affinity_emphasis[move.primary_affinity] / stab_ref)
  m1_raw *= stab

  # Step 6: Field gate (optional; some infusion_coeffs modify m1 based on field)
  m1_raw *= infusion_gate(move.infusion_coeffs, field)

  # Step 7: Clamp
  return clamp(m_min, m_max, m1_raw)
  # m_min ≈ 0.0; m_max ≈ 2.0 from balance JSON
```

**Requirements:**
- Deterministic given sealed battle snapshot. No RNG in Layer 1.
- Beginner UI: show round(m1, 2) + color bucket
- Analyst UI: show B_vec, A_att, R_def, stab contributions individually
- Balance tooling: ∂m1/∂(defender.material[k]) numerically per matchup

---

## 13. Layer 2 — Smooth Predicate Rules

**Design rule:** No Layer 2 multiplier is a flat constant. Every multiplier is a **bounded smooth function** of a state variable or combination. This maintains differentiability through the pipeline and prevents discontinuous behavior at rule trigger points.

**Smooth multiplier pattern:**
$$m_2 \mathrel{*}= 1 + \alpha \cdot \tanh\!\left(\frac{x - x_0}{x_{\text{scale}}}\right)$$

where x is the triggering state variable, x₀ is the activation center, x_scale is the transition width, and α is the maximum bonus magnitude.

**Rule schema:**
```yaml
rule_id: "thermal_shock"
priority: 100
when:
  tag_on_move: "cryo"
  accumulator_range: [heat_load, 0.40, 1.0]      # soft floor at 0.40
  material_range: [rigidity, 0.50, 1.0]
then:
  smooth_mult:
    expr: "1 + 0.60 * tanh((heat_load - 0.40) / 0.20) * tanh((rigidity - 0.50) / 0.15)"
  accumulator_delta:
    fracture: "0.10 + 0.15 * tanh(heat_load / 0.30)"   # more fracture at higher heat_load
    heat_load: "-0.25 * (1 + tanh((heat_load - 0.70) / 0.10))"  # rapid cooling; faster at extreme
  log_line: "Thermal shock! Heat differential fractures the rigid surface."
```

**Complete rule set (authoritative values in balance JSON):**

| Rule ID | When | Smooth Multiplier Form | Side Effects |
|---|---|---|---|
| `thermal_shock` | CY tag + heat_load>0.4 + rigidity>0.5 | 1 + 0.6·tanh((H-0.4)/0.2)·tanh((R-0.5)/0.15) | fracture+, heat_load− |
| `superconduct` | GA affinity + (wetness>0.4 OR conductivity>0.7) | 1 + 0.4·tanh((W-0.4)/0.15) + 0.3·tanh((C-0.7)/0.1) | pierce on special_mitigation |
| `steam_expansion` | TH tag + wetness>0.4 | 1 + 0.3·tanh((W-0.4)/0.15) | wetness drain; initiative penalty |
| `resonant_fracture` | SO affinity + sonic_stress>0.25 + rigidity>0.5 | 1 + 0.8·tanh((S-0.25)/0.15)·tanh((R-0.5)/0.15) | fracture+ |
| `open_shear` | slashing-dominant + laceration rising + wetness>0.35 | 1 + 0.5·tanh((L/0.20))·tanh((W-0.35)/0.12) | laceration+ |
| `acid_etch_det` | combo_detonate=acid_primed + flag present | 1 + 0.8·tanh(corrosion/0.3) | remove flag; corrosion+ |
| `flash_freeze` | CY + wetness>0.55 within 1 turn of AQ | 1 + 0.6·tanh((W-0.55)/0.12) | frozen proc; cryo_load+ |
| `photoelectric` | LU + D_e exceeded ward in prior turn | 1 + 0.45·tanh(radiation/0.2) | charge_buildup+0.25 |
| `concussion_spike` | concussion>0.65 + no stance buff | accuracy *= (1 - 0.35·tanh((C-0.65)/0.12)) | initiative penalty |
| `armor_pierce` | tag armor_piercing + fracture>0.55 | pierce boost = 0.20·tanh((F-0.55)/0.12) | logged |

**Layer 2 evaluation:**
```
m2 = 1.0; flat2 = 0.0
for rule in sorted(rules, key=priority):
  if rule.when(ctx):
    m2 *= rule.smooth_mult(ctx)
    flat2 += rule.flat_add(ctx) if any
    apply_side_effects(rule, ctx)

D_after = stamina_budget × m1 × m2 + flat2
```

Cap: max 16 rules per hit. Rule linter detects contradictions and unreachable predicates offline.

---

## 14. Layer 3 — Accumulator Registry and ODEs

### 14.1 Full registry

| Key | Phase | Build Sources | Role | Status Gate |
|---|---|---|---|---|
| `fracture` | MVP | Heavy strikes; CY on rigid; seismic | D_k_eff erosion via γ_frac·tanh | `fractured` |
| `heat_load` | MVP | TH moves; field ambient; exertion | Hot/cold DoT thresholds | `seared`, `hypothermic` |
| `wetness` | MVP | AQ moves; humidity exchange | GA chain; steam; waterlogging | `waterlogged` |
| `concussion` | MVP | ω_con strikes | initiative/precision decay | `concussed` |
| `laceration` | MVP | ω_slas strikes; high porosity | Bleed dS/dt channel | `bleeding` |
| `charge_buildup` | MVP | GA moves; passive gen; ionization overflow | Paralysis | `paralyzed` |
| `cryo_load` | P2 | CY sustained; cold biomes | Freeze gate with low heat_load | `frozen` |
| `corrosion` | P2 | CR moves; catalyst primes | Armor shred; corroded | `corroded` |
| `radiation` | P2 | LU high-intensity; irradiation | special_mitigation erosion | `irradiated` |
| `sonic_stress` | P2 | SO moves; reflective materials | Resonance combos; deafening | `deafened` |
| `ionization` | P2 | PL moves; charge overflow | GA/PL field coupling | `ionized` |
| `magnetic_flux` | P2 | GA/PL sustained | Modulates GA/PL received damage | rule hooks |
| `compression` | P2 | VO moves; vacuum biomes | S_max compression | VO stress flag |
| `bio_resonance` | P2 | FL sustained; rainforest biomes | FL ability economy | ability gates |

### 14.2 ODE templates

All coefficients authoritative in `accumulators.json`.

$$\frac{d(\text{fracture})}{dt} = \eta \cdot I_{\text{strike}} \cdot \psi_c(\text{rigidity}) - \lambda_F \cdot \text{fracture}$$

$$\frac{d(\text{heat\_load})}{dt} = \alpha_{\text{TH}} \cdot \Phi_{\text{thermal}} - \frac{H - T_a}{\tau(\text{thermal\_mass})}$$

$$\frac{d(\text{wetness})}{dt} = \beta_1 \cdot h \cdot \text{porosity} - \beta_2 \cdot W \cdot (1-h) - \beta_3 \cdot \phi(\text{aero})$$

$$\frac{d(\text{concussion})}{dt} = \zeta \cdot \omega_c \cdot J_{\text{hit}} - \frac{C}{\tau_C(\text{stamina}, \text{initiative})}$$

$$\frac{d(\text{laceration})}{dt} = \xi \cdot \omega_s \cdot \phi(W, \text{porosity}) \cdot J_{\text{hit}} - \gamma_{\text{clot}}(\mathbf{M}) \cdot L$$

$$\frac{d(\text{charge\_buildup})}{dt} = \gamma_{\text{in}}(\text{GA flux}) - \rho(\text{conductivity}, W) \cdot Q$$

$$\frac{d(\text{cryo\_load})}{dt} = \alpha_{\text{CY}} \cdot \Phi_{\text{cryo}} + \frac{\max(0, T_{\text{th}} - H)}{\tau_{\text{cryo}}} - \mu_K \cdot K$$

$$\frac{d(\text{corrosion})}{dt} = \xi_{\text{CR}} \cdot \Phi_{\text{CR}} \cdot \text{chemical\_reactivity} \cdot \text{porosity} - \delta_R \cdot R$$

$$\frac{d(\text{radiation})}{dt} = \phi_{\text{rad}} \cdot \Phi_{\text{LU}} \cdot \mathbb{1}[\Phi > \Phi_{\text{th}}] - \mu_{\text{rad}} \cdot \text{Rad}$$

$$\frac{d(\text{sonic\_stress})}{dt} = \zeta_{\text{SO}} \cdot \Phi_{\text{SO}} \cdot \text{acoustic\_transparency} - \frac{S_s}{\tau_{SO}(\text{acoustic\_impedance})}$$

$$\frac{d(\text{ionization})}{dt} = \gamma_{\text{PL}} \cdot \Phi_{\text{PL}} + \varepsilon \cdot \max(0, Q - Q_{\text{overflow}}) - \rho_{\text{ion}} \cdot I$$

$$\frac{d(\text{bio\_resonance})}{dt} = \rho_{\text{FL}} \cdot \Phi_{\text{FL}} \cdot \sqrt{\text{luminance}} - \varepsilon_{\text{bio}} \cdot B$$

### 14.3 Recovery stat coupling

$$\tau_{\text{eff}}(u) = \tau_{\text{base}}(u) \cdot \left(1 + \alpha_r \cdot \frac{\text{recovery}_{\text{eff}}}{100}\right)$$

High `recovery` → longer τ → slower accumulator buildup AND faster decay toward equilibrium.

### 14.4 Coupling stat coupling

$$\Delta u_{\text{applied}} = \Delta u_{\text{authored}} \cdot \left(1 + \beta_c \cdot \frac{\text{coupling}_{\text{eff}}}{100}\right)$$

### 14.5 Cross-coupling matrix

| Driver ↑ | heat_load | wetness | fracture | charge_buildup | corrosion | ionization |
|---|---|---|---|---|---|---|
| heat_load ↑ | — | evaporates ↓ | CY combo accel ↑ | slight joule ↑ | Arrhenius accel ↑ | plasma heating ↑ |
| wetness ↑ | cools ↓ | — | — | leakage accel ↑ | solvent accel ↑ | — |
| fracture ↑ | — | — | — | — | surface area ↑ | — |
| charge_buildup ↑ | slight ↑ | — | — | — | electrochemical ↑ | overflow → ↑ |
| corrosion ↑ | — | — | accelerates ↑ | accelerates ↑ | — | slight ↑ |
| sonic_stress ↑ | — | — | resonance accel ↑ | — | — | — |

### 14.6 Integration policy

Fixed N=10 subticks per turn. Explicit Euler for replay determinism:
$$\mathbf{u}^{n+1} = \mathbf{u}^n + \Delta t \cdot \mathbf{g}(\mathbf{u}^n, \mathbf{f}^n, \mathbf{M})$$

After each subtick: evaluate threshold event queue (stable priority sort); fire events; apply rule side effects.

---

## 15. Status Conditions

Statuses are threshold-crossing events. A Layer 3 accumulator crosses a boundary → persistent modifier applied to battle context. Distinct from accumulators (continuous) — statuses are staged on/off states with explicit mechanical effects.

Status resist: `status_guard` vector per instance. The β outcome budget share depletes this vector smoothly. High `special_mitigation` and low TH `status_guard` are fully independent.

| ID | Trigger | Active Effects | Cure |
|---|---|---|---|
| `seared` | heat_load > 0.85 | DoT 3%/turn; physical_offense −10%; no regen | AQ move OR 3 turns ambient |
| `hypothermic` | heat_load < −0.60 | initiative −25%; special_offense −15%; DoT 2%/turn | TH move OR 3 turns ambient |
| `frozen` | hypothermic AND cryo_load > 0.70 | 50% skip-turn; physical_mitigation ×1.20; special_mitigation ×0.70 | TH hit (×1.5 bonus) OR time |
| `waterlogged` | wetness > 0.90 | GA received ×1.50; AE received ×1.30; SO +25%; initiative −10% | AE field OR heat over 2 turns |
| `paralyzed` | charge_buildup > 0.80 | initiative −50%; 25% fail-move | MI grounding OR 4 turns decay |
| `fractured` | fracture > 0.75 | physical_mitigation −30%; piercing ×1.30; slashing ×1.20 | mend moves; 5 turns |
| `concussed` | concussion > 0.70 | accuracy −30%; initiative −20%; precision halved | recovery-dependent; focus moves |
| `bleeding` | laceration > 0.65 | DoT 2.5%/turn; AQ extends duration | CY clot; cauterize; 4 turns |
| `corroded` | corrosion > 0.75 | physical_mitigation −20%; special_mitigation −20%; CR ×1.35 | AQ flush; 5 turns |
| `irradiated` | radiation > 0.60 | special_mitigation −25%; recovery 50% effective; DoT 1.5%/turn | time only (6 turns) |
| `deafened` | sonic_stress > 0.70 | own Sonic = 0 damage; precision halved; incoming SO −50% | VO move; 3 turns |
| `ionized` | ionization > 0.50 | GA/PL received ×1.25; passive charge field (+0.01/turn all); ally GA/PL STAB ×1.10 | MI grounding OR AQ flush |

**Escalation paths:**
- `hypothermic` → `frozen` (cryo_load > 0.70 while hypothermic)
- `bleeding` → `hemorrhage` (laceration > 0.90; DoT doubles; 3 turns to emergency heal)
- `paralyzed` → `locked` (initiative reaches 0; 1 full turn action loss)

---

## 16. Damage Over Time and Coupled Flows

DoTs are first-class dS/dt terms. Not re-run through the saturation pipeline.

### 16.1 Coupled state equation

$$\frac{dS}{dt} = -\sum_k \text{potency}_k(\mathbf{u}) + r(S, \mathbf{u})$$

$$\frac{d\mathbf{u}}{dt} = \mathbf{g}(\mathbf{u}, \mathbf{f}, \mathbf{M})$$

Discrete hits apply jumps ΔS and impulses Δu at subtick boundaries. Between hits: smooth ODE evolution.

### 16.2 Multi-hit exposure ramp

$$E_{i+1} = E_i + \Delta E(\text{hit}_i, \text{posture})$$

$$D_i = D_{\text{base}} \cdot (1 + \eta \cdot \tanh(E_i))$$

Interprets combo ramp as numerical integration of an exposure intensity curve against defender posture degradation.

---

## 17. Stances

| Stance | phys/spec offense | phys/spec mitigation | initiative | precision | Special |
|---|---|---|---|---|---|
| **Grounded** (default) | ×1.0 | ×1.0 | ×1.0 | ×1.0 | None |
| **Assault** | ×1.20 | ×0.80 | ×1.05 | ×0.90 | Crit+8%; cannot declare Reactive |
| **Fortified** | ×0.85 | ×1.30 | ×0.80 | ×1.10 | Δu_incoming ×0.70; status threshold +15% |
| **Fluid** | ×0.90 | ×0.90 | ×1.25 | ×1.10 | Evasion+15%; switch-out free; AQ/AE bias |
| **Primed** | ×1.00 | ×0.85 | ×0.95 | ×1.20 | Enables Reactive declaration; crit+10% |

Stance-accumulator coupling:
```
FORTIFIED:  Δu_incoming ×0.70
ASSAULT:    Δu_outgoing ×1.15
FLUID:      wetness −0.03/turn; sonic_stress −0.04/turn
PRIMED:     ionization_self +0.02/turn
```

---

## 18. Passive Abilities

Authored as Layer 2 rules tagged with `ability_id`. Species rows provide pool; player chooses at advancement.

**Stage slots:** Stage 1: 1 passive. Stage 2: 1 passive + 1 passive/reactive. Stage 3: 1 passive + 1 reactive + 1 advanced.

| Ability | Affinity | Effect | Physics Principle |
|---|---|---|---|
| **Thermal Inertia** | TH | heat_load τ ×0.60 | Large thermal mass stores energy longer |
| **Backdraft** | TH | heat_load: 0.70→0.20 in 1 turn → 15% S_max true to attacker | Latent heat released in rapid phase transition |
| **Brittle Resonance** | CY | SO moves: fracture impulse ×1.50 | Cold reduces fracture toughness K_Ic |
| **Hydraulic Memory** | AQ | AQ moves: pierce+0.10 if target wetness>0.40 | Water finds pre-existing cracks; capillary action |
| **Charge Accumulation** | GA | +0.015 charge_buildup/subtick passive | High resting potential; charged body |
| **Arc Discharge** | GA | charge_buildup>0.75 → free surge P=60; Q→0.30 | Capacitor discharge at dielectric breakdown |
| **Load Bearing** | MI | physical_mitigation σ-curve offset ≈ +12% at mid-armor | Pre-stressed concrete; structural optimization |
| **Crystalline Memory** | MI | After fracture<0.10 recovery: physical_mitigation ×1.15 for 2 turns | Recrystallization produces denser microstructure |
| **Photosynthesis** | FL | luminance>0.50: +2% S_max/turn | ATP from photon energy; endothermic reaction |
| **Spore Cloud** | FL | On >15% damage w/ contact: corrosion+0.10 to attacker | Contact-activated irritant; chemical defense |
| **Low Profile** | AE | Base evasion+12%; VO damage ×1.50 | Aero bodies disperse in gravitational gradients |
| **Photon Skin** | LU | First LU hit: ×0.50 | Fresnel reflection at first EM exposure |
| **Coherent Pulse** | LU | While `focused`: LU surge pierce+0.20 | Laser coherence: constructive interference |
| **Mass Distortion** | VO | All initiative values rounded down each turn | Gravitational time dilation (toy) |
| **Resonant Body** | SO | SO STAB → ×1.30; risk: self sonic_stress>0.60 → 5%/turn | Resonant amplification; feedback risk |
| **Destructive Interference** | SO | 1/battle: negate one incoming SO move | Wave cancellation; destructive interference |
| **Reactive Surface** | CR | Contact vs this creature: attacker corrosion+0.08 | Surface-activated chemical reaction |
| **Runaway Heating** | PL | heat_load>0.60: PL moves +20% | Thermal runaway positive feedback loop |

**Reactive abilities (Primed stance):**

| Ability | Trigger | Effect |
|---|---|---|
| **Counter-Current** | on_hit contact | P=60 True surge back; costs 10% heat_load |
| **Work Hardening** | on_damage>18% S_max | physical_mitigation ×1.25 for 2 turns |
| **Phase Collapse** | heat_load crosses 0.80 | Convert 40% heat_load → Plasmic surge P=heat_load×120 |
| **Frequency Lock** | on_hit SO affinity | Reflect 50% SO damage received |
| **Quench** | ally heat_load crosses 0.75 | Ally heat_load −0.45; excess → field wetness |

---

## 19. Battle Phase Structure

```
PRE-TURN
  1. Passive ability ticks (charge accumulation, photosynthesis, etc.)
  2. Field scalar evolution (ambient_temp, humidity per biome rules)
  3. Bench: all accumulators decay at 3× rate; status durations tick at normal rate

ACTION DECLARATION (simultaneous, sealed)
  Each player: move OR switch OR item (ruleset-gated) OR forfeit
  Also declare: stance change (if any); reactive move (if Primed)

PRIORITY RESOLUTION
  Tier +3: Emergency items
  Tier +2: Quick-tagged moves; flee/forfeit
  Tier +1: Stance transitions; priority attack moves
  Tier  0: Standard moves; field moves; catalyst moves
  Tier -1: Resonance moves; heavy surge moves
  Tier -2: Channel moves; full-power setup moves
  Tie-break: initiative_eff comparison; seeded RNG if equal

EXECUTION (per move in priority order)
  1. Hit resolution
  2. Miss → emit Miss; stop
  3. Hit → full damage pipeline (§10)
  4. Layer 3 impulses; re-evaluate D_eff
  5. Reactive move trigger check; if conditions met, fire immediately
  6. Catalyst: set combo_charge flag on target
  7. Combo detonate: if flag matches, apply bonus; consume flag
  8. Emit HitResolved with full breakdown
  9. Status threshold checks; apply new statuses

END-OF-TURN
  1. DoT: integrate all dS/dt potency terms (status-linked)
  2. Subtick integration loop (N=10 explicit Euler steps):
       u^{n+1} = u^n + Δt·g(u^n, f, M)
       → threshold event queue; stable priority sort; fire events
  3. Combo charge duration decay
  4. Status duration decrement; expired statuses removed
  5. Faint check (S ≤ 0); forced switch-in
  6. Switch-in effects
  7. Turn counter increment; replay frame snapshot
```

**Replay guarantee:** Deterministic given `(action_a, action_b, rng_seed, pre_state_hash)`.

---

## 20. Team and Party Rules

Party: 6 creatures. Singles (1 active; ship first). Doubles (2 active; Phase 2).

**Switching:** Costs your action (Tier +1). Pivot moves (damage + free switch; lower base_power band).

**Bench:** Accumulators decay 3×. HP does not recover. Status durations continue.

**Affinity Resonance:** 3+ creatures sharing dominant affinity → +5% ambient field modifier for that affinity on their side.

---

## 21. Biomes and Field Scalars

**Field state schema:** `{ambient_temp, humidity, terrain_id, field_flags[], luminance, acoustic_reflection, passive_per_turn{}, affinity_power_modifiers{}}`

Field is server-authoritative. Clients interpolate for VFX only.

| Biome | Highlights |
|---|---|
| **Neutral Arena** | All ×1.0; no passive deltas. Ranked play default. |
| **Volcanic Rift** | ambient_temp+35; heat_load+0.04/turn; TH×1.15, PL×1.20, CY×0.85 |
| **Tundra Shelf** | ambient_temp−25; heat_load−0.035/turn; cryo_load+0.02/turn; CY×1.15, TH×0.85 |
| **Deep Ocean Trench** | humidity=1.0; wetness+0.05/turn; GA×1.40, SO×1.35, AQ×1.20; no_atmosphere for fire |
| **Thunderhead Storm** | charge_buildup+0.05/turn all; paralysis threshold lowered to 0.65; GA×1.25 |
| **Crystalline Cavern** | acoustic_reflection=0.95; sonic_stress+0.03/turn all; SO×1.35, MI×1.20 |
| **Ancient Rainforest** | humidity=0.95; bio_resonance+0.05/turn; FL×1.25, GA×1.10, TH×0.85 |
| **Near-Vacuum Expanse** | humidity=0; SO×0.0, AE×0.0; passive damage 3–4%/turn for SO/AE primary |
| **Magma Chamber** | ambient_temp+80; all accumulator rates ×1.35; PL×1.30, TH×1.20 |
| **Prismatic Salt Flat** | luminance=0.90; radiation+0.03/turn; LU×1.25, CR×1.15 |

**Biome evolution:** Field moves accumulate per-affinity counters. Threshold → partial biome transition (designed events in `biomes.json`).

---

## 22. Named Combo System

| Combo | Prime | Detonate | Bonus | Physics |
|---|---|---|---|---|
| **Flash Freeze** | AQ → wetness>0.60 | CY within 1 turn | ×1.60 CY; frozen proc | Explosive liquid→solid phase transition |
| **Thermal Runaway** | 2× TH moves | PL while heat_load>0.70 | PL+50%; ionization+0.30 | Positive feedback: heat → more heat |
| **Lightning Rod** | MI grounding OR conductive_stone | GA next turn | GA×1.70; charge_buildup×2 | Lowest electrical potential path |
| **Resonant Fracture** | SO → sonic_stress>0.30 | Physical strike within 1 turn | Strike×1.80; fracture+0.25 | Pre-stressed resonance → structural failure |
| **Acid Etch** | CR catalyst | MI or physical strike within 3 turns | ×1.80; physical_mitigation−15% extra | Corrosion pre-weakens; stress concentrators |
| **Steam Explosion** | AQ → wetness>0.70 | TH while ambient_temp>20 | TH×1.40; initiative debuff | Water→steam: 1600× volume expansion |
| **Void Silence** | VO field move | SO vs same target | SO=0; VO×1.50 | No wave propagation in vacuum |
| **Photoelectric Strike** | LU exceeded ward last turn | GA within 2 turns | GA×1.45; charge+0.25 | Freed electrons amplify subsequent injection |
| **Catalytic Oxidation** | AE field (oxygen marker) | CR next turn | CR×1.60; corrosion rate ×2 for 2 turns | Oxygen as oxidizer; activation energy lowered |
| **Cryo-Shock** | CY → cryo_load>0.50 | TH same turn (Doubles) | TH×1.90; fracture+0.30 | Rapid ΔT → catastrophic stress in brittle material |

---

## 23. Stat Growth and Resonance

### 23.1 Level budget B(L)

Phase A (L 1–100): `B_A(L) = c_A0 + c_A1·L + c_A2·L²` — classic pacing feel.

Phase B (L > 100): `B_B(L) = B_A(100) + B_cap · tanh(c_B · (L-100) / L_ref)` — logarithmic growth toward soft cap. Level 10,000 is achievable; power gain is bounded.

Smooth the first derivative at L=98–102.

### 23.2 Stat formula

$$S_{\text{final}} = \bigl(A_{\text{rolled}} + R_{\text{allocated}}\bigr) \cdot f_{\text{growth}}(L)$$

A_rolled: from spawn pipeline, not species table.

### 23.3 Resonance economy

Accrual: per level; diminishing in Phase B. Allocation: at tuning stations into 9 stats. Hard cap: no single stat > 40% of pool. Respec: product decision.

Resonance moves:
$$R_{\text{factor}} = 1 + r_{\text{scale}} \cdot \tanh\!\left(\frac{R_{\text{allocated}}}{R_{\text{ref}}}\right)$$
`r_scale` capped at 1.2. Teaches smooth saturation as observable game mechanic.

---

## 24. Physics Education Map

**Learning pipeline:** Observation → Meter → Tooltip (opt-in) → Glossary (opt-in) → Formula (Analyst)

| Affinity | Observable | Concept | Analyst Formula |
|---|---|---|---|
| Thermal | heat_load relaxes toward ambient | Newton's cooling; heat capacity | dH/dt = −(H−Ta)/τ |
| Cryo | cold accumulates slower in high-mass creatures; fractures brittle | Latent heat; freeze-thaw | Q=mL |
| Aqueous | wetness equilibrates with humidity | Specific heat; osmosis | dW/dt = β₁hP − β₂W(1−h) |
| Galvanic | charge leaks faster when wet | Ohm's law; RC decay | dQ/dt = I − Q/RC |
| Mineral | rigidity amplifies concussive; grounds charge | Young's modulus; K_Ic | σ=F/A; E=σ/ε |
| Flora | long fights reward; photosynthesis in bright biomes | Metabolic rate; ATP | Michaelis-Menten |
| Aero | evaporates wetness; spreads accumulators | Bernoulli; Re | Re = ρvL/μ |
| Luminous | bypasses material paths; photoelectric combo | E=hf; Beer-Lambert | I=I₀e^{−αx} |
| Void | removes medium; compresses dense bodies | Vacuum; pressure | P=ρgh; escape velocity |
| Sonic | shatters rigid; no effect in vacuum | Resonance; impedance | x''+2βx'+ω₀²x=Fcos(ωt) |
| Corrosive | erodes armor faster in heat | Arrhenius; rate laws | k=Ae^{−Ea/RT} |
| Plasmic | power scales with heat_load | Stefan-Boltzmann; Debye | P=εσT⁴ |

| Mechanic | Calculus Concept |
|---|---|
| σ = 1−exp(−κ/(1+D/A)) | Smooth bounded functions; asymptotic behavior |
| D_eff(u) = D·Π(1−γ·tanh(u_j)) | Product of smooth erosion terms; coupled nonlinear surface |
| Accumulator ODE decay | Exponential decay; e-folding time τ |
| Combo detonation from state | Threshold functions; piecewise dynamics |
| Multi-hit exposure E_{i+1} | Riemann sums; numerical integration |
| Penetration sigmoid P_pen | Logistic functions; smooth threshold crossing |
| STAB = 1+scale·tanh(e/ref) | Smooth saturation; continuous bonus |
| Layer 2: 1+α·tanh((x−x₀)/Δ) | Smooth step functions; C∞ transition |

---

## 25. UI Tiers

| Tier | Sees | Hidden |
|---|---|---|
| **Novice** | Endurance bar; affinity color badge; super/neutral/resist color; Bludgeon/Pierce/Slash strip | All ODEs; D_eff; material profile; m1 terms |
| **Competitor** | MVP accumulator icons + status badges on threshold; tag-trigger callouts ("Thermal Shock!") | Exact values; ψ kernels; subtick math |
| **Analyst** | All accumulator values + du/dt arrows; per-channel σ and D_core_k; m1 terms broken out; active coupling highlights; mechanism tooltips | Nothing |

---

## 26. Data Artifact Checklist

| Artifact | Role |
|---|---|
| `affinity_vectors.json` | **New.** 12 calibrated unit vectors in ℝ⁶. Sourced from offline CHART₀ calibration. |
| `affinity_chart_chart0.json` | CHART₀ design targets. Human-readable; balance design tool only. |
| `scaling_curves.json` | κ, ε, F_scale, S_L coefficients; pierce λ_k; ψ kernels; m1 reshape κ₁,κ₂,stab_scale,stab_ref; resist_kernel formulas; φ_stress parameters (α₁,α₂,α₃,γ₁,γ₂,γ₃,k_p,λ₁,λ₂) |
| `accumulators.json` | 14 entries; ODE parameters; cross-coupling weights; u_min/max; recovery/coupling coefficients |
| `status_conditions.json` | 12 statuses; thresholds; effects; cure conditions; escalation paths |
| `frames/*.yaml` | Per-frame: display seed, category, payload defaults, knob bands, cooldown formula |
| `display_composer_rules.json` | Name assembly token ordering; prominence floors |
| `reaction_rules/*.yaml` | Layer 2 smooth predicate rules with tanh expressions |
| `material_axes.json` | 12 axes; composite shortcut formulas; biome Beta parameters |
| `combos.json` | 10 combo definitions |
| `biomes.json` | 10 biome definitions; evolution rules |
| `stances.json` | 5 stances; stat multipliers; accumulator couplings |
| `abilities/*.yaml` | All passive/reactive as Layer 2 rules |
| `growth_curves.json` | B(L) Phase A/B; Resonance accrual; hard cap fractions |
| `species_catalog/*.yaml` | Flavor only; no combat stats |
| `encounter_tiers.json` | μ/σ per stat per tier; biome Beta overrides |
| `affinity_stress_kernels.json` | **New.** Per-affinity energetic delivery ψ kernels for special_mitigation interaction |

---

## 27. Open Decisions

| Decision | Status |
|---|---|
| Room model (separate worlds vs shared + instanced) | **Pending** |
| Doubles launch timing | **Pending** |
| Secondary affinity η default (0.25/0.35/0.50) | **Pending** |
| Stance change action cost | **Pending** |
| Resonance respec cost | **Pending** |
| Combo UI visibility | **Pending** |
| Biome selection per match | **Pending** |
| Item ruleset | **Pending** |
| SO/CR/PL Phase 2 unlock gate | **Pending** |
| Affinity names final | **Pending** |
| Affinity latent space dimensionality (6 or higher) | **Recommend 6; pending confirm** |

---

## 28. Appendix A — 100 Species Roster

**300 creature names total.** Each line: Stage 1 / Stage 2 / Stage 3.  
Stage 1: small, nascent. Stage 2: developed, mobile. Stage 3: full expression.

**Naming:** The roster favors Linnaean-style taxonomy, Latin/Greek biological roots, and morphological terms (orders, clades, classical taxa) with light stylization. Early stages read like diminutive or transitional groups; Stage 3 reads like major clades, megafauna, or definitive classifications. Species **#077–100** lean into Latinized mathematics, physics, and computing vocabulary to echo their engine-deep / Phase 2 adjacency.

**Affinity rule:** No species has an inherent affinity. Every instance's `affinity_emphasis` vector is rolled at spawn from biome-shaped Dirichlet distributions (§3.2 Step 1). A given species spawning in a volcanic biome will likely have strong TH emphasis; the same species line spawning in a tundra will likely have strong CY emphasis. There is a `p_neutral=0.05` chance of a near-uniform draw (no dominant affinity). Secondary affinity emerges from the same roll. The species name carries zero affinity information — only identity and morphology.

**Secondary affinity:** Any instance whose top two `affinity_emphasis` weights both exceed 0.20 is considered to have a meaningful secondary affinity. The composer and Layer 1 both use the full emphasis vector regardless.

**No-affinity instances:** When the `p_neutral` draw fires, the instance has a flat-ish emphasis vector. These are rare, universally versatile, and often surprising in combat because their m1 interactions are unpredictable.

| # | Stage 1 | Stage 2 | Stage 3 |
|---|---|---|---|
| 001 | Murodite | Rodentia | Megaglires |
| 002 | Canidra | Lupinus | Lycotherium |
| 003 | Felidis | Panthera | Smilodex |
| 004 | Ursidex | Arctodon | Ursarctos |
| 005 | Bovidis | Taurodont | Bosgalith |
| 006 | Cervida | Odocoil | Megaloceros |
| 007 | Vulpeca | Alopex | Vulpescent |
| 008 | Simidia | Pithecon | Anthropops |
| 009 | Chiropra | Pteropod | Noctisbat |
| 010 | Cetacea | Mysticete | Leviathodon |
| 011 | Aviala | Archaeotrix | Theroraptor |
| 012 | Squamis | Lacertia | Lepidosaur |
| 013 | Chelonia | Testudo | Cryptodira |
| 014 | Ophidia | Serpens | Colubridon |
| 015 | Sauridia | Archosaur | Dinosaurox |
| 016 | Crocodis | Alligatia | Eusuchus |
| 017 | Pennula | Pteryla | Plumacea |
| 018 | Rhamphia | Rostruma | Rhamphorhynch |
| 019 | Pterygea | Pterodon | Pterosaurix |
| 020 | Dromea | Velocir | Deinonyx |
| 021 | Arachnia | Araneae | Cheliceron |
| 022 | Coleoptis | Scarabae | Polyphaga |
| 023 | Lepidia | Nymphal | Macrolepid |
| 024 | Crustacea | Decapoda | Malacostrax |
| 025 | Myriapia | Chilopoda | Scolopendrix |
| 026 | Mollusca | Gastropod | Cephalopodix |
| 027 | Echinia | Asteroidea | Echinodermis |
| 028 | Cnidaria | Medusoa | Scyphozoan |
| 029 | Annelidia | Polychaet | Clitellon |
| 030 | Porifera | Demospong | Calcareon |
| 031 | Tardigra | Tardimorph | Megagrada |
| 032 | Osteichia | Actinopt | Sarcopterix |
| 033 | Chondria | Elasmob | Holocephalix |
| 034 | Amphibia | Lissamph | Batrachia |
| 035 | Urodelia | Salamand | Cryptobranch |
| 036 | Salientia | Anura | Neobatrach |
| 037 | Gymnophia | Caecilia | Apodan |
| 038 | Nematoda | Chromador | Enoplea |
| 039 | Rotifera | Bdelloid | Monogonox |
| 040 | Platyhel | Turbellar | Cestodan |
| 041 | Morphida | Morphogen | Polymorpha |
| 042 | Sphaeria | Sphaeron | Macrodome |
| 043 | Acanthia | Spinosia | Acanthodon |
| 044 | Placodia | Stegoron | Placoderm |
| 045 | Malacia | Malacostr | Malacotheria |
| 046 | Ceratidia | Ceratops | Ceratomimus |
| 047 | Caudatia | Uromastix | Uromimus |
| 048 | Dentidia | Odontops | Macrodont |
| 049 | Ocellia | Ommatid | Ocellops |
| 050 | Gnathia | Mandibula | Prognathos |
| 051 | Saltidia | Salient | Saltasaur |
| 052 | Cursidia | Dromeon | Cursoris |
| 053 | Herpidia | Herpeton | Reptilia |
| 054 | Fossidia | Fossor | Fossoria |
| 055 | Scandidia | Scansor | Scansoria |
| 056 | Nectidia | Natantia | Natator |
| 057 | Volidia | Volitant | Volitantia |
| 058 | Patagidia | Patagium | Patagisaura |
| 059 | Cryptidia | Calypto | Cryptobranch |
| 060 | Venidia | Predator | Venatorix |
| 061 | Caulidia | Stipule | Cauliflor |
| 062 | Phyllidia | Folia | Macrophyll |
| 063 | Rhizidia | Radicle | Mycorrhiz |
| 064 | Xylidia | Lignin | Xylophag |
| 065 | Sporidia | Hyphae | Sporangium |
| 066 | Cytidia | Organell | Eukaryot |
| 067 | Cilidia | Trichome | Polytrich |
| 068 | Squamidia | Lepidon | Lepidoste |
| 069 | Conchidia | Bivalvia | Gastropoda |
| 070 | Ossicula | Chondril | Osteichthyes |
| 071 | Luxidia | Photic | Biolucid |
| 072 | Scotidia | Umbral | Tenebrion |
| 073 | Chromidia | Pigmenta | Chromatoph |
| 074 | Audidia | Sonar | Resonatus |
| 075 | Olfacia | Olfacta | Osmaticus |
| 076 | Tactidia | Tactil | Somatosens |
| 077 | Radidia | Trigon | Angularis |
| 078 | Modulo | Divisora | Quotientia |
| 079 | Quanta | Positia | Entanglon |
| 080 | Binaria | Octalium | Hexadecima |
| 081 | Ciphra | Codia | Cryptographa |
| 082 | Nodulus | Topolog | Topologia |
| 083 | Datula | Packetia | Datagramma |
| 084 | Acerva | Cumulus | Matricis |
| 085 | Latebra | Bufferon | Registrix |
| 086 | Seriatia | Parallela | Multiplex |
| 087 | Apicis | Terminus | Terminalis |
| 088 | Fluxidia | Eutectis | Amalgama |
| 089 | Porta | Logica | Booleana |
| 090 | Iteratia | Recursiva | Recursion |
| 091 | Erratia | Anomalia | Exceptia |
| 092 | Atypia | Parallax | Parallaxis |
| 093 | Heurisia | Stochast | Stochastica |
| 094 | Diagnosia | Resolva | Diagnostica |
| 095 | Stasis | Homeos | Homeostasis |
| 096 | Probatia | Verific | Empirica |
| 097 | Normia | Calibra | Standardia |
| 098 | Metria | Metrica | Metrologia |
| 099 | Libridia | Aequalis | Aequilibrium |
| 100 | Symetria | Bilatera | Symmetrica |

**Phase 2 content-lock note:** Species #077–100 exist in the database and engine from day one but their spawn tables are gated. They can still appear as secondary-affinity instances of species #001–076 if the biome Dirichlet draws SO, CR, or PL emphasis — the content lock means no dedicated SO/CR/PL spawn tables, not engine removal.

---

## 29. Appendix B — Move Frame Catalog

Frames are the authoring envelopes players build moves from. Display seed = root of the auto-generated name.

### STRIKE frames (W_k default 0.85–1.0)

| Frame ID | Display Seed | Default ω | Signature | Notes |
|---|---|---|---|---|
| `slam` | Slam | {0.80,0.10,0.10} | High concussive, low pierce | General blunt |
| `thrust` | Thrust | {0.10,0.75,0.15} | High piercing, high pierce band | Penetration focus |
| `rend` | Rend | {0.10,0.15,0.75} | High slashing, laceration impulse | Bleed setup |
| `crush` | Crush | {0.90,0.05,0.05} | Very high concussive | Fracture via mass |
| `impale` | Impale | {0.05,0.90,0.05} | Max piercing; high pierce band | Armor bypass specialist |
| `cleave` | Cleave | {0.20,0.15,0.65} | Wide slashing; splash potential | Area shear |
| `seismic_stomp` | Seismic Stomp | {0.85,0.10,0.05} | MI-gated; AoE field fracture | Earthquake flavor |
| `pivot_drive` | Pivot Drive | {0.60,0.25,0.15} | pivot=true; moderate all channels | Switch after hit |
| `tempered` | Tempered | {0.40,0.35,0.25} | Balanced; focused_bonus high band | Precision payoff |
| `gale_drive` | Gale Drive | {0.50,0.20,0.30} | AE-gated; Aero accumulator spread | Wind-physical hybrid |

### SURGE frames (W_e default 0.85–1.0)

| Frame ID | Display Seed | Default ω (delivery) | Signature | Notes |
|---|---|---|---|---|
| `blast` | Blast | {0.30,0.50,0.20} | General energy burst; wide affinity | Most versatile |
| `lance` | Lance | {0.05,0.90,0.05} | High piercing delivery; high pierce band | Beam; LU ideal |
| `burst` | Burst | {0.60,0.20,0.20} | Short range; wide spread | Zone control |
| `siphon` | Siphon | {0.20,0.30,0.50} | Drains target accumulator; low endurance damage | Setup |
| `prism` | Prism | {0.33,0.33,0.34} | Multi-affinity; affinity_weights enabled | Fusion builds |
| `cascade` | Cascade | {0.40,0.30,0.30} | Chain to additional target on crit | Spread potential |
| `noiseburst` | Noiseburst | {0.70,0.20,0.10} | SO-gated; sonic_stress impulse high | Sonic control |
| `collapse` | Collapse | {0.60,0.30,0.10} | VO-gated; compression impulse | Gravity burst |
| `radiate` | Radiate | {0.20,0.30,0.50} | LU-gated; radiation impulse; aura spread | Radiation setup |
| `torrent` | Torrent | {0.40,0.20,0.40} | AQ-gated; wetness impulse high | Flood |

### TRUE frames

| Frame ID | Display Seed | Notes |
|---|---|---|
| `spike` | Spike | Direct fixed endurance loss; no saturation |
| `sever` | Sever | Bypasses all mitigation; no Layer 2 modifier |
| `nullify` | Nullify | VO-gated; S_max compression as true damage |

### FIELD frames

| Frame ID | Display Seed | Field Effect |
|---|---|---|
| `field_seed` | Field Seed | General arena scalar delta |
| `heatwave` | Heatwave | ambient_temp +6–12; humidity ×0.70 |
| `deluge` | Deluge | humidity +0.30; wetness all active +0.15 |
| `ionosphere` | Ionosphere | charge_buildup field +0.04/turn for 3 turns |
| `permafrost_layer` | Permafrost Layer | cryo field; ambient_temp −10 for 4 turns |
| `acoustic_chamber` | Acoustic Chamber | acoustic_reflection → 0.90 for 3 turns |
| `verdant_growth` | Verdant Growth | bio_resonance +0.06/turn; luminance +0.20 |
| `vacuum_pocket` | Vacuum Pocket | VO-gated; humidity=0; SO multiplier=0 for 2 turns |
| `salt_flat` | Salt Flat | ionic_ground flag; radiation +0.02/turn |

### REACTIVE frames

| Frame ID | Display Seed | Default Trigger |
|---|---|---|
| `parried_arc` | Parried Arc | on_hit (contact) |
| `repulsion_field` | Repulsion Field | on_hit (any) |
| `static_discharge` | Static Discharge | on_hit (contact) → GA impulse to attacker |
| `thermal_rebound` | Thermal Rebound | on_damage_gt(0.18) → heat_load output |
| `frequency_lock` | Frequency Lock | on_hit(SO affinity) |
| `fracture_response` | Fracture Response | on_accumulator_cross(fracture, 0.60) |

### CHANNEL frames

| Frame ID | Display Seed | Duration | Signature |
|---|---|---|---|
| `focus_bridge` | Focus Bridge | 4 subticks | Sustained; ramp_eta=0.25 |
| `plasma_beam` | Plasma Beam | 4 subticks | PL-gated; ionization impulse/tick |
| `acid_rain` | Acid Rain | 5 subticks | CR-gated; corrosion impulse/tick; AoE |
| `resonance_beam` | Resonance Beam | 3 subticks | SO-gated; sonic_stress/tick; builds fast |
| `solar_torrent` | Solar Torrent | 4 subticks | LU-gated; radiation/tick |
| `corrosive_mist` | Corrosive Mist | 6 subticks | CR-gated; low damage/tick but high corrosion rate |

### RESONANCE frames

| Frame ID | Display Seed | Scales With |
|---|---|---|
| `resonance_surge` | Surge | special_offense Resonance |
| `deep_strike` | Deep Strike | physical_offense Resonance |
| `pinnacle_wave` | Pinnacle Wave | coupled sum of phys+spec Resonance |

### CATALYST frames

| Frame ID | Display Seed | Primes | Duration |
|---|---|---|---|
| `etch` | Etch | `acid_primed` | 3 turns |
| `frost_mark` | Frost Mark | `cryo_prime` | 2 turns |
| `charge_mark` | Charge Mark | `galvanic_prime` | 2 turns |
| `seismic_mark` | Seismic Mark | `seismic_prime` | 3 turns |
| `void_brand` | Void Brand | `void_prime` | 2 turns |
| `resonance_tag` | Resonance Tag | `sonic_prime` | 2 turns |
| `thermal_brand` | Thermal Brand | `thermal_prime` | 2 turns |

---

## 30. Appendix C — Full Damage Walkthrough

Attacker: **Pithecon** (TH:0.51, GA:0.19) stage 2, level 28  
Defender: **Salamand** (MI:0.65, CY:0.20) stage 2, level 25  
Move: "Thermal Blast" — frame=`blast`, TH primary, W_k=0.15, W_e=0.85, delivery ω={0.1,0.7,0.2}, pierce=0.25, base_power=55

**Pre-hit state:** Salamand fracture=0.40, heat_load=0.22

---

**Stage 0 — Hit resolution**
```
p_hit = sigmoid(α_acc + β_acc·77_precision − γ_acc·88_initiative_Salamand)
       ≈ 0.93   [balance JSON coefficients applied]
RNG = 0.71 < 0.93 → HIT
```

**Stage 1 — Payload routing**
```
P_k = 55 × 0.15 = 8.25  (kinetic portion)
P_e = 55 × 0.85 = 46.75 (energetic portion)
A_k = physical_offense_eff_Pithecon × P_k_scale = 104 × 0.150 = 15.6
A_e = special_offense_eff_Pithecon × P_e_scale = 110 × 0.850 = 93.5
```

**Stage 2 — State-coupled effective defense**
```
D_k_eff = physical_mitigation_Salamand × (1 − γ_frac·tanh(0.40))
         = 130 × (1 − 0.18·0.380) = 130 × 0.932 = 121.2

D_e_eff = special_mitigation_Salamand × (1 − γ_rad·tanh(0)) × (1 − γ_corr·tanh(0))
         = 95 × 1.0 × 1.0 = 95.0

Energetic channels (delivery ω = {0.1, 0.7, 0.2}):
  R_e_con  = D_e_eff × ψ_e_con(M_Salamand) = 95 × 0.42 = 39.9
  R_e_pier = D_e_eff × ψ_e_pier(M_Salamand) = 95 × 0.80 = 76.0  (high rigidity)
  R_e_slas = D_e_eff × ψ_e_slas(M_Salamand) = 95 × 0.54 = 51.3

After pierce (λ_pier=1.0, λ_con=0.4, λ_slas=0.6):
  D_e_con  = 39.9 × (1 − 0.25×0.4×1.0) = 39.9×0.90 = 35.9
  D_e_pier = 76.0 × (1 − 0.25×1.0×1.0) = 76.0×0.75 = 57.0
  D_e_slas = 51.3 × (1 − 0.25×0.6×1.0) = 51.3×0.85 = 43.6
```

**Stage 3 — Core saturation**
```
S_L = (1 + 0.02×28)/(1 + 0.02×25) = 1.56/1.50 = 1.040
κ = 1.80; F_scale = 0.45; A_e = 93.5

σ_e_con  = 1−exp(−1.80/(1+35.9/93.5)) = 1−exp(−1.80/1.384) = 1−exp(−1.300) = 0.728
σ_e_pier = 1−exp(−1.80/(1+57.0/93.5)) = 1−exp(−1.80/1.610) = 1−exp(−1.118) = 0.673
σ_e_slas = 1−exp(−1.80/(1+43.6/93.5)) = 1−exp(−1.80/1.466) = 1−exp(−1.228) = 0.707

D_core_e_con  = 0.45 × 93.5 × 0.728 × 1.040 = 31.93
D_core_e_pier = 0.45 × 93.5 × 0.673 × 1.040 = 29.51
D_core_e_slas = 0.45 × 93.5 × 0.707 × 1.040 = 31.00

ω = {0.1, 0.7, 0.2}
D_core_energetic = 0.1×31.93 + 0.7×29.51 + 0.2×31.00
                 = 3.193 + 20.657 + 6.200 = 30.05

D_core_kinetic (small; W_k=0.15):
  A_k = 15.6; R_k = D_k_eff × ψ_k ≈ 121.2 × 0.38 = 46.1
  σ_k = 1−exp(−1.80/(1+46.1/15.6)) = 1−exp(−1.80/3.956) = 1−exp(−0.455) = 0.366
  D_core_kinetic ≈ 0.45 × 15.6 × 0.366 × 1.040 = 2.67

D_core = 30.05 + 2.67 = 32.72
```

**Stage 4 — Outcome budget**
```
α = 0.85 → stamina_budget = 0.85 × 32.72 = 27.81
β = 0.10 → status_guard_delta (logged, minor)
γ = 0.05 → status_amplification (minor)
```

**Stage 5 — Layer 1 m1**
```
Affinity vector computation:
  s_raw = Σ affinityW_move[i] × affinityE_defender[j] × dot(V[i],V[j])
  ≈ TH→MI: 0.51×0.65×dot(V_TH,V_MI) + TH→CY: 0.51×0.20×dot(V_TH,V_CY) + ...
  Calibrated from CHART₀: TH→MI=0.75 → dot(V_TH,V_MI) ≈ artanh(0.75−1) = artanh(-0.25) ≈ -0.255
  TH→CY=2.0 → dot(V_TH,V_CY) = artanh(1.0) → large positive
  s_raw ≈ 0.51×0.65×(−0.255) + 0.51×0.20×(+1.47) + (smaller cross terms)
        ≈ −0.085 + 0.150 + (minor) ≈ +0.072
  
  B_vec = 1 + tanh(0.072) = 1 + 0.072 = 1.072

A_att = 0.51 (attacker TH emphasis aligned to TH move)
R_def = resist_kernel(TH, Salamand.material): thermal_stability = 0.47×(1-0.35)=0.305 → R_def=0.31

m1_raw = 1.072 × exp(0.30×tanh(0.51)) × exp(−0.30×tanh(0.31))
       = 1.072 × exp(0.30×0.471) × exp(−0.30×0.301)
       = 1.072 × 1.149 × 0.913 = 1.124

STAB = 1 + 0.15×tanh(0.51/0.40) = 1 + 0.15×0.789 = 1.118
m1 = clamp(0, 2, 1.124 × 1.118) = clamp(0, 2, 1.257) = 1.257
```

**Stage 6 — Layer 2**
```
"thermal_shock": heat_load=0.22 < 0.40 → DOES NOT FIRE
"resonant_fracture": no SO tag → NO
"armor_pierce_align": fracture=0.40 < 0.55 → NO

m2 = 1.0; flat2 = 0
D_after = 27.81 × 1.257 × 1.0 + 0 = 34.96
```

**Stage 7 — Layer 3 impulses**
```
move.accumulator_impulses = {heat_load: 0.04, fracture: 0.03}
Δheat_eff  = 0.04 × (1 + 0.01×84) = 0.04×1.84 = 0.074
Δfrac_eff  = 0.03 × (1 + 0.01×84) = 0.03×1.84 = 0.055

Salamand.heat_load = clamp(0.22+0.074, 0, 1) = 0.294
Salamand.fracture  = clamp(0.40+0.055, 0, 1) = 0.455
→ D_k_eff next turn: 130 × (1−0.18×tanh(0.455)) = 130 × 0.922 = 119.9
```

**Stage 8 — Crit and variance**
```
p_crit=0.05; crit_bonus=1.50; δ=0.03
RNG: C=1.0 (no crit); Ξ=1.012
D_final_raw = 34.96 × 1.0 × 1.012 = 35.38
```

**Stage 9 — Application**
```
stamina_loss = max(0, floor(35.38)) = 35
Salamand.S -= 35

Emit HitResolved {
  stamina_loss: 35,
  breakdown: {
    D_core: 32.72 (kinetic: 2.67, energetic: 30.05),
    m1: 1.257 (B_vec:1.072, A_att:0.51, R_def:0.31, stab:1.118),
    m2: 1.0, flat2: 0, C: 1.0, Ξ: 1.012,
    modalities: {ω:{0.1,0.7,0.2}, σ:{0.728,0.673,0.707}, D_core_k:{31.93,29.51,31.00}},
    outcome_budget: {α:0.85},
    accumulator_impulses: {heat_load:0.074, fracture:0.055},
    rules_fired: [],
    S_L: 1.040,
    payload: {W_k:0.15, W_e:0.85}
  }
}
```

---

## 31. Technical Architecture and Engine Design

**Status:** Authoritative technology selection. All implementation must align with this section.  
**Rule:** Ship the MVP stack first; scaling layers are additive, not replacements.

---

### 31.1 Design Constraints

Before selecting any technology, the hard constraints are:

| Constraint | Implication |
|---|---|
| Self-hostable on a single machine OR Vercel | No mandatory third-party SaaS; everything must run in Docker or on Vercel's free/pro tier |
| 100+ concurrent players per world instance | Standard HTTP request/response is insufficient; need persistent connections and efficient state sync |
| 120fps target rendering | Must use hardware-accelerated 2D rendering (WebGL); pure DOM/CSS cannot achieve this |
| Procedurally generated maps | World generation must run server-side (deterministic from seed) and stream chunks to clients |
| No save-game mechanic | All persistent state (creatures, moves, resonance) lives in the database; client is stateless |
| Accounts via Google OAuth only | No username/password storage; OAuth only; prevents easy account duplication |
| Pokémon Gen 1 aesthetic | 2D tilemaps, sprite sheets, turn-based battle overlay — Phaser 3 is the dominant choice |

---

### 31.2 Full Technology Stack

#### Frontend — Web App

| Technology | Role | Why |
|---|---|---|
| **Next.js 14+ (App Router)** | Web framework | Best React SSR/SSG; handles auth callbacks, API routes, static landing page, and the app shell in one codebase |
| **React 18** | UI component layer | Component model for menus, lobby, composer UI, dex, account pages |
| **Tailwind CSS** | Styling outside the game canvas | Fast utility-first; only used for menus, lobby, auth pages — not the game canvas itself |
| **Phaser 3** | Game engine (embedded in browser) | The definitive open-source 2D game engine for browsers. WebGL renderer targets 60–120fps. Handles tilemaps, sprite animation, camera, input, sound. Battle scene is a Phaser scene layered over the world scene. |
| **TypeScript** | All code | Shared types between client, server, and game server — prevents the classic "same formula implemented twice differently" bug |

**Why Phaser 3 over alternatives:**
- Phaser 3 runs in a `<canvas>` element inside a Next.js page. The React app renders the chrome (menus, HUD, composer) around the canvas; Phaser owns the canvas.
- Built-in tilemap support (Tiled format) means the procedural world generator outputs Tiled-compatible JSON and Phaser renders it directly.
- WebGL renderer via PixiJS under the hood — hardware accelerated, stable at 120fps on modern hardware.
- Battle scene overlay: when combat triggers, Phaser transitions to the battle scene (Gen 1 style full-screen takeover) while the world scene pauses. Transition back when battle ends.

#### Auth

| Technology | Role | Why |
|---|---|---|
| **Auth.js (NextAuth v5)** | OAuth provider integration | Free, self-hostable, native Next.js integration. Google provider only. Session stored in database via PostgreSQL adapter. |
| **Google OAuth 2.0** | Identity verification | Verified real phone/email behind the account. Prevents trivial account duplication. No password storage. |

**Auth flow:**

```
User clicks "Sign in with Google"
→ Auth.js redirects to Google OAuth
→ Google authenticates, returns JWT
→ Auth.js creates/retrieves user record in PostgreSQL
→ Session cookie set (httpOnly, secure)
→ Redirect to /app (game lobby)
```

#### Game Server — Multiplayer

| Technology | Role | Why |
|---|---|---|
| **Colyseus** | Multiplayer game server (rooms + state sync) | Purpose-built for exactly this use case: rooms of 50–200 players, schema-based state, WebSocket transport, Node.js/TypeScript native. Free and open-source. |
| **Node.js 22** | Colyseus runtime | Same language as the rest of the stack; shared types with client |

**Why Colyseus over raw Socket.io:**
- Colyseus has a **Room** abstraction that maps directly to Wildloom's world instance concept. One Colyseus Room = one world instance.
- **Schema-based state sync:** Colyseus only sends deltas — when 100 players move around, clients only receive the patches for what changed near them. This is critical for performance at scale.
- **Built-in room matching:** `client.joinOrCreate("world", { seed: "..." })` — handles lobby, join-by-code, and friend-join natively.
- Battle rooms are a second Colyseus Room type: two players enter, battle resolves server-side, result committed to PostgreSQL, room closes.
- Colyseus runs as a **separate process** from the Next.js app, typically on port 2567. In Docker Compose this is its own container.

**Room types:**

```typescript
WorldRoom extends Room {
  // State: tile chunk cache, player positions, active wild spawns
  // Max clients: 100 (configurable)
  // Lifecycle: created on first join; idle-destroyed after N minutes empty
}

BattleRoom extends Room {
  // State: battle context (full pipeline state per §10), turn declarations
  // Max clients: 2 (singles) or 4 (doubles phase 2)
  // Lifecycle: created on challenge accept; destroyed on battle end
}
```

#### Database

| Technology | Role | Why |
|---|---|---|
| **PostgreSQL 16** | Primary persistent store | Accounts, creatures, move loadouts, resonance, trade logs, battle audit trail. ACID. Self-hostable. |
| **Redis 7** | Session cache, pub/sub, ephemeral world state | Auth.js sessions, Colyseus room presence, rate limiting, world chunk cache. Sub-millisecond lookups. |
| **Prisma ORM** | Database schema + type-safe queries | Auto-generates TypeScript types from the schema. Migrations built-in. Works with both Next.js and Colyseus. |

**Why not TimescaleDB, PlanetScale, or Supabase:**
- TimescaleDB is excellent for time-series (battle logs by timestamp) but adds complexity for the primary relational data. Use vanilla PostgreSQL with a `battle_logs` table partitioned by date if needed — same result, simpler setup.
- PlanetScale / Supabase are SaaS. The constraint is self-hosted. PostgreSQL in a Docker container with regular `pg_dump` backups covers everything they offer.

**Core tables (abbreviated):**

```sql
users           -- Google sub, display name, created_at
creatures       -- instance_id, owner_user_id, species_id, level, all instance fields (JSONB)
move_instances  -- move_id, owner_creature_id, full MoveInstance (JSONB)
world_sessions  -- room_id, seed, biome_layout, created_at, player_count
battle_log      -- battle_id, attacker_id, defender_id, turn_data (JSONB), outcome, timestamp
trades          -- offer_id, from_user, to_user, items_offered, status, two-phase commit
```

JSONB columns (creatures, move_instances) store the full rolled payloads without requiring a column per stat. Indexed on `owner_user_id` for instant dex loads.

#### Infrastructure — Local and Production

**Local development:**

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    volumes: [./data/postgres:/var/lib/postgresql/data]
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  nextjs:
    build: ./apps/web
    ports: ["3000:3000"]
    depends_on: [postgres, redis]

  colyseus:
    build: ./apps/gameserver
    ports: ["2567:2567"]
    depends_on: [postgres, redis]

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    # Proxies: / → nextjs:3000, /colyseus → colyseus:2567 (WebSocket upgrade)
```

**Production (single machine / VPS):**
- Same Docker Compose on a VPS (Hetzner, DigitalOcean, Fly.io, or your own machine exposed via Cloudflare Tunnel)
- Nginx terminates TLS via Certbot/Let's Encrypt
- PostgreSQL data volume on a persistent disk
- Redis persistence enabled (AOF mode)

**Vercel deployment (alternative frontend):**
- Deploy only the Next.js app to Vercel
- Colyseus runs on your machine/VPS (WebSocket connections cannot run on Vercel serverless)
- PostgreSQL and Redis on your machine/VPS
- This is the recommended hybrid: Vercel handles the web app CDN; your machine handles the game server and database

---

### 31.3 Monorepo Layout

```
wildloom/
├── apps/
│   ├── web/                    # Next.js app
│   │   ├── app/
│   │   │   ├── page.tsx        # Landing page (/)
│   │   │   ├── app/
│   │   │   │   ├── page.tsx    # Game lobby (/app) — requires auth
│   │   │   │   ├── dex/        # Creature dex
│   │   │   │   └── composer/   # Move composer UI
│   │   │   └── api/
│   │   │       └── auth/       # Auth.js route handler
│   │   └── game/               # Phaser game scenes
│   │       ├── WorldScene.ts   # Overworld — player movement, wild encounters
│   │       ├── BattleScene.ts  # Gen 1 battle overlay
│   │       └── UIScene.ts      # HUD always-on top layer
│   │
│   └── gameserver/             # Colyseus server
│       ├── rooms/
│       │   ├── WorldRoom.ts
│       │   └── BattleRoom.ts
│       └── state/
│           ├── WorldState.ts   # Colyseus schema
│           └── BattleState.ts
│
└── packages/
    ├── combat/                 # Damage pipeline §10 — shared between web and gameserver
    ├── worldgen/               # Procedural map generation — shared
    ├── protocol/               # Message schemas — shared
    ├── db/                     # Prisma schema + client — shared
    └── types/                  # Shared TypeScript interfaces
```

The critical design principle: `packages/combat` and `packages/worldgen` run in **both** the browser (for previews) and on the server (for authoritative resolution). TypeScript monorepo with npm/pnpm workspaces enforces this.

---

### 31.4 Procedural World Generation

**Stack:** Custom TypeScript in `packages/worldgen`. No third-party world-gen library needed.

**Algorithm:**

```
Input: seed (64-bit integer)
Output: WorldMap { chunks: Chunk[][], biome_layout: BiomeCell[][] }

Step 1 — Biome layout
  Generate a coarse biome grid using multi-octave simplex noise
  (simplex-noise npm package — pure TS, no native deps)
  Parameters: scale=0.003, octaves=4, persistence=0.5, lacunarity=2.0
  Each cell maps to one of the 10 biomes (§21) via threshold bands on noise value
  Biome transitions are blended over a 3-cell border zone

Step 2 — Terrain generation
  Per-chunk (16×16 tiles): generate tile layer from biome + secondary noise pass
  Tile types: ground, path, water, obstacle, encounter_zone, structure_hint
  encounter_zone tiles trigger wild encounter checks (tall grass equivalent)

Step 3 — Structure placement
  Gyms, towns, and trainer hubs placed deterministically at biome centroids
  Minimum distance constraints prevent clustering
  Each structure is a hand-authored tilemap chunk, placed at the procedural location

Step 4 — Wild spawn tables
  Each biome cell has a weighted spawn table: species IDs × encounter_tier × level band
  No affinity filtering — the biome sets the Dirichlet parameters for the affinity roll
  Spawn table committed to WorldRoom state; deterministic from seed

Step 5 — Stream to client
  World is chunk-based: client only receives chunks within a N-chunk radius of the player
  Colyseus WorldRoom sends ChunkData messages as player moves
  Client Phaser scene caches received chunks; evicts distant chunks from memory
```

**Performance note:** Generation of a 200×200 chunk world (3200×3200 tiles) on a modern CPU takes ~80ms in TypeScript. This happens once at room creation; subsequent chunk requests are sub-millisecond reads from the in-memory world state.

---

### 31.5 Game Loop and Rendering

**World scene (Phaser 3):**

```
Client game loop (60–120fps, hardware-dependent):
  Every frame:
    1. Input polling (WASD / arrow keys / touch)
    2. Send player position delta to Colyseus (rate-limited to 20 updates/sec)
    3. Receive and apply server state patches (other player positions, spawns)
    4. Render: tilemap → wild creatures → other players → local player → HUD
    5. Encounter check: if player steps on encounter_zone tile, roll encounter
       probability from server; if triggered → transition to BattleScene

  Client-side prediction: local player moves immediately at input;
  server corrects position if desync detected (standard game networking)
```

**Battle scene (Phaser 3):**

```
Battle overlay (Gen 1 style):
  - Full-screen takeover with black transition wipe
  - Two creature sprites: attacker left, defender right (Gen 1 positions)
  - HP bar = current S / S_max (labeled "Stamina" or "Readiness" per §25)
  - Move list: 8 move slots displayed as a grid (not 4 — see §31.6)
  - Accumulator meters: small icon strip below HP (Novice: 3 meters; Competitor: all)
  - Turn animation: move declared → server resolves → HitResolved event received →
    play animation → update meters → check status → next turn
  - All combat math runs server-side (BattleRoom); client only animates results
```

**Frame rate:**
- Phaser 3 with WebGL renderer targets the display's refresh rate via `requestAnimationFrame`
- On 60Hz displays: 60fps. On 120Hz/144Hz displays: 120fps+
- No physics simulation in the battle scene (turn-based), so the only frame budget concern is the world scene tilemap rendering — easily 120fps with Phaser's tile culling

---

### 31.6 Eight Moves Per Creature

Earlier drafts assumed four move slots; this document standardizes on **8 move slots**:

- Creatures have 8 equipped move instances (not 4)
- Battle UI displays all 8 as a 2×4 or 4×2 grid
- Composer allows tuning all 8 independently
- Cooldown system prevents spamming: each move has `cooldown_turns` from §9 schema
- This matches Gen 1 flavor of having a full moveset while adding strategic depth via cooldowns replacing PP

Wild encounters and procedural loadouts respect the same cap: only stage-unlocked slots are filled (§3.2 Step 5).

**Slot unlock by stage:**
- Stage 1: 4 move slots unlocked
- Stage 2: 6 move slots unlocked
- Stage 3: 8 move slots unlocked

Wild instances have all stage-appropriate slots filled procedurally. Players fill slots via the Composer.

---

### 31.7 Auth and Account Architecture

**Registration flow:**

```
New user → clicks "Sign in with Google" on landing page (/)
→ Auth.js Google provider OAuth dance
→ On first login: create users record + starter creature batch (3 creatures, player chooses 1)
→ Redirect to /app (game lobby)
→ All subsequent logins: Auth.js finds existing session or creates new one from Google sub

No username/password. Google sub is the stable identity anchor.
Duplicate account prevention: Google enforces one account per verified phone number.
```

**Account data model:**

```typescript
// Persisted in PostgreSQL via Prisma
type User = {
  id: string;              // internal UUID
  google_sub: string;      // Google's stable user ID — unique constraint
  display_name: string;    // from Google profile, player can customize once
  created_at: Date;
  last_seen: Date;
}

// All creatures belong to a user
type Creature = {
  instance_id: string;
  owner_user_id: string;   // FK → users.id
  species_id: string;
  level: number;
  // ... all instance fields as JSONB
}
```

**No save-game:** The database IS the save. When a player closes their browser mid-battle, the BattleRoom commits the last known state to PostgreSQL on idle timeout. When they reconnect, the lobby loads their creatures from the DB instantly.

---

### 31.8 Lobby and World Joining

**Lobby UI (/app):**

```
Left panel: Your creature party (6 slots; click to inspect/compose)
Center panel: World browser
  - "Create World" → seed input (optional) → creates new Colyseus WorldRoom
  - "Join by code" → 6-character room code → joins existing room
  - "Find friends" → type Google display name → see if they're in a world → join button
  - "Public worlds" → list of rooms with player count, biome seed, host name
Right panel: Account summary, recent battles, dex progress
```

**Room codes:** 6-character alphanumeric generated from room ID. Human-readable, short enough to share in chat. Colyseus handles room lifecycle.

**Friend joining:**

```
Player A types Player B's display name in lobby
→ API call to /api/friends/locate?name=PlayerB
→ Returns: { room_id, player_count, biome_name } if B is in a public room
→ "Join {PlayerB}'s world" button
```

---

### 31.9 Scaling Architecture

**Phase 1 — Single machine (MVP)**

```
Docker Compose on one server:
  postgres:5432 — persistent volume
  redis:6379    — ephemeral + AOF persistence
  nextjs:3000   — web app
  colyseus:2567 — game server (all rooms on one process)
  nginx:443     — reverse proxy + TLS termination

Capacity estimate: 1 Colyseus process handles ~500 concurrent WebSocket connections
comfortably on a 4-core/8GB machine. At 100 players per world, this supports ~5
simultaneous worlds. Fine for a new game.
```

**Phase 2 — Horizontal Colyseus scaling**

```
Colyseus supports horizontal scaling via its built-in distributed mode:
  Multiple Colyseus instances behind a load balancer
  Redis pub/sub coordinates room presence across instances
  "Sticky sessions" ensure a client always reconnects to the same Colyseus instance

Docker Compose addition:
  colyseus_1:2567
  colyseus_2:2568
  colyseus_3:2569
  → nginx upstream block with ip_hash for sticky sessions

Each additional Colyseus container adds ~500 concurrent player capacity.
```

**Phase 3 — Kubernetes + ArgoCD (if growth demands)**

```
If demand exceeds ~5 physical machines:

Infrastructure:
  k8s cluster (k3s for lightweight self-hosted, or GKE/EKS if budget allows)
  ArgoCD for GitOps: push to main → ArgoCD applies manifests → zero-downtime rolling deploy

Manifests:
  Deployment: nextjs (3 replicas min, HPA on CPU)
  Deployment: colyseus (2 replicas min, HPA on connection count)
  StatefulSet: postgres (primary + read replica)
  Deployment: redis (sentinel for HA)
  Ingress: nginx-ingress-controller + cert-manager (TLS)

ArgoCD gives you:
  - Automatic rollback on failed deploy
  - Diff-based change preview before apply
  - Multi-environment support (staging → production promotion)
  - No manual kubectl apply in production

Horizontal Pod Autoscaler on Colyseus scales replicas based on active WebSocket
connection count (custom metric via Prometheus + kube-metrics-adapter).
```

**Phase 4 — CDN edge (if global)**

```
Vercel handles Next.js static/SSR at edge automatically.
Colyseus game servers need geographic distribution:
  Fly.io Machines: deploy Colyseus containers in multiple regions (iad, lhr, sin, etc.)
  Players connect to the nearest region via latency-based DNS (Cloudflare)
  Cross-region battles are rare (most battles are in same world instance = same region)
```

**Database scaling path:**

```
Phase 1: Single PostgreSQL container (handles thousands of creatures easily)
Phase 2: Read replicas for dex/lobby queries (Prisma supports read replica routing)
Phase 3: PgBouncer connection pooler (critical when Colyseus instances multiply)
Phase 4: Citus extension for horizontal sharding if > 10M creatures
```

---

### 31.10 Performance Targets and Guarantees

| Metric | Target | How |
|---|---|---|
| Rendering | 60–120fps | Phaser 3 WebGL; no DOM manipulation in game loop |
| World state update latency | < 50ms | Colyseus delta patches; 20 position updates/sec per player |
| Battle turn resolution | < 100ms server-side | Pure TypeScript math; no database writes during turn (committed at end of battle) |
| Lobby load time | < 200ms | Creatures pre-loaded from PostgreSQL at session start; cached in Redis for session duration |
| World chunk delivery | < 20ms | Chunks generated at room creation; served from Colyseus in-memory state |
| Auth callback | < 500ms | Auth.js + PostgreSQL upsert; acceptable for one-time login |
| Concurrent players per world | 100 target | Colyseus schema delta patch keeps bandwidth linear, not quadratic in player count |

**Interest management (critical for 100 players):**  
Colyseus does not broadcast every player's position to every other player. Each client only receives updates for entities within a configurable radius of their character. This is called "interest management" and is built into Colyseus's spatial filter API. At 100 players spread across a large procedural world, each client receives updates for ~10–20 nearby entities at any moment — bandwidth stays flat regardless of world population.

---

### 31.11 What Does NOT Need to be Built

To avoid scope creep, these are explicitly out of scope for the MVP and should not be designed around:

| Non-requirement | Alternative |
|---|---|
| Mobile native app | Phaser 3 runs in mobile browsers; responsive CSS for menus |
| Custom game engine | Phaser 3 is the engine |
| Real-time voice/video | Discord link in lobby is sufficient |
| Custom auth server | Auth.js handles this entirely |
| AI-generated creature art | Sprite sheets with parameterized shader uniforms (appearance_gene → shader); no per-instance image generation |
| NPC trainers | Other players ARE the trainers. Wild battles handle the solo experience. |
| Story/campaign mode | Open world exploration only; no scripted events |

---

### 31.12 Build Order

Following the gameplay and systems spec in §8–§30 (composer, moves, damage pipeline, biomes, UI tiers), add these **implementation** phases:

```
Phase 0 — Foundation (2 weeks)
  Monorepo setup (pnpm workspaces)
  Docker Compose: postgres + redis
  Auth.js + Google OAuth working
  Prisma schema: users, creatures (JSONB payload)
  Landing page (/) + /app route (auth-gated)

Phase 1 — Combat engine (3 weeks)
  packages/combat: full damage pipeline §10 in TypeScript
  packages/combat: unit tests for all 9 stages
  BattleRoom (Colyseus): 1v1 battle, server-authoritative
  BattleScene (Phaser 3): Gen 1 layout, HUD, move grid (8 slots)
  No world yet — battle initiated from test lobby

Phase 2 — World (3 weeks)
  packages/worldgen: simplex noise biome layout + chunk generation
  WorldRoom (Colyseus): player positions, wild spawns, interest management
  WorldScene (Phaser 3): tilemap rendering, player sprites, chunk streaming
  Wild encounter trigger → BattleRoom creation

Phase 3 — Account and persistence (2 weeks)
  Creature persistence: save/load from PostgreSQL
  Dex UI: list owned creatures, inspect, compose
  Composer UI: all 7 panels, live name preview
  Trade system: two-phase commit in PostgreSQL

Phase 4 — Multiplayer polish (2 weeks)
  Lobby: create world, join by code, find friends
  PvP challenge system: challenge → accept → BattleRoom
  Gym system: player-owned location, challenge-anyone trigger

Phase 5 — Scale prep (ongoing)
  Colyseus horizontal scaling with Redis coordination
  Connection pooling (PgBouncer)
  Docker Compose → k3s migration if warranted
  ArgoCD pipeline setup
```

---


*End of Wildloom Master Design Document v2*

**Changelog:**

| Date | Change |
|---|---|
| 2026-05-03 | v1: Full consolidation from all prior partial docs |
| 2026-05-03 | v2: Physics-unified continuous model. Upgraded: affinity vectors replacing CHART₀ as runtime object; full stress-response physics for concussive/piercing/slashing (σ_c, P_pen sigmoid, cohesion model); kinetic/energetic payload split replacing strict strike/surge binary; state-coupled D_eff(u) = D·Π(1−γ·tanh(u_j)); all Layer 2 multipliers upgraded to smooth tanh expressions; stress-response kernels ψ_k fully formalized; 100 species roster (300 creature names) added; complete move frame catalog added; full damage walkthrough updated to reflect new pipeline |
