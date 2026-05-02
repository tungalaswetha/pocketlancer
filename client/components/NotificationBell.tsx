"use client";

import { useEffect, useState } from "react";
import { Bell, X, CheckCheck } from "lucide-react";
import socket from "@/services/socket";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";

export default function NotificationBell() {
  const { user } = useUser();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Load existing notifications from DB ───────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/notifications");
        // API returns a plain array (not wrapped in { data: [] })
        // The server already filters out message_received, but we guard
        // client-side too so any stale cache can't sneak chat items in.
        const items: any[] = Array.isArray(res.data) ? res.data : [];
        setNotifications(items.filter((n) => n.type !== "message_received"));
      } catch (err) {
        console.error("[NotificationBell] load error:", err);
      }
    };

    if (user) load();
  }, [user]);

  // ── Real-time socket notifications ───────────────────────────
  useEffect(() => {
    const handler = (data: any) => {
      // Guard: never let chat messages appear in the bell even if the
      // server accidentally emits them via the "notification" channel.
      if (data?.type === "message_received") return;
      setNotifications((prev) => [data, ...prev]);
    };

    socket.on("notification", handler);

    return () => {
      socket.off("notification", handler);
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
    } catch (err) {
      console.error("[NotificationBell] markAsRead error:", err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("[NotificationBell] markAllRead error:", err);
    }
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1"
        aria-label="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="font-bold text-slate-900 dark:text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-semibold text-slate-400">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-slate-400 text-center">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => {
                    markAsRead(n._id);
                    if (n.link) window.location.href = n.link;
                  }}
                  className={`px-4 py-3 text-sm cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                    !n.read ? "bg-blue-50 dark:bg-blue-950/30" : ""
                  }`}
                >
                  <p className="text-slate-800 dark:text-slate-200 leading-snug">
                    {n.message}
                  </p>
                  {n.createdAt && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(n.createdAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {new Date(n.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
