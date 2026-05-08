"use client";

import { useEffect, useRef, useState } from "react";
import * as Colyseus from "colyseus.js";

import {
  CLIENT_MSG,
  ROOM_NAMES,
  SERVER_MSG,
  type DeclareActionMsg,
} from "@wildloom/protocol";
import type { CreatureInstance, AffinityID, AffinityEmphasis, HitResult } from "@wildloom/types";

import type { BattleHandle } from "../game/battle/PhaserBoot";
import type { BattleHud } from "../game/battle/BattleScene";

interface BattleHostProps {
  attackerCreature: CreatureInstance;
  defenderCreature: CreatureInstance;
  isWildBattle?: boolean;
  rngSeed?: string;
  biomeId?: string;
  onEnd?: (outcome: string, reason: string) => void;
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

export default function BattleHost({
  attackerCreature,
  defenderCreature,
  isWildBattle = false,
  rngSeed,
  biomeId = "neutral_arena",
  onEnd,
}: BattleHostProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<BattleHandle | null>(null);
  const roomRef = useRef<Colyseus.Room | null>(null);
  const cooldownsRef = useRef<Record<string, number>>({});
  const [status, setStatus] = useState<string>("connecting…");

  useEffect(() => {
    let disposed = false;

    void (async () => {
      const client = new Colyseus.Client(COLYSEUS_URL);
      let room: Colyseus.Room;
      try {
        room = await client.joinOrCreate(ROOM_NAMES.BATTLE, {
          attackerCreature,
          defenderCreature,
          isWildBattle,
          rngSeed,
          biomeId,
        });
      } catch (err) {
        setStatus(`failed to connect: ${(err as Error).message}`);
        return;
      }

      if (disposed) {
        room.leave().catch(() => {});
        return;
      }

      roomRef.current = room;
      setStatus("connected");

      const initial = buildHud(attackerCreature, defenderCreature, cooldownsRef.current);

      const { bootBattleScene } = await import("../game/battle/PhaserBoot");
      if (disposed || !containerRef.current) {
        room.leave().catch(() => {});
        return;
      }
      handleRef.current = bootBattleScene(containerRef.current, initial, {
        onSelectMove: (slot: number) => {
          const msg: DeclareActionMsg = { action: `move:${slot}` };
          room.send(CLIENT_MSG.DECLARE_ACTION, msg);
          handleRef.current?.appendLog(`> declared move ${slot}`);
        },
        onChangeStance: (stance: string) => {
          room.send(CLIENT_MSG.CHANGE_STANCE, { stance });
        },
      });

      room.onStateChange((state) => {
        if (!handleRef.current) return;
        const hud = buildHud(
          attackerCreature,
          defenderCreature,
          cooldownsRef.current,
          state as unknown as RoomStateLike,
        );
        handleRef.current.setState(hud);
      });

      room.onMessage(SERVER_MSG.HIT_RESOLVED, (m: HitResolvedMsg) => {
        if (!handleRef.current) return;
        if (m.side === "attacker") {
          // attacker hit defender
          handleRef.current.playHit({
            side: "attacker",
            damage: Math.round(m.result.stamina_loss),
            rules_fired: m.result.breakdown.rules_fired,
          });
          // bookkeeping: cooldown for the attacker move
          cooldownsRef.current[m.moveId] =
            attackerCreature.move_instances.find((mv) => mv.move_id === m.moveId)?.cooldown_turns ??
            0;
        } else {
          handleRef.current.playHit({
            side: "defender",
            damage: Math.round(m.result.stamina_loss),
            rules_fired: m.result.breakdown.rules_fired,
          });
        }
      });

      room.onMessage(SERVER_MSG.RULE_FIRED, (m: { side: string; rule: string }) => {
        handleRef.current?.appendLog(`! ${m.rule}`);
      });

      room.onMessage(SERVER_MSG.STATUS_TRIGGERED, (m: { side: string; status: string }) => {
        handleRef.current?.appendLog(`! ${m.side} → ${m.status}`);
        handleRef.current?.flashCallout(`${prettyStatus(m.status)}!`);
      });

      room.onMessage(SERVER_MSG.TURN_RESOLVED, () => {
        // Decrement local cooldowns, mirroring server-side turn end.
        for (const k of Object.keys(cooldownsRef.current)) {
          cooldownsRef.current[k] = Math.max(0, (cooldownsRef.current[k] ?? 0) - 1);
        }
      });

      room.onMessage(SERVER_MSG.BATTLE_END, (m: { outcome: string; reason: string }) => {
        setStatus(`battle ended: ${m.outcome} (${m.reason})`);
        handleRef.current?.appendLog(`Battle ended: ${m.outcome} (${m.reason})`);
        onEnd?.(m.outcome, m.reason);
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
  }, [attackerCreature.instance_id, defenderCreature.instance_id, biomeId, rngSeed, isWildBattle]);

  return (
    <div className="flex flex-col gap-2">
      <div ref={containerRef} className="w-full max-w-[800px] aspect-[4/3] rounded-xl overflow-hidden border border-wild-stem/40" />
      <div className="text-xs text-wild-fern font-mono">{status}</div>
    </div>
  );
}

interface HitResolvedMsg {
  side: "attacker" | "defender";
  moveId: string;
  moveTitle: string;
  result: HitResult;
}

interface RoomStateLike {
  turn: number;
  phase: string;
  attacker: PublicSide;
  defender: PublicSide;
}

interface PublicSide {
  current_s: number;
  s_max: number;
  dominantAffinity: AffinityID;
  statuses: { toArray?: () => string[] } | string[];
  nickname: string;
  speciesId: string;
  accumulators?:
    | { forEach: (cb: (v: number, k: string) => void) => void }
    | Record<string, number>;
}

function buildHud(
  attackerCreature: CreatureInstance,
  defenderCreature: CreatureInstance,
  cooldowns: Record<string, number>,
  state?: RoomStateLike,
): BattleHud {
  const att = state?.attacker;
  const def = state?.defender;

  return {
    turn: state?.turn ?? 0,
    phase: state?.phase ?? "idle",
    attacker: {
      speciesId: att?.speciesId ?? attackerCreature.species_id,
      nickname: att?.nickname ?? attackerCreature.species_id,
      current_s: att?.current_s ?? attackerCreature.s_max,
      s_max: att?.s_max ?? attackerCreature.s_max,
      dominantAffinity:
        (att?.dominantAffinity as AffinityID | undefined) ?? dominantAffinity(attackerCreature.affinity_emphasis),
      statuses: toStringArray(att?.statuses),
      accumulators: toAccMap(att?.accumulators),
    },
    defender: {
      speciesId: def?.speciesId ?? defenderCreature.species_id,
      nickname: def?.nickname ?? defenderCreature.species_id,
      current_s: def?.current_s ?? defenderCreature.s_max,
      s_max: def?.s_max ?? defenderCreature.s_max,
      dominantAffinity:
        (def?.dominantAffinity as AffinityID | undefined) ?? dominantAffinity(defenderCreature.affinity_emphasis),
      statuses: toStringArray(def?.statuses),
      accumulators: toAccMap(def?.accumulators),
    },
    moves: attackerCreature.move_instances.slice(0, 8).map((mv) => ({
      title: mv.system_display_title || mv.move_id.slice(0, 24),
      affinity: mv.primary_affinity,
      cooldownLeft: cooldowns[mv.move_id] ?? 0,
      accuracy: mv.accuracy,
      base_power: mv.base_power,
    })),
  };
}

function toStringArray(input: PublicSide["statuses"] | undefined): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return [...input];
  if (typeof input.toArray === "function") return input.toArray();
  return [];
}

function toAccMap(input: PublicSide["accumulators"] | undefined): Record<string, number> {
  if (!input) return {};
  if (typeof (input as { forEach?: unknown }).forEach === "function") {
    const out: Record<string, number> = {};
    (input as { forEach: (cb: (v: number, k: string) => void) => void }).forEach((v, k) => {
      // server ships int16 percent in [-100, 100]; rescale to [-1, 1].
      out[k] = v / 100;
    });
    return out;
  }
  const obj = input as Record<string, number>;
  const out: Record<string, number> = {};
  for (const k of Object.keys(obj)) out[k] = obj[k]! / 100;
  return out;
}

function prettyStatus(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function dominantAffinity(emphasis: AffinityEmphasis): AffinityID {
  let bestKey: AffinityID = "TH";
  let bestVal = -Infinity;
  for (const [k, v] of Object.entries(emphasis) as [AffinityID, number][]) {
    if (v > bestVal) {
      bestVal = v;
      bestKey = k;
    }
  }
  return bestKey;
}
