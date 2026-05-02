"use client";

import React, { useState } from "react";
import api from "@/services/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Lock,
  Briefcase,
  UserCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  BadgeCheck,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "client" as "client" | "freelancer",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/register", formData);

      if (res.data.success) {
        router.push("/login?message=registered_successfully");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.msg ||
          "Registration failed. Try a different email.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Registration Form Card ────────────────────────────────────────
  const FormCard = (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-950">
      {/* header */}
      <div className="border-b border-slate-200 px-7 py-6 dark:border-white/10">
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
          Register
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
          Join PocketLancer
        </h2>
        <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
          Create your account to get started
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">
        {/* Role selector */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, role: "client" })}
            className={[
              "rounded-2xl border px-4 py-4 text-left transition",
              formData.role === "client"
                ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/20"
                : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:hover:bg-white/5",
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCircle
                  size={18}
                  className="text-slate-600 dark:text-slate-300"
                />
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  I'm a Client
                </p>
              </div>
              {formData.role === "client" && (
                <BadgeCheck size={18} className="text-blue-500" />
              )}
            </div>
            <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              Hire experts instantly
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFormData({ ...formData, role: "freelancer" })}
            className={[
              "rounded-2xl border px-4 py-4 text-left transition",
              formData.role === "freelancer"
                ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20"
                : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:hover:bg-white/5",
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase
                  size={18}
                  className="text-slate-600 dark:text-slate-300"
                />
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  I'm a Freelancer
                </p>
              </div>
              {formData.role === "freelancer" && (
                <BadgeCheck size={18} className="text-emerald-500" />
              )}
            </div>
            <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              Get more bookings
            </p>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
            Full Name
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
            <User size={18} className="text-slate-400" />
            <input
              name="name"
              placeholder="Your name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
            Email
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
            <Mail size={18} className="text-slate-400" />
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
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
              name="password"
              placeholder="Create password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
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
          <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            Minimum 6 characters
          </p>
        </div>

        {/* Submit */}
        <button
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-black text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Creating account…
            </>
          ) : (
            <>
              Create Account <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* footer */}
      <div className="border-t border-slate-200 px-7 py-6 dark:border-white/10">
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-600 font-black hover:underline"
          >
            Login here
          </Link>
        </p>

        <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          By creating an account, you agree to PocketLancer Terms and Privacy
          Policy.
        </p>
      </div>
    </div>
  );

  // ── Marketing / Branding block ────────────────────────────────────
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
            Join the marketplace
          </p>
        </div>
      </div>

      <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
        Create your account 🚀
      </h1>

      <p className="text-base font-bold text-slate-600 dark:text-slate-300 max-w-xl">
        Set up your profile in minutes and start booking services (or getting
        hired).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
        <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
            Clients
          </p>
          <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
            Find verified freelancers nearby
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
            Freelancers
          </p>
          <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
            Build trust with reviews & portfolio
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
           * MOBILE: Form first — users see what they need immediately
           * DESKTOP: Side-by-side with branding on left
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
