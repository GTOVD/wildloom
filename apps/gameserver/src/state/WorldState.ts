import { MapSchema, Schema, type } from "@colyseus/schema";

export class PlayerPos extends Schema {
  @type("string") userId: string = "";
  @type("string") displayName: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("uint8") facing: number = 2; // 0=N, 1=E, 2=S, 3=W
}

export class WorldState extends Schema {
  @type("string") seed: string = "";
  @type("string") shortCode: string = "";
  @type({ map: PlayerPos }) players = new MapSchema<PlayerPos>();
}
