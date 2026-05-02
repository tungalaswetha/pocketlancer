"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  MapPin,
  ShieldCheck,
  Star,
  Zap,
  Search as SearchIcon,
  Smartphone,
  Download,
  Bell,
  MessageCircle,
  CreditCard,
  ChevronRight,
  LayoutDashboard,
  Users,
  TrendingUp,
} from "lucide-react";
import { motion, type Transition } from "framer-motion";

const APK_PATH = "/downloads/pocketlancer.apk";

// ── Type-safe animation presets (fixes "ease string" TS error) ──────
const t = (delay = 0): Transition => ({
  duration: 0.45,
  ease: [0.25, 0.46, 0.45, 0.94],
  delay,
});

export default function HomePage() {
  const { user } = useUser();

  const primaryCta = useMemo(() => {
    if (!user) return { href: "/register", label: "Get Started Free" };
    if (user.role === "freelancer")
      return { href: "/dashboard/freelancer", label: "Freelancer Dashboard" };
    if (user.role === "admin") return { href: "/admin", label: "Admin Panel" };
    return { href: "/search", label: "Find Freelancers" };
  }, [user]);

  return (
    <div className="w-full space-y-3 pb-10">
      {/* ═══════════════════════════════════════════════════════════
          HERO — 3 column: copy | phone | bento stats
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm dark:bg-slate-950 dark:border-white/10">
        {/* mesh glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 -right-28 h-[22rem] w-[22rem] rounded-full bg-blue-100/70 blur-3xl dark:bg-blue-900/20" />
          <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-emerald-100/60 blur-3xl dark:bg-emerald-900/15" />
        </div>

        <div className="relative px-6 pt-10 pb-10 sm:px-10 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_360px] gap-6 xl:gap-10 items-center">
            {/* ── COL 1: COPY ── */}
            <div className="space-y-5 lg:max-w-none">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={t(0)}
              >
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-white/10">
                  <BadgeCheck size={13} className="text-blue-500" />
                  Verified Freelancer Marketplace · India
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={t(0.06)}
              >
                <h1 className="text-[2.6rem] sm:text-5xl font-black tracking-tight text-slate-900 leading-[1.06] dark:text-white">
                  Hire trusted pros
                  <br />
                  <span className="text-blue-600 dark:text-blue-400">
                    near your location
                  </span>
                </h1>
                <p className="mt-4 text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                  Discover verified service professionals, compare pricing, and
                  book instantly — powered by GPS.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={t(0.12)}
                className="flex flex-col sm:flex-row flex-wrap gap-2.5"
              >
                <Link
                  href={primaryCta.href}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 active:scale-95 transition-all shadow-sm dark:bg-white dark:text-slate-900"
                >
                  {primaryCta.label}
                  <ArrowRight size={15} />
                </Link>

                <Link
                  href="/search"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <MapPin size={15} className="text-slate-400" />
                  Browse Freelancers
                </Link>

                <a
                  href={APK_PATH}
                  download="PocketLancer.apk"
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                >
                  <Download size={15} />
                  Android App
                </a>
              </motion.div>

              {/* trust chips */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={t(0.18)}
                className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-bold text-slate-400"
              >
                {[
                  {
                    icon: (
                      <ShieldCheck size={12} className="text-emerald-500" />
                    ),
                    label: "Escrow payments",
                  },
                  {
                    icon: <BadgeCheck size={12} className="text-blue-500" />,
                    label: "Verified profiles",
                  },
                  {
                    icon: <Star size={12} className="text-amber-400" />,
                    label: "4.8+ avg rating",
                  },
                  {
                    icon: <Smartphone size={12} className="text-slate-400" />,
                    label: "Android app",
                  },
                ].map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1.5"
                  >
                    {chip.icon}
                    {chip.label}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* ── COL 2: PHONE MOCKUP ── */}
            <motion.div
              className="hidden lg:flex justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={t(0.1)}
            >
              <div className="relative">
                {/* phone shell */}
                <div className="relative w-48 rounded-[2.5rem] bg-slate-900 p-[7px] shadow-2xl ring-1 ring-slate-700">
                  {/* notch */}
                  <div className="absolute top-3.5 left-1/2 -translate-x-1/2 h-4 w-[72px] rounded-full bg-slate-950 z-10" />
                  {/* screen */}
                  <div
                    className="overflow-hidden rounded-[2rem] bg-slate-50 dark:bg-slate-900"
                    style={{ minHeight: 360 }}
                  >
                    {/* status bar */}
                    <div className="flex items-center justify-between px-5 pt-8 pb-1.5">
                      <span className="text-[9px] font-black text-slate-400">
                        9:41
                      </span>
                      <div className="flex gap-0.5 items-center">
                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                        <div className="h-1 w-2 rounded-sm bg-slate-300" />
                        <div className="h-1.5 w-3 rounded-sm bg-slate-400" />
                      </div>
                    </div>

                    {/* app header */}
                    <div className="px-4 pt-1 pb-2 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-black text-slate-900 dark:text-white">
                          Hey there 👋
                        </p>
                        <p className="text-[9px] font-bold text-slate-400">
                          Find nearby services
                        </p>
                      </div>
                      <div className="h-7 w-7 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 font-black text-[10px] shadow-sm">
                        P
                      </div>
                    </div>

                    {/* search bar */}
                    <div className="mx-3 mb-2.5 flex items-center gap-2 rounded-xl bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 px-3 py-2 shadow-sm">
                      <SearchIcon size={9} className="text-slate-400" />
                      <span className="text-[9px] font-bold text-slate-400">
                        Search services…
                      </span>
                    </div>

                    {/* GPS badge */}
                    <div className="mx-3 mb-2.5 flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-500/20 px-2.5 py-1.5">
                      <MapPin size={9} className="text-blue-500" />
                      <span className="text-[8px] font-black text-blue-700 dark:text-blue-300">
                        Showing results near you · 2.5km
                      </span>
                    </div>

                    {/* freelancer cards */}
                    <div className="px-3 space-y-2">
                      {[
                        {
                          name: "Rahul S.",
                          role: "Plumber",
                          rating: "4.9",
                          dist: "0.8km",
                          color: "bg-blue-600",
                        },
                        {
                          name: "Priya K.",
                          role: "Designer",
                          rating: "5.0",
                          dist: "1.2km",
                          color: "bg-purple-600",
                        },
                        {
                          name: "Arun M.",
                          role: "Electrician",
                          rating: "4.7",
                          dist: "2.1km",
                          color: "bg-emerald-600",
                        },
                      ].map((card) => (
                        <div
                          key={card.name}
                          className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-2 shadow-sm"
                        >
                          <div
                            className={`h-7 w-7 flex-shrink-0 rounded-full ${card.color} flex items-center justify-center text-white font-black text-[9px]`}
                          >
                            {card.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black text-slate-900 dark:text-white">
                              {card.name}
                            </p>
                            <p className="text-[8px] font-bold text-slate-400">
                              {card.role}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[8px] font-black text-amber-500">
                              ★ {card.rating}
                            </p>
                            <p className="text-[7px] font-bold text-slate-400">
                              {card.dist}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* bottom nav */}
                    <div className="mt-3 flex items-center justify-around border-t border-slate-100 dark:border-slate-800 py-2.5 px-3">
                      {[
                        { Icon: LayoutDashboard, active: true },
                        { Icon: SearchIcon, active: false },
                        { Icon: CalendarCheck2, active: false },
                        { Icon: Bell, active: false },
                      ].map(({ Icon, active }, i) => (
                        <div
                          key={i}
                          className={`flex flex-col items-center gap-0.5 ${active ? "text-slate-900 dark:text-white" : "text-slate-300 dark:text-slate-600"}`}
                        >
                          <Icon size={12} />
                          {active && (
                            <div className="h-0.5 w-3 rounded-full bg-slate-900 dark:bg-white" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* floating download badge */}
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={
                    {
                      repeat: Infinity,
                      duration: 2.6,
                      ease: "easeInOut",
                    } as Transition
                  }
                  className="absolute -right-8 top-12 flex items-center gap-1.5 rounded-2xl bg-emerald-500 px-2.5 py-1.5 shadow-lg"
                >
                  <Download size={10} className="text-white" />
                  <span className="text-[9px] font-black text-white">
                    Free APK
                  </span>
                </motion.div>

                {/* floating rating badge */}
                <motion.div
                  animate={{ y: [0, 5, 0] }}
                  transition={
                    {
                      repeat: Infinity,
                      duration: 3,
                      ease: "easeInOut",
                      delay: 0.6,
                    } as Transition
                  }
                  className="absolute -left-8 bottom-20 flex items-center gap-1 rounded-2xl bg-amber-400 px-2.5 py-1.5 shadow-lg"
                >
                  <Star size={10} className="text-white fill-white" />
                  <span className="text-[9px] font-black text-white">4.8★</span>
                </motion.div>

                {/* floating users badge */}
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={
                    {
                      repeat: Infinity,
                      duration: 3.4,
                      ease: "easeInOut",
                      delay: 1.2,
                    } as Transition
                  }
                  className="absolute -left-10 top-24 flex items-center gap-1 rounded-2xl bg-blue-500 px-2.5 py-1.5 shadow-lg"
                >
                  <Users size={10} className="text-white" />
                  <span className="text-[9px] font-black text-white">
                    Verified
                  </span>
                </motion.div>
              </div>
            </motion.div>

            {/* ── COL 3: BENTO STATS ── */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={t(0.14)}
              className="grid grid-cols-2 gap-2.5"
            >
              {/* stat tiles */}
              {[
                {
                  val: "4.8+",
                  sub: "Avg Rating",
                  accent: "text-amber-500",
                  bg: "bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-500/20",
                },
                {
                  val: "2×",
                  sub: "Faster Hiring",
                  accent: "text-blue-600",
                  bg: "bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-500/20",
                },
                {
                  val: "GPS",
                  sub: "Location Search",
                  accent: "text-emerald-600",
                  bg: "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-500/20",
                },
                {
                  val: "100%",
                  sub: "Verified Pros",
                  accent: "text-slate-900 dark:text-white",
                  bg: "bg-slate-50 border-slate-100 dark:bg-slate-900/60 dark:border-slate-800",
                },
              ].map((s) => (
                <div key={s.sub} className={`rounded-2xl border p-3.5 ${s.bg}`}>
                  <p className={`text-xl font-black ${s.accent}`}>{s.val}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-slate-400 leading-tight">
                    {s.sub}
                  </p>
                </div>
              ))}

              {/* feature tags */}
              <div className="col-span-2 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Platform Features
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "GPS Discovery",
                    "Live Chat",
                    "Escrow Pay",
                    "Booking Tracking",
                    "Push Alerts",
                    "Reviews",
                  ].map((f) => (
                    <span
                      key={f}
                      className="rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* APK download card */}
              <a
                href={APK_PATH}
                download="PocketLancer.apk"
                className="col-span-2 group flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-3.5 hover:from-emerald-100 active:scale-[0.98] transition-all dark:border-emerald-500/20 dark:from-emerald-500/10 dark:to-transparent"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                  <Download size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    Download Android App
                  </p>
                  <p className="text-xs font-bold text-slate-400">
                    Free APK · Android 7.0+ · 4 MB
                  </p>
                </div>
                <ChevronRight
                  size={15}
                  className="flex-shrink-0 text-slate-300 group-hover:text-emerald-600 transition-colors"
                />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          HOW IT WORKS — 3 compact step cards
      ═══════════════════════════════════════════════════════════ */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={t(0) as Transition}
          className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-white/10 dark:bg-slate-950"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Simple flow
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                Book a pro in 3 steps
              </h2>
            </div>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 self-start sm:self-auto rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800 active:scale-95 transition-all dark:bg-white dark:text-slate-900"
            >
              <Zap size={14} /> Start Now
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                n: "01",
                Icon: SearchIcon,
                title: "Search Nearby",
                desc: "Pick a skill + radius. GPS finds verified pros around you instantly.",
              },
              {
                n: "02",
                Icon: CalendarCheck2,
                title: "Book Instantly",
                desc: "Compare pricing, read reviews, and confirm your booking in one tap.",
              },
              {
                n: "03",
                Icon: ShieldCheck,
                title: "Pay Securely",
                desc: "Funds held in escrow and released only after work is completed.",
              },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.38,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: i * 0.07,
                }}
                whileHover={{ y: -3 }}
                className="relative rounded-2xl border border-slate-100 bg-slate-50 p-5 hover:border-slate-200 hover:shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                    <s.Icon size={17} />
                  </div>
                  <span className="text-[11px] font-black text-slate-200 dark:text-slate-700">
                    {s.n}
                  </span>
                </div>
                <p className="mt-4 text-sm font-black text-slate-900 dark:text-white">
                  {s.title}
                </p>
                <p className="mt-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FEATURE STRIP — 4 coloured cards
      ═══════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            Icon: MapPin,
            iconCls: "text-blue-600",
            title: "Geo Search",
            desc: "GPS + radius filter — find pros within your chosen distance.",
            bg: "bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-500/20",
            iconBg: "bg-white/80 dark:bg-slate-900/50",
          },
          {
            Icon: MessageCircle,
            iconCls: "text-emerald-600",
            title: "Real-time Chat",
            desc: "Direct messaging with image sharing. Always in sync.",
            bg: "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-500/20",
            iconBg: "bg-white/80 dark:bg-slate-900/50",
          },
          {
            Icon: CreditCard,
            iconCls: "text-purple-600",
            title: "Escrow Payments",
            desc: "Razorpay-secured funds, released only on completion.",
            bg: "bg-purple-50 border-purple-100 dark:bg-purple-900/10 dark:border-purple-500/20",
            iconBg: "bg-white/80 dark:bg-slate-900/50",
          },
          {
            Icon: Bell,
            iconCls: "text-amber-500",
            title: "Push Alerts",
            desc: "Live booking & payment notifications on web and Android.",
            bg: "bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-500/20",
            iconBg: "bg-white/80 dark:bg-slate-900/50",
          },
        ].map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.38,
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: i * 0.06,
            }}
            whileHover={{ y: -3 }}
            className={`rounded-2xl border p-5 transition-all hover:shadow-sm ${f.bg}`}
          >
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center mb-3 shadow-sm ${f.iconBg}`}
            >
              <f.Icon size={18} className={f.iconCls} />
            </div>
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {f.title}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
              {f.desc}
            </p>
          </motion.div>
        ))}
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FINAL CTA — dark compact bar
      ═══════════════════════════════════════════════════════════ */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={t(0) as Transition}
          className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-8 dark:bg-slate-800"
        >
          <div className="pointer-events-none absolute -top-14 -right-14 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-14 -left-14 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Ready to get started?
              </h3>
              <p className="mt-1 text-sm font-bold text-slate-400">
                Join thousands of clients and freelancers on PocketLancer.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 flex-shrink-0">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-100 active:scale-95 transition-all"
              >
                Create Account <ArrowRight size={14} />
              </Link>
              <a
                href={APK_PATH}
                download="PocketLancer.apk"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-black text-white hover:bg-white/20 active:scale-95 transition-all"
              >
                <Download size={14} /> Android App
              </a>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                Browse Freelancers
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
