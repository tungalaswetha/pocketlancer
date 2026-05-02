"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import {
  ShieldAlert,
  Loader2,
  CheckCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  ImageIcon,
  User,
  IndianRupee,
  Clock,
  AlertTriangle,
  Wrench,
} from "lucide-react";

interface Evidence {
  url: string;
  type: "image" | "pdf";
}

interface Dispute {
  _id: string;
  reason: string;
  status: "open" | "under_review" | "resolved" | "rejected";
  resolution?: string;
  adminNotes?: string;
  evidence: Evidence[];
  createdAt: string;
  raisedBy: { _id: string; name: string; email: string; role: string };
  bookingId: {
    _id: string;
    serviceType: string;
    serviceCategory: "digital" | "field";
    agreedAmount?: number;
    paymentStatus?: string;
    status: string;
    clientId: { _id: string; name: string; email: string };
    freelancerId: { _id: string; name?: string; title?: string; user?: string };
  };
}

// ── Resolution option sets ─────────────────────────────────────────

const DIGITAL_OPTIONS = [
  {
    value: "refund_to_client",
    label: "Refund to Client",
    desc: "Issue full escrow refund. Freelancer −10 honor.",
    color: "bg-emerald-600 hover:bg-emerald-700",
    icon: "💸",
  },
  {
    value: "release_to_freelancer",
    label: "Release to Freelancer",
    desc: "Release escrow to freelancer. Client −10 honor.",
    color: "bg-blue-600 hover:bg-blue-700",
    icon: "✅",
  },
  {
    value: "split",
    label: "50/50 Split",
    desc: "Split escrow equally. Both −5 honor.",
    color: "bg-purple-600 hover:bg-purple-700",
    icon: "⚖️",
  },
];

// Field bookings have no escrow — resolutions affect honor score only
const FIELD_OPTIONS = [
  {
    value: "favour_client",
    label: "Favour Client",
    desc: "Freelancer was at fault. Freelancer −10 honor score.",
    color: "bg-rose-600 hover:bg-rose-700",
    icon: "🙋",
  },
  {
    value: "favour_freelancer",
    label: "Favour Freelancer",
    desc: "Client was at fault. Client −10 honor score.",
    color: "bg-blue-600 hover:bg-blue-700",
    icon: "🔧",
  },
  {
    value: "both_at_fault",
    label: "Both at Fault",
    desc: "Shared responsibility. Both parties −5 honor score.",
    color: "bg-amber-600 hover:bg-amber-700",
    icon: "⚖️",
  },
];

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  open: { bg: "bg-amber-100", text: "text-amber-700" },
  under_review: { bg: "bg-blue-100", text: "text-blue-700" },
  resolved: { bg: "bg-emerald-100", text: "text-emerald-700" },
  rejected: { bg: "bg-red-100", text: "text-red-700" },
};

