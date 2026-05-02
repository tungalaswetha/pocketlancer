// server/routes/bookings.js
import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import Freelancer from "../models/Freelancer.js";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/auth.js";
import { SERVICE_DURATIONS } from "../constants/serviceDurations.js";
import { deductScore, rewardScore } from "../services/honorScoreService.js";
import {
  sendBookingCreated,
  sendBookingConfirmed,
  sendBookingCompleted,
  sendBookingCancelled,
  sendBookingRejected,
  sendRefundInitiated,
} from "../services/notificationService.js";
import { notify } from "../utils/notify.js";

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Helpers ────────────────────────────────────────────────────────
function getServiceDuration(serviceType) {
  if (!serviceType) return 60;
  return SERVICE_DURATIONS?.[serviceType.trim().toLowerCase()] ?? 60;
}

function computeAgreedAmount(freelancer, durationMinutes, overrideHours) {
  if (overrideHours > 0)
    return parseFloat(
      (overrideHours * (freelancer.hourlyRate || 0)).toFixed(2),
    );
  switch (freelancer.pricingType) {
    case "fixed":
      return freelancer.fixedPrice || 0;
    case "milestone":
      return (freelancer.milestones || []).reduce((s, m) => s + m.amount, 0);
    default:
      return parseFloat(
        ((durationMinutes / 60) * (freelancer.hourlyRate || 0)).toFixed(2),
      );
  }
}

function verifyRazorpaySignature(orderId, paymentId, signature) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

// ── Haversine distance (km) between two GPS points ────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── GET /api/bookings/field-today (freelancer dashboard) ──────────
// Returns today's field bookings for the quick-arrive panel
router.get(
  "/field-today",
  protect,
  authorize("freelancer"),
  async (req, res) => {
    try {
      const fl = await Freelancer.findOne({ user: req.user._id }).lean();
      if (!fl) return res.json({ success: true, data: [] });

      const today = new Date().toISOString().split("T")[0];

      const bookings = await Booking.find({
        freelancerId: fl._id,
        serviceCategory: "field",
        status: { $in: ["confirmed", "in_progress"] },
        preferredDate: today,
      })
        .populate("clientId", "name phone avatar")
        .sort({ preferredTime: 1 })
        .lean();

      return res.json({ success: true, data: bookings });
    } catch (err) {
      console.error("FIELD TODAY ERROR:", err);
      return res.status(500).json({ msg: "Server error" });
    }
  },
);

// ── GET /api/bookings/mybookings ──────────────────────────────────
router.get("/mybookings", protect, async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "client") {
      query.clientId = req.user._id;
    } else if (req.user.role === "freelancer") {
      const fl = await Freelancer.findOne({ user: req.user._id }).lean();
      if (!fl) return res.json({ success: true, data: [] });
      query.freelancerId = fl._id;
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .populate("clientId", "name email avatar honorScore")
      .populate(
        "freelancerId",
        "title hourlyRate fixedPrice pricingType user profilePic category",
      );

    return res.json({ success: true, data: bookings });
  } catch (err) {
    console.error("FETCH BOOKINGS ERROR:", err);
    return res.status(500).json({ msg: "Failed to fetch bookings." });
  }
});

// ── GET /api/bookings/:id ─────────────────────────────────────────
router.get("/:id", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("clientId", "name email avatar honorScore")
      .populate({
        path: "freelancerId",
        select:
          "title hourlyRate fixedPrice pricingType user profilePic name category",
        // ✅ FIX: Nested populate to resolve the freelancer's display name from
        // their User document. The Freelancer.name field may be empty for existing
        // accounts — the User.name is the reliable fallback.
        populate: { path: "user", select: "_id name" },
      });

    if (!booking) return res.status(404).json({ msg: "Booking not found" });

    const fl = await Freelancer.findById(booking.freelancerId).lean();
    const isClient =
      booking.clientId._id.toString() === req.user._id.toString();
    const isFreelancer = fl?.user?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isClient && !isFreelancer && !isAdmin)
      return res.status(403).json({ msg: "Access denied" });

    res.json({ success: true, booking });
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

