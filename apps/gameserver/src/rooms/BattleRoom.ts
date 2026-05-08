// BattleRoom — server-authoritative 1v1 battle. Implements §19 phase structure
// (declare → priority → resolve → integrate → end-of-turn).

import { Room, type Client } from "@colyseus/core";
import {
  assembleDisplayName,
  integrateTurn,
  resolveHit,
} from "@wildloom/combat";
import { prisma } from "@wildloom/db";
import { CLIENT_MSG, SERVER_MSG } from "@wildloom/protocol";
import {
  emptyAccumulators,
  emptyStatusGuard,
  type BattleSnapshot,
  type CombatantState,
  type CreatureInstance,
  type FieldState,
  type HitResult,
  type StanceID,
} from "@wildloom/types";

import { BattleState, CombatantPublic } from "../state/BattleState";

interface BattleCreateOptions {
  attackerCreature: CreatureInstance;
  defenderCreature: CreatureInstance;
  attackerUserId?: string;
  defenderUserId?: string;
  isWildBattle?: boolean;
  biomeId?: string;
  rngSeed?: string;
}

interface ActionDecl {
  sessionId: string;
  action: string; // "move:N" | "stance:X" | "switch:..." | "forfeit"
}

interface TurnLog {
  turn: number;
  declarations: ActionDecl[];
  hits: HitResult[];
  status_events: { side: string; events: string[] }[];
}

export class BattleRoom extends Room<BattleState> {
  override maxClients = 2;

  private attacker!: CombatantState;
  private defender!: CombatantState;
  private field!: FieldState;
  private rngSeed = "";

  private attackerSid: string | null = null;
  private defenderSid: string | null = null;
  private isWild = false;

  private declarations: Map<string, string> = new Map();
  private turnLogs: TurnLog[] = [];
  private opts: BattleCreateOptions | null = null;

  override onCreate(options: BattleCreateOptions): void {
    this.opts = options;
    this.setState(new BattleState());
    this.rngSeed = options.rngSeed ?? `battle-${Date.now()}-${Math.random()}`;
    this.state.rngSeed = this.rngSeed;
    this.state.biome = options.biomeId ?? "neutral_arena";
    this.state.phase = "idle";
    this.isWild = options.isWildBattle === true;

    this.attacker = makeCombatant(options.attackerCreature);
    this.defender = makeCombatant(options.defenderCreature);
    this.field = makeField(this.state.biome);

    syncPublic(this.state.attacker, this.attacker);
    syncPublic(this.state.defender, this.defender);

    this.onMessage(CLIENT_MSG.DECLARE_ACTION, (client, msg: { action: string }) => {
      this.handleDeclareAction(client, msg.action);
    });
    this.onMessage(CLIENT_MSG.CHANGE_STANCE, (client, msg: { stance: StanceID }) => {
      const cmb = this.combatantFor(client.sessionId);
      if (cmb) cmb.stance = msg.stance;
    });

    // For wild battles the second seat is server-controlled; pre-decide its
    // first action so we don't block awaiting input.
    if (this.isWild) {
      this.declarations.set("__wild__", "move:0");
    }

    this.startDeclarePhase();
  }

  override onJoin(client: Client): void {
    if (this.attackerSid === null) {
      this.attackerSid = client.sessionId;
    } else if (this.defenderSid === null && !this.isWild) {
      this.defenderSid = client.sessionId;
    } else {
      // Spectator slot — ignore in v0.
    }
  }

  override onLeave(client: Client): void {
    if (this.state.phase !== "ended") {
      this.endBattle(
        client.sessionId === this.attackerSid ? "defender_win" : "attacker_win",
        "abandoned",
      );
    }
  }

