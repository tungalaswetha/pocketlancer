"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { X, Send, Loader2, ImagePlus, Trash2 } from "lucide-react";
import socket from "@/services/socket";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  text: string;
  imageUrl?: string;
  deleted?: boolean;
  createdAt: string;
}

interface Props {
  freelancerId: string;
  freelancerName: string;
  freelancerAvatar?: string;
  onClose: () => void;
}

function timeLabel(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatWindow({
  freelancerId,
  freelancerName,
  freelancerAvatar,
  onClose,
}: Props) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load message history ─────────────────────────────────────────
  useEffect(() => {
    if (!freelancerId) return;
    setLoading(true);
    api
      .get(`/message/${freelancerId}`)
      .then((r) => setMessages(r.data.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [freelancerId]);

  // ── Scroll to bottom on new messages ────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const userId = user?._id;

  // ── Helper: merge fresh messages without duplicating ────────────
  const mergeMessages = useCallback((fresh: Message[]) => {
    setMessages((prev) => {
      const prevIds = new Set(prev.map((m) => m._id));
      const newOnes = fresh.filter((m) => !prevIds.has(m._id));
      if (newOnes.length === 0) return prev;
      return [...prev, ...newOnes];
    });
  }, []);

  // ── Poll API as Android WebView fallback ─────────────────────────
  // Android WebView sometimes does not trigger React re-renders when
  // socket events fire (batching / background-tab throttling).
  // Polling every 4 s guarantees messages never go stale for more than 4 s,
  // even if the socket misses an update.
  useEffect(() => {
    if (!freelancerId || !userId) return;

    const poll = () => {
      if (document.hidden) return; // skip when app is in background
      api
        .get(`/message/${freelancerId}`)
        .then((r) => mergeMessages(r.data.messages || []))
        .catch(() => {});
    };

    // Re-fetch immediately when the tab/app comes back to foreground
    const onVisible = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Periodic poll every 4 seconds while window is open
    const interval = setInterval(poll, 4000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [freelancerId, userId, mergeMessages]);

  // ── Socket listener for incoming messages ───────────────────────
  useEffect(() => {
    if (!userId) return;
    const handler = (msg: Message) => {
      const isRelevant =
        (msg.senderId?.toString() === freelancerId &&
          msg.receiverId?.toString() === userId) ||
        (msg.senderId?.toString() === userId &&
          msg.receiverId?.toString() === freelancerId);
      if (isRelevant) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };
    socket.on("new_message", handler);
    return () => {
      socket.off("new_message", handler);
    };
  }, [userId, freelancerId]);

  // ── Socket listener for deleted messages ────────────────────────
  useEffect(() => {
    if (!userId) return;
    const handler = (data: { _id: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data._id
            ? { ...m, deleted: true, text: "", imageUrl: "" }
            : m,
        ),
      );
    };
    socket.on("message_deleted", handler);
    return () => {
      socket.off("message_deleted", handler);
    };
  }, [userId]);

  // ── Tap outside bubble to dismiss delete button ──────────────────
  useEffect(() => {
    if (!hoveredMsg) return;
    const dismiss = () => setHoveredMsg(null);
    document.addEventListener("touchstart", dismiss, { passive: true });
    return () => document.removeEventListener("touchstart", dismiss);
  }, [hoveredMsg]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB");
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !selectedImage) || sending || !userId) return;
    setSending(true);
    setText("");
    setError("");
    try {
      const formData = new FormData();
      if (trimmed) formData.append("text", trimmed);
      if (selectedImage) formData.append("image", selectedImage);
      const res = await api.post(`/message/${freelancerId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const sent = res.data.message;
      setMessages((prev) => {
        if (prev.some((m) => m._id === sent._id)) return prev;
        return [...prev, sent];
      });
      clearImage();
    } catch (err: any) {
      console.error("ChatWindow send error:", err?.response?.data || err);
      setError(err?.response?.data?.msg || "Failed to send");
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    setHoveredMsg(null);
    try {
      await api.delete(`/message/${messageId}`);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, deleted: true, text: "", imageUrl: "" }
            : m,
        ),
      );
    } catch (err: any) {
      console.error("Delete error:", err?.response?.data || err);
      setError(err?.response?.data?.msg || "Failed to delete");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
          onClick={() => setLightboxUrl("")}
        >
          <button
            onClick={() => setLightboxUrl("")}
            className="absolute top-6 right-6 text-white"
          >
            <X size={28} />
          </button>
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-h-[90vh] max-w-[90vw] rounded-xl"
          />
        </div>
      )}

      <div
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+76px)] lg:bottom-24 right-4 lg:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm sm:max-w-96 rounded-3xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden dark:bg-slate-950 dark:border-slate-800"
        style={{ maxHeight: "min(520px, 70dvh)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b dark:border-slate-800 bg-slate-900 dark:bg-slate-800 flex-shrink-0">
          <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
            {freelancerName?.slice(0, 1).toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white truncate">
              {freelancerName}
            </p>
            <p className="text-xs font-bold text-slate-400">Chat</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          style={{ minHeight: 200 }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <Loader2 className="animate-spin" size={22} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 py-8">
              <p className="text-sm font-bold">No messages yet</p>
              <p className="text-xs">Say hello 👋</p>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.senderId?.toString() === userId;
              if (m.deleted) {
                return (
                  <div
                    key={m._id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[75%] rounded-2xl px-4 py-2.5 bg-slate-50 dark:bg-slate-900">
                      <p className="text-xs italic text-slate-400">
                        🚫 This message was deleted
                      </p>
                    </div>
                  </div>
                );
              }

              const deleteVisible = isMine && hoveredMsg === m._id;

              return (
                <div
                  key={m._id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"} group`}
                  onMouseEnter={() => isMine && setHoveredMsg(m._id)}
                  onMouseLeave={() => isMine && setHoveredMsg(null)}
                  onTouchStart={(e) => {
                    if (!isMine) return;
                    e.stopPropagation();
                    setHoveredMsg((prev) => (prev === m._id ? null : m._id));
                  }}
                >
                  <div className="relative max-w-[75%]">
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm font-bold leading-snug ${
                        isMine
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-br-sm"
                          : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white rounded-bl-sm"
                      }`}
                    >
                      {m.imageUrl && (
                        <img
                          src={m.imageUrl}
                          alt="attachment"
                          className="rounded-xl mb-2 max-h-48 w-full object-cover cursor-pointer hover:opacity-90 transition"
                          onClick={() => setLightboxUrl(m.imageUrl!)}
                        />
                      )}
                      {m.text && (
                        <p className="whitespace-pre-wrap break-words">
                          {m.text}
                        </p>
                      )}
                      <p className="text-[10px] mt-1 font-bold text-slate-400">
                        {timeLabel(m.createdAt)}
                      </p>
                    </div>

                    {deleteVisible && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(m._id);
                        }}
                        className="absolute -left-9 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition dark:bg-red-900/30 dark:text-red-400 shadow-sm"
                        title="Delete message"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 flex-shrink-0">
            {error}
          </div>
        )}

        {/* Image Preview */}
        {imagePreview && (
          <div className="px-4 py-2 border-t dark:border-slate-800 flex-shrink-0">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
              />
              <button
                onClick={clearImage}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex items-end gap-2 border-t dark:border-slate-800 px-3 py-3 flex-shrink-0">
          {/* Image upload button */}
          <label className="cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1">
            <ImagePlus size={20} />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
          </label>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-slate-400 dark:focus:border-slate-500 max-h-28 overflow-y-auto"
            style={{ lineHeight: "1.5" }}
          />

          <button
            onClick={handleSend}
            disabled={sending || (!text.trim() && !selectedImage)}
            className="h-9 w-9 flex items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 disabled:opacity-40 transition hover:scale-105 flex-shrink-0"
          >
            {sending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
