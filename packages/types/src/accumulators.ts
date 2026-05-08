// Layer 3 accumulators (§14)

export const ACCUMULATOR_KEYS = [
  "fracture",
  "heat_load",
  "wetness",
  "concussion",
  "laceration",
  "charge_buildup",
  "cryo_load",
  "corrosion",
  "radiation",
  "sonic_stress",
  "ionization",
  "magnetic_flux",
  "compression",
  "bio_resonance",
] as const;

export type AccumulatorKey = (typeof ACCUMULATOR_KEYS)[number];

export type AccumulatorVector = Record<AccumulatorKey, number>;

export const MVP_ACCUMULATOR_KEYS: readonly AccumulatorKey[] = [
  "fracture",
  "heat_load",
  "wetness",
  "concussion",
  "laceration",
  "charge_buildup",
];

export function emptyAccumulators(): AccumulatorVector {
  return {
    fracture: 0,
    heat_load: 0,
    wetness: 0,
    concussion: 0,
    laceration: 0,
    charge_buildup: 0,
    cryo_load: 0,
    corrosion: 0,
    radiation: 0,
    sonic_stress: 0,
    ionization: 0,
    magnetic_flux: 0,
    compression: 0,
    bio_resonance: 0,
  };
}
