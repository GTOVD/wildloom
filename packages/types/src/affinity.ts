// Affinity IDs — see §6 of WILDLOOM-MASTER-V2.md

export const AFFINITY_IDS = [
  "TH", // Thermal
  "CY", // Cryo
  "AQ", // Aqueous
  "GA", // Galvanic
  "MI", // Mineral
  "FL", // Flora
  "AE", // Aero
  "LU", // Luminous
  "VO", // Void
  "SO", // Sonic
  "CR", // Corrosive
  "PL", // Plasmic
] as const;

export type AffinityID = (typeof AFFINITY_IDS)[number];

/// MVP-shipped affinities. Engine supports all 12; spawn tables seed only these in MVP.
export const MVP_AFFINITY_IDS: readonly AffinityID[] = [
  "TH",
  "CY",
  "AQ",
  "GA",
  "MI",
  "FL",
  "AE",
  "LU",
  "VO",
];

export const AFFINITY_DISPLAY_NAME: Record<AffinityID, string> = {
  TH: "Thermal",
  CY: "Cryo",
  AQ: "Aqueous",
  GA: "Galvanic",
  MI: "Mineral",
  FL: "Flora",
  AE: "Aero",
  LU: "Luminous",
  VO: "Void",
  SO: "Sonic",
  CR: "Corrosive",
  PL: "Plasmic",
};

/// Used for placeholder visualizations (per-affinity colored circles).
export const AFFINITY_COLOR_HEX: Record<AffinityID, string> = {
  TH: "#ff6b3d", // orange-red
  CY: "#7ec8e3", // pale blue
  AQ: "#1f78d1", // deep blue
  GA: "#f4d03f", // yellow
  MI: "#8b6f47", // brown
  FL: "#3c9a4a", // green
  AE: "#cfd8dc", // pale grey
  LU: "#fff7a6", // pale yellow-white
  VO: "#3a1f5e", // deep violet
  SO: "#b066d6", // purple
  CR: "#9aff66", // acid green
  PL: "#ff4d8b", // hot pink
};

export type AffinityVector = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
];

/// Stress-response modality routing (kinetic OR energetic delivery).
/// Components must be ≥0 and sum to 1 (simplex).
export interface ModalityWeights {
  concussive: number;
  piercing: number;
  slashing: number;
}

/// 12 axes per §5.
export interface MaterialProfile {
  thermal_mass: number;
  conductivity: number;
  rigidity: number;
  porosity: number;
  polarity: number;
  density: number;
  elasticity: number;
  reflectivity: number;
  acoustic_impedance: number;
  chemical_reactivity: number;
  magnetization: number;
  permeability: number;
}

export const MATERIAL_AXES: readonly (keyof MaterialProfile)[] = [
  "thermal_mass",
  "conductivity",
  "rigidity",
  "porosity",
  "polarity",
  "density",
  "elasticity",
  "reflectivity",
  "acoustic_impedance",
  "chemical_reactivity",
  "magnetization",
  "permeability",
];
