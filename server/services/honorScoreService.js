// server/services/honorScoreService.js
import User from "../models/User.js";
import { notify } from "../utils/notify.js";

/**
 * Deduct points from a user's honorScore (floor: 0).
 * Fire-and-forget safe — errors are logged, never thrown.
 */
export async function deductScore(userId, points, reason = "") {
  try {
    await User.findByIdAndUpdate(userId, [
      {
        $set: {
          honorScore: {
            $max: [0, { $subtract: ["$honorScore", Math.abs(points)] }],
          },
        },
      },
    ]);

    if (reason) {
      await notify({
        userId,
        type: "honor_score_changed",
        message: `Your Honor Score decreased by ${Math.abs(points)}. Reason: ${reason}`,
        link: "/dashboard",
      }).catch(() => {});
    }
  } catch (err) {
    console.error("[honorScore] deduct error:", err.message);
  }
}

/**
 * Reward points to a user's honorScore (cap: 100).
 * Fire-and-forget safe.
 */
export async function rewardScore(userId, points) {
  try {
    await User.findByIdAndUpdate(userId, [
      {
        $set: {
          honorScore: {
            $min: [100, { $add: ["$honorScore", Math.abs(points)] }],
          },
        },
      },
    ]);
  } catch (err) {
    console.error("[honorScore] reward error:", err.message);
  }
}

/**
 * Returns badge tier from a numeric score.
 * @returns {"green"|"orange"|"red"}
 */
export function scoreBadge(score) {
  if (score >= 75) return "green";
  if (score >= 35) return "orange";
  return "red";
}
