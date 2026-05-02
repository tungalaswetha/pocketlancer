"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/services/api";
import {
  CheckCircle2,
  Loader2,
  ShieldCheck,
  IndianRupee,
  ArrowRight,
  Copy,
  ExternalLink,
  Clock,
  Layers,
  AlertCircle,
  Briefcase,
} from "lucide-react";

function PaymentSuccessInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const bookingId = searchParams.get("bookingId") || "";
  const paymentId = searchParams.get("paymentId") || "";
  const amount = searchParams.get("amount") || "0";
  const service = searchParams.get("service") || "Service";

  const [booking, setBooking] = useState<any>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    setLoadingBooking(true);
    api
      .get(`/bookings/${bookingId}`)
      .then((r) => {
        setBooking(r.data.booking);
        // Confirm payment is held in escrow
        setVerified(r.data.booking?.paymentStatus === "held");
      })
      .catch(() => setVerified(false))
      .finally(() => setLoadingBooking(false));
  }, [bookingId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const freelancerName =
    booking?.freelancerId?.name ||
    booking?.freelancerId?.user?.name ||
    "Freelancer";

  const paidAt = booking?.paidAt
    ? new Date(booking.paidAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });

  // Auto-release date (7 days from now)
  const autoReleaseDate = booking?.autoReleaseAt
    ? new Date(booking.autoReleaseAt).toLocaleDateString("en-IN", {
        dateStyle: "long",
      })
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toLocaleDateString("en-IN", { dateStyle: "long" });
      })();

  if (loadingBooking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
        <Loader2 className="animate-spin" size={28} />
        <span className="text-lg font-black">Verifying payment…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Big success card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-950">
        {/* Top gradient glow */}
        <div className="absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />

        {/* Header */}
        <div className="relative flex flex-col items-center px-8 pt-12 pb-8 text-center">
          {/* Animated success icon */}
          <div className="relative mb-6">
            <div
              className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30"
              style={{
                animationDuration: "1.5s",
                animationIterationCount: "3",
              }}
            />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30">
              <CheckCircle2 size={40} className="text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Payment Successful!
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
            Your booking is confirmed and funds are securely held in escrow.
          </p>

          {/* Escrow shield */}
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-5 py-2 ring-1 ring-emerald-500/20">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
              {verified
                ? "Escrow Verified — Funds Secured"
                : "Payment Received"}
            </span>
          </div>
        </div>

        {/* Payment summary */}
        <div className="border-t border-slate-100 px-8 py-6 dark:border-white/10">
          <p className="mb-4 text-xs font-extrabold uppercase tracking-widest text-slate-400">
            Payment Summary
          </p>

          <div className="space-y-3">
            {/* Amount — big */}
            <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-4 dark:bg-white">
              <span className="text-sm font-black text-white dark:text-slate-900">
                Amount Paid
              </span>
              <span className="flex items-center gap-1 text-2xl font-black text-white dark:text-slate-900">
                <IndianRupee size={20} />
                {Number(amount).toLocaleString("en-IN")}
              </span>
            </div>

            {/* Details grid */}
            {[
              { label: "Service", value: service },
              { label: "Freelancer", value: freelancerName },
              { label: "Paid On", value: paidAt },
              {
                label: "Payment Status",
                value: "Held in Escrow",
                accent: true,
              },
              { label: "Auto-release On", value: autoReleaseDate },
            ].map(({ label, value, accent }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10"
              >
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {label}
                </span>
                <span
                  className={`text-right text-sm font-black ${accent ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}
                >
                  {value}
                </span>
              </div>
            ))}

            {/* Payment ID with copy */}
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Payment ID
              </span>
              <div className="flex items-center gap-2">
                <span className="max-w-[140px] truncate font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                  {paymentId || "—"}
                </span>
                {paymentId && (
                  <button
                    onClick={() => copyToClipboard(paymentId)}
                    className="rounded-lg bg-white p-1.5 shadow ring-1 ring-black/10 hover:bg-slate-50 dark:bg-slate-800 dark:ring-white/10 dark:hover:bg-slate-700"
                    title="Copy payment ID"
                  >
                    <Copy
                      size={13}
                      className={copied ? "text-emerald-500" : "text-slate-400"}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Booking ID with copy */}
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Booking ID
              </span>
              <div className="flex items-center gap-2">
                <span className="max-w-[140px] truncate font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                  {bookingId}
                </span>
                <button
                  onClick={() => copyToClipboard(bookingId)}
                  className="rounded-lg bg-white p-1.5 shadow ring-1 ring-black/10 hover:bg-slate-50 dark:bg-slate-800 dark:ring-white/10 dark:hover:bg-slate-700"
                >
                  <Copy size={13} className="text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* What happens next */}
        <div className="border-t border-slate-100 bg-slate-50 px-8 py-6 dark:border-white/10 dark:bg-slate-900">
          <p className="mb-4 text-xs font-extrabold uppercase tracking-widest text-slate-400">
            What happens next
          </p>
          <div className="space-y-3">
            {[
              {
                icon: <Briefcase size={15} />,
                text: "The freelancer will begin working on your project after confirming.",
                color: "bg-blue-500/10 text-blue-600",
              },
              {
                icon: <Layers size={15} />,
                text: "Once they submit the work, you review and approve it.",
                color: "bg-violet-500/10 text-violet-600",
              },
              {
                icon: <ShieldCheck size={15} />,
                text: "After your approval, funds are released from escrow to the freelancer.",
                color: "bg-emerald-500/10 text-emerald-600",
              },
              {
                icon: <Clock size={15} />,
                text: `Payment auto-releases on ${autoReleaseDate} if no action is taken.`,
                color: "bg-amber-500/10 text-amber-600",
              },
              {
                icon: <AlertCircle size={15} />,
                text: "Raise a dispute within 7 days of delivery if there's an issue.",
                color: "bg-red-500/10 text-red-600",
              },
            ].map(({ icon, text, color }, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl ${color}`}
                >
                  {icon}
                </span>
                <p className="text-sm font-bold leading-relaxed text-slate-600 dark:text-slate-300">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-100 px-8 py-6 dark:border-white/10">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => router.push("/bookings")}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            >
              <Briefcase size={16} /> View My Bookings
            </button>
            <button
              onClick={() => router.push("/search")}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-black text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white"
            >
              Find More Freelancers <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Support note */}
      <p className="mt-6 text-center text-xs font-bold text-slate-400">
        Need help?{" "}
        <button
          onClick={() => router.push("/support")}
          className="text-slate-600 underline underline-offset-2 dark:text-slate-300"
        >
          Contact support
        </button>
        {" · "}Keep your Booking ID handy:{" "}
        <span className="font-mono">{bookingId?.slice(-8)}</span>
      </p>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
          <Loader2 className="animate-spin" size={28} />
          <span className="text-lg font-black">Loading…</span>
        </div>
      }
    >
      <PaymentSuccessInner />
    </Suspense>
  );
}
