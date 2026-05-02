// client/app/dashboard/client/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import GetLocationButton from "@/components/GetLocationButton";
import { useUser } from "@/context/UserContext";
import {
  Search,
  CalendarCheck2,
  Star,
  Loader2,
  ArrowRight,
  BadgeCheck,
  Shield,
} from "lucide-react";

type Booking = {
  _id: string;
  serviceType: string;
  preferredDate: string;
  preferredTime: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
};

// ── Honor score helpers ────────────────────────────────────────────
function honorLabel(score: number) {
  if (score < 35) return "Low Trust";
  if (score < 75) return "Average";
  return "Trusted";
}
function honorColor(score: number) {
  if (score < 35)
    return {
      bar: "bg-red-500",
      badge:
        "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20",
      card: "from-red-950 to-red-900",
      text: "text-red-300",
    };
  if (score < 75)
    return {
      bar: "bg-orange-400",
      badge:
        "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20",
      card: "from-orange-950 to-orange-900",
      text: "text-orange-300",
    };
  return {
    bar: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    card: "from-slate-900 to-emerald-950",
    text: "text-emerald-300",
  };
}

export default function ClientDashboard() {
  const { user } = useUser();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/bookings/mybookings")
      .then((res) => setBookings(res.data?.data || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total = bookings.length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    return { total, completed, confirmed, pending };
  }, [bookings]);

  const card =
    "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10";

  const score = user?.honorScore ?? 100;
  const hc = honorColor(score);

  return (
    <div className="space-y-6">
      {/* ── Welcome banner ── */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-7 text-white shadow">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-300">Welcome back</p>
            <h2 className="mt-1 text-3xl font-black">
              {user?.name || "Client"}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Find verified freelancers near you and book instantly.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/search")}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-900 active:bg-slate-100"
            >
              <Search size={16} /> Find Freelancers
            </button>
            <button
              onClick={() => router.push("/bookings")}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-5 py-3 text-sm font-black text-white active:bg-white/10"
            >
              <CalendarCheck2 size={16} /> My Bookings
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats row (honor score card replaces one stat) ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {/* Honor Score — full-width on small, 2 cols on lg */}
        <div
          className={`col-span-2 rounded-3xl bg-gradient-to-br ${hc.card} p-6 text-white shadow lg:col-span-2`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Honor Score
              </p>
              <p className="mt-2 text-5xl font-black">{score}</p>
              <p className={`mt-1 text-sm font-black ${hc.text}`}>
                {honorLabel(score)}
              </p>
            </div>
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${hc.badge}`}
            >
              <Shield size={22} />
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-[10px] font-black text-slate-500">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-700 ${hc.bar}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] font-bold text-slate-500">
              Complete bookings cleanly to raise your score.
            </p>
          </div>
        </div>

        {/* Booking stats */}
        {[
          { label: "Total", value: stats.total },
          { label: "Confirmed", value: stats.confirmed },
          { label: "Pending", value: stats.pending },
        ].map((s) => (
          <div key={s.label} className={card}>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              {s.label}
            </p>
            <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Completed stat — separate row so it doesn't feel crowded */}
      <div className="grid grid-cols-1">
        <div className={card}>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Completed Bookings
          </p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {stats.completed}
          </p>
        </div>
      </div>

      {/* ── Recent bookings ── */}
      <div className={card}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Recent Bookings
          </h3>
          <button
            onClick={() => router.push("/bookings")}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white active:bg-slate-700 dark:bg-white dark:text-slate-900"
          >
            View all <ArrowRight size={15} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={16} /> Loading…
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-black/5 dark:bg-slate-800">
            <p className="font-black text-slate-700 dark:text-white">
              No bookings yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Start by finding freelancers near you.
            </p>
            <button
              onClick={() => router.push("/search")}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white active:bg-blue-700"
            >
              <BadgeCheck size={16} /> Find Freelancers
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.slice(0, 5).map((b) => (
              <div
                key={b._id}
                onClick={() => router.push(`/bookings/${b._id}`)}
                className="flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5 active:bg-slate-100 dark:bg-slate-800 dark:ring-white/5"
              >
                <div>
                  <p className="font-black text-slate-900 dark:text-white">
                    {b.serviceType}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(b.preferredDate).toLocaleDateString()} ·{" "}
                    {b.preferredTime}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wider ring-1 ring-black/5 dark:bg-slate-900 dark:text-slate-300">
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tips ── */}
      <div className={card}>
        <h4 className="mb-3 font-black text-slate-900 dark:text-white">
          Tips to get faster bookings
        </h4>
        <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
          <li>• Choose the correct service type for accurate pricing</li>
          <li>• Prefer morning slots for quicker confirmations</li>
          <li>• Use a precise address + landmark for faster arrival</li>
          <li className="inline-flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
            <Star size={14} fill="currentColor" /> Leave a review after every
            booking
          </li>
        </ul>
      </div>

      <div>
        <GetLocationButton />
      </div>
    </div>
  );
}
