"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PortfolioLightbox from "@/components/PortfolioLightbox";
import api from "@/services/api";
import Image from "next/image";
import {
  MapPin,
  Star,
  Briefcase,
  Loader2,
  Link as LinkIcon,
  MessageCircle,
  Globe,
  Zap,
  IndianRupee,
  BadgeCheck,
  Layers,
  Clock,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Share2,
} from "lucide-react";

type Review = {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  clientName?: string;
};
type PastWork = {
  title: string;
  description: string;
  link?: string;
  year?: string;
};
type Milestone = {
  _id: string;
  title: string;
  description: string;
  amount: number;
  order: number;
};

type Profile = {
  _id: string;
  userId?: string; // actual User._id, returned by server for chat
  name: string;
  title: string;
  bio: string;
  skills: string[];
  hourlyRate: number;
  fixedPrice?: number;
  pricingType?: "hourly" | "fixed" | "milestone";
  milestones?: Milestone[];
  category?: "field" | "digital";
  city: string;
  country: string;
  profilePic?: string;
  portfolio?: string[];
  pastWorks?: PastWork[];
};

function StarBar({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={16}
            fill={i <= Math.round(rating) ? "currentColor" : "none"}
            className="text-amber-500"
          />
        ))}
      </div>
      <span className="text-sm font-black text-slate-900 dark:text-white">
        {rating.toFixed(1)}
      </span>
      <span className="text-sm font-bold text-slate-500">
        ({count} reviews)
      </span>
    </div>
  );
}

