# Attack template catalog (player-composable moves)

**Data:** [`data/moves/attack_templates.catalog.json`](../data/moves/attack_templates.catalog.json) — frames players customize.  
**Affinity vocabulary:** [`data/moves/affinity_ids.json`](../data/moves/affinity_ids.json) (twelve IDs, matches [`data/species/species.schema.json`](../data/species/species.schema.json)).  
**Schema sketch:** [`data/moves/attack_template.schema.json`](../data/moves/attack_template.schema.json).

**Resolver contract:** Resolved instances must match [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §3 (`category`, `affinity`, optional `affinity_weights`, `strike_modalities`, `pierce`, `infusion_coeffs`, …). Today’s [`packages/combat`](../packages/combat/README.md) `Move` type implements the **strike / surge / true** slice; templates tagged `field`, `channel`, or `reactive` include `mvp_resolver_note` for the extended pipeline in [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §5.

---

## Customization dimensions (every template)

| Dimension | Player control |
|-----------|----------------|
| **Primary affinity** | Required — drives chart key `affinity`, dominant fusion flavor, Layer 2 tags. |
| **Secondary affinity** | Optional **`null`** — omit for single-type builds; must differ from primary when set. |
| **Blend mass η** | When secondary is set, slider `blend_eta` ∈ authored `[min,max]` splits weights between primary and secondary (see below). |
| **`affinity_weights`** | Default rule: secondary **`null`** ⇒ vertex `{primary: 1}`; secondary set ⇒ `{primary: 1−η, secondary: η}`. Advanced UI may open a **simplex tail** (small ε spread across other affinities) when `advanced_simplex_tail: true`. |
| **`base_power` / `pierce` / `accuracy`** | Bounded sliders per template (accuracy optional → treat as auto-hit when omitted). |
| **`strike_modalities` ω** | Strikes only — concussive / piercing / slashing weights renormalized to sum **1** ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §5.4b). |
| **`infusion_coeffs`** | Per-template continuous knobs (tag pressure, DoT primes, field duration, channel ticks, …). |

Display names such as **“Thermal blast”** are **generated** from template + chosen affinities + infusions — mechanics depend on weights and stats, not on the label ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §3).

---

## Template families in the JSON

- **Surge:** `surge_blast`, `surge_lance`, `surge_burst`, `surge_siphon`, `surge_prism`, `surge_noiseburst`, `surge_voidcollapse` — special-offense saturation path; rich pierce / accuracy / infusion tuning.
- **Strike:** `strike_slam`, `strike_thrust`, `strike_rend`, `strike_tempered`, `strike_gale_drive` — physical-offense path + modality ω sliders where applicable.
- **True:** `true_spike` — bypass path; narrow numeric customization; affinities still gate predicates.
- **Extended:** `field_gradient_seed`, `channel_focus_bridge`, `reactive_parried_arc` — utility / scheduling / counter shells (`damage_kind_default` + notes).

Each entry includes **`example_builds`** illustrating composed payloads for UX mocks and balance fixtures.

---

## Versioning

Bump **`schema_version`** in `attack_templates.catalog.json` when adding breaking slot keys or changing semantic of `blend_eta`.
