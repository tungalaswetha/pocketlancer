import mongoose from "mongoose";
const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      // sorted, joined user IDs: "uid1_uid2" (smaller ID first)
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    readByReceiver: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);
// Index for fetching conversation history efficiently
MessageSchema.index({ conversationId: 1, createdAt: 1 });
// ✅ Named export — this is what the route imports
export function makeConversationId(a, b) {
  const ids = [a.toString(), b.toString()].sort();
  return ids.join("_");
}
// ✅ Default export — the mongoose model
const Message = mongoose.model("Message", MessageSchema);
export default Message;
