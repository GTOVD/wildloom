// WorldRoom — overworld room with chunk streaming + wild encounter handoff
// to BattleRoom. See §31.4 / Wave D.2 of the build plan.

import { Room, type Client } from "@colyseus/core";
import { getMvpSpawnSpecies } from "@wildloom/data";
import {
  CLIENT_MSG,
  SERVER_MSG,
  type EnterEncounterTileMsg,
  type PlayerMoveMsg,
} from "@wildloom/protocol";
import { spawnCreature } from "@wildloom/species";
import type { CreatureInstance } from "@wildloom/types";
import {
  CHUNK_SIZE,
  createWorld,
  getChunk,
  rollWildEncounter,
  type World,
} from "@wildloom/worldgen";

import { PlayerPos, WorldState } from "../state/WorldState";

interface WorldCreateOptions {
  seed?: string;
  shortCode?: string;
}

interface JoinOptions {
  userId?: string;
  displayName?: string;
  partyCreature?: CreatureInstance;
}

interface ClientMeta {
  userId: string;
  displayName: string;
  partyCreature: CreatureInstance | null;
  lastChunkKey: string;
  lastEncounterTurn: number;
}

const MOVE_RATE_HZ = 20;
const MOVE_INTERVAL_MS = 1000 / MOVE_RATE_HZ;

export class WorldRoom extends Room<WorldState> {
  override maxClients = 50;
  private world!: World;
  private clientMeta = new Map<string, ClientMeta>();
  private lastMoveTimes = new Map<string, number>();
  private idleDestroyTimer: NodeJS.Timeout | null = null;
  private encounterCooldown = 0;

  override onCreate(options: WorldCreateOptions): void {
    this.setState(new WorldState());
    this.state.seed = options.seed ?? `world-${Math.floor(Math.random() * 1e9)}`;
    this.state.shortCode = options.shortCode ?? this.state.seed.slice(0, 6);
    this.world = createWorld(this.state.seed);

    this.onMessage(CLIENT_MSG.PLAYER_MOVE, (client, msg: PlayerMoveMsg) => {
      this.handlePlayerMove(client, msg);
    });

    this.onMessage(CLIENT_MSG.REQUEST_CHUNK, (client, msg: { cx: number; cy: number }) => {
      this.handleRequestChunk(client, msg);
    });

    this.onMessage(CLIENT_MSG.ENTER_ENCOUNTER_TILE, (client, msg: EnterEncounterTileMsg) => {
      void this.handleEnterEncounterTile(client, msg);
    });
  }

  override onJoin(client: Client, options: JoinOptions = {}): void {
    const meta: ClientMeta = {
      userId: options.userId ?? client.sessionId,
      displayName: options.displayName ?? "Wanderer",
      partyCreature: options.partyCreature ?? null,
      lastChunkKey: "",
      lastEncounterTurn: 0,
    };
    this.clientMeta.set(client.sessionId, meta);

    const pos = new PlayerPos();
    pos.userId = meta.userId;
    pos.displayName = meta.displayName;
    pos.x = 0;
    pos.y = 0;
    pos.facing = 2;
    this.state.players.set(client.sessionId, pos);

    if (this.idleDestroyTimer) {
      clearTimeout(this.idleDestroyTimer);
      this.idleDestroyTimer = null;
    }

    // Send initial chunk neighborhood
    this.streamChunksAround(client, 0, 0);
  }

  override onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
    this.clientMeta.delete(client.sessionId);
    this.lastMoveTimes.delete(client.sessionId);

