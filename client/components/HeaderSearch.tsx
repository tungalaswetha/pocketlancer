// client/components/HeaderSearch.tsx
// Typeahead search for clients — shown only in DashboardHeader (xl+).
// • Typing 2+ chars → debounced API call → inline dropdown of top 5 freelancers
// • Clicking a result → freelancer profile
// • "See all results" → /search?skills=query (full search page)
// • Press Enter → /search?skills=query
// • Freelancers see nothing here (their search is bookings-based)

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, MapPin, Star, Loader2, X } from "lucide-react";
import api from "@/services/api";

interface Hit {
  _id: string;
  title?: string;
  city?: string;
  hourlyRate?: number;
  rating?: number;
  category?: string;
  user?: { name?: string };
}

function useDebounce<T>(value: T, ms: number): T {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return deb;
}

export default function HeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebounce(query, 280);

  // ── Fetch on debounced query ───────────────────────────────────
  useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get("/freelancers/search", {
        params: { category: "digital", skills: debounced.trim() },
      })
      .then((res) => {
        if (cancelled) return;
        const list: Hit[] = (res.data.freelancers || []).slice(0, 5);
        setResults(list);
        setOpen(list.length > 0);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  // ── Close on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const t =
        e.type === "touchstart"
          ? document.elementFromPoint(
              (e as TouchEvent).touches[0].clientX,
              (e as TouchEvent).touches[0].clientY,
            )
          : (e as MouseEvent).target;
      if (containerRef.current && !containerRef.current.contains(t as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  const goFullSearch = () => {
    const q = query.trim();
    setOpen(false);
    setQuery("");
    if (q) router.push(`/search?skills=${encodeURIComponent(q)}`);
    else router.push("/search");
  };

  const goProfile = (id: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/freelancer/${id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      goFullSearch();
    }
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative hidden xl:block w-64">
      {/* Input */}
      <div
        className={`flex items-center gap-2 rounded-2xl border bg-slate-50 px-3 py-2 transition-all ${
          open
            ? "border-blue-400 ring-2 ring-blue-100"
            : "border-slate-200 focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-200"
        }`}
      >
        {loading ? (
          <Loader2 size={14} className="text-slate-400 shrink-0 animate-spin" />
        ) : (
          <Search size={14} className="text-slate-400 shrink-0" />
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search skills…"
          className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400 min-w-0"
        />
        {query && (
          <button
            onClick={handleClear}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-2 left-0 w-[340px] rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden">
          {/* Results */}
          <div>
            {results.map((fl) => (
              <button
                key={fl._id}
                onClick={() => goProfile(fl._id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left border-b border-slate-100 last:border-0 group"
              >
                {/* Avatar */}
                <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                  {(fl.user?.name || "F")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">
                    {fl.user?.name || "Freelancer"}
                  </p>
                  <p className="text-xs font-bold text-slate-500 truncate">
                    {fl.title || "Professional"}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {fl.city && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                        <MapPin size={10} /> {fl.city}
                      </span>
                    )}
                    {typeof fl.rating === "number" && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                        <Star size={10} className="fill-amber-400" />{" "}
                        {fl.rating.toFixed(1)}
                      </span>
                    )}
                    {typeof fl.hourlyRate === "number" && (
                      <span className="text-[11px] font-black text-slate-600">
                        ₹{fl.hourlyRate}/hr
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight
                  size={14}
                  className="text-slate-300 group-hover:text-slate-600 transition flex-shrink-0"
                />
              </button>
            ))}
          </div>

          {/* Footer — see all */}
          <button
            onClick={goFullSearch}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition border-t border-slate-100 group"
          >
            <span className="text-xs font-black text-slate-600 group-hover:text-slate-900 transition">
              See all results for{" "}
              <span className="text-blue-600">"{query.trim()}"</span>
            </span>
            <ArrowRight
              size={13}
              className="text-slate-400 group-hover:text-slate-700 transition"
            />
          </button>
        </div>
      )}
    </div>
  );
}
