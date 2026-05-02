"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function FreelancerLayout({ children }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // /freelancer/[id] = public profile — 3 path segments: ["", "freelancer", id]
  const isPublicProfile =
    pathname.startsWith("/freelancer/") && pathname.split("/").length === 3;

  const userId = user?._id ?? null;
  const userRole = user?.role ?? null;

  useEffect(() => {
    if (loading || isPublicProfile) return;
    if (!userId) { router.replace("/login"); return; }
    if (userRole !== "freelancer") router.replace("/dashboard");
  }, [loading, userId, userRole, isPublicProfile, router]);

  if (loading && !isPublicProfile) return null;

  return (
    // max-w container + mobile bottom nav padding
    // Public profile pages (/freelancer/[id]) also get consistent padding
    <div className="max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-8">
      {children}
    </div>
  );
}
