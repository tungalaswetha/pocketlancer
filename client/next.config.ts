import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://pocketlancer.onrender.com/api/:path*",
      },
    ];
  },

  /**
   * Permissions-Policy headers — required for Razorpay to work in
   * Android WebView (and all browsers).
   *
   * Root cause of "Payment could not be completed":
   *   Razorpay's checkout.js uses device motion (accelerometer/gyroscope)
   *   as part of its fraud-detection fingerprinting step.
   *   It also uses the Payment Request API and needs local-network-access
   *   for its captcha probes.
   *
   *   When these features are blocked — which is the default in a Capacitor
   *   WebView — Razorpay's POST to /v1/standard_checkout/payments/validate/account
   *   returns HTTP 500 and the modal immediately shows "Payment could not
   *   be completed. Please use another method."
   *
   * The fix: serve a Permissions-Policy header that allows these features
   *   for all origins (value: *), so Razorpay's cross-origin iframe can use them.
   *
   * accelerometer / gyroscope / magnetometer
   *   → device motion fingerprinting used by Razorpay's fraud engine
   * payment
   *   → Payment Request API used by Razorpay checkout
   * otp-credentials
   *   → SMS OTP autofill used by Razorpay for card/UPI OTP screens
   * web-share
   *   → used by Razorpay for share-receipt feature
   * local-network-access
   *   → Razorpay pings local addresses (captcha probe) for device identity
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: [
              "accelerometer=*",
              "gyroscope=*",
              "magnetometer=*",
              "payment=*",
              "otp-credentials=*",
              "web-share=*",
              "local-network-access=*",
            ].join(", "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
