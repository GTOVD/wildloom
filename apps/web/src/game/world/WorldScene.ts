// Phaser WorldScene — placeholder-color tilemap, WASD movement, encounter trigger.
//
// The scene maintains its own tile cache keyed by chunk; the React host pumps
// chunk_data messages from Colyseus into setChunk(). The scene reports
// player movement and encounter probes back through the events callbacks.

import * as Phaser from "phaser";

const TILE_PX = 32;
const VIEW_TILES_X = 20;
const VIEW_TILES_Y = 14;
const MOVE_TILES_PER_SECOND = 4;

export interface WorldSceneEvents {
  onMove: (x: number, y: number, facing: 0 | 1 | 2 | 3) => void;
  onEnterTile: (x: number, y: number) => void;
}

export interface SerializedTile {
  primary: string;
  secondary?: string;
  blend: number;
}

export interface ChunkPayload {
  cx: number;
  cy: number;
  size: number;
  tiles: SerializedTile[][];
  // Map of biome id -> fill color hex.
  colors: Record<string, string>;
}

interface PeerEntry {
  rect: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
}

export class WorldScene extends Phaser.Scene {
  private events_!: WorldSceneEvents;
  private chunkLayers = new Map<string, Phaser.GameObjects.Container>();
  private colorMap: Record<string, string> = {};

  private playerRect!: Phaser.GameObjects.Rectangle;
  private playerLabel!: Phaser.GameObjects.Text;
  private cam!: Phaser.Cameras.Scene2D.Camera;

  private px = 0;
  private py = 0;
  private facing: 0 | 1 | 2 | 3 = 2;
  private lastTileX = 0;
  private lastTileY = 0;
  private accumMs = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { [k: string]: Phaser.Input.Keyboard.Key };
  private peers = new Map<string, PeerEntry>();

  constructor() {
    super("WorldScene");
  }

  init(data: { events: WorldSceneEvents }): void {
    this.events_ = data.events;
  }

  create(): void {
    this.cam = this.cameras.main;
    this.cam.setBackgroundColor("#0e0a14");

    this.playerRect = this.add.rectangle(0, 0, TILE_PX - 6, TILE_PX - 6, 0xfde68a)
      .setStrokeStyle(2, 0x1a1224)
      .setDepth(10);
    this.playerLabel = this.add.text(0, 0, "you", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#1a1224",
    }).setOrigin(0.5).setDepth(11);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
      }) as Record<string, Phaser.Input.Keyboard.Key>;
    }

    this.cam.setSize(VIEW_TILES_X * TILE_PX, VIEW_TILES_Y * TILE_PX);
    this.updateCamera();
  }

  override update(_time: number, delta: number): void {
    let dx = 0;
    let dy = 0;
    const left = this.cursors?.left.isDown || this.wasdKeys?.A?.isDown;
    const right = this.cursors?.right.isDown || this.wasdKeys?.D?.isDown;
    const up = this.cursors?.up.isDown || this.wasdKeys?.W?.isDown;
    const down = this.cursors?.down.isDown || this.wasdKeys?.S?.isDown;
    if (left) dx -= 1;
    if (right) dx += 1;
    if (up) dy -= 1;
    if (down) dy += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      const step = (MOVE_TILES_PER_SECOND * delta) / 1000;
      this.px += (dx / len) * step;
      this.py += (dy / len) * step;
      if (Math.abs(dy) > Math.abs(dx)) this.facing = dy < 0 ? 0 : 2;
      else this.facing = dx > 0 ? 1 : 3;

      this.updateCamera();
      this.events_.onMove(this.px, this.py, this.facing);

      const tileX = Math.floor(this.px);
      const tileY = Math.floor(this.py);
      if (tileX !== this.lastTileX || tileY !== this.lastTileY) {
        this.lastTileX = tileX;
        this.lastTileY = tileY;
        this.events_.onEnterTile(tileX, tileY);
      }
    }
    this.accumMs += delta;
  }

  // -------------------------------------------------------------------------

  setChunk(payload: ChunkPayload): void {
    Object.assign(this.colorMap, payload.colors);
    const key = `${payload.cx},${payload.cy}`;
    const existing = this.chunkLayers.get(key);
    if (existing) existing.destroy();

    const container = this.add.container(0, 0);
    for (let ty = 0; ty < payload.size; ty++) {
      for (let tx = 0; tx < payload.size; tx++) {
        const tile = payload.tiles[ty]?.[tx];
        if (!tile) continue;
        const wx = (payload.cx * payload.size + tx) * TILE_PX;
        const wy = (payload.cy * payload.size + ty) * TILE_PX;
        const color = parseColor(this.colorMap[tile.primary] ?? "#888888");
        const rect = this.add.rectangle(
          wx + TILE_PX / 2,
          wy + TILE_PX / 2,
          TILE_PX,
          TILE_PX,
          color,
        );
        if (tile.secondary && tile.blend > 0.6) {
          rect.setStrokeStyle(1, parseColor(this.colorMap[tile.secondary] ?? "#888888"));
        }
        container.add(rect);
      }
    }
    this.chunkLayers.set(key, container);
  }

  setPeers(peers: Array<{ id: string; x: number; y: number; name: string }>): void {
    const seen = new Set<string>();
    for (const p of peers) {
      seen.add(p.id);
      const wx = p.x * TILE_PX + TILE_PX / 2;
      const wy = p.y * TILE_PX + TILE_PX / 2;
      let entry = this.peers.get(p.id);
      if (!entry) {
        const rect = this.add.rectangle(wx, wy, TILE_PX - 6, TILE_PX - 6, 0x9ad6e8)
          .setStrokeStyle(1, 0x1a1224)
          .setDepth(8);
        const text = this.add.text(wx, wy - 16, p.name, {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#cfd8dc",
        }).setOrigin(0.5).setDepth(9);
        entry = { rect, text };
        this.peers.set(p.id, entry);
      } else {
        entry.rect.setPosition(wx, wy);
        entry.text.setPosition(wx, wy - 16);
        entry.text.setText(p.name);
      }
    }
    for (const [id, e] of this.peers.entries()) {
      if (!seen.has(id)) {
        e.rect.destroy();
        e.text.destroy();
        this.peers.delete(id);
      }
    }
  }

  setLocalPosition(x: number, y: number): void {
    this.px = x;
    this.py = y;
    this.updateCamera();
  }

  // -------------------------------------------------------------------------

  private updateCamera(): void {
    const wx = this.px * TILE_PX;
    const wy = this.py * TILE_PX;
    this.playerRect.setPosition(wx + TILE_PX / 2, wy + TILE_PX / 2);
    this.playerLabel.setPosition(wx + TILE_PX / 2, wy + TILE_PX / 2);
    this.cam.centerOn(wx, wy);
  }
}

function parseColor(hex: string): number {
  return parseInt(hex.replace(/^#/, ""), 16) || 0x888888;
}

export const WORLD_SCENE_TILE_PX = TILE_PX;
