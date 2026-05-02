import { useEffect, useState } from "react";
import api from "@/services/api";
import socket from "@/services/socket";

type Notification = {
  _id: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export default function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState<number>(0);

  useEffect(() => {
    if (!userId) return;

    socket.emit("join", userId);
  }, [userId]);

  useEffect(() => {
    loadNotifications();

    socket.on("notification", (data: Notification) => {
      setNotifications((prev) => [data, ...prev]);
      setUnread((prev) => prev + 1);
    });

    return () => {
      socket.off("notification");
    };
  }, []);

  const loadNotifications = async () => {
    const res = await api.get("/notifications");

    const data: Notification[] = res.data;

    setNotifications(data);

    const unreadCount = data.filter((n) => !n.read).length;

    setUnread(unreadCount);
  };

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);

    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
    );

    setUnread((prev) => Math.max(prev - 1, 0));
  };

  return {
    notifications,
    unread,
    markRead,
  };
}