// ── POST /api/bookings ────────────────────────────────────────────
router.post("/", protect, authorize("client"), async (req, res) => {
  const {
    freelancer_id,
    serviceType,
    issueDescription,
    preferredDate,
    preferredTime,
    address,
    advancePayment,
    estimatedHours,
    // ✅ GPS fields from book page location picker
    locationMode, // "current" | "other"
    clientLat,
    clientLng,
  } = req.body;

  try {
    if (!freelancer_id || !serviceType)
      return res.status(400).json({ msg: "Missing required fields" });

    const freelancer = await Freelancer.findById(freelancer_id).populate(
      "user",
      "phone",
    );
    if (!freelancer)
      return res.status(404).json({ msg: "Freelancer not found" });

    if (!freelancer.user?.phone?.trim())
      return res.status(400).json({
        msg: "This freelancer has not added their mobile number yet.",
      });

    const isDigital = freelancer.category === "digital";

    if (!isDigital) {
      if (!preferredDate || !preferredTime || !address)
        return res.status(400).json({
          msg: "Date, time, and address are required for field bookings",
        });
      if (preferredDate < new Date().toISOString().split("T")[0])
        return res.status(400).json({ msg: "Cannot book a past date." });
    }

    const durationMinutes = getServiceDuration(serviceType);
    const dateStr = isDigital
      ? new Date().toISOString().split("T")[0]
      : preferredDate;
    const timeStr = isDigital ? "00:00" : preferredTime;

    let startTime = new Date(`${dateStr}T${timeStr}`);
    if (isNaN(startTime.getTime())) startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    if (!isDigital) {
      const conflict = await Booking.exists({
        freelancerId: freelancer._id,
        status: { $in: ["pending", "confirmed"] },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
      });
      if (conflict)
        return res
          .status(409)
          .json({ msg: "Freelancer already booked at this time" });
    }

    let agreedAmount;
    let bookingMode = "standard";

    if (isDigital && freelancer.pricingType === "hourly") {
      if (advancePayment) {
        agreedAmount = freelancer.advanceAmount || 0;
        bookingMode = "advance";
        if (agreedAmount < 1)
          return res
            .status(400)
            .json({ msg: "Freelancer has not set an advance amount." });
      } else if (estimatedHours > 0) {
        agreedAmount = parseFloat(
          (estimatedHours * (freelancer.hourlyRate || 0)).toFixed(2),
        );
        bookingMode = "hours";
      } else {
        return res.status(400).json({
          msg: "Specify advance payment or estimated hours for hourly digital services.",
        });
      }
    } else {
      agreedAmount = computeAgreedAmount(freelancer, durationMinutes, 0);
    }

    const milestones =
      freelancer.pricingType === "milestone"
        ? freelancer.milestones.map((m) => ({
            title: m.title,
            description: m.description,
            amount: m.amount,
            order: m.order,
            status: "pending",
          }))
        : [];

    const deadline = isDigital
      ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      : undefined;

    const booking = await Booking.create({
      freelancerId: freelancer._id,
      clientId: req.user._id,
      serviceType,
      issueDescription: issueDescription || "",
      serviceCategory: isDigital ? "digital" : "field",
      preferredDate: dateStr,
      preferredTime: timeStr,
      address: isDigital
        ? "Digital Service — No physical address required"
        : address,
      startTime,
      endTime,
      estimatedDurationMinutes:
        bookingMode === "hours" ? estimatedHours * 60 : durationMinutes,
      pricingType: freelancer.pricingType,
      agreedAmount,
      milestones,
      bookingMode,
      paymentStatus: isDigital ? "unpaid" : "field_pending",
      deadline,
      // ✅ Store GPS mode + client coords for arrival proximity check
      locationMode: locationMode || "other",
      clientLat: clientLat ? parseFloat(clientLat) : undefined,
      clientLng: clientLng ? parseFloat(clientLng) : undefined,
    });

    if (!isDigital) {
      await sendBookingCreated(freelancer.user._id, booking._id, {
        serviceType,
        date: dateStr,
      });
    }

    return res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error("CREATE BOOKING ERROR:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

// ── POST /api/bookings/:id/payment/create-order ───────────────────
router.post(
  "/:id/payment/create-order",
  protect,
  authorize("client"),
  async (req, res) => {
    try {
      const clientUser = await User.findById(req.user._id).lean();
      if (!clientUser?.phone?.trim())
        return res.status(400).json({
          msg: "Please add your mobile number before making a payment.",
        });

      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });

      if (booking.clientId.toString() !== req.user._id.toString())
        return res.status(403).json({ msg: "Unauthorized" });
      if (booking.serviceCategory !== "digital")
        return res
          .status(400)
          .json({ msg: "Payment not required for field bookings" });
      if (booking.paymentStatus === "held")
        return res.status(400).json({ msg: "Payment already completed" });

      if (booking.paymentStatus === "pending" && booking.razorpayOrderId) {
        return res.json({
          success: true,
          razorpayOrderId: booking.razorpayOrderId,
          amount: Math.round(booking.agreedAmount * 100),
          currency: "INR",
          keyId: process.env.RAZORPAY_KEY_ID,
          bookingId: booking._id,
        });
      }

      const paise = Math.round(booking.agreedAmount * 100);
      if (paise < 100) return res.status(400).json({ msg: "Amount too small" });

      const order = await razorpay.orders.create({
        amount: paise,
        currency: "INR",
        receipt: `booking_${booking._id}`,
        notes: {
          bookingId: booking._id.toString(),
          serviceType: booking.serviceType,
        },
      });

      booking.razorpayOrderId = order.id;
      booking.paymentStatus = "pending";
      await booking.save();

      return res.json({
        success: true,
        razorpayOrderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        bookingId: booking._id,
      });
    } catch (err) {
      console.error("CREATE ORDER ERROR:", err);
      return res.status(500).json({ msg: "Failed to create payment order" });
    }
  },
);

// ── POST /api/bookings/:id/payment/verify ─────────────────────────
router.post(
  "/:id/payment/verify",
  protect,
  authorize("client"),
  async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
        return res
          .status(400)
          .json({ msg: "Missing payment verification fields" });

      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });

      if (booking.clientId.toString() !== req.user._id.toString())
        return res.status(403).json({ msg: "Unauthorized" });

      if (
        !verifyRazorpaySignature(
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        )
      )
        return res
          .status(400)
          .json({ msg: "Payment verification failed. Invalid signature." });

      booking.razorpayOrderId = razorpay_order_id;
      booking.razorpayPaymentId = razorpay_payment_id;
      booking.paymentStatus = "held";
      booking.escrowAmount = booking.agreedAmount;
      booking.paidAt = new Date();
      booking.autoReleaseAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await booking.save();

      const fl = await Freelancer.findById(booking.freelancerId).lean();
      if (fl?.user) {
        await notify({
          userId: fl.user,
          type: "payment_received",
          message: `₹${booking.agreedAmount.toLocaleString("en-IN")} received in escrow for "${booking.serviceType}". Start working!`,
          link: `/freelancer/bookings`,
        });

        // ✅ FIX: For digital bookings, send the "new booking" push notification
        // HERE (after payment), not at booking creation time. This ensures the
        // freelancer is only alerted once the client's money is secured in escrow.
        await sendBookingCreated(fl.user, booking._id, {
          serviceType: booking.serviceType,
        });
      }

      return res.json({
        success: true,
        booking,
        message: "Payment verified and held in escrow",
      });
    } catch (err) {
      console.error("VERIFY PAYMENT ERROR:", err);
      return res.status(500).json({ msg: "Payment verification failed" });
    }
  },
);

