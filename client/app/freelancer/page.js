"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";

export default function FreelancerDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const session = await api.get("/auth/check-session");

                if (session.data.role !== "freelancer") {
                    router.replace("/login");
                    return;
                }

                const res = await api.get("/freelancers/dashboard");
                setStats(res.data.stats);
            } catch {
                router.replace("/login");
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, [router]);

    if (loading) return <p className="p-6">Loading dashboard...</p>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Freelancer Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DashboardCard title="Pending Requests" value={stats?.pending || 0} />
                <DashboardCard title="Confirmed Jobs" value={stats?.confirmed || 0} />
                <DashboardCard title="Completed Jobs" value={stats?.completed || 0} />
            </div>

            <div className="mt-8">
                <button
                    onClick={() => router.push("/freelancer/bookings")}
                    className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    View Bookings
                </button>
            </div>
        </div>
    );
}

function DashboardCard({ title, value }) {
    return (
        <div className="bg-white border rounded-lg p-5 shadow">
            <p className="text-gray-500 text-sm">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
    );
}