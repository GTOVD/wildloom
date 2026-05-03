# Attack template catalog (player-composable moves)

**Authoritative list of move *frames*:** [`data/moves/attack_templates.catalog.json`](../data/moves/attack_templates.catalog.json) — one row per frame (`template_id`, short **`display_name`** like **Blast** / **Slam**, `category`, default `damage_kind`, and **`customization`** bounds).

There is **no** separate “abilities catalog” with hundreds of pre-filled rows. A row here does **not** include Plasmic, Cryo, or any affinity until a player (or resolver) **assigns** them within the documented ranges.

**Affinity vocabulary (allowed elemental IDs):** [`data/moves/affinity_ids.json`](../data/moves/affinity_ids.json) (twelve strings; same enum as [`data/species/species.schema.json`](../data/species/species.schema.json)).

**Schema sketch:** [`data/moves/attack_template.schema.json`](../data/moves/attack_template.schema.json).

---

## What the player configures (every template)

| Dimension | Player control |
|-----------|----------------|
| **Primary affinity** | **`null`** or **any ID** from `affinity_ids.json` — optional chart key / infusion palette; **`null`** ⇒ non-elemental baseline (neutral Layer 1 multiplier in resolver stub until emphasis vectors extend). |
| **Secondary affinity** | **`null`** or a **different** ID when fusion is desired |
| **Blend η** | When secondary is set, slider `blend_eta` ∈ template `[min,max]` splits weights between primary and secondary |
| **`affinity_weights`** | Defaults from η plus vertex rule; **`advanced_simplex_tail`** templates allow spreading ε across other affinities in an advanced editor ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §3). Fully editable within authored normalization rules. |
| **`base_power` / `pierce` / `accuracy`** | Continuous sliders inside template **min/max/step** |
| **`strike_modalities` ω** | **Strikes:** concussive / piercing / slashing ranges → UI renormalizes to sum **1** ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §5.4b). |
| **`delivery_modalities` ω** | **Surges** (Blast, Lance, …): same ω simplex — splits how the hit couples to blunt vs pierce vs slash **into special mitigation**, alongside the global **`pierce`** scalar (per-channel armor bypass §5.4b). Lets a Blast read as needle beam vs shockwave vs slashy arc per player. |
| **`cooldown_scaling`** | Every template: **`min_turns`** … **`max_turns`** mapped linearly from **`base_power`** slider within that frame’s band — higher power ⇒ longer cooldown (anti-spam). Hydrate **`Move.cooldown_turns`** via **`resolveCooldownTurnsFromPower`** ([`packages/combat`](../packages/combat/README.md)). |
| **`infusion_coeffs`** | Per-template knobs — each has numeric bounds |

**`damage_kind`** for resolved combat payloads follows **`damage_kind_default`** on the template (`endurance`, `status`, `utility`) unless extended pipelines remap it.

Flavor titles (**Thermal blast**, **Void spike**) are **generated labels** from chosen affinities + template — they are not authored rows in JSON.

---

## Status effects, accumulators, passive hooks (planned hydration)

**Design rule:** Combat hooks that apply to **creatures** — DoTs, disables, Layer 3 buildup, passive affinity shaping — must also be **selectable on abilities** within authored envelopes. Wild instances get these from **spawn / traits / field**; players get them from **template slots + tuning budgets** — same resolver vocabulary, different acquisition ([`GAMEPLAY-SYSTEMS.md`](./GAMEPLAY-SYSTEMS.md) §1.3).

