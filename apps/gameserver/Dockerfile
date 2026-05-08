FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/gameserver/package.json apps/gameserver/package.json
COPY packages packages
RUN pnpm install --frozen-lockfile=false

FROM deps AS builder
COPY . .
RUN pnpm --filter @wildloom/db generate
RUN pnpm --filter @wildloom/gameserver build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /repo /app
WORKDIR /app/apps/gameserver

EXPOSE 2567
CMD ["node", "dist/index.js"]
