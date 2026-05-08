"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@wildloom/db";
import type { MoveInstance } from "@wildloom/types";

import { auth } from "@/lib/auth";

export interface SaveMoveArgs {
  creatureId: string;
  slot: number;
  payload: MoveInstance;
}

export async function saveMoveAction(
  args: SaveMoveArgs,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, error: "Not authenticated" };

  const creature = await prisma.creature.findFirst({
    where: { instanceId: args.creatureId, ownerUserId: userId },
    select: { instanceId: true },
  });
  if (!creature) return { ok: false, error: "Creature not found" };

  const existing = await prisma.moveInstance.findFirst({
    where: { ownerCreatureId: args.creatureId, slotIndex: args.slot },
    select: { moveId: true },
  });

  if (existing) {
    await prisma.moveInstance.update({
      where: { moveId: existing.moveId },
      data: { payload: args.payload as unknown as object },
    });
  } else {
    await prisma.moveInstance.create({
      data: {
        ownerCreatureId: args.creatureId,
        slotIndex: args.slot,
        payload: args.payload as unknown as object,
      },
    });
  }

  revalidatePath(`/app/composer/${args.creatureId}`);
  return { ok: true };
}
