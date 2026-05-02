// client/app/book/[freelancerId]/page.tsx
// KEY CHANGE: For field bookings, client can now choose:
//   Scenario 1 — "Use My Current Location": geo-coords are captured and
//     sent to server; freelancer proximity is verified on arrival.
//   Scenario 2 — "Enter a Different Address": manual address only; no GPS check.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";
import {
  CalendarDays,
  Clock,
  MapPin,
  Wrench,
  FileText,
  ArrowLeft,
  ShieldCheck,
  Star,
  BadgeCheck,
  Loader2,
  CreditCard,
  Zap,
  Globe,
  IndianRupee,
  Lock,
  CheckCircle2,
  HelpCircle,
  Timer,
  Plus,
  Minus,
  Navigation,
  Edit3,
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type DigitalPayMode = "advance" | "hours";
type LocationMode = "current" | "other";

export default function BookFreelancerPage() {
  const params = useParams();
  const freelancerId = params?.freelancerId?.toString();
  const router = useRouter();
  const { user, loading } = useUser();

  const [submitting, setSubmitting] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<
    "idle" | "creating" | "paying" | "verifying"
  >("idle");
  const [error, setError] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [address, setAddress] = useState("");
  const [freelancer, setFreelancer] = useState<any>(null);
  const [loadingFreelancer, setLoadingFreelancer] = useState(false);
  const [freelancerError, setFreelancerError] = useState("");

  // Digital-specific state
  const [digitalPayMode, setDigitalPayMode] =
    useState<DigitalPayMode>("advance");
  const [estimatedHours, setEstimatedHours] = useState(1);

  // Field location mode
  const [locationMode, setLocationMode] = useState<LocationMode>("current");
  const [clientLat, setClientLat] = useState<number | null>(null);
  const [clientLng, setClientLng] = useState<number | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationFetched, setLocationFetched] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "client")) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (document.getElementById("rzp-sdk")) return;
    const s = document.createElement("script");
    s.id = "rzp-sdk";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    if (!freelancerId) return;
    setLoadingFreelancer(true);
    api
      .get(`/freelancers/${freelancerId}`)
      .then((r) => setFreelancer(r.data.profile ?? r.data.freelancer ?? r.data))
      .catch(() => setFreelancerError("Unable to load freelancer profile."))
      .finally(() => setLoadingFreelancer(false));
  }, [freelancerId]);

  const isDigital = freelancer?.category === "digital";
  const isHourlyDigital =
    isDigital &&
    (freelancer?.pricingType === "hourly" || !freelancer?.pricingType);

  const minDate = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Auto-fetch location when "Use My Location" is selected
  const fetchCurrentLocation = async () => {
    setFetchingLocation(true);
    setLocationError("");
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        }),
      );
      setClientLat(pos.coords.latitude);
      setClientLng(pos.coords.longitude);
      setLocationFetched(true);

      // Reverse-geocode to get a readable address
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
        );
        const data = await res.json();
        const readable =
          data.display_name ||
          `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        setAddress(readable);
      } catch {
        setAddress(
          `GPS: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
        );
      }
    } catch (err: any) {
      setLocationError(
        err?.code === 1
          ? "Location permission denied. Please allow location access or enter address manually."
          : "Could not fetch location. Please try again or enter address manually.",
      );
      setLocationMode("other"); // fallback to manual
    } finally {
      setFetchingLocation(false);
    }
  };

  useEffect(() => {
    if (!isDigital && locationMode === "current") {
      fetchCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDigital, locationMode]);

  const agreedAmount = useMemo(() => {
    if (!freelancer) return 0;
    if (isHourlyDigital) {
      if (digitalPayMode === "advance") return freelancer.advanceAmount || 0;
      return parseFloat(
        (estimatedHours * (freelancer.hourlyRate || 0)).toFixed(2),
      );
    }
    if (freelancer.pricingType === "fixed") return freelancer.fixedPrice || 0;
    if (freelancer.pricingType === "milestone")
      return (freelancer.milestones || []).reduce(
        (s: number, m: any) => s + m.amount,
        0,
      );
    return freelancer.hourlyRate || 0;
  }, [freelancer, digitalPayMode, estimatedHours, isHourlyDigital]);

  const canSubmit = useMemo(() => {
    if (submitting || !serviceType.trim()) return false;
    if (isDigital && (!user?.phone || !user.phone.trim())) return false;
    if (!isDigital) {
      if (!preferredDate || !preferredTime) return false;
      if (locationMode === "current" && !locationFetched) return false;
      if (locationMode === "other" && !address.trim()) return false;
      return true;
    }
    if (isHourlyDigital) {
      if (digitalPayMode === "advance")
        return (freelancer?.advanceAmount || 0) > 0;
      return estimatedHours > 0;
    }
    return true;
  }, [
    serviceType,
    preferredDate,
    preferredTime,
    address,
    submitting,
    isDigital,
    isHourlyDigital,
    digitalPayMode,
    estimatedHours,
    freelancer,
    user?.phone,
    locationMode,
    locationFetched,
  ]);

  const handleDigitalBooking = async () => {
    setError("");
    setSubmitting(true);
    setPaymentPhase("creating");
    try {
      const body: any = {
        freelancer_id: freelancerId,
        serviceType,
        issueDescription,
      };
      if (isHourlyDigital) {
        if (digitalPayMode === "advance") body.advancePayment = true;
        else body.estimatedHours = estimatedHours;
      }

      const bookRes = await api.post("/bookings", body);
      const booking = bookRes.data.booking;
      const orderRes = await api.post(
        `/bookings/${booking._id}/payment/create-order`,
      );
      const { razorpayOrderId, amount, currency, keyId } = orderRes.data;
      setPaymentPhase("paying");
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: keyId,
          amount,
          currency,
          name: "PocketLancer",
          description: `Booking: ${serviceType}`,
          order_id: razorpayOrderId,
          prefill: {
            name: user?.name || "",
            email: user?.email || "",
            // Only include contact if the user has a phone number.
            // Passing an empty string causes Razorpay's wallet validate/account
            // API to return HTTP 500, breaking ALL payment methods.
            ...(user?.phone ? { contact: user.phone } : {}),
          },
          // If user has no phone number, hide wallet options to avoid
          // the validate/account 500 error (wallets require a phone number).
          ...(!user?.phone
            ? {
                config: {
                  display: {
                    hide: [{ method: "wallet" }],
                    preferences: { show_default_blocks: true },
                  },
                },
              }
            : {}),
          theme: { color: "#7c3aed" },
          handler: async (response: any) => {
            setPaymentPhase("verifying");
            try {
              await api.post(`/bookings/${booking._id}/payment/verify`, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              router.push(
                `/payment/success?bookingId=${booking._id}&paymentId=${response.razorpay_payment_id}&amount=${agreedAmount}&service=${encodeURIComponent(serviceType)}`,
              );
              resolve();
            } catch {
              reject(new Error("Verification failed"));
            }
          },
          modal: {
            ondismiss: () => {
              setSubmitting(false);
              setPaymentPhase("idle");
              reject(new Error("dismissed"));
            },
          },
        });
        rzp.on("payment.failed", (r: any) =>
          reject(new Error(r.error?.description || "Payment failed")),
        );
        rzp.open();
      });
    } catch (err: any) {
      if (err?.message !== "dismissed")
        setError(err?.response?.data?.msg || err?.message || "Booking failed.");
      setSubmitting(false);
      setPaymentPhase("idle");
    }
  };

  const handleFieldBooking = async () => {
    setError("");
    if (!serviceType || !preferredDate || !preferredTime) {
      setError("Please fill all required fields.");
      return;
    }
    if (locationMode === "other" && !address.trim()) {
      setError("Please enter the service address.");
      return;
    }
    if (locationMode === "current" && !locationFetched) {
      setError(
        "Location not yet fetched. Please wait or switch to manual address.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const body: any = {
        freelancer_id: freelancerId,
        serviceType,
        issueDescription,
        preferredDate,
        preferredTime,
        address,
        locationMode,
      };
      // Send GPS coords for Scenario 1
      if (locationMode === "current" && clientLat && clientLng) {
        body.clientLat = clientLat;
        body.clientLng = clientLng;
      }

      await api.post("/bookings", body);
      router.push("/bookings?toast=booking_created");
    } catch (err: any) {
      setError(err.response?.data?.msg || "Failed to create booking.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    isDigital ? handleDigitalBooking() : handleFieldBooking();
  };

  if (loading || !user) return null;

  const fName = freelancer?.user?.name || freelancer?.name || "Freelancer";
  const fTitle = freelancer?.title || "Professional";
  const fCity = freelancer?.city || "";
  const fRate = freelancer?.hourlyRate;
  const fRating = freelancer?.rating;
  const fReviews = freelancer?.reviewsCount ?? 0;
  const fSkills: string[] = freelancer?.skills || [];
  const pricingType = freelancer?.pricingType || "hourly";

  return (
    <div className="min-h-[calc(100vh-80px)] w-full">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="pointer-events-none absolute -top-36 -right-36 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Header */}
        <div className="relative border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
            >
              <ArrowLeft size={16} /> Back
            </button>
            {!loadingFreelancer && freelancer && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black ring-1 ${isDigital ? "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300" : "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300"}`}
              >
                {isDigital ? (
                  <>
                    <Globe size={12} /> Digital Service
                  </>
                ) : (
                  <>
                    <MapPin size={12} /> Field Service
                  </>
                )}
              </span>
            )}
          </div>
          <div className="mt-5">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">
              Confirm Booking
            </h1>
            {!loadingFreelancer && freelancer && (
              <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                {isDigital
                  ? "Your payment is held in escrow — released only after you approve the work."
                  : "Book your slot for free. Pay the freelancer directly at the location."}
              </p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="relative grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-12">
          {/* Form */}
          <div className="lg:col-span-8">
            <form
              onSubmit={handleSubmit}
              className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950"
            >
              {/* Service Type */}
              <div>
                <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                  Service Type <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-violet-500 dark:border-white/10 dark:bg-slate-900">
                  <Wrench size={18} className="flex-shrink-0 text-slate-400" />
                  <input
                    type="text"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    placeholder={
                      isDigital
                        ? "e.g. Logo Design, Web Dev"
                        : "e.g. AC Repair, Plumbing"
                    }
                    className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                  Description{" "}
                  <span className="text-xs font-bold text-slate-400">
                    (optional)
                  </span>
                </label>
                <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-violet-500 dark:border-white/10 dark:bg-slate-900">
                  <FileText
                    size={18}
                    className="mt-0.5 flex-shrink-0 text-slate-400"
                  />
                  <textarea
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder={
                      isDigital
                        ? "Describe your project…"
                        : "Brand/model, floor, urgency…"
                    }
                    rows={3}
                    className="w-full resize-none bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                  />
                </div>
              </div>

              {/* Digital hourly pay mode */}
              {isHourlyDigital && (
                <div className="space-y-4">
                  <div className="h-px bg-slate-100 dark:bg-white/10" />

                  {/* ── Payment mode explanation ── */}
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white mb-1">
                      How long will this take?
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                      This freelancer charges by the hour. Choose how you want
                      to pay based on how well you know the scope of work.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option A — Advance */}
                    <button
                      type="button"
                      onClick={() => setDigitalPayMode("advance")}
                      className={`rounded-2xl px-4 py-4 text-sm font-black transition border text-left ${digitalPayMode === "advance" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-800"}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <HelpCircle size={16} className="flex-shrink-0" />
                        <span>I'm not sure of the hours</span>
                      </div>
                      <p
                        className={`text-[11px] font-bold leading-relaxed ${digitalPayMode === "advance" ? "text-violet-200" : "text-slate-400 dark:text-slate-500"}`}
                      >
                        Pay a small advance (₹
                        {freelancer?.advanceAmount?.toLocaleString("en-IN") ??
                          "—"}
                        ) to book the freelancer. The remaining balance is
                        settled directly with the freelancer after the work is
                        done.
                      </p>
                    </button>

                    {/* Option B — Hours */}
                    <button
                      type="button"
                      onClick={() => setDigitalPayMode("hours")}
                      className={`rounded-2xl px-4 py-4 text-sm font-black transition border text-left ${digitalPayMode === "hours" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-800"}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Timer size={16} className="flex-shrink-0" />
                        <span>I know how many hours</span>
                      </div>
                      <p
                        className={`text-[11px] font-bold leading-relaxed ${digitalPayMode === "hours" ? "text-violet-200" : "text-slate-400 dark:text-slate-500"}`}
                      >
                        Pay the full estimated amount upfront (held in escrow).
                        The freelancer receives payment only after you approve
                        the completed work.
                      </p>
                    </button>
                  </div>

                  {digitalPayMode === "hours" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            setEstimatedHours((h) => Math.max(1, h - 1))
                          }
                          className="h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center dark:border-slate-800"
                        >
                          <Minus size={16} />
                        </button>
                        <div className="flex-1 text-center">
                          <span className="text-2xl font-black text-slate-900 dark:text-white">
                            {estimatedHours}
                          </span>
                          <span className="text-sm font-bold text-slate-500 ml-2">
                            {estimatedHours === 1 ? "hour" : "hours"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setEstimatedHours((h) => Math.min(100, h + 1))
                          }
                          className="h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center dark:border-slate-800"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Field-only: date, time, location */}
              {!isDigital && (
                <>
                  <div className="h-px bg-slate-100 dark:bg-white/10" />
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    Schedule
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                        Preferred Date <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-violet-500 dark:border-white/10 dark:bg-slate-900">
                        <CalendarDays size={18} className="text-slate-400" />
                        <input
                          type="date"
                          value={preferredDate}
                          min={minDate}
                          onChange={(e) => setPreferredDate(e.target.value)}
                          className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none dark:text-white"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                        Preferred Time <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-violet-500 dark:border-white/10 dark:bg-slate-900">
                        <Clock size={18} className="text-slate-400" />
                        <input
                          type="time"
                          value={preferredTime}
                          onChange={(e) => setPreferredTime(e.target.value)}
                          className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none dark:text-white"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Location Mode Selector ── */}
                  <div className="h-px bg-slate-100 dark:bg-white/10" />
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    Service Location
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLocationMode("current")}
                      className={`rounded-2xl px-4 py-3 text-sm font-black transition border text-left ${locationMode === "current" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-800"}`}
                    >
                      <Navigation
                        size={16}
                        className="inline-block mr-2 mb-0.5"
                      />
                      My Current Location
                      <p className="text-[10px] font-bold mt-0.5 opacity-75">
                        Auto-fetch GPS
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLocationMode("other");
                        setLocationFetched(false);
                        setAddress("");
                        setClientLat(null);
                        setClientLng(null);
                      }}
                      className={`rounded-2xl px-4 py-3 text-sm font-black transition border text-left ${locationMode === "other" ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-800"}`}
                    >
                      <Edit3 size={16} className="inline-block mr-2 mb-0.5" />
                      Different Address
                      <p className="text-[10px] font-bold mt-0.5 opacity-75">
                        Enter manually
                      </p>
                    </button>
                  </div>

                  {/* Scenario 1: Current location */}
                  {locationMode === "current" && (
                    <div>
                      {fetchingLocation ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/20 px-4 py-3">
                          <Loader2
                            size={16}
                            className="animate-spin text-emerald-600"
                          />
                          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                            Fetching your location…
                          </p>
                        </div>
                      ) : locationFetched && address ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/20 px-4 py-3">
                          <div className="flex items-start gap-2">
                            <CheckCircle2
                              size={16}
                              className="mt-0.5 flex-shrink-0 text-emerald-600"
                            />
                            <div className="flex-1">
                              <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-1">
                                Location Captured
                              </p>
                              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100 break-words">
                                {address}
                              </p>
                              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                The freelancer must be within 500m of this
                                location to mark arrival.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={fetchCurrentLocation}
                            className="mt-2 text-xs font-black text-emerald-700 dark:text-emerald-300 hover:underline"
                          >
                            Refresh location
                          </button>
                        </div>
                      ) : locationError ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/20 px-4 py-3">
                          <p className="text-sm font-bold text-red-700 dark:text-red-300">
                            {locationError}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Scenario 2: Manual address */}
                  {locationMode === "other" && (
                    <div>
                      <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                        Full Address <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-violet-500 dark:border-white/10 dark:bg-slate-900">
                        <MapPin
                          size={18}
                          className="mt-0.5 flex-shrink-0 text-slate-400"
                        />
                        <textarea
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Door/flat no., street, area, landmark, city…"
                          rows={3}
                          className="w-full resize-none bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                          required
                        />
                      </div>
                      <p className="mt-1.5 text-xs font-bold text-slate-400">
                        💡 For manual addresses, the freelancer won't have GPS
                        verification — please share the address clearly.
                      </p>
                    </div>
                  )}
                </>
              )}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                  {error}
                </div>
              )}

              {isDigital && (!user?.phone || !user.phone.trim()) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-500/20 dark:bg-amber-500/10 mb-4">
                  <p className="text-sm font-black text-amber-900 dark:text-amber-100">
                    Mobile Number Required
                  </p>
                  <p className="mt-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                    Please update your profile with a valid mobile number before
                    making a payment.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/client/profile")}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-black text-white hover:bg-amber-700"
                  >
                    Update Profile
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full rounded-2xl px-5 py-4 text-sm font-black text-white shadow-sm transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${isDigital ? "bg-violet-600 hover:bg-violet-700" : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900"}`}
              >
                {submitting ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={18} />
                    {paymentPhase === "creating"
                      ? "Creating booking…"
                      : paymentPhase === "paying"
                        ? "Opening payment…"
                        : "Verifying payment…"}
                  </span>
                ) : isDigital ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <CreditCard size={18} />
                    Pay ₹{agreedAmount.toLocaleString("en-IN")} & Confirm
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} /> Confirm — Pay at Location
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Sidebar — freelancer summary */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
                {loadingFreelancer ? (
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <Loader2 className="animate-spin" size={16} /> Loading…
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                          Freelancer
                        </p>
                        <h3 className="mt-1 truncate text-lg font-black text-slate-900 dark:text-white">
                          {fName}
                        </h3>
                        <p className="mt-0.5 truncate text-sm font-bold text-slate-500 dark:text-slate-400">
                          {fTitle}
                        </p>
                      </div>
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-900 font-black text-white dark:bg-white dark:text-slate-900">
                        {(fName || "F").slice(0, 1).toUpperCase()}
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {fCity && (
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                          <MapPin size={14} className="text-slate-400" />
                          {fCity}
                        </div>
                      )}
                      {typeof fRating === "number" && (
                        <div className="flex items-center gap-2">
                          <Star
                            size={14}
                            className="text-amber-500"
                            fill="currentColor"
                          />
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            {fRating.toFixed(1)}
                          </span>
                          <span className="text-sm font-bold text-slate-500">
                            ({fReviews} reviews)
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                        <BadgeCheck size={14} className="text-blue-500" />{" "}
                        Verified Freelancer
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
