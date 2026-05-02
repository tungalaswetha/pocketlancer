"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";

// All routes listed here use their own DashboardHeader (via their layout files).
// The public Header should NOT render on these routes to avoid double headers.
const AUTH_ONLY_PREFIXES = [
  "/dashboard",
  "/freelancer",  // has own DashboardHeader via freelancer/layout.js (except /freelancer/[id] handled there)
  "/bookings",
  "/calendar",
  "/client",
  "/disputes",
  "/book",
  "/payment",
  "/admin",
];

export default function HeaderWrapper() {
  const pathname = usePathname();

  const isAuthRoute = AUTH_ONLY_PREFIXES.some((prefix) =>
    pathname?.startsWith(prefix),
  );

  if (isAuthRoute) return null;

  return <Header />;
}
