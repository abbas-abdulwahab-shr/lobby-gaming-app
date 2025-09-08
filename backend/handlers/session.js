// SSE clients
const sessionClients = [];

export function sessionStreamHandler(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sessionClients.push(res);

  req.on('close', () => {
    const idx = sessionClients.indexOf(res);
    if (idx !== -1) sessionClients.splice(idx, 1);
  });
}

function broadcastSessionUpdate(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sessionClients.forEach(client => client.write(payload));
}

export async function getCurrentSessionHandler(req, res, db) {
  try {
    // Get the most recent active session (no end_time)
    const session = await db.get("SELECT * FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1");
    if (!session) return res.json({ active: false });
    // Get users in session
    const users = await db.all("SELECT u.username, su.picked_number FROM session_users su JOIN users u ON su.user_id = u.id WHERE su.session_id = ?", [session.id]);
    res.json({ active: true, session, users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch session" });
  }
}


export async function startSessionHandler(req, res, db) {
  try {
    const { started_by } = req.body;
    const now = new Date().toISOString();
    const result = await db.run("INSERT INTO sessions (started_by, start_time) VALUES (?, ?)", [started_by, now]);
    const session = await db.get("SELECT * FROM sessions WHERE id = ?", [result.lastID]);
    // Get initial participants (should be empty)
    const participants = await db.all("SELECT u.username FROM session_users su JOIN users u ON su.user_id = u.id WHERE su.session_id = ? AND su.left_at IS NULL", [session.id]);
    broadcastSessionUpdate({ type: "session_started", session, participants: participants.map(p => p.username), timestamp: Date.now(), duration: 20 });
    // Start timer for session end (20 seconds)
    let secondsRemaining = 20;
    const timerInterval = setInterval(() => {
      secondsRemaining -= 1;
      if (secondsRemaining > 0) {
        broadcastSessionUpdate({ type: "timer_update", session_id: session.id, seconds_remaining: secondsRemaining });
      }
    }, 1000);
    setTimeout(async () => {
      clearInterval(timerInterval);
      // Get latest session (should still be active)
      const activeSession = await db.get("SELECT * FROM sessions WHERE id = ? AND end_time IS NULL", [session.id]);
      if (!activeSession) return;
      // Always pick a random winning number between 1 and 9
      const winning_number = Math.floor(Math.random() * 9) + 1;
      // End session and broadcast
      try {
        console.log("[DEBUG] Auto-ending session", session.id);
        await db.run("UPDATE sessions SET end_time = CURRENT_TIMESTAMP, winning_number = ? WHERE id = ?", [winning_number, session.id]);
        await db.run("UPDATE session_users SET is_winner = 1 WHERE session_id = ? AND picked_number = ?", [session.id, winning_number]);
        const winners = await db.all("SELECT u.username FROM session_users su JOIN users u ON su.user_id = u.id WHERE su.session_id = ? AND su.is_winner = 1", [session.id]);
        for (const winner of winners) {
          await db.run("UPDATE users SET wins = wins + 1 WHERE username = ?", [winner.username]);
        }
        // Get all participants (users who joined this session)
        const participants = await db.all("SELECT u.username FROM session_users su JOIN users u ON su.user_id = u.id WHERE su.session_id = ?", [session.id]);
        const payload = {
          type: "session_ended",
          session_id: session.id,
          winning_number,
          winners: winners.map(w => w.username),
          participants: participants.map(p => p.username),
          timestamp: Date.now()
        };
        console.log("[DEBUG] Broadcasting session_ended event:", payload);
        broadcastSessionUpdate(payload);
        // Start preparation timer for next session (20s)
        let prepSeconds = 20;
        const prepInterval = setInterval(() => {
          prepSeconds -= 1;
          if (prepSeconds > 0) {
            broadcastSessionUpdate({ type: "prep_timer_update", seconds_remaining: prepSeconds });
          }
        }, 1000);
        setTimeout(() => {
          clearInterval(prepInterval);
          broadcastSessionUpdate({ type: "prep_timer_done" });
        }, 20000);
      } catch (err) {
        // Log error but don't crash
        console.error("Failed to auto-end session:", err);
      }
    }, 20000); // 20 seconds
    res.json({ success: true, sessionId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: "Failed to start session" });
  }
}

export async function joinSessionHandler(req, res, db) {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: "User ID required" });
  try {
    // Get current session
    const session = await db.get("SELECT * FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1");
    if (!session) return res.status(404).json({ error: "No active session" });
    // Check if user already joined
    const alreadyJoined = await db.get("SELECT * FROM session_users WHERE session_id = ? AND user_id = ? AND left_at IS NULL", [session.id, user_id]);
    if (alreadyJoined) return res.status(409).json({ error: "User already in session" });
    // Check session user cap (default 10, can be set via env)
    const maxUsers = parseInt(process.env.SESSION_USER_CAP || "10", 10);
    const userCount = await db.get("SELECT COUNT(*) as count FROM session_users WHERE session_id = ? AND left_at IS NULL", [session.id]);
    if (userCount.count >= maxUsers) return res.status(403).json({ error: "Session is full" });
    // Add user to session
  await db.run("INSERT INTO session_users (session_id, user_id) VALUES (?, ?)", [session.id, user_id]);
  // Get updated participants
  const participants = await db.all("SELECT u.username FROM session_users su JOIN users u ON su.user_id = u.id WHERE su.session_id = ? AND su.left_at IS NULL", [session.id]);
  broadcastSessionUpdate({ type: "user_joined", session_id: session.id, user_id, participants: participants.map(p => p.username), timestamp: Date.now() });
  res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to join session" });
  }
}

