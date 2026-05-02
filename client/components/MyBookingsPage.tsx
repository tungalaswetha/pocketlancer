// client/components/MyBookingsPage.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import ReviewModal from "@/components/ReviewModal";
import DisputeModal from "@/components/DisputeModal";
import { useUser } from "@/context/UserContext";
import {
  Calendar,
  Clock,
  Star,
  Loader2,
  Briefcase,
  CheckCircle2,
  BadgeCheck,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  IndianRupee,
  ShieldCheck,
  Globe,
  Zap,
  Lock,
  AlertCircle,
  Navigation,
  ThumbsUp,
  Shield,
  RefreshCw,
} from "lucide-react";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "pending_approval"
  | "completed"
  | "cancelled"
  | "disputed";
type PaymentStatus =
  | "unpaid"
  | "pending"
  | "held"
  | "partially_released"
  | "released"
  | "refunded"
  | "partial_refund"
  | "field_pending"
  | "field_paid";

type Booking = {
  _id: string;
  serviceType: string;
  serviceCategory?: "field" | "digital";
  preferredDate: string;
  preferredTime: string;
  status: BookingStatus;
  paymentStatus?: PaymentStatus;
  agreedAmount?: number;
  pricingType?: string;
  address?: string;
  issueDescription?: string;
  arrivalVerified?: boolean;
  clientId?: { name?: string; honorScore?: number };
  freelancerId?: { name?: string; title?: string };
};

function fmt(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function StatusPill({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, string> = {
    completed:
      "bg-emerald-500/10 text-emerald-700 ring-emerald-500/15 dark:text-emerald-300",
    confirmed:
      "bg-indigo-500/10 text-indigo-700 ring-indigo-500/15 dark:text-indigo-300",
    in_progress:
      "bg-blue-500/10 text-blue-700 ring-blue-500/15 dark:text-blue-300",
    pending_approval:
      "bg-amber-500/10 text-amber-700 ring-amber-500/15 dark:text-amber-300",
    cancelled: "bg-red-500/10 text-red-700 ring-red-500/15 dark:text-red-300",
    disputed:
      "bg-orange-500/10 text-orange-700 ring-orange-500/15 dark:text-orange-300",
    pending:
      "bg-slate-500/10 text-slate-700 ring-slate-500/15 dark:text-slate-300",
  };
  const label: Record<BookingStatus, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    in_progress: "In Progress",
    pending_approval: "Awaiting Approval",
    completed: "Completed",
    cancelled: "Cancelled",
    disputed: "Disputed",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black ring-1 ${map[status] || map.pending}`}
    >
      {label[status] || status}
    </span>
  );
}

function PayBadge({ ps }: { ps?: PaymentStatus }) {
  if (!ps) return null;
  const map: Record<string, { label: string; cls: string }> = {
    unpaid: {
      label: "Unpaid",
      cls: "bg-red-500/10 text-red-700 dark:text-red-300",
    },
    pending: {
      label: "Pending",
      cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    held: {
      label: "In Escrow",
      cls: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    },
    partially_released: {
      label: "Partial Release",
      cls: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    },
    released: {
      label: "Released",
      cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    refunded: {
      label: "Refunded",
      cls: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    },
    partial_refund: {
      label: "Partial Refund",
      cls: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    },
    field_pending: {
      label: "Pay at Location",
      cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    field_paid: {
      label: "Paid at Location",
      cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
  };
  const e = map[ps];
  if (!e) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black ${e.cls}`}
    >
      {ps === "held" ? <Lock size={10} /> : <IndianRupee size={10} />}
      {e.label}
    </span>
  );
}

function HonorBadge({ score }: { score?: number }) {
  if (score === undefined) return null;
  const cls =
    score < 35
      ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
      : score < 75
        ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"
        : "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${cls}`}
    >
      <Shield size={9} /> {score}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
          {label}
        </p>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

const ALL_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
  "pending_approval",
  "completed",
  "cancelled",
  "disputed",
];

