import Link from "next/link";

import { prisma } from "@wildloom/db";
import { AFFINITY_COLOR_HEX, AFFINITY_DISPLAY_NAME, type AffinityID, type CreatureInstance } from "@wildloom/types";

import { auth } from "@/lib/auth";

export default async function DexPage() {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id;

  const creatures = userId
    ? await prisma.creature.findMany({
        where: { ownerUserId: userId },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-pixel text-[10px] uppercase tracking-[0.3em] text-wild-accent">
        Dex
      </h1>
      <h2 className="mt-1 text-2xl font-semibold text-wild-parch">
        Owned creatures ({creatures.length})
      </h2>

      {creatures.length === 0 ? (
        <p className="mt-6 text-sm text-wild-parch/70">
          No creatures yet. <Link href="/app/starter" className="text-wild-accent hover:underline">Pick a starter →</Link>
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {creatures.map((c) => {
            const payload = c.payload as unknown as CreatureInstance;
            const dom = dominant(payload.affinity_emphasis);
            return (
              <Link
                key={c.instanceId}
                href={`/app/composer/${c.instanceId}`}
                className="rounded-xl border border-wild-parch/10 bg-wild-parch/5 p-4 transition hover:border-wild-accent/40"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-12 w-12 shrink-0 rounded-full border-2 border-wild-ink"
                    style={{ backgroundColor: AFFINITY_COLOR_HEX[dom] }}
                    aria-hidden
                  />
                  <div>
                    <p className="text-xs text-wild-parch/60">{c.speciesId}</p>
                    <p className="text-lg font-semibold text-wild-parch">
                      {c.nickname ?? c.speciesId}
                    </p>
                    <p className="text-xs text-wild-parch/60">
                      Stage {c.stage} · L{c.level} · {AFFINITY_DISPLAY_NAME[dom]}
                    </p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-0.5 font-mono text-[11px] text-wild-parch/70">
                  <div className="flex justify-between"><dt>HP</dt><dd>{payload.s_max}</dd></div>
                  <div className="flex justify-between"><dt>Init</dt><dd>{payload.core_stats.initiative}</dd></div>
                  <div className="flex justify-between"><dt>P.Off</dt><dd>{payload.core_stats.physical_offense}</dd></div>
                  <div className="flex justify-between"><dt>S.Off</dt><dd>{payload.core_stats.special_offense}</dd></div>
                  <div className="flex justify-between"><dt>P.Mit</dt><dd>{payload.core_stats.physical_mitigation}</dd></div>
                  <div className="flex justify-between"><dt>S.Mit</dt><dd>{payload.core_stats.special_mitigation}</dd></div>
                </dl>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function dominant(em: Record<string, number>): AffinityID {
  let bestKey: AffinityID = "TH";
  let bestVal = -Infinity;
  for (const [k, v] of Object.entries(em)) {
    if (v > bestVal) {
      bestVal = v;
      bestKey = k as AffinityID;
    }
  }
  return bestKey;
}