export async function leaveSessionHandler(req, res, db) {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: "User ID required" });
  try {
    // Get current sessiont
    const session = await db.get("SELECT * FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1");
    if (!session) return res.status(404).json({ error: "No active session" });
    // Mark user as left
  await db.run("UPDATE session_users SET left_at = CURRENT_TIMESTAMP WHERE session_id = ? AND user_id = ? AND left_at IS NULL", [session.id, user_id]);
  // Get updated participants
  const participants = await db.all("SELECT u.username FROM session_users su JOIN users u ON su.user_id = u.id WHERE su.session_id = ? AND su.left_at IS NULL", [session.id]);
  broadcastSessionUpdate({ type: "user_left", session_id: session.id, user_id, participants: participants.map(p => p.username), timestamp: Date.now() });
  res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to leave session" });
  }
}

export async function pickNumberHandler(req, res, db) {
  const { user_id, picked_number } = req.body;
  if (!user_id || !picked_number) return res.status(400).json({ error: "User ID and picked number required" });
  try {
    // Get current session
    const session = await db.get("SELECT * FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1");
    if (!session) return res.status(404).json({ error: "No active session" });
    // Update picked number for user in session
  await db.run("UPDATE session_users SET picked_number = ? WHERE session_id = ? AND user_id = ? AND left_at IS NULL", [picked_number, session.id, user_id]);
  // Get updated participants and their picks
  const participants = await db.all("SELECT u.username, su.picked_number FROM session_users su JOIN users u ON su.user_id = u.id WHERE su.session_id = ? AND su.left_at IS NULL", [session.id]);
  broadcastSessionUpdate({ type: "number_picked", session_id: session.id, user_id, picked_number, participants, timestamp: Date.now() });
  res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to pick number" });
  }
}

export async function endSessionHandler(req, res, db) {
  const { winning_number } = req.body;
  if (!winning_number) return res.status(400).json({ error: "Winning number required" });
  try {
    // Get current session
    const session = await db.get("SELECT * FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1");
    if (!session) return res.status(404).json({ error: "No active session" });
    // Mark session as ended
    await db.run("UPDATE sessions SET end_time = CURRENT_TIMESTAMP, winning_number = ? WHERE id = ?", [winning_number, session.id]);
    await db.run("UPDATE session_users SET is_winner = 1 WHERE session_id = ? AND picked_number = ?", [session.id, winning_number]);
    const winners = await db.all("SELECT u.username FROM session_users su JOIN users u ON su.user_id = u.id WHERE su.session_id = ? AND su.is_winner = 1", [session.id]);
    for (const winner of winners) {
      await db.run("UPDATE users SET wins = wins + 1 WHERE username = ?", [winner.username]);
    }
    // Get all participants (users who joined this session)
    const participants = await db.all("SELECT u.username FROM session_users su JOIN users u ON su.user_id = u.id WHERE su.session_id = ?", [session.id]);
    broadcastSessionUpdate({
      type: "session_ended",
      session_id: session.id,
      winning_number,
      winners: winners.map(w => w.username),
      participants: participants.map(p => p.username),
      timestamp: Date.now()
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to end session" });
  }
}

export async function getTopPlayersHandler(req, res, db) {
  try {
    const topPlayers = await db.all("SELECT username, wins FROM users ORDER BY wins DESC, created_at ASC LIMIT 10");
    res.json({ players: topPlayers });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch top players" });
  }
}

export async function getSessionsGroupedHandler(req, res, db) {
  try {
    const sessions = await db.all(`
      SELECT date(start_time) as session_date, COUNT(*) as session_count
      FROM sessions
      GROUP BY session_date
      ORDER BY session_date DESC
    `);
    res.json({ grouped: sessions });
  } catch (err) {
    res.status(500).json({ error: "Failed to group sessions" });
  }
}

export async function getWinnersGroupedHandler(req, res, db) {
  const { period } = req.query;
  let groupBy, dateFormat;
  if (period === "month") {
    groupBy = "strftime('%Y-%m', end_time)";
    dateFormat = "%Y-%m";
  } else if (period === "week") {
    groupBy = "strftime('%Y-%W', end_time)";
    dateFormat = "%Y-%W";
  } else {
    groupBy = "date(end_time)";
    dateFormat = "%Y-%m-%d";
  }
  try {
    const rows = await db.all(`
      SELECT ${groupBy} as period, u.username, COUNT(*) as wins
      FROM sessions s
      JOIN session_users su ON su.session_id = s.id
      JOIN users u ON su.user_id = u.id
      WHERE su.is_winner = 1 AND s.end_time IS NOT NULL
      GROUP BY period, u.username
      ORDER BY period DESC, wins DESC
    `);
    // Group by period for frontend
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.period]) grouped[row.period] = [];
      grouped[row.period].push({ username: row.username, wins: row.wins });
    }
    res.json({ grouped });
  } catch (err) {
    res.status(500).json({ error: "Failed to group winners" });
  }
}
