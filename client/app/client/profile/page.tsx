"use client";
import { useEffect, useState } from "react";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";
import {
  Loader2,
  UploadCloud,
  Shield,
  User2,
  Phone,
  MapPin,
  Bell,
  CheckCircle2,
  Camera,
  Trash2,
  Save,
  Sparkles,
  Eye,
  EyeOff,
  CalendarDays,
} from "lucide-react";
const FIELD =
  "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-white w-full";
const CARD =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950";
export default function ClientProfilePage() {
  const { user: authUser } = useUser();
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [dob, setDob] = useState("");
  const [current, setCurrent] = useState("");
  const [nextPass, setNextPass] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api.get("/profile").then((res) => {
      setUser(res.data);
      setName(res.data.name || "");
      setEmail(res.data.email || "");
      setPhone(res.data.phone || "");
      setAddress(res.data.address || "");
      setCity(res.data.city || "");
      setState(res.data.state || "");
      setPincode(res.data.pincode || "");
      setDob(
        res.data.dateOfBirth
          ? new Date(res.data.dateOfBirth).toISOString().split("T")[0]
          : "",
      );
      if (res.data.emailNotifications !== undefined)
        setEmailNotif(res.data.emailNotifications);
      if (res.data.smsNotifications !== undefined)
        setSmsNotif(res.data.smsNotifications);
    });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);
  const saveProfile = async () => {
    setLoading(true);
    try {
      await api.patch("/profile", {
        name,
        email,
        phone,
        dateOfBirth: dob || null,
        address,
        city,
        state,
        pincode,
        emailNotifications: emailNotif,
        smsNotifications: smsNotif,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setToast("Profile updated");
    } catch {
      setToast("Failed to update profile");
    }
    setLoading(false);
  };
  const changePassword = async () => {
    if (!current || !nextPass) {
      setToast("Fill both password fields");
      return;
    }
    if (nextPass.length < 6) {
      setToast("New password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await api.patch("/profile/password", {
        currentPassword: current,
        newPassword: nextPass,
      });
      setCurrent("");
      setNextPass("");
      setToast("Password updated");
    } catch (e: any) {
      setToast(e.response?.data?.msg || "Failed to update password");
    }
    setLoading(false);
  };
  const uploadAvatar = async () => {
    if (!file) return;
    const form = new FormData();
    form.append("image", file);
    setLoading(true);
    try {
      const res = await api.post("/profile/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser((u: any) => ({ ...u, avatar: res.data.avatar }));
      setFile(null);
      setPreview(null);
      setToast("Profile photo updated");
    } catch {
      setToast("Upload failed");
    }
    setLoading(false);
  };
  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
        <Loader2 className="animate-spin" />
        <span className="font-black">Loading profile…</span>
      </div>
    );
  }
  const avatarSrc =
    preview ||
    user.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f172a&color=fff&bold=true`;
  const completion = (() => {
    let s = 0;
    if (user.avatar) s += 20;
    if (name?.trim()) s += 20;
    if (email?.trim()) s += 20;
    if (phone?.trim()) s += 15;
    if (city?.trim()) s += 15;
    if (address?.trim()) s += 10;
    return Math.min(s, 100);
  })();
  return (
    <div className="w-full">
      {/* Saved toast */}
      {saved && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-xl">
          <CheckCircle2 size={18} /> Profile saved successfully!
        </div>
      )}
      {toast && !saved && (
        <div className="fixed top-6 right-6 z-50 rounded-2xl bg-slate-900 px-5 py-3 text-sm text-white font-extrabold shadow-lg dark:bg-white dark:text-slate-900">
          {toast}
        </div>
      )}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-44 -left-44 h-[32rem] w-[32rem] rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        {/* Header */}
        <div className="relative border-b border-slate-200 px-6 py-7 lg:px-10 lg:py-9 dark:border-white/10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                <Sparkles size={16} className="text-violet-500" /> Client
                Profile
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
                My Profile
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                Manage your identity, security, and personal information
              </p>
            </div>
            <button
              onClick={saveProfile}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Saving…
                </>
              ) : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </button>
          </div>
          {/* Completion bar */}
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Profile Completion
                </p>
                <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
                  {completion}%
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${
                  completion >= 80
                    ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300"
                    : "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300"
                }`}
              >
                <CheckCircle2 size={14} />
                {completion >= 80 ? "Complete" : "Incomplete"}
              </span>
            </div>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-700"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </div>
        {/* Body */}
        <div className="relative grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-12 lg:px-10">
          {/* LEFT Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Avatar Card */}
            <div className={CARD}>
              <h2 className="mb-5 text-base font-black text-slate-900 dark:text-white">
                Profile Photo
              </h2>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative h-28 w-28 overflow-hidden rounded-3xl bg-slate-100 ring-1 ring-black/10 dark:bg-slate-900 dark:ring-white/10">
                  <img
                    src={avatarSrc}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                  <label className="absolute bottom-1.5 right-1.5 cursor-pointer rounded-xl bg-slate-900 p-1.5 text-white shadow hover:bg-slate-800 dark:bg-white dark:text-slate-900">
                    {loading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Camera size={13} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setFile(f);
                        setPreview(f ? URL.createObjectURL(f) : null);
                      }}
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-500">
                    Upload a clear, professional photo. Max 2MB.
                  </p>
                  <button
                    onClick={uploadAvatar}
                    disabled={!file || loading}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-5 py-2.5 text-sm font-black hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:text-slate-900"
                  >
                    <UploadCloud size={16} />
                    {file ? "Upload Selected Photo" : "No file selected"}
                  </button>
                </div>
              </div>
            </div>
            {/* Account Info Card */}
            <div className={CARD}>
              <div className="flex items-center gap-3 mb-5">
                <User2 size={20} className="text-slate-400" />
                <h2 className="font-black text-base text-slate-900 dark:text-white">
                  Account Information
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    Full Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={FIELD}
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    Email Address
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={FIELD}
                    placeholder="you@example.com"
                    type="email"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    Phone Number
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
                    <Phone size={16} className="text-slate-400" />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none dark:text-white"
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    Date of Birth
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
                    <CalendarDays size={16} className="text-slate-400" />
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Address Card */}
            <div className={CARD}>
              <div className="flex items-center gap-3 mb-5">
                <MapPin size={20} className="text-slate-400" />
                <h2 className="font-black text-base text-slate-900 dark:text-white">
                  Address
                </h2>
              </div>
              <p className="text-sm font-bold text-slate-500 mb-4">
                Your address is used for field service bookings and invoices.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    Street Address
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={`${FIELD} resize-none`}
                    rows={2}
                    placeholder="Door no., street, area, landmark…"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                      City
                    </label>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={FIELD}
                      placeholder="e.g. Hyderabad"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                      State
                    </label>
                    <input
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className={FIELD}
                      placeholder="e.g. Telangana"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                      Pincode
                    </label>
                    <input
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className={FIELD}
                      placeholder="e.g. 500001"
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Security Card */}
            <div className={CARD}>
              <div className="flex items-center gap-3 mb-5">
                <Shield size={20} className="text-slate-400" />
                <h2 className="font-black text-base text-slate-900 dark:text-white">
                  Security
                </h2>
              </div>
              <p className="text-sm font-bold text-slate-500 mb-4">
                Change your password. Use at least 6 characters with a mix of
                letters and numbers.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    Current Password
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
                    <input
                      type={showCurrent ? "text" : "password"}
                      placeholder="••••••••"
                      value={current}
                      onChange={(e) => setCurrent(e.target.value)}
                      className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((s) => !s)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    New Password
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
                    <input
                      type={showNext ? "text" : "password"}
                      placeholder="••••••••"
                      value={nextPass}
                      onChange={(e) => setNextPass(e.target.value)}
                      className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNext((s) => !s)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {showNext ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={changePassword}
                disabled={!current || !nextPass || loading}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-red-600 text-white px-6 py-3 text-sm font-black hover:bg-red-700 disabled:opacity-40"
              >
                <Shield size={16} /> Update Password
              </button>
            </div>
            {/* Save bottom */}
            <button
              onClick={saveProfile}
              disabled={loading}
              className="w-full rounded-2xl bg-slate-900 px-5 py-4 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} /> Saving…
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <Save size={18} /> Save All Changes
                </span>
              )}
            </button>
          </div>
          {/* RIGHT Column — Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              {/* Notifications */}
              <div className={CARD}>
                <div className="flex items-center gap-3 mb-4">
                  <Bell size={20} className="text-slate-400" />
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    Notifications
                  </h3>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        Email Notifications
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        Booking updates, messages, promotions
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailNotif((v) => !v)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${emailNotif ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${emailNotif ? "translate-x-5" : ""}`}
                      />
                    </button>
                  </label>
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        SMS Notifications
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        Booking confirmations via SMS
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSmsNotif((v) => !v)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${smsNotif ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${smsNotif ? "translate-x-5" : ""}`}
                      />
                    </button>
                  </label>
                </div>
              </div>
              {/* Account Tips */}
              <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm dark:bg-white dark:text-slate-900">
                <p className="font-black">💡 Profile Tips</p>
                <ul className="mt-3 space-y-1.5 text-xs font-bold opacity-90">
                  <li>• Add a clear profile photo for trust</li>
                  <li>• Add your phone number for booking confirmations</li>
                  <li>• Keep your address updated for field services</li>
                  <li>• Use a strong, unique password</li>
                  <li>• Enable email notifications to never miss updates</li>
                </ul>
              </div>
              {/* Account Info */}
              <div className={CARD}>
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Account
                </p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-500">Role</span>
                    <span className="font-black text-slate-900 dark:text-white capitalize">
                      {authUser?.role || "Client"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-500">
                      Member since
                    </span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
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
