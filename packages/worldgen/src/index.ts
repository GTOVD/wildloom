// @wildloom/worldgen — procedural biome map + chunk streaming.
// See §31.4 of WILDLOOM-MASTER-V2.md.
//
// We treat the world as an infinite tile plane partitioned into 16×16 chunks.
// Biome assignment is derived from a multi-octave simplex noise field at the
// tile granularity; thresholds map continuous noise values to one of the 10
// catalog biomes. A 3-cell blend zone exposes the secondary biome so the
// caller can mix spawn tables / colors near boundaries.

import { createNoise2D } from "simplex-noise";

import { biomes as biomeCatalog } from "@wildloom/data";

export const CHUNK_SIZE = 16;

export interface BiomeBand {
  id: string;
  /// Inclusive lower bound on the elevation noise band.
  minElevation: number;
  /// Inclusive upper bound on the elevation noise band.
  maxElevation: number;
  /// Inclusive lower bound on the moisture noise band.
  minMoisture: number;
  /// Inclusive upper bound on the moisture noise band.
  maxMoisture: number;
}

/// Order matters: highest-priority bands first; the first match wins. The
/// bands are designed to be near-disjoint over the [-1, 1] × [-1, 1] noise
/// square, ensuring a single dominant biome per tile.
export const DEFAULT_BANDS: BiomeBand[] = [
  // Mountain / cave variants at high elevation
  { id: "magma_chamber",     minElevation:  0.55, maxElevation:  1.01, minMoisture: -1.01, maxMoisture: -0.20 },
  { id: "crystalline_cavern", minElevation:  0.55, maxElevation:  1.01, minMoisture: -0.20, maxMoisture:  0.55 },
  { id: "thunderhead_storm",  minElevation:  0.55, maxElevation:  1.01, minMoisture:  0.55, maxMoisture:  1.01 },

  // Mid elevation
  { id: "volcanic_rift",      minElevation:  0.10, maxElevation:  0.55, minMoisture: -1.01, maxMoisture: -0.30 },
  { id: "neutral_arena",      minElevation:  0.10, maxElevation:  0.55, minMoisture: -0.30, maxMoisture:  0.05 },
  { id: "ancient_rainforest", minElevation:  0.10, maxElevation:  0.55, minMoisture:  0.05, maxMoisture:  1.01 },

  // Low elevation
  { id: "tundra_shelf",       minElevation: -1.01, maxElevation:  0.10, minMoisture: -1.01, maxMoisture: -0.20 },
  { id: "prismatic_salt_flat", minElevation: -1.01, maxElevation:  0.10, minMoisture: -0.20, maxMoisture:  0.20 },
  { id: "deep_ocean_trench",  minElevation: -1.01, maxElevation: -0.40, minMoisture:  0.20, maxMoisture:  1.01 },
  { id: "near_vacuum_expanse", minElevation: -0.40, maxElevation:  0.10, minMoisture:  0.20, maxMoisture:  1.01 },
];

const BLEND_RADIUS = 3;

export interface NoiseSample {
  elevation: number;
  moisture: number;
}

export interface TileBiome {
  primary: string;
  /// Adjacent biome whose band edge is within BLEND_RADIUS of this tile.
  secondary?: string;
  /// 0 at primary core, 1 right at the band edge.
  blend: number;
}

export interface Chunk {
  cx: number;
  cy: number;
  size: number;
  /// Row-major: tiles[y][x].
  tiles: TileBiome[][];
}

