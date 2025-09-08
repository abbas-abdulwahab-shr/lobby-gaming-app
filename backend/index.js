import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { authHandler } from "./handlers/auth.js";
import { getCurrentSessionHandler, startSessionHandler, joinSessionHandler, leaveSessionHandler, pickNumberHandler, endSessionHandler, getTopPlayersHandler, getSessionsGroupedHandler, sessionStreamHandler, getWinnersGroupedHandler } from "./handlers/session.js";

import morgan from "morgan";
import { logger } from "./middlewares/logger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authenticate } from "./middlewares/auth.js";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(logger);

// Open SQLite database
let db;
(async () => {
  db = await open({
    filename: "./game-lobby.db",
    driver: sqlite3.Database,
  });

  // Load schema from external file
  const schemaPath = path.resolve("./schema/schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  await db.exec(schema);
})();

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Login endpoint
app.post("/api/login", (req, res) => authHandler(req, res, db));
// SSE endpoint for session updates
app.get("/api/session/stream", (req, res) => sessionStreamHandler(req, res));
// Get current session (authenticated)
app.get("/api/session/current", authenticate, (req, res) => getCurrentSessionHandler(req, res, db));

// Group winners by period (month, week, day)
app.get("/api/winners/grouped", authenticate, (req, res) => getWinnersGroupedHandler(req, res, db));

// Start a new session
app.post("/api/session/start", authenticate, (req, res) => startSessionHandler(req, res, db));
// Join a session
app.post("/api/session/join", authenticate, (req, res) => joinSessionHandler(req, res, db));
// Leave a session
app.post("/api/session/leave", authenticate, (req, res) => leaveSessionHandler(req, res, db));
// Pick a number in session
app.post("/api/game/pick", authenticate, (req, res) => pickNumberHandler(req, res, db));
// End session and save results
app.post("/api/session/end", authenticate, (req, res) => endSessionHandler(req, res, db));
// Get top 10 players
app.get("/api/players/top", authenticate, (req, res) => getTopPlayersHandler(req, res, db));
// Group sessions by date
app.get("/api/sessions/grouped", authenticate, (req, res) => getSessionsGroupedHandler(req, res, db));

// Error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
