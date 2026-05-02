// client/app/f/[id]/page.tsx
// Supports both:
//   /f/dedeep-reddy    → username lookup (SEO-friendly)
//   /f/64abc123...     → legacy MongoDB ObjectId lookup
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Head from "next/head";
import PortfolioLightbox from "@/components/PortfolioLightbox";
import { useUser } from "@/context/UserContext";
import api from "@/services/api";
import Image from "next/image";
import {
  MapPin,
  Star,
  Briefcase,
  Loader2,
  Link as LinkIcon,
  MessageCircle,
  Shield,
  Copy,
  Check,
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

type Profile = {
  _id: string;
  userId?: string;
  name: string;
  username?: string | null;
  title: string;
  bio: string;
  skills: string[];
  hourlyRate: number;
  fixedPrice?: number;
  pricingType?: string;
  city: string;
  country: string;
  profilePic?: string;
  portfolio?: string[];
  pastWorks?: PastWork[];
  honorScore?: number;
  category?: string;
};

function isObjectId(str: string) {
  return /^[a-f\d]{24}$/i.test(str);
}

export default function PublicFreelancerProfilePage() {
  const params = useParams();
  const slug = params?.id?.toString() || "";
  const router = useRouter();
  const { user } = useUser();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [copied, setCopied] = useState(false);

  const freelancerUserId = profile?.userId || profile?._id;
  const isOwnProfile =
    !!user?._id && !!freelancerUserId && user._id === String(freelancerUserId);

  const shareUrl = useMemo(() => {
    if (!profile) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const path = profile.username
      ? `/f/${profile.username}`
      : `/f/${profile._id}`;
    return `${base}${path}`;
  }, [profile]);

  const pageTitle = profile
    ? `${profile.name} — ${profile.title || "Freelancer"} | PocketLancer`
    : "PocketLancer";

  const openChat = () => {
    if (!profile) return;
    window.dispatchEvent(
      new CustomEvent("open-chat", {
        detail: {
          userId: String(freelancerUserId),
          name: profile.name,
          avatar: profile.profilePic,
        },
      }),
    );
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const ratingSummary = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0 };
    const avg =
      reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length;
    return { avg: Number(avg.toFixed(1)), count: reviews.length };
  }, [reviews]);

  // Fetch profile — try username first if not an ObjectId
  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    const fetchProfile = isObjectId(slug)
      ? api.get(`/freelancers/${slug}`)
      : api.get(`/freelancers/by-username/${slug}`);

    fetchProfile
      .then((res) =>
        setProfile(res.data.profile ?? res.data.freelancer ?? res.data),
      )
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [slug, router]);

  // Fetch portfolio (uses ObjectId once we have profile)
  useEffect(() => {
    if (!profile?._id) return;
    setLoadingPortfolio(true);
    api
      .get(`/portfolio/${profile._id}`)
      .then((res) => setPortfolio(res.data || []))
      .catch(() => setPortfolio([]))
      .finally(() => setLoadingPortfolio(false));
  }, [profile?._id]);

  // Fetch reviews
  useEffect(() => {
    if (!profile?._id) return;
    setLoadingReviews(true);
    api
      .get(`/reviews/freelancer/${profile._id}`)
      .then((res) => setReviews(res.data?.data || []))
      .catch(() => setReviews([]))
      .finally(() => setLoadingReviews(false));
  }, [profile?._id]);

  // Canonical redirect: if accessed by ObjectId but username exists, redirect
  useEffect(() => {
    if (profile?.username && isObjectId(slug) && profile.username !== slug) {
      router.replace(`/f/${profile.username}`);
    }
  }, [profile, slug, router]);

  if (loading || !profile)
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-600">
        <Loader2 className="animate-spin" size={24} />
        Loading freelancer profile…
      </div>
    );

  const honorBadgeCls =
    (profile.honorScore ?? 100) < 35
      ? "bg-red-50 text-red-700 ring-red-100 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-500/20"
      : (profile.honorScore ?? 100) < 75
        ? "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-200 dark:ring-orange-500/20"
        : "bg-green-50 text-green-700 ring-green-100 dark:bg-green-500/10 dark:text-green-200 dark:ring-green-500/20";

  const card =
    "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10";

  return (
    <>
      {/* ── SEO meta ── */}
      <Head>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content={`Hire ${profile.name} on PocketLancer — ${profile.title || "Freelancer"} based in ${profile.city || "India"}. ${profile.bio?.slice(0, 120) || ""}`}
        />
        {/* Canonical URL always uses username if available */}
        {profile.username && (
          <link
            rel="canonical"
            href={`${typeof window !== "undefined" ? window.location.origin : ""}/f/${profile.username}`}
          />
        )}
        {/* Open Graph */}
        <meta property="og:title" content={pageTitle} />
        <meta
          property="og:description"
          content={`${profile.title || "Freelancer"} · ${profile.city || ""} · ₹${profile.hourlyRate || 0}/hr`}
        />
        {profile.profilePic && (
          <meta property="og:image" content={profile.profilePic} />
        )}
        <meta property="og:type" content="profile" />
      </Head>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {profile.name}
            </h1>
            {profile.honorScore !== undefined && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${honorBadgeCls}`}
              >
                <Shield size={11} />
                {profile.honorScore < 35
                  ? "Low Trust"
                  : profile.honorScore < 75
                    ? "Average"
                    : "Trusted"}{" "}
                · {profile.honorScore}
              </span>
            )}
          </div>

          {/* SEO-friendly URL chip */}
          {profile.username && (
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <LinkIcon size={11} /> pocketlancer.com/f/{profile.username}
              </span>
              <button
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-black text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 transition"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
          <p className="mt-1 text-sm font-bold text-slate-500">
            Freelancer profile
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT */}
          <div className="space-y-6 lg:col-span-9">
            {/* Identity */}
            <div className={card}>
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-slate-50 ring-1 ring-black/10 dark:bg-slate-800">
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
                    <span className="text-xl font-black text-slate-400">
                      {profile.name?.[0] || "F"}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {profile.title || "Freelancer"}
                  </h2>

                  <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold">
                    <span className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <MapPin size={15} />
                      {profile.city && profile.country
                        ? `${profile.city}, ${profile.country}`
                        : "Location not set"}
                    </span>
                    <span className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Briefcase size={15} />₹{profile.hourlyRate || 0}/hr
                    </span>
                    <span className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                      <Star size={15} fill="currentColor" />
                      {ratingSummary.avg} ({ratingSummary.count})
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => router.push(`/book/${profile._id}`)}
                      className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white active:bg-blue-700"
                    >
                      Book this Freelancer
                    </button>
                    {!isOwnProfile && (
                      <button
                        onClick={openChat}
                        className="flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white active:bg-slate-700 dark:bg-white dark:text-slate-900"
                      >
                        <MessageCircle size={16} /> Chat
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className={card}>
              <h3 className="mb-3 font-black text-slate-900 dark:text-white">
                Bio
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {profile.bio || "No bio provided yet."}
              </p>
            </div>

            {/* Skills */}
            <div className={card}>
              <h3 className="mb-3 font-black text-slate-900 dark:text-white">
                Skills
              </h3>
              {profile.skills?.length ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No skills added.</p>
              )}
            </div>

            {/* Portfolio */}
            <div className={card}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-black text-slate-900 dark:text-white">
                  Portfolio
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  {portfolio.length} projects
                </span>
              </div>

              {loadingPortfolio ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="animate-spin" size={16} /> Loading…
                </div>
              ) : portfolio.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No portfolio items added.
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
                        className="group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-black/5 dark:bg-slate-800"
                      >
                        {item.type === "image" && (
                          <img
                            src={url}
                            alt={item.title}
                            className="h-44 w-full object-cover transition group-active:scale-95"
                          />
                        )}
                        {item.type === "video" && (
                          <video
                            src={url}
                            muted
                            playsInline
                            className="h-44 w-full object-cover"
                          />
                        )}
                        {item.type === "website" && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex h-44 flex-col items-center justify-center bg-slate-100 font-bold text-blue-600 dark:bg-slate-700"
                          >
                            <LinkIcon size={22} />
                            <span className="mt-1 text-sm">
                              {item.title || "Visit Website"}
                            </span>
                          </a>
                        )}
                        {item.title && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-sm font-bold text-white">
                            {item.title}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Past Works */}
            <div className={card}>
              <h3 className="mb-4 font-black text-slate-900 dark:text-white">
                Past Works
              </h3>
              {profile.pastWorks?.length ? (
                <div className="space-y-3">
                  {profile.pastWorks.map((w, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black text-slate-900 dark:text-white">
                            {w.title || "Work"}
                          </p>
                          {w.year && (
                            <p className="mt-0.5 text-xs font-bold text-slate-500">
                              {w.year}
                            </p>
                          )}
                        </div>
                        {w.link && (
                          <a
                            href={w.link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-100 active:bg-blue-50 dark:bg-slate-900 dark:ring-blue-500/20"
                          >
                            <LinkIcon size={13} /> View
                          </a>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                        {w.description || "No description."}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No past works added.</p>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-3">
            <div className="sticky top-6 space-y-4">
              {!isOwnProfile && (
                <div
                  onClick={openChat}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer rounded-3xl bg-blue-600 p-5 text-white active:bg-blue-700 dark:bg-blue-700"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                      <MessageCircle size={18} />
                    </div>
                    <h4 className="font-black">
                      Message {profile.name.split(" ")[0]}
                    </h4>
                  </div>
                  <p className="text-sm text-blue-100">
                    Have questions? Chat before booking.
                  </p>
                </div>
              )}

              {/* Reviews */}
              <div className={card}>
                <h3 className="mb-3 font-black text-slate-900 dark:text-white">
                  Reviews
                </h3>
                {loadingReviews ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="animate-spin" size={16} /> Loading…
                  </div>
                ) : reviews.length === 0 ? (
                  <p className="text-sm text-slate-500">No reviews yet.</p>
                ) : (
                  <div className="space-y-3">
                    {reviews.slice(0, 10).map((r) => (
                      <div
                        key={r._id}
                        className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-black text-slate-800 dark:text-white">
                            {r.clientName || "Anonymous"}
                          </p>
                          <span className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                            <Star size={12} fill="currentColor" /> {r.rating}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-4 text-xs text-slate-600 dark:text-slate-400">
                          {r.comment || "No comment"}
                        </p>
                        <p className="mt-1.5 text-[10px] text-slate-400">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl bg-slate-900 p-6 text-white dark:bg-slate-800">
                <h4 className="mb-2 font-black">Why book this freelancer?</h4>
                <ul className="space-y-1 text-sm text-slate-300">
                  <li>• Trusted reviews</li>
                  <li>• Verified profile</li>
                  <li>• Clear portfolio & work history</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {lightboxIndex !== null && lightboxIndex >= 0 && (
          <PortfolioLightbox
            items={portfolio.map((item) => ({
              url: item.url || item.websiteUrl,
              type: item.type,
              title: item.title,
            }))}
            index={lightboxIndex}
            setIndex={setLightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </div>
    </>
  );
}
