// Phaser BattleScene — Gen 1 layout, placeholder colored circles per affinity.

import * as Phaser from "phaser";
import { AFFINITY_COLOR_HEX, type AffinityID } from "@wildloom/types";

export interface BattleSidePublic {
  speciesId: string;
  nickname: string;
  current_s: number;
  s_max: number;
  dominantAffinity: AffinityID;
  statuses: string[];
  /// Map of accumulator key -> value in [-1, 1].
  accumulators?: Record<string, number>;
}

const METER_KEYS: ReadonlyArray<{ key: string; label: string; color: number }> = [
  { key: "fracture", label: "FRC", color: 0xc8a07b },
  { key: "heat_load", label: "HEAT", color: 0xff6b3d },
  { key: "wetness", label: "WET", color: 0x1f78d1 },
  { key: "concussion", label: "CON", color: 0xb066d6 },
  { key: "charge_buildup", label: "CHG", color: 0xf4d03f },
  { key: "corrosion", label: "COR", color: 0x9aff66 },
];

export interface BattleHud {
  attacker: BattleSidePublic;
  defender: BattleSidePublic;
  moves: Array<{
    title: string;
    affinity?: AffinityID;
    cooldownLeft: number;
    accuracy: number;
    base_power: number;
  }>;
  turn: number;
  phase: string;
}

export interface BattleSceneEvents {
  onSelectMove: (slot: number) => void;
  onChangeStance: (stance: string) => void;
}

export interface HitVisualization {
  side: "attacker" | "defender";
  damage: number;
  rules_fired: string[];
}

export class BattleScene extends Phaser.Scene {
  private state: BattleHud | null = null;
  private listeners: BattleSceneEvents | null = null;

  // Visual nodes
  private bg!: Phaser.GameObjects.Rectangle;
  private defenderCircle!: Phaser.GameObjects.Arc;
  private attackerCircle!: Phaser.GameObjects.Arc;

  private defenderHpBar!: Phaser.GameObjects.Rectangle;
  private defenderHpBg!: Phaser.GameObjects.Rectangle;
  private attackerHpBar!: Phaser.GameObjects.Rectangle;
  private attackerHpBg!: Phaser.GameObjects.Rectangle;

  private defenderLabel!: Phaser.GameObjects.Text;
  private attackerLabel!: Phaser.GameObjects.Text;

  private logText!: Phaser.GameObjects.Text;

  private moveButtons: Phaser.GameObjects.Rectangle[] = [];
  private moveLabels: Phaser.GameObjects.Text[] = [];

  private attackerMeterBars: Phaser.GameObjects.Rectangle[] = [];
  private defenderMeterBars: Phaser.GameObjects.Rectangle[] = [];

  private logBuffer: string[] = [];

  constructor() {
    super("BattleScene");
  }

  init(data: { state: BattleHud; events: BattleSceneEvents }): void {
    this.state = data.state;
    this.listeners = data.events;
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // Backdrop
    this.bg = this.add.rectangle(W / 2, H / 2, W, H, 0x16122a);

    // Battle field — Gen 1 layout: defender upper-right, attacker lower-left
    this.defenderCircle = this.add.circle(W * 0.72, H * 0.30, 60, 0x666666);
    this.attackerCircle = this.add.circle(W * 0.28, H * 0.55, 70, 0x666666);

    // HP bars
    this.defenderHpBg = this.add.rectangle(W * 0.5, H * 0.10, 360, 18, 0x333333);
    this.defenderHpBar = this.add.rectangle(W * 0.5 - 178, H * 0.10, 356, 14, 0x4ade80).setOrigin(0, 0.5);
    this.attackerHpBg = this.add.rectangle(W * 0.5, H * 0.42, 360, 18, 0x333333);
    this.attackerHpBar = this.add.rectangle(W * 0.5 - 178, H * 0.42, 356, 14, 0x4ade80).setOrigin(0, 0.5);

    // Labels
    this.defenderLabel = this.add.text(W * 0.32, H * 0.07, "Defender", {
      fontFamily: "monospace", fontSize: "16px", color: "#f4ecd8",
    });
    this.attackerLabel = this.add.text(W * 0.32, H * 0.39, "Attacker", {
      fontFamily: "monospace", fontSize: "16px", color: "#f4ecd8",
    });

    // Accumulator meter strips
    this.buildMeters("defender", W * 0.5, H * 0.16);
    this.buildMeters("attacker", W * 0.5, H * 0.48);

    // Log box
    this.logText = this.add.text(W * 0.04, H * 0.55, "", {
      fontFamily: "monospace", fontSize: "13px", color: "#cfd8dc",
      wordWrap: { width: W * 0.92 },
    });

    // 2x4 move grid below
    this.buildMoveGrid();

    this.refreshUi();
  }

