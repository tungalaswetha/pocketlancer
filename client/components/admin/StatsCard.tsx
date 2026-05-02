"use client";

export default function StatsCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-950 dark:border-slate-800">
      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
        {title}
      </p>

      <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
        {value}
      </p>

      {subtitle && (
        <p className="mt-1 text-xs font-bold text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}
