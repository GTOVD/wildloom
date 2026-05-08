## Wildloom web — Next.js standalone build.
## Run from the repo root: `docker compose --profile full up --build`.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# Copy manifests first for layer caching.
FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/gameserver/package.json apps/gameserver/package.json
COPY packages packages
RUN pnpm install --frozen-lockfile=false

FROM deps AS builder
COPY . .
RUN pnpm --filter @wildloom/db generate
RUN pnpm --filter @wildloom/web build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
