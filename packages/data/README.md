# @wildloom/data

Balance data artifacts for Wildloom. See §26 of [`docs/WILDLOOM-MASTER-V2.md`](../../docs/WILDLOOM-MASTER-V2.md).

## Format

The master doc lists some artifacts as YAML and others as JSON. This package
ships **everything as JSON** — it removes the runtime YAML parser dependency
and lets the bundler import data directly via `import x from "./x.json"`.

This is a small SPEC-DEVIATION from §26's filename suffixes; semantic content
is identical.

## Files

| File | Source section |
|---|---|
| `affinity_chart_chart0.json` | §7.3 |
| `affinity_vectors.json` | §7.3 (calibrated; regenerate via `pnpm calibrate:affinities`) |
| `scaling_curves.json` | §10–§12 |
| `accumulators.json` | §14 |
| `status_conditions.json` | §15 |
| `material_axes.json` | §5 |
| `combos.json` | §22 |
| `biomes.json` | §21 |
| `stances.json` | §17 |
| `growth_curves.json` | §23 |
| `encounter_tiers.json` | §3.2 step 2 |
| `affinity_stress_kernels.json` | §11.4 + §12 |
| `reaction_rules.json` | §13 |
| `frames.json` | Appendix B |
| `species_catalog.json` | Appendix A |

## Re-running the affinity calibration

The affinity vectors are calibrated to CHART₀ via offline NLLS:

```
pnpm calibrate:affinities
```

This runs `tools/calibrate-affinities.ts` and rewrites
`packages/data/json/affinity_vectors.json`. Diagonals are excluded from the
loss because unit-vector self-dot is always 1.0; per-affinity self-resist is
captured by the `R_def` kernel in `affinity_stress_kernels.json`. Asymmetric
chart cells (e.g. `GA→AE=2.0` vs `AE→GA=0.75`) cannot be perfectly fit by
symmetric dot products; the fit gets within ±0.5 in most cells, with the
asymmetric residual handled by the attacker-alignment term in §12.
