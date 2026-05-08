// Per-stage unit tests for the §10 damage pipeline.

import { describe, expect, it } from "vitest";

import {
  computeSL,
  stage0_hitResolution,
  stage1_payloadRouting,
  stage2_effectiveDefense,
  stage3_coreSaturation,
  stage4_outcomeBudget,
  stage8_critVariance,
  stage9_apply,
} from "../src/stages";

import {
  makeCombatant,
  makeCreature,
  makeMove,
} from "./fixtures";

describe("stage0_hitResolution", () => {
  it("returns p_hit ∈ [min, max]", () => {
    const att = makeCombatant(makeCreature({ emphasis: { TH: 0.5 } }));
    const def = makeCombatant(makeCreature({ emphasis: { MI: 0.65 } }));
    const move = makeMove({ accuracy: 95 });
    const r = stage0_hitResolution(move, att, def, "0xseed", 1);
    expect(r.p_hit).toBeGreaterThan(0);
    expect(r.p_hit).toBeLessThanOrEqual(0.99);
  });

  it("is deterministic for the same seed", () => {
    const att = makeCombatant(makeCreature({ emphasis: { TH: 0.5 } }));
    const def = makeCombatant(makeCreature({ emphasis: { MI: 0.65 } }));
    const move = makeMove();
    const a = stage0_hitResolution(move, att, def, "seed-1", 1);
    const b = stage0_hitResolution(move, att, def, "seed-1", 1);
    expect(a.hit).toBe(b.hit);
    expect(a.p_hit).toBe(b.p_hit);
  });
});

describe("stage1_payloadRouting", () => {
  it("splits payload according to W_k/W_e", () => {
    const att = makeCombatant(makeCreature({ emphasis: { TH: 1 }, stats: { physical_offense: 100, special_offense: 110 } }));
    const move = makeMove({ kinetic_share: 0.15, base_power: 55 });
    const p = stage1_payloadRouting(move, att);
    expect(p.W_k).toBeCloseTo(0.15);
    expect(p.W_e).toBeCloseTo(0.85);
    // Total payload pre-W is per the formula in stages.ts.
    expect(p.A_k).toBeGreaterThan(0);
    expect(p.A_e).toBeGreaterThan(p.A_k);
  });
});

describe("stage3_coreSaturation", () => {
  it("σ is monotone increasing in A (more attack → more saturation)", () => {
    const att = makeCombatant(makeCreature({ emphasis: { TH: 1 } }));
    const def = makeCombatant(makeCreature({ emphasis: { MI: 1 } }));
    const moveLow = makeMove({ base_power: 30 });
    const moveHi = makeMove({ base_power: 100 });

    const pLow = stage1_payloadRouting(moveLow, att);
    const pHi = stage1_payloadRouting(moveHi, att);

    const dLow = stage2_effectiveDefense(moveLow, def, pLow, 0);
    const dHi = stage2_effectiveDefense(moveHi, def, pHi, 0);

    const sLow = stage3_coreSaturation(pLow, dLow);
    const sHi = stage3_coreSaturation(pHi, dHi);

    expect(sHi.D_core).toBeGreaterThan(sLow.D_core);
  });

  it("σ is bounded in (0, 1)", () => {
    const att = makeCombatant(makeCreature({ emphasis: { TH: 1 } }));
    const def = makeCombatant(makeCreature({ emphasis: { MI: 1 } }));
    const move = makeMove();
    const p = stage1_payloadRouting(move, att);
    const d = stage2_effectiveDefense(move, def, p, 0);
    const s = stage3_coreSaturation(p, d);
    for (const k of [
      "sigma_k_con", "sigma_k_pier", "sigma_k_slas",
      "sigma_e_con", "sigma_e_pier", "sigma_e_slas",
    ] as const) {
      expect(s[k]).toBeGreaterThanOrEqual(0);
      expect(s[k]).toBeLessThan(1);
    }
  });
});

describe("stage4_outcomeBudget", () => {
  it("partitions D_core according to outcome shares", () => {
    const att = makeCombatant(makeCreature({ emphasis: { TH: 1 }, level: 28 }));
    const def = makeCombatant(makeCreature({ emphasis: { MI: 1 }, level: 25 }));
    const move = makeMove({
      endurance_share: 0.6, status_guard_shred_share: 0.2,
      status_delivery_share: 0.1, utility_field_share: 0.1,
      utility_pressure_share: 0.0,
    });
    const S_L = computeSL(att, def);
    const p = stage1_payloadRouting(move, att);
    const d = stage2_effectiveDefense(move, def, p, 0);
    const s = stage3_coreSaturation(p, d, S_L);
    const o = stage4_outcomeBudget(move, s, S_L);
    const total =
      o.stamina_budget + o.status_guard_delta + o.status_amplification +
      o.field_push_budget + o.pressure_budget;
    expect(total).toBeCloseTo(s.D_core, 1);
  });
});

describe("stage8_critVariance", () => {
  it("variance stays within ±3% per scaling_curves", () => {
    for (let i = 0; i < 50; i++) {
      const r = stage8_critVariance(100, `seed-${i}`);
      expect(r.variance).toBeGreaterThanOrEqual(0.97 - 1e-9);
      expect(r.variance).toBeLessThanOrEqual(1.03 + 1e-9);
    }
  });
});

describe("stage9_apply", () => {
  it("floors and clamps to defender s_max", () => {
    expect(stage9_apply(35.7, 200).D_final).toBe(35);
    expect(stage9_apply(99999, 200).stamina_loss).toBe(200);
    expect(stage9_apply(-5, 200).D_final).toBe(0);
  });
});
