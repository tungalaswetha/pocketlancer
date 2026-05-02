"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!userLoading && user) {
      if (user.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [userLoading, user, router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await api.post("/auth/login", { email, password });
      window.location.href = "/dashboard";
    } catch (err: any) {
      if (err.response?.status === 401) setError("Invalid email or password");
      else setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600 dark:text-slate-300">
        <Loader2 className="animate-spin mr-2" />
        Checking session…
      </div>
    );
  }

  // ── Login Form Card (shared between mobile and desktop) ──────────
  const FormCard = (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-950">
      <div className="border-b border-slate-200 px-7 py-6 dark:border-white/10">
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
          Secure Login
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
          Login to your account
        </h2>
        <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
          Continue to dashboard
        </p>
      </div>

      <form onSubmit={handleLoginSubmit} className="px-7 py-6 space-y-5">
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
              required
              placeholder="you@example.com"
              className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
            Password
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
            <Lock size={18} className="text-slate-400" />
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
              className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="rounded-xl px-2 py-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              title={showPass ? "Hide password" : "Show password"}
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Forgot / Create */}
        <div className="flex items-center justify-between">
          <Link
            href="/forgot-password"
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            Forgot password?
          </Link>

          <Link
            href="/register"
            className="text-sm font-bold text-slate-600 hover:underline dark:text-slate-300"
          >
            Create account
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-black text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Logging in…
            </>
          ) : (
            <>
              Login <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="border-t border-slate-200 px-7 py-6 dark:border-white/10">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
          By continuing, you agree to PocketLancer Terms and Privacy.
        </p>
      </div>
    </div>
  );

  // ── Marketing / Branding block ───────────────────────────────────
  const BrandingBlock = (
    <div className="space-y-6">
      <div className="inline-flex items-center gap-3">
        <div className="h-12 w-12 rounded-3xl bg-slate-900 text-white flex items-center justify-center font-black text-lg dark:bg-white dark:text-slate-900">
          P
        </div>
        <div>
          <p className="text-lg font-black text-slate-900 dark:text-white">
            PocketLancer
          </p>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Hire trusted freelancers
          </p>
        </div>
      </div>

      <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
        Welcome back 👋
      </h1>

      <p className="text-base font-bold text-slate-600 dark:text-slate-300 max-w-xl">
        Login to manage bookings, update your profile, and grow your freelance
        career.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
        <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
            Clients
          </p>
          <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
            Book services in seconds
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
            Freelancers
          </p>
          <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
            Build trust & earn more
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-80px)] w-full">
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[30rem] w-[30rem] rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute -bottom-44 -left-44 h-[34rem] w-[34rem] rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 py-14">
          {/*
           * MOBILE: Form first (lg:hidden shows form on top, branding below)
           * DESKTOP: Side-by-side grid (lg:grid shows branding left, form right)
           */}

          {/* ── Mobile layout: form first ── */}
          <div className="lg:hidden space-y-8">
            {FormCard}
            {BrandingBlock}
          </div>

          {/* ── Desktop layout: branding left, form right ── */}
          <div className="hidden lg:grid grid-cols-12 gap-10 items-center">
            <div className="col-span-6">{BrandingBlock}</div>
            <div className="col-span-6">{FormCard}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
