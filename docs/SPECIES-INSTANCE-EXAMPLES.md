# Species catalog → procedural instances (examples)

**Companion:** [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §1 & §5 (**no species-fixed stats**), [`GAMEPLAY-SYSTEMS.md`](./GAMEPLAY-SYSTEMS.md) §§1–4 (twelve affinities, rolled aptitudes, Resonance), [`PROCEDURAL-GENERATION.md`](./PROCEDURAL-GENERATION.md) (spawn typing independent of catalog, aptitude tiers, rarity odds), [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §§3–4 (nine stats, twelve material axes).

[`data/species/catalog.json`](../data/species/catalog.json) lists **100 species lines**: display names, three stages, habitat string. **`primary_affinity`**, **`secondary_affinity`**, and **`affinity_emphasis_hint`** are **optional** — the generated catalog keeps **`null`** typing on the row so nothing reads as “this species is Thermal.” **Combat authority** is always the **instance**: rolled **`affinity_emphasis`** (none / one / two dominant IDs as collapsed UI allows), stats, and materials.

---

## 1. What rolls per instance (authoritative slice)

| Slice | Source | Notes |
|-------|--------|--------|
| **Identity** | `species_line_id`, stage, optional spawn **`habitat_tag`** | Art, cry, dex slot — **not** stat formulas |
| **Level → `B(L)`** | [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §1 | Same budget function at `L` |
| **Nine stats** | Single rolled aptitude vector (+ training) | [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §3 — schema ids: **`stamina`**, **`physical_offense`**, **`physical_mitigation`**, **`special_offense`**, **`special_mitigation`**, **`initiative`**, **`precision`**, **`recovery`**, **`coupling`** |
| **`affinity_emphasis`** | Full simplex over affinity IDs (twelve when enabled) | Combat typing for **`m1`** reshape; catalog hint optional |
| **`primary_affinity` / `secondary_affinity`** | UI collapse (e.g. two largest weights), not a second math system | Examples below show plausible dex chips **alongside** the real vector |
| **Material profile** | Twelve axes `[0, 1]` | Layers 2–3 + partial Layer 1 coupling |
| **Moves / abilities** | Pools gated by rolled build | Soft gates only |

### Why stats look like “whole numbers” but materials look like “ratios”

They **are** different quantities:

- **`stats`** — all nine live in the **same combat-budget family** (effective ratings after level curve). Fixtures use **integers** for readability; the resolver may still use floats after modifiers ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §2.1, §8).
- **`affinity_emphasis`** — **composition**: weights **≥ 0** that **sum to 1** across affinities (a simplex). Not comparable to “+71 **`physical_offense`**.”
- **`material_profile`** — **normalized material axes** in **`[0, 1]`** for physics-flavored predicates ([`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §4). Again, not the same unit as stamina.

Layer 1 **`m1`** uses **`CHART₀`** inside dynamic reshape ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §5.5); matchup feel follows **`affinity_emphasis`**, not the catalog dex row.

---

## 2. Four tortoise rolls @ level 52

Illustrative **`ash_mantle`** instances (same dex identity fields; **different** rolls). Each YAML block includes **`identity`** (line, stages, habitat tag), **`typing`** (`primary_affinity`, `secondary_affinity`, **full** `affinity_emphasis`), **`stats`** (nine in one object), **`material_profile`**.

### Nine stats (same scale — budget units)

| Roll | stamina | physical_offense | physical_mitigation | special_offense | special_mitigation | initiative | precision | recovery | coupling |
|------|--------:|----------------:|-------------------:|----------------:|-------------------:|-----------:|----------:|---------:|---------:|
| **Caldera** | 141 | 71 | **127** | 51 | 76 | **36** | 31 | **56** | 24 |
| **Mossback grazer** | 118 | 54 | 86 | **84** | **88** | **64** | **50** | 47 | 28 |
| **Rimeplate wanderer** | 131 | 74 | 108 | 66 | 80 | 43 | 40 | 52 | 28 |
| **Echo-shell sentinel** | **96** | 63 | 94 | **98** | 72 | **71** | **59** | 38 | **32** |

### Dex-style chips + spawn flavor

| Roll | primary | secondary | habitat_tag (spawn) |
|------|---------|-----------|---------------------|
| Caldera | thermal | mineral | volcanic shelves |
| Mossback grazer | flora | aqueous | ancient rainforest |
| Rimeplate wanderer | cryo | mineral | tundra talus |
| Echo-shell sentinel | sonic | mineral | crystalline caverns |

Full **twelve-weight** `affinity_emphasis` objects (sum **1.0**) live in the YAML.

### Material axes (normalized — subset)

| Roll | thermal_mass | rigidity | porosity | acoustic_impedance | permeability |
|------|-------------:|---------:|---------:|-------------------:|-------------:|
| Caldera | **0.84** | **0.89** | 0.14 | **0.83** | **0.09** |
| Mossback grazer | 0.49 | 0.41 | **0.58** | 0.44 | **0.64** |
| Rimeplate wanderer | 0.56 | **0.86** | 0.22 | 0.71 | 0.26 |
| **Echo-shell sentinel** | 0.52 | 0.71 | 0.21 | **0.78** | 0.24 |

---

## 2.5 Spawn rarity annotations (reference math)

The YAML samples attach a **`spawn_roll`** block per instance (authoring-only until the encounter pipeline ships). It records:

- **Affinity branch:** Whether a **secondary dex chip** rolled present (~65% reference) or absent (~35%); when both chips exist, **exact ordered pair** odds follow `p_secondary_present × (1/12) × (1/11)` under a uniform twelve-way primary and distinct secondary draw ([`PROCEDURAL-GENERATION.md`](./PROCEDURAL-GENERATION.md) §3).
- **Stat branch:** **`aptitude_tier_spawn_only_label`** plus **`approximate_probability_exact_tier_spawn_only_mass_reference_table`** from [`data/procedural/spawn_model.reference.json`](../data/procedural/spawn_model.reference.json) (e.g. common ~52%, stellar ~1%).
- **Per-axis readability:** **`population_percentiles_higher_stat_means_higher_percentile`** and **`weakest_axis_percentile`** are illustrative stand-ins for IV-like spreads once Monte Carlo tables exist.

An additional row **`example_primary_only_no_secondary_chip`** in the same YAML shows **`secondary_affinity: null`** with emphasis still spread across the simplex — dual-chip geometry does not apply for that spawn’s dex presentation.

---

## 3. Machine-readable samples

[`data/species/examples/rolled_instances.sample.yaml`](../data/species/examples/rolled_instances.sample.yaml) → **`tortoise_comparison`** (four rolls) and **`example_primary_only_no_secondary_chip`** (null secondary illustration).

Numbers are **balance placeholders** ([`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §16).
