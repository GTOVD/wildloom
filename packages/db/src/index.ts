import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __wildloom_prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__wildloom_prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__wildloom_prisma = prisma;
}

export type {
  User,
  Account,
  Session,
  Creature,
  MoveInstance,
  WorldSession,
  BattleLog,
} from "@prisma/client";

export { Prisma } from "@prisma/client";
