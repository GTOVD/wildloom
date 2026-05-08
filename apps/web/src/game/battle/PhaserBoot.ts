// Boots a Phaser game for the BattleScene inside a host element.

import * as Phaser from "phaser";

import { BattleScene, type BattleHud, type BattleSceneEvents, type HitVisualization } from "./BattleScene";

export interface BattleHandle {
  destroy(): void;
  setState(s: BattleHud): void;
  playHit(h: HitVisualization): void;
  appendLog(line: string): void;
  flashCallout(text: string): void;
}

export function bootBattleScene(
  parent: HTMLElement,
  initial: BattleHud,
  events: BattleSceneEvents,
): BattleHandle {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 800,
    height: 600,
    backgroundColor: "#0e0a14",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BattleScene],
  });

  game.scene.start("BattleScene", { state: initial, events });

  const handle: BattleHandle = {
    destroy() {
      game.destroy(true);
    },
    setState(s) {
      const scene = game.scene.getScene("BattleScene") as BattleScene | null;
      if (scene && (scene as unknown as { state?: unknown }).state !== undefined) {
        scene.setState(s);
      }
    },
    playHit(h) {
      const scene = game.scene.getScene("BattleScene") as BattleScene | null;
      if (scene) scene.playHit(h);
    },
    appendLog(line) {
      const scene = game.scene.getScene("BattleScene") as BattleScene | null;
      if (scene) scene.appendLog(line);
    },
    flashCallout(text) {
      const scene = game.scene.getScene("BattleScene") as BattleScene | null;
      if (scene) scene.flashCallout(text);
    },
  };
  return handle;
}
