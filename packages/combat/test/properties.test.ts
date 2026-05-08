// Property tests — determinism + monotonicity invariants on resolveHit.

import { describe, expect, it } from "vitest";

import { resolveHit } from "../src/resolver";

import { makeCombatant, makeCreature, makeField, makeMove } from "./fixtures";

describe("resolveHit — properties", () => {
  it("is deterministic for the same snapshot + seed", () => {
    const att = makeCombatant(makeCreature({ emphasis: { TH: 0.7, GA: 0.3 }, level: 30 }));
    const def = makeCombatant(makeCreature({ emphasis: { MI: 0.7, CY: 0.3 }, level: 30 }));
    const field = makeField();
    const move = makeMove();
    const seed = "0xdeadbeef";

    const a = resolveHit({ attacker: att, defender: def, field, turn: 1, rng_seed: seed }, move);
    const b = resolveHit({ attacker: att, defender: def, field, turn: 1, rng_seed: seed }, move);

    expect(a.hit).toBe(b.hit);
    expect(a.stamina_loss).toBe(b.stamina_loss);
    expect(a.breakdown.D_final).toBe(b.breakdown.D_final);
  });

  it("higher attacker physical_offense → higher kinetic damage", () => {
    const def = makeCombatant(makeCreature({ emphasis: { MI: 1 }, level: 30 }));
    const field = makeField();
    const move = makeMove({ kinetic_share: 1, base_power: 60 });

    const w = makeCombatant(makeCreature({ emphasis: { TH: 1 }, stats: { physical_offense: 80 } }));
    const s = makeCombatant(makeCreature({ emphasis: { TH: 1 }, stats: { physical_offense: 160 } }));

    const a = resolveHit({ attacker: w, defender: def, field, turn: 1, rng_seed: "x" }, move);
    const b = resolveHit({ attacker: s, defender: def, field, turn: 1, rng_seed: "x" }, move);

    if (a.hit && b.hit) {
      expect(b.breakdown.D_core_kinetic).toBeGreaterThan(a.breakdown.D_core_kinetic);
    }
  });

  it("higher defender physical_mitigation → less kinetic damage", () => {
    const att = makeCombatant(makeCreature({ emphasis: { TH: 1 }, stats: { physical_offense: 130 } }));
    const w = makeCombatant(makeCreature({ emphasis: { MI: 1 }, stats: { physical_mitigation: 80 } }));
    const s = makeCombatant(makeCreature({ emphasis: { MI: 1 }, stats: { physical_mitigation: 200 } }));
    const field = makeField();
    const move = makeMove({ kinetic_share: 1, base_power: 60 });

    const a = resolveHit({ attacker: att, defender: w, field, turn: 1, rng_seed: "x" }, move);
    const b = resolveHit({ attacker: att, defender: s, field, turn: 1, rng_seed: "x" }, move);
    if (a.hit && b.hit) {
      expect(b.breakdown.D_core_kinetic).toBeLessThanOrEqual(a.breakdown.D_core_kinetic);
    }
  });

  it("m1 stays inside [m_min, m_max] regardless of inputs", () => {
    const att = makeCombatant(makeCreature({ emphasis: { TH: 1 } }));
    const def = makeCombatant(makeCreature({ emphasis: { MI: 1 } }));
    const move = makeMove();
    const r = resolveHit({ attacker: att, defender: def, field: makeField(), turn: 1, rng_seed: "x" }, move);
    expect(r.breakdown.m1).toBeGreaterThanOrEqual(0.05);
    expect(r.breakdown.m1).toBeLessThanOrEqual(2.0);
  });
});
