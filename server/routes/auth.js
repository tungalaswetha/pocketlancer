// server/routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Freelancer from "../models/Freelancer.js";
import { protect } from "../middleware/auth.js";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../utils/emailUtils.js";
import { sendPasswordReset } from "../services/notificationService.js";

const router = express.Router();
console.log("✅ auth routes loaded");

// ── Helpers ────────────────────────────────────────────────────────

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

/**
 * Cookie options are extracted into a constant so that
 * sendAuthCookie and clearAuthCookie ALWAYS use the same spec.
 *
 * ⚠️  ROOT CAUSE OF LOGOUT BUG:
 * Express's res.clearCookie() only deletes a cookie if the options
 * (secure, sameSite, path, domain) exactly match how it was SET.
 * Previously clearCookie("token") used default options while the
 * cookie was set with secure+sameSite — the browser treated them
 * as different cookies and never deleted it. That left the JWT
 * alive, so /auth/check-session kept returning a valid user, and
 * the login page guard redirected straight back to /dashboard.
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
};

const sendAuthCookie = (res, token) =>
  res.cookie("token", token, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

// ✅ Uses identical options — browser now correctly matches and deletes the cookie
const clearAuthCookie = (res) => res.clearCookie("token", COOKIE_OPTIONS);

/**
 * Single source of truth for the user shape sent to the client.
 */
const serialize = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone || "",
  role: u.role,
  avatar: u.avatar || "",
  honorScore: typeof u.honorScore === "number" ? u.honorScore : 100,
  username: u.username || null,
});

/* ── Username generator ────────────────────────────────────────── */
async function generateUsername(name) {
  // "Dedeep Reddy" → "dedeep-reddy"
  let base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 30);

  let candidate = base;
  let counter = 0;

  while (await User.exists({ username: candidate })) {
    counter++;
    candidate = `${base}-${counter}`;
  }

  return candidate;
}

// ── 1. REGISTER ────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ msg: "All fields are required" });

    if (await User.exists({ email }))
      return res.status(400).json({ msg: "User already exists" });

    const user = new User({
      name,
      email,
      password,
      role: role === "freelancer" ? "freelancer" : "client",
    });
    // Generate SEO-friendly username from name
    user.username = await generateUsername(name);
    await user.save();

    if (
      user.role === "freelancer" &&
      !(await Freelancer.exists({ user: user._id }))
    ) {
      await Freelancer.create({
        user: user._id,
        name: user.name,
        email: user.email,
        profilePic: "",
        rating: 0,
        ratingCount: 0,
      });
    }

    return res
      .status(201)
      .json({ success: true, msg: "Registration successful" });
  } catch (err) {
    console.error("❌ REGISTER ERROR:", err);
    return res.status(500).json({ msg: "Server error during registration" });
  }
});

// ── 2. LOGIN ───────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ msg: "Email and password are required" });

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ msg: "Invalid credentials" });

    sendAuthCookie(res, generateToken(user));
    return res.json({ success: true, user: serialize(user) });
  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    return res.status(500).json({ msg: "Server error during login" });
  }
});

// ── 3a. GET /me ────────────────────────────────────────────────────
router.get("/me", protect, (req, res) => {
  res.json({ loggedIn: true, user: serialize(req.user) });
});

// ── 3b. GET /check-session (alias used by UserContext) ─────────────
router.get("/check-session", protect, (req, res) => {
  res.json({ loggedIn: true, user: serialize(req.user) });
});

// ── 4. LOGOUT ──────────────────────────────────────────────────────
// ✅ FIXED: clearAuthCookie uses identical options to sendAuthCookie
// so the browser correctly deletes the JWT cookie instead of ignoring it.
router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, msg: "Logged out successfully" });
});

// ── 5. SWITCH ROLE ─────────────────────────────────────────────────
router.post("/switch-role", protect, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["client", "freelancer"].includes(role))
      return res.status(400).json({ msg: "Invalid role" });

    req.user.role = role;
    await req.user.save();

    sendAuthCookie(res, generateToken(req.user));
    return res.json({ success: true, user: serialize(req.user) });
  } catch (err) {
    console.error("❌ SWITCH ROLE ERROR:", err);
    res.status(500).json({ msg: "Failed to switch role" });
  }
});

// ── 6. FORGOT PASSWORD ─────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.json({
        success: true,
        msg: "If email exists, reset link sent.",
      });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    await sendPasswordResetEmail(
      user.email,
      `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`,
    );
    return res.json({
      success: true,
      msg: "If email exists, reset link sent.",
    });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

// ── 7. RESET PASSWORD ──────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  try {
    if (!token || !password)
      return res.status(400).json({ msg: "Token and password required." });

    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: Date.now() },
    }).select("+password");

    if (!user)
      return res.status(400).json({ msg: "Invalid or expired token." });

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    await sendPasswordReset(user._id);
    return res.json({ success: true, msg: "Password reset successful." });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

export default router;
