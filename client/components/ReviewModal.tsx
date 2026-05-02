"use client";

import { useState } from "react";
import api from "@/services/api";
import { Star, Loader2, X } from "lucide-react";

export default function ReviewModal({
  bookingId,
  onClose,
}: {
  bookingId: string;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitReview = async () => {
    try {
      setError("");
      setLoading(true);

      await api.post("/reviews", {
        bookingId,
        rating,
        comment,
      });

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.msg || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 shadow-xl p-7 relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 opacity-60 hover:opacity-100"
        >
          <X />
        </button>

        {/* Header */}
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
          Leave a Review
        </h2>

        <p className="text-sm font-bold text-slate-500 mb-6">
          Share your experience with the freelancer
        </p>

        {/* Star Rating */}
        <div className="mb-6">
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">
            Rating
          </p>

          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                onClick={() => setRating(i)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(0)}
                type="button"
              >
                <Star
                  size={32}
                  className={
                    i <= (hover || rating)
                      ? "fill-amber-400 text-amber-400 transition"
                      : "text-slate-300 transition"
                  }
                />
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="mb-6">
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">
            Comment
          </p>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder="Describe your experience..."
            className="w-full rounded-2xl border border-slate-200 dark:border-white/10
                       bg-white dark:bg-slate-900
                       px-4 py-3 font-bold outline-none
                       focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-5 py-3 font-black hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
          >
            Cancel
          </button>

          <button
            onClick={submitReview}
            disabled={loading}
            className="rounded-2xl bg-blue-600 px-6 py-3 text-white font-black flex items-center gap-2 hover:bg-blue-700 disabled:opacity-60"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            Submit Review
          </button>
        </div>

        {error && (
          <p className="text-red-500 font-bold text-sm mt-4">{error}</p>
        )}
      </div>
    </div>
  );
}
