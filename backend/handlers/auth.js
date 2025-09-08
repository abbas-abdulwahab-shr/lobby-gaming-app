import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";

export async function authHandler(req, res, db) {
    const { username } = req.body;
    console.log("Auth attempt for username:", username);
    
    if (!username) return res.status(400).json({ error: "Username required" });
    try {
        let user = await db.get("SELECT * FROM users WHERE username = ?", [username]);
        if (!user) {
            await db.run("INSERT INTO users (username) VALUES (?)", [username]);
            user = await db.get("SELECT * FROM users WHERE username = ?", [username]);
        }
    // Get wins and losses
    const wins = user.wins || 0;
    // Losses: total sessions played minus wins
    const sessionsPlayedRow = await db.get("SELECT COUNT(*) as count FROM session_users WHERE user_id = ?", [user.id]);
    const sessionsPlayed = sessionsPlayedRow?.count || 0;
    const losses = Math.max(sessionsPlayed - wins, 0);
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "2h" });
    res.json({ token, username: user.username, user_id: user.id, wins, losses });
    } catch (err) {
        res.status(500).json({ error: "Authentication failed" });
    }
}

