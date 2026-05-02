"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";

export default function ResetPasswordClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token");

  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token) return setMsg("Invalid reset token.");

    setLoading(true);
    setMsg("");
    try {
      const res = await api.post("/auth/reset-password", { token, password });
      setMsg(res.data.msg || "Password reset successful");

      setTimeout(() => router.push("/login"), 1500);
    } catch (err: any) {
      setMsg(err?.response?.data?.msg || "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black dark:bg-white dark:text-slate-900">
            P
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              PocketLancer
            </p>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Reset Password
            </h1>
          </div>
        </div>

        <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300">
          Enter your new password to regain access.
        </p>

        <div className="mt-6 space-y-4">
          <label className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
            New Password
          </label>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
            <Lock size={18} className="text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={loading || password.length < 6}
            className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={18} />
                Resetting...
              </span>
            ) : (
              "Reset Password"
            )}
          </button>

          {msg && (
            <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={18} />
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
