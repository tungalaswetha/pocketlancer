// server/routes/freelancers.js
import express from "express";
import mongoose from "mongoose";
import Freelancer from "../models/Freelancer.js";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

/* =====================================================
   UTILS
   ===================================================== */

function isValidCoordinates(latitude, longitude) {
  if (typeof latitude !== "number" || typeof longitude !== "number")
    return false;
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  if (latitude === 0 && longitude === 0) return false;
  return true;
}

function getSearchVariants(word) {
  const w = word.toLowerCase().trim();
  if (!w) return [];
  const variants = new Set([w]);
  const suffixes = [
    "ician",
    "ation",
    "ting",
    "ling",
    "ing",
    "tion",
    "sion",
    "ness",
    "ment",
    "ance",
    "ence",
    "ity",
    "ive",
    "ical",
    "al",
    "er",
    "or",
    "eur",
    "ist",
    "ian",
    "ed",
    "ly",
    "ry",
    "ery",
  ];
  for (const suffix of suffixes) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
      variants.add(w.slice(0, w.length - suffix.length));
    }
  }
  return Array.from(variants);
}

function buildSkillQuery(skillsText) {
  const keywords = skillsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const orClauses = [];
  for (const keyword of keywords) {
    for (const variant of getSearchVariants(keyword)) {
      const regexStr = variant.length <= 4 ? `^${variant}` : variant;
      const regex = { $regex: regexStr, $options: "i" };
      orClauses.push(
        { skills: { $elemMatch: regex } },
        { title: regex },
        { bio: regex },
      );
    }
  }
  return orClauses.length ? { $or: orClauses } : {};
}

/**
 * isUnavailableOn — checks if a YYYY-MM-DD date falls inside
 * any unavailableRange on a freelancer document.
 */
