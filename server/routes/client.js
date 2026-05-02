import express from "express";
const router = express.Router();
// ⚠️ IMPORTANT: In ES Modules, local files MUST end with .js
import { protect, authorize } from "../middleware/auth.js";
import Booking from "../models/Booking.js";
// GET /api/client/dashboard
router.get("/dashboard", protect, authorize("client"), async (req, res) => {
  try {
    const userId = req.user._id;
    // Industry Standard: Run all counts at the same time using Promise.all (faster)
    const [pending, confirmed, completed] = await Promise.all([
      Booking.countDocuments({ clientId: userId, status: "pending" }),
      Booking.countDocuments({ clientId: userId, status: "confirmed" }),
      Booking.countDocuments({ clientId: userId, status: "completed" }),
    ]);
    res.json({
      success: true,
      stats: { pending, confirmed, completed },
    });
  } catch (err) {
    console.error("❌ [CLIENT DASHBOARD ERROR]", err);
    res.status(500).json({ msg: "Failed to fetch dashboard stats." });
  }
});
// Use ES Module export
export default router;
