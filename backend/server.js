/**
 * server.js
 * ----------------------------------------------------------------------
 * Application entry point. Wires up middleware, mounts routes, and
 * serves the built frontend as static files so the whole app (frontend
 * + backend) can be deployed as a single service.
 * ----------------------------------------------------------------------
 */

require("dotenv").config();
const express = require("express");
const path = require("path");
const chatRoute = require("./routes/chat");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API routes
app.use("/api/chat", chatRoute);

// Health check (useful for hosting platforms + judges checking uptime)
app.get("/api/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// Serve the frontend
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.listen(PORT, () => {
  console.log(`ShopNest Rishika server running on http://localhost:${PORT}`);
});
