# Wildloom — procedural generation & spawn rarity

**Status:** Design spec (implementation hooks — not yet coded). Aligns with [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §1, [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) (creature spawn vs player-authored moves), and [`SPECIES-INSTANCE-EXAMPLES.md`](./SPECIES-INSTANCE-EXAMPLES.md).

**Reference parameters:** [`data/procedural/spawn_model.reference.json`](../data/procedural/spawn_model.reference.json) — versioned knobs; replace with live balance without rewriting prose.

---

## 1. Goals

1. **Biome-conditioned typing:** Wild spawns receive **`biome_id`** in context — rolled **`affinity_emphasis`** is **biased toward that biome's elemental palette** so "what biome you're in" reads as the **prior** for the creature's primary elemental identity (still stochastic; rare off-biome natives possible at low odds).
2. **Neutral-primary possibility:** Some spawns roll **no dominant elemental affinity** (near-flat emphasis / authored neutral simplex) — corresponds to **`p_neutral_primary`** in [`spawn_model.reference.json`](../data/procedural/spawn_model.reference.json); contributes to **rarity / collector** axes alongside aptitude tier.
3. **Secondary chip as rarity axis:** Distinct **secondary** affinity may be **absent** or **present** — `secondary_present_probability` and tier masses jointly define how often dual-chip creatures appear ([`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §1).
4. **Bell-curve aptitude stats:** Nine stats draw from **tier-gated distributions** (truncated normal / Beta-on-bracket) so most individuals cluster **mid spread**, with **low tail** and **high tail** outcomes — rarity tier shifts the whole bracket (**Pokémon-like effective stats**, inspectable percentiles).
5. **Inspectable instances:** Persist **`spawn_roll`** metadata (seed slice, biome, tier, neutral flag, dual-chip flag, percentile snapshot) for UI, trades, trophies.

**Contrast — abilities vs creatures:** **Creatures** receive rolls from **biome + RNG** at spawn. **Moves** are **player-resolved templates** — every hook that can apply to a creature (statuses, accumulators, passive affinity knobs, …) is **authored as selectable bands** on ability templates ([`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md); [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §3).

---

## 2. Spawn pipeline (high level)

```
seed ─► species_line_id (identity / art / cry / dex slot)
     ─► biome_id (overworld / encounter cell — drives affinity priors)
     ─► affinity_roll       → neutral? → if not: biome-weighted primary mass + tail Dirichlet
                             → secondary_present? → chip pair + emphasis reshape
     ─► aptitude_tier_roll → truncated-normal (or Beta) noise on nine stats within tier bracket
     ─► material_roll      → twelve axes (optional correlated rarity — backlog)
     ─► appearance_roll    → genes / lustrous-style flags ([`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §7)
```

**Determinism:** Same `(seed, spawn_context)` ⇒ same instance — replays and audits stay reproducible.

---

## 3. Affinity — biome priors, neutral primary, dual-chip rarity

### 3.1 Combat authority

**Authoritative** values are always:

- Full **`affinity_emphasis`** vector (twelve affinities, sums to `1`), and/or
- Equivalent sparse encoding + normalization step.

**Dex chips** (`primary_affinity`, `secondary_affinity`) are **presentation**:

- **Primary chip:** typically the biome-favored dominant mass — or **omitted / “none”** when neutral-primary roll fires (emphasis below authored prominence threshold).
- **Secondary chip:** optional — see §3.5.

Layer 1 **`m1`** consumes **`affinity_emphasis`** + reshape rules ([`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §5.5), not the species catalog row.

### 3.2 Species catalog is never authoritative

On spawn, **do not read** `species.primary_affinity` / `secondary_affinity` / `affinity_emphasis_hint` for combat. In the shipped catalog those keys are **`null`** or omitted.

### 3.3 Biome as primary prior (not a hard lock)

- Each **`biome_id`** maps to a **weight vector** or **Dirichlet α** over the twelve IDs (see [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) biome catalog when wired).
- Draw **primary elemental identity** from that biased distribution — players learn “volcanic routes skew Thermal,” not “only Thermal exists here.”
- **Rare off-biome** draws remain possible at **small tail mass** (collector thrill).

### 3.4 Neutral-primary (“no elemental hometown”)

With probability **`p_neutral_primary`** ([`spawn_model.reference.json`](../data/procedural/spawn_model.reference.json)):

- Skip biome-peaked draw; emit **near-uniform** emphasis or an authored **neutral simplex** so **no affinity dominates** for Layer 1 collapse.
- Dex may show **blank primary**, “wild-type,” or omniplex copy — **design copy TBD**.
- This stacks with **`aptitude_tier`** and **dual-chip** odds as part of **composite rarity**.

### 3.5 Secondary: present or absent (rarity)

Reference model:

- **`secondary_present_probability`** — probability the creature gets a **distinct secondary chip** at all.
- If absent: UI **`secondary_affinity: null`**; **`affinity_emphasis`** may still carry small tail mass on non-primary IDs.
- If present: draw **`secondary_affinity`** from remaining IDs (see JSON `secondary_given_present_draw`).

