"use client";

import { useState, useTransition } from "react";

import type { CreatureInstance } from "@wildloom/types";

import BattleHost from "@/components/BattleHost";
import { spawnTestBattlePair, type TestBattlePair } from "@/app/app/test-battle/actions";

export default function TestBattleLauncher() {
  const [pair, setPair] = useState<TestBattlePair | null>(null);
  const [seed, setSeed] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start() {
    setError(null);
    startTransition(async () => {
      const res = await spawnTestBattlePair(seed || undefined);
      if (res.ok) {
        setPair(res.pair);
      } else {
        setError(res.error);
      }
    });
  }

  function reset() {
    setPair(null);
  }

  if (pair) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={reset}
            className="rounded-md border border-wild-parch/20 px-3 py-1.5 text-xs uppercase tracking-wide text-wild-parch/80 hover:border-wild-parch/40"
          >
            ← New battle
          </button>
          <span className="text-xs text-wild-parch/60 font-mono">
            biome={pair.biomeId} · seed={pair.rngSeed}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <BattleHost
              attackerCreature={pair.attacker}
              defenderCreature={pair.defender}
              isWildBattle
              rngSeed={pair.rngSeed}
              biomeId={pair.biomeId}
            />
          </div>
          <div className="space-y-3">
            <CreatureCard label="You" creature={pair.attacker} />
            <CreatureCard label="Wild" creature={pair.defender} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-wild-parch/10 bg-wild-parch/5 p-4 max-w-md">
      <label className="text-xs text-wild-parch/70">
        Seed (optional, leave blank for random)
      </label>
      <input
        type="text"
        value={seed}
        onChange={(e) => setSeed(e.target.value)}
        placeholder="e.g. battle-001"
        className="mt-1 w-full rounded-md border border-wild-parch/15 bg-wild-ink/60 px-3 py-2 text-sm text-wild-parch"
      />
      <button
        onClick={start}
        disabled={pending}
        className="mt-3 w-full rounded-md bg-wild-accent px-4 py-2 text-sm font-semibold text-wild-ink disabled:opacity-50"
      >
        {pending ? "Spawning…" : "Start test battle"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function CreatureCard({
  label,
  creature,
}: {
  label: string;
  creature: CreatureInstance;
}) {
  return (
    <div className="rounded-lg border border-wild-parch/10 bg-wild-parch/5 p-3 text-xs">
      <p className="font-pixel text-[9px] uppercase tracking-[0.3em] text-wild-accent">{label}</p>
      <p className="mt-1 text-sm font-semibold text-wild-parch">
        Species {creature.species_id} · L{creature.level} · S {creature.s_max}
      </p>
      <p className="mt-1 text-wild-parch/60">
        Stance · grounded · {creature.move_instances.length} moves
      </p>
      <ul className="mt-2 space-y-0.5 font-mono text-[11px] text-wild-parch/70">
        {creature.move_instances.slice(0, 6).map((m, i) => (
          <li key={m.move_id}>
            {i + 1}. {m.system_display_title || m.frame_id} · bp {m.base_power}
          </li>
        ))}
      </ul>
    </div>
  );
}
