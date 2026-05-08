// @wildloom/protocol — Colyseus message names + lightweight DTOs shared
// between web client and gameserver. Full schemas land alongside the rooms.

export const ROOM_NAMES = {
  WORLD: "world",
  BATTLE: "battle",
} as const;

export type RoomName = (typeof ROOM_NAMES)[keyof typeof ROOM_NAMES];

// Message names — single source of truth.
export const CLIENT_MSG = {
  PLAYER_MOVE: "player_move",
  ENTER_ENCOUNTER_TILE: "enter_encounter_tile",
  REQUEST_CHUNK: "request_chunk",
  DECLARE_ACTION: "declare_action",
  CHANGE_STANCE: "change_stance",
  CHAT: "chat",
} as const;

export const SERVER_MSG = {
  CHUNK_DATA: "chunk_data",
  ENCOUNTER_TRIGGERED: "encounter_triggered",
  HIT_RESOLVED: "hit_resolved",
  TURN_RESOLVED: "turn_resolved",
  STATUS_TRIGGERED: "status_triggered",
  BATTLE_END: "battle_end",
  RULE_FIRED: "rule_fired",
} as const;

export interface PlayerMoveMsg {
  x: number;
  y: number;
  facing: 0 | 1 | 2 | 3; // N/E/S/W
  ts: number;
}

export interface EnterEncounterTileMsg {
  tile_x: number;
  tile_y: number;
}

export interface DeclareActionMsg {
  /// "move:<slot>" | "switch:<creature_id>" | "stance:<stance_id>" | "forfeit"
  action: string;
}
