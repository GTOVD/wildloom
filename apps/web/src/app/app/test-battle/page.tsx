import TestBattleLauncher from "@/components/TestBattleLauncher";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function TestBattlePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <p className="font-pixel text-[10px] uppercase tracking-[0.3em] text-wild-accent">
        Combat smoke test
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-wild-parch">
        Test battle launcher
      </h1>
      <p className="mt-2 text-sm text-wild-parch/70">
        Spawns two procedural creatures (deterministic from seed) and runs a wild
        battle through the §10 damage pipeline. Use this to smoke-test the full
        BattleRoom + BattleScene loop end-to-end.
      </p>

      <div className="mt-6">
        <TestBattleLauncher />
      </div>
    </div>
  );
}
