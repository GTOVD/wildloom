#!/usr/bin/env python3
"""Emit data/moves/abilities.catalog.json — 100 named abilities from attack_templates.catalog.json."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES_PATH = ROOT / "data" / "moves" / "attack_templates.catalog.json"
OUT_PATH = ROOT / "data" / "moves" / "abilities.catalog.json"

AFFINITIES = [
    "thermal",
    "cryo",
    "aqueous",
    "galvanic",
    "mineral",
    "flora",
    "aero",
    "luminous",
    "void",
    "sonic",
    "corrosive",
    "plasmic",
]

# Short flavor titles per affinity (rotate through per ability index)
EPITHETS: dict[str, list[str]] = {
    "thermal": ["Cinder", "Ember", "Scald", "Smolder", "Ashfall", "Ignition", "Flashpoint", "Bloomheat"],
    "cryo": ["Rime", "Frost", "Glacial", "Hoarfrost", "Crystalline", "Permafrost", "Bitter", "Slush"],
    "aqueous": ["Brine", "Tidal", "Surge", "Vapor", "Basin", "Current", "Pressure", "Foam"],
    "galvanic": ["Arc", "Static", "Circuit", "Fulminant", "Ion", "Relay", "Spark", "Busbar"],
    "mineral": ["Stratum", "Granite", "Sinter", "Oreline", "Crystal", "Fault", "Shard", "Bedrock"],
    "flora": ["Bloom", "Canopy", "Spore", "Tendril", "Greenheat", "Rootlace", "Pollen", "Mycel"],
    "aero": ["Gale", "Shear", "Vortex", "StratumWind", "Lift", "Jetstream", "Draft", "Cyclone"],
    "luminous": ["Prism", "Gleam", "Radiant", "Beacon", "Photosurge", "Halation", "Glare", "Corona"],
    "void": ["Vacuum", "Pinch", "Collapse", "Singularity", "TidalVoid", "Silence", "Unwind", "Compression"],
    "sonic": ["Resonant", "Oscill", "Wavefront", "Harmonic", "Dissonant", "Echo", "Noise", "Impulse"],
    "corrosive": ["Caustic", "Etch", "Vitriol", "Oxidant", "Fluxbite", "Anode", "Redox", "Eatglass"],
    "plasmic": ["Fusor", "Arcjet", "Torch", "Ionflare", "Magnetic", "Sheath", "Spectral", "Flash"],
}

TEMPLATE_SUFFIX = {
    "surge_blast": "Blast",
    "surge_lance": "Lance",
    "surge_burst": "Burst",
    "surge_siphon": "Siphon",
    "strike_slam": "Slam",
    "strike_thrust": "Thrust",
    "strike_rend": "Rend",
    "strike_tempered": "Temper",
    "true_spike": "Spike",
    "surge_prism": "Prism",
    "surge_noiseburst": "Noiseburst",
    "surge_voidcollapse": "Collapse",
    "strike_gale_drive": "Drive",
}


def _rng01(seed: str) -> float:
    h = hashlib.sha256(seed.encode()).digest()
    return int.from_bytes(h[:8], "big") / (2**64)


def _lin(rng: float, lo: float, hi: float) -> float:
    return lo + rng * (hi - lo)


def _pick_secondary(primary: str, salt: str) -> str | None:
    if _rng01(salt + "|sec") < 0.42:
        return None
    idx = int(_rng01(salt + "|idx") * len(AFFINITIES)) % len(AFFINITIES)
    cand = AFFINITIES[idx]
    return None if cand == primary else cand


def _normalize_mod(c: float, p: float, s: float) -> dict[str, float]:
    t = c + p + s
    if t <= 0:
        return {"concussive": 1.0, "piercing": 0.0, "slashing": 0.0}
    return {"concussive": c / t, "piercing": p / t, "slashing": s / t}


def load_templates() -> list[dict]:
    data = json.loads(TEMPLATES_PATH.read_text(encoding="utf-8"))
    mvp = []
    for t in data["templates"]:
        if t["category"] in ("strike", "surge", "true"):
            mvp.append(t)
    return mvp


def main() -> None:
    templates = load_templates()
    n_tpl = len(templates)
    assert n_tpl == 13
    counts = [8] * 9 + [7] * 4
    assert sum(counts) == 100

    abilities: list[dict] = []
    serial = 0

    for tpl, count in zip(templates, counts):
        tid = tpl["template_id"]
        cat = tpl["category"]
        dk = tpl["damage_kind_default"]
        cust = tpl["customization"]
        bp = cust["base_power"]
        pr = cust["pierce"]
        acc = cust.get("accuracy") or {}
        blend = cust.get("blend_eta") or {}

        for k in range(count):
            serial += 1
            salt = f"{tid}|{k}|{serial}"
            pi = int(_rng01(salt + "|pri") * 12) % 12
            primary = AFFINITIES[pi]
            secondary = _pick_secondary(primary, salt)

            epithets = EPITHETS[primary]
            epithet = epithets[k % len(epithets)]
            suffix = TEMPLATE_SUFFIX[tid]
            display_name = f"{epithet} {suffix}"

            eta = None
            weights: dict[str, float]
            if secondary is None:
                weights = {primary: 1.0}
            else:
                eta_min = blend.get("min", 0.1)
                eta_max = blend.get("max", 0.4)
                eta = round(_lin(_rng01(salt + "|eta"), eta_min, eta_max), 2)
                weights = {primary: round(1.0 - eta, 4), secondary: eta}

            base_power = int(round(_lin(_rng01(salt + "|bp"), bp["min"], bp["max"])))
            pierce = round(_lin(_rng01(salt + "|pr"), pr["min"], pr["max"]), 3)

            accuracy = None
            if acc and "min" in acc and "max" in acc:
                if _rng01(salt + "|accroll") < 0.88:
                    accuracy = int(
                        round(_lin(_rng01(salt + "|acc"), acc["min"], acc["max"]))
                    )

            infusion_coeffs: dict[str, float | int] = {}
            ic = cust.get("infusion_coeffs") or {}
            for key, spec in ic.items():
                lo, hi = spec["min"], spec["max"]
                if isinstance(lo, int) and isinstance(hi, int):
                    infusion_coeffs[key] = int(round(_lin(_rng01(salt + "|" + key), lo, hi)))
                else:
                    infusion_coeffs[key] = round(_lin(_rng01(salt + "|" + key), float(lo), float(hi)), 4)

            modalities = None
            if cat == "strike" and cust.get("strike_modalities"):
                sm = cust["strike_modalities"]
                c0 = _lin(_rng01(salt + "|mc"), sm["concussive"]["min"], sm["concussive"]["max"])
                p0 = _lin(_rng01(salt + "|mp"), sm["piercing"]["min"], sm["piercing"]["max"])
                s0 = _lin(_rng01(salt + "|ms"), sm["slashing"]["min"], sm["slashing"]["max"])
                modalities = _normalize_mod(c0, p0, s0)

            abi_id = f"abi_{serial:03d}_{tid}_{primary}"
            if secondary:
                abi_id += f"_{secondary}"

            tags = sorted({primary, cat, *(tpl.get("suggested_tags") or [])})
            if secondary:
                tags.append(secondary)
            tags = sorted(set(tags))

            abilities.append(
                {
                    "ability_id": abi_id,
                    "display_name": display_name,
                    "template_id": tid,
                    "category": cat,
                    "damage_kind": dk,
                    "primary_affinity": primary,
                    "secondary_affinity": secondary,
                    "affinity_weights": weights,
                    "blend_eta": eta,
                    "base_power": base_power,
                    "pierce": pierce,
                    "accuracy": accuracy,
                    "strike_modalities": modalities,
                    "infusion_coeffs": infusion_coeffs,
                    "tags": tags,
                    "balance_band": "reference_generated_v1",
                }
            )

    doc = {
        "schema_version": "1.0.0",
        "content_note": "100 authored-style abilities generated from attack_templates.catalog.json bounds via scripts/gen_abilities_catalog.py — regenerate; numbers are placeholders until Monte Carlo balance.",
        "ability_count": len(abilities),
        "source_templates_ref": "./attack_templates.catalog.json",
        "abilities": abilities,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(abilities)} abilities to {OUT_PATH}")


if __name__ == "__main__":
    main()