export default function PublicFreelancerProfilePage() {
  const params = useParams();
  const id = params?.id?.toString();
  const router = useRouter();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "portfolio" | "reviews"
  >("overview");
  const [copied, setCopied] = useState(false);

  const ratingSummary = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0 };
    const avg =
      reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length;
    return { avg: Number(avg.toFixed(1)), count: reviews.length };
  }, [reviews]);

  const totalMilestoneAmount = useMemo(() => {
    return (profile?.milestones || []).reduce((s, m) => s + (m.amount || 0), 0);
  }, [profile?.milestones]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/freelancers/${id}`)
      .then((r) => setProfile(r.data.profile ?? r.data.freelancer ?? r.data))
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/portfolio/${id}`)
      .then((r) => setPortfolio(r.data || []))
      .catch(() => setPortfolio([]))
      .finally(() => setLoadingPortfolio(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/reviews/freelancer/${id}`)
      .then((r) => setReviews(r.data?.data || []))
      .catch(() => setReviews([]))
      .finally(() => setLoadingReviews(false));
  }, [id]);

  const shareProfile = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
        <Loader2 className="animate-spin" size={28} />{" "}
        <span className="font-black">Loading profile…</span>
      </div>
    );
  }

  const isDigital = profile.category === "digital";

  const pricingDisplay = () => {
    if (profile.pricingType === "fixed")
      return {
        label: "Fixed Price",
        value: `₹${(profile.fixedPrice || 0).toLocaleString("en-IN")}`,
      };
    if (profile.pricingType === "milestone")
      return {
        label: "Starting from",
        value: `₹${totalMilestoneAmount.toLocaleString("en-IN")}`,
      };
    return { label: "Hourly Rate", value: `₹${profile.hourlyRate || 0}/hr` };
  };

  const pricing = pricingDisplay();

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "portfolio", label: `Portfolio (${portfolio.length})` },
    { key: "reviews", label: `Reviews (${reviews.length})` },
  ] as const;

  return (
    <div className="w-full">
      {lightboxIndex !== null && (
        <PortfolioLightbox
          items={portfolio}
          index={lightboxIndex}
          setIndex={(i) => setLightboxIndex(i)}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* ── HERO ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="pointer-events-none absolute -top-32 -right-32 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Back */}
        <div className="relative border-b border-slate-200 px-6 py-4 dark:border-white/10">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={shareProfile}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
            >
              <Share2 size={15} /> {copied ? "Copied!" : "Share"}
            </button>
          </div>
        </div>

        {/* Profile header */}
        <div className="relative px-6 py-8 lg:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            {/* Avatar */}
            <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-3xl bg-slate-50 ring-1 ring-black/10 dark:ring-white/10 flex items-center justify-center">
              {profile.profilePic ? (
                <Image
                  src={profile.profilePic}
                  alt={profile.name}
                  fill
                  sizes="128px"
                  priority
                  className="object-cover"
                />
              ) : (
                <span className="text-4xl font-black text-slate-400">
                  {profile.name?.[0] || "F"}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white md:text-3xl">
                      {profile.name}
                    </h1>
                    <BadgeCheck
                      size={20}
                      className="text-blue-500 flex-shrink-0"
                    />
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${isDigital ? "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300" : "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300"}`}
                    >
                      {isDigital ? (
                        <>
                          <Globe size={11} /> Digital
                        </>
                      ) : (
                        <>
                          <Zap size={11} /> Field
                        </>
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-slate-600 dark:text-slate-300">
                    {profile.title || "Freelancer"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(profile.city || profile.country) && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        <MapPin size={14} />
                        {[profile.city, profile.country]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      <IndianRupee size={13} />
                      {pricing.value}
                      <span className="text-xs text-slate-500 ml-0.5">
                        {pricing.label === "Hourly Rate"
                          ? ""
                          : ` (${pricing.label.toLowerCase()})`}
                      </span>
                    </span>
                    {ratingSummary.count > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-100 px-3 py-1.5 text-sm font-bold text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300">
                        <Star size={14} fill="currentColor" />
                        {ratingSummary.avg} ({ratingSummary.count})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => router.push(`/book/${profile._id}`)}
                  className={`rounded-2xl px-6 py-3 text-sm font-black text-white shadow-sm hover:shadow-md transition-all active:scale-[0.99] ${isDigital ? "bg-violet-600 hover:bg-violet-700" : "bg-slate-900 hover:bg-slate-800"}`}
                >
                  {isDigital ? "Hire & Pay Securely" : "Book this Freelancer"}
                </button>
                <button
                  onClick={() => {
                    const chatUserId = profile.userId || profile._id;
                    window.dispatchEvent(
                      new CustomEvent("open-chat", {
                        detail: {
                          userId: chatUserId,
                          name: profile.name,
                          avatar: profile.profilePic,
                        },
                      }),
                    );
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
                >
                  <MessageCircle size={16} /> Message
                </button>
              </div>

              {/* Escrow badge for digital */}
              {isDigital && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 ring-1 ring-emerald-500/20">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                    Payments protected by escrow
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative border-t border-slate-200 px-6 dark:border-white/10 lg:px-10">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-4 py-4 text-sm font-black transition-all border-b-2 ${activeTab === tab.key ? "border-slate-900 text-slate-900 dark:border-white dark:text-white" : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TAB CONTENT ─────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main content */}
        <div className="lg:col-span-8 space-y-6">
          {activeTab === "overview" && (
            <>
              {/* Bio */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <h3 className="mb-3 text-base font-black text-slate-900 dark:text-white">
                  About
                </h3>
                <p className="leading-relaxed text-slate-700 whitespace-pre-wrap dark:text-slate-300">
                  {profile.bio || "No bio provided yet."}
                </p>
              </div>

              {/* Skills */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <h3 className="mb-4 text-base font-black text-slate-900 dark:text-white">
                  Skills
                </h3>
                {profile.skills?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((s, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-400">
                    No skills listed.
                  </p>
                )}
              </div>

              {/* Pricing breakdown */}
              {profile.pricingType === "milestone" &&
                (profile.milestones || []).length > 0 && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
                    <h3 className="mb-4 text-base font-black text-slate-900 dark:text-white">
                      Project Milestones
                    </h3>
                    <div className="space-y-3">
                      {(profile.milestones || [])
                        .sort((a, b) => a.order - b.order)
                        .map((m, i) => (
                          <div
                            key={m._id}
                            className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white dark:bg-white dark:text-slate-900">
                                {i + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="font-black text-slate-900 dark:text-white">
                                  {m.title}
                                </p>
                                {m.description && (
                                  <p className="mt-0.5 text-sm font-bold text-slate-500">
                                    {m.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="flex-shrink-0 font-black text-slate-900 dark:text-white">
                              ₹{m.amount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ))}
                      <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 dark:bg-white">
                        <span className="text-sm font-black text-white dark:text-slate-900">
                          Total
                        </span>
                        <span className="text-sm font-black text-white dark:text-slate-900">
                          ₹{totalMilestoneAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              {/* Past Works */}
              {(profile.pastWorks || []).length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
                  <h3 className="mb-4 text-base font-black text-slate-900 dark:text-white">
                    Past Works
                  </h3>
                  <div className="space-y-4">
                    {profile.pastWorks!.map((w, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Briefcase
                                size={15}
                                className="flex-shrink-0 text-slate-400"
                              />
                              <p className="font-black text-slate-900 dark:text-white">
                                {w.title}
                              </p>
                              {w.year && (
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                  {w.year}
                                </span>
                              )}
                            </div>
                            {w.description && (
                              <p className="mt-2 text-sm font-bold leading-relaxed text-slate-600 dark:text-slate-300">
                                {w.description}
                              </p>
                            )}
                          </div>
                          {w.link && (
                            <a
                              href={
                                w.link.startsWith("http")
                                  ? w.link
                                  : `https://${w.link}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 rounded-xl bg-blue-500/10 p-2 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400"
                            >
                              <LinkIcon size={15} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "portfolio" && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
              <h3 className="mb-4 text-base font-black text-slate-900 dark:text-white">
                Portfolio
              </h3>
              {loadingPortfolio ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="animate-spin" size={18} /> Loading
                  portfolio…
                </div>
              ) : portfolio.length === 0 ? (
                <p className="text-sm font-bold text-slate-400">
                  No portfolio items added yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {portfolio.map((item, idx) => {
                    const rawUrl = item.url || item.websiteUrl || "";
                    const url = rawUrl.startsWith("http")
                      ? rawUrl
                      : `https://${rawUrl}`;
                    return (
                      <div
                        key={item._id}
                        onClick={() =>
                          item.type !== "website" && setLightboxIndex(idx)
                        }
                        className="group relative overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-black/5 cursor-pointer dark:bg-slate-900 dark:ring-white/10"
                      >
                        {item.type === "image" && (
                          <img
                            src={url}
                            className="h-44 w-full object-cover transition-transform group-hover:scale-105"
                            alt={item.title || ""}
                          />
                        )}
                        {item.type === "video" && (
                          <video
                            src={url}
                            muted
                            className="h-44 w-full object-cover"
                          />
                        )}
                        {item.type === "website" && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-44 flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400"
                          >
                            <Globe size={28} />
                            <span className="text-xs font-bold">
                              View website
                            </span>
                          </a>
                        )}
                        {item.title && (
                          <div className="p-3">
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                              {item.title}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Reviews
                </h3>
                {ratingSummary.count > 0 && (
                  <StarBar
                    rating={ratingSummary.avg}
                    count={ratingSummary.count}
                  />
                )}
              </div>
              {loadingReviews ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="animate-spin" size={18} /> Loading
                  reviews…
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-sm font-bold text-slate-400">
                  No reviews yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div
                      key={r._id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 font-black text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                            {(r.clientName || "A")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                              {r.clientName || "Anonymous"}
                            </p>
                            <p className="text-xs font-bold text-slate-400">
                              {new Date(r.createdAt).toLocaleDateString(
                                "en-IN",
                                { dateStyle: "medium" },
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              size={14}
                              fill={i <= r.rating ? "currentColor" : "none"}
                              className="text-amber-500"
                            />
                          ))}
                        </div>
                      </div>
                      {r.comment && (
                        <p className="mt-3 text-sm font-bold leading-relaxed text-slate-600 dark:text-slate-300">
                          {r.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 space-y-4">
            {/* Hire card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
              <div className="text-center">
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  {pricing.label}
                </p>
                <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
                  {pricing.value}
                </p>
                {profile.pricingType === "milestone" && (
                  <p className="text-xs font-bold text-slate-500">
                    {(profile.milestones || []).length} milestones
                  </p>
                )}
              </div>

              <button
                onClick={() => router.push(`/book/${profile._id}`)}
                className={`mt-5 w-full rounded-2xl py-3.5 text-sm font-black text-white transition-all active:scale-[0.99] ${isDigital ? "bg-violet-600 hover:bg-violet-700" : "bg-slate-900 hover:bg-slate-800"}`}
              >
                {isDigital ? "Hire & Pay Securely" : "Book Now"}
              </button>

              {isDigital && (
                <div className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-500/10 px-3 py-2">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                    Protected by escrow
                  </span>
                </div>
              )}

              {/* Stats */}
              <div className="mt-5 grid grid-cols-2 gap-2">
                {[
                  {
                    label: "Rating",
                    value:
                      ratingSummary.avg > 0 ? `${ratingSummary.avg}★` : "New",
                  },
                  { label: "Reviews", value: String(ratingSummary.count) },
                  { label: "Category", value: isDigital ? "Digital" : "Field" },
                  {
                    label: "Type",
                    value:
                      (profile.pricingType || "hourly")
                        .charAt(0)
                        .toUpperCase() +
                      (profile.pricingType || "hourly").slice(1),
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10"
                  >
                    <p className="text-xs font-extrabold uppercase text-slate-400">
                      {label}
                    </p>
                    <p className="mt-0.5 text-sm font-black text-slate-900 dark:text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* What to expect */}
            <div
              className={`rounded-3xl p-5 ${isDigital ? "bg-violet-600" : "bg-slate-900"}`}
            >
              <p className="text-sm font-black text-white">What to expect</p>
              <ul className="mt-3 space-y-2">
                {(isDigital
                  ? [
                      "Discuss requirements and agree on scope",
                      "Pay securely — funds go into escrow",
                      "Freelancer delivers the work",
                      "Review and approve to release payment",
                    ]
                  : [
                      "Book your preferred time slot",
                      "Freelancer confirms and visits you",
                      "Work is completed at your location",
                      "Pay directly after job is done",
                    ]
                ).map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight
                      size={14}
                      className="mt-0.5 flex-shrink-0 text-white/60"
                    />
                    <span className="text-xs font-bold text-white/90">
                      {step}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
