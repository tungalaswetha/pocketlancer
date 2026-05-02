// client/app/dashboard/freelancer/page.tsx
// KEY ADDITIONS:
// 1. "Today's Field Jobs" quick-arrive widget — freelancer taps one button
//    without opening the booking detail page.
// 2. Status update for "completed" now correctly uses "pending_approval" flow.
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";
import {
  Loader2,
  CalendarCheck2,
  Star,
  TrendingUp,
  User,
  ArrowRight,
  BadgeCheck,
  MapPin,
  Briefcase,
  CheckCircle,
  XCircle,
  ClipboardList,
  Shield,
  Navigation,
  Clock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "pending_approval"
  | "completed"
  | "cancelled"
  | "disputed"
  | "rejected";

type Booking = {
  _id: string;
  serviceType: string;
  preferredDate: string;
  preferredTime: string;
  status: BookingStatus;
  serviceCategory?: "field" | "digital";
  deadline?: string;
  autoReleaseAt?: string;
  arrivalVerified?: boolean;
  address?: string;
  clientId?: { name?: string; avatar?: string };
};

type Profile = {
  _id?: string;
  title?: string;
  bio?: string;
  skills?: string[];
  hourlyRate?: number;
  city?: string;
  country?: string;
  profilePic?: string;
  category?: string;
  location?: { type: "Point"; coordinates: number[] };
  portfolio?: string[];
  pastWorks?: any[];
};

function honorLabel(score: number) {
  if (score < 35) return "Low Trust";
  if (score < 75) return "Average";
  return "Trusted";
}

function honorColors(score: number) {
  if (score < 35)
    return {
      bar: "bg-red-500",
      card: "from-red-950 to-slate-900",
      icon: "bg-red-500/20 text-red-300 ring-red-500/30",
      text: "text-red-300",
      tip: "Raise your score by completing all bookings reliably.",
    };
  if (score < 75)
    return {
      bar: "bg-orange-400",
      card: "from-orange-950 to-slate-900",
      icon: "bg-orange-500/20 text-orange-300 ring-orange-500/30",
      text: "text-orange-300",
      tip: "Keep completing bookings on time to reach Trusted status.",
    };
  return {
    bar: "bg-emerald-500",
    card: "from-emerald-950 to-slate-900",
    icon: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30",
    text: "text-emerald-300",
    tip: "Great work! Every clean booking adds +2 to your score.",
  };
}

const SCORE_EVENTS = [
  { event: "Clean completion", change: "+2", color: "text-emerald-400" },
  { event: "Missed arrival", change: "−5", color: "text-orange-400" },
  { event: "Missed deadline", change: "−5", color: "text-orange-400" },
  { event: "Cancelled confirmed job", change: "−5", color: "text-orange-400" },
  {
    event: "Dispute resolved against you",
    change: "−10",
    color: "text-red-400",
  },
];

export default function FreelancerDashboard() {
  const router = useRouter();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  // Quick-arrive state
  const [arrivingId, setArrivingId] = useState<string | null>(null);

  const score = user?.honorScore ?? 100;
  const hc = honorColors(score);
  const card =
    "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10";

  useEffect(() => {
    Promise.all([api.get("/bookings/mybookings"), api.get("/freelancers/me")])
      .then(([bRes, pRes]) => {
        setBookings(bRes.data?.data || []);
        setProfile(pRes.data?.profile || null);
      })
      .catch(() => {
        setBookings([]);
        setProfile(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const stats = useMemo(
    () => ({
      total: bookings.length,
      completed: bookings.filter((b) => b.status === "completed").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      pending: bookings.filter((b) => b.status === "pending").length,
    }),
    [bookings],
  );

  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status === "pending"),
    [bookings],
  );

  const confirmedBookings = useMemo(
    () =>
      bookings.filter((b) => ["confirmed", "in_progress"].includes(b.status)),
    [bookings],
  );

  // Today's field bookings that haven't been marked as arrived yet
  const todayStr = new Date().toISOString().split("T")[0];
  const todayFieldBookings = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.serviceCategory === "field" &&
          ["confirmed", "in_progress"].includes(b.status) &&
          b.preferredDate === todayStr &&
          !b.arrivalVerified,
      ),
    [bookings, todayStr],
  );

  const profileCompletion = useMemo(() => {
    if (!profile) return { percent: 0, missing: [] as string[] };
    const missing: string[] = [];
    if (!profile.title) missing.push("Professional title");
    if (!profile.bio) missing.push("Bio");
    if (!profile.skills || profile.skills.length < 5) missing.push("5+ skills");
    if (!profile.portfolio || profile.portfolio.length < 2)
      missing.push("Portfolio items");
    if (!profile.pastWorks || profile.pastWorks.length < 2)
      missing.push("Past works");
    if (!profile.profilePic) missing.push("Profile picture");
    const coords = profile.location?.coordinates || [];
    if (profile.category === "field" && coords.length !== 2)
      missing.push("GPS Location");
    const done = 7 - missing.length;
    return { percent: Math.round((done / 7) * 100), missing };
  }, [profile]);

  const updateStatus = async (
    bookingId: string,
    status: "confirmed" | "completed" | "cancelled" | "rejected",
  ) => {
    try {
      setActionLoading(`${bookingId}:${status}`);
      const res = await api.patch(`/bookings/${bookingId}/status`, { status });
      const updated = res.data.booking;
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, ...updated } : b)),
      );
      setToast(
        status === "rejected" ? "Booking rejected" : `Booking → ${status}`,
      );
    } catch (err: any) {
      setToast(err?.response?.data?.msg || "Failed to update booking");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Quick Mark Arrived (uses device GPS) ─────────────────────────
  const handleQuickArrive = useCallback(async (bookingId: string) => {
    setArrivingId(bookingId);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        }),
      );

      await api.post("/bookings/quick-arrive", {
        bookingId,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? { ...b, arrivalVerified: true, status: "in_progress" }
            : b,
        ),
      );
      setToast("✅ Arrival marked! Client has been notified.");
    } catch (err: any) {
      const msg =
        err?.response?.data?.msg ||
        (err?.code === 1
          ? "Location permission denied. Please enable GPS."
          : err?.code === 3
            ? "GPS timed out. Please try again."
            : "Failed to mark arrival. Try again.");
      setToast(`⚠️ ${msg}`);
    } finally {
      setArrivingId(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-600">
        <Loader2 className="animate-spin" size={24} /> Loading freelancer
        dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* ── TODAY'S FIELD JOBS — Quick Arrive Panel ─────────────────── */}
      {todayFieldBookings.length > 0 && (
        <div className="rounded-3xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/40 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-2xl bg-amber-400 flex items-center justify-center">
              <Navigation size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-900 dark:text-amber-100">
                Today's Field Jobs
              </p>
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                Tap "Mark Arrived" when you reach the client — no need to open
                the booking
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {todayFieldBookings.map((b) => (
              <div
                key={b._id}
                className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {b.serviceType}
                  </p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock size={11} />
                    {b.preferredTime}
                    {b.address && (
                      <>
                        <span className="mx-1">·</span>
                        <MapPin size={11} />
                        <span className="truncate max-w-[150px]">
                          {b.address}
                        </span>
                      </>
                    )}
                  </p>
                  {b.clientId?.name && (
                    <p className="text-xs font-bold text-slate-400 mt-0.5">
                      Client: {b.clientId.name}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleQuickArrive(b._id)}
                  disabled={arrivingId === b._id}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-xs font-black transition disabled:opacity-60"
                >
                  {arrivingId === b._id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Navigation size={13} />
                  )}
                  {arrivingId === b._id ? "Getting GPS…" : "Mark Arrived"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Total",
            value: stats.total,
            icon: <ClipboardList size={16} />,
          },
          {
            label: "Completed",
            value: stats.completed,
            icon: <CheckCircle size={16} />,
          },
          {
            label: "Confirmed",
            value: stats.confirmed,
            icon: <CalendarCheck2 size={16} />,
          },
          {
            label: "Pending",
            value: stats.pending,
            icon: <Briefcase size={16} />,
          },
        ].map(({ label, value, icon }) => (
          <div key={label} className={card}>
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
        ))}
      </div>

      {/* ── Honor Score Card ────────────────────────────────────────── */}
      <div
        className={`rounded-3xl bg-gradient-to-br ${hc.card} p-6 text-white shadow-sm`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-white/60">
              Honor Score
            </p>
            <p className={`mt-1 text-5xl font-black ${hc.text}`}>{score}</p>
            <p className={`mt-1 text-sm font-bold ${hc.text}`}>
              {honorLabel(score)}
            </p>
          </div>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${hc.icon}`}
          >
            <Shield size={22} />
          </div>
        </div>

        <div className="mt-4 h-2 w-full rounded-full bg-white/10">
          <div
            className={`h-2 rounded-full transition-all ${hc.bar}`}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>

        <p className="mt-3 text-xs font-bold text-white/60">{hc.tip}</p>

        {/* Score events */}
        <div className="mt-4 flex flex-wrap gap-2">
          {SCORE_EVENTS.map((e) => (
            <span
              key={e.event}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-bold"
            >
              <span className={e.color}>{e.change}</span>
              <span className="text-white/70">{e.event}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Pending Bookings ────────────────────────────────────────── */}
      {pendingBookings.length > 0 && (
        <div className={card}>
          <p className="mb-4 text-sm font-black text-slate-900 dark:text-white">
            Pending Requests ({pendingBookings.length})
          </p>
          <div className="space-y-3">
            {pendingBookings.map((b) => (
              <div
                key={b._id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                      {b.serviceType}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                      {b.preferredDate} · {b.preferredTime}
                      {b.serviceCategory === "field" && (
                        <span className="ml-2 text-amber-600">📍 Field</span>
                      )}
                      {b.serviceCategory === "digital" && (
                        <span className="ml-2 text-violet-600">💻 Digital</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      onClick={() => updateStatus(b._id, "confirmed")}
                      disabled={!!actionLoading}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {actionLoading === `${b._id}:confirmed` ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <CheckCircle size={12} />
                      )}
                      Accept
                    </button>
                    <button
                      onClick={() => updateStatus(b._id, "rejected")}
                      disabled={!!actionLoading}
                      className="inline-flex items-center gap-1 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 px-3 py-1.5 text-xs font-black hover:bg-red-200 dark:hover:bg-red-500/30 disabled:opacity-50"
                    >
                      {actionLoading === `${b._id}:rejected` ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <XCircle size={12} />
                      )}
                      Reject
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/bookings/${b._id}`)}
                  className="mt-3 flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                >
                  View details <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Confirmed / Active Bookings ─────────────────────────────── */}
      {confirmedBookings.length > 0 && (
        <div className={card}>
          <p className="mb-4 text-sm font-black text-slate-900 dark:text-white">
            Active Bookings ({confirmedBookings.length})
          </p>
          <div className="space-y-3">
            {confirmedBookings.map((b) => (
              <div
                key={b._id}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition"
                onClick={() => router.push(`/bookings/${b._id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                    {b.serviceType}
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    {b.preferredDate} · {b.preferredTime}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${
                        b.status === "in_progress"
                          ? "bg-blue-500/10 text-blue-700 ring-blue-500/15"
                          : "bg-indigo-500/10 text-indigo-700 ring-indigo-500/15"
                      }`}
                    >
                      {b.status === "in_progress" ? "In Progress" : "Confirmed"}
                    </span>
                    {b.serviceCategory === "field" && b.arrivalVerified && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-500/15">
                        <Navigation size={9} /> Arrived
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  className="text-slate-400 flex-shrink-0"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Profile Completion ──────────────────────────────────────── */}
      {profileCompletion.percent < 100 && (
        <div
          className={`${card} border-2 border-dashed border-blue-200 dark:border-blue-500/20`}
        >
          <div className="flex items-center justify-between gap-4 mb-3">
            <p className="text-sm font-black text-slate-900 dark:text-white">
              Profile Completion
            </p>
            <span className="text-lg font-black text-blue-600">
              {profileCompletion.percent}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${profileCompletion.percent}%` }}
            />
          </div>
          {profileCompletion.missing.length > 0 && (
            <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
              Still needed: {profileCompletion.missing.slice(0, 3).join(", ")}
              {profileCompletion.missing.length > 3 &&
                ` +${profileCompletion.missing.length - 3} more`}
            </p>
          )}
          <button
            onClick={() => router.push("/freelancer/profile")}
            className="mt-3 inline-flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700"
          >
            Complete Profile <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
