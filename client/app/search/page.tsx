// client/app/search/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import api from "@/services/api";
import { getCurrentLocation } from "@/utils/geolocation";
import FreelancerCard from "@/components/FreelancerCard";
import {
  Search,
  LocateFixed,
  SlidersHorizontal,
  X,
  Map,
  RefreshCcw,
  Users,
  Loader2,
  MapPin,
} from "lucide-react";

type SortMode = "nearest" | "cheapest" | "toprated";

const FreelancerMiniMap = dynamic(
  () => import("@/components/FreelancerMiniMap"),
  { ssr: false, loading: () => <MapSkeleton /> },
);

function MapSkeleton() {
  return (
    <div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
      <Map size={28} className="text-slate-300 dark:text-slate-600" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-32 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-48 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}

// ── Location Permission Modal (mobile native only) ────────────────
function LocationPermissionModal({
  onAllow,
  onDismiss,
}: {
  onAllow: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-8">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 dark:bg-slate-800 p-7 shadow-2xl">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20">
          <MapPin size={28} className="text-blue-400" />
        </div>
        <h2 className="mb-2 text-lg font-black text-white">
          Enable Location Services
        </h2>
        <p className="mb-1 text-sm font-bold text-slate-300">
          To continue, your device will need to use Location Services.
        </p>
        <p className="mb-6 text-xs font-medium text-slate-400">
          PocketLancer uses your location to find nearby freelancers for field
          services. Your location is only used while searching and is never
          stored.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-black text-slate-300 transition active:bg-white/5"
          >
            No, thanks
          </button>
          <button
            onClick={onAllow}
            className="flex-1 rounded-2xl bg-blue-600 py-3 text-sm font-black text-white transition active:bg-blue-700"
          >
            Turn on
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inner page ────────────────────────────────────────────────────
function SearchInner() {
  const searchParams = useSearchParams();

  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");

  const [skillsInput, setSkillsInput] = useState("");
  const [skills, setSkills] = useState("");
  const [radiusKm, setRadiusKm] = useState(10);
  const [sortMode, setSortMode] = useState<SortMode>("nearest");
  const [category, setCategory] = useState<"field" | "digital">("field");

  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Location permission prompt ────────────────────────────────
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const locationPromptChecked = useRef(false);

  // ── Check permission on mount (all categories, native only) ──
  // We do NOT use sessionStorage here so the check runs fresh on every visit.
  // Previously we stored "locationPromptShown" in sessionStorage which meant
  // after the first visit the modal would never appear again.
  // Now: show the modal any time the app permission is not yet granted.
  useEffect(() => {
    if (locationPromptChecked.current) return;
    locationPromptChecked.current = true;

    const checkAndPrompt = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return; // desktop — skip

        const { Geolocation } = await import("@capacitor/geolocation");
        const status = await Geolocation.checkPermissions();

        if (status.location !== "granted") {
          // App permission not yet granted — show our pre-prompt modal.
          // When user taps "Turn on", we call requestPermissions() which
          // triggers the Android OS permission dialog.
          setShowLocationPrompt(true);
        }
        // If permission is already granted, check whether device GPS is on.
        // If not, show a gentle inline error so the user knows to enable it.
        // We use AndroidBridge (injected by MainActivity) to check this.
        else if (
          typeof window !== "undefined" &&
          (window as any).AndroidBridge &&
          !(window as any).AndroidBridge.isLocationEnabled()
        ) {
          setError(
            "📍 Your device location (GPS) is turned off. Tap here to enable it.",
          );
          setHasSearched(true);
        }
      } catch {
        // Geolocation plugin not available — skip
      }
    };

    checkAndPrompt();
  }, []);

  // ── "Turn on" tapped → request OS permission → then auto-search ─
  const handleLocationAllow = async () => {
    setShowLocationPrompt(false);
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      await Geolocation.requestPermissions();
      // Permission granted — kick off auto-search immediately
      if (category === "field") {
        searchNearby(skills || "", "field");
      }
    } catch {
      // If requestPermissions throws, let the search error handle it
    }
  };

  const handleLocationDismiss = () => {
    setShowLocationPrompt(false);
    // Still auto-search — will fail with a friendly error if GPS denied
    if (category === "field") {
      searchNearby(skills || "", "field");
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const didInit = useRef(false);

  // ── Helpers ───────────────────────────────────────────────────
  const applySort = (items: any[]) => {
    const list = [...items];
    if (sortMode === "nearest")
      list.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
    if (sortMode === "cheapest")
      list.sort((a, b) => (a.hourlyRate ?? 999999) - (b.hourlyRate ?? 999999));
    if (sortMode === "toprated")
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return list;
  };

  const searchNearby = async (committedSkills: string, cat = category) => {
    try {
      setLoading(true);
      setError("");
      setHasSearched(true);
      const params: any = { category: cat, skills: committedSkills };
      if (cat === "field") {
        const pos = coords ?? (await getCurrentLocation());
        setCoords(pos);
        params.latitude = pos.latitude;
        params.longitude = pos.longitude;
        params.radiusKm = radiusKm;
      }
      const res = await api.get("/freelancers/search", { params });
      setFreelancers(applySort(res.data.freelancers || []));
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (cat === "field") {
        if (msg.startsWith("PERMISSION_DENIED")) {
          setError(
            "Location permission denied. Please enable it in Settings → App → Permissions.",
          );
        } else if (msg.startsWith("TIMEOUT")) {
          setError(
            "GPS timed out. Please step outside or into open air and try again.",
          );
        } else if (msg.startsWith("POSITION_UNAVAILABLE")) {
          setError(
            "📍 GPS_OFF: Your device location is turned off. Tap here to enable it.",
          );
        } else {
          setError(`Search failed: ${msg || "Unable to reach the server."}`);
        }
      } else {
        setError(
          "Unable to fetch freelancers. Check your connection and try again.",
        );
      }
      setFreelancers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSkills(skillsInput);
    searchNearby(skillsInput);
    setFiltersOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleClear = () => {
    setSkillsInput("");
    setSkills("");
    setError("");
    setHasSearched(false);
    setFreelancers([]);
    // Re-run auto-search to restore "show all nearby"
    searchNearby("", category);
  };

  // ── Auto-search on mount ──────────────────────────────────────
  // Desktop: fires immediately (browser has geolocation, no permission modal)
  // Mobile: fires after the location prompt resolves (handleLocationAllow/Dismiss)
  //         OR immediately if permission was already granted in a previous session
  useEffect(() => {
    const incoming = searchParams.get("skills") || "";

    if (didInit.current && incoming === skills) return;
    didInit.current = true;

    if (incoming) {
      setSkillsInput(incoming);
      setSkills(incoming);
      searchNearby(incoming);
    } else {
      // ✅ CHANGE: always auto-search on load for both field and digital.
      //    Previously only triggered for digital; field required clicking Search.
      //    Now all users see results immediately on page open.
      searchNearby("", category);
    }
  }, [searchParams]); // eslint-disable-line

  useEffect(() => {
    setFreelancers((prev) => applySort(prev));
  }, [sortMode]); // eslint-disable-line

  useEffect(() => {
    if (!didInit.current) return;
    if (category === "digital") {
      searchNearby(skills, category);
    } else if (coords) {
      searchNearby(skills, category);
    } else {
      // No coords yet for field — trigger search which will fetch GPS
      searchNearby(skills, category);
    }
  }, [category]); // eslint-disable-line

  const canShowMap = category === "field" && coords !== null;
  const resultCount = freelancers.length;

  const subtitle = useMemo(() => {
    if (category === "digital") {
      if (sortMode === "cheapest") return "Sorted by lowest rate";
      if (sortMode === "toprated") return "Sorted by rating";
      return "Sorted by relevance";
    }
    if (sortMode === "nearest") return "Sorted by nearest";
    if (sortMode === "cheapest") return "Sorted by lowest rate";
    return "Sorted by rating";
  }, [sortMode, category]);

  const sortOptions =
    category === "field"
      ? [
          { id: "nearest" as SortMode, label: "Nearest" },
          { id: "cheapest" as SortMode, label: "Cheapest" },
          { id: "toprated" as SortMode, label: "Top Rated" },
        ]
      : [
          { id: "cheapest" as SortMode, label: "Cheapest" },
          { id: "toprated" as SortMode, label: "Top Rated" },
        ];

  return (
    <>
      {showLocationPrompt && (
        <LocationPermissionModal
          onAllow={handleLocationAllow}
          onDismiss={handleLocationDismiss}
        />
      )}

      {/* DESKTOP lg+ */}
      <div className="hidden lg:flex h-[calc(100vh-65px)] overflow-hidden bg-slate-50 dark:bg-slate-950">
        <div className="w-[55%] flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 overflow-hidden">
          <div className="flex-shrink-0 px-4 pt-5 pb-3 border-b border-slate-100 dark:border-white/10 space-y-3">
            <div className="flex gap-2">
              {(["field", "digital"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
                    category === cat
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {cat === "field" ? "Field Services" : "Digital Services"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition">
                <Search size={14} className="text-slate-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Filter by skill, e.g. Plumber, React Dev…"
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 font-medium"
                />
                {skillsInput && (
                  <button
                    onClick={handleClear}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1.5 flex-shrink-0"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Search size={14} />
                )}
                Search
              </button>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {category === "field" && (
                <div className="flex items-center gap-1.5">
                  <LocateFixed size={12} className="text-slate-400" />
                  {[5, 10, 25, 50].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRadiusKm(r)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition ${
                        radiusKm === r
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      {r}km
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5 ml-auto">
                {sortOptions.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setSortMode(id)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition ${
                      sortMode === id
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="px-3 py-2 border-b border-slate-100 dark:border-white/10">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {loading
                ? "Finding freelancers near you…"
                : hasSearched
                  ? `${resultCount} freelancer${resultCount !== 1 ? "s" : ""} found${skills ? ` for "${skills}"` : " nearby"}`
                  : "Detecting your location…"}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {error && (
              <div
                className={`mx-4 mt-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-xs font-bold text-red-700 dark:text-red-300 ${error.includes("GPS_OFF") ? "cursor-pointer active:opacity-70" : ""}`}
                onClick={() => {
                  if (
                    error.includes("GPS_OFF") &&
                    (window as any).AndroidBridge
                  ) {
                    (window as any).AndroidBridge.openLocationSettings();
                  }
                }}
              >
                {error.replace("GPS_OFF: ", "")}
              </div>
            )}
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : hasSearched && freelancers.length === 0 && !error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 px-6 text-center">
                <Users size={32} className="opacity-30" />
                <p className="text-sm font-black text-slate-500 dark:text-slate-400">
                  No freelancers found
                </p>
                <p className="text-xs font-bold text-slate-400">
                  Try a wider radius or different skill.
                </p>
                <button
                  onClick={handleClear}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-xs font-black"
                >
                  <RefreshCcw size={12} /> Clear Filters
                </button>
              </div>
            ) : (
              <div className="p-3 grid grid-cols-1 xl:grid-cols-2 gap-2.5">
                {freelancers.map((fl) => (
                  <FreelancerCard key={fl._id} freelancer={fl} />
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="w-[45%] flex-shrink-0 relative">
          {canShowMap ? (
            <FreelancerMiniMap center={coords!} freelancers={freelancers} />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-slate-900">
              <Map size={36} className="text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-bold text-slate-400 text-center px-6">
                {category === "digital"
                  ? "Map not available for digital services"
                  : loading
                    ? "Loading map…"
                    : "Search to see nearby freelancers on map"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE < lg */}
      <div className="lg:hidden flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
        <div className="sticky top-0 z-30 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-white/10 shadow-sm">
          <div className="px-4 pt-4 pb-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {(["field", "digital"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`py-2 rounded-xl text-xs font-black transition ${
                    category === cat
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {cat === "field" ? "Field Services" : "Digital Services"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 px-3 py-2.5">
                <Search size={14} className="text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Filter by skill…"
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 font-medium"
                />
                {skillsInput && (
                  <button onClick={handleClear}>
                    <X size={13} className="text-slate-400" />
                  </button>
                )}
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Search size={14} />
                )}
              </button>
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className={`px-3 rounded-xl border transition ${
                  filtersOpen
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                    : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900"
                }`}
              >
                <SlidersHorizontal size={14} />
              </button>
            </div>
            {filtersOpen && (
              <div className="space-y-3 pt-1 pb-1">
                {category === "field" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wide">
                      Radius
                    </span>
                    {[5, 10, 25, 50].map((r) => (
                      <button
                        key={r}
                        onClick={() => setRadiusKm(r)}
                        className={`rounded-lg px-3 py-1 text-xs font-black transition ${radiusKm === r ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}
                      >
                        {r}km
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wide">
                    Sort
                  </span>
                  {sortOptions.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setSortMode(id)}
                      className={`rounded-lg px-3 py-1 text-xs font-black transition ${sortMode === id ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="px-4 py-2 border-t border-slate-100 dark:border-white/10">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {loading
                ? "Finding freelancers near you…"
                : hasSearched
                  ? `${resultCount} freelancer${resultCount !== 1 ? "s" : ""} found${skills ? ` for "${skills}"` : " nearby"}`
                  : "Detecting your location…"}
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div
              className={`m-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-xs font-bold text-red-700 dark:text-red-300 ${error.includes("GPS_OFF") ? "cursor-pointer active:opacity-70" : ""}`}
              onClick={() => {
                if (
                  error.includes("GPS_OFF") &&
                  (window as any).AndroidBridge
                ) {
                  (window as any).AndroidBridge.openLocationSettings();
                }
              }}
            >
              {error.replace("GPS_OFF: ", "")}
            </div>
          )}
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : hasSearched && freelancers.length === 0 && !error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 px-6 text-center">
              <Users size={32} className="opacity-30" />
              <p className="text-sm font-black text-slate-500 dark:text-slate-400">
                No freelancers found
              </p>
              <p className="text-xs font-bold text-slate-400">
                Try a wider radius or different skill.
              </p>
              <button
                onClick={handleClear}
                className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-xs font-black"
              >
                <RefreshCcw size={12} /> Clear Filters
              </button>
            </div>
          ) : (
            <div className="p-3 grid grid-cols-1 xl:grid-cols-2 gap-2.5">
              {freelancers.map((fl) => (
                <FreelancerCard key={fl._id} freelancer={fl} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
