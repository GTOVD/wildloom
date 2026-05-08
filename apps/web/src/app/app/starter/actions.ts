"use server";

import { revalidatePath } from "next/cache";

import { assembleDisplayName } from "@wildloom/combat";
import { getMvpSpawnSpecies } from "@wildloom/data";
import { prisma } from "@wildloom/db";
import { spawnCreature } from "@wildloom/species";
import type { CreatureInstance } from "@wildloom/types";

import { auth } from "@/lib/auth";

const STARTER_BIOME = "ancient_rainforest";

export interface StarterRoll {
  index: number;
  creature: CreatureInstance;
}

export async function rollStarters(): Promise<StarterRoll[]> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return [];

  const baseSeed = `starter::${userId}`;
  const mvp = getMvpSpawnSpecies();
  const speciesIds = pickThree(mvp.map((s) => s.id), baseSeed);

  return speciesIds.map((sid, i) => {
    const c = spawnCreature({
      speciesId: sid,
      biomeId: STARTER_BIOME,
      stage: 1,
      level: 5,
      tier: "uncommon",
      seed: `${baseSeed}::${i}`,
    });
    for (const m of c.move_instances) {
      if (!m.system_display_title) {
        try {
          m.system_display_title = assembleDisplayName(m);
        } catch {
          m.system_display_title = m.frame_id;
        }
      }
    }
    return { index: i, creature: c };
  });
}

export async function commitStarter(
  roll: StarterRoll,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, error: "Not authenticated" };

  const existing = await prisma.creature.count({ where: { ownerUserId: userId, isStarter: true } });
  if (existing > 0) return { ok: false, error: "Starter already chosen" };

  const c = roll.creature;
  await prisma.$transaction(async (tx) => {
    const created = await tx.creature.create({
      data: {
        ownerUserId: userId,
        speciesId: c.species_id,
        stage: c.stage,
        level: c.level,
        nickname: null,
        isStarter: true,
        partySlot: 0,
        payload: c as unknown as object,
      },
    });
    for (let i = 0; i < c.move_instances.length; i++) {
      await tx.moveInstance.create({
        data: {
          ownerCreatureId: created.instanceId,
          slotIndex: i,
          payload: c.move_instances[i]! as unknown as object,
        },
      });
    }
  });

  revalidatePath("/app");
  revalidatePath("/app/dex");
  return { ok: true };
}

function pickThree(ids: string[], seed: string): string[] {
  const out: string[] = [];
  const rng = mulberry32(hashSeed(seed));
  const pool = [...ids];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  while (out.length < 3 && ids.length > 0) {
    out.push(ids[Math.floor(rng() * ids.length)]!);
  }
  return out;
}

function hashSeed(s: string): number {
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
