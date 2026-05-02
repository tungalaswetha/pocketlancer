"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Briefcase,
  Clock,
  Timer,
  CheckCircle2,
  BanIcon,
  Save,
  Trash2,
  Info,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────── */

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

type Booking = {
  _id: string;
  serviceType: string;
  preferredDate: string;
  preferredTime: string;
  status: BookingStatus;
  estimatedDurationMinutes?: number;
  clientId?: { name?: string; email?: string };
};

type UnavailableRange = {
  _id?: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  note: string;
};

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function prettyDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function prettyRange(start: string, end: string) {
  if (start === end)
    return new Date(start + "T12:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const s = new Date(start + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const e = new Date(end + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${s} – ${e}`;
}

function statusPill(status: BookingStatus) {
  const map: Record<BookingStatus, string> = {
    completed:
      "bg-emerald-500/10 text-emerald-700 ring-emerald-500/15 dark:text-emerald-300",
    confirmed:
      "bg-indigo-500/10 text-indigo-700 ring-indigo-500/15 dark:text-indigo-300",
    cancelled: "bg-red-500/10 text-red-700 ring-red-500/15 dark:text-red-300",
    pending: "bg-blue-500/10 text-blue-700 ring-blue-500/15 dark:text-blue-300",
  };
  return map[status] ?? map.pending;
}

function statusLabel(status: BookingStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function isInRange(key: string, ranges: UnavailableRange[]) {
  return ranges.some((r) => key >= r.start && key <= r.end);
}

/* ─────────────────────────────────────────────────────────────────
   SHARED CALENDAR SHELL
───────────────────────────────────────────────────────────────── */

type CalendarCell = { date: Date; inMonth: boolean; key: string };

function buildCells(monthCursor: Date): CalendarCell[] {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstDay.getDay(); i++) {
    const d = new Date(year, month, 1 - (firstDay.getDay() - i));
    cells.push({ date: d, inMonth: false, key: toKey(d) });
  }
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const d = new Date(year, month, day);
    cells.push({ date: d, inMonth: true, key: toKey(d) });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last);
    d.setDate(d.getDate() + 1);
    cells.push({ date: d, inMonth: false, key: toKey(d) });
  }
  return cells;
}

/* ─────────────────────────────────────────────────────────────────
   BOOKINGS CALENDAR TAB
───────────────────────────────────────────────────────────────── */

