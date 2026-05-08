// @wildloom/combat — full §10 damage pipeline + §11 ψ kernels + §12-§14 layers.

export * from "./math";
export * from "./material";
export * from "./effective_stats";
export * from "./layer1_m1";
export * from "./layer2_rules";
export * from "./layer3_accumulators";
export * from "./stages";
export * from "./resolver";
export * from "./composer/assembleName";

export { psiConcussive } from "./kernels/concussive";
export { piercingResponse } from "./kernels/piercing";
export { psiSlashing } from "./kernels/slashing";
export { resistKernel } from "./kernels/resist";

export const COMBAT_PACKAGE_VERSION = "0.1.0";
