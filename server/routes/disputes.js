// server/routes/disputes.js
import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import Dispute from "../models/Dispute.js";
import Booking from "../models/Booking.js";
import Freelancer from "../models/Freelancer.js";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/auth.js";
import {
  sendDisputeCreated,
  sendDisputeResolved,
} from "../services/notificationService.js";
import { deductScore } from "../services/honorScoreService.js";
import { notify } from "../utils/notify.js";
import Razorpay from "razorpay";

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
});

// ── GET /api/disputes (admin) ─────────────────────────────────────
router.get("/", protect, authorize("admin"), async (req, res) => {
  try {
    const q = req.query.status ? { status: req.query.status } : {};
    const disputes = await Dispute.find(q)
      .populate({
        path: "bookingId",
        populate: [
          { path: "clientId", select: "name email avatar honorScore" },
          { path: "freelancerId", select: "title user profilePic name" },
        ],
      })
      .populate("raisedBy", "name email avatar role honorScore")
      .sort({ createdAt: -1 });
    res.json(disputes);
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

// ── GET /api/disputes/my ──────────────────────────────────────────
router.get("/my", protect, async (req, res) => {
  try {
    const clientBookingIds = await Booking.find({
      clientId: req.user._id,
    }).distinct("_id");

    let flBookingIds = [];
    if (req.user.role === "freelancer") {
      const fl = await Freelancer.findOne({ user: req.user._id }).lean();
      if (fl) {
        flBookingIds = await Booking.find({ freelancerId: fl._id }).distinct(
          "_id",
        );
      }
    }

    const allIds = [...clientBookingIds, ...flBookingIds];
    const disputes = await Dispute.find({
      $or: [{ raisedBy: req.user._id }, { bookingId: { $in: allIds } }],
    })
      .populate({
        path: "bookingId",
        populate: [
          { path: "clientId", select: "name email avatar" },
          { path: "freelancerId", select: "title user profilePic name" },
        ],
      })
      .populate("raisedBy", "name email avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, disputes });
  } catch (err) {
    console.error("MY DISPUTES:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ── GET /api/disputes/:id ─────────────────────────────────────────
router.get("/:id", protect, async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate({
        path: "bookingId",
        populate: [
          { path: "clientId", select: "name email avatar" },
          { path: "freelancerId", select: "title user profilePic name" },
        ],
      })
      .populate("raisedBy", "name email avatar role");

    if (!dispute) return res.status(404).json({ msg: "Dispute not found" });

    const booking = dispute.bookingId;
    const isClient =
      booking?.clientId?._id?.toString() === req.user._id.toString();
    const isRaiser =
      dispute.raisedBy?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    // FIX: check freelancer via Freelancer model
    let isFreelancer = false;
    if (req.user.role === "freelancer") {
      const fl = await Freelancer.findOne({ user: req.user._id }).lean();
      isFreelancer =
        fl && booking?.freelancerId?._id?.toString() === fl._id.toString();
    }

    if (!isClient && !isRaiser && !isAdmin && !isFreelancer)
      return res.status(403).json({ msg: "Access denied" });

    res.json({ success: true, dispute });
  } catch (err) {
    console.error("GET DISPUTE:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ── POST /api/disputes ────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  const { bookingId, reason } = req.body;
  try {
    const booking = await Booking.findById(bookingId)
      .populate("clientId")
      .populate("freelancerId");
    if (!booking) return res.status(404).json({ msg: "Booking not found" });

    const isClient =
      booking.clientId._id.toString() === req.user._id.toString();

    // FIX: compare against Freelancer's user field, not the Freelancer _id
    let isFreelancer = false;
    if (req.user.role === "freelancer") {
      const fl = await Freelancer.findOne({ user: req.user._id }).lean();
      isFreelancer =
        fl && booking.freelancerId._id.toString() === fl._id.toString();
    }

    if (!isClient && !isFreelancer)
      return res.status(403).json({ msg: "Unauthorized" });

    // ── Block disputes after money has already moved ──────────────
    // "released"   = client approved and paid freelancer → too late to dispute
    // "refunded"   = money already returned to client → nothing to dispute
    // "field_paid" = field work confirmed and paid → too late
    if (["released", "refunded", "field_paid"].includes(booking.paymentStatus))
      return res.status(400).json({
        msg:
          booking.paymentStatus === "refunded"
            ? "This booking was already refunded — no dispute needed."
            : "Payment has already been released. Raise disputes before approving payment.",
      });

    // Only active bookings can be disputed (not yet paid out)
    if (
      !["confirmed", "in_progress", "pending_approval", "completed"].includes(
        booking.status,
      )
    )
      return res.status(400).json({ msg: "Can only dispute active bookings" });

    // Digital: dispute window is while payment is held (in_progress).
    // Once client clicks Release, paymentStatus becomes "released" — blocked above.
    // Extra guard: if completed + digital, money is already gone.
    if (booking.status === "completed" && booking.serviceCategory === "digital")
      return res.status(400).json({
        msg: "Digital booking completed and payment released. Disputes must be raised before releasing payment.",
      });

    const existing = await Dispute.findOne({ bookingId });
    if (existing)
      return res
        .status(409)
        .json({ msg: "Dispute already exists for this booking" });

    const dispute = await Dispute.create({
      bookingId,
      raisedBy: req.user._id,
      reason,
    });

    await sendDisputeCreated(booking.clientId._id, dispute._id);
    await sendDisputeCreated(booking.freelancerId.user, dispute._id);

    const admins = await User.find({ role: "admin" }).distinct("_id");
    await Promise.all(admins.map((id) => sendDisputeCreated(id, dispute._id)));

    booking.status = "disputed";
    booking.disputeLocked = true;
    await booking.save();

    res.status(201).json({ success: true, dispute });
  } catch (err) {
    console.error("CREATE DISPUTE:", err);
    res.status(500).json({ msg: "Failed to create dispute" });
  }
});

// ── POST /api/disputes/:id/evidence ──────────────────────────────
router.post(
  "/:id/evidence",
  protect,
  upload.single("file"),
  async (req, res) => {
    try {
      const dispute = await Dispute.findById(req.params.id);
      if (!dispute) return res.status(404).json({ msg: "Dispute not found" });
      if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

      const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const result = await cloudinary.uploader.upload(b64, {
        folder: "pocketlancer/disputes",
      });

      dispute.evidence.push({
        url: result.secure_url,
        type: req.file.mimetype.includes("pdf") ? "pdf" : "image",
        uploadedBy: req.user._id,
      });
      await dispute.save();

      res.json({ success: true, url: result.secure_url });
    } catch {
      res.status(500).json({ msg: "Upload failed" });
    }
  },
);

// ── PATCH /api/disputes/:id/status (admin) ────────────────────────
router.patch("/:id/status", protect, authorize("admin"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["open", "under_review"].includes(status))
      return res.status(400).json({ msg: "Invalid status" });

    const dispute = await Dispute.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );
    if (!dispute) return res.status(404).json({ msg: "Not found" });

    res.json({ success: true, dispute });
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

// ── PATCH /api/disputes/:id/resolve (admin) ───────────────────────
router.patch("/:id/resolve", protect, authorize("admin"), async (req, res) => {
  const { resolution, adminNotes } = req.body;

  // Digital bookings → financial resolutions
  // Field bookings   → honour-score-only resolutions (no money involved)
  const DIGITAL_RESOLUTIONS = [
    "refund_to_client",
    "release_to_freelancer",
    "split",
  ];
  const FIELD_RESOLUTIONS = [
    "favour_client",
    "favour_freelancer",
    "both_at_fault",
  ];
  const ALL = [...DIGITAL_RESOLUTIONS, ...FIELD_RESOLUTIONS];

  if (!ALL.includes(resolution))
    return res.status(400).json({ msg: "Invalid resolution" });
  if (!adminNotes?.trim())
    return res.status(400).json({ msg: "Admin notes are required" });

  try {
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ msg: "Dispute not found" });
    if (dispute.status === "resolved")
      return res.status(400).json({ msg: "Already resolved" });

    const booking = await Booking.findById(dispute.bookingId)
      .populate("clientId", "_id name")
      .populate("freelancerId", "user title");
    if (!booking) return res.status(404).json({ msg: "Booking not found" });

    // Cross-category guard
    if (
      booking.serviceCategory === "field" &&
      DIGITAL_RESOLUTIONS.includes(resolution)
    )
      return res
        .status(400)
        .json({
          msg: "Field bookings must use favour_client / favour_freelancer / both_at_fault.",
        });
    if (
      booking.serviceCategory === "digital" &&
      FIELD_RESOLUTIONS.includes(resolution)
    )
      return res
        .status(400)
        .json({
          msg: "Digital bookings must use refund_to_client / release_to_freelancer / split.",
        });

    dispute.status = "resolved";
    dispute.resolution = resolution;
    dispute.adminNotes = adminNotes;
    await dispute.save();

    booking.disputeLocked = false;

    // ── DIGITAL: financial + honour-score resolution ──────────────
    if (
      booking.serviceCategory === "digital" &&
      booking.paymentStatus === "held"
    ) {
      const paise = Math.round((booking.escrowAmount || 0) * 100);

      if (resolution === "refund_to_client") {
        const refund = await razorpay.payments
          .refund(booking.razorpayPaymentId, { amount: paise })
          .catch(() => null);
        booking.paymentStatus = "refunded";
        booking.refundedAmount = booking.escrowAmount;
        if (refund) booking.razorpayRefundId = refund.id;
        booking.refundedAt = new Date();
        booking.status = "cancelled";
        await deductScore(
          booking.freelancerId.user,
          10,
          `Dispute ruled against you — "${booking.serviceType}"`,
        );
        await notify({
          userId: booking.freelancerId.user,
          type: "honor_score_changed",
          message: `Honor Score −10: dispute ruled against you for "${booking.serviceType}".`,
          link: `/freelancer/bookings`,
        });
        await notify({
          userId: booking.clientId._id,
          type: "refund_initiated",
          message: `₹${(booking.escrowAmount || 0).toLocaleString("en-IN")} refund approved for "${booking.serviceType}". Dispute resolved in your favour.`,
          link: `/bookings/${booking._id}`,
        });
      } else if (resolution === "release_to_freelancer") {
        booking.paymentStatus = "released";
        booking.releasedAmount = booking.escrowAmount;
        booking.releasedAt = new Date();
        booking.status = "completed";
        await deductScore(
          booking.clientId._id,
          10,
          `Dispute ruled against you — "${booking.serviceType}"`,
        );
        await notify({
          userId: booking.clientId._id,
          type: "honor_score_changed",
          message: `Honor Score −10: dispute ruled against you for "${booking.serviceType}".`,
          link: `/bookings/${booking._id}`,
        });
        await notify({
          userId: booking.freelancerId.user,
          type: "payment_released",
          message: `₹${(booking.escrowAmount || 0).toLocaleString("en-IN")} released — dispute resolved in your favour for "${booking.serviceType}".`,
          link: `/freelancer/bookings`,
        });
      } else if (resolution === "split") {
        const half = Math.floor(paise / 2);
        await razorpay.payments
          .refund(booking.razorpayPaymentId, { amount: half })
          .catch(() => null);
        booking.paymentStatus = "partial_refund";
        booking.refundedAmount = booking.escrowAmount / 2;
        booking.releasedAmount = booking.escrowAmount / 2;
        booking.status = "completed";
        await deductScore(
          booking.clientId._id,
          5,
          `Dispute split — "${booking.serviceType}"`,
        );
        await deductScore(
          booking.freelancerId.user,
          5,
          `Dispute split — "${booking.serviceType}"`,
        );
        await notify({
          userId: booking.clientId._id,
          type: "honor_score_changed",
          message: `Dispute split 50/50 for "${booking.serviceType}". Honor Score −5.`,
          link: `/bookings/${booking._id}`,
        });
        await notify({
          userId: booking.freelancerId.user,
          type: "honor_score_changed",
          message: `Dispute split 50/50 for "${booking.serviceType}". Honor Score −5.`,
          link: `/freelancer/bookings`,
        });
      }

      // ── FIELD: honour-score-only resolution (no money involved) ──
    } else if (booking.serviceCategory === "field") {
      booking.status = "completed";

      if (resolution === "favour_client") {
        await deductScore(
          booking.freelancerId.user,
          10,
          `Field dispute ruled against you — "${booking.serviceType}"`,
        );
        await notify({
          userId: booking.freelancerId.user,
          type: "honor_score_changed",
          message: `Honor Score −10: field dispute ruled against you for "${booking.serviceType}". Please ensure quality service.`,
          link: `/freelancer/bookings`,
        });
        await notify({
          userId: booking.clientId._id,
          type: "dispute_resolved",
          message: `Your dispute for "${booking.serviceType}" was resolved in your favour.`,
          link: `/bookings/${booking._id}`,
        });
      } else if (resolution === "favour_freelancer") {
        await deductScore(
          booking.clientId._id,
          10,
          `Field dispute ruled against you — "${booking.serviceType}"`,
        );
        await notify({
          userId: booking.clientId._id,
          type: "honor_score_changed",
          message: `Honor Score −10: field dispute ruled against you for "${booking.serviceType}".`,
          link: `/bookings/${booking._id}`,
        });
        await notify({
          userId: booking.freelancerId.user,
          type: "dispute_resolved",
          message: `Field dispute for "${booking.serviceType}" resolved in your favour. Thank you for your professionalism.`,
          link: `/freelancer/bookings`,
        });
      } else if (resolution === "both_at_fault") {
        await deductScore(
          booking.clientId._id,
          5,
          `Field dispute — both at fault — "${booking.serviceType}"`,
        );
        await deductScore(
          booking.freelancerId.user,
          5,
          `Field dispute — both at fault — "${booking.serviceType}"`,
        );
        await notify({
          userId: booking.clientId._id,
          type: "honor_score_changed",
          message: `Honor Score −5: field dispute for "${booking.serviceType}" — both parties held responsible.`,
          link: `/bookings/${booking._id}`,
        });
        await notify({
          userId: booking.freelancerId.user,
          type: "honor_score_changed",
          message: `Honor Score −5: field dispute for "${booking.serviceType}" — both parties held responsible.`,
          link: `/freelancer/bookings`,
        });
      }
    } else {
      booking.status = "completed";
    }

    await booking.save();

    await sendDisputeResolved(booking.clientId._id, resolution);
    await sendDisputeResolved(booking.freelancerId.user, resolution);

    res.json({ success: true, dispute });
  } catch (err) {
    console.error("RESOLVE DISPUTE:", err);
    res.status(500).json({ msg: "Failed to resolve dispute" });
  }
});

export default router;
