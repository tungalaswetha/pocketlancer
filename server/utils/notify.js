// server/utils/notify.js
// ─────────────────────────────────────────────────────────
// Saves Notification to DB, emits via socket.io, AND sends
// a Firebase Cloud Messaging push via firebase-admin V1 API.
//
// ✅ CHAT: message_received notifications are FCM-ONLY.
//    They are NOT saved to DB and NOT socket-emitted, so they
//    NEVER appear in the desktop notification bell.
//    Only the Android/iOS system tray receives the push.
//
// NEVER throws — notification failures must never break
// the calling request. Errors are logged silently.
// ─────────────────────────────────────────────────────────

import Notification from "../models/Notification.js";
import DeviceToken from "../models/DeviceToken.js";
import admin from "firebase-admin";

// ── Initialise Firebase Admin SDK once ───────────────────
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("[FCM] Firebase Admin initialised ✓");
  } catch (err) {
    console.error(
      "[FCM] Firebase Admin init failed — push notifications disabled:",
      err.message,
    );
  }
}

// ── Friendly title map ────────────────────────────────────
const TITLES = {
  booking_created: "📋 New Booking Request",
  booking_confirmed: "✅ Booking Confirmed",
  booking_cancelled: "❌ Booking Cancelled",
  booking_rejected: "🚫 Booking Rejected",
  booking_completed: "🎉 Booking Completed",
  payment_released: "💰 Payment Update",
  payment_received: "💳 Payment Received",
  refund_initiated: "🔄 Refund Initiated",
  dispute_created: "⚠️ Dispute Raised",
  dispute_resolved: "🛡️ Dispute Resolved",
  freelancer_arrived: "📍 Freelancer Arrived",
  honor_score_changed: "⭐ Honor Score Updated",
  message_received: "💬 New Message",
  admin_message: "📣 Admin Notice",
};

// ── Send FCM push via V1 API ──────────────────────────────
async function sendFCMPush({ fcmToken, title, body, link, extraData = {} }) {
  if (!admin.apps.length) return;

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: {
        link: link || "/",
        title,
        body,
        ...extraData,
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          // No clickAction — Capacitor handles tap via pushNotificationActionPerformed
        },
      },
      apns: {
        payload: { aps: { sound: "default" } },
      },
    });
  } catch (err) {
    if (
      err.code === "messaging/registration-token-not-registered" ||
      err.code === "messaging/invalid-registration-token"
    ) {
      await DeviceToken.findOneAndDelete({ fcmToken }).catch(() => {});
      console.warn("[FCM] Removed stale token");
    } else {
      console.error("[FCM] Push error:", err.message);
    }
  }
}

// ── Main notify function ──────────────────────────────────
/**
 * @param {Object}          opts
 * @param {string|ObjectId} opts.userId      – recipient
 * @param {string}          opts.type        – must match Notification enum
 * @param {string}          opts.message     – human-readable body
 * @param {string}          [opts.link]      – optional deep-link
 * @param {string}          [opts.senderId]  – for message_received: sender user ID
 * @param {string}          [opts.senderName]– for message_received: sender display name
 */
export const notify = async ({
  userId,
  type,
  message,
  link = "",
  senderId = null,
  senderName = null,
}) => {
  try {
    // ── Chat messages: FCM push ONLY. No DB, no socket. ──
    // This is the critical gate that keeps chat messages out of the
    // desktop notification bell. The bell only reads from DB + socket
    // "notification" events — both of which are skipped here for chats.
    const isChat = type === "message_received";

    let notification = null;

    if (!isChat) {
      // ── Non-chat: persist to DB ───────────────────────────
      notification = await Notification.create({
        user: userId,
        type,
        message,
        link,
      });

      const payload = {
        _id: notification._id,
        type: notification.type,
        message: notification.message,
        link: notification.link,
        read: false,
        createdAt: notification.createdAt,
      };

      // ── Non-chat: real-time socket push to desktop/web ───
      if (global.io) {
        global.io.to(userId.toString()).emit("notification", payload);
      }
    }

    // ── FCM push — always sent for both chat and non-chat ──
    // Chat: FCM is the ONLY delivery path.
    // Non-chat: FCM supplements the socket notification above.
    const deviceToken = await DeviceToken.findOne({ user: userId }).lean();
    if (deviceToken?.fcmToken) {
      const extraData = { type };
      if (isChat && senderId) {
        extraData.senderId = String(senderId);
        extraData.senderName = senderName || "Someone";
      }

      // Fire-and-forget — never block the caller
      sendFCMPush({
        fcmToken: deviceToken.fcmToken,
        title: TITLES[type] || "PocketLancer",
        body: message,
        link,
        extraData,
      });
    }

    return notification;
  } catch (err) {
    console.error(`[notify] Failed (${type} → ${userId}):`, err.message);
    return null;
  }
};