  override async onDispose(): Promise<void> {
    if (this.opts && this.state.outcome) {
      try {
        await prisma.battleLog.create({
          data: {
            attackerId: this.opts.attackerUserId ?? null,
            defenderId: this.opts.defenderUserId ?? null,
            isWildBattle: this.isWild,
            attackerCreatureIds: [this.opts.attackerCreature.instance_id],
            defenderCreatureIds: [this.opts.defenderCreature.instance_id],
            biome: this.state.biome,
            rngSeed: this.rngSeed,
            outcome: this.state.outcome,
            turns: this.turnLogs as unknown as object,
            endedAt: new Date(),
          },
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[BattleRoom] failed to persist battle log:", err);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Phase loop
  // -------------------------------------------------------------------------

  private startDeclarePhase(): void {
    this.state.phase = "declaring";
    this.state.turn = (this.state.turn ?? 0) + 1;
    this.declarations.clear();
    if (this.isWild) {
      // Wild AI: pick the first move with cooldown==0; fallback to slot 0.
      const def = this.defender;
      let pick = 0;
      for (let i = 0; i < def.instance.move_instances.length; i++) {
        const mv = def.instance.move_instances[i]!;
        if ((def.cooldowns[mv.move_id] ?? 0) <= 0) {
          pick = i;
          break;
        }
      }
      this.declarations.set("__wild__", `move:${pick}`);
    }

    if (this.declarations.size >= (this.isWild ? 1 : 2)) {
      this.resolveTurn();
    }
  }

  private handleDeclareAction(client: Client, action: string): void {
    if (this.state.phase !== "declaring") return;
    this.declarations.set(client.sessionId, action);

    const needed = this.isWild ? 1 : 2;
    if (this.declarations.size >= needed) {
      this.resolveTurn();
    }
  }

  private resolveTurn(): void {
    this.state.phase = "resolving";

    // Build decl list — order: attacker first, then defender (or wild AI).
    const attackerAction = this.declarations.get(this.attackerSid ?? "") ?? "move:0";
    const defenderAction =
      this.declarations.get(this.defenderSid ?? "") ??
      this.declarations.get("__wild__") ??
      "move:0";

    // Priority — derived from each move's priority_tier; ties broken by
    // initiative_eff (effective stat; here approximated by raw stat).
    const decls: { side: "attacker" | "defender"; action: string }[] = [
      { side: "attacker", action: attackerAction },
      { side: "defender", action: defenderAction },
    ];

    decls.sort((a, b) => {
      const pa = priorityFor(this.combatantFromSide(a.side), a.action);
      const pb = priorityFor(this.combatantFromSide(b.side), b.action);
      if (pa !== pb) return pb - pa;
      const ia = this.combatantFromSide(a.side).instance.core_stats.initiative;
      const ib = this.combatantFromSide(b.side).instance.core_stats.initiative;
      return ib - ia;
    });

    const log: TurnLog = {
      turn: this.state.turn,
      declarations: [
        { sessionId: this.attackerSid ?? "att", action: attackerAction },
        { sessionId: this.defenderSid ?? "def", action: defenderAction },
      ],
      hits: [],
      status_events: [],
    };

    for (const d of decls) {
      if (this.state.phase === "ended") break;
      this.executeAction(d.side, d.action, log);
    }

    // End-of-turn integration on both sides
    const attEvts = integrateTurn(this.attacker, this.field);
    const defEvts = integrateTurn(this.defender, this.field);
    log.status_events.push({ side: "attacker", events: attEvts.triggered_statuses });
    log.status_events.push({ side: "defender", events: defEvts.triggered_statuses });

    for (const id of attEvts.triggered_statuses) {
      this.attacker.active_statuses.push({ status_id: id, remaining_turns: 4 });
      this.broadcast(SERVER_MSG.STATUS_TRIGGERED, { side: "attacker", status: id });
    }
    for (const id of defEvts.triggered_statuses) {
      this.defender.active_statuses.push({ status_id: id, remaining_turns: 4 });
      this.broadcast(SERVER_MSG.STATUS_TRIGGERED, { side: "defender", status: id });
    }

    // Decrement statuses & cooldowns
    decrementStatuses(this.attacker);
    decrementStatuses(this.defender);
    decrementCooldowns(this.attacker);
    decrementCooldowns(this.defender);

    // Sync public state
    syncPublic(this.state.attacker, this.attacker);
    syncPublic(this.state.defender, this.defender);

    this.broadcast(SERVER_MSG.TURN_RESOLVED, {
      turn: this.state.turn,
      log,
    });
    this.turnLogs.push(log);

    // KO check
    if (this.attacker.current_s <= 0 && this.defender.current_s <= 0) {
      this.endBattle("draw", "double_ko");
      return;
    }
    if (this.attacker.current_s <= 0) return this.endBattle("defender_win", "ko");
    if (this.defender.current_s <= 0) return this.endBattle("attacker_win", "ko");

    if (this.state.turn >= 100) return this.endBattle("draw", "turn_cap");

    this.startDeclarePhase();
  }

  private executeAction(
    side: "attacker" | "defender",
    action: string,
    log: TurnLog,
  ): void {
    const actor = this.combatantFromSide(side);
    const target = side === "attacker" ? this.defender : this.attacker;

    if (action === "forfeit") {
      this.endBattle(
        side === "attacker" ? "defender_win" : "attacker_win",
        "forfeit",
      );
      return;
    }

    const [verb, arg] = action.split(":");

    if (verb === "stance" && arg) {
      actor.stance = arg as StanceID;
      return;
    }

    if (verb === "move") {
      const slot = Number(arg ?? "0");
      const move = actor.instance.move_instances[slot];
      if (!move) return;

      const cooldownLeft = actor.cooldowns[move.move_id] ?? 0;
      if (cooldownLeft > 0) return;

      const snapshot: BattleSnapshot = {
        attacker: actor,
        defender: target,
        field: this.field,
        turn: this.state.turn,
        rng_seed: `${this.rngSeed}:${this.state.turn}:${side}:${slot}`,
      };

      const result = resolveHit(snapshot, move);
      log.hits.push(result);

      if (result.hit) {
        target.current_s = Math.max(0, target.current_s - result.stamina_loss);
        // Apply queued accumulator impulses to the target
        for (const [k, v] of Object.entries(result.breakdown.accumulator_impulses_applied) as Array<[keyof typeof target.accumulators, number]>) {
          target.accumulators[k] = Math.max(-1, Math.min(1, target.accumulators[k] + (v ?? 0)));
        }
      }

      actor.cooldowns[move.move_id] = move.cooldown_turns;

      this.broadcast(SERVER_MSG.HIT_RESOLVED, {
        side,
        moveId: move.move_id,
        moveTitle: move.system_display_title || assembleDisplayName(move),
        result,
      });

      for (const line of log.hits[log.hits.length - 1]?.breakdown.rules_fired ?? []) {
        this.broadcast(SERVER_MSG.RULE_FIRED, { side, rule: line });
      }
    }
  }

  private endBattle(
    outcome: "attacker_win" | "defender_win" | "draw" | "abandoned",
    reason: string,
  ): void {
    if (this.state.phase === "ended") return;
    this.state.phase = "ended";
    this.state.outcome = outcome;
    this.broadcast(SERVER_MSG.BATTLE_END, { outcome, reason });
    this.disconnect().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[BattleRoom] disconnect error:", err);
    });
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private combatantFor(sid: string): CombatantState | null {
    if (sid === this.attackerSid) return this.attacker;
    if (sid === this.defenderSid) return this.defender;
    return null;
  }

  private combatantFromSide(side: "attacker" | "defender"): CombatantState {
    return side === "attacker" ? this.attacker : this.defender;
  }
}

function priorityFor(c: CombatantState, action: string): number {
  if (action === "forfeit") return 99;
  const [verb, arg] = action.split(":");
  if (verb === "stance") return 1; // stance changes happen in priority tier +1
  if (verb === "move" && arg !== undefined) {
    const move = c.instance.move_instances[Number(arg)];
    return move?.priority_tier ?? 0;
  }
  return 0;
}

function makeCombatant(creature: CreatureInstance): CombatantState {
  return {
    instance: creature,
    current_s: creature.s_max,
    accumulators: emptyAccumulators(),
    active_statuses: [],
    stance: "grounded",
    cooldowns: {},
    combo_charges: [],
  };
}

function makeField(biomeId: string): FieldState {
  return {
    biome_id: biomeId,
    ambient_temp: 20,
    humidity: 0.5,
    luminance: 0.5,
    acoustic_reflection: 0.5,
    field_flags: [],
    affinity_power_modifiers: {},
    passive_per_turn: {},
  };
}

function decrementStatuses(c: CombatantState): void {
  c.active_statuses = c.active_statuses
    .map((s) => ({ ...s, remaining_turns: s.remaining_turns - 1 }))
    .filter((s) => s.remaining_turns > 0);
}

function decrementCooldowns(c: CombatantState): void {
  for (const k of Object.keys(c.cooldowns)) {
    c.cooldowns[k] = Math.max(0, (c.cooldowns[k] ?? 0) - 1);
  }
}

function syncPublic(pub: CombatantPublic, c: CombatantState): void {
  pub.instanceId = c.instance.instance_id;
  pub.speciesId = c.instance.species_id;
  pub.nickname = c.instance.species_id;
  pub.current_s = Math.round(c.current_s);
  pub.s_max = c.instance.s_max;
  pub.dominantAffinity = dominantAffinity(c.instance);
  pub.stance = c.stance;
  pub.statuses.clear();
  for (const s of c.active_statuses) pub.statuses.push(s.status_id);
  for (const [k, v] of Object.entries(c.accumulators)) {
    pub.accumulators.set(k, Math.round(Math.max(-1, Math.min(1, v as number)) * 100));
  }
}

function dominantAffinity(creature: CreatureInstance): string {
  const e = creature.affinity_emphasis;
  let bestKey = "TH";
  let bestVal = -Infinity;
  for (const [k, v] of Object.entries(e)) {
    if ((v as number) > bestVal) {
      bestVal = v as number;
      bestKey = k;
    }
  }
  return bestKey;
}

void emptyStatusGuard; // keep reference for future extension
