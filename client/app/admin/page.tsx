"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";
import BookingsChart from "@/components/admin/BookingsChart";
import {
  Users,
  Briefcase,
  ShieldAlert,
  IndianRupee,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Calendar,
  RefreshCw,
} from "lucide-react";

interface Stats {
  users: number;
  freelancers: number;
  bookings: number;
  openDisputes: number;
  resolvedDisputes: number;
  bookingsToday: number;
  bookingsWeek: number;
  bookingsMonth: number;
  totalRevenue: number;
  pendingEscrow: number;
  chart: Array<{ name: string; count: number }>;
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-black/5 dark:ring-white/10 p-6 flex flex-col justify-between gap-4 ${onClick ? "cursor-pointer hover:shadow-md transition" : ""}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
          {label}
        </p>
        <div
          className={`h-10 w-10 rounded-2xl flex items-center justify-center ${accent}`}
        >
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-black text-slate-900 dark:text-white">
          {value}
        </p>
        {sub && <p className="text-xs font-bold text-slate-400 mt-1">{sub}</p>}
      </div>
      {onClick && (
        <div className="flex items-center gap-1 text-xs font-bold text-slate-400 mt-1">
          View details <ChevronRight size={12} />
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin"))
      router.replace("/dashboard");
  }, [user, authLoading, router]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/stats");
      setStats({
        users: res.data?.users ?? 0,
        freelancers: res.data?.freelancers ?? 0,
        bookings: res.data?.bookings ?? 0,
        openDisputes: res.data?.openDisputes ?? 0,
        resolvedDisputes: res.data?.resolvedDisputes ?? 0,
        bookingsToday: res.data?.bookingsToday ?? 0,
        bookingsWeek: res.data?.bookingsWeek ?? 0,
        bookingsMonth: res.data?.bookingsMonth ?? 0,
        totalRevenue: res.data?.totalRevenue ?? 0,
        pendingEscrow: res.data?.pendingEscrow ?? 0,
        chart: Array.isArray(res.data?.chart) ? res.data.chart : [],
      });
      setLastRefreshed(new Date());
    } catch {
      setStats({
        users: 0,
        freelancers: 0,
        bookings: 0,
        openDisputes: 0,
        resolvedDisputes: 0,
        bookingsToday: 0,
        bookingsWeek: 0,
        bookingsMonth: 0,
        totalRevenue: 0,
        pendingEscrow: 0,
        chart: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") fetchStats();
  }, [user]);

  if (authLoading || loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-bold">
          <Loader2 className="animate-spin" size={24} /> Loading admin
          dashboard...
        </div>
      </div>
    );

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      <div className="max-w-7xl mx-auto px-4 lg:px-10 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-1">
              Platform overview ·{" "}
              {lastRefreshed
                ? `Updated ${lastRefreshed.toLocaleTimeString()}`
                : ""}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchStats}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-black text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RefreshCw size={15} /> Refresh
            </button>
            <button
              onClick={() => router.push("/admin/disputes")}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 dark:bg-white px-5 py-2.5 text-sm font-black text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200"
            >
              <ShieldAlert size={15} />
              {stats.openDisputes > 0
                ? `${stats.openDisputes} Open Disputes`
                : "Disputes Panel"}
            </button>
          </div>
        </div>

        {/* Alert: open disputes */}
        {stats.openDisputes > 0 && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-200 dark:ring-amber-700 px-5 py-4 flex items-center gap-4">
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
              {stats.openDisputes} dispute{stats.openDisputes > 1 ? "s" : ""}{" "}
              require your attention.
            </p>
            <button
              onClick={() => router.push("/admin/disputes")}
              className="ml-auto text-xs font-black text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1"
            >
              Review <ChevronRight size={12} />
            </button>
          </div>
        )}

        {/* Primary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Users"
            value={stats.users}
            icon={<Users size={18} />}
            accent="bg-blue-100 dark:bg-blue-950/40 text-blue-600"
            onClick={() => router.push("/admin/users")}
          />
          <StatCard
            label="Freelancers"
            value={stats.freelancers}
            icon={<Briefcase size={18} />}
            accent="bg-purple-100 dark:bg-purple-950/40 text-purple-600"
          />
          <StatCard
            label="Total Bookings"
            value={stats.bookings}
            sub={`${stats.bookingsToday} today`}
            icon={<Calendar size={18} />}
            accent="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600"
            onClick={() => router.push("/admin/bookings")}
          />
          <StatCard
            label="Open Disputes"
            value={stats.openDisputes}
            sub={`${stats.resolvedDisputes} resolved`}
            icon={<ShieldAlert size={18} />}
            accent={
              stats.openDisputes > 0
                ? "bg-red-100 dark:bg-red-950/40 text-red-600"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
            }
            onClick={() => router.push("/admin/disputes")}
          />
        </div>

        {/* Financial stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Revenue Released"
            value={`₹${stats.totalRevenue.toLocaleString("en-IN")}`}
            icon={<IndianRupee size={18} />}
            accent="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600"
          />
          <StatCard
            label="Pending in Escrow"
            value={`₹${stats.pendingEscrow.toLocaleString("en-IN")}`}
            icon={<Clock size={18} />}
            accent="bg-amber-100 dark:bg-amber-950/40 text-amber-600"
          />
          <StatCard
            label="Bookings This Month"
            value={stats.bookingsMonth}
            sub={`${stats.bookingsWeek} this week`}
            icon={<TrendingUp size={18} />}
            accent="bg-slate-100 dark:bg-slate-800 text-slate-600"
          />
        </div>

        {/* Chart */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-black/5 dark:ring-white/10 p-6">
          <h2 className="font-black text-slate-900 dark:text-white mb-6">
            Booking Activity (Last 7 days)
          </h2>
          <BookingsChart data={stats.chart} />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: "Manage Disputes",
              desc: "Review evidence, resolve conflicts, trigger payments",
              href: "/admin/disputes",
              color: "bg-red-600 hover:bg-red-700",
            },
            {
              label: "View All Bookings",
              desc: "Monitor all platform bookings and statuses",
              href: "/admin/bookings",
              color:
                "bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-700",
            },
            {
              label: "User Management",
              desc: "Search users, manage roles and access",
              href: "/admin/users",
              color: "bg-blue-600 hover:bg-blue-700",
            },
          ].map((a) => (
            <button
              key={a.href}
              onClick={() => router.push(a.href)}
              className={`${a.color} text-white rounded-3xl p-6 text-left hover:shadow-lg transition-all`}
            >
              <p className="font-black text-lg">{a.label}</p>
              <p className="text-sm font-medium opacity-80 mt-1">{a.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