| Slot (conceptual) | Player control | Bounded by |
|-------------------|----------------|------------|
| **Status payloads** | Pick proc lane (`on_hit`, `on_crit`, `channel_tick`, `self`, `target`), effect id, duration subticks, potency, stacking rule ref | Per-template **status budget** + catalog caps (`status_catalog` — [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §9) |
| **Accumulator impulses** | Structured Δ on `heat_load`, `wetness`, `fracture`, `corrosion`, … tied to hit events | Impulse magnitude bands + compatibility with move frame ([`GAMEPLAY-SYSTEMS.md`](./GAMEPLAY-SYSTEMS.md) §2.1) |
| **Passive affinity / shell** | Optional **`passive_affinity_emphasis`** or stance coupling on a **passive shell** bound to the slot | Simplex normalization + intensity caps matching creature passive rules |

**Hydration:** [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §3 names **`status_payloads`**, **`accumulator_impulses`**, **`passive_hooks`** on resolved `Move` payloads; extend **`attack_template.schema.json`** and catalog rows with parallel **`customization`** bands for each family. **Ordering** with strike modality blend and saturation pipeline stays as in COMBAT §5 — effects fire from the same scheduled phases as trait-driven ticks where applicable.

**Economy:** Raising damage or status throughput competes for the same **loadout budget** as infusion knobs and modalities ([Bounds vs balance](#bounds-vs-balance--why-drag-everything-to-max-is-not-the-whole-story) below).

---

## Bounds vs balance — why “drag everything to max” is not the whole story

**Template `min`/`max` only answers:** “If this move is allowed into combat at all, what numbers are valid?” They do **not** mean every player can assign **max on every knob on every slot for free.**

At runtime / persistence, legal builds still need **economy and validation** layered on top (exact numbers are balance-owned):

| Mechanism | Role |
|-----------|------|
| **Loadout / tuning budget** | Each equipped move (or each customization session) spends from a finite budget — raising **`base_power`** leaves fewer points for **`pierce`**, **`accuracy`**, **`infusion_coeffs`**, modality emphasis, **status slots**, **accumulator impulses**, **passive shell** intensity, etc. Server rejects over-budget payloads. |
| **Meta costs** | Using a “fully juiced” variant can cost more **stamina / tempo / cooldown** (template **`cooldown_scaling`** grows with **`base_power`**), **Resonance**, etc. ([`GAMEPLAY-SYSTEMS.md`](./GAMEPLAY-SYSTEMS.md); [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §1). |
| **Trade-offs in data (optional)** | Future authoring can add explicit **couplings** (e.g. power vs accuracy ceilings within the same template) so the envelope is not a flat rectangle of independent maxes. |
| **Combat saturation** | Even high **`base_power`** faces diminishing returns through **`σ`** / saturation in the damage pipeline ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §5), so outcome is not linear in “always pick max.” |

So: **nothing “hidden” in `attack_templates.catalog.json` stops someone from choosing max in a vacuum** — that file is not the economy layer. **Products do:** budgets, costs, server-side legality checks, and tuning so peak numbers compete with accuracy, tempo, and defensive responses rather than strictly dominating.

---

## Three layers

1. **Vocabulary** — twelve elemental IDs (expandable in design docs).
2. **Template** — frame ID + numeric bands + affinity-slot rules; `example_builds` are **illustrative payloads**, not the authoritative definition.
3. **Resolved instance** — concrete assignment (affinities, η, weights, sliders, plus planned **status / accumulator / passive** payloads) persisted per creature/move slot — what combat consumes ([`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §3).

**Hydrating `packages/combat` `Move`:** set **`affinity`** only when the player picks an elemental chart key; omit or leave unset for non-elemental builds. Populate **`strike_modalities`** (strikes) or **`delivery_modalities`** (surges); **`cooldown_turns`** from **`resolveCooldownTurnsFromPower(base_power, template.base_power range, template.cooldown_scaling)`** ([`packages/combat`](../packages/combat/README.md)). When implemented, merge **`status_payloads`**, **`accumulator_impulses`**, **`passive_hooks`** from the resolved build ([Status effects, accumulators, passive hooks](#status-effects-accumulators-passive-hooks-planned-hydration)).

**Resolver contract:** Resolved instances must match [`COMBAT-MODEL.md`](./COMBAT-MODEL.md) §3. Today’s `Move` type implements **strike / surge / true**; templates tagged `field`, `channel`, or `reactive` include `mvp_resolver_note` for the extended pipeline in [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) §5.

---

## Template families in the JSON

- **Surge:** `surge_blast`, `surge_lance`, `surge_burst`, `surge_siphon`, `surge_prism`, `surge_noiseburst`, `surge_voidcollapse` — special-offense saturation path.
- **Strike:** `strike_slam`, `strike_thrust`, `strike_rend`, `strike_tempered`, `strike_gale_drive` — physical-offense path + modality ω where present.
- **True:** `true_spike` — bypass path.
- **Extended:** `field_gradient_seed`, `channel_focus_bridge`, `reactive_parried_arc` — utility / scheduling / counter shells.

---

## Versioning

Bump **`schema_version`** in `attack_templates.catalog.json` when breaking customization slots or changing `blend_eta` semantics. Adding **status**, **accumulator impulse**, or **passive shell** bands counts as a breaking catalog change until backward-compat defaults are defined.
