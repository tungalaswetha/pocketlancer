// server/services/notificationService.js
import { notify } from "../utils/notify.js";

// ── Bookings ───────────────────────────────────────────────────────

export async function sendBookingCreated(
  freelancerUserId,
  bookingId,
  meta = {},
) {
  return notify({
    userId: freelancerUserId,
    type: "booking_created",
    message: meta.serviceType
      ? `New booking request for "${meta.serviceType}"${meta.date ? ` on ${meta.date}` : ""}`
      : "You have a new booking request",
    link: `/freelancer/bookings`,
  });
}

export async function sendBookingConfirmed(clientId, bookingId, meta = {}) {
  return notify({
    userId: clientId,
    type: "booking_confirmed",
    message: meta.serviceType
      ? `Your "${meta.serviceType}" booking has been confirmed! The freelancer is on their way.`
      : "Your booking has been confirmed",
    link: `/bookings/${bookingId}`,
  });
}

export async function sendBookingCompleted(clientId, bookingId, meta = {}) {
  return notify({
    userId: clientId,
    type: "booking_completed",
    message: meta.serviceType
      ? `"${meta.serviceType}" has been marked complete. Leave a review!`
      : "Your booking has been completed. Leave a review!",
    link: `/bookings/${bookingId}`,
  });
}

export async function sendBookingCancelled(clientId, bookingId, meta = {}) {
  return notify({
    userId: clientId,
    type: "booking_cancelled",
    message: meta.serviceType
      ? `Your "${meta.serviceType}" booking was cancelled`
      : "Your booking has been cancelled",
    link: `/bookings/${bookingId}`,
  });
}

/**
 * NEW: Freelancer rejected the booking.
 * Notifies client clearly; if payment was held, triggers refund notification too.
 */
export async function sendBookingRejected(clientId, bookingId, meta = {}) {
  return notify({
    userId: clientId,
    type: "booking_rejected",
    message: meta.serviceType
      ? `Your "${meta.serviceType}" booking was declined by the freelancer.${meta.wasPaymentHeld ? " A full refund has been initiated to your account." : ""}`
      : "Your booking was declined by the freelancer.",
    link: `/bookings/${bookingId}`,
  });
}

/**
 * NEW: Refund has been initiated.
 */
export async function sendRefundInitiated(clientId, bookingId, meta = {}) {
  return notify({
    userId: clientId,
    type: "refund_initiated",
    message: meta.amount
      ? `₹${meta.amount.toLocaleString("en-IN")} refund initiated for "${meta.serviceType || "your booking"}". It will reflect in 5–7 business days.`
      : "A refund has been initiated for your booking.",
    link: `/bookings/${bookingId}`,
  });
}

/**
 * NEW: Freelancer arrived at client location.
 */
export async function sendFreelancerArrived(clientId, bookingId, meta = {}) {
  return notify({
    userId: clientId,
    type: "freelancer_arrived",
    message: meta.serviceType
      ? `Your freelancer has arrived at your location for "${meta.serviceType}". Work is starting now!`
      : "Your freelancer has arrived at your location.",
    link: `/bookings/${bookingId}`,
  });
}

// ── Disputes ──────────────────────────────────────────────────────

export async function sendDisputeCreated(userId, disputeId) {
  return notify({
    userId,
    type: "dispute_created",
    message:
      "A dispute has been raised on one of your bookings. Our team will review it shortly.",
    link: `/disputes/${disputeId}`,
  });
}

export async function sendDisputeResolved(userId, resolution) {
  const msg =
    resolution === "refund_to_client"
      ? "Your dispute was resolved — a full refund has been issued to your account."
      : resolution === "release_to_freelancer"
        ? "Your dispute was resolved — payment has been released to the freelancer."
        : "Your dispute was resolved with a 50/50 split.";

  return notify({
    userId,
    type: "dispute_resolved",
    message: msg,
    link: "/bookings",
  });
}

// ── Auth ──────────────────────────────────────────────────────────

export async function sendPasswordReset(userId) {
  return notify({
    userId,
    type: "password_reset",
    message: "Your password has been reset successfully.",
    link: "/login",
  });
}

// ── Admin ─────────────────────────────────────────────────────────

export async function sendAdminMessage(userId, message) {
  return notify({ userId, type: "admin_message", message, link: "/dashboard" });
}

// ── Payments ──────────────────────────────────────────────────────

export async function sendPaymentReleased(userId, amount, serviceType) {
  return notify({
    userId,
    type: "payment_released",
    message: `₹${amount.toLocaleString("en-IN")} released for "${serviceType}"`,
    link: "/bookings",
  });
}

export async function sendPaymentReceived(userId, amount, serviceType) {
  return notify({
    userId,
    type: "payment_received",
    message: `₹${amount.toLocaleString("en-IN")} received in escrow for "${serviceType}". You can start working!`,
    link: "/freelancer/bookings",
  });
}
