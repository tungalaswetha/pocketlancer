// server/models/Dispute.js
import mongoose from "mongoose";

const EvidenceSchema = new mongoose.Schema(
  {
    url: String,
    type: {
      type: String,
      enum: ["image", "pdf"],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false },
);

const DisputeSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reason: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["open", "under_review", "resolved", "rejected"],
      default: "open",
    },

    evidence: [EvidenceSchema],

    adminNotes: String,

    resolution: {
      type: String,
      enum: [
        // Digital resolutions (escrow involved)
        "release_to_freelancer",
        "refund_to_client",
        "split",
        // Field resolutions (honor score only — no escrow)
        "favour_client",
        "favour_freelancer",
        "both_at_fault",
        null,
      ],
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Dispute", DisputeSchema);
