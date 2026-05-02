// server/models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        // Bookings
        "booking_created",
        "booking_confirmed",
        "booking_cancelled",
        "booking_completed",
        "booking_rejected", // ← NEW: freelancer rejected the booking
        // Disputes
        "dispute_created",
        "dispute_resolved",
        "dispute_updated",
        // Auth
        "password_reset",
        // Admin
        "admin_message",
        // Payments
        "payment_released",
        "payment_received",
        "refund_initiated", // ← NEW: refund is being processed
        "payment_failed",
        "message_received",
        // Honor score
        "honor_score_changed",
        // Misc
        "review_received",
        "profile_updated",
        // Field
        "freelancer_arrived", // ← NEW: freelancer marked arrived
      ],
      required: true,
    },
    message: { type: String, required: true, maxlength: 300 },
    link: { type: String, default: "" },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

// TTL: auto-delete after 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.model("Notification", notificationSchema);
