// Layer 3 accumulator integrator + impulse application.

import { describe, expect, it } from "vitest";

import { applyImpulse, integrateTurn } from "../src/layer3_accumulators";

import { makeCombatant, makeCreature, makeField } from "./fixtures";

describe("layer 3 — applyImpulse", () => {
  it("clamps to [u_min, u_max] of the registry", () => {
    const c = makeCombatant(makeCreature({ emphasis: { MI: 1 } }));
    const delta = applyImpulse(c.accumulators, "fracture", 5.0, 100);
    expect(c.accumulators.fracture).toBeLessThanOrEqual(1.0);
    expect(delta).toBeGreaterThan(0);
  });

  it("scales by attacker coupling stat", () => {
    const c1 = makeCombatant(makeCreature({ emphasis: { MI: 1 } }));
    const c2 = makeCombatant(makeCreature({ emphasis: { MI: 1 } }));
    const d1 = applyImpulse(c1.accumulators, "fracture", 0.10, 50);
    const d2 = applyImpulse(c2.accumulators, "fracture", 0.10, 200);
    expect(d2).toBeGreaterThan(d1);
  });
});

describe("integrateTurn", () => {
  it("decays accumulators toward zero with no impulses", () => {
    const c = makeCombatant(makeCreature({ emphasis: { MI: 1 } }));
    c.accumulators.fracture = 0.5;
    integrateTurn(c, makeField());
    expect(c.accumulators.fracture).toBeLessThanOrEqual(0.5);
  });

  it("triggers fracture status when fracture crosses 0.75", () => {
    const c = makeCombatant(makeCreature({ emphasis: { MI: 1 } }));
    c.accumulators.fracture = 0.85; // above threshold even after one turn of decay
    const evts = integrateTurn(c, makeField());
    expect(evts.triggered_statuses).toContain("fractured");
  });
});
