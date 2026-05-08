import { describe, expect, it } from "vitest";

import {
  CHUNK_SIZE,
  createWorld,
  getChunk,
  rollWildEncounter,
  tileAt,
} from "../src/index";

describe("worldgen", () => {
  it("is deterministic by seed", () => {
    const a = createWorld("alpha");
    const b = createWorld("alpha");
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        expect(tileAt(a, x, y).primary).toBe(tileAt(b, x, y).primary);
      }
    }
  });

  it("produces 16x16 chunks", () => {
    const w = createWorld("seed");
    const chunk = getChunk(w, 0, 0);
    expect(chunk.size).toBe(CHUNK_SIZE);
    expect(chunk.tiles).toHaveLength(CHUNK_SIZE);
    for (const row of chunk.tiles) {
      expect(row).toHaveLength(CHUNK_SIZE);
    }
  });

  it("uses multiple biomes across a sample window", () => {
    const w = createWorld("variety");
    const seen = new Set<string>();
    for (let x = -32; x < 32; x++) {
      for (let y = -32; y < 32; y++) {
        seen.add(tileAt(w, x, y).primary);
      }
    }
    expect(seen.size).toBeGreaterThan(2);
  });

  it("rolls deterministic wild encounters", () => {
    const w = createWorld("encounters");
    const r1 = rollWildEncounter(w, 4, 7);
    const r2 = rollWildEncounter(w, 4, 7);
    expect(r1.biomeId).toBe(r2.biomeId);
    expect(r1.encounter).toBe(r2.encounter);
  });
});
