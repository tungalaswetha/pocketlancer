import mongoose from "mongoose";

const GeoPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (c) => {
          if (!Array.isArray(c) || c.length !== 2) return false;
          const [lng, lat] = c;
          return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
        },
        message: "Invalid coordinates",
      },
    },
  },
  { _id: false },
);

const MilestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 },
    order: { type: Number, default: 0 },
  },
  { _id: true },
);

// ── Availability Range ────────────────────────────────────────────
// A date range (inclusive) during which the freelancer is unavailable.
// Stored as YYYY-MM-DD strings so timezone comparison is simple.
const UnavailableRangeSchema = new mongoose.Schema(
  {
    start: { type: String, required: true }, // YYYY-MM-DD
    end: { type: String, required: true }, // YYYY-MM-DD (same as start for single day)
    note: { type: String, default: "" },
  },
  { _id: true },
);

const FreelancerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    title: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },
    skills: { type: [String], default: [] },
    profilePic: { type: String, default: "" },

    // ── Category ─────────────────────────────────────
    category: {
      type: String,
      enum: ["field", "digital"],
      default: "field",
    },

    // ── Visibility ───────────────────────────────────
    // When false, the profile is hidden from search results
    isVisible: { type: Boolean, default: true },

    // ── Availability ─────────────────────────────────
    // Array of date ranges during which the freelancer is unavailable.
    // Single-day blocks: start === end.
    unavailableRanges: { type: [UnavailableRangeSchema], default: [] },

    // ── Pricing ──────────────────────────────────────
    pricingType: {
      type: String,
      enum: ["hourly", "fixed", "milestone"],
      default: "hourly",
    },
    hourlyRate: { type: Number, default: 0, min: 0 },
    fixedPrice: { type: Number, default: 0, min: 0 },
    advanceAmount: { type: Number, default: 0, min: 0 },
    milestones: { type: [MilestoneSchema], default: [] },

    // ── Location (field workers only) ────────────────
    location: { type: GeoPointSchema, required: false },
    city: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },

    // ── Portfolio ─────────────────────────────────────
    portfolio: { type: [String], default: [] },
    pastWorks: { type: mongoose.Schema.Types.Mixed, default: [] },

    // ── Stats ─────────────────────────────────────────
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    dateOfBirth: { type: Date, default: null },

    // ── Bank Details (digital freelancers) ────────────
    bankDetails: {
      accountHolder: { type: String, trim: true, default: "" },
      accountNumber: { type: String, trim: true, default: "" },
      ifscCode: { type: String, trim: true, default: "" },
      bankName: { type: String, trim: true, default: "" },
      upiId: { type: String, trim: true, default: "" },
    },
  },
  { timestamps: true },
);

FreelancerSchema.index({ location: "2dsphere" });

export default mongoose.model("Freelancer", FreelancerSchema);
