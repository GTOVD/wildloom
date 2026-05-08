"use server";

import { assembleDisplayName } from "@wildloom/combat";
import { getBiomeIds, getMvpSpawnSpecies } from "@wildloom/data";
import { spawnCreature } from "@wildloom/species";
import type { CreatureInstance } from "@wildloom/types";

import { auth } from "@/lib/auth";

export interface TestBattlePair {
  attacker: CreatureInstance;
  defender: CreatureInstance;
  rngSeed: string;
  biomeId: string;
}

export async function spawnTestBattlePair(
  inputSeed?: string,
): Promise<{ ok: true; pair: TestBattlePair } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  const seed = inputSeed && inputSeed.length > 0 ? inputSeed : `tb-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  const biomeIds = getBiomeIds();
  const biomeId = biomeIds[Math.abs(hashSeed(seed)) % biomeIds.length] ?? "neutral_arena";

  const mvpSpecies = getMvpSpawnSpecies();
  if (mvpSpecies.length < 2) {
    return { ok: false, error: "MVP species catalog needs at least 2 entries" };
  }
  const idxA = Math.abs(hashSeed(`${seed}::attacker`)) % mvpSpecies.length;
  let idxD = Math.abs(hashSeed(`${seed}::defender`)) % mvpSpecies.length;
  if (idxD === idxA) idxD = (idxD + 1) % mvpSpecies.length;

  try {
    const attacker = spawnCreature({
      speciesId: mvpSpecies[idxA]!.id,
      biomeId,
      stage: 2,
      level: 20,
      tier: "uncommon",
      seed: `${seed}::attacker`,
    });
    const defender = spawnCreature({
      speciesId: mvpSpecies[idxD]!.id,
      biomeId,
      stage: 2,
      level: 20,
      tier: "uncommon",
      seed: `${seed}::defender`,
    });

    nameMoves(attacker);
    nameMoves(defender);

    return { ok: true, pair: { attacker, defender, rngSeed: seed, biomeId } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

function nameMoves(c: CreatureInstance): void {
  for (const m of c.move_instances) {
    if (!m.system_display_title) {
      try {
        m.system_display_title = assembleDisplayName(m);
      } catch {
        m.system_display_title = m.frame_id;
      }
    }
  }
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
