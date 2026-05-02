/**
 * ─────────────────────────────────────────────────────────
 * PocketLancer Chat Socket Handler
 * ─────────────────────────────────────────────────────────
 */
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Message, { makeConversationId } from "../models/Message.js";
import { notify } from "../utils/notify.js";

// Map of userId -> socketId for online presence
const onlineUsers = new Map();

export function registerChatSocket(io) {
  // ── Auth middleware ──────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split(";")
          .find((c) => c.trim().startsWith("token="))
          ?.split("=")[1];
      if (!token) return next(new Error("Not authenticated"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      next();
    } catch {
      next(new Error("Auth failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String(socket.user._id);
    onlineUsers.set(userId, socket.id);

    // ✅ Auto-join personal room so message.js can emit to this user
    socket.join(userId);

    // Broadcast online status
    io.emit("user_online", { userId });

    // ── Join personal room ──────────────────────────────────
    // Client re-emits "join" after reconnect to re-enter the room
    socket.on("join", (uid) => {
      socket.join(String(uid));
    });

    // ── Join / leave conversation room ──────────────────────
    socket.on("join_conversation", (conversationId) => {
      socket.join(`conv_${conversationId}`);
    });
    socket.on("leave_conversation", (conversationId) => {
      socket.leave(`conv_${conversationId}`);
    });

    // ── Send message ────────────────────────────────────────
    socket.on("send_message", async (data) => {
      try {
        const { receiverId, text } = data;
        if (!text?.trim() || !receiverId) return;

        const conversationId = makeConversationId(userId, receiverId);

        const message = await Message.create({
          conversationId,
          senderId: socket.user._id,
          receiverId,
          text: text.trim(),
        });

        const plainMsg = {
          _id: String(message._id),
          conversationId: String(message.conversationId),
          senderId: String(message.senderId),
          receiverId: String(message.receiverId),
          text: message.text || "",
          imageUrl: message.imageUrl || "",
          deleted: false,
          readByReceiver: false,
          createdAt: message.createdAt,
        };

        // Emit to receiver's room AND echo back to sender
        io.to(String(receiverId)).emit("new_message", plainMsg);
        socket.emit("new_message", plainMsg);

        // ✅ FCM push notification (Android/iOS only — no desktop bell).
        // Pass senderId + senderName so the app can open the right chat window
        // directly when the user taps the notification.
        const senderName = socket.user.name || "Someone";
        const trimmedText = text.trim();
        const notifBody =
          trimmedText.length > 60
            ? `${senderName}: ${trimmedText.slice(0, 57)}…`
            : `${senderName}: ${trimmedText}`;

        notify({
          userId: receiverId,
          type: "message_received",
          message: notifBody,
          link: `/messages`,
          senderId: userId,
          senderName,
        }).catch((err) =>
          console.error("[chatSocket] notify error:", err.message),
        );
      } catch (err) {
        console.error("send_message error:", err);
        socket.emit("message_error", { msg: "Failed to send message" });
      }
    });

    // ── Typing indicators ────────────────────────────────────
    socket.on("typing_start", ({ conversationId }) => {
      socket.to(`conv_${conversationId}`).emit("typing_start", {
        userId,
        name: socket.user.name,
      });
    });
    socket.on("typing_stop", ({ conversationId }) => {
      socket.to(`conv_${conversationId}`).emit("typing_stop", { userId });
    });

    // ── Disconnect ───────────────────────────────────────────
    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      io.emit("user_offline", { userId });
    });
  });
}

export { onlineUsers };
