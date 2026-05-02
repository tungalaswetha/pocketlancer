"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Download,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Settings,
  PackageOpen,
  Zap,
  Star,
  MapPin,
  Bell,
  MessageCircle,
  CalendarCheck2,
  AlertCircle,
} from "lucide-react";

const APK_PATH = "/downloads/pocketlancer.apk";
const APK_VERSION = "1.0.0";
const APK_SIZE = "~4 MB";

export default function DownloadPage() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const steps = [
    {
      icon: <Download size={18} />,
      title: "Download the APK",
      desc: 'Tap the "Download APK" button below. Your browser will save the file to your Downloads folder.',
      tip: 'Chrome may show a warning — tap "Download anyway". The file is safe.',
    },
    {
      icon: <Settings size={18} />,
      title: 'Enable "Install unknown apps"',
      desc: "Go to Settings → Apps → Special app access → Install unknown apps. Find your browser (Chrome/Firefox) and toggle it ON.",
      tip: "On Android 8+, you'll be prompted automatically when you open the APK — no need to dig into settings first.",
    },
    {
      icon: <PackageOpen size={18} />,
      title: "Open the downloaded file",
      desc: 'Open your Downloads folder, tap "PocketLancer.apk", then tap "Install" in the Android installer dialog.',
      tip: "Installation takes about 5–10 seconds.",
    },
    {
      icon: <Zap size={18} />,
      title: "Launch & log in",
      desc: "Open PocketLancer from your home screen or app drawer. Log in with your existing account or register a new one.",
      tip: "All your bookings and messages sync automatically.",
    },
  ];

  const features = [
    {
      icon: <MapPin size={18} className="text-blue-600" />,
      title: "GPS-Based Discovery",
      desc: "Find verified freelancers near you with real-time location search.",
    },
    {
      icon: <Bell size={18} className="text-amber-500" />,
      title: "Push Notifications",
      desc: "Get instant alerts for booking updates, messages, and payments.",
    },
    {
      icon: <MessageCircle size={18} className="text-emerald-600" />,
      title: "Real-time Chat",
      desc: "Chat with clients and freelancers with image sharing support.",
    },
    {
      icon: <CalendarCheck2 size={18} className="text-purple-600" />,
      title: "Booking Management",
      desc: "Accept, track, and complete bookings from anywhere.",
    },
    {
      icon: <ShieldCheck size={18} className="text-rose-500" />,
      title: "Escrow Payments",
      desc: "Secure Razorpay-powered payments held until work is done.",
    },
    {
      icon: <Star size={18} className="text-orange-500" />,
      title: "Reviews & Ratings",
      desc: "Build your reputation with verified client reviews.",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition dark:hover:text-white"
      >
        <ArrowLeft size={15} />
        Back to Home
      </Link>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-8 py-12 text-white shadow-xl"
      >
        {/* glow */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8">
          <div>
            {/* badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-black text-emerald-300 ring-1 ring-emerald-500/30">
              <Smartphone size={12} />
              Android App · v{APK_VERSION}
            </div>

            <h1 className="mt-4 text-4xl font-black tracking-tight">
              PocketLancer
              <br />
              <span className="text-emerald-400">for Android</span>
            </h1>

            <p className="mt-3 text-sm font-bold text-slate-300 max-w-sm">
              The full PocketLancer experience — GPS search, real-time chat,
              bookings, and payments — all in your pocket.
            </p>

            <div className="mt-3 flex items-center gap-4 text-xs font-bold text-slate-400">
              <span>Version {APK_VERSION}</span>
              <span>·</span>
              <span>{APK_SIZE}</span>
              <span>·</span>
              <span>Android 7.0+</span>
            </div>
          </div>

          {/* Download button */}
          <div className="flex-shrink-0">
            <a
              href={APK_PATH}
              download="PocketLancer.apk"
              className="group flex flex-col items-center gap-3 rounded-3xl bg-white px-10 py-6 text-slate-900 shadow-lg hover:bg-slate-50 active:scale-95 transition-all"
            >
              <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Download size={24} className="text-white" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-slate-500 leading-none mb-1">
                  Free Download
                </p>
                <p className="text-sm font-black leading-none">Download APK</p>
              </div>
            </a>
          </div>
        </div>
      </motion.div>

      {/* Requirements banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-500/20 dark:bg-amber-500/10"
      >
        <AlertCircle
          size={18}
          className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
        />
        <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
          This is a direct APK download (not from Google Play). You'll need to
          enable <strong>"Install from unknown sources"</strong> in Android
          settings. Step-by-step instructions are below.
        </p>
      </motion.div>

      {/* Installation steps */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-950"
      >
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Setup guide
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
          Install in 4 steps
        </h2>

        <div className="mt-7 space-y-3">
          {steps.map((step, i) => {
            const isOpen = activeStep === i;
            return (
              <motion.div
                key={i}
                layout
                className={[
                  "overflow-hidden rounded-2xl border transition-all cursor-pointer",
                  isOpen
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/40",
                ].join(" ")}
                onClick={() => setActiveStep(isOpen ? null : i)}
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* step number */}
                  <div
                    className={[
                      "flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center font-black text-sm",
                      isOpen
                        ? "bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                    ].join(" ")}
                  >
                    {i + 1}
                  </div>

                  <div
                    className={[
                      "flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center",
                      isOpen
                        ? "bg-white/10 dark:bg-slate-900/10 text-white dark:text-slate-900"
                        : "text-slate-500 dark:text-slate-400",
                    ].join(" ")}
                  >
                    {step.icon}
                  </div>

                  <p
                    className={[
                      "flex-1 font-black text-sm",
                      isOpen
                        ? "text-white dark:text-slate-900"
                        : "text-slate-900 dark:text-white",
                    ].join(" ")}
                  >
                    {step.title}
                  </p>

                  <ChevronRight
                    size={16}
                    className={[
                      "flex-shrink-0 transition-transform",
                      isOpen
                        ? "rotate-90 text-white/70 dark:text-slate-700"
                        : "text-slate-400",
                    ].join(" ")}
                  />
                </div>

                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-5 pb-5 space-y-3"
                  >
                    <p className="text-sm font-bold text-white/80 dark:text-slate-700 leading-relaxed pl-[4.5rem]">
                      {step.desc}
                    </p>
                    <div className="flex items-start gap-2 rounded-xl bg-white/10 dark:bg-slate-900/10 px-4 py-3 pl-[4.5rem]">
                      <CheckCircle2
                        size={14}
                        className="mt-0.5 flex-shrink-0 text-emerald-400 dark:text-emerald-600"
                      />
                      <p className="text-xs font-bold text-white/70 dark:text-slate-600">
                        {step.tip}
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* bottom download again */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <a
            href={APK_PATH}
            download="PocketLancer.apk"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-sm font-black text-white shadow-sm hover:bg-slate-800 active:scale-95 transition-all dark:bg-white dark:text-slate-900"
          >
            <Download size={16} />
            Download APK · {APK_SIZE}
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-6 py-4 text-sm font-black text-slate-700 hover:bg-slate-50 transition dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>
      </motion.div>

      {/* Features grid */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-950"
      >
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          What's included
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
          Everything on web, plus more
        </h2>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <motion.div
              key={f.title}
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-5 hover:border-slate-200 transition dark:border-slate-800 dark:bg-slate-900/50"
            >
              <div className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm mb-3">
                {f.icon}
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {f.title}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* FAQ */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-950"
      >
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Common questions
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white mb-6">
          FAQ
        </h2>

        <div className="space-y-5">
          {[
            {
              q: "Is it safe to install an APK?",
              a: "Yes. This APK is the official PocketLancer app built directly from our codebase. It's the same app you use on the web, packaged for Android using Capacitor.",
            },
            {
              q: "Why isn't it on the Play Store?",
              a: "We're working on Play Store listing. In the meantime, you can sideload the APK directly — it takes under a minute.",
            },
            {
              q: "Will I get updates automatically?",
              a: "Not yet. When a new version is released, you'll see a banner here to download the latest APK. We're working on in-app update notifications.",
            },
            {
              q: "Does it work on iOS?",
              a: "iOS is not supported at this time. The web app at pocketlancer.org works great on iOS Safari.",
            },
            {
              q: "Can I use the same account as the web?",
              a: "Yes — log in with your existing email and password. All your data (bookings, messages, profile) syncs instantly.",
            },
          ].map((faq) => (
            <div
              key={faq.q}
              className="border-b border-slate-100 dark:border-slate-800 pb-5 last:border-0 last:pb-0"
            >
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {faq.q}
              </p>
              <p className="mt-1.5 text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="h-4" />
    </div>
  );
}