// ── POST /api/bookings/:id/payment/release ────────────────────────
router.post(
  "/:id/payment/release",
  protect,
  authorize("client"),
  async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });

      if (booking.clientId.toString() !== req.user._id.toString())
        return res.status(403).json({ msg: "Unauthorized" });
      if (booking.serviceCategory !== "digital")
        return res
          .status(400)
          .json({ msg: "Only digital bookings use escrow" });
      if (booking.paymentStatus !== "held")
        return res.status(400).json({ msg: "Payment is not in escrow" });
      if (booking.disputeLocked)
        return res
          .status(400)
          .json({ msg: "Booking locked due to active dispute" });

      booking.paymentStatus = "released";
      booking.releasedAmount = booking.escrowAmount;
      booking.releasedAt = new Date();
      booking.status = "completed";
      await booking.save();

      await rewardScore(req.user._id, 2);

      const fl = await Freelancer.findById(booking.freelancerId).lean();
      if (fl?.user) {
        await rewardScore(fl.user, 2);
        await notify({
          userId: fl.user,
          type: "payment_released",
          message: `₹${booking.releasedAmount.toLocaleString("en-IN")} released to you for "${booking.serviceType}". Honor Score +2!`,
          link: `/freelancer/bookings`,
        });
      }

      await notify({
        userId: booking.clientId,
        type: "booking_completed",
        message: `You approved "${booking.serviceType}" and released payment. Honor Score +2!`,
        link: `/bookings/${booking._id}`,
      });

      return res.json({
        success: true,
        booking,
        message: "Payment released to freelancer",
      });
    } catch (err) {
      console.error("RELEASE PAYMENT ERROR:", err);
      return res.status(500).json({ msg: "Failed to release payment" });
    }
  },
);

