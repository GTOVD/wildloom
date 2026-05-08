"use client";

import { useEffect, useRef, useState } from "react";
import * as Colyseus from "colyseus.js";

import { biomes as biomesData } from "@wildloom/data";
import {
  CLIENT_MSG,
  ROOM_NAMES,
  SERVER_MSG,
  type EnterEncounterTileMsg,
  type PlayerMoveMsg,
} from "@wildloom/protocol";
import type { CreatureInstance } from "@wildloom/types";

import BattleHost from "@/components/BattleHost";
import type { ChunkPayload } from "@/game/world/WorldScene";
import type { WorldHandle } from "@/game/world/PhaserBoot";

interface WorldHostProps {
  partyCreature: CreatureInstance;
  userId: string;
  displayName: string;
  // Optional fixed seed for reproducible worlds.
  worldSeed?: string;
}

interface EncounterPair {
  attacker: CreatureInstance;
  defender: CreatureInstance;
  biomeId: string;
  rngSeed: string;
}

const COLYSEUS_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_COLYSEUS_URL as string | undefined) ?? defaultColyseusUrl()
    : "ws://localhost:2567";

function defaultColyseusUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:2567";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.hostname}:2567`;
}

const BIOME_COLORS = Object.fromEntries(
  Object.entries(biomesData.biomes as Record<string, { tile_color_hex: string }>).map(
    ([id, b]) => [id, b.tile_color_hex],
  ),
);

export default function WorldHost({
  partyCreature,
  userId,
  displayName,
  worldSeed,
}: WorldHostProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<WorldHandle | null>(null);
  const roomRef = useRef<Colyseus.Room | null>(null);
  const [status, setStatus] = useState("connecting…");
  const [encounter, setEncounter] = useState<EncounterPair | null>(null);

  useEffect(() => {
    let disposed = false;

    void (async () => {
      const client = new Colyseus.Client(COLYSEUS_URL);
      let room: Colyseus.Room;
      try {
        room = await client.joinOrCreate(ROOM_NAMES.WORLD, {
          seed: worldSeed,
          userId,
          displayName,
          partyCreature,
        });
      } catch (err) {
        setStatus(`failed to join world: ${(err as Error).message}`);
        return;
      }
      if (disposed) {
        room.leave().catch(() => {});
        return;
      }

      roomRef.current = room;
      setStatus("connected");

      const { bootWorldScene } = await import("@/game/world/PhaserBoot");
      if (disposed || !containerRef.current) {
        room.leave().catch(() => {});
        return;
      }

      handleRef.current = bootWorldScene(containerRef.current, {
        onMove: (x, y, facing) => {
          const msg: PlayerMoveMsg = { x, y, facing, ts: Date.now() };
          room.send(CLIENT_MSG.PLAYER_MOVE, msg);
        },
        onEnterTile: (x, y) => {
          const msg: EnterEncounterTileMsg = { tile_x: x, tile_y: y };
          room.send(CLIENT_MSG.ENTER_ENCOUNTER_TILE, msg);
        },
      });

      room.onMessage(SERVER_MSG.CHUNK_DATA, (m: ChunkPayload) => {
        handleRef.current?.setChunk({ ...m, colors: BIOME_COLORS });
      });

      room.onStateChange((state) => {
        const peers: Array<{ id: string; x: number; y: number; name: string }> = [];
        const players = (state as unknown as {
          players: { forEach: (cb: (p: { userId: string; displayName: string; x: number; y: number }, sid: string) => void) => void };
        }).players;
        players.forEach((p, sid) => {
          if (p.userId === userId) return;
          peers.push({ id: sid, x: p.x, y: p.y, name: p.displayName });
        });
        handleRef.current?.setPeers(peers);
      });

      room.onMessage(SERVER_MSG.ENCOUNTER_TRIGGERED, (m: { biomeId: string; wildCreature: CreatureInstance; rngSeed: string }) => {
        setStatus(`encounter! biome=${m.biomeId} (species ${m.wildCreature.species_id})`);
        setEncounter({
          attacker: partyCreature,
          defender: m.wildCreature,
          biomeId: m.biomeId,
          rngSeed: m.rngSeed,
        });
      });
    })();

    return () => {
      disposed = true;
      handleRef.current?.destroy();
      handleRef.current = null;
      roomRef.current?.leave().catch(() => {});
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, displayName, worldSeed, partyCreature.instance_id]);

  if (encounter) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setEncounter(null)}
          className="rounded-md border border-wild-parch/20 px-3 py-1.5 text-xs uppercase tracking-wide text-wild-parch/80 hover:border-wild-parch/40"
        >
          ← Back to world
        </button>
        <BattleHost
          attackerCreature={encounter.attacker}
          defenderCreature={encounter.defender}
          biomeId={encounter.biomeId}
          rngSeed={encounter.rngSeed}
          isWildBattle
          onEnd={() => setEncounter(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="w-full max-w-[800px] aspect-[10/7] rounded-xl overflow-hidden border border-wild-stem/40" />
      <p className="text-xs text-wild-fern font-mono">
        {status} · WASD or arrows to walk · stepping into grass may trigger a wild encounter
      </p>
    </div>
  );
}
