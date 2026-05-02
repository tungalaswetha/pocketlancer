// server/jobs/bookingJobs.js
import cron from "node-cron";
import Razorpay from "razorpay";
import Booking from "../models/Booking.js";
import Freelancer from "../models/Freelancer.js";
import Dispute from "../models/Dispute.js";
import { deductScore, rewardScore } from "../services/honorScoreService.js";
import { notify } from "../utils/notify.js";
import { sendDisputeResolved } from "../services/notificationService.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─────────────────────────────────────────────────────────────────
// FIELD: Auto-cancel when freelancer never arrives (6h past booking time)
// Runs every hour
// ─────────────────────────────────────────────────────────────────
async function runFieldNoShow() {
  // Any field booking still "confirmed" with no arrival, whose preferredDate
  // was more than 6 hours ago → freelancer is a no-show.
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

  const noShows = await Booking.find({
    serviceCategory: "field",
    status: "confirmed",
    arrivalVerified: false,
    // preferredDate is a string "YYYY-MM-DD" — cast to date comparison
    updatedAt: { $lt: sixHoursAgo },
    createdAt: { $lt: sixHoursAgo },
  }).lean();

  for (const b of noShows) {
    try {
      // Only process bookings whose date has actually passed
      const bookingDate = b.startTime || new Date(b.preferredDate);
      if (bookingDate > sixHoursAgo) continue; // not yet overdue

      await Booking.findByIdAndUpdate(b._id, {
        status: "cancelled",
        paymentStatus:
          b.paymentStatus === "field_pending" ? "refunded" : b.paymentStatus,
      });

      // Penalise freelancer −5 for no-show
      const fl = await Freelancer.findById(b.freelancerId).lean();
      if (fl?.user) {
        await deductScore(
          fl.user,
          5,
          `No-show for field booking "${b.serviceType}"`,
        );
        await notify({
          userId: fl.user,
          type: "booking_cancelled",
          message: `Booking "${b.serviceType}" was auto-cancelled — you did not mark arrival within 6 hours. Honor Score −5.`,
          link: `/freelancer/bookings`,
        });
      }

      // Notify client
      await notify({
        userId: b.clientId,
        type: "booking_cancelled",
        message: `Your booking "${b.serviceType}" was cancelled — the freelancer did not arrive. We apologise for the inconvenience.`,
        link: `/bookings/${b._id}`,
      });

      console.log(`[bookingJobs] Field no-show cancelled: ${b._id}`);
    } catch (err) {
      console.error(`[bookingJobs] field no-show error ${b._id}:`, err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// DIGITAL: Auto-refund when freelancer misses deadline
// Runs every hour
// ─────────────────────────────────────────────────────────────────
async function runDeadlineRefunds() {
  const overdue = await Booking.find({
    serviceCategory: "digital",
    paymentStatus: "held",
    status: { $in: ["confirmed", "pending"] },
    deadline: { $lt: new Date() },
  }).lean();

  for (const b of overdue) {
    try {
      const paise = Math.round((b.escrowAmount || 0) * 100);
      if (paise < 100) continue;

      const refund = await razorpay.payments.refund(b.razorpayPaymentId, {
        amount: paise,
      });

      await Booking.findByIdAndUpdate(b._id, {
        paymentStatus: "refunded",
        refundedAmount: b.escrowAmount,
        razorpayRefundId: refund.id,
        refundedAt: new Date(),
        status: "cancelled",
      });

      // Penalise freelancer −5
      const fl = await Freelancer.findById(b.freelancerId).lean();
      if (fl?.user) {
        await deductScore(fl.user, 5, `Missed deadline for "${b.serviceType}"`);
        await notify({
          userId: fl.user,
          type: "booking_cancelled",
          message: `Your booking "${b.serviceType}" was auto-cancelled and refunded — deadline missed. Honor Score −5.`,
          link: `/freelancer/bookings`,
        });
      }

      // Notify client of refund
      await notify({
        userId: b.clientId,
        type: "payment_released",
        message: `Your payment for "${b.serviceType}" was auto-refunded — the freelancer missed the delivery deadline.`,
        link: `/bookings/${b._id}`,
      });

      console.log(`[bookingJobs] Deadline refund: ${b._id}`);
    } catch (err) {
      console.error(
        `[bookingJobs] deadline refund error ${b._id}:`,
        err.message,
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// DIGITAL: Auto-release when client delays approving delivered work
// Runs every hour
// ─────────────────────────────────────────────────────────────────
async function runAutoRelease() {
  const stale = await Booking.find({
    serviceCategory: "digital",
    paymentStatus: "held",
    status: "in_progress",
    autoReleaseAt: { $lt: new Date() },
  }).lean();

  for (const b of stale) {
    try {
      await Booking.findByIdAndUpdate(b._id, {
        paymentStatus: "released",
        releasedAmount: b.escrowAmount,
        releasedAt: new Date(),
        status: "completed",
      });

      // Penalise client −5 for holding payment
      await deductScore(
        b.clientId,
        5,
        `Delayed payment release for "${b.serviceType}"`,
      );
      await notify({
        userId: b.clientId,
        type: "payment_released",
        message: `Payment for "${b.serviceType}" was auto-released after 7 days of inaction. Honor Score −5.`,
        link: `/bookings/${b._id}`,
      });

      // Reward freelancer +2
      const fl = await Freelancer.findById(b.freelancerId).lean();
      if (fl?.user) {
        await rewardScore(fl.user, 2);
        await notify({
          userId: fl.user,
          type: "payment_released",
          message: `₹${(b.escrowAmount || 0).toLocaleString("en-IN")} auto-released to you for "${b.serviceType}". Honor Score +2.`,
          link: `/freelancer/bookings`,
        });
      }

      console.log(`[bookingJobs] Auto-release: ${b._id}`);
    } catch (err) {
      console.error(`[bookingJobs] auto-release error ${b._id}:`, err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// FIELD: Auto-confirm if client doesn't respond in 48 h
// Runs every hour
// ─────────────────────────────────────────────────────────────────
async function runFieldAutoApprove() {
  const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const pending = await Booking.find({
    serviceCategory: "field",
    status: "pending_approval",
    updatedAt: { $lt: threshold },
  }).lean();

  for (const b of pending) {
    try {
      await Booking.findByIdAndUpdate(b._id, {
        status: "completed",
        paymentStatus: "field_paid",
      });

      const fl = await Freelancer.findById(b.freelancerId).lean();
      if (fl?.user) {
        await rewardScore(fl.user, 2);
        await notify({
          userId: fl.user,
          type: "booking_completed",
          message: `"${b.serviceType}" auto-confirmed after 48 h. Great work! Honor Score +2.`,
          link: `/freelancer/bookings`,
        });
      }

      await notify({
        userId: b.clientId,
        type: "booking_completed",
        message: `"${b.serviceType}" was auto-confirmed — you had 48 h to review. Please leave a review!`,
        link: `/bookings/${b._id}`,
      });

      console.log(`[bookingJobs] Field auto-approve: ${b._id}`);
    } catch (err) {
      console.error(
        `[bookingJobs] field auto-approve error ${b._id}:`,
        err.message,
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// DISPUTE SLA: auto-resolve open disputes after 5 days
// ─────────────────────────────────────────────────────────────────
async function runDisputeSLA() {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

  const stale = await Dispute.find({
    status: "open",
    createdAt: { $lte: fiveDaysAgo },
  });

  for (const dispute of stale) {
    try {
      dispute.status = "resolved";
      dispute.resolution = "release_to_freelancer";
      dispute.adminNotes = "Auto-resolved by SLA (5 days without admin action)";
      await dispute.save();

      const booking = await Booking.findById(dispute.bookingId)
        .populate("clientId", "_id")
        .populate("freelancerId", "user");

      if (booking) {
        booking.disputeLocked = false;
        await booking.save();
        await sendDisputeResolved(
          booking.clientId._id,
          "release_to_freelancer",
        );
        await sendDisputeResolved(
          booking.freelancerId.user,
          "release_to_freelancer",
        );
      }

      console.log(`[bookingJobs] Dispute SLA resolved: ${dispute._id}`);
    } catch (err) {
      console.error(
        `[bookingJobs] dispute SLA error ${dispute._id}:`,
        err.message,
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Register all jobs — call once at server startup
// ─────────────────────────────────────────────────────────────────
export function registerBookingJobs() {
  // Hourly: field no-show + deadline refunds + auto-release + field auto-approve
  cron.schedule("0 * * * *", async () => {
    console.log("[bookingJobs] Running hourly jobs…");
    await Promise.allSettled([
      runFieldNoShow(),
      runDeadlineRefunds(),
      runAutoRelease(),
      runFieldAutoApprove(),
    ]);
  });

  // Daily at 3 AM: dispute SLA
  cron.schedule("0 3 * * *", async () => {
    console.log("[bookingJobs] Running dispute SLA…");
    await runDisputeSLA();
  });

  console.log("[bookingJobs] Cron jobs registered.");
}
