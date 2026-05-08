import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { frames as framesData } from "@wildloom/data";
import { prisma } from "@wildloom/db";
import type { MoveCategory, MoveInstance } from "@wildloom/types";

import ComposerForm from "@/components/composer/ComposerForm";
import { auth } from "@/lib/auth";

interface ComposerPageProps {
  params: { creatureId: string };
  searchParams?: { slot?: string };
}

export default async function ComposerPage({ params, searchParams }: ComposerPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id?: string }).id!;

  const creature = await prisma.creature.findFirst({
    where: { instanceId: params.creatureId, ownerUserId: userId },
    include: { moves: { orderBy: { slotIndex: "asc" } } },
  });

  if (!creature) notFound();

  const activeSlot = clampSlot(parseInt(searchParams?.slot ?? "0", 10));
  const slotMove = creature.moves.find((m) => m.slotIndex === activeSlot);

  const initialMove: MoveInstance =
    (slotMove?.payload as unknown as MoveInstance | null) ?? defaultMove();

  const frameList = Object.entries(
    framesData.frames as Record<string, { category: string; display_seed: string }>,
  ).map(([id, f]) => ({
    id,
    category: f.category as MoveCategory,
    display_seed: f.display_seed,
  }));

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link href="/app/dex" className="text-xs text-wild-accent hover:underline">
        ← Back to dex
      </Link>
      <h1 className="mt-2 text-3xl font-semibold text-wild-parch">
        {creature.nickname ?? creature.speciesId}
      </h1>
      <p className="text-sm text-wild-parch/70">
        {creature.speciesId} · Stage {creature.stage} · L{creature.level}
      </p>

      <h2 className="mt-8 font-pixel text-[10px] uppercase tracking-[0.3em] text-wild-accent">
        Move slots
      </h2>
      <div className="mt-3 grid grid-cols-4 gap-2 lg:grid-cols-8">
        {Array.from({ length: 8 }).map((_, slot) => {
          const move = creature.moves.find((m) => m.slotIndex === slot);
          const title = (move?.payload as { system_display_title?: string } | null)
            ?.system_display_title;
          return (
            <Link
              key={slot}
              href={`/app/composer/${creature.instanceId}?slot=${slot}`}
              className={`rounded-lg border px-2 py-3 text-center text-[11px] ${
                slot === activeSlot
                  ? "border-wild-accent bg-wild-accent/15 text-wild-parch"
                  : "border-wild-parch/10 bg-wild-parch/5 text-wild-parch/70 hover:border-wild-parch/30"
              }`}
            >
              <div className="font-pixel text-[9px] uppercase tracking-wide text-wild-parch/60">
                Slot {slot + 1}
              </div>
              <div className="mt-1">{title ?? "— empty —"}</div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6">
        <ComposerForm
          creatureId={creature.instanceId}
          initialMove={initialMove}
          slot={activeSlot}
          frames={frameList}
        />
      </div>
    </div>
  );
}

function clampSlot(s: number): number {
  if (Number.isNaN(s) || s < 0) return 0;
  if (s > 7) return 7;
  return s;
}

function defaultMove(): MoveInstance {
  return {
    move_id: "",
    frame_id: "slam",
    system_display_title: "Slam",
    category: "strike",
    kinetic_share: 1.0,
    strike_modalities: { concussive: 0.8, piercing: 0.1, slashing: 0.1 },
    delivery_modalities: { concussive: 0.34, piercing: 0.33, slashing: 0.33 },
    primary_affinity: undefined,
    secondary_affinity: undefined,
    blend_eta: 0,
    base_power: 50,
    accuracy: 90,
    cooldown_turns: 0,
    pierce: 0.05,
    endurance_share: 0.95,
    status_guard_shred_share: 0.02,
    status_delivery_share: 0.02,
    utility_field_share: 0.0,
    utility_pressure_share: 0.01,
    status_payloads: [],
    accumulator_impulses: {},
    passive_hooks: [],
    infusion_coeffs: {},
    priority_tier: 0,
    contact: true,
    tags: [],
    patch_hash: "v0",
  };
}
