"use client";

import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";
import PublicHeader from "@/components/Header";
import DashboardHeader from "@/components/DashboardHeader";

/**
 * SmartHeader
 * ─────────────────────────────────────────────
 * Rule: "/" (homepage) → public Header
 *       every other route → DashboardHeader
 *
 * DashboardHeader internally handles both logged-in
 * and logged-out states, so no extra logic needed here.
 */
export default function SmartHeader() {
  const pathname = usePathname();
  const { loading } = useUser();

  // Never flash a header before hydration
  if (loading) return null;

  if (pathname === "/") {
    return <PublicHeader />;
  }

  return <DashboardHeader />;
}