Ordered-pair probability sketch (uniform baseline **without** biome skew — use Monte Carlo for real numbers):

| Event | Approx. probability |
|-------|---------------------|
| Primary = *k* (flat twelve-way reference) | \(1/12 \approx 8.33\%\) |
| Ordered pair primary *a*, secondary *b*, *a*≠*b* | \((1/12)(1/11) \approx 0.76\%\) |
| No secondary chip | \(1 - p_{\mathrm{secondary\,present}}\) — see **`spawn_model.reference.json`** |

### 3.6 Drawing `affinity_emphasis`

Two-phase sketch (tunable):

1. **Biome + neutral gate:** If neutral-primary → flat / neutral simplex. Else **inflate mass** on biome-favored ID(s); optionally sample **primary chip** as argmax after noise.
2. **Chip phase:** If secondary present, allocate mass between primary and secondary per rules; remainder is tail.
3. **Tail phase:** Sample tail from **Dirichlet(α)** over remaining affinities.

Exact `α` vectors and biome tables ship in data — blend η from moves remains separate ([`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §3).

---

## 4. Stats — bell-curve aptitudes & rarity tiers (Pokémon analogy)

### 4.1 Layers

| Concept | Pokémon-ish analog | Wildloom sketch |
|---------|-------------------|-----------------|
| Hidden perfection per axis | IV 0–31 | **Tier-gated truncated noise** per stat — bell-shaped within bracket |
| Visible spread | Stat growth / level | **`B(L)`** budget × growth curve ([`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §1, §5) |
| Personality tilt | Nature (+10% / −10%) optional | **`aptitude_tilt`** optional draw — skews two stats ± authored band |
| Glow / trophy | Shiny | **`lustrous`** / gene flags ([`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §7) |

### 4.2 Tiered aptitude + bell curve within tier

1. Roll **`aptitude_tier`** categorical (`common` … `stellar`) using masses in [`spawn_model.reference.json`](../data/procedural/spawn_model.reference.json).
2. **Within tier**, draw each of the **nine stats** from a **truncated normal** (or Beta rescaled to `[low_tier, high_tier]`) so:
   - Most rolls sit near the tier **mean** (fat middle),
   - **Low** and **high** effective values remain possible (tails),
   - **`stellar`** tier widens variance / raises ceiling — “god roll” spawns are rare but explainable.
3. Apply **`f_growth(L)`** and training (**Resonance**) afterward — spawn annotation snapshots **pre-training percentiles** where useful.

**Why not uniform noise only:** Uniform brackets feel **flat**; trainers expect **most mid, some terrible, some blessed** — bell-shaped noise matches that literacy.

### 4.3 Composite rarity (spawn)

**Rarity is multidimensional**, not one scalar:

- **`aptitude_tier`** (stat bracket luck),
- **Neutral-primary** vs biome-fitted elemental,
- **Secondary chip present**,
- **`lustrous` / gene** flags,
- Optional **material tier** (backlog §5).

Surface **transparent odds** per axis in inspect UI where possible ([`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §4).

### 4.4 Percentiles & joint rarity (UI)

For each stat, estimate **empirical percentile** vs spawn population at same **level band** + **ruleset version** + optional **biome stratum** (histogram from Monte Carlo).

**Display:**

- **Per-stat percentile** (0–100): bar chart.
- **`aptitude_floor_percentile`:** minimum across nine stats — “weakest link” strict collectors.
- **`joint_proxy`:** naive independence disclaimer for “~1 in *N*” tooltips; publish honest Monte Carlo for joint tails when balancing.

Example YAML fields: [`data/species/examples/rolled_instances.sample.yaml`](../data/species/examples/rolled_instances.sample.yaml) under `spawn_roll.rarity_annotation`.

---

## 5. Materials (brief)

Same philosophy: roll **twelve axes** in `[0,1]` with optional **material tier** correlated or independent of stat tier — **Open decision:** single rolled “quality” factor scaling all axes vs independent axes (trade collectors vs simulation diversity).

---

## 6. Implementation checklist

| Deliverable | Role |
|-------------|------|
| `spawn_model.reference.json` | Tunable masses — biome priors, **`p_neutral_primary`**, secondary odds, tier masses |
| Biome → affinity prior table | Data-owned α / categorical weights ([`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) biomes) |
| Server `SpawnContext { seed, level_band, biome_id, ruleset_id }` | Deterministic draws |
| Persist `spawn_roll` blob on creature row | Trade / inspect / trophy UI |
| Monte Carlo job | Refresh percentile tables when balance shifts |
| `packages/creatures` (future) | Pure spawn functions shared client/server |

---

## 7. Document changelog

| Date | Change |
|------|--------|
| 2026-05-03 | Biome-conditioned primary affinity, **`p_neutral_primary`**, bell-curve tier stats, composite rarity; contrast creature spawn vs customizable abilities ([`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md)). |
| 2026-05-03 | Initial spec: independent affinity spawn, nullable secondary chip, tiered aptitudes, percentile/rarity annotations |
