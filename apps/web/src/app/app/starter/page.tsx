import { redirect } from "next/navigation";

import { prisma } from "@wildloom/db";

import StarterPicker from "@/components/StarterPicker";
import { auth } from "@/lib/auth";
import { rollStarters } from "./actions";

export default async function StarterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;

  const existing = await prisma.creature.count({
    where: { ownerUserId: userId, isStarter: true },
  });
  if (existing > 0) redirect("/app");

  const rolls = await rollStarters();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <p className="font-pixel text-[10px] uppercase tracking-[0.3em] text-wild-accent">
        Starter selection
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-wild-parch">
        Pick your first creature
      </h1>
      <p className="mt-2 text-sm text-wild-parch/70">
        Three rainforest spawns, deterministic from your account seed. Pick one
        to begin — the rest disappear.
      </p>
      <div className="mt-6">
        <StarterPicker rolls={rolls} />
      </div>
    </div>
  );
}
