"use client";

import { useState } from "react";
import api from "@/services/api";
import Link from "next/link";
import { Mail, Loader2, ArrowRight, ArrowLeft, BadgeCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<"success" | "error" | "">("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const e = email.trim();
    if (!e) return;

    setLoading(true);
    setMsg("");
    setType("");

    try {
      const res = await api.post("/auth/forgot-password", { email: e });
      setMsg(res.data?.msg || "Reset link sent to your email.");
      setType("success");
    } catch (err: any) {
      setMsg(err?.response?.data?.msg || "Something went wrong.");
      setType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] w-full">
      {/* Background */}
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute -bottom-44 -left-44 h-[32rem] w-[32rem] rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-14 lg:grid-cols-12 lg:items-center">
          {/* LEFT */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-3">
              <div className="h-12 w-12 rounded-3xl bg-slate-900 text-white flex items-center justify-center font-black text-lg dark:bg-white dark:text-slate-900">
                P
              </div>
              <div>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  PocketLancer
                </p>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  Account recovery
                </p>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Forgot your password?
            </h1>

            <p className="text-base font-bold text-slate-600 dark:text-slate-300 max-w-xl">
              No stress. Enter your registered email and we’ll send you a secure
              reset link.
            </p>

            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur p-6 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                <BadgeCheck size={16} className="text-blue-500" />
                Security Note
              </p>
              <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                If the email exists, you’ll receive a reset link. Otherwise, we
                won’t reveal account details.
              </p>
            </div>
          </div>

          {/* RIGHT: Card */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-950">
              {/* header */}
              <div className="border-b border-slate-200 px-7 py-6 dark:border-white/10">
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Forgot Password
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  Reset password
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                  We’ll email you a reset link
                </p>
              </div>

              {/* body */}
              <div className="px-7 py-6 space-y-5">
                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    Email
                  </label>

                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
                    <Mail size={18} className="text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submit();
                      }}
                      placeholder="you@example.com"
                      className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                    />
                  </div>

                  <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    Use the email you registered with PocketLancer.
                  </p>
                </div>

                {/* Message */}
                {msg && (
                  <div
                    className={[
                      "rounded-2xl border px-4 py-3 text-sm font-bold",
                      type === "success"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                        : "border-red-500/20 bg-red-500/10 text-red-800 dark:text-red-200",
                    ].join(" ")}
                  >
                    {msg}
                  </div>
                )}

                {/* CTA */}
                <button
                  type="button"
                  disabled={loading || !email.trim()}
                  onClick={submit}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-black text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      Send Reset Link <ArrowRight size={18} />
                    </>
                  )}
                </button>

                {/* Footer links */}
                <div className="flex items-center justify-between">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm font-black text-slate-700 hover:underline dark:text-slate-200"
                  >
                    <ArrowLeft size={16} />
                    Back to login
                  </Link>

                  <Link
                    href="/register"
                    className="text-sm font-black text-blue-600 hover:underline"
                  >
                    Create account
                  </Link>
                </div>
              </div>

              {/* bottom */}
              <div className="border-t border-slate-200 px-7 py-6 dark:border-white/10">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Tip: check spam/junk folder if you don’t receive the email in
                  1–2 minutes.
                </p>
              </div>
            </div>
          </div>
          {/* end */}
        </div>
      </div>
    </div>
  );
}
