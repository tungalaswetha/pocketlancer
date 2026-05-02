"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";
import {
  ArrowLeft,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  Calendar,
  User,
  FileText,
  ImageIcon,
  ExternalLink,
  Clock,
  IndianRupee,
} from "lucide-react";

interface Evidence {
  url: string;
  type: "image" | "pdf";
  uploadedBy: string;
}

interface Dispute {
  _id: string;
  reason: string;
  status: "open" | "under_review" | "resolved" | "rejected";
  resolution?: "release_to_freelancer" | "refund_to_client" | "split" | null;
  adminNotes?: string;
  evidence: Evidence[];
  raisedBy: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
  createdAt: string;
  bookingId: {
    _id: string;
    serviceType: string;
    agreedAmount: number;
    preferredDate: string;
    paymentStatus: string;
    status: string;
    clientId: { _id: string; name: string; email: string; avatar?: string };
    freelancerId: { _id: string; name?: string; title?: string; user?: string };
  };
}

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  open: {
    bg: "bg-amber-100 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    label: "Open",
  },
  under_review: {
    bg: "bg-blue-100 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    label: "Under Review",
  },
  resolved: {
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    label: "Resolved",
  },
  rejected: {
    bg: "bg-red-100 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    label: "Rejected",
  },
};

const RESOLUTION_LABEL: Record<string, string> = {
  release_to_freelancer: "Payment released to freelancer",
  refund_to_client: "Full refund issued to client",
  split: "50/50 split — partial refund & partial release",
};

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const fetchDispute = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/disputes/${id}`);
      setDispute(res.data.dispute);
    } catch (err: any) {
      setError(err.response?.data?.msg || "Failed to load dispute");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDispute();
  }, [fetchDispute]);

  const uploadEvidence = async (file: File) => {
    if (!dispute) return;
    try {
      setUploading(true);
      const form = new FormData();
      form.append("file", file);
      await api.post(`/disputes/${dispute._id}/evidence`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchDispute();
      showToast("Evidence uploaded successfully");
    } catch {
      showToast("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-slate-400" />
      </div>
    );

  if (error || !dispute)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertTriangle size={48} className="text-red-400" />
        <p className="font-bold text-slate-600">
          {error || "Dispute not found"}
        </p>
        <button
          onClick={() => router.back()}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white"
        >
          Go back
        </button>
      </div>
    );

  const st = STATUS_STYLES[dispute.status] || STATUS_STYLES.open;
  const booking = dispute.bookingId;
  const canUpload = ["open", "under_review"].includes(dispute.status);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {toast && (
        <div className="fixed top-6 right-6 z-50 rounded-2xl bg-slate-900 px-5 py-3 text-white font-bold shadow-xl">
          {toast}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Header */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-black/5 dark:ring-white/10 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center flex-shrink-0">
              <ShieldAlert size={22} className="text-red-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  Dispute
                </h1>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${st.bg} ${st.text}`}
                >
                  {st.label}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400">
                ID: {dispute._id}
              </p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Clock size={12} />
                Raised{" "}
                {new Date(dispute.createdAt).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                })}{" "}
                by <strong className="ml-1">{dispute.raisedBy.name}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Booking context */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-black/5 dark:ring-white/10 shadow-sm p-6">
          <h2 className="font-black text-slate-900 dark:text-white mb-4">
            Booking Details
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Service", value: booking.serviceType },
              {
                label: "Date",
                value: new Date(booking.preferredDate).toLocaleDateString(
                  undefined,
                  { dateStyle: "medium" },
                ),
              },
              {
                label: "Amount",
                value: `₹${(booking.agreedAmount || 0).toLocaleString("en-IN")}`,
              },
              {
                label: "Payment",
                value: booking.paymentStatus?.replace("_", " ") || "—",
              },
              { label: "Client", value: booking.clientId?.name || "—" },
              {
                label: "Freelancer",
                value:
                  booking.freelancerId?.name ||
                  booking.freelancerId?.title ||
                  "—",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3"
              >
                <p className="text-xs font-bold text-slate-400 mb-1">
                  {item.label}
                </p>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push(`/bookings/${booking._id}`)}
            className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline"
          >
            View full booking <ExternalLink size={12} />
          </button>
        </div>

        {/* Dispute reason */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-black/5 dark:ring-white/10 shadow-sm p-6">
          <h2 className="font-black text-slate-900 dark:text-white mb-3">
            Dispute Reason
          </h2>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {dispute.reason}
          </p>
        </div>

        {/* Evidence */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-black/5 dark:ring-white/10 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-slate-900 dark:text-white">
              Evidence ({dispute.evidence.length})
            </h2>
            {canUpload && (
              <label
                className={`inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-xs font-black cursor-pointer hover:bg-slate-700 dark:hover:bg-slate-200 transition ${uploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                {uploading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Upload Evidence"
                )}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) uploadEvidence(e.target.files[0]);
                  }}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
          {dispute.evidence.length === 0 ? (
            <p className="text-sm font-medium text-slate-400 italic">
              No evidence uploaded yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {dispute.evidence.map((e, i) => (
                <a
                  key={i}
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-2xl bg-slate-50 dark:bg-slate-800 p-4 hover:bg-slate-100 dark:hover:bg-slate-700 transition ring-1 ring-black/5 dark:ring-white/10"
                >
                  {e.type === "pdf" ? (
                    <FileText
                      size={20}
                      className="text-red-500 flex-shrink-0"
                    />
                  ) : (
                    <ImageIcon
                      size={20}
                      className="text-blue-500 flex-shrink-0"
                    />
                  )}
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                    Evidence {i + 1}
                  </span>
                  <ExternalLink
                    size={12}
                    className="text-slate-400 ml-auto flex-shrink-0"
                  />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Resolution (if resolved) */}
        {dispute.status === "resolved" && dispute.resolution && (
          <div className="rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-200 dark:ring-emerald-700 p-6">
            <h2 className="font-black text-emerald-800 dark:text-emerald-300 mb-2">
              Resolution
            </h2>
            <p className="font-bold text-emerald-700 dark:text-emerald-300">
              {RESOLUTION_LABEL[dispute.resolution] || dispute.resolution}
            </p>
            {dispute.adminNotes && (
              <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                {dispute.adminNotes}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
