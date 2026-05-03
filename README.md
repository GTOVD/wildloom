# Wildloom

**Wildloom** is an original multiplayer web game: explore a shared overworld, meet other players, battle, and trade. Creature lines have three growth stages; progression stays strategically viable across stages within tuned brackets despite effectively uncapped levels.

This project is **not affiliated with, endorsed by, or derived from** any third-party monster-collecting franchises. All names, creatures, art, and rules are our own.

## Working name

- **Game title:** Wildloom  
- **Repository:** [github.com/GTOVD/wildloom](https://github.com/GTOVD/wildloom)

## Stack (planned)

TypeScript monorepo: web client + authoritative game server + shared simulation packages.

- **Planning / architecture:** [`docs/TECHNICAL-DESIGN.md`](docs/TECHNICAL-DESIGN.md) (living document until build kickoff)
- **Combat math & endurance pipeline:** [`docs/COMBAT-MODEL.md`](docs/COMBAT-MODEL.md)
- **Composable attacks + 100-ability roster:** [`docs/ATTACK-CATALOG.md`](docs/ATTACK-CATALOG.md) · [`data/moves/`](data/moves/) (`attack_templates.catalog.json`, **`abilities.catalog.json`**)
- **Affinities, field, progression:** [`docs/GAMEPLAY-SYSTEMS.md`](docs/GAMEPLAY-SYSTEMS.md)
- **Expanded design (12 affinities, biomes, combos):** [`docs/DESIGN-SUPPLEMENT.md`](docs/DESIGN-SUPPLEMENT.md)
- **Combat package (TS):** [`packages/combat`](packages/combat/README.md)
- Continuous simulation & pedagogy: [`docs/SIMULATION-AND-PEDAGOGY.md`](docs/SIMULATION-AND-PEDAGOGY.md)
- **Species catalog (100 lines):** [`data/species/catalog.json`](data/species/catalog.json) — **identity** only (names/stages/habitat); twelve affinity IDs on dex cards are **not** combat-authoritative; regenerate with `npm run gen:species`
- **Procedural spawn & rarity (typing + aptitude tiers):** [`docs/PROCEDURAL-GENERATION.md`](docs/PROCEDURAL-GENERATION.md) · reference knobs [`data/procedural/spawn_model.reference.json`](data/procedural/spawn_model.reference.json)
- **Procedural instance examples:** [`docs/SPECIES-INSTANCE-EXAMPLES.md`](docs/SPECIES-INSTANCE-EXAMPLES.md) · [`data/species/examples/`](data/species/examples/)

## License

See [LICENSE](LICENSE).
