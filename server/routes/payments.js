/**
 * server/routes/payments.js
 * ─────────────────────────────────────────────────────────────────
 * Razorpay escrow payment flow:
 *
 * 1. POST /payments/order           → create Razorpay order
 * 2. POST /payments/verify          → verify signature + capture into escrow
 * 3. POST /payments/release/:bookingId     → admin / auto: release to freelancer
 * 4. POST /payments/refund/:bookingId      → admin / auto: refund to client
 * 5. POST /payments/milestone/release      → release a single milestone
 * 6. GET  /payments/booking/:bookingId     → get payment status for a booking
 *
 * Escrow implementation note:
 *   Razorpay doesn't have a native escrow product.
 *   The pattern used here:
 *     - Capture the payment immediately (held in your Razorpay balance)
 *     - Don't settle/transfer until work is approved
 *     - Use Razorpay Route (Transfer API) to pay the freelancer's
 *       linked account when work is confirmed
 *   For now the "release" step records intent — wire up the
 *   Transfer API when you onboard freelancers to Razorpay Route.
 * ─────────────────────────────────────────────────────────────────
 */

import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import Booking from "../models/Booking.js";
import Freelancer from "../models/Freelancer.js";
import { protect, authorize } from "../middleware/auth.js";
import {
  sendPaymentReleased,
  sendPaymentReceived,
} from "../services/notificationService.js";

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─────────────────────────────────────────────────────────────────
// POST /api/payments/order
// Client initiates payment for a booking
// ─────────────────────────────────────────────────────────────────
router.post("/order", protect, async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId).populate("freelancerId");
    if (!booking) return res.status(404).json({ msg: "Booking not found" });

    if (booking.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: "Not your booking" });
    }

    // ✅ FIX: Completed payments are a hard stop
    if (booking.paymentStatus === "held") {
      return res.status(400).json({ msg: "Payment already completed" });
    }

    // ✅ FIX: If a Razorpay order was already created but the user navigated
    // away from the payment modal, reuse the existing order instead of
    // creating a duplicate. This prevents multiple charges for the same booking.
    if (booking.paymentStatus === "pending" && booking.razorpayOrderId) {
      return res.json({
        success: true,
        order: {
          id: booking.razorpayOrderId,
          amount: Math.round(booking.agreedAmount * 100),
          currency: "INR",
        },
        key: process.env.RAZORPAY_KEY_ID,
      });
    }

    if (!["unpaid"].includes(booking.paymentStatus)) {
      return res
        .status(400)
        .json({ msg: "Payment already initiated or completed" });
    }

    if (!["confirmed"].includes(booking.status)) {
      return res
        .status(400)
        .json({ msg: "Booking must be confirmed before payment" });
    }

    // Amount in paise (₹1 = 100 paise)
    const amountPaise = Math.round(booking.agreedAmount * 100);
    if (amountPaise < 100) {
      return res.status(400).json({ msg: "Invalid booking amount" });
    }

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `booking_${booking._id}`,
      notes: {
        bookingId: booking._id.toString(),
        clientId: req.user._id.toString(),
        serviceType: booking.serviceType,
      },
    });

    // Save order ID for verification
    booking.razorpayOrderId = order.id;
    booking.paymentStatus = "pending";
    await booking.save();

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    res
      .status(500)
      .json({ msg: "Failed to create payment order", detail: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/payments/verify
// Verify Razorpay signature after client completes payment
// ─────────────────────────────────────────────────────────────────
router.post("/verify", protect, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
    } = req.body;

    // 1. Verify signature
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      return res
        .status(400)
        .json({ msg: "Payment verification failed — invalid signature" });
    }

    // 2. Update booking
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ msg: "Booking not found" });

    booking.razorpayPaymentId = razorpay_payment_id;
    booking.paymentStatus = "held";
    booking.escrowAmount = booking.agreedAmount;
    booking.paidAt = new Date();
    await booking.save();

    res.json({ success: true, msg: "Payment captured and held in escrow" });
  } catch (err) {
    console.error("VERIFY PAYMENT ERROR:", err);
    res
      .status(500)
      .json({ msg: "Payment verification failed", detail: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/payments/release/:bookingId
// Admin or system: release full escrow to freelancer
// ─────────────────────────────────────────────────────────────────
router.post(
  "/release/:bookingId",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.bookingId)
        .populate("freelancerId")
        .populate("clientId");

      if (!booking) return res.status(404).json({ msg: "Booking not found" });
      if (booking.paymentStatus !== "held") {
        return res.status(400).json({ msg: "Escrow not in held state" });
      }

      // Razorpay Route Transfer: Physically move money to freelancer
      if (booking.freelancerId.razorpayAccountId) {
        try {
          await razorpay.payments.transfer(booking.razorpayPaymentId, {
            transfers: [
              {
                account: booking.freelancerId.razorpayAccountId,
                amount: booking.escrowAmount * 100, // Amount in paise
                currency: "INR",
              },
            ],
          });
        } catch (transferErr) {
          console.error("RAZORPAY TRANSFER ERROR:", transferErr);
          return res.status(500).json({
            msg: "Failed to transfer funds to freelancer. Please verify their linked Razorpay account.",
          });
        }
      } else {
        console.warn(
          `Booking ${booking._id}: Full release triggered, but freelancer ${booking.freelancerId._id} has no razorpayAccountId. Admin must settle manually.`,
        );
      }

      booking.paymentStatus = "released";
      booking.releasedAmount = booking.escrowAmount;
      booking.releasedAt = new Date();
      await booking.save();

      // Notify both parties
      await sendPaymentReleased(booking.clientId._id, {
        amount: booking.releasedAmount,
      });
      await sendPaymentReceived(booking.freelancerId.user, {
        amount: booking.releasedAmount,
      });

      res.json({ success: true, msg: "Escrow released to freelancer" });
    } catch (err) {
      console.error("RELEASE ESCROW ERROR:", err);
      res.status(500).json({ msg: "Release failed", detail: err.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────────
// POST /api/payments/refund/:bookingId
// Admin: refund escrow to client (dispute won by client)
// ─────────────────────────────────────────────────────────────────
router.post(
  "/refund/:bookingId",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const { amount } = req.body; // optional partial refund amount

      const booking = await Booking.findById(req.params.bookingId).populate(
        "clientId",
      );
      if (!booking) return res.status(404).json({ msg: "Booking not found" });
      if (!["held", "partially_released"].includes(booking.paymentStatus)) {
        return res.status(400).json({ msg: "Nothing to refund" });
      }

      const refundAmount =
        amount || booking.escrowAmount - booking.releasedAmount;
      const amountPaise = Math.round(refundAmount * 100);

      // Issue refund via Razorpay
      const refund = await razorpay.payments.refund(booking.razorpayPaymentId, {
        amount: amountPaise,
        notes: { reason: "Dispute resolved in client's favour" },
      });

      booking.razorpayRefundId = refund.id;
      booking.refundedAmount = refundAmount;
      booking.refundedAt = new Date();
      booking.paymentStatus =
        refundAmount >= booking.escrowAmount - booking.releasedAmount
          ? "refunded"
          : "partial_refund";
      await booking.save();

      res.json({
        success: true,
        refundId: refund.id,
        msg: "Refund issued to client",
      });
    } catch (err) {
      console.error("REFUND ERROR:", err);
      res.status(500).json({ msg: "Refund failed", detail: err.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────────
// POST /api/payments/milestone/release
// Release escrow for a specific milestone (admin or auto)
// ─────────────────────────────────────────────────────────────────
router.post(
  "/milestone/release",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const { bookingId, milestoneId } = req.body;

      const booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });

      const milestone = booking.milestones.id(milestoneId);
      if (!milestone)
        return res.status(404).json({ msg: "Milestone not found" });

      if (milestone.status === "released") {
        return res.status(400).json({ msg: "Already released" });
      }

      milestone.status = "released";
      milestone.releasedAt = new Date();

      // Razorpay Route Transfer for the specific milestone amount
      const freelancer = await Freelancer.findById(booking.freelancerId);

      if (freelancer && freelancer.razorpayAccountId) {
        try {
          await razorpay.payments.transfer(booking.razorpayPaymentId, {
            transfers: [
              {
                account: freelancer.razorpayAccountId,
                amount: milestone.amount * 100, // Amount in paise
                currency: "INR",
              },
            ],
          });
        } catch (transferErr) {
          console.error("RAZORPAY MILESTONE TRANSFER ERROR:", transferErr);
          return res.status(500).json({
            msg: "Failed to transfer milestone funds to freelancer. Please verify their linked Razorpay account.",
          });
        }
      } else {
        console.warn(
          `Booking ${booking._id}: Milestone release triggered, but freelancer has no razorpayAccountId. Admin must settle manually.`,
        );
      }

      booking.releasedAmount = (booking.releasedAmount || 0) + milestone.amount;

      const allReleased = booking.milestones.every(
        (m) => m.status === "released",
      );
      booking.paymentStatus = allReleased ? "released" : "partially_released";
      if (allReleased) booking.releasedAt = new Date();

      await booking.save();

      res.json({
        success: true,
        msg: `Milestone "${milestone.title}" released`,
      });
    } catch (err) {
      console.error("MILESTONE RELEASE ERROR:", err);
      res.status(500).json({ msg: "Failed", detail: err.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────────
// GET /api/payments/booking/:bookingId
// Get payment status for a booking (client or freelancer)
// ─────────────────────────────────────────────────────────────────
router.get("/booking/:bookingId", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .select(
        "paymentStatus agreedAmount escrowAmount releasedAmount refundedAmount paidAt releasedAt refundedAt razorpayOrderId milestones pricingType clientId freelancerId",
      )
      .populate("freelancerId", "user");

    if (!booking) return res.status(404).json({ msg: "Not found" });

    // Only allow client or freelancer of this booking
    const isClient = booking.clientId.toString() === req.user._id.toString();
    const isFreelancer =
      booking.freelancerId?.user?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isClient && !isFreelancer && !isAdmin) {
      return res.status(403).json({ msg: "Access denied" });
    }

    res.json({ success: true, payment: booking });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/payments/webhook
// Razorpay webhook (verify signature, update booking)
// Register this URL in Razorpay dashboard → Webhooks
// ─────────────────────────────────────────────────────────────────
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers["x-razorpay-signature"];
      const body = req.body.toString();

      const expectedSig = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");

      if (expectedSig !== signature) {
        return res.status(400).json({ msg: "Invalid webhook signature" });
      }

      const event = JSON.parse(body);

      if (event.event === "payment.captured") {
        const payment = event.payload.payment.entity;
        const bookingId = payment.notes?.bookingId;

        if (bookingId) {
          await Booking.findByIdAndUpdate(bookingId, {
            razorpayPaymentId: payment.id,
            paymentStatus: "held",
            paidAt: new Date(),
          });
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error("WEBHOOK ERROR:", err);
      res.status(500).json({ msg: "Webhook error" });
    }
  },
);

export default router;
