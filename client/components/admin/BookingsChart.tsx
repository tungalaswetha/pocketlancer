"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function BookingsChart({ data }: { data: any }) {
  // 🛡️ FULL SAFETY GUARD
  const safeData =
    Array.isArray(data) &&
    data.every(
      (d) => typeof d === "object" && d !== null && "name" in d && "count" in d,
    )
      ? data
      : [];

  if (safeData.length === 0) {
    return (
      <div className="rounded-2xl border bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="font-black text-slate-900 dark:text-white">
          Booking Activity
        </h2>

        <div className="h-[220px] flex items-center justify-center text-sm font-bold text-slate-400">
          No booking data available yet
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white dark:bg-slate-900 p-6 shadow-sm">
      <h2 className="font-black text-slate-900 dark:text-white mb-4">
        Booking Activity
      </h2>

      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={safeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
