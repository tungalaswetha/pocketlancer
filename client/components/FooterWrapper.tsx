"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";

// Show footer only on public-facing pages
const NO_FOOTER_PREFIXES = [
  "/dashboard",
  "/freelancer/profile",
  "/freelancer/bookings",
  "/bookings",
  "/calendar",
  "/client",
  "/disputes",
  "/book",
  "/payment",
  "/admin",
  "/search",
  "/map-search",
];

export default function FooterWrapper() {
  const pathname = usePathname();
  const hide = NO_FOOTER_PREFIXES.some((p) => pathname?.startsWith(p));
  if (hide) return null;
  return <Footer />;
}