    if (this.state.players.size === 0) {
      this.idleDestroyTimer = setTimeout(() => {
        this.disconnect().catch(() => undefined);
      }, 5 * 60 * 1000);
    }
  }

  override onDispose(): void {
    if (this.idleDestroyTimer) clearTimeout(this.idleDestroyTimer);
  }

  // -------------------------------------------------------------------------
  // Message handlers
  // -------------------------------------------------------------------------

  private handlePlayerMove(client: Client, msg: PlayerMoveMsg): void {
    const now = Date.now();
    const last = this.lastMoveTimes.get(client.sessionId) ?? 0;
    if (now - last < MOVE_INTERVAL_MS) return;
    this.lastMoveTimes.set(client.sessionId, now);

    const pos = this.state.players.get(client.sessionId);
    if (!pos) return;

    pos.x = clamp(msg.x, -10000, 10000);
    pos.y = clamp(msg.y, -10000, 10000);
    pos.facing = msg.facing & 3;

    const meta = this.clientMeta.get(client.sessionId);
    if (!meta) return;
    const cx = Math.floor(pos.x / CHUNK_SIZE);
    const cy = Math.floor(pos.y / CHUNK_SIZE);
    const key = `${cx},${cy}`;
    if (key !== meta.lastChunkKey) {
      meta.lastChunkKey = key;
      this.streamChunksAround(client, cx, cy);
    }
  }

  private handleRequestChunk(client: Client, msg: { cx: number; cy: number }): void {
    if (Math.abs(msg.cx) > 1000 || Math.abs(msg.cy) > 1000) return;
    const chunk = getChunk(this.world, msg.cx, msg.cy);
    client.send(SERVER_MSG.CHUNK_DATA, {
      cx: msg.cx,
      cy: msg.cy,
      size: chunk.size,
      tiles: serializeTiles(chunk),
    });
  }

  private async handleEnterEncounterTile(
    client: Client,
    msg: EnterEncounterTileMsg,
  ): Promise<void> {
    const meta = this.clientMeta.get(client.sessionId);
    if (!meta || !meta.partyCreature) return;

    const now = Date.now();
    if (now - meta.lastEncounterTurn < 3000) return;
    meta.lastEncounterTurn = now;

    const result = rollWildEncounter(this.world, msg.tile_x, msg.tile_y);
    if (!result.encounter) return;

    const seed = `${this.state.seed}::wild::${msg.tile_x},${msg.tile_y}::${++this.encounterCooldown}`;
    const wild = makeWildCreature(result.biomeId, seed);
    const rngSeed = `${this.state.seed}::battle::${msg.tile_x},${msg.tile_y}::${this.encounterCooldown}`;

    // We hand the wild creature payload to the client. The web client then
    // initiates a fresh BattleRoom via `joinOrCreate` with both creatures —
    // this avoids the dual-room handoff complexity and keeps the WorldRoom
    // free of long-lived state that would need to be ferried.
    client.send(SERVER_MSG.ENCOUNTER_TRIGGERED, {
      biomeId: result.biomeId,
      wildCreature: wild,
      rngSeed,
    });
  }

  // -------------------------------------------------------------------------
  // Chunk streaming + interest management
  // -------------------------------------------------------------------------

  private streamChunksAround(client: Client, cx: number, cy: number): void {
    // 3x3 neighborhood — keeps the per-client bandwidth bounded.
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const chunk = getChunk(this.world, cx + dx, cy + dy);
        client.send(SERVER_MSG.CHUNK_DATA, {
          cx: chunk.cx,
          cy: chunk.cy,
          size: chunk.size,
          tiles: serializeTiles(chunk),
        });
      }
    }
  }

  // Override Colyseus' default sync hook to filter players by interest radius.
  // Note: the actual Colyseus interest-management API has evolved between
  // versions; we keep filtering simple and rely on the small player cap so
  // the room stays well below WS bandwidth limits in MVP.
  // (For the scope of this MVP, broadcasting the players map to all clients
  // is acceptable for ≤50 players. We mark this with SPEC-DEVIATION since
  // §31.10 calls for filtered visibility once player counts grow.)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SerializedTile {
  primary: string;
  secondary?: string;
  blend: number;
}

function serializeTiles(chunk: ReturnType<typeof getChunk>): SerializedTile[][] {
  return chunk.tiles.map((row) =>
    row.map((t) => ({
      primary: t.primary,
      ...(t.secondary ? { secondary: t.secondary } : {}),
      blend: Math.round(t.blend * 100) / 100,
    })),
  );
}

function makeWildCreature(biomeId: string, seed: string): CreatureInstance {
  const mvp = getMvpSpawnSpecies();
  const speciesId = mvp[Math.abs(hashSeed(seed)) % mvp.length]!.id;
  return spawnCreature({
    speciesId,
    biomeId,
    stage: 1,
    level: 5 + (Math.abs(hashSeed(seed + "::lvl")) % 8),
    seed,
  });
}

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
