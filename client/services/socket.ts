/**
 * ─────────────────────────────────────────────
 * client/services/socket.ts
 * ─────────────────────────────────────────────
 * Singleton Socket.io client
 * Already imported in UserContext & DashboardHeader
 * ─────────────────────────────────────────────
 */

import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace("/api", "") ||
  "http://localhost:5001";

const socket: Socket = io(SOCKET_URL, {
  withCredentials: true, // sends cookie for auth
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;
