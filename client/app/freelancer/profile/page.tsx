"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";
import {
  Camera,
  MapPin,
  Star,
  BadgeCheck,
  Plus,
  Trash2,
  Loader2,
  X,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Info,
  Globe,
  Zap,
  IndianRupee,
  Layers,
  CheckCircle2,
  ArrowLeft,
  Link as LinkIcon,
  TrendingUp,
  Eye,
  Save,
  Landmark,
} from "lucide-react";
import { getCurrentLocation, reverseGeocode } from "@/utils/geolocation";
import PortfolioManager from "@/components/PortfolioManager";
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
  title: string;
  description: string;
  amount: number;
  order: number;
};
type BankDetails = {
  accountHolder: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  upiId: string;
};
type Profile = {
  _id?: string;
  name?: string;
  category: "field" | "digital";
  title: string;
  bio: string;
  skills: string[];
  hourlyRate: number;
  fixedPrice: number;
  advanceAmount: number;
  pricingType: "hourly" | "fixed" | "milestone";
  milestones: Milestone[];
  latitude: number | null;
  longitude: number | null;
  city: string;
  country: string;
  profilePic?: string;
  portfolio?: string[];
  pastWorks?: PastWork[];
  bankDetails?: BankDetails;
  dateOfBirth?: string;
  phone?: string;
  isVisible?: boolean;
  username?: string | null;
};
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
const FIELD =
  "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-white w-full";