  private buildMeters(side: "attacker" | "defender", centerX: number, y: number): void {
    const meterW = 50;
    const gap = 6;
    const totalW = METER_KEYS.length * meterW + (METER_KEYS.length - 1) * gap;
    const startX = centerX - totalW / 2;

    for (let i = 0; i < METER_KEYS.length; i++) {
      const cfg = METER_KEYS[i]!;
      const x = startX + i * (meterW + gap);
      this.add.rectangle(x + meterW / 2, y, meterW, 6, 0x222233);
      const bar = this.add
        .rectangle(x, y, meterW, 6, cfg.color)
        .setOrigin(0, 0.5);
      bar.setSize(0, 6);
      this.add.text(x + meterW / 2, y - 12, cfg.label, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#cfd8dc",
      }).setOrigin(0.5);
      if (side === "attacker") {
        this.attackerMeterBars.push(bar);
      } else {
        this.defenderMeterBars.push(bar);
      }
    }
  }

  private buildMoveGrid(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const cols = 4;
    const rows = 2;
    const cellW = (W - 40) / cols;
    const cellH = 60;
    const yStart = H - rows * cellH - 20;

    for (let i = 0; i < cols * rows; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = 20 + c * cellW + cellW / 2;
      const y = yStart + r * cellH + cellH / 2;
      const rect = this.add.rectangle(x, y, cellW - 8, cellH - 8, 0x261d3e)
        .setStrokeStyle(2, 0x6c4fa1)
        .setInteractive({ useHandCursor: true });
      rect.on("pointerdown", () => {
        if (this.listeners && this.canSelectMove(i)) {
          this.listeners.onSelectMove(i);
        }
      });
      const label = this.add.text(x, y - 8, "—", {
        fontFamily: "monospace", fontSize: "12px", color: "#f4ecd8",
        wordWrap: { width: cellW - 16 },
        align: "center",
      }).setOrigin(0.5);
      this.moveButtons.push(rect);
      this.moveLabels.push(label);
    }
  }

  private canSelectMove(slot: number): boolean {
    const m = this.state?.moves[slot];
    if (!m) return false;
    return m.cooldownLeft <= 0;
  }

  // -------------------------------------------------------------------------
  // Public update API — called by host React component on state changes
  // -------------------------------------------------------------------------

  setState(s: BattleHud): void {
    this.state = s;
    this.refreshUi();
  }

  playHit(hit: HitVisualization): void {
    const target = hit.side === "attacker" ? this.defenderCircle : this.attackerCircle;

    this.tweens.add({
      targets: target,
      x: { from: target.x, to: target.x + (Math.random() < 0.5 ? -10 : 10) },
      yoyo: true,
      duration: 80,
      repeat: 2,
    });

    this.cameras.main.flash(120, 220, 60, 30, false);

    this.appendLog(`-${hit.damage} stamina to ${hit.side}`);
    for (const rule of hit.rules_fired) {
      this.appendLog(`  rule fired: ${rule}`);
      this.flashCallout(prettyRuleName(rule));
    }
  }

  flashCallout(text: string): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const callout = this.add.text(W / 2, H * 0.32, text, {
      fontFamily: "monospace",
      fontSize: "28px",
      color: "#ffe87c",
      stroke: "#1a1224",
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setDepth(20);
    this.tweens.add({
      targets: callout,
      alpha: { from: 0, to: 1 },
      y: { from: H * 0.34, to: H * 0.28 },
      duration: 220,
      yoyo: true,
      hold: 600,
      onComplete: () => callout.destroy(),
    });
  }

  appendLog(line: string): void {
    this.logBuffer.push(line);
    if (this.logBuffer.length > 6) this.logBuffer.shift();
    if (this.logText) this.logText.setText(this.logBuffer.join("\n"));
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private refreshUi(): void {
    if (!this.state) return;

    const att = this.state.attacker;
    const def = this.state.defender;

    this.attackerCircle.setFillStyle(parseInt(AFFINITY_COLOR_HEX[att.dominantAffinity].slice(1), 16));
    this.defenderCircle.setFillStyle(parseInt(AFFINITY_COLOR_HEX[def.dominantAffinity].slice(1), 16));

    this.attackerLabel.setText(
      `${att.nickname}  ${att.current_s}/${att.s_max}  [${att.statuses.join(",") || "—"}]`,
    );
    this.defenderLabel.setText(
      `${def.nickname}  ${def.current_s}/${def.s_max}  [${def.statuses.join(",") || "—"}]`,
    );

    const attRatio = Math.max(0, Math.min(1, att.current_s / Math.max(1, att.s_max)));
    const defRatio = Math.max(0, Math.min(1, def.current_s / Math.max(1, def.s_max)));
    this.attackerHpBar.setSize(356 * attRatio, 14);
    this.defenderHpBar.setSize(356 * defRatio, 14);
    this.attackerHpBar.setFillStyle(hpColor(attRatio));
    this.defenderHpBar.setFillStyle(hpColor(defRatio));

    this.refreshMeters(this.attackerMeterBars, att.accumulators);
    this.refreshMeters(this.defenderMeterBars, def.accumulators);

    for (let i = 0; i < this.moveButtons.length; i++) {
      const btn = this.moveButtons[i]!;
      const lbl = this.moveLabels[i]!;
      const m = this.state.moves[i];
      if (!m) {
        btn.setStrokeStyle(2, 0x444444);
        btn.setFillStyle(0x1a142e);
        lbl.setText("—");
        continue;
      }
      const accent = m.affinity ? AFFINITY_COLOR_HEX[m.affinity] : "#6c4fa1";
      btn.setStrokeStyle(2, parseInt(accent.slice(1), 16));
      btn.setFillStyle(m.cooldownLeft > 0 ? 0x261d3e : 0x322752);
      lbl.setText(`${m.title}\nbp ${m.base_power} · acc ${Math.round(m.accuracy)}${m.cooldownLeft > 0 ? ` · cd ${m.cooldownLeft}` : ""}`);
    }
  }

  private refreshMeters(
    bars: Phaser.GameObjects.Rectangle[],
    acc: Record<string, number> | undefined,
  ): void {
    if (!bars.length) return;
    for (let i = 0; i < METER_KEYS.length; i++) {
      const cfg = METER_KEYS[i]!;
      const bar = bars[i]!;
      const v = Math.max(0, Math.min(1, acc?.[cfg.key] ?? 0));
      bar.setSize(50 * v, 6);
    }
  }
}

function hpColor(ratio: number): number {
  if (ratio > 0.6) return 0x4ade80;
  if (ratio > 0.3) return 0xfbbf24;
  return 0xef4444;
}

const RULE_PRETTY: Record<string, string> = {
  thermal_shock: "Thermal Shock!",
  steam_burst: "Steam Burst!",
  conduction: "Conduction!",
  fracture_critical: "Fracture!",
  ionization_arc: "Ionization Arc!",
  acid_rinse: "Acid Rinse!",
  shatter_resonance: "Shatter!",
  flash_overdrive: "Flash Overdrive!",
  vacuum_cavitation: "Cavitation!",
  scorched_earth: "Scorched Earth!",
};

function prettyRuleName(rule: string): string {
  return RULE_PRETTY[rule] ?? rule.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
