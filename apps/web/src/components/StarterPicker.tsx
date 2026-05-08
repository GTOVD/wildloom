"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AFFINITY_COLOR_HEX, type AffinityID } from "@wildloom/types";

import { commitStarter, type StarterRoll } from "@/app/app/starter/actions";

export default function StarterPicker({ rolls }: { rolls: StarterRoll[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function pick(roll: StarterRoll) {
    setError(null);
    startTransition(async () => {
      const res = await commitStarter(roll);
      if (res.ok) router.push("/app");
      else setError(res.error);
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {rolls.map((r) => {
          const dom = dominant(r.creature.affinity_emphasis);
          return (
            <article
              key={r.index}
              className="rounded-2xl border border-wild-parch/10 bg-wild-parch/5 p-5"
            >
              <div
                className="mx-auto h-24 w-24 rounded-full border-2 border-wild-ink"
                style={{ backgroundColor: AFFINITY_COLOR_HEX[dom] }}
                aria-hidden
              />
              <h3 className="mt-3 text-center text-lg font-semibold text-wild-parch">
                Species {r.creature.species_id}
              </h3>
              <p className="text-center text-xs text-wild-parch/60">
                L{r.creature.level} · S {r.creature.s_max} · dom {dom}
              </p>
              <ul className="mt-3 space-y-0.5 font-mono text-[11px] text-wild-parch/70">
                {r.creature.move_instances.slice(0, 4).map((m, i) => (
                  <li key={m.move_id}>
                    {i + 1}. {m.system_display_title || m.frame_id} · bp {m.base_power}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => pick(r)}
                disabled={pending}
                className="mt-4 w-full rounded-md bg-wild-flora px-4 py-2 text-sm font-semibold text-wild-ink hover:bg-wild-flora/90 disabled:opacity-50"
              >
                {pending ? "Choosing…" : "Choose"}
              </button>
            </article>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </>
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