export interface World {
  seed: string;
  noise: (x: number, y: number) => NoiseSample;
  bands: BiomeBand[];
  /// Cached chunks keyed by `${cx},${cy}`.
  chunks: Map<string, Chunk>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Build a deterministic world from a string seed. Cheap — actual chunk data
/// is generated lazily via `getChunk`.
export function createWorld(seed: string, bands: BiomeBand[] = DEFAULT_BANDS): World {
  const elevationNoise = createNoise2D(mulberry32(hashSeed(seed + "::elevation")));
  const moistureNoise = createNoise2D(mulberry32(hashSeed(seed + "::moisture")));

  const noise = (x: number, y: number): NoiseSample => {
    const e = octaveNoise2(elevationNoise, x, y, /*scale*/ 1 / 96, /*octaves*/ 4, /*persistence*/ 0.5);
    const m = octaveNoise2(moistureNoise, x, y, /*scale*/ 1 / 64, /*octaves*/ 3, /*persistence*/ 0.55);
    return {
      elevation: clamp(e, -1, 1),
      moisture: clamp(m, -1, 1),
    };
  };

  return { seed, noise, bands, chunks: new Map() };
}

export function getChunk(world: World, cx: number, cy: number): Chunk {
  const key = `${cx},${cy}`;
  const cached = world.chunks.get(key);
  if (cached) return cached;

  const tiles: TileBiome[][] = [];
  for (let ty = 0; ty < CHUNK_SIZE; ty++) {
    const row: TileBiome[] = [];
    for (let tx = 0; tx < CHUNK_SIZE; tx++) {
      const wx = cx * CHUNK_SIZE + tx;
      const wy = cy * CHUNK_SIZE + ty;
      row.push(tileAt(world, wx, wy));
    }
    tiles.push(row);
  }
  const chunk: Chunk = { cx, cy, size: CHUNK_SIZE, tiles };
  world.chunks.set(key, chunk);
  return chunk;
}

/// Resolve the biome for a single world-space tile, with blend metadata.
export function tileAt(world: World, wx: number, wy: number): TileBiome {
  const sample = world.noise(wx, wy);
  const primary = bandFor(world.bands, sample.elevation, sample.moisture);

  // Probe nearby tiles to detect a different dominant band — this reveals
  // the blend zone radius in tile units.
  let secondary: string | undefined;
  let blend = 0;
  for (let dy = -BLEND_RADIUS; dy <= BLEND_RADIUS; dy++) {
    for (let dx = -BLEND_RADIUS; dx <= BLEND_RADIUS; dx++) {
      if (dx === 0 && dy === 0) continue;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      if (dist > BLEND_RADIUS) continue;
      const s2 = world.noise(wx + dx, wy + dy);
      const cand = bandFor(world.bands, s2.elevation, s2.moisture);
      if (cand !== primary) {
        const candBlend = (BLEND_RADIUS - dist + 1) / (BLEND_RADIUS + 1);
        if (candBlend > blend) {
          blend = candBlend;
          secondary = cand;
        }
      }
    }
  }
  return { primary, secondary, blend };
}

/// Tile colour helper — looks up biome catalog and returns hex.
export function biomeColor(biomeId: string): string {
  const b = (biomeCatalog.biomes as Record<string, { tile_color_hex?: string }>)[biomeId];
  return b?.tile_color_hex ?? "#888888";
}

/// Sample a wild encounter on a tile. Returns null when no encounter triggers.
export function rollWildEncounter(
  world: World,
  wx: number,
  wy: number,
): { biomeId: string; encounter: boolean } {
  const tile = tileAt(world, wx, wy);
  // Encounter rate per biome is read from biomes.json (encounter_rate field).
  const cfg = (biomeCatalog.biomes as Record<string, { encounter_rate?: number }>)[tile.primary];
  const rate = cfg?.encounter_rate ?? 0.08;
  // Deterministic dice from world seed + tile coordinate.
  const r = hash01(`${world.seed}::enc::${wx},${wy}`);
  return { biomeId: tile.primary, encounter: r < rate };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function bandFor(bands: BiomeBand[], elevation: number, moisture: number): string {
  for (const b of bands) {
    if (
      elevation >= b.minElevation && elevation < b.maxElevation &&
      moisture >= b.minMoisture && moisture < b.maxMoisture
    ) return b.id;
  }
  return bands[0]?.id ?? "neutral_arena";
}

function octaveNoise2(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  scale: number,
  octaves: number,
  persistence: number,
): number {
  let total = 0;
  let frequency = scale;
  let amplitude = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    total += noise(x * frequency, y * frequency) * amplitude;
    max += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }
  return total / max;
}

export function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash01(s: string): number {
  return mulberry32(hashSeed(s))();
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export const WORLDGEN_PACKAGE_VERSION = "0.1.0";
