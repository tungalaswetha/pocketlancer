"use client";

import { useState, useRef } from "react";
import api from "@/services/api";
import {
  Loader2,
  UploadCloud,
  X,
  FileText,
  ImageIcon,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

const MAX_FILE_SIZE_MB = 4;
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export default function DisputeModal({
  bookingId,
  onClose,
}: {
  bookingId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFileError("");
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setFileError("Only images (JPG, PNG, WEBP) and PDF files are accepted.");
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(
        `File exceeds ${MAX_FILE_SIZE_MB}MB limit. Please choose a smaller file.`,
      );
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    setError(null);
    setFileError("");

    if (!reason.trim()) {
      setError("Please explain the issue clearly before submitting.");
      return;
    }
    if (!file) {
      setFileError(
        "Evidence is required. Please attach at least one image or PDF.",
      );
      return;
    }

    try {
      setLoading(true);

      // Step 1: Create dispute
      const res = await api.post("/disputes", { bookingId, reason });
      const disputeId = res.data._id || res.data.dispute?._id;

      if (!disputeId) throw new Error("Failed to get dispute ID");

      // Step 2: Upload evidence (mandatory)
      const form = new FormData();
      form.append("file", file);
      await api.post(`/disputes/${disputeId}/evidence`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setDone(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.msg || err.message || "Failed to submit dispute";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fileIcon =
    file?.type === "application/pdf" ? (
      <FileText size={16} className="text-red-500" />
    ) : (
      <ImageIcon size={16} className="text-blue-500" />
    );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4 py-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
              <ShieldAlert
                size={18}
                className="text-red-600 dark:text-red-400"
              />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Raise a Dispute
              </h2>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Our team will review within 24 hours
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* ─── Body ─── */}
        {done ? (
          // ── SUCCESS STATE ──
          <div className="px-6 py-10 flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2
                size={32}
                className="text-emerald-600 dark:text-emerald-400"
              />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Dispute Submitted!
              </h3>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                We've received your dispute and evidence. Our team will review
                it and reach out to both parties within 24 hours.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-8 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-sm"
            >
              Close
            </button>
          </div>
        ) : (
          // ── FORM STATE ──
          <div className="px-6 py-6 space-y-5">
            {/* Reason textarea */}
            <div>
              <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                Describe the Issue <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Explain what went wrong clearly — e.g. 'Freelancer did not show up on the scheduled date...'"
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700
                           bg-white dark:bg-slate-950
                           px-4 py-3 text-sm font-bold text-slate-900 dark:text-white
                           outline-none focus:border-red-400 dark:focus:border-red-500
                           placeholder:text-slate-400 resize-none"
              />
            </div>

            {/* Evidence upload — MANDATORY */}
            <div>
              <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                Evidence <span className="text-red-500">*</span>
                <span className="ml-2 text-xs font-bold text-slate-400">
                  (Required — max {MAX_FILE_SIZE_MB}MB, JPG/PNG/WEBP/PDF)
                </span>
              </label>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 cursor-pointer transition
                  ${
                    file
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/50"
                      : fileError
                        ? "border-red-400 bg-red-50 dark:bg-red-500/10 dark:border-red-500/50"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-950"
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  // File selected — show preview
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm flex-shrink-0">
                      {fileIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 transition flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  // Empty state
                  <>
                    <UploadCloud
                      size={24}
                      className="text-slate-400 dark:text-slate-500"
                    />
                    <div className="text-center">
                      <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                        Tap to upload evidence
                      </p>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">
                        Screenshot, photo, or PDF — max {MAX_FILE_SIZE_MB}MB
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* File error */}
              {fileError && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/20 px-3 py-2">
                  <AlertTriangle
                    size={14}
                    className="text-red-500 mt-0.5 flex-shrink-0"
                  />
                  <p className="text-xs font-bold text-red-700 dark:text-red-300">
                    {fileError}
                  </p>
                </div>
              )}
            </div>

            {/* Warning box */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 px-4 py-3">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                ⚠️ Once submitted, your booking will be locked until the dispute
                is resolved. Make sure your reason and evidence are accurate.
              </p>
            </div>

            {/* API error */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/20 px-4 py-3">
                <AlertTriangle
                  size={14}
                  className="text-red-500 mt-0.5 flex-shrink-0"
                />
                <p className="text-sm font-bold text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm flex items-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="animate-spin" size={16} />}
                {loading ? "Submitting…" : "Submit Dispute"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
