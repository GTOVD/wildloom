# Wildloom

**Wildloom** is an original multiplayer web game: explore a shared overworld,
meet other players, battle wild creatures, and trade. Battles run on a
continuous-physics damage pipeline rather than a static type chart. Creatures
roll procedurally from biome-shaped distributions; moves are composed by the
player from frame templates.

This project is **not affiliated with, endorsed by, or derived from** any
third-party monster-collecting franchises. All names, creatures, art, and rules
are our own.

## Working name

- **Game title:** Wildloom
- **Repository:** [github.com/GTOVD/wildloom](https://github.com/GTOVD/wildloom)

## Design documentation

The authoritative design + technical spec is **[`docs/WILDLOOM-MASTER-V2.md`](docs/WILDLOOM-MASTER-V2.md)**.
This README only covers running the project.

## Tech stack

| Layer | Choice |
|---|---|
| Web framework | Next.js 14 (App Router) |
| UI styling | Tailwind CSS |
| Game engine | Phaser 3 (WebGL) |
| Auth | Auth.js v5 (Google OAuth + dev bypass) |
| Game server | Colyseus (rooms over WebSocket) |
| Database | PostgreSQL 16 + Prisma |
| Cache / pubsub | Redis 7 |
| Language | TypeScript everywhere |
| Hosting | Docker Compose (self-hostable on a single machine) |

## Repository layout

```
apps/
  web/                Next.js 14 app + Phaser scenes
  gameserver/         Colyseus server (WorldRoom + BattleRoom)
packages/
  combat/             §10 damage pipeline (shared client/server)
  worldgen/           §31.4 procedural world generator
  species/            §3.2 spawn pipeline
  data/               Balance JSON/YAML artifacts (§26)
  protocol/           Colyseus message contracts
  db/                 Prisma schema + client
  types/              Shared TypeScript interfaces
docs/                 Design documentation
infra/                nginx config etc.
docker-compose.yml    Local + production services
```

## Quick start (local dev)

### Prerequisites

- Node.js 22+
- pnpm 9+ (`corepack enable && corepack prepare pnpm@9 --activate`)
- Docker + Docker Compose

### 1. Clone and configure

```bash
git clone https://github.com/GTOVD/wildloom.git
cd wildloom
cp .env.example .env
```

For purely local play, the defaults work as-is — `AUTH_DEV_BYPASS=1` lets you
sign in as a synthetic local user without configuring Google OAuth.

For a real deployment, see [Production deployment](#production-deployment) below.

### 2. Bring up Postgres + Redis

```bash
pnpm docker:up
```

This starts Postgres on `localhost:5432` and Redis on `localhost:6379` with
volumes under `./data/`.

### 3. Install + migrate

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
```

### 4. Run the dev servers

```bash
pnpm dev
```

This runs the Next.js web app on http://localhost:3000 and the Colyseus game
server on `ws://localhost:2567` in parallel watch mode.

Open http://localhost:3000 and sign in with the **"Sign in as Dev Player"**
button (visible whenever `AUTH_DEV_BYPASS=1`).

## Build phases

This repository is built in waves matching §31.12 of the master doc:

| Wave | Status |
|---|---|
| **A — Foundation** | ✅ Monorepo, Docker, Auth, Prisma, lobby shell |
| **B — Combat engine** | ✅ Full §10 pipeline (9 stages) + ψ kernels + Layer 1/2/3 + Appendix C regression test |
| **C — Battle UI loop** | ✅ BattleRoom (Colyseus) + BattleScene (Phaser) + 7-panel composer + test-battle launcher |
| **D — World loop** | ✅ Simplex-noise worldgen + WorldRoom (interest mgmt + chunk streaming) + WorldScene + encounter handoff |
| **E — Polish** | ✅ Starter selection, dex inspect, status badges, "Thermal Shock!" rule callouts |

## What the vertical slice does today

After signing in (dev bypass) you can:

- **Pick a starter** — three rainforest-biome creatures, deterministic from your account seed.
- **Walk a procedural world** at `/app/play` — WASD/arrow keys, simplex-noise biomes with 3-tile blend zones, real-time peer positions over Colyseus.
- **Trigger wild encounters** by stepping onto biome tiles — the world room rolls a deterministic encounter and hands the wild creature off to a fresh BattleRoom.
- **Battle through the full §10 pipeline** — declare → resolve (priority + initiative) → integrate accumulators (Layer 3 ODE) → emit threshold statuses. Animated HitResolved playback, "Thermal Shock!" style rule callouts, accumulator meters, 8-move grid with cooldowns.
- **Compose moves** at `/app/composer/[creatureId]?slot=N` — all 7 panels (category, frame, affinity, payload split, potency, outcome budget, effects) with deterministic name preview from `assembleDisplayName`.
- **Smoke-test the engine** at `/app/test-battle` — spawns two procedural creatures and runs them against a live BattleRoom.

## Production deployment

Two supported paths, both free:

### Path 1 — Cloudflare Tunnel (no port-forwarding)

1. Set up a Cloudflare account (free) with a domain.
2. Install `cloudflared` on your host and authorize it.
3. Run the full stack: `docker compose --profile full up -d --build`
4. Point `cloudflared` at `http://localhost:80`. Cloudflare provides HTTPS and
   public DNS, no router config needed.

### Path 2 — Direct VPS / port-forwarded host

1. Configure your `.env` with real `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   (see [Google Cloud Console](https://console.cloud.google.com/apis/credentials))
   and unset `AUTH_DEV_BYPASS`.
2. Replace the Nginx config in `infra/nginx.conf` with one that terminates TLS
   via Certbot/Let's Encrypt.
3. Run `docker compose --profile full up -d --build`.

In both cases **no paid third-party services are required**. Google OAuth is
free, Cloudflare Tunnel is free, and everything else is self-hosted OSS.

## Running the test suites

```bash
pnpm -r test                       # all packages
pnpm --filter @wildloom/combat test # damage pipeline + Appendix C regression
pnpm --filter @wildloom/species test # spawn pipeline determinism
pnpm --filter @wildloom/worldgen test # biome map + encounters
```

## Recalibrating affinity vectors

The 12 affinity unit vectors in ℝ⁶ are calibrated against the §7.3 CHART₀
matrix via Adam-driven NLLS. To regenerate `packages/data/json/affinity_vectors.json`:

```bash
pnpm calibrate:affinities
```

See `tools/calibrate-affinities.ts` and `packages/data/README.md` for the
geometry caveats (the diagonal of CHART₀ is intentionally excluded from the
loss; self-resistance is supplied by the §11 `resist_kernel` instead).

## License

See [LICENSE](LICENSE).
