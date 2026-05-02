// client/components/Header.tsx
// This is the PUBLIC header — only shown on the "/" homepage by SmartHeader.
// All other routes use DashboardHeader.
"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import api from "@/services/api";
import {
  LogOut,
  User as UserIcon,
  ChevronDown,
  Repeat,
  LayoutDashboard,
  CalendarDays,
  Shield,
} from "lucide-react";

export function HonorScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" }) {
  const color =
    score < 35
      ? "bg-red-100 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20"
      : score < 75
        ? "bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20"
        : "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20";
  const label = score < 35 ? "Low Trust" : score < 75 ? "Average" : "Trusted";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ring-1 font-black ${color} ${size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"}`}>
      <Shield size={size === "sm" ? 8 : 9} />
      {label} · {score}
    </span>
  );
}

export default function Header() {
  const { user, logout } = useUser();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    try { await logout(); } catch {}
    window.location.href = "/login";
  };

  const handleSwitchRole = async () => {
    setOpen(false);
    try {
      if (!user || user.role === "admin") return;
      const newRole = user.role === "client" ? "freelancer" : "client";
      await api.post("/auth/switch-role", { role: newRole });
      window.location.href = "/dashboard";
    } catch {
      alert("Failed to switch role. Try again.");
    }
  };

  const goTo = (href: string) => { setOpen(false); window.location.href = href; };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/80"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="max-w-screen-2xl mx-auto flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 font-black text-sm text-white dark:bg-white dark:text-slate-900">P</div>
          <div className="hidden leading-tight sm:block">
            <p className="font-black text-slate-900 dark:text-white">PocketLancer</p>
            <p className="text-[10px] font-bold text-slate-500">Hire trusted freelancers</p>
          </div>
        </Link>

        {/* Right */}
        <div className="flex items-center gap-3">
          {!user ? (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">Login</Link>
              <Link href="/register" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 transition">Join Now</Link>
            </div>
          ) : (
            <>
              <button
                onClick={() => goTo(user.role === "admin" ? "/admin" : "/dashboard")}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 sm:text-sm transition"
              >
                Dashboard
              </button>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setOpen((s) => !s)}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 sm:px-3 transition"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 font-black text-xs text-white dark:bg-white dark:text-slate-900">
                    {user.name?.[0]?.toUpperCase() || "U"}
                  </span>
                  <div className="hidden text-left leading-tight md:block">
                    <p className="text-sm font-black text-slate-900 dark:text-white">{user.name}</p>
                    <p className="text-[10px] font-bold text-slate-500">{user.email}</p>
                  </div>
                  <ChevronDown size={15} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                  <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
                    {user.honorScore !== undefined && (
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                        <span className="text-xs font-black text-slate-500 dark:text-slate-400">Honor Score</span>
                        <HonorScoreBadge score={user.honorScore} />
                      </div>
                    )}
                    <button type="button" onClick={() => goTo(user.role === "admin" ? "/admin" : "/dashboard")}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-slate-900 transition">
                      <LayoutDashboard size={15} className="text-slate-400" /> Dashboard
                    </button>
                    {user.role === "freelancer" && (
                      <button type="button" onClick={() => goTo("/calendar")}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-slate-900 transition">
                        <CalendarDays size={15} className="text-slate-400" /> Calendar
                      </button>
                    )}
                    <button type="button" onClick={() => goTo(user.role === "freelancer" ? "/freelancer/profile" : user.role === "client" ? "/client/profile" : "/admin")}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-slate-900 transition">
                      <UserIcon size={15} className="text-slate-400" /> My Profile
                    </button>
                    {user.role !== "admin" && (
                      <button type="button" onClick={handleSwitchRole}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-slate-900 transition">
                        <Repeat size={15} className="text-slate-400" /> Switch Role
                      </button>
                    )}
                    <div className="h-px bg-slate-100 dark:bg-slate-800" />
                    <button type="button" onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition">
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
