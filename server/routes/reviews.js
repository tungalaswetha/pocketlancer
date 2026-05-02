import express from "express";
const router = express.Router();
// ⚠️ IMPORTANT: Adding .js extensions for ES Modules
import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import Freelancer from "../models/Freelancer.js";
import { protect, authorize } from "../middleware/auth.js";
import { sendReviewEmail } from "../utils/emailUtils.js";
/* ======================================================
   ⭐ POST REVIEW (CLIENT ONLY)
====================================================== */
router.post("/", protect, authorize("client"), async (req, res) => {
  const { bookingId, rating, comment } = req.body;
  if (!bookingId || !rating) {
    return res.status(400).json({ msg: "Missing review data" });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ msg: "Rating must be between 1 and 5" });
  }
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ msg: "Booking not found" });
    }
    // ✅ Ensure booking belongs to this client
    if (booking.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: "Not your booking" });
    }
    if (booking.status !== "completed") {
      return res.status(400).json({ msg: "Booking not completed yet" });
    }
    if (booking.reviewed) {
      return res.status(400).json({ msg: "Review already submitted" });
    }
    // ❌ Prevent duplicate review
    const existing = await Review.findOne({ bookingId });
    if (existing) {
      return res.status(400).json({ msg: "Review already exists" });
    }
    // ✅ Create review
    const review = await Review.create({
      bookingId,
      freelancerId: booking.freelancerId,
      clientId: req.user._id,
      rating,
      comment,
    });
    // ⭐ Update freelancer rating (safe math)
    const freelancer = await Freelancer.findById(booking.freelancerId);
    const newCount = freelancer.ratingCount + 1;
    const newRating =
      (freelancer.rating * freelancer.ratingCount + rating) / newCount;
    freelancer.rating = Number(newRating.toFixed(2));
    freelancer.ratingCount = newCount;
    await freelancer.save();
    // 🔒 Lock booking
    booking.reviewed = true;
    await booking.save();
    // 📧 Email notification
    await sendReviewEmail(freelancer.email, rating, comment || "No comment");
    res.status(201).json({
      success: true,
      msg: "Review submitted successfully",
      review,
    });
  } catch (err) {
    console.error("❌ REVIEW ERROR:", err.message);
    res.status(500).json({ msg: "Failed to submit review" });
  }
});
/* ======================================================
   📄 GET REVIEWS FOR FREELANCER (PUBLIC)
====================================================== */
router.get("/freelancer/:id", async (req, res) => {
  try {
    const reviews = await Review.find({
      freelancerId: req.params.id,
    })
      .populate("clientId", "name")
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews.map((r) => ({
        _id: r._id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        clientName: r.clientId?.name || "Anonymous",
      })),
    });
  } catch (err) {
    console.error("❌ FETCH REVIEWS ERROR:", err.message);
    res.status(500).json({ msg: "Failed to fetch reviews" });
  }
});
// Modern Export
export default router;
