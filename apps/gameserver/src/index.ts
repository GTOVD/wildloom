import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { ROOM_NAMES } from "@wildloom/protocol";
import express from "express";
import { createServer } from "node:http";

import { BattleRoom } from "./rooms/BattleRoom";
import { WorldRoom } from "./rooms/WorldRoom";

const PORT = Number(process.env.COLYSEUS_PORT ?? 2567);

const app = express();

app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define(ROOM_NAMES.WORLD, WorldRoom);
gameServer.define(ROOM_NAMES.BATTLE, BattleRoom);

gameServer
  .listen(PORT)
  .then(() => {
    // eslint-disable-next-line no-console
    console.log(`[wildloom] gameserver listening on :${PORT}`);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[wildloom] failed to start gameserver:", err);
    process.exit(1);
  });
