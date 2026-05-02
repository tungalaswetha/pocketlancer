// server/routes/health.js
// Lightweight ping endpoint for UptimeRobot.
// Keeps the Render free-plan server alive — no auth required.

import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// GET /api/health
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

export default router;
