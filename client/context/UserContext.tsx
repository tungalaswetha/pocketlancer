"use client";
import { createContext, useContext, useEffect, useState } from "react";
import api from "@/services/api";
import socket from "@/services/socket";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: "client" | "freelancer" | "admin";
  phone?: string;
  honorScore?: number;
  avatar?: string;
  username?: string | null;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await api.get("/auth/check-session");
      setUser(res.data.user);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setUser(null);
      } else {
        console.error("Session check failed", err);
      }
    }
  };

  // Check session once on mount
  useEffect(() => {
    fetchSession().finally(() => setLoading(false));
  }, []);

  // Join socket room when user logs in.
  // Uses user._id (string) not user (object) as dep — the object gets
  // a new reference on every render which would cause an infinite loop.
  useEffect(() => {
    if (user?._id) {
      // Reconnect socket if it was disconnected by a previous logout
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit("join", user._id);
    }
  }, [user?._id]);

  const refreshUser = async () => {
    await fetchSession();
  };

  const logout = async () => {
    try {
      // 1. Tell the server to clear the httpOnly cookie
      await api.post("/auth/logout");
      await api.delete("/notifications/register-token").catch(() => {});
    } catch {
      // Even if the server call fails, we still clean up client-side
    } finally {
      // 2. Clear React state immediately
      setUser(null);

      // 3. Disconnect socket so it stops sending authenticated events
      //    and doesn't race against the page reload with a stale connection.
      //    This also silences the "WebSocket closed before connection
      //    established" console error during navigation.
      if (socket.connected) {
        socket.disconnect();
      }

      // 4. Hard redirect — remounts the entire app so UserContext
      //    re-runs fetchSession() fresh with no cookie.
      //    Using window.location.href instead of router.push() ensures
      //    all module-level singletons (socket, api) are fully reset.
      window.location.href = "/login";
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used inside UserProvider");
  }
  return ctx;
}