const CARD =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950";
export default function FreelancerProfilePage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [uploadingPic, setUploadingPic] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "fetching" | "ready" | "error"
  >("idle");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const ratingSummary = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0 };
    const avg =
      reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length;
    return { avg: Number(avg.toFixed(1)), count: reviews.length };
  }, [reviews]);
  useEffect(() => {
    if (!loading && (!user || user.role !== "freelancer"))
      router.replace("/dashboard");
  }, [loading, user, router]);
  useEffect(() => {
    if (user?.role !== "freelancer") return;
    api
      .get("/freelancers/me")
      .then((res) => {
        const loaded = res.data.profile;
        setProfile({
          ...loaded,
          category: loaded?.category || "field",
          pricingType: loaded?.pricingType || "hourly",
          fixedPrice: loaded?.fixedPrice || 0,
          advanceAmount: loaded?.advanceAmount || 0,
          milestones: loaded?.milestones || [],
          name: loaded?.name || user?.name || "Freelancer",
          portfolio: loaded?.portfolio || [],
          pastWorks: loaded?.pastWorks || [],
          bankDetails: loaded?.bankDetails || {
            accountHolder: "",
            accountNumber: "",
            ifscCode: "",
            bankName: "",
            upiId: "",
          },
          profilePic: loaded?.profilePic || "",
          dateOfBirth: loaded?.dateOfBirth
            ? new Date(loaded.dateOfBirth).toISOString().split("T")[0]
            : "",
          phone: loaded?.user?.phone || user?.phone || "",
        });
        const toggleVisibility = async () => {
          if (!profile) return;
          const newVal = !profile.isVisible;
          setProfile((p) => (p ? { ...p, isVisible: newVal } : p));
          try {
            await api.put("/freelancers/me", { ...profile, isVisible: newVal });
          } catch {
            setProfile((p) => (p ? { ...p, isVisible: !newVal } : p));
          }
        };

        const hasCoords = loaded?.latitude != null && loaded?.longitude != null;
        setLocationStatus(hasCoords ? "ready" : "idle");
      })
      .catch(() =>
        setProfile({
          name: user?.name || "Freelancer",
          title: "",
          bio: "",
          skills: [],
          hourlyRate: 0,
          fixedPrice: 0,
          pricingType: "hourly",
          milestones: [],
          latitude: null,
          longitude: null,
          city: "",
          country: "",
          profilePic: "",
          portfolio: [],
          pastWorks: [],
          category: "field",
          advanceAmount: 0,
          bankDetails: {
            accountHolder: "",
            accountNumber: "",
            ifscCode: "",
            bankName: "",
            upiId: "",
          },
          dateOfBirth: "",
          phone: user?.phone || "",
        }),
      );
  }, [user]);
  useEffect(() => {
    if (!profile?._id) return;
    setLoadingReviews(true);
    api
      .get(`/reviews/freelancer/${profile._id}`)
      .then((r) => setReviews(r.data?.data || []))
      .catch(() => setReviews([]))
      .finally(() => setLoadingReviews(false));
  }, [profile?._id]);
  const uploadProfilePic = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("Profile picture must be smaller than 5MB.");
      return;
    }

    try {
      setUploadingPic(true);
      const form = new FormData();
      form.append("image", file);
      const res = await api.post("/uploads/profile-pic", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfile((prev) =>
        prev ? { ...prev, profilePic: res.data.profilePic } : prev,
      );
    } catch (err: any) {
      alert(err?.response?.data?.msg || "Upload failed");
    } finally {
      setUploadingPic(false);
    }
  };
  const removeProfilePic = async () => {
    try {
      setUploadingPic(true);
      await api.delete("/uploads/profile-pic");
      setProfile((prev) => (prev ? { ...prev, profilePic: "" } : prev));
    } catch (err: any) {
      alert(err?.response?.data?.msg || "Remove failed");
    } finally {
      setUploadingPic(false);
    }
  };
  const addSkill = () => {
    const skill = skillInput.trim();
    if (!skill) return;
    setProfile((prev) => {
      if (!prev) return prev;
      if (
        (prev.skills || [])
          .map((s) => s.toLowerCase())
          .includes(skill.toLowerCase())
      )
        return prev;
      return { ...prev, skills: [...(prev.skills || []), skill] };
    });
    setSkillInput("");
  };
  const removeSkill = (idx: number) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const updated = [...(prev.skills || [])];
      updated.splice(idx, 1);
      return { ...prev, skills: updated };
    });
  };
  const fetchLocation = async () => {
    try {
      setLocationStatus("fetching");
      setError("");
      const { latitude, longitude } = await getCurrentLocation();
      setProfile((prev) => (prev ? { ...prev, latitude, longitude } : prev));
      try {
        const { city, country } = await reverseGeocode(latitude, longitude);
        setProfile((prev) => (prev ? { ...prev, city, country } : prev));
      } catch {}
      setLocationStatus("ready");
    } catch {
      setLocationStatus("error");
      setError(
        "Unable to fetch location. Please allow location access and retry.",
      );
    }
  };
  const saveProfile = async () => {
    if (!profile) return;
    if (
      profile.category === "field" &&
      (profile.latitude == null || profile.longitude == null)
    ) {
      setError("Please enable location access before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.put("/freelancers/me", profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  const addPastWork = () =>
    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pastWorks: [
          { title: "", description: "", link: "", year: "" },
          ...(prev.pastWorks || []),
        ],
      };
    });
  const removePastWork = (idx: number) =>
    setProfile((prev) => {
      if (!prev) return prev;
      const works = [...(prev.pastWorks || [])];
      works.splice(idx, 1);
      return { ...prev, pastWorks: works };
    });
  const addMilestone = () =>
    setProfile((prev) => {
      if (!prev) return prev;
      const ms = [...(prev.milestones || [])];
      ms.push({ title: "", description: "", amount: 0, order: ms.length });
      return { ...prev, milestones: ms };
    });
  const removeMilestone = (idx: number) =>
    setProfile((prev) => {
      if (!prev) return prev;
      const ms = [...(prev.milestones || [])];
      ms.splice(idx, 1);
      return { ...prev, milestones: ms.map((m, i) => ({ ...m, order: i })) };
    });
  const updateMilestone = (idx: number, key: keyof Milestone, val: any) =>
    setProfile((prev) => {
      if (!prev) return prev;
      const ms = [...(prev.milestones || [])];
      ms[idx] = { ...ms[idx], [key]: val };
      return { ...prev, milestones: ms };
    });
  const suggestedSkills = useMemo(() => {
    const bag = new Set<string>([
      "Punctuality",
      "Professionalism",
      "Customer Support",
      "Problem Solving",
      "Time Management",
    ]);
    const title = (profile?.title || "").toLowerCase();
    if (profile?.category === "digital") {
      [
        "React",
        "Next.js",
        "Node.js",
        "TypeScript",
        "UI/UX",
        "Figma",
        "SEO",
        "Adobe Premiere",
        "After Effects",
        "Photoshop",
        "Video Editing",
        "Content Writing",
      ].forEach((s) => bag.add(s));
    } else {
      if (title.includes("electric"))
        [
          "Wiring",
          "Switch Board Repair",
          "Fan Installation",
          "Electrical Troubleshooting",
        ].forEach((s) => bag.add(s));
      if (title.includes("plumb"))
        ["Pipe Fixing", "Leak Repair", "Tap Repair", "Drain Cleaning"].forEach(
          (s) => bag.add(s),
        );
      if (title.includes("ac") || title.includes("air"))
        [
          "AC Installation",
          "AC Servicing",
          "Gas Refill",
          "Split AC Repair",
        ].forEach((s) => bag.add(s));
      if (title.includes("carpent"))
        ["Furniture Repair", "Door Installation", "Wood Polishing"].forEach(
          (s) => bag.add(s),
        );
      if (title.includes("clean"))
        ["Home Cleaning", "Kitchen Cleaning", "Bathroom Cleaning"].forEach(
          (s) => bag.add(s),
        );
    }
    const current = new Set(
      (profile?.skills || []).map((s) => s.toLowerCase()),
    );
    return Array.from(bag)
      .filter((s) => !current.has(s.toLowerCase()))
      .slice(0, 10);
  }, [profile?.title, profile?.skills, profile?.category]);
  if (loading || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
        <Loader2 className="animate-spin" />{" "}
        <span className="font-black">Loading profile…</span>
      </div>
    );
  }
  const toggleVisibility = async () => {
    if (!profile) return;
    const newVal = !profile.isVisible;
    setProfile((p) => (p ? { ...p, isVisible: newVal } : p));
    try {
      await api.put("/freelancers/me", { ...profile, isVisible: newVal });
    } catch {
      setProfile((p) => (p ? { ...p, isVisible: !newVal } : p));
    }
  };

  const hasCoords =
    profile.category === "digital" ||
    (profile.latitude != null && profile.longitude != null);
  const canSave = hasCoords;
  const completion = (() => {
    let s = 0;
    if (profile.profilePic) s += 15;
    if (profile.title?.trim()) s += 15;
    if (profile.bio?.trim() && profile.bio.trim().length >= 30) s += 15;
    if ((profile.skills?.length || 0) >= 5) s += 20;
    if (profile.category === "digital") s += 15;
    else if (hasCoords) s += 15;
    if ((profile.pastWorks?.length || 0) >= 2) s += 10;
    if (profile.hourlyRate > 0 || profile.fixedPrice > 0) s += 10;
    return clamp(s, 0, 100);
  })();
  return (
    <div className="w-full">
      {/* Saved toast */}
      {saved && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-xl">
          <CheckCircle2 size={18} /> Profile saved successfully!
        </div>
      )}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-44 -left-44 h-[32rem] w-[32rem] rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        {/* Header */}
        <div className="relative border-b border-slate-200 px-6 py-7 lg:px-10 lg:py-9 dark:border-white/10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                <Sparkles size={16} className="text-blue-500" /> Freelancer
                Profile
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
                Edit Your Profile
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">
                Complete profile · Stand out in search · Get more bookings
              </p>
              {user?.honorScore !== undefined && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-black ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                  <span className="text-slate-500 dark:text-slate-400">
                    Your Honor Score:
                  </span>
                  <span
                    className={`rounded-lg px-2 py-0.5 ${
                      user.honorScore < 35
                        ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200"
                        : user.honorScore < 75
                          ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-200"
                          : "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-200"
                    }`}
                  >
                    {user.honorScore} / 100
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push(`/freelancer/${profile._id}`)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white"
              >
                <Eye size={16} /> Preview Public Profile
              </button>
              {/* Visibility Toggle */}
              <button
                onClick={toggleVisibility}
                className={[
                  "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition border",
                  profile.isVisible !== false
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300",
                ].join(" ")}
              >
                <Eye size={16} />
                {profile.isVisible !== false
                  ? "Visible to clients"
                  : "Hidden from search"}
              </button>

              <button
                onClick={saveProfile}
                disabled={saving || !canSave}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Saving…
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Profile
                  </>
                )}
              </button>
            </div>
          </div>
          {/* Completion + rating */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                      Profile Completion
                    </p>
                    <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
                      {completion}%
                    </p>
                    <p className="text-sm font-bold text-slate-500">
                      Reach 80%+ to rank higher in search
                    </p>
                  </div>
                  {profile.category === "field" && !hasCoords ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-black text-red-700 ring-1 ring-red-500/20 dark:text-red-300">
                      <ShieldCheck size={14} /> Location Required
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                      <BadgeCheck size={14} /> Active
                    </span>
                  )}
                </div>
                <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                {/* Checklist */}
                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
                  {[
                    { label: "Profile photo", done: !!profile.profilePic },
                    {
                      label: "Professional title",
                      done: !!profile.title?.trim(),
                    },
                    {
                      label: "Bio (30+ chars)",
                      done: (profile.bio?.trim()?.length || 0) >= 30,
                    },
                    {
                      label: "5+ skills",
                      done: (profile.skills?.length || 0) >= 5,
                    },
                    { label: "Location", done: hasCoords },
                    {
                      label: "2+ past works",
                      done: (profile.pastWorks?.length || 0) >= 2,
                    },
                    {
                      label: "Pricing set",
                      done: profile.hourlyRate > 0 || profile.fixedPrice > 0,
                    },
                  ].map(({ label, done }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${done ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400"}`}
                    >
                      {done ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300" />
                      )}
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Your Rating
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Star
                    size={22}
                    className="text-amber-500"
                    fill="currentColor"
                  />
                  <div>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {ratingSummary.avg}
                    </span>
                    <span className="ml-1 text-sm font-bold text-slate-500">
                      / 5.0
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {ratingSummary.count} reviews received
                </p>
                <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                  <TrendingUp size={16} className="text-slate-400" />
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {profile.pricingType === "hourly"
                      ? `₹${profile.hourlyRate || 0}/hr`
                      : profile.pricingType === "fixed"
                        ? `₹${profile.fixedPrice || 0} fixed`
                        : `₹${(profile.milestones || []).reduce((s, m) => s + m.amount, 0)} total`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Body */}
        <div className="relative grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-12 lg:px-10">
          {/* LEFT */}
          <div className="lg:col-span-8 space-y-6">
            {/* Identity */}
            <div className={CARD}>
              <h2 className="mb-5 text-base font-black text-slate-900 dark:text-white">
                Identity & Category
              </h2>
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="relative h-28 w-28 overflow-hidden rounded-3xl bg-slate-100 ring-1 ring-black/10 dark:bg-slate-900 dark:ring-white/10">
                    {profile.profilePic ? (
                      <img
                        src={profile.profilePic}
                        alt={profile.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "/default-avatar.png";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Camera className="text-slate-400" size={28} />
                      </div>
                    )}
                    {profile.profilePic && (
                      <button
                        onClick={removeProfilePic}
                        disabled={uploadingPic}
                        className="absolute left-1.5 top-1.5 rounded-xl bg-red-600 p-1.5 text-white shadow hover:bg-red-700 disabled:opacity-60"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <label className="absolute bottom-1.5 right-1.5 cursor-pointer rounded-xl bg-slate-900 p-1.5 text-white shadow hover:bg-slate-800 dark:bg-white dark:text-slate-900">
                      {uploadingPic ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <UploadCloud size={13} />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadProfilePic(f);
                        }}
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-center text-xs font-bold text-slate-400">
                    Profile photo
                  </p>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                      Professional Title
                    </label>
                    <input
                      className={FIELD}
                      placeholder="e.g. Full Stack Developer | React Expert"
                      value={profile.title}
                      onChange={(e) =>
                        setProfile({ ...profile, title: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                      Service Category
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["field", "digital"] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() =>
                            setProfile({ ...profile, category: cat })
                          }
                          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-all ${
                            profile.category === cat
                              ? cat === "digital"
                                ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                : "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
                          }`}
                        >
                          {cat === "digital" ? (
                            <Globe size={16} />
                          ) : (
                            <Zap size={16} />
                          )}
                          {cat === "digital"
                            ? "Digital Service"
                            : "Field Service"}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-500">
                      {profile.category === "digital"
                        ? "Remote work — clients pay via escrow. No location needed."
                        : "On-site work — you visit the client's location. Location required."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* Full Name */}
                Full Name *
                <input
                  type="text"
                  className={FIELD}
                  placeholder="e.g. Rahul Sharma"
                  value={profile.name || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                  required
                />
                Shown to clients in booking details and search results.
                {/* Phone Number */}
                Phone Number *
                <input
                  type="tel"
                  className={FIELD}
                  placeholder="e.g. 9876543210"
                  value={profile.phone || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                  required
                />
                {/* Date of Birth */}
                <div>
                  <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    className={FIELD}
                    value={profile.dateOfBirth || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, dateOfBirth: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            {/* Bio */}
            <div className={CARD}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Bio
                  </h3>
                  <p className="text-sm font-bold text-slate-500">
                    A great bio builds trust and improves bookings.
                  </p>
                </div>
                <span className="text-xs font-extrabold text-slate-400">
                  {profile.bio?.trim()?.length || 0}/500
                </span>
              </div>
              <textarea
                className={`${FIELD} mt-4 resize-none`}
                rows={6}
                maxLength={500}
                placeholder="Describe your expertise, years of experience, approach to work, and why clients should choose you…"
                value={profile.bio}
                onChange={(e) =>
                  setProfile({ ...profile, bio: e.target.value })
                }
              />
            </div>
            {/* Pricing */}
            <div className={CARD}>
              <h3 className="mb-1 text-base font-black text-slate-900 dark:text-white">
                Pricing
              </h3>
              <p className="mb-4 text-sm font-bold text-slate-500">
                {profile.category === "field"
                  ? "Field workers use hourly pricing — you'll negotiate final price on-site."
                  : "Choose how you charge digital clients."}
              </p>
              {profile.category === "digital" && (
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {(["hourly", "fixed", "milestone"] as const).map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() =>
                        setProfile({ ...profile, pricingType: pt })
                      }
                      className={`rounded-2xl border px-3 py-2.5 text-xs font-black transition-all ${profile.pricingType === pt ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"}`}
                    >
                      {pt === "hourly"
                        ? "⏱ Hourly"
                        : pt === "fixed"
                          ? "📦 Fixed Price"
                          : "🎯 Milestones"}
                    </button>
                  ))}
                </div>
              )}
              {(profile.category === "field" ||
                profile.pricingType === "hourly") && (
                <div>
                  <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    {profile.category === "field"
                      ? "Hourly Rate (₹/hr)"
                      : "Hourly Rate (₹/hr)"}
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
                    <IndianRupee size={16} className="text-slate-400" />
                    <input
                      type="number"
                      min={0}
                      value={profile.hourlyRate}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          hourlyRate: Number(e.target.value),
                        })
                      }
                      className="w-full bg-transparent text-sm font-black text-slate-900 outline-none dark:text-white"
                      placeholder="0"
                    />
                    <span className="text-xs font-extrabold text-slate-400">
                      /hr
                    </span>
                  </div>
                </div>
              )}
              {profile.category === "digital" &&
                profile.pricingType === "hourly" && (
                  <div className="mt-4">
                    <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                      Advance Amount (₹)
                    </label>
                    <p className="mb-2 text-xs font-bold text-slate-500">
                      Clients who don't know work duration will pay this amount
                      upfront. Set it to a reasonable deposit (e.g. 20–30% of a
                      typical project).
                    </p>
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
                      <IndianRupee size={16} className="text-slate-400" />
                      <input
                        type="number"
                        min={0}
                        value={profile.advanceAmount}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            advanceAmount: Number(e.target.value),
                          })
                        }
                        className="w-full bg-transparent text-sm font-black text-slate-900 outline-none dark:text-white"
                        placeholder="0"
                      />
                    </div>
                    <p className="mt-1.5 text-xs font-bold text-slate-500">
                      Clients who know the duration will pay hourly rate × hours
                      instead.
                    </p>
                  </div>
                )}
              {profile.category === "digital" &&
                profile.pricingType === "fixed" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                      Fixed Project Price (₹)
                    </label>
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
                      <IndianRupee size={16} className="text-slate-400" />
                      <input
                        type="number"
                        min={0}
                        value={profile.fixedPrice}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            fixedPrice: Number(e.target.value),
                          })
                        }
                        className="w-full bg-transparent text-sm font-black text-slate-900 outline-none dark:text-white"
                        placeholder="0"
                      />
                    </div>
                    <p className="mt-1.5 text-xs font-bold text-slate-500">
                      Client pays this amount upfront into escrow.
                    </p>
                  </div>
                )}
              {profile.category === "digital" &&
                profile.pricingType === "milestone" && (
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                          Milestones
                        </p>
                        <p className="text-xs font-bold text-slate-500">
                          Break the project into stages with separate payments.
                        </p>
                      </div>
                      <button
                        onClick={addMilestone}
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                      >
                        <Plus size={14} /> Add
                      </button>
                    </div>
                    {(profile.milestones || []).length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm font-bold text-slate-400 dark:border-white/20">
                        No milestones yet. Add your first milestone.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(profile.milestones || []).map((m, i) => (
                          <div
                            key={i}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900"
                          >
                            <div className="flex items-start gap-3">
                              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white dark:bg-white dark:text-slate-900">
                                {i + 1}
                              </span>
                              <div className="flex-1 space-y-2">
                                <input
                                  className={FIELD}
                                  placeholder="Milestone title (e.g. Design Mockup)"
                                  value={m.title}
                                  onChange={(e) =>
                                    updateMilestone(i, "title", e.target.value)
                                  }
                                />
                                <input
                                  className={FIELD}
                                  placeholder="Description (optional)"
                                  value={m.description}
                                  onChange={(e) =>
                                    updateMilestone(
                                      i,
                                      "description",
                                      e.target.value,
                                    )
                                  }
                                />
                                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-800">
                                  <IndianRupee
                                    size={14}
                                    className="text-slate-400"
                                  />
                                  <input
                                    type="number"
                                    min={0}
                                    placeholder="Amount (₹)"
                                    value={m.amount}
                                    onChange={(e) =>
                                      updateMilestone(
                                        i,
                                        "amount",
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none dark:text-white"
                                  />
                                </div>
                              </div>
                              <button
                                onClick={() => removeMilestone(i)}
                                className="rounded-xl bg-red-50 p-1.5 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-900">
                          <p className="text-sm font-black text-slate-900 dark:text-white">
                            Total: ₹
                            {(profile.milestones || [])
                              .reduce((s, m) => s + (m.amount || 0), 0)
                              .toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
            {/* Skills */}
            <div className={CARD}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Skills
                  </h3>
                  <p className="text-sm font-bold text-slate-500">
                    Add at least 5 for better visibility.
                  </p>
                </div>
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-700 dark:text-blue-300">
                  {profile.skills?.length || 0} added
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <input
                  className={`${FIELD} flex-1`}
                  placeholder="Type a skill and press Enter"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  <Plus size={18} />
                </button>
              </div>
              {suggestedSkills.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                    Suggested
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {suggestedSkills.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setSkillInput(s);
                          addSkill();
                        }}
                        className="rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-black text-blue-700 ring-1 ring-blue-500/20 hover:bg-blue-500/15 dark:text-blue-300"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {(profile.skills || []).map((s, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSkill(idx)}
                      className="rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-white/10"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
                {(profile.skills || []).length === 0 && (
                  <p className="text-sm font-bold text-slate-400">
                    No skills yet. Add some above.
                  </p>
                )}
              </div>
            </div>
            {/* Portfolio (digital) */}
            {profile.category === "digital" && <PortfolioManager />}
            {/* Past Works */}
            <div className={CARD}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Past Works
                  </h3>
                  <p className="text-sm font-bold text-slate-500">
                    Show proof of your experience.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addPastWork}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  <Plus size={14} /> Add Work
                </button>
              </div>
              {(profile.pastWorks || []).length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-400 dark:border-white/20">
                  Add at least 2 past works to improve your booking success
                  rate.
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {(profile.pastWorks || []).map((w, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-2">
                          <input
                            className={FIELD}
                            placeholder="Project title"
                            value={w.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProfile((prev) => {
                                if (!prev) return prev;
                                const ws = [...(prev.pastWorks || [])];
                                ws[idx] = { ...ws[idx], title: val };
                                return { ...prev, pastWorks: ws };
                              });
                            }}
                          />
                          <textarea
                            className={`${FIELD} resize-none`}
                            rows={3}
                            placeholder="What did you do? What was the outcome?"
                            value={w.description}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProfile((prev) => {
                                if (!prev) return prev;
                                const ws = [...(prev.pastWorks || [])];
                                ws[idx] = { ...ws[idx], description: val };
                                return { ...prev, pastWorks: ws };
                              });
                            }}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className={FIELD}
                              placeholder="Year (e.g. 2024)"
                              value={w.year || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setProfile((prev) => {
                                  if (!prev) return prev;
                                  const ws = [...(prev.pastWorks || [])];
                                  ws[idx] = { ...ws[idx], year: val };
                                  return { ...prev, pastWorks: ws };
                                });
                              }}
                            />
                            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-800">
                              <LinkIcon
                                size={14}
                                className="flex-shrink-0 text-slate-400"
                              />
                              <input
                                className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none dark:text-white"
                                placeholder="Link (optional)"
                                value={w.link || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProfile((prev) => {
                                    if (!prev) return prev;
                                    const ws = [...(prev.pastWorks || [])];
                                    ws[idx] = { ...ws[idx], link: val };
                                    return { ...prev, pastWorks: ws };
                                  });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePastWork(idx)}
                          className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Location (field workers only) */}
            {profile.category === "field" && (
              <div className={CARD}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Location (Required)
                    </h3>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      Required for field workers — clients find you by distance.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchLocation}
                    disabled={locationStatus === "fetching"}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {locationStatus === "fetching" ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />{" "}
                        Detecting…
                      </>
                    ) : (
                      <>
                        <MapPin size={16} />{" "}
                        {locationStatus === "ready" ? "Update" : "Enable"}
                      </>
                    )}
                  </button>
                </div>
                {locationStatus === "ready" || hasCoords ? (
                  <div className="mt-4 rounded-2xl bg-emerald-500/10 px-4 py-3 ring-1 ring-emerald-500/20">
                    <p className="text-sm font-black text-emerald-800 dark:text-emerald-200">
                      📍 {profile.city || "Location detected"}
                      {profile.country ? `, ${profile.country}` : ""}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-900">
                    <p className="text-sm font-bold text-slate-500">
                      {locationStatus === "error"
                        ? "❌ Location access denied. Please allow it in browser settings."
                        : "Location not set yet."}
                    </p>
                  </div>
                )}
              </div>
            )}
            {/* Bank Details (Digital only) */}
            {profile.category === "digital" && (
              <div className={CARD}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      <Landmark
                        size={18}
                        className="inline mr-2 text-blue-500"
                      />
                      Bank Account Details
                    </h3>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      Required for receiving payment settlements. Your details
                      are encrypted and secure.
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                      Account Holder Name
                    </label>
                    <input
                      className={FIELD}
                      placeholder="As it appears on your bank account"
                      value={profile.bankDetails?.accountHolder || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          bankDetails: {
                            ...profile.bankDetails!,
                            accountHolder: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                      Bank Name
                    </label>
                    <input
                      className={FIELD}
                      placeholder="e.g. State Bank of India"
                      value={profile.bankDetails?.bankName || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          bankDetails: {
                            ...profile.bankDetails!,
                            bankName: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                      Account Number
                    </label>
                    <input
                      className={FIELD}
                      placeholder="e.g. 1234567890123456"
                      value={profile.bankDetails?.accountNumber || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          bankDetails: {
                            ...profile.bankDetails!,
                            accountNumber: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                      IFSC Code
                    </label>
                    <input
                      className={FIELD}
                      placeholder="e.g. SBIN0001234"
                      value={profile.bankDetails?.ifscCode || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          bankDetails: {
                            ...profile.bankDetails!,
                            ifscCode: e.target.value.toUpperCase(),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                      UPI ID (Optional)
                    </label>
                    <input
                      className={FIELD}
                      placeholder="e.g. yourname@upi"
                      value={profile.bankDetails?.upiId || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          bankDetails: {
                            ...profile.bankDetails!,
                            upiId: e.target.value,
                          },
                        })
                      }
                    />
                    <p className="mt-1.5 text-xs font-bold text-slate-500">
                      Providing UPI enables faster settlements directly to your
                      UPI-linked account.
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-blue-500/10 px-4 py-3 ring-1 ring-blue-500/20">
                  <p className="text-xs font-black text-blue-700 dark:text-blue-300">
                    🔒 Your bank details are stored securely and only used for
                    payment settlements after completed bookings.
                  </p>
                </div>
              </div>
            )}
            {/* Error */}
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
            )}
            {/* Save (bottom) */}
            <button
              onClick={saveProfile}
              disabled={saving || !canSave}
              className="w-full rounded-2xl bg-slate-900 px-5 py-4 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
            >
              {saving ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} /> Saving…
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <Save size={18} /> Save Profile
                </span>
              )}
            </button>
          </div>
          {/* RIGHT: Reviews & tips */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              {/* Reviews */}
              <div className={CARD}>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Reviews
                  </h3>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-500/20 dark:text-amber-200">
                    <Star size={12} fill="currentColor" /> {ratingSummary.avg} (
                    {ratingSummary.count})
                  </div>
                </div>
                {loadingReviews ? (
                  <div className="mt-4 flex items-center gap-2 text-slate-500">
                    <Loader2 className="animate-spin" size={16} /> Loading…
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm font-bold text-slate-400 dark:border-white/10 dark:bg-slate-900">
                    No reviews yet. Complete bookings to get reviews.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3 max-h-80 overflow-y-auto">
                    {reviews.slice(0, 10).map((r) => (
                      <div
                        key={r._id}
                        className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                            {r.clientName || "Anonymous"}
                          </p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-black text-amber-800 dark:text-amber-200">
                            <Star size={11} fill="currentColor" /> {r.rating}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs font-bold text-slate-500 line-clamp-3">
                          {r.comment || "No comment"}
                        </p>
                        <p className="mt-2 text-xs font-extrabold text-slate-400">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Share URL card — shown if username exists */}
              {user?.username && (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Your Profile URL
                  </p>
                  <p className="mt-2 break-all rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-blue-700 dark:bg-slate-900 dark:text-blue-300">
                    pocketlancer.com/f/{user.username}
                  </p>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/f/${user.username}`;
                      navigator.clipboard.writeText(url);
                    }}
                    className="mt-3 w-full rounded-2xl border border-slate-200 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 transition"
                  >
                    Copy link
                  </button>
                </div>
              )}

              {/* Tips */}
              <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm dark:bg-white dark:text-slate-900">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-2xl bg-white/10 p-2 dark:bg-slate-900/10">
                    <Info size={16} />
                  </div>
                  <div>
                    <p className="font-black">Profile tips</p>
                    <ul className="mt-2 space-y-1 text-xs font-bold opacity-90">
                      {profile.category === "field"
                        ? [
                            "Enable location to appear in search",
                            "Add 5+ skills for better ranking",
                            "Add 2+ past works with descriptions",
                            "Keep bio above 60 characters",
                            "Upload a clear profile photo",
                          ]
                        : [
                            "Add 5+ skills to appear in searches",
                            "Set pricing clearly (fixed or milestones)",
                            "Upload 3+ portfolio projects",
                            "Add 2+ past works with links",
                            "Write a detailed bio (100+ chars)",
                          ].map((tip) => <li key={tip}>• {tip}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