function BookingsCalendar({ bookings }: { bookings: Booking[] }) {
  const router = useRouter();
  const todayKey = toKey(new Date());

  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const d = b.preferredDate ? new Date(b.preferredDate) : null;
      if (!d || isNaN(d.getTime())) continue;
      const k = toKey(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(b);
    }
    return map;
  }, [bookings]);

  const cells = useMemo(() => buildCells(monthCursor), [monthCursor]);
  const monthLabel = monthCursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedKey]);
  const selectedBookings = bookingsByDate.get(selectedKey) || [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Calendar */}
      <div className="lg:col-span-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950 sm:p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() =>
                setMonthCursor(
                  (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1),
                )
              }
              className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-center">
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {monthLabel}
              </p>
              <p className="text-xs font-bold text-slate-500">
                Tap a day to view bookings
              </p>
            </div>
            <button
              onClick={() =>
                setMonthCursor(
                  (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1),
                )
              }
              className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 sm:gap-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} className="py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-2">
            {cells.map((cell) => {
              const isSelected = selectedKey === cell.key;
              const isToday = todayKey === cell.key;
              const count = bookingsByDate.get(cell.key)?.length || 0;

              return (
                <button
                  key={cell.key}
                  onClick={() => setSelectedKey(cell.key)}
                  className={[
                    "relative flex flex-col items-center rounded-xl p-1 transition sm:rounded-2xl sm:p-2",
                    cell.inMonth
                      ? "hover:bg-slate-50 dark:hover:bg-white/5"
                      : "opacity-40",
                    isSelected
                      ? "bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                      : "bg-white dark:bg-slate-950",
                    isToday && !isSelected ? "ring-2 ring-blue-500" : "",
                  ].join(" ")}
                >
                  {/* Date number */}
                  <span
                    className={[
                      "text-xs font-black sm:text-sm",
                      isSelected
                        ? "text-white"
                        : cell.inMonth
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-400 dark:text-slate-500",
                    ].join(" ")}
                  >
                    {cell.date.getDate()}
                  </span>

                  {/* Today dot (no text — prevents overflow) */}
                  {isToday && !isSelected && (
                    <span className="mt-0.5 h-1 w-1 rounded-full bg-blue-500" />
                  )}

                  {/* Booking dot */}
                  {count > 0 && (
                    <span
                      className={[
                        "mt-0.5 h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5",
                        isSelected ? "bg-white" : "bg-blue-600",
                      ].join(" ")}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div className="lg:col-span-4">
        <div className="sticky top-24 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Selected Day
            </p>
            <p className="mt-1.5 text-base font-black text-slate-900 dark:text-white leading-snug">
              {prettyDate(selectedDate)}
            </p>

            <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {selectedBookings.length} booking
                {selectedBookings.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {selectedBookings.length === 0 ? (
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  No bookings for this day.
                </p>
              ) : (
                selectedBookings.map((b) => (
                  <div
                    key={b._id}
                    className="rounded-2xl bg-white p-4 ring-1 ring-black/5 shadow-sm dark:bg-slate-950 dark:ring-white/10"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                          {b.serviceType}
                        </p>
                        {b.clientId?.name && (
                          <p className="mt-0.5 text-xs font-bold text-slate-500">
                            Client: {b.clientId.name}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ${statusPill(b.status)}`}
                      >
                        {statusLabel(b.status)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                        <Clock size={13} className="text-slate-400" />
                        {b.preferredTime || "—"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                        <Timer size={13} className="text-slate-400" />
                        {typeof b.estimatedDurationMinutes === "number"
                          ? `${b.estimatedDurationMinutes} min`
                          : "—"}
                      </span>
                    </div>

                    <button
                      onClick={() => router.push("/freelancer/bookings")}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                    >
                      <Briefcase size={14} /> Open Bookings
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-5 text-white shadow-sm">
            <p className="text-sm font-black">Pro tip</p>
            <p className="mt-1.5 text-sm text-slate-200 font-semibold">
              Confirm bookings early to improve client trust and boost your
              profile ranking.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-xs font-black text-slate-200">
              <CheckCircle2 size={14} /> Better profile visibility
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   AVAILABILITY CALENDAR TAB
───────────────────────────────────────────────────────────────── */

function AvailabilityCalendar() {
  const todayKey = toKey(new Date());

  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // savedRanges = what came from server (shown in dark red)
  // ranges = current editing state (includes saved + new additions)
  const [savedRanges, setSavedRanges] = useState<UnavailableRange[]>([]);
  const [ranges, setRanges] = useState<UnavailableRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Two-step selection: first tap = start, second tap = end
  const [selecting, setSelecting] = useState<{ start: string } | null>(null);
  // For desktop mouse hover preview
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  // Load from server
  useEffect(() => {
    api
      .get("/freelancers/availability")
      .then((res) => {
        const loaded = res.data.unavailableRanges || [];
        setSavedRanges(loaded);
        setRanges(loaded);
      })
      .catch(() => setError("Failed to load availability"))
      .finally(() => setLoading(false));
  }, []);

  const cells = useMemo(() => buildCells(monthCursor), [monthCursor]);
  const monthLabel = monthCursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  // Preview range while selecting (desktop hover OR during active selection)
  const previewRange: { start: string; end: string } | null = useMemo(() => {
    if (!selecting) return null;
    const endKey = hoverKey || selecting.start; // on mobile, preview from start→start until second tap
    const start = selecting.start <= endKey ? selecting.start : endKey;
    const end = selecting.start <= endKey ? endKey : selecting.start;
    return { start, end };
  }, [selecting, hoverKey]);

  const handleCellClick = (key: string) => {
    if (key < todayKey) return;

    if (!selecting) {
      setSelecting({ start: key });
    } else {
      const start = selecting.start <= key ? selecting.start : key;
      const end = selecting.start <= key ? key : selecting.start;

      // Toggle: if this exact range already exists, remove it
      const existingIdx = ranges.findIndex(
        (r) => r.start === start && r.end === end,
      );
      if (existingIdx !== -1) {
        setRanges((prev) => prev.filter((_, i) => i !== existingIdx));
      } else if (start === end) {
        // Single day: check if inside an existing range → split it out
        const insideIdx = ranges.findIndex(
          (r) => start >= r.start && start <= r.end,
        );
        if (insideIdx !== -1) {
          const r = ranges[insideIdx];
          const newRanges = ranges.filter((_, i) => i !== insideIdx);
          if (r.start < start)
            newRanges.push({
              start: r.start,
              end: addDays(start, -1),
              note: r.note,
            });
          if (r.end > start)
            newRanges.push({
              start: addDays(start, 1),
              end: r.end,
              note: r.note,
            });
          setRanges(newRanges);
          setSelecting(null);
          return;
        }
        setRanges((prev) => [...prev, { start, end, note: "" }]);
      } else {
        setRanges((prev) => [...prev, { start, end, note: "" }]);
      }
      setSelecting(null);
      setHoverKey(null);
    }
  };

  const removeRange = (idx: number) => {
    setRanges((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await api.put("/freelancers/availability", { unavailableRanges: ranges });
      setSavedRanges(ranges); // update the saved baseline
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges =
    JSON.stringify(ranges) !== JSON.stringify(savedRanges);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
        <Loader2 className="animate-spin" size={20} />
        <span className="font-black">Loading availability…</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Calendar */}
      <div className="lg:col-span-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950 sm:p-5">
          {/* Status banner */}
          <div
            className={[
              "mb-4 flex items-start gap-2 rounded-2xl px-4 py-3 text-xs font-bold ring-1",
              selecting
                ? "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20"
                : "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-white/10",
            ].join(" ")}
          >
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              {selecting
                ? `Start selected: ${selecting.start} — now tap the end date to block the range.`
                : savedRanges.length > 0
                  ? `${savedRanges.length} saved block${savedRanges.length > 1 ? "s" : ""} loaded. Tap a date to start a new block, or tap a red date to remove it.`
                  : "Tap a start date, then tap an end date to block that range. Tap a blocked date to unblock."}
            </span>
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() =>
                setMonthCursor(
                  (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1),
                )
              }
              className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {monthLabel}
            </p>
            <button
              onClick={() =>
                setMonthCursor(
                  (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1),
                )
              }
              className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 sm:gap-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} className="py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-2">
            {cells.map((cell) => {
              const isPast = cell.key < todayKey;
              const isToday = cell.key === todayKey;
              const isSelectionStart = selecting?.start === cell.key;

              // Is this date in the SAVED (server) ranges?
              const isSaved = isInRange(cell.key, savedRanges);
              // Is this date in the CURRENT (editing) ranges but NOT yet saved?
              const isNewBlock = isInRange(cell.key, ranges) && !isSaved;
              // Is already saved (will show darker red)
              const isSavedBlock = isSaved;
              // Is in the hover/selection preview?
              const isInPreview =
                !!previewRange &&
                cell.key >= previewRange.start &&
                cell.key <= previewRange.end &&
                !isInRange(cell.key, ranges); // don't re-colour already-blocked dates

              return (
                <button
                  key={cell.key}
                  disabled={isPast}
                  onClick={() => handleCellClick(cell.key)}
                  onMouseEnter={() => selecting && setHoverKey(cell.key)}
                  onMouseLeave={() => selecting && setHoverKey(null)}
                  className={[
                    "relative flex flex-col items-center rounded-xl p-1 transition sm:rounded-2xl sm:p-2",
                    isPast ? "cursor-not-allowed opacity-25" : "cursor-pointer",
                    !cell.inMonth ? "opacity-40" : "",
                    isSelectionStart
                      ? "bg-amber-500 hover:bg-amber-600"
                      : isInPreview
                        ? "bg-amber-200 dark:bg-amber-500/30"
                        : isSavedBlock
                          ? "bg-red-600 hover:bg-red-700" // dark red = saved on server
                          : isNewBlock
                            ? "bg-red-400 hover:bg-red-500" // lighter red = added this session
                            : "bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-white/5",
                    isToday &&
                    !isSelectionStart &&
                    !isSavedBlock &&
                    !isNewBlock &&
                    !isInPreview
                      ? "ring-2 ring-blue-500"
                      : "",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "text-xs font-black sm:text-sm",
                      isSelectionStart || isSavedBlock || isNewBlock
                        ? "text-white"
                        : isInPreview
                          ? "text-amber-800 dark:text-amber-200"
                          : cell.inMonth
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-400",
                    ].join(" ")}
                  >
                    {cell.date.getDate()}
                  </span>

                  {/* Today dot — only when not blocked */}
                  {isToday &&
                    !isSelectionStart &&
                    !isSavedBlock &&
                    !isNewBlock && (
                      <span className="mt-0.5 h-1 w-1 rounded-full bg-blue-500" />
                    )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-red-600" /> Saved block
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-red-400" /> New block
              (unsaved)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-amber-500" /> Selecting…
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm ring-2 ring-blue-500" /> Today
            </span>
          </div>
        </div>

        {/* Save button */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {selecting && (
            <button
              onClick={() => {
                setSelecting(null);
                setHoverKey(null);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 transition"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Saving…" : hasUnsavedChanges ? "Save Changes" : "Saved"}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={14} /> Saved!
            </span>
          )}
          {error && (
            <span className="text-xs font-bold text-red-600">{error}</span>
          )}
        </div>
      </div>

      {/* Blocked ranges list */}
      <div className="lg:col-span-4">
        <div className="sticky top-24 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Blocked Periods
              </p>
              {hasUnsavedChanges && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                  unsaved changes
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
              {ranges.length === 0
                ? "No dates blocked."
                : `${ranges.length} period${ranges.length > 1 ? "s" : ""} blocked`}
            </p>

            <div className="mt-4 space-y-2">
              {ranges.length === 0 ? (
                <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                  ✅ Fully available
                </div>
              ) : (
                ranges
                  .slice()
                  .sort((a, b) => a.start.localeCompare(b.start))
                  .map((r, i) => {
                    const isSavedRange = savedRanges.some(
                      (s) => s.start === r.start && s.end === r.end,
                    );
                    return (
                      <div
                        key={i}
                        className={[
                          "flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-1",
                          isSavedRange
                            ? "bg-red-50 ring-red-200 dark:bg-red-500/10 dark:ring-red-500/20"
                            : "bg-amber-50 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/20",
                        ].join(" ")}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {!isSavedRange && (
                              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">
                                NEW
                              </span>
                            )}
                            <p
                              className={[
                                "text-xs font-black leading-snug",
                                isSavedRange
                                  ? "text-red-800 dark:text-red-200"
                                  : "text-amber-800 dark:text-amber-200",
                              ].join(" ")}
                            >
                              {prettyRange(r.start, r.end)}
                            </p>
                          </div>
                          {r.note && (
                            <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">
                              {r.note}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeRange(ranges.indexOf(r))}
                          className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-500/20 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })
              )}
            </div>

            {ranges.length > 0 && (
              <button
                onClick={() => setRanges([])}
                className="mt-4 w-full rounded-2xl border border-slate-200 py-2.5 text-xs font-black text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:border-white/10 dark:text-slate-300 dark:hover:bg-red-500/10 transition"
              >
                Clear All Blocks
              </button>
            )}
          </div>

          <div className="rounded-3xl bg-slate-900 p-5 text-white shadow-sm">
            <p className="text-sm font-black">How it works</p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-300 font-semibold">
              <li>🔴 Dark red = saved on server</li>
              <li>🟠 Orange = added this session (not saved yet)</li>
              <li>• Tap start date → tap end date to block</li>
              <li>• Tap a blocked date to remove it</li>
              <li>• Press Save Changes when done</li>
              <li>• Blocked days are hidden from search</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   HELPER — add/subtract days
───────────────────────────────────────────────────────────────── */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/* ─────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────── */

export default function FreelancerCalendarPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"bookings" | "availability">(
    "bookings",
  );

  // Auth guard
  useEffect(() => {
    if (!userLoading && (!user || user.role !== "freelancer")) {
      router.replace("/dashboard");
    }
  }, [userLoading, user, router]);

  // Fetch bookings
  useEffect(() => {
    if (!user || user.role !== "freelancer") return;
    api
      .get("/bookings/mybookings")
      .then((res) => setBookings(res.data?.data || []))
      .catch(() => {})
      .finally(() => setBookingsLoading(false));
  }, [user]);

  if (userLoading || bookingsLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center gap-3 text-slate-500">
        <Loader2 className="animate-spin" size={20} />
        <p className="font-black">Loading calendar…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-44 -left-44 h-[32rem] w-[32rem] rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Header */}
        <div className="relative border-b border-slate-200 px-5 py-6 lg:px-10 lg:py-9 dark:border-white/10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                <CalendarDays size={15} className="text-blue-500" />
                Freelancer Calendar
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:text-4xl">
                {activeTab === "bookings" ? "My Bookings" : "My Availability"}
              </h1>
              <p className="mt-1.5 text-sm font-bold text-slate-600 dark:text-slate-300">
                {activeTab === "bookings"
                  ? "See bookings per day and plan your month professionally."
                  : "Block dates when you're unavailable. Clients won't see you on those days."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/freelancer/bookings")}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-900 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
              >
                View All Bookings
              </button>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="mt-5 flex gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1 w-fit dark:border-white/10 dark:bg-slate-900">
            <button
              onClick={() => setActiveTab("bookings")}
              className={[
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition",
                activeTab === "bookings"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              ].join(" ")}
            >
              <Briefcase size={15} /> Bookings
            </button>
            <button
              onClick={() => setActiveTab("availability")}
              className={[
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition",
                activeTab === "availability"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              ].join(" ")}
            >
              <BanIcon size={15} /> Availability
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="relative px-4 py-6 lg:px-10">
          {activeTab === "bookings" ? (
            <BookingsCalendar bookings={bookings} />
          ) : (
            <AvailabilityCalendar />
          )}
        </div>
      </div>
    </div>
  );
}
