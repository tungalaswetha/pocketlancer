import cron from "node-cron";
import Dispute from "../models/Dispute.js";
import Booking from "../models/Booking.js";
import { sendDisputeResolved } from "../services/notificationService.js";

// Runs every day at 3 AM — auto-resolves disputes open for 5+ days
cron.schedule("0 3 * * *", async () => {
  console.log("[disputeSLA] Running...");

  try {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    const stale = await Dispute.find({
      status: "open",
      createdAt: { $lte: fiveDaysAgo },
    });

    for (const dispute of stale) {
      const resolution = "release_to_freelancer";

      dispute.status = "resolved";
      dispute.resolution = resolution;
      dispute.adminNotes = "Auto-resolved by SLA (5 days without admin action)";
      await dispute.save();

      // Unlock the booking and notify both parties
      const booking = await Booking.findById(dispute.bookingId)
        .populate("clientId")
        .populate("freelancerId");

      if (booking) {
        booking.disputeLocked = false;
        await booking.save();

        await sendDisputeResolved(booking.clientId._id, resolution);
        await sendDisputeResolved(booking.freelancerId.user, resolution);
      }
    }

    console.log(`[disputeSLA] Auto-resolved ${stale.length} dispute(s)`);
  } catch (err) {
    console.error("[disputeSLA] Error:", err.message);
  }
});