// ── POST /api/bookings/:id/payment/refund (admin) ─────────────────
router.post(
  "/:id/payment/refund",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });
      if (booking.paymentStatus !== "held")
        return res.status(400).json({ msg: "Payment is not in escrow" });

      const paise = Math.round(booking.escrowAmount * 100);
      const refund = await razorpay.payments.refund(booking.razorpayPaymentId, {
        amount: paise,
      });

      booking.paymentStatus = "refunded";
      booking.refundedAmount = booking.escrowAmount;
      booking.razorpayRefundId = refund.id;
      booking.refundedAt = new Date();
      booking.status = "cancelled";
      await booking.save();

      await notify({
        userId: booking.clientId,
        type: "refund_initiated",
        message: `₹${booking.refundedAmount.toLocaleString("en-IN")} refunded for "${booking.serviceType}".`,
        link: `/bookings/${booking._id}`,
      });

      return res.json({ success: true, booking, refundId: refund.id });
    } catch (err) {
      console.error("REFUND ERROR:", err);
      return res.status(500).json({ msg: "Failed to process refund" });
    }
  },
);

// ── PATCH /api/bookings/:id/status (freelancer) ───────────────────
router.patch(
  "/:id/status",
  protect,
  authorize("freelancer"),
  async (req, res) => {
    const { status } = req.body;

    // ✅ "rejected" added — allows freelancer to decline pending bookings
    if (
      ![
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "rejected",
      ].includes(status)
    )
      return res.status(400).json({ msg: "Invalid status" });

    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });

      const fl = await Freelancer.findOne({ user: req.user._id });
      if (!fl || booking.freelancerId.toString() !== fl._id.toString())
        return res.status(403).json({ msg: "Unauthorized" });

      if (["cancelled", "rejected"].includes(booking.status))
        return res
          .status(400)
          .json({ msg: "Cannot update a cancelled or rejected booking" });
      if (booking.disputeLocked)
        return res
          .status(400)
          .json({ msg: "Booking locked due to active dispute" });

      if (status === "completed" || status === "in_progress") {
        const bookingDateStr = booking.preferredDate; // "2026-03-07"
        const todayStr = new Date().toISOString().split("T")[0]; // "2026-03-07"
        if (bookingDateStr > todayStr)
          return res
            .status(400)
            .json({ msg: "The work date has not arrived yet." });
      }

      // ✅ Only pending bookings can be rejected
      if (status === "rejected" && booking.status !== "pending")
        return res
          .status(400)
          .json({ msg: "Only pending bookings can be rejected" });

      // ✅ Capture old status BEFORE overwriting — needed for honor score checks below
      const previousStatus = booking.status;
      let newStatus = status;

      if (status === "completed") {
        if (booking.serviceCategory === "digital") {
          newStatus = "in_progress";
        } else {
          if (!booking.arrivalVerified) {
            return res.status(400).json({
              msg: "Please mark your arrival at the client location before completing the booking.",
            });
          }
          newStatus = "pending_approval";
        }
      }

      // ✅ Handle rejection + auto-refund
      if (status === "rejected") {
        booking.status = "rejected";

        // If client already paid (digital escrow), auto-refund immediately
        if (booking.paymentStatus === "held" && booking.razorpayPaymentId) {
          try {
            const paise = Math.round((booking.escrowAmount || 0) * 100);
            const refund = await razorpay.payments.refund(
              booking.razorpayPaymentId,
              { amount: paise },
            );
            booking.paymentStatus = "refunded";
            booking.refundedAmount = booking.escrowAmount;
            booking.razorpayRefundId = refund.id;
            booking.refundedAt = new Date();

            await sendRefundInitiated(booking.clientId, booking._id, {
              serviceType: booking.serviceType,
              amount: booking.escrowAmount,
            });
          } catch (refundErr) {
            console.error("AUTO-REFUND ON REJECT ERROR:", refundErr.message);
          }
        }

        await booking.save();
        await sendBookingRejected(booking.clientId, booking._id, {
          serviceType: booking.serviceType,
        });

        return res.json({ success: true, booking });
      }

      booking.status = newStatus;
      await booking.save();

      const meta = { serviceType: booking.serviceType };

      if (status === "confirmed") {
        await sendBookingConfirmed(booking.clientId, booking._id, meta);
        // ✅ Reward freelancer +1 for accepting promptly
        await rewardScore(req.user._id, 1);
        await notify({
          userId: req.user._id,
          type: "honor_score_changed",
          message: `Honor Score +1 for confirming booking: "${booking.serviceType}".`,
          link: `/freelancer/bookings`,
        });
      } else if (status === "completed") {
        if (booking.serviceCategory === "digital") {
          await notify({
            userId: booking.clientId,
            type: "booking_completed",
            message: `Freelancer marked "${booking.serviceType}" as delivered. Please review and release payment.`,
            link: `/bookings/${booking._id}`,
          });
        } else {
          await notify({
            userId: booking.clientId,
            type: "booking_completed",
            message: `Your freelancer marked "${booking.serviceType}" as complete. Please confirm or raise a dispute within 48 hours.`,
            link: `/bookings/${booking._id}`,
          });
        }
      } else if (status === "cancelled") {
        await sendBookingCancelled(booking.clientId, booking._id, meta);
        // ✅ Penalise using previousStatus (booking.status is now "cancelled")
        if (["confirmed", "in_progress"].includes(previousStatus)) {
          await deductScore(
            req.user._id,
            5,
            `Cancelled confirmed booking "${booking.serviceType}"`,
          );
          await notify({
            userId: req.user._id,
            type: "honor_score_changed",
            message: `Honor Score −5 for cancelling a confirmed booking: "${booking.serviceType}".`,
            link: `/freelancer/bookings`,
          });
        }
      }

      return res.json({ success: true, booking });
    } catch (err) {
      console.error("UPDATE STATUS ERROR:", err);
      return res.status(500).json({ msg: "Failed to update booking status" });
    }
  },
);

