import Freelancer from "../models/Freelancer.js";
import express from "express";
import PortfolioItem from "../models/PortfolioItem.js";
import { protect } from "../middleware/auth.js";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import mongoose from "mongoose";

const router = express.Router();

/* =====================================
   Multer Memory Storage
===================================== */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

/* =====================================
   Cloudinary Upload Helper
===================================== */
const uploadFromBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder: "pocketlancer/portfolio",
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      },
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

/*
=====================================
Add Portfolio Item
=====================================
*/
router.post("/", protect, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ msg: "File size exceeds 10MB limit." });
    } else if (err) {
      return res.status(400).json({ msg: "File upload error." });
    }

    try {
      const { type, title, description, websiteUrl } = req.body;

      let url = websiteUrl;
      let publicId = null;

      if (type !== "website") {
        if (!req.file) {
          return res.status(400).json({ msg: "File required" });
        }

        const result = await uploadFromBuffer(req.file.buffer);

        url = result.secure_url;
        publicId = result.public_id;
      }

      // Find freelancer profile linked to this user
      const freelancer = await Freelancer.findOne({ user: req.user._id });

      if (!freelancer) {
        return res.status(404).json({ msg: "Freelancer profile not found" });
      }

      const item = await PortfolioItem.create({
        freelancer: freelancer._id, // ✅ correct id
        type,
        title,
        description,
        url,
        publicId,
      });

      res.json(item);
    } catch (err) {
      console.error("PORTFOLIO UPLOAD ERROR:", err);
      res.status(500).json({ msg: "Upload failed" });
    }
  });
});

/*
=====================================
Get Portfolio By Freelancer
=====================================
*/
router.get("/:freelancerId", async (req, res) => {
  try {
    const { freelancerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(freelancerId)) {
      return res.status(400).json({ msg: "Invalid freelancer ID" });
    }

    const items = await PortfolioItem.find({
      freelancer: freelancerId,
    }).sort({ createdAt: -1 });

    res.json(items);
  } catch (err) {
    console.error("GET PORTFOLIO ERROR:", err);
    res.status(500).json({ msg: "Failed to load portfolio" });
  }
});

/*
=====================================
Delete Portfolio Item
=====================================
*/
router.delete("/:id", protect, async (req, res) => {
  try {
    const item = await PortfolioItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ msg: "Portfolio item not found" });
    }

    // Delete file from Cloudinary
    if (item.publicId) {
      await cloudinary.uploader.destroy(item.publicId);
    }

    await item.deleteOne();

    res.json({ success: true, msg: "Portfolio deleted" });
  } catch (err) {
    console.error("DELETE PORTFOLIO ERROR:", err);
    res.status(500).json({ msg: "Delete failed" });
  }
});

export default router;
