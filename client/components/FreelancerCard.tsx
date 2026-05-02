// client/components/FreelancerCard.tsx
"use client";

import { useRouter } from "next/navigation";
import {
  MapPin,
  Star,
  IndianRupee,
  ArrowRight,
  BadgeCheck,
  Shield,
} from "lucide-react";

function HonorBadge({ score }: { score?: number }) {
  if (score === undefined) return null;
  const cls =
    score < 35
      ? "bg-red-50 text-red-700 ring-red-100 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-500/20"
      : score < 75
        ? "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-200 dark:ring-orange-500/20"
        : "bg-green-50 text-green-700 ring-green-100 dark:bg-green-500/10 dark:text-green-200 dark:ring-green-500/20";
  return (
    <span
      title={`Honor Score: ${score}`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${cls}`}
    >
      <Shield size={9} />
      {score < 35 ? "Low Trust" : score < 75 ? "Average" : "Trusted"} · {score}
    </span>
  );
}

export default function FreelancerCard({ freelancer }: { freelancer: any }) {
  const router = useRouter();

  const name = freelancer?.user?.name || "Freelancer";
  const title = freelancer?.title || "Professional Freelancer";
  const city = freelancer?.city || "Unknown";

  // ✅ Distance: shown as "1.2 km away" when available (field search only)
  const rawDistance = freelancer?.distanceKm;
  const distanceLabel =
    typeof rawDistance === "number"
      ? rawDistance < 1
        ? `${Math.round(rawDistance * 1000)} m away`
        : `${rawDistance % 1 === 0 ? rawDistance : rawDistance.toFixed(1)} km away`
      : null;

  const rate =
    typeof freelancer?.hourlyRate === "number" ? freelancer.hourlyRate : null;
  const rating =
    typeof freelancer?.rating === "number" ? freelancer.rating : null;
  const skills: string[] = Array.isArray(freelancer?.skills)
    ? freelancer.skills
    : [];
  const honorScore: number | undefined = freelancer?.user?.honorScore;

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white ring-1 ring-black/5 active:scale-[0.99] transition-transform dark:border-white/10 dark:bg-slate-950 dark:ring-white/10"
      onClick={() => router.push(`/freelancer/${freelancer._id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) =>
        e.key === "Enter" && router.push(`/freelancer/${freelancer._id}`)
      }
    >
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-black text-slate-900 dark:text-white">
                {name}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20">
                <BadgeCheck size={11} /> VERIFIED
              </span>
            </div>

            <p className="mt-0.5 truncate text-sm font-bold text-slate-600 dark:text-slate-300">
              {title}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <HonorBadge score={honorScore} />
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-sm font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-slate-400" />
                {city}
              </span>

              {/* ✅ Distance badge — only shown for field search results */}
              {distanceLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-black text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                  📍 {distanceLabel}
                </span>
              )}

              {rating !== null && (
                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-black text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20">
                  <Star size={12} className="text-amber-500" />
                  {rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {/* Avatar */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 font-black text-white dark:bg-white dark:text-slate-900">
            {(name || "F")[0].toUpperCase()}
          </div>
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {skills.slice(0, 5).map((s) => (
              <span
                key={s}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {s}
              </span>
            ))}
            {skills.length > 5 && (
              <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-black text-slate-400 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                +{skills.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Price + CTA */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-2.5 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
            {rate !== null ? (
              <div className="flex items-baseline gap-1">
                <IndianRupee size={13} className="text-slate-500" />
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {rate.toLocaleString("en-IN")}
                </span>
                <span className="text-xs font-bold text-slate-400">/hr</span>
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-500">
                Contact for price
              </p>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/book/${freelancer._id}`);
            }}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black text-white active:bg-slate-700 dark:bg-white dark:text-slate-900 dark:active:bg-slate-200"
          >
            Book Now <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
