import { describe, expect, it } from "vitest";

import { rollAffinityEmphasis, rollCoreStats, spawnCreature } from "../src/spawn";

describe("spawn pipeline", () => {
  it("affinity emphasis sums to ~1", () => {
    const e = rollAffinityEmphasis("volcanic_rift", "seed-1");
    const total = Object.values(e).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1, 3);
  });

  it("core stats are within tier bounds", () => {
    const s = rollCoreStats("rare", 10, "stat-seed");
    for (const v of Object.values(s)) {
      expect(v).toBeGreaterThan(20);
      expect(v).toBeLessThan(2000);
    }
  });

  it("spawn is deterministic from seed", () => {
    const a = spawnCreature({ speciesId: "008", biomeId: "volcanic_rift", seed: "x", level: 10, stage: 1 });
    const b = spawnCreature({ speciesId: "008", biomeId: "volcanic_rift", seed: "x", level: 10, stage: 1 });
    expect(a.affinity_emphasis).toEqual(b.affinity_emphasis);
    expect(a.core_stats).toEqual(b.core_stats);
    expect(a.material_profile).toEqual(b.material_profile);
    // instance_id differs (counter), but moves derived from instance_id will too.
  });

  it("stage 1 produces 4 move slots; stage 3 produces 8", () => {
    const c1 = spawnCreature({ speciesId: "008", biomeId: "volcanic_rift", seed: "x", stage: 1 });
    const c3 = spawnCreature({ speciesId: "008", biomeId: "volcanic_rift", seed: "x", stage: 3 });
    expect(c1.move_instances).toHaveLength(4);
    expect(c3.move_instances).toHaveLength(8);
  });

  it("biome shapes affinity emphasis (volcanic favors TH/PL)", () => {
    let totalTH = 0;
    for (let i = 0; i < 30; i++) {
      const e = rollAffinityEmphasis("volcanic_rift", `iter-${i}`);
      totalTH += e.TH;
    }
    expect(totalTH / 30).toBeGreaterThan(0.20);
  });
});
