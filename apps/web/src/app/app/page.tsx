import Link from "next/link";

import { prisma } from "@wildloom/db";

import { auth } from "@/lib/auth";

export default async function LobbyPage() {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id;

  const creatures = userId
    ? await prisma.creature.findMany({
        where: { ownerUserId: userId },
        orderBy: [{ partySlot: "asc" }, { createdAt: "asc" }],
        take: 12,
      })
    : [];

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-3">
      <section className="rounded-2xl border border-wild-parch/10 bg-wild-parch/5 p-5">
        <h2 className="font-pixel text-[10px] uppercase tracking-[0.3em] text-wild-accent">
          Your Party
        </h2>
        <h3 className="mt-1 text-xl font-semibold text-wild-parch">
          {creatures.length === 0 ? "No creatures yet" : `${creatures.length} creature(s)`}
        </h3>
        {creatures.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-wild-parch/20 p-6 text-center text-sm text-wild-parch/70">
            <p>You don&apos;t have any creatures yet.</p>
            <p className="mt-2">
              Pick a starter to begin — three are rolled fresh from the
              starter biome.
            </p>
            <Link
              href="/app/starter"
              className="mt-4 inline-block rounded bg-wild-flora px-4 py-2 text-xs font-semibold text-wild-ink hover:bg-wild-flora/90"
            >
              Choose a starter
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {creatures.map((c) => (
              <li
                key={c.instanceId}
                className="flex items-center justify-between rounded border border-wild-parch/10 bg-wild-ink/40 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-wild-parch">
                    {c.nickname ?? c.speciesId}
                  </p>
                  <p className="text-xs text-wild-parch/60">
                    {c.speciesId} · Stage {c.stage} · L{c.level}
                  </p>
                </div>
                <Link
                  href={`/app/composer/${c.instanceId}`}
                  className="text-xs text-wild-accent hover:underline"
                >
                  Compose →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-wild-parch/10 bg-wild-parch/5 p-5 lg:col-span-2">
        <h2 className="font-pixel text-[10px] uppercase tracking-[0.3em] text-wild-accent">
          World
        </h2>
        <h3 className="mt-1 text-xl font-semibold text-wild-parch">
          Enter or create a world
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/app/play"
            className="rounded-xl border border-wild-flora/40 bg-wild-flora/10 p-4 transition hover:bg-wild-flora/20"
          >
            <p className="font-pixel text-[10px] uppercase tracking-widest text-wild-flora">
              Quick play
            </p>
            <p className="mt-2 text-sm text-wild-parch/85">
              Enter a procedurally-generated public world and start exploring.
              Wild encounters trigger battles automatically.
            </p>
          </Link>

          <Link
            href="/app/test-battle"
            className="rounded-xl border border-wild-parch/20 bg-wild-ink/50 p-4 transition hover:bg-wild-parch/10"
          >
            <p className="font-pixel text-[10px] uppercase tracking-widest text-wild-accent">
              Test battle
            </p>
            <p className="mt-2 text-sm text-wild-parch/85">
              Spawn two procedural creatures and run a server-authoritative
              battle as an integration smoke test.
            </p>
          </Link>
        </div>

        <div className="mt-6 rounded-lg border border-wild-parch/10 bg-wild-ink/40 p-4 text-xs text-wild-parch/60">
          <strong className="text-wild-parch">Status</strong>
          <p className="mt-1">
            Combat engine + procedural spawn online. The Test battle launcher
            spawns two MVP creatures and runs them through the full §10
            damage pipeline against a live BattleRoom. World loop lands in
            Wave D.
          </p>
        </div>
      </section>
    </div>
  );
}
