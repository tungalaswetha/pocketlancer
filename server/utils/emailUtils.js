import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOtpEmail(to, otp) {
  try {
    // 🔍 Step 1: Attempt to send
    const { data, error } = await resend.emails.send({
      from: `PocketLancer <${process.env.EMAIL_FROM}>`,
      to: [to],
      subject: "Your PocketLancer OTP Code",
      html: `<h1>${otp}</h1>`,
    });

    // 🔍 Step 2: Check for Sandbox Restrictions
    if (error) {
      console.error("❌ Resend API Error:", error.message);
      // If it's a 403, it means the 'to' email isn't authorized
      if (error.statusCode === 403) {
        console.warn("⚠️ SANDBOX LIMIT: You can only send to your own email.");
      }
      return false;
    }

    if (data && data.id) {
      console.log("✅ OTP email sent! ID:", data.id);
      return true;
    }

    return false;
  } catch (err) {
    console.error("❌ Network/Service Error:", err.message);
    return false;
  }
}

// Keep sendReviewEmail here as well
export async function sendReviewEmail(to, rating, comment) {
  try {
    await resend.emails.send({
      from: "PocketLancer <onboarding@resend.dev>",
      to: [to],
      subject: "New Review Received",
      html: `<p>Rating: ${rating} - ${comment}</p>`,
    });
    return true;
  } catch (error) {
    return false;
  }
}
export async function sendPasswordResetEmail(to, resetUrl) {
  try {
    const { data, error } = await resend.emails.send({
      from: `PocketLancer <${process.env.EMAIL_FROM}>`,
      to: [to],
      subject: "Reset your PocketLancer password",
      html: `
        <h2>Password Reset</h2>
        <p>You requested to reset your password.</p>
        <p>This link will expire in 15 minutes.</p>
        <a href="${resetUrl}">${resetUrl}</a>
      `,
    });

    if (error) {
      console.error("❌ Resend reset email error:", error.message);
      return false;
    }

    return !!data?.id;
  } catch (err) {
    console.error("❌ sendPasswordResetEmail error:", err.message);
    return false;
  }
}
