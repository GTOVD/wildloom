# Wildloom — procedural generation & spawn rarity

**Status:** Design spec (implementation hooks into encounter / hatch / trade mint — not yet coded). Aligns with [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §1 (*no species-fixed typing or stats*), [`GAMEPLAY-SYSTEMS.md`](./GAMEPLAY-SYSTEMS.md) §4, and [`SPECIES-INSTANCE-EXAMPLES.md`](./SPECIES-INSTANCE-EXAMPLES.md).

**Reference parameters:** [`data/procedural/spawn_model.reference.json`](../data/procedural/spawn_model.reference.json) — versioned knobs; replace with live balance without rewriting prose.

---

## 1. Goals

1. **Spawn typing independent of catalog:** Any instance can roll **any** primary affinity, **any** secondary affinity, or **no secondary** — regardless of `catalog.json`’s dex hints ([`data/species/catalog.json`](../data/species/catalog.json)).
2. **Pokémon-flavored rarity:** Stats (and optionally materials) sit on a **low→high** spectrum with **transparent odds** — players can see “how lucky” a spawn was without hidden IVs.
3. **Inspectable instances:** Each saved creature carries enough metadata to reconstruct **approximate rarity labels** (tier + human-readable fractions) for UI / trades / trophies.

---

## 2. Spawn pipeline (high level)

```
seed ─► species_line_id (identity / art / cry / dex slot)
     ─► optional biome_bias (weights only — never hard-locks typing)
     ─► affinity_typing_roll   → primary_affinity?, secondary_affinity?, affinity_emphasis (simplex)
     ─► aptitude_roll         → nine stats within level bracket + rarity tier noise
     ─► material_roll          → twelve axes (optional correlated rarity — backlog)
     ─► appearance_roll       → genes / lustrous-style flags (existing TECH §7)
```

**Determinism:** Same `(seed, spawn_context)` ⇒ same instance — replays and audits stay reproducible.

---

## 3. Affinity & dual-chip rules

### 3.1 Combat authority

**Authoritative** values are always:

- Full **`affinity_emphasis`** vector (twelve affinities, sums to `1`), and/or
- Equivalent sparse encoding + normalization step.

**Dex chips** (`primary_affinity`, `secondary_affinity`) are **presentation**:

- **Primary chip:** affinity with largest emphasis after roll (or tied-break by seeded order).
- **Secondary chip:** optional — see §3.3.

Layer 1 **`m1`** consumes **`affinity_emphasis`** + reshape rules ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §5.5), not the catalog row.

### 3.2 Independent of catalog

On spawn, **do not read** `species.primary_affinity` / `secondary_affinity` / `affinity_emphasis_hint` for combat. In the shipped catalog those keys are **`null`** or omitted—never authoritative.

Optional **biome bias:** multiply Dirichlet `α` or categorical weights (e.g. more Thermal weight in volcanic rooms) — still allows any affinity at low probability.

### 3.3 Secondary: present or absent

Reference model (`spawn_model.reference.json`):

- **`p_secondary_present`** — probability the creature gets a **distinct secondary chip** at all.
- If absent: set `secondary_affinity: null` in UI; **`affinity_emphasis`** still assigns small mass to non-primary affinities (no pure one-hot unless authored event).
- If present: draw **`secondary_affinity`** uniformly from the **remaining eleven** IDs (ordered pair `(primary, secondary)`).

**Approximate probabilities (uniform 12, no biome bias):**

| Event | Approx. probability |
|-------|---------------------|
| Primary = *k* (any fixed affinity) | \(1/12 \approx 8.33\%\) |
| Ordered pair primary *a*, secondary *b*, *a*≠*b* | \((1/12)(1/11) \approx 0.76\%\) |
| No secondary chip | \(1 - p_{\mathrm{secondary\,present}}\) (reference default **0.35**) |

Unordered dual-chip odds differ by combinatorics — document **ordered** for clarity.

### 3.4 Drawing `affinity_emphasis`

Two-phase sketch (tunable):

1. **Chip phase:** Fix **large** mass on primary (+ secondary mass if present); remainder is “tail.”
2. **Tail phase:** Sample tail from **Dirichlet(α)** over remaining affinities so tails are smooth and pedagogically interpretable.

Exact `α` vectors ship in data — [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §2 blend η stays relevant for defender dual emphasis.

---

## 4. Stats: low → high & rarity (Pokémon analogy)

### 4.1 Layers

| Concept | Pokémon-ish analog | Wildloom sketch |
|---------|-------------------|-----------------|
| Hidden perfection per axis | IV 0–31 | **Aptitude noise** per stat within a bracket |
| Visible spread | Stat growth / level | **`B(L)`** budget × growth curve ([`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §1, §5) |
| Personality tilt | Nature (+10% / −10%) optional | **`aptitude_tilt`** optional draw — skews two stats ± authored band |
| Glow / trophy | Shiny | **`lustrous`** / gene flags ([`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §7) |

### 4.2 Tiered aptitude (reference)

Instead of one uniform draw across the whole bracket:

1. Roll **`aptitude_tier`** from a categorical distribution (`common` / `uncommon` / `rare` / `epic` / `stellar`) with authored masses summing to `1`.
2. Inside tier, draw **nine stats** using bounded uniforms or truncated normals — **narrower tiers = tighter highs/lows**.
3. Apply **`f_growth(L)`** and training (`Resonance`) as today — rarity annotates **spawn aptitude**, not final competitive snapshot after grind.

This mimics “most catches are mid; god rolls exist but measurable.”

### 4.3 Percentiles & joint rarity (UI)

For each stat, estimate **empirical percentile** vs spawn population at same **level band** + **ruleset version** (histogram from Monte Carlo or analytic approximation).

**Display:**

- **Per-stat percentile** (0–100): easy bar chart.
- **`aptitude_floor_percentile`:** minimum across nine stats — “weakest link” rarity (strict collectors).
- **`joint_proxy`:** product of decile masses under naive independence — **not** accurate but ok for “~1 in *N*” tooltip disclaimer; real joint needs histogram.

Example YAML fields: [`data/species/examples/rolled_instances.sample.yaml`](../data/species/examples/rolled_instances.sample.yaml) under `spawn_roll.rarity_annotation`.

---

## 5. Materials (brief)

Same philosophy: roll **twelve axes** in `[0,1]` with optional **material tier** correlated or independent of stat tier — **Open decision:** single rolled “quality” factor scaling all axes vs independent axes (trade collectors vs simulation diversity).

---

## 6. Implementation checklist

| Deliverable | Role |
|-------------|------|
| `spawn_model.reference.json` | Tunable masses / defaults |
| Server `SpawnContext { seed, level_band, biome_id?, ruleset_id }` | Deterministic draws |
| Persist `spawn_roll` blob on creature row | Trade / inspect / trophy UI |
| Monte Carlo job | Refresh percentile tables when balance shifts |
| `packages/creatures` (future) | Pure spawn functions shared client/server |

---

## 7. Document changelog

| Date | Change |
|------|--------|
| 2026-05-03 | Initial spec: independent affinity spawn, nullable secondary chip, tiered aptitudes, percentile/rarity annotations |
