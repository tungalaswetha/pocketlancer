// server/models/DeviceToken.js
import mongoose from "mongoose";

const DeviceTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fcmToken: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      enum: ["android", "ios", "web"],
      default: "android",
    },
  },
  { timestamps: true },
);

// One token per user (upsert pattern keeps it clean)
DeviceTokenSchema.index({ user: 1 }, { unique: true });

const DeviceToken = mongoose.model("DeviceToken", DeviceTokenSchema);
export default DeviceToken;
