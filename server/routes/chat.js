import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { protect } from "../middleware/auth.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Freelancer from "../models/Freelancer.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /api/chat/conversation
router.post("/conversation", protect, async (req, res) => {
  try {
    const clientId = req.user._id;
    let { freelancerId } = req.body;

    if (!freelancerId) {
      return res.status(400).json({ msg: "freelancerId is required" });
    }

    const freelancerDoc =
      await Freelancer.findById(freelancerId).select("user");
    if (freelancerDoc) {
      freelancerId = freelancerDoc.user;
    }

    if (String(clientId) === String(freelancerId)) {
      return res.status(400).json({ msg: "Cannot chat with yourself" });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [clientId, freelancerId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [clientId, freelancerId],
        freelancerId,
        unreadCount: {
          [String(clientId)]: 0,
          [String(freelancerId)]: 0,
        },
      });
    } else {
      // Restore conversation if user had previously deleted it
      if (
        conversation.deletedBy &&
        conversation.deletedBy.map(String).includes(String(clientId))
      ) {
        conversation.deletedBy = conversation.deletedBy.filter(
          (id) => String(id) !== String(clientId),
        );
        await conversation.save();
      }
    }

    res.json(conversation);
  } catch (err) {
    console.error("CHAT /conversation error:", err);
    res.status(500).json({ msg: "Server error", detail: err.message });
  }
});

// GET /api/chat/conversations — excludes soft-deleted
router.get("/conversations", protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
      deletedBy: { $ne: req.user._id },
    })
      .sort({ lastMessageAt: -1 })
      .populate("participants", "name avatar role");

    res.json(conversations);
  } catch (err) {
    console.error("CHAT /conversations error:", err);
    res.status(500).json({ msg: "Server error", detail: err.message });
  }
});

// GET /api/chat/:conversationId/messages
router.get("/:conversationId/messages", protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 50;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ msg: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some(
      (p) => String(p) === String(req.user._id),
    );
    if (!isParticipant) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("sender", "name avatar role");

    await Message.updateMany(
      {
        conversationId,
        readBy: { $ne: req.user._id },
        sender: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } },
    );

    await Conversation.updateOne(
      { _id: conversationId },
      { $set: { [`unreadCount.${String(req.user._id)}`]: 0 } },
    );

    const plain = messages.reverse().map((m) => ({
      _id: String(m._id),
      conversationId: String(m.conversationId),
      sender: {
        _id: String(m.sender._id),
        name: m.sender.name,
        avatar: m.sender.avatar || "",
        role: m.sender.role,
      },
      text: m.text || "",
      image: m.image || "",
      createdAt: m.createdAt,
      readBy: [],
    }));
    res.json(plain);
  } catch (err) {
    console.error("CHAT /messages error:", err);
    res.status(500).json({ msg: "Server error", detail: err.message });
  }
});

// POST /api/chat/upload-image
router.post(
  "/upload-image",
  protect,
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({ msg: "Image too large. Maximum size is 10MB." });
        }
        return res.status(400).json({ msg: "Upload error: " + err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ msg: "No file uploaded" });
      }

      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const result = await cloudinary.uploader.upload(base64, {
        folder: "pocketlancer/chat-images",
        transformation: [{ width: 1200, quality: "auto" }],
      });

      res.json({ url: result.secure_url });
    } catch (err) {
      console.error("CHAT image upload error:", err);
      res.status(500).json({ msg: "Image upload failed", detail: err.message });
    }
  },
);

// DELETE /api/chat/message/:id — delete a single message (sender only)
router.delete("/message/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ msg: "Message not found" });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ msg: "Unauthorized to delete this message" });
    }

    await message.deleteOne();
    res.json({ msg: "Message deleted successfully" });
  } catch (err) {
    console.error("Delete message error:", err.message);
    res.status(500).send("Server Error");
  }
});

// DELETE /api/chat/conversation/:id — soft-delete for current user only
router.delete("/conversation/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({ msg: "Conversation not found" });
    }

    if (!conversation.deletedBy) conversation.deletedBy = [];

    if (!conversation.deletedBy.map(String).includes(String(userId))) {
      conversation.deletedBy.push(userId);
      await conversation.save();
    }

    res.json({ success: true, msg: "Conversation removed from your inbox" });
  } catch (err) {
    console.error("Delete conversation error:", err.message);
    res.status(500).json({ msg: "Server error", detail: err.message });
  }
});

export default router;