// ── POST /api/bookings/quick-arrive (freelancer dashboard one-tap) ─
// Convenience endpoint used by the "Today's Field Jobs" panel
router.post(
  "/quick-arrive",
  protect,
  authorize("freelancer"),
  async (req, res) => {
    try {
      const { bookingId, latitude, longitude } = req.body;
      if (!bookingId || latitude === undefined || longitude === undefined)
        return res
          .status(400)
          .json({ msg: "bookingId and GPS coordinates required" });

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng))
        return res.status(400).json({ msg: "Invalid coordinates" });

      const booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });

      const fl = await Freelancer.findOne({ user: req.user._id });
      if (!fl || booking.freelancerId.toString() !== fl._id.toString())
        return res.status(403).json({ msg: "Unauthorized" });

      if (booking.serviceCategory !== "field")
        return res.status(400).json({ msg: "Field bookings only" });

      if (!["confirmed", "in_progress"].includes(booking.status))
        return res
          .status(400)
          .json({ msg: "Booking is not in a confirmable state" });

      if (booking.arrivalVerified)
        return res.status(400).json({ msg: "Arrival already marked" });

      // ✅ GPS proximity check — only when client shared their location
      if (
        booking.locationMode === "current" &&
        booking.clientLat &&
        booking.clientLng
      ) {
        const distKm = haversineKm(
          lat,
          lng,
          booking.clientLat,
          booking.clientLng,
        );
        if (distKm > 0.5)
          return res.status(400).json({
            msg: `You must be within 500m of the client location to mark arrival. You are ${(distKm * 1000).toFixed(0)}m away.`,
          });
      }

      booking.arrivedAt = new Date();
      booking.arrivalLat = lat;
      booking.arrivalLng = lng;
      booking.arrivalVerified = true;
      if (booking.status === "confirmed") booking.status = "in_progress";
      await booking.save();

      await notify({
        userId: booking.clientId,
        type: "freelancer_arrived",
        message: `Your freelancer has arrived for "${booking.serviceType}".`,
        link: `/bookings/${booking._id}`,
      });

      return res.json({ success: true, booking });
    } catch (err) {
      console.error("QUICK ARRIVE ERROR:", err);
      return res.status(500).json({ msg: "Server error" });
    }
  },
);

