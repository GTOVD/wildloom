import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";

export class CombatantPublic extends Schema {
  @type("string") instanceId: string = "";
  @type("string") speciesId: string = "";
  @type("string") nickname: string = "";
  @type("uint16") current_s: number = 0;
  @type("uint16") s_max: number = 0;
  @type("string") dominantAffinity: string = "thermal";
  @type("string") stance: string = "grounded";
  @type({ array: "string" }) statuses = new ArraySchema<string>();
  // Accumulators expressed as integer percent in [-100, 100] for compact sync.
  @type({ map: "int16" }) accumulators = new MapSchema<number>();
}

export class BattleState extends Schema {
  @type("string") biome: string = "neutral_arena";
  @type("uint16") turn: number = 0;
  @type("string") rngSeed: string = "";
  @type("string") phase: string = "idle"; // idle | declaring | resolving | ended
  @type(CombatantPublic) attacker = new CombatantPublic();
  @type(CombatantPublic) defender = new CombatantPublic();
  @type("string") outcome: string = "";
}
