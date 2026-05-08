import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@wildloom/db";
import type { CreatureInstance } from "@wildloom/types";

import WorldHost from "@/components/WorldHost";
import { auth } from "@/lib/auth";

export default async function PlayPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as { id: string; name?: string | null };

  const party = await prisma.creature.findFirst({
    where: { ownerUserId: user.id },
    orderBy: [{ partySlot: "asc" }, { createdAt: "asc" }],
  });

  if (!party) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-pixel text-[10px] uppercase tracking-[0.3em] text-wild-accent">
          Pick a starter first
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-wild-parch">
          You need at least one creature to enter the world
        </h1>
        <Link
          href="/app/starter"
          className="mt-6 inline-block rounded bg-wild-flora px-4 py-2 text-sm font-semibold text-wild-ink hover:bg-wild-flora/90"
        >
          Choose a starter →
        </Link>
      </div>
    );
  }

  const partyCreature = party.payload as unknown as CreatureInstance;

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <h1 className="font-pixel text-[10px] uppercase tracking-[0.3em] text-wild-accent">
        Wild
      </h1>
      <h2 className="mt-1 text-2xl font-semibold text-wild-parch">
        {party.nickname ?? party.speciesId}
      </h2>
      <p className="text-sm text-wild-parch/70">
        Lead creature · L{party.level}
      </p>
      <div className="mt-4">
        <WorldHost
          partyCreature={partyCreature}
          userId={user.id}
          displayName={user.name ?? "Wanderer"}
        />
      </div>
    </div>
  );
}