// ── PATCH /api/bookings/:id/arrive (field freelancer GPS check-in) ─
router.patch(
  "/:id/arrive",
  protect,
  authorize("freelancer"),
  async (req, res) => {
    try {
      const { latitude, longitude } = req.body;
      if (latitude === undefined || longitude === undefined)
        return res.status(400).json({ msg: "GPS coordinates required" });

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng))
        return res.status(400).json({ msg: "Invalid coordinates" });

      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });

      const fl = await Freelancer.findOne({ user: req.user._id });
      if (!fl || booking.freelancerId.toString() !== fl._id.toString())
        return res.status(403).json({ msg: "Unauthorized" });

      if (booking.serviceCategory !== "field")
        return res
          .status(400)
          .json({ msg: "Arrival marking is for field bookings only" });

      if (!["confirmed", "in_progress"].includes(booking.status))
        return res
          .status(400)
          .json({ msg: "Cannot mark arrival for this booking status" });

      // ✅ GPS proximity check — only when client shared their location
      if (
        booking.locationMode === "current" &&
        booking.clientLat &&
        booking.clientLng
      ) {
        const distKm = haversineKm(
          lat,
          lng,
          booking.clientLat,
          booking.clientLng,
        );
        if (distKm > 0.5)
          return res.status(400).json({
            msg: `You must be within 500m of the client location. You are ${(distKm * 1000).toFixed(0)}m away.`,
          });
      }

      booking.arrivedAt = new Date();
      booking.arrivalLat = lat;
      booking.arrivalLng = lng;
      booking.arrivalVerified = true;
      if (booking.status === "confirmed") booking.status = "in_progress";
      await booking.save();

      await notify({
        userId: booking.clientId,
        type: "freelancer_arrived",
        message: `Your freelancer has arrived at your location for "${booking.serviceType}".`,
        link: `/bookings/${booking._id}`,
      });

      return res.json({ success: true, booking });
    } catch (err) {
      console.error("ARRIVE ERROR:", err);
      return res.status(500).json({ msg: "Server error" });
    }
  },
);

