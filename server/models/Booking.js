// server/models/Booking.js
import mongoose from "mongoose";

const BookingMilestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    amount: { type: Number, required: true },
    order: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "in_progress", "submitted", "approved", "released"],
      default: "pending",
    },
    razorpayPaymentId: { type: String, default: "" },
    releasedAt: { type: Date },
  },
  { _id: true },
);

const BookingSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Freelancer",
      required: true,
    },

    serviceType: { type: String, required: true, trim: true },
    issueDescription: { type: String, trim: true, default: "" },

    serviceCategory: {
      type: String,
      enum: ["field", "digital"],
      default: "field",
    },

    startTime: { type: Date },
    endTime: { type: Date },
    estimatedDurationMinutes: { type: Number, default: 60 },
    preferredDate: { type: String, default: "" },
    preferredTime: { type: String, default: "" },
    address: { type: String, trim: true, default: "" },

    // ── Field booking geo-location ─────────────────────────────────
    /** "current" = client shared their live GPS; "other" = manually typed address */
    locationMode: {
      type: String,
      enum: ["current", "other"],
      default: "other",
    },
    /** GPS coordinates provided by client at booking time (locationMode === "current") */
    clientLat: { type: Number },
    clientLng: { type: Number },

    // ── Status ─────────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "in_progress",
        "pending_approval",
        "completed",
        "cancelled",
        "disputed",
        "rejected", // ← NEW: freelancer explicitly rejected
      ],
      default: "pending",
    },

    disputeLocked: { type: Boolean, default: false },

    // ── Pricing ────────────────────────────────────────────────────
    pricingType: {
      type: String,
      enum: ["hourly", "fixed", "milestone"],
      default: "hourly",
    },
    agreedAmount: { type: Number, default: 0 },
    milestones: { type: [BookingMilestoneSchema], default: [] },
    bookingMode: { type: String, default: "standard" },

    // ── Payment / Escrow ───────────────────────────────────────────
    paymentStatus: {
      type: String,
      enum: [
        "unpaid",
        "pending",
        "held",
        "partially_released",
        "released",
        "refunded",
        "partial_refund",
        "field_pending",
        "field_paid",
      ],
      default: "unpaid",
    },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    escrowAmount: { type: Number, default: 0 },
    releasedAmount: { type: Number, default: 0 },
    refundedAmount: { type: Number, default: 0 },
    razorpayRefundId: { type: String, default: "" },
    paidAt: { type: Date },
    releasedAt: { type: Date },
    refundedAt: { type: Date },

    // ── Deadlines & auto-actions ───────────────────────────────────
    /** Digital: if freelancer misses this → auto refund to client */
    deadline: { type: Date },
    /** Digital: if client doesn't release after freelancer done → auto release */
    autoReleaseAt: { type: Date },

    // ── Review tracking ────────────────────────────────────────────
    reviewed: { type: Boolean, default: false },

    // ── Field arrival tracking ─────────────────────────────────────
    arrivedAt: { type: Date },
    arrivalLat: { type: Number },
    arrivalLng: { type: Number },
    /** True once freelancer taps "Mark Arrived" */
    arrivalVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

BookingSchema.index({ freelancerId: 1, startTime: 1, endTime: 1 });
BookingSchema.index({ clientId: 1, status: 1 });
BookingSchema.index({ razorpayOrderId: 1 });
BookingSchema.index({ autoReleaseAt: 1 });
BookingSchema.index({ deadline: 1, paymentStatus: 1 });
BookingSchema.index({ status: 1, serviceCategory: 1, updatedAt: 1 });

export default mongoose.model("Booking", BookingSchema);
