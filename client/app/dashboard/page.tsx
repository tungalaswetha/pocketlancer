"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");

    if (!loading && user?.role === "client")
      router.replace("/dashboard/client");
    if (!loading && user?.role === "freelancer")
      router.replace("/dashboard/freelancer");
  }, [loading, user, router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center gap-3 text-slate-600">
      <Loader2 className="animate-spin" />
      Redirecting…
    </div>
  );
}