// ── PATCH /api/bookings/:id/confirm-field ─────────────────────────
router.patch(
  "/:id/confirm-field",
  protect,
  authorize("client"),
  async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });

      if (booking.clientId.toString() !== req.user._id.toString())
        return res.status(403).json({ msg: "Unauthorized" });
      if (booking.serviceCategory !== "field")
        return res.status(400).json({ msg: "Only for field bookings" });
      if (booking.status !== "pending_approval")
        return res
          .status(400)
          .json({ msg: "Booking is not awaiting your approval" });
      if (booking.disputeLocked)
        return res
          .status(400)
          .json({ msg: "Booking is locked due to a dispute" });

      booking.status = "completed";
      booking.paymentStatus = "field_paid";
      await booking.save();

      await rewardScore(req.user._id, 2);

      const fl = await Freelancer.findById(booking.freelancerId).lean();
      if (fl?.user) {
        await rewardScore(fl.user, 2);
        await notify({
          userId: fl.user,
          type: "booking_completed",
          message: `Client confirmed your work on "${booking.serviceType}". Honor Score +2!`,
          link: `/freelancer/bookings`,
        });
      }

      await notify({
        userId: booking.clientId,
        type: "booking_completed",
        message: `You confirmed "${booking.serviceType}" as completed. Honor Score +2!`,
        link: `/bookings/${booking._id}`,
      });

      return res.json({ success: true, booking });
    } catch (err) {
      console.error("CONFIRM FIELD ERROR:", err);
      return res.status(500).json({ msg: "Server error" });
    }
  },
);

// ── PATCH /api/bookings/:id/milestone/:milestoneId ────────────────
router.patch(
  "/:id/milestone/:milestoneId",
  protect,
  authorize("freelancer"),
  async (req, res) => {
    const { status } = req.body;
    if (!["in_progress", "submitted"].includes(status))
      return res.status(400).json({ msg: "Invalid milestone status" });

    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });

      const fl = await Freelancer.findOne({ user: req.user._id });
      if (booking.freelancerId.toString() !== fl?._id.toString())
        return res.status(403).json({ msg: "Unauthorized" });

      const milestone = booking.milestones.id(req.params.milestoneId);
      if (!milestone)
        return res.status(404).json({ msg: "Milestone not found" });

      milestone.status = status;
      await booking.save();

      if (status === "submitted") {
        await notify({
          userId: booking.clientId,
          type: "booking_completed",
          message: `Milestone "${milestone.title}" submitted for "${booking.serviceType}". Please review and approve.`,
          link: `/bookings/${booking._id}`,
        });
      }

      res.json({ success: true, booking });
    } catch {
      res.status(500).json({ msg: "Server error" });
    }
  },
);

// ── PATCH /api/bookings/:id/milestone/:milestoneId/approve ─────────
router.patch(
  "/:id/milestone/:milestoneId/approve",
  protect,
  authorize("client"),
  async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });
      if (booking.clientId.toString() !== req.user._id.toString())
        return res.status(403).json({ msg: "Only client can approve" });

      const milestone = booking.milestones.id(req.params.milestoneId);
      if (!milestone || milestone.status !== "submitted")
        return res
          .status(400)
          .json({ msg: "Milestone must be submitted first" });

      milestone.status = "approved";
      booking.releasedAmount = (booking.releasedAmount || 0) + milestone.amount;

      const allDone = booking.milestones.every((m) =>
        ["approved", "released"].includes(m.status),
      );
      booking.paymentStatus = allDone ? "released" : "partially_released";
      if (allDone) {
        booking.status = "completed";
        booking.releasedAt = new Date();
        await rewardScore(req.user._id, 2);
      }

      await booking.save();

      const fl = await Freelancer.findById(booking.freelancerId).lean();
      if (fl?.user) {
        if (allDone) await rewardScore(fl.user, 2);
        await notify({
          userId: fl.user,
          type: "payment_released",
          message: `Milestone "${milestone.title}" approved! ₹${milestone.amount.toLocaleString("en-IN")} released.`,
          link: `/freelancer/bookings`,
        });
      }

      res.json({ success: true, booking });
    } catch {
      res.status(500).json({ msg: "Server error" });
    }
  },
);

export default router;
