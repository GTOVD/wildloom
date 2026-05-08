import * as Phaser from "phaser";

import { WorldScene, type WorldSceneEvents, type ChunkPayload } from "./WorldScene";

export interface WorldHandle {
  destroy(): void;
  setChunk(payload: ChunkPayload): void;
  setPeers(peers: Array<{ id: string; x: number; y: number; name: string }>): void;
  setLocalPosition(x: number, y: number): void;
}

export function bootWorldScene(
  parent: HTMLElement,
  events: WorldSceneEvents,
): WorldHandle {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 800,
    height: 560,
    backgroundColor: "#0e0a14",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    pixelArt: true,
    scene: [WorldScene],
  });
  game.scene.start("WorldScene", { events });

  return {
    destroy() {
      game.destroy(true);
    },
    setChunk(payload) {
      const scene = game.scene.getScene("WorldScene") as WorldScene | null;
      if (scene) scene.setChunk(payload);
    },
    setPeers(peers) {
      const scene = game.scene.getScene("WorldScene") as WorldScene | null;
      if (scene) scene.setPeers(peers);
    },
    setLocalPosition(x, y) {
      const scene = game.scene.getScene("WorldScene") as WorldScene | null;
      if (scene) scene.setLocalPosition(x, y);
    },
  };
}