export default function MyBookingsPage() {
  const router = useRouter();
  const { user } = useUser();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [disputeBooking, setDisputeBooking] = useState<string | null>(null);

  const isClient = user?.role === "client";
  const isFreelancer = user?.role === "freelancer";

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/bookings/mybookings");
      setBookings(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const stats = useMemo(
    () => ({
      total: bookings.length,
      active: bookings.filter((b) =>
        ["pending", "confirmed", "in_progress", "pending_approval"].includes(
          b.status,
        ),
      ).length,
      completed: bookings.filter((b) => b.status === "completed").length,
      disputed: bookings.filter((b) => b.status === "disputed").length,
    }),
    [bookings],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bookings.filter((b) => {
      if (filter !== "all" && b.status !== filter) return false;
      if (q && !b.serviceType.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [bookings, filter, search]);

  const patch = async (
    bookingId: string,
    url: string,
    body: object,
    loadKey: string,
  ) => {
    try {
      setActionLoading(loadKey);
      await api.patch(url, body);
      await fetchBookings();
    } catch (err: any) {
      alert(err.response?.data?.msg || "Action failed");
    } finally {
      setActionLoading("");
    }
  };

  const updateStatus = (bookingId: string, status: string) =>
    patch(
      bookingId,
      `/bookings/${bookingId}/status`,
      { status },
      `${bookingId}:${status}`,
    );

  const confirmField = (bookingId: string) =>
    patch(
      bookingId,
      `/bookings/${bookingId}/confirm-field`,
      {},
      `${bookingId}:confirm`,
    );

  const releasePayment = async (bookingId: string) => {
    try {
      setActionLoading(`${bookingId}:release`);
      await api.post(`/bookings/${bookingId}/payment/release`);
      await fetchBookings();
    } catch (err: any) {
      alert(err.response?.data?.msg || "Release failed");
    } finally {
      setActionLoading("");
    }
  };

  if (loading)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );

  return (
    // ✅ No min-h-screen or bg here — parent layout provides the shell.
    // space-y-5 gives consistent vertical rhythm.
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            My Bookings
          </h1>
          <p className="text-sm font-bold text-slate-500">
            Track and manage your service bookings
          </p>
        </div>
        <button
          onClick={fetchBookings}
          className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-slate-700 ring-1 ring-black/5 active:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-white/10 shrink-0"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total"
          value={stats.total}
          icon={<Briefcase size={16} />}
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={<Zap size={16} />}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={<CheckCircle2 size={16} />}
        />
        <StatCard
          label="Disputed"
          value={stats.disputed}
          icon={<AlertCircle size={16} />}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookings…"
            className="w-full rounded-2xl bg-white py-3 pl-10 pr-4 text-sm font-bold text-slate-900 ring-1 ring-black/5 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-900 dark:text-white dark:ring-white/10 dark:focus:ring-white/30"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Filter size={14} className="shrink-0 text-slate-400" />
          {(["all", ...ALL_STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black transition ${filter === s ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-white text-slate-600 ring-1 ring-black/5 dark:bg-slate-900 dark:text-slate-300 dark:ring-white/10"}`}
            >
              {s === "all"
                ? "All"
                : s === "pending_approval"
                  ? "Approval"
                  : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <Briefcase size={48} className="text-slate-300" />
          <p className="font-black text-slate-500">No bookings found</p>
          {isClient && (
            <button
              onClick={() => router.push("/search")}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-900"
            >
              Find Freelancers
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const isDigital = b.serviceCategory === "digital";
            const isExp = expanded === b._id;

            const canAccept = isFreelancer && b.status === "pending";
            const canDeliver =
              isFreelancer &&
              ["confirmed", "in_progress"].includes(b.status) &&
              b.pricingType !== "milestone";
            const canConfirmField =
              isClient && b.status === "pending_approval";
            const canRelease =
              isClient &&
              b.serviceCategory === "digital" &&
              b.status === "in_progress" &&
              b.paymentStatus === "held";
            const canReview = isClient && b.status === "completed";
            const canDispute =
              !canConfirmField &&
              ["confirmed", "in_progress", "completed"].includes(b.status);

            return (
              <div
                key={b._id}
                className="overflow-hidden rounded-3xl bg-white ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10"
              >
                {/* Card header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`shrink-0 rounded-full p-1.5 ${isDigital ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
                        >
                          {isDigital ? (
                            <Globe size={12} />
                          ) : (
                            <MapPin size={12} />
                          )}
                        </span>
                        <p className="truncate font-black text-slate-900 dark:text-white">
                          {b.serviceType}
                        </p>
                        <StatusPill status={b.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} /> {fmt(b.preferredDate)}
                        </span>
                        {b.paymentStatus && <PayBadge ps={b.paymentStatus} />}
                        {isClient && (
                          <HonorBadge
                            score={(b.clientId as any)?.honorScore}
                          />
                        )}
                        {b.arrivalVerified && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Navigation size={11} /> Arrived
                          </span>
                        )}
                      </div>
                      {typeof b.agreedAmount === "number" && (
                        <p className="mt-1 text-sm font-black text-slate-700 dark:text-slate-200">
                          ₹{b.agreedAmount.toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setExpanded(isExp ? null : b._id)}
                      className="shrink-0 rounded-xl bg-slate-50 p-2 text-slate-500 active:bg-slate-100 dark:bg-slate-800 dark:active:bg-slate-700"
                    >
                      {isExp ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                  </div>

                  {/* Quick actions */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => router.push(`/bookings/${b._id}`)}
                      className="flex items-center gap-1.5 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white active:bg-slate-700 dark:bg-white dark:text-slate-900"
                    >
                      <BadgeCheck size={13} /> View Details
                    </button>

                    {canAccept && (
                      <button
                        onClick={() => updateStatus(b._id, "confirmed")}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white active:bg-emerald-700 disabled:opacity-60"
                      >
                        {actionLoading === `${b._id}:confirmed` ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={13} />
                        )}
                        Accept
                      </button>
                    )}

                    {canDeliver && (
                      <button
                        onClick={() => updateStatus(b._id, "completed")}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white active:bg-blue-700 disabled:opacity-60"
                      >
                        {actionLoading === `${b._id}:completed` ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={13} />
                        )}
                        {isDigital ? "Mark Delivered" : "Mark Completed"}
                      </button>
                    )}

                    {canConfirmField && (
                      <button
                        onClick={() => confirmField(b._id)}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white active:bg-emerald-700 disabled:opacity-60"
                      >
                        {actionLoading === `${b._id}:confirm` ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <ThumbsUp size={13} />
                        )}
                        Confirm Done
                      </button>
                    )}

                    {canRelease && (
                      <button
                        onClick={() => releasePayment(b._id)}
                        disabled={actionLoading === `${b._id}:release`}
                        className="flex items-center gap-1.5 rounded-2xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white active:bg-violet-700 disabled:opacity-60"
                      >
                        {actionLoading === `${b._id}:release` ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <ShieldCheck size={13} />
                        )}
                        Release Payment
                      </button>
                    )}

                    {canReview && (
                      <button
                        onClick={() => {
                          setSelectedBooking(b._id);
                          setShowReview(true);
                        }}
                        className="flex items-center gap-1.5 rounded-2xl bg-amber-500 px-4 py-2.5 text-xs font-black text-white active:bg-amber-600"
                      >
                        <Star size={13} fill="currentColor" /> Review
                      </button>
                    )}

                    {canDispute && (
                      <button
                        onClick={() => {
                          setDisputeBooking(b._id);
                          setShowDispute(true);
                        }}
                        className="flex items-center gap-1.5 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-xs font-black text-red-600 active:bg-red-50 dark:border-red-500/20 dark:bg-slate-950 dark:text-red-400"
                      >
                        <AlertCircle size={13} /> Dispute
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExp && (
                  <div className="border-t border-slate-100 px-5 py-4 dark:border-white/10">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {!isDigital && b.address && (
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                            <MapPin size={13} /> Address
                          </div>
                          <p className="mt-1 break-words text-sm font-bold text-slate-900 dark:text-white">
                            {b.address}
                          </p>
                        </div>
                      )}
                      {!isDigital && b.preferredTime && (
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                            <Clock size={13} /> Time
                          </div>
                          <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                            {b.preferredTime}
                          </p>
                        </div>
                      )}
                      {isDigital && b.paymentStatus === "held" && (
                        <div className="col-span-full rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/20 dark:bg-violet-500/10">
                          <div className="flex items-start gap-2">
                            <Lock
                              size={15}
                              className="mt-0.5 text-violet-600 dark:text-violet-400"
                            />
                            <p className="text-xs font-bold text-violet-800 dark:text-violet-200">
                              ₹{(b.agreedAmount || 0).toLocaleString("en-IN")}{" "}
                              held in escrow.{" "}
                              {b.status === "in_progress"
                                ? "Freelancer delivered — review and release payment."
                                : "Released after you approve the completed work."}
                            </p>
                          </div>
                        </div>
                      )}
                      {b.issueDescription && (
                        <div className="col-span-full rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                            <Star size={13} /> Notes
                          </div>
                          <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                            {b.issueDescription}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showReview && selectedBooking && (
        <ReviewModal
          bookingId={selectedBooking}
          onClose={() => {
            setShowReview(false);
            fetchBookings();
          }}
        />
      )}
      {showDispute && disputeBooking && (
        <DisputeModal
          bookingId={disputeBooking}
          onClose={() => {
            setShowDispute(false);
            fetchBookings();
          }}
        />
      )}
    </div>
  );
}
