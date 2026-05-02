import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { protect, authorize } from "../middleware/auth.js";
import Freelancer from "../models/Freelancer.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // ✅ 2MB limit
});

router.post(
  "/profile-pic",
  protect,
  authorize("freelancer"),
  (req, res) => {
    upload.single("image")(req, res, async (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ msg: "File size exceeds 5MB limit." });
      } else if (err) {
        return res.status(400).json({ msg: "File upload error." });
      }

      try {
        if (!req.file) {
          return res.status(400).json({ msg: "No file uploaded" });
        }

        // ✅ Find freelancer in a flexible way
        const freelancer =
          (await Freelancer.findOne({ user: req.user._id })) ||
          (await Freelancer.findOne({ userId: req.user._id })) ||
          (await Freelancer.findOne({ email: req.user.email }));

        if (!freelancer) {
          return res.status(404).json({
            msg: "Freelancer profile not found. Create freelancer profile first.",
          });
        }

        // ✅ Convert buffer to base64
        const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
          "base64",
        )}`;

        const result = await cloudinary.uploader.upload(base64, {
          folder: "pocketlancer/profile-pics",
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
          ],
        });

        freelancer.profilePic = result.secure_url;
        await freelancer.save();

        return res.json({ success: true, profilePic: freelancer.profilePic });
      } catch (err) {
        console.error("UPLOAD PROFILE PIC ERROR:", err);
        return res.status(500).json({ msg: "Upload failed" });
      }
    });
  },
);
router.delete(
  "/profile-pic",
  protect,
  authorize("freelancer"),
  async (req, res) => {
    try {
      const freelancer = await Freelancer.findOne({ user: req.user._id });

      if (!freelancer) {
        return res.status(404).json({ msg: "Freelancer profile not found" });
      }

      freelancer.profilePic = "";
      await freelancer.save();

      return res.json({ success: true, msg: "Profile picture removed" });
    } catch (err) {
      console.error("REMOVE PROFILE PIC ERROR:", err);
      return res.status(500).json({ msg: "Failed to remove profile picture" });
    }
  },
);

export default router;
