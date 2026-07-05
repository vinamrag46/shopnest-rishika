/**
 * routes/chat.js
 * ----------------------------------------------------------------------
 * HTTP layer: validates incoming requests, calls the escalation detector
 * and the Gemini service, and shapes the response sent back to the
 * frontend. Contains no API keys and no prompt text — just orchestration.
 * ----------------------------------------------------------------------
 */

const express = require("express");
const router = express.Router();
const { generateReply } = require("../services/geminiService");
const { detectEscalation } = require("../config/escalation");

// Very simple in-memory rate limiter per IP (demo-grade; swap for redis/express-rate-limit in production)
const requestLog = new Map();
const RATE_LIMIT = 15; // requests
const WINDOW_MS = 60 * 1000; // per 1 minute

function isRateLimited(ip) {
  const now = Date.now();
  const entry = requestLog.get(ip) || [];
  const recent = entry.filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

router.post("/", async (req, res) => {
  try {
    const ip = req.ip;
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: "Too many requests. Please slow down." });
    }

    const { history, language, message } = req.body;

    if (!Array.isArray(history) || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Request must include 'message' (string) and 'history' (array)." });
    }

    const escalation = detectEscalation(message);

    const reply = await generateReply(history);

    res.json({ reply, escalation });
  } catch (err) {
    console.error("[POST /api/chat] error:", err.message);
    res.status(500).json({ error: "Something went wrong generating a reply. Please try again shortly." });
  }
});

module.exports = router;
