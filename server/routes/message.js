// server/routes/message.js
import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import Message, { makeConversationId } from "../models/Message.js";
import { protect } from "../middleware/auth.js";
import { notify } from "../utils/notify.js";

const router = express.Router();

// Multer — memory storage, 5 MB limit for chat images
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ─────────────────────────────────────────────────────────────────
// ⚠️  IMPORTANT: Static routes MUST come before /:otherUserId
// ─────────────────────────────────────────────────────────────────

// GET /api/message/unread/count
router.get("/unread/count", protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiverId: req.user._id,
      readByReceiver: false,
    });
    return res.json({ success: true, count });
  } catch (err) {
    return res.status(500).json({ msg: "Failed to count unread" });
  }
});

// GET /api/message/conversations/list
router.get("/conversations/list", protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Message.aggregate([
      { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $first: "$$ROOT" },
          unread: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", userId] },
                    { $eq: ["$readByReceiver", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
      { $limit: 50 },
    ]);

    const User = (await import("../models/User.js")).default;

    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const msg = conv.lastMessage;
        const partnerId =
          msg.senderId.toString() === userId.toString()
            ? msg.receiverId
            : msg.senderId;
        const partner = await User.findById(partnerId)
          .select("name profilePic")
          .lean();
        return {
          conversationId: conv._id,
          partner,
          lastMessage: msg,
          unreadCount: conv.unread,
        };
      }),
    );

    return res.json({ success: true, conversations: enriched });
  } catch (err) {
    console.error("LIST CONVERSATIONS ERROR:", err);
    return res.status(500).json({ msg: "Failed to list conversations" });
  }
});

// DELETE /api/message/conversation/:otherUserId
router.delete("/conversation/:otherUserId", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const otherId = req.params.otherUserId;
    const conversationId = makeConversationId(userId, otherId);
    await Message.deleteMany({ conversationId });
    if (global.io) {
      global.io
        .to(otherId.toString())
        .emit("conversation_deleted", { conversationId });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE CONVERSATION ERROR:", err);
    return res.status(500).json({ msg: "Failed to delete conversation" });
  }
});

// DELETE /api/message/conversation/orphan/:conversationId
router.delete(
  "/conversation/orphan/:conversationId",
  protect,
  async (req, res) => {
    try {
      await Message.deleteMany({ conversationId: req.params.conversationId });
      return res.json({ success: true });
    } catch (err) {
      console.error("DELETE ORPHAN CONVERSATION ERROR:", err);
      return res.status(500).json({ msg: "Failed to delete conversation" });
    }
  },
);

// DELETE /api/message/:messageId — soft-delete a single message
router.delete("/:messageId", protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ msg: "Message not found" });
    if (message.senderId.toString() !== req.user._id.toString())
      return res
        .status(403)
        .json({ msg: "Cannot delete someone else's message" });

    message.deleted = true;
    message.text = "";
    message.imageUrl = "";
    await message.save();

    if (global.io) {
      global.io.to(message.receiverId.toString()).emit("message_deleted", {
        _id: message._id.toString(),
      });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE MESSAGE ERROR:", err);
    return res.status(500).json({ msg: "Failed to delete message" });
  }
});

// GET /api/message/:otherUserId — fetch conversation history
router.get("/:otherUserId", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const otherId = req.params.otherUserId;
    const conversationId = makeConversationId(userId, otherId);

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    await Message.updateMany(
      { conversationId, receiverId: req.user._id, readByReceiver: false },
      { readByReceiver: true },
    );

    return res.json({ success: true, messages });
  } catch (err) {
    console.error("GET MESSAGES ERROR:", err);
    return res.status(500).json({ msg: "Failed to fetch messages" });
  }
});

// POST /api/message/:otherUserId — send message (text and/or image)
router.post(
  "/:otherUserId",
  protect,
  upload.single("image"),
  async (req, res) => {
    const text = req.body.text?.trim() || "";
    let imageUrl = "";

    if (req.file) {
      try {
        const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
        const result = await cloudinary.uploader.upload(base64, {
          folder: "pocketlancer/chat",
          transformation: [{ width: 800, quality: "auto" }],
        });
        imageUrl = result.secure_url;
      } catch (uploadErr) {
        console.error("CHAT IMAGE UPLOAD ERROR:", uploadErr);
        return res.status(500).json({ msg: "Failed to upload image" });
      }
    }

    if (!text && !imageUrl) {
      return res.status(400).json({ msg: "Message text or image is required" });
    }

    try {
      const senderId = req.user._id;
      const receiverId = req.params.otherUserId;
      const conversationId = makeConversationId(senderId, receiverId);

      const message = await Message.create({
        conversationId,
        senderId,
        receiverId,
        text,
        imageUrl,
      });

      const payload = {
        _id: message._id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        receiverId: message.receiverId,
        text: message.text,
        imageUrl: message.imageUrl,
        deleted: false,
        readByReceiver: false,
        createdAt: message.createdAt,
      };

      // Real-time socket delivery to receiver
      if (global.io) {
        global.io.to(receiverId.toString()).emit("new_message", payload);
      }

      // ✅ FCM push notification (Android/iOS only — no desktop bell).
      // Pass senderId + senderName so the app can open the right chat window
      // directly when the user taps the notification, instead of navigating to /messages.
      const senderName = req.user.name || "Someone";
      const notifBody = text
        ? `${senderName}: ${text.length > 60 ? text.slice(0, 57) + "…" : text}`
        : `${senderName} sent you an image`;

      // Fire-and-forget — notification failure must never break message delivery
      notify({
        userId: receiverId,
        type: "message_received",
        message: notifBody,
        link: `/messages`,
        senderId: String(senderId),
        senderName,
      }).catch((err) =>
        console.error("[message.js] notify error:", err.message),
      );

      return res.status(201).json({ success: true, message: payload });
    } catch (err) {
      console.error("SEND MESSAGE ERROR:", err);
      return res.status(500).json({ msg: "Failed to send message" });
    }
  },
);

export default router;