function DisputeCard({
  dispute,
  onResolved,
}: {
  dispute: Dispute;
  onResolved: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [adminNotes, setAdminNotes] = useState(dispute.adminNotes || "");
  const [resolving, setResolving] = useState<string | null>(null);
  const [markingReview, setMarkingReview] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const markUnderReview = async () => {
    try {
      setMarkingReview(true);
      await api.patch(`/disputes/${dispute._id}/status`, {
        status: "under_review",
      });
      showToast("Marked as under review");
      onResolved();
    } catch {
      showToast("Failed");
    } finally {
      setMarkingReview(false);
    }
  };

  const resolve = async (resolution: string) => {
    if (!adminNotes.trim()) {
      showToast("Please add admin notes before resolving");
      return;
    }
    try {
      setResolving(resolution);
      await api.patch(`/disputes/${dispute._id}/resolve`, {
        resolution,
        adminNotes,
      });
      showToast("Dispute resolved!");
      onResolved();
    } catch (err: any) {
      showToast(err.response?.data?.msg || "Resolution failed");
    } finally {
      setResolving(null);
    }
  };

  const st = STATUS_STYLES[dispute.status] || STATUS_STYLES.open;
  const booking = dispute.bookingId;
  const isField = booking?.serviceCategory === "field";

  // Pick the right resolution options based on booking category
  const resolutionOptions = isField ? FIELD_OPTIONS : DIGITAL_OPTIONS;

  return (
    <div
      className={`rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-black/5 dark:ring-white/10 shadow-sm overflow-hidden transition-all ${dispute.status === "open" ? "ring-amber-200 dark:ring-amber-700" : ""}`}
    >
      {toast && (
        <div className="bg-slate-900 text-white text-xs font-bold px-4 py-2">
          {toast}
        </div>
      )}

      {/* Card header */}
      <div className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${st.bg} ${st.text}`}
              >
                {dispute.status.replace("_", " ")}
              </span>

              {/* Field / Digital badge */}
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-widest flex items-center gap-1 ${
                  isField
                    ? "bg-orange-100 text-orange-700"
                    : "bg-violet-100 text-violet-700"
                }`}
              >
                {isField ? <Wrench size={10} /> : <IndianRupee size={10} />}
                {isField ? "Field" : "Digital"}
              </span>

              <span className="text-xs font-mono text-slate-400">
                {dispute._id.slice(-8)}
              </span>
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Clock size={11} />{" "}
                {new Date(dispute.createdAt).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                })}
              </span>
            </div>

            <p className="font-black text-slate-900 dark:text-white mb-1">
              {booking?.serviceType || "Service"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
              {dispute.reason}
            </p>

            {/* Parties row */}
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-1.5 font-bold text-slate-600 dark:text-slate-300">
                <User size={11} /> Client: {booking?.clientId?.name}
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-1.5 font-bold text-slate-600 dark:text-slate-300">
                <User size={11} /> Freelancer:{" "}
                {booking?.freelancerId?.name ||
                  booking?.freelancerId?.title ||
                  "—"}
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-1.5 font-bold text-slate-600 dark:text-slate-300">
                <User size={11} /> Raised by: {dispute.raisedBy?.name} (
                {dispute.raisedBy?.role})
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end flex-shrink-0">
            {/* Show booking value for digital only */}
            {!isField && booking?.agreedAmount ? (
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400">
                  Booking value
                </p>
                <p className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-1">
                  <IndianRupee size={16} />
                  {booking.agreedAmount.toLocaleString("en-IN")}
                </p>
                <p className="text-xs font-bold text-slate-400 capitalize">
                  {booking.paymentStatus?.replace("_", " ")}
                </p>
              </div>
            ) : isField ? (
              <div className="text-right">
                <span className="text-xs font-bold rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 px-3 py-1.5">
                  No payment involved
                </span>
              </div>
            ) : null}
            <a
              href={`/bookings/${booking?._id}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 mt-1"
            >
              View booking <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {/* Actions row */}
        <div className="mt-4 flex flex-wrap gap-2">
          {dispute.status === "open" && (
            <button
              onClick={markUnderReview}
              disabled={markingReview}
              className="rounded-xl bg-blue-600 text-white text-xs font-black px-4 py-2 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {markingReview ? (
                <Loader2 size={12} className="animate-spin" />
              ) : null}
              Start Review
            </button>
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            {expanded ? (
              <>
                <ChevronUp size={12} /> Collapse
              </>
            ) : (
              <>
                <ChevronDown size={12} />{" "}
                {dispute.status !== "resolved" ? "Resolve" : "View details"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded resolve panel */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-5 lg:p-6 space-y-5">
          {/* Full reason */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
              Dispute Reason
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
              {dispute.reason}
            </p>
          </div>

          {/* Evidence */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
              Evidence ({dispute.evidence.length})
            </p>
            {dispute.evidence.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 italic">
                No evidence submitted.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {dispute.evidence.map((e, i) => (
                  <a
                    key={i}
                    href={e.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    {e.type === "pdf" ? (
                      <FileText size={14} className="text-red-500" />
                    ) : (
                      <ImageIcon size={14} className="text-blue-500" />
                    )}
                    Evidence {i + 1}{" "}
                    <ExternalLink size={11} className="opacity-40" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Admin notes */}
          {dispute.status !== "resolved" && (
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">
                Admin Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                placeholder="Document your decision and reasoning here..."
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          )}

          {/* Resolution options */}
          {dispute.status !== "resolved" ? (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                Resolution Action
              </p>
              {isField && (
                <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-1.5">
                  <Wrench size={11} />
                  Field booking — no payment involved. Resolutions affect honor
                  scores only.
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {resolutionOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => resolve(opt.value)}
                    disabled={!!resolving}
                    className={`${opt.color} text-white rounded-2xl p-4 text-left transition disabled:opacity-50`}
                  >
                    <p className="font-black text-sm">
                      {opt.icon} {opt.label}
                    </p>
                    <p className="text-xs opacity-80 mt-0.5">{opt.desc}</p>
                    {resolving === opt.value && (
                      <Loader2 size={14} className="animate-spin mt-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-200 dark:ring-emerald-700 p-4">
              <p className="font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle size={16} /> Resolved
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1 capitalize">
                {dispute.resolution?.replace(/_/g, " ")}
              </p>
              {dispute.adminNotes && (
                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                  {dispute.adminNotes}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchDisputes = useCallback(async () => {
    try {
      setLoading(true);
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await api.get(`/disputes${params}`);
      setDisputes(Array.isArray(res.data) ? res.data : res.data.disputes || []);
    } catch {
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const counts = {
    open: disputes.filter((d) => d.status === "open").length,
    under_review: disputes.filter((d) => d.status === "under_review").length,
    resolved: disputes.filter((d) => d.status === "resolved").length,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <ShieldAlert size={28} className="text-red-500" /> Disputes
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-1">
              Review evidence and resolve conflicts
            </p>
          </div>
          <button
            onClick={fetchDisputes}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-black text-slate-700 dark:text-white hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
            Refresh
          </button>
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-3">
          {[
            { key: "all", label: "All", count: disputes.length },
            { key: "open", label: "Open", count: counts.open },
            {
              key: "under_review",
              label: "Under Review",
              count: counts.under_review,
            },
            { key: "resolved", label: "Resolved", count: counts.resolved },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                statusFilter === f.key
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {f.label}{" "}
              {f.count > 0 && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                    statusFilter === f.key
                      ? "bg-white/20"
                      : "bg-slate-100 dark:bg-slate-700"
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Open disputes alert */}
        {counts.open > 0 && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-200 dark:ring-amber-700 px-5 py-3 flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
              {counts.open} dispute{counts.open > 1 ? "s" : ""} awaiting review
            </p>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={36} className="animate-spin text-slate-400" />
          </div>
        ) : disputes.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-black/5 dark:ring-white/10 p-16 flex flex-col items-center gap-4">
            <ShieldAlert size={40} className="text-slate-300" />
            <p className="font-black text-slate-400">No disputes found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map((d) => (
              <DisputeCard key={d._id} dispute={d} onResolved={fetchDisputes} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
