import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import User from "../models/User.js";
import Freelancer from "../models/Freelancer.js";
import Booking from "../models/Booking.js";
import Dispute from "../models/Dispute.js";
import { sendAdminMessage } from "../services/notificationService.js";

const router = express.Router();

const guard = [protect, authorize("admin")];

// ── GET /api/admin/stats ─────────────────────────────────────────
router.get("/stats", ...guard, async (req, res) => {
  try {
    const startOfWeek = new Date(Date.now() - 7 * 86400000);
    const startOfMonth = new Date(Date.now() - 30 * 86400000);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      users,
      freelancers,
      bookings,
      openDisputes,
      resolvedDisputes,
      bookingsToday,
      bookingsWeek,
      bookingsMonth,
      revenue,
      pendingEscrow,
    ] = await Promise.all([
      User.countDocuments(),
      Freelancer.countDocuments(),
      Booking.countDocuments(),
      Dispute.countDocuments({ status: "open" }),
      Dispute.countDocuments({ status: "resolved" }),
      Booking.countDocuments({ createdAt: { $gte: startOfDay } }),
      Booking.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Booking.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Booking.aggregate([
        { $match: { paymentStatus: "released" } },
        { $group: { _id: null, total: { $sum: "$releasedAmount" } } },
      ]),
      Booking.aggregate([
        { $match: { paymentStatus: "held" } },
        { $group: { _id: null, total: { $sum: "$escrowAmount" } } },
      ]),
    ]);

    // Chart: last 7 days
    const last7 = new Date(Date.now() - 6 * 86400000);
    const chartRaw = await Booking.aggregate([
      { $match: { createdAt: { $gte: last7 } } },
      { $group: { _id: { $dayOfWeek: "$createdAt" }, count: { $sum: 1 } } },
    ]);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const chart = days.map((d, i) => ({
      name: d,
      count: chartRaw.find((x) => x._id === i + 1)?.count ?? 0,
    }));

    res.json({
      users,
      freelancers,
      bookings,
      openDisputes,
      resolvedDisputes,
      bookingsToday,
      bookingsWeek,
      bookingsMonth,
      totalRevenue: revenue[0]?.total ?? 0,
      pendingEscrow: pendingEscrow[0]?.total ?? 0,
      chart,
    });
  } catch (err) {
    console.error("ADMIN STATS ERROR:", err);
    res.status(500).json({ msg: "Failed to fetch stats" });
  }
});

// ── GET /api/admin/users ─────────────────────────────────────────
router.get("/users", ...guard, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search)
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);
    res.json({
      users,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch users" });
  }
});

// ── GET /api/admin/bookings ──────────────────────────────────────
router.get("/bookings", ...guard, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = status ? { status } : {};
    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate("clientId", "name email")
        .populate("freelancerId", "title user")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Booking.countDocuments(query),
    ]);
    res.json({
      bookings,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch bookings" });
  }
});

// ── GET /api/admin/disputes ──────────────────────────────────────
router.get("/disputes", ...guard, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const disputes = await Dispute.find(query)
      .populate({
        path: "bookingId",
        populate: [
          { path: "clientId", select: "name email avatar" },
          { path: "freelancerId", select: "title user profilePic name" },
        ],
      })
      .populate("raisedBy", "name email avatar role")
      .sort({ createdAt: -1 });
    res.json({ success: true, disputes });
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch disputes" });
  }
});

// ── POST /api/admin/message ──────────────────────────────────────
// Send a custom notification/message to any user
router.post("/message", ...guard, async (req, res) => {
  try {
    const { userId, message, link } = req.body;
    if (!userId || !message)
      return res.status(400).json({ msg: "userId and message required" });
    await sendAdminMessage(userId, message, link);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ msg: "Failed to send message" });
  }
});

// ── PATCH /api/admin/users/:id/role ─────────────────────────────
router.patch("/users/:id/role", ...guard, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["client", "freelancer", "admin"].includes(role))
      return res.status(400).json({ msg: "Invalid role" });
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true },
    ).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ msg: "Failed to update role" });
  }
});

export default router;