function isUnavailableOn(freelancer, dateStr) {
  if (!freelancer.unavailableRanges?.length) return false;
  for (const r of freelancer.unavailableRanges) {
    if (dateStr >= r.start && dateStr <= r.end) return true;
  }
  return false;
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* =====================================================
   FREELANCER SELF PROFILE  (GET + PUT /me)
   ===================================================== */

router.get("/me", protect, authorize("freelancer"), async (req, res) => {
  try {
    let profile = await Freelancer.findOne({ user: req.user._id });
    if (!profile) {
      profile = await Freelancer.create({
        user: req.user._id,
        title: "",
        bio: "",
        skills: [],
        profilePic: "",
        hourlyRate: 0,
        advanceAmount: 0,
        city: "",
        country: "",
        category: "field",
        isVisible: true,
      });
    }
    return res.json({ success: true, profile });
  } catch (err) {
    console.error("❌ GET /me ERROR:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

router.put("/me", protect, authorize("freelancer"), async (req, res) => {
  try {
    const {
      title,
      bio,
      skills,
      hourlyRate,
      fixedPrice,
      advanceAmount,
      pricingType,
      milestones,
      latitude,
      longitude,
      city,
      country,
      profilePic,
      portfolio,
      pastWorks,
      category,
      bankDetails,
      dateOfBirth,
      phone,
      isVisible,
    } = req.body;

    if (category && !["field", "digital"].includes(category))
      return res.status(400).json({ msg: "Invalid category" });

    if (
      (category === "field" || !category) &&
      !isValidCoordinates(latitude, longitude)
    )
      return res
        .status(400)
        .json({ msg: "Valid GPS location is required for field services" });

    const updateData = {
      title,
      bio,
      skills,
      hourlyRate,
      fixedPrice,
      advanceAmount: advanceAmount || 0,
      pricingType,
      milestones,
      city,
      country,
      profilePic,
      portfolio,
      pastWorks,
      category,
      bankDetails,
      dateOfBirth: dateOfBirth || null,
    };

    // Only update isVisible if explicitly provided
    if (typeof isVisible === "boolean") updateData.isVisible = isVisible;

    if (category === "digital") updateData.location = undefined;
    if (category === "field" && isValidCoordinates(latitude, longitude)) {
      updateData.location = {
        type: "Point",
        coordinates: [longitude, latitude],
      };
    }

    const profile = await Freelancer.findOneAndUpdate(
      { user: req.user._id },
      updateData,
      { new: true, upsert: true },
    );

    if (phone !== undefined) {
      req.user.phone = phone;
      await req.user.save();
    }

    return res.json({ success: true, profile });
  } catch (err) {
    console.error("❌ UPDATE PROFILE ERROR:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

/* =====================================================
   AVAILABILITY  (GET + PUT /availability)
   — Freelancer manages their unavailable date ranges
   ===================================================== */

/**
 * GET /api/freelancers/availability
 * Returns the authenticated freelancer's unavailableRanges + isVisible.
 */
router.get(
  "/availability",
  protect,
  authorize("freelancer"),
  async (req, res) => {
    try {
      const profile = await Freelancer.findOne({ user: req.user._id }).select(
        "unavailableRanges isVisible",
      );
      if (!profile) return res.status(404).json({ msg: "Profile not found" });
      return res.json({
        success: true,
        unavailableRanges: profile.unavailableRanges || [],
        isVisible: profile.isVisible !== false,
      });
    } catch (err) {
      console.error("❌ GET /availability ERROR:", err);
      return res.status(500).json({ msg: "Server error" });
    }
  },
);

/**
 * PUT /api/freelancers/availability
 * Body: { unavailableRanges: [{ start, end, note }] }
 * Replaces all unavailable ranges for the authenticated freelancer.
 */
router.put(
  "/availability",
  protect,
  authorize("freelancer"),
  async (req, res) => {
    try {
      const { unavailableRanges } = req.body;

      if (!Array.isArray(unavailableRanges))
        return res
          .status(400)
          .json({ msg: "unavailableRanges must be an array" });

      // Validate each range
      for (const r of unavailableRanges) {
        if (!r.start || !r.end)
          return res
            .status(400)
            .json({ msg: "Each range must have start and end" });
        if (r.start > r.end)
          return res
            .status(400)
            .json({ msg: `Invalid range: ${r.start} > ${r.end}` });
      }

      const profile = await Freelancer.findOneAndUpdate(
        { user: req.user._id },
        { unavailableRanges },
        { new: true },
      );
      if (!profile) return res.status(404).json({ msg: "Profile not found" });

      return res.json({
        success: true,
        unavailableRanges: profile.unavailableRanges,
      });
    } catch (err) {
      console.error("❌ PUT /availability ERROR:", err);
      return res.status(500).json({ msg: "Server error" });
    }
  },
);

/* =====================================================
   GEO + SKILLS SEARCH  (SELF EXCLUDED)
   — Filters: isVisible, unavailable today
   ===================================================== */

router.get("/search", protect, async (req, res) => {
  try {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    const radiusKm = Number(req.query.radiusKm || 10);
    const category = String(req.query.category || "field");
    const skillsText = String(req.query.skills || "").trim();
    const today = todayStr();

    let freelancers = [];

    // ── FIELD SEARCH ──────────────────────────────────────────────
    if (category === "field") {
      if (!isValidCoordinates(latitude, longitude))
        return res
          .status(400)
          .json({ msg: "Valid latitude and longitude required" });

      const geoQuery = {
        category: "field",
        isVisible: { $ne: false }, // ← visibility filter
        location: { $exists: true },
        "location.coordinates.0": { $type: "number" },
        "location.coordinates.1": { $type: "number" },
      };

      if (skillsText) {
        const skillQuery = buildSkillQuery(skillsText);
        if (skillQuery.$or) geoQuery.$or = skillQuery.$or;
      }

      freelancers = await Freelancer.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [longitude, latitude] },
            distanceField: "distanceMeters",
            maxDistance: radiusKm * 1000,
            spherical: true,
            query: geoQuery,
          },
        },
        { $sort: { distanceMeters: 1 } },
        { $limit: 50 },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            title: 1,
            bio: 1,
            skills: 1,
            hourlyRate: 1,
            advanceAmount: 1,
            city: 1,
            country: 1,
            profilePic: 1,
            location: 1,
            category: 1,
            pricingType: 1,
            unavailableRanges: 1,
            distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 2] },
            user: {
              _id: "$user._id",
              name: "$user.name",
              email: "$user.email",
              username: "$user.username",
              honorScore: "$user.honorScore",
            },
          },
        },
      ]);
    }

    // ── DIGITAL SEARCH ────────────────────────────────────────────
    else {
      const textQuery = {
        category: "digital",
        isVisible: { $ne: false }, // ← visibility filter
        "bankDetails.accountNumber": { $exists: true, $ne: "" },
        "bankDetails.ifscCode": { $exists: true, $ne: "" },
      };

      if (skillsText) {
        const skillQuery = buildSkillQuery(skillsText);
        if (skillQuery.$or) textQuery.$or = skillQuery.$or;
      }

      freelancers = await Freelancer.find(textQuery)
        .limit(50)
        .populate("user", "name email username honorScore")
        .select(
          "title bio skills hourlyRate fixedPrice advanceAmount pricingType city country profilePic category unavailableRanges",
        );
    }

    // Exclude self
    freelancers = freelancers.filter(
      (f) => f.user?._id?.toString() !== req.user._id.toString(),
    );

    // Exclude freelancers unavailable today
    freelancers = freelancers.filter((f) => !isUnavailableOn(f, today));

    // Strip unavailableRanges before sending (client doesn't need it)
    freelancers = freelancers.map((f) => {
      const obj = typeof f.toObject === "function" ? f.toObject() : { ...f };
      delete obj.unavailableRanges;
      return obj;
    });

    return res.json({ success: true, freelancers });
  } catch (err) {
    console.error("❌ SEARCH ERROR:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

/* =====================================================
   PUBLIC PROFILE BY USERNAME  /by-username/:username
   ===================================================== */

router.get("/by-username/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const userDoc = await User.findOne({
      username: username.toLowerCase().trim(),
    });
    if (!userDoc) return res.status(404).json({ msg: "Freelancer not found" });

    const profile = await Freelancer.findOne({ user: userDoc._id }).populate(
      "user",
      "name username honorScore avatar",
    );
    if (!profile) return res.status(404).json({ msg: "Freelancer not found" });

    if (!profile.isVisible)
      return res
        .status(403)
        .json({ msg: "This profile is not publicly visible" });

    return res.json({
      success: true,
      profile: _serializeProfile(profile),
    });
  } catch (err) {
    console.error("❌ BY-USERNAME ERROR:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

/* =====================================================
   PUBLIC FREELANCER PROFILE  /:id  (by MongoDB _id)
   ===================================================== */

function _serializeProfile(profile) {
  return {
    _id: profile._id,
    userId: profile.user?._id,
    name: profile.user?.name,
    username: profile.user?.username || null,
    honorScore: profile.user?.honorScore ?? 100,
    category: profile.category,
    title: profile.title,
    bio: profile.bio,
    skills: profile.skills,
    hourlyRate: profile.hourlyRate,
    fixedPrice: profile.fixedPrice,
    advanceAmount: profile.advanceAmount || 0,
    pricingType: profile.pricingType || "hourly",
    milestones: profile.milestones || [],
    city: profile.city,
    country: profile.country,
    profilePic: profile.profilePic || "",
    portfolio: profile.portfolio || [],
    pastWorks: profile.pastWorks || [],
    isVisible: profile.isVisible !== false,
  };
}

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(404).json({ msg: "Freelancer not found" });

    const profile = await Freelancer.findById(id).populate(
      "user",
      "name username honorScore avatar",
    );
    if (!profile) return res.status(404).json({ msg: "Freelancer not found" });

    if (!profile.isVisible)
      return res
        .status(403)
        .json({ msg: "This profile is not publicly visible" });

    if (profile.category === "field") {
      const [lng, lat] = profile.location?.coordinates || [];
      if (!isValidCoordinates(lat, lng))
        return res
          .status(403)
          .json({ msg: "Freelancer profile is not active yet" });
    }

    return res.json({ success: true, profile: _serializeProfile(profile) });
  } catch (err) {
    console.error("❌ PUBLIC PROFILE ERROR:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

export default router;
