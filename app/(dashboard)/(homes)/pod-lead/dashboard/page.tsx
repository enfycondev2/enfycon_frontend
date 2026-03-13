import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { auth } from "@/auth";
import { getGreeting } from "@/lib/utils";
import { serverApiClient } from "@/lib/serverApiClient";
import StatCard from "@/app/(dashboard)/(homes)/dashboard/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import AudienceStatsChart from "@/components/charts/audience-stats-chart";
import AnalysisDonutChart from "@/components/dashboard/admin/AnalysisDonutChart";
import { Suspense } from "react";
import LoadingSkeleton from "@/components/loading-skeleton";

export const dynamic = "force-dynamic";

interface JobRow {
    id: string;
    status?: string;
    createdAt?: string;
    pod?: {
        id: string;
        name: string;
    } | null;
}

interface PodRow {
    id: string;
    name: string;
}

import { fetchAllPages } from "@/lib/pagination";

async function getJobs(): Promise<JobRow[]> {
    return await fetchAllPages<JobRow>("/jobs");
}

async function getMyPods(): Promise<PodRow[]> {
    try {
        const response = await serverApiClient("/pods/my-pods", { cache: "no-store" });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

export default async function PodLeadDashboard() {
    const session = await auth();
    const userName = session?.user?.name || "Pod Lead";
    const [jobs, pods] = await Promise.all([getJobs(), getMyPods()]);

    const welcomeMessage = `${getGreeting()}, ${userName}!`;
    const podIdSet = new Set(pods.map((pod) => pod.id));
    const podJobs = jobs.filter((job) => (job.pod?.id ? podIdSet.has(job.pod.id) : false));

    const podBuckets = new Map<string, { total: number; active: number; filled: number }>();
    podJobs.forEach((job) => {
        const key = job.pod?.name || "Unknown Pod";
        const current = podBuckets.get(key) || { total: 0, active: 0, filled: 0 };
        current.total += 1;
        if (job.status === "ACTIVE") current.active += 1;
        if (job.status === "FILLED") current.filled += 1;
        podBuckets.set(key, current);
    });

    const topPods = Array.from(podBuckets.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 6);
    const podWorkloadRows: Array<[string, { total: number; active: number; filled: number }]> =
        topPods.length > 0
            ? topPods
            : [["No pod data", { total: 0, active: 0, filled: 0 }]];

    const stats = [
        {
            title: "Managed Pods",
            value: String(pods.length),
            icon: "UsersRound",
            iconBg: "bg-cyan-600",
            gradientFrom: "from-cyan-600/10",
            growth: "+1",
            growthIcon: "ArrowUp",
            growthColor: "text-green-600 dark:text-green-400",
            description: "Pods under your leadership",
        },
        {
            title: "Pod Jobs",
            value: String(podJobs.length),
            icon: "BriefcaseBusiness",
            iconBg: "bg-blue-600",
            gradientFrom: "from-blue-600/10",
            growth: `+${podJobs.filter((job) => job.status === "ACTIVE").length}`,
            growthIcon: "ArrowUp",
            growthColor: "text-green-600 dark:text-green-400",
            description: "Total requisitions in pods",
        },
        {
            title: "Active Requisitions",
            value: String(podJobs.filter((job) => job.status === "ACTIVE").length),
            icon: "Timer",
            iconBg: "bg-amber-600",
            gradientFrom: "from-amber-600/10",
            growth: "+2",
            growthIcon: "ArrowUp",
            growthColor: "text-amber-600 dark:text-amber-400",
            description: "Currently in hiring cycle",
        },
        {
            title: "Pod Fill Rate",
            value: `${podJobs.length ? Math.round((podJobs.filter((job) => job.status === "FILLED").length / podJobs.length) * 100) : 0}%`,
            icon: "FileText",
            iconBg: "bg-purple-600",
            gradientFrom: "from-purple-600/10",
            growth: `${podJobs.filter((job) => job.status === "FILLED").length}`,
            growthIcon: "ArrowUp",
            growthColor: "text-green-600 dark:text-green-400",
            description: "Filled vs total pod jobs",
        },
    ];

    const statusSeries = [
        podJobs.filter((job) => job.status === "ACTIVE").length,
        podJobs.filter((job) => job.status === "ON_HOLD" || job.status === "HOLD_BY_CLIENT").length,
        podJobs.filter((job) => job.status === "FILLED").length,
        podJobs.filter((job) => job.status === "CLOSED").length,
    ];

    const monthLabels: string[] = [];
    const activeByMonth: number[] = [];
    const filledByMonth: number[] = [];
    for (let i = 5; i >= 0; i -= 1) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const month = d.getMonth();
        const year = d.getFullYear();
        monthLabels.push(d.toLocaleString("en-US", { month: "short" }));

        activeByMonth.push(
            podJobs.filter((job) => {
                if (!job.createdAt || job.status !== "ACTIVE") return false;
                const created = new Date(job.createdAt);
                return created.getMonth() === month && created.getFullYear() === year;
            }).length
        );
        filledByMonth.push(
            podJobs.filter((job) => {
                if (!job.createdAt || job.status !== "FILLED") return false;
                const created = new Date(job.createdAt);
                return created.getMonth() === month && created.getFullYear() === year;
            }).length
        );
    }

    return (
        <>
            <DashboardBreadcrumb title={welcomeMessage} text="Pod Lead Dashboard" />
            <div className="p-6 space-y-6">
                <Suspense fallback={<LoadingSkeleton />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                        <StatCard data={stats} />
                    </div>
                </Suspense>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-8">
                        <Card className="border border-gray-200 dark:border-neutral-700 bg-white dark:bg-slate-800 rounded-md shadow-none h-full">
                            <CardContent className="p-6">
                                <h6 className="font-semibold text-lg text-neutral-900 dark:text-white mb-4">
                                    Pod Delivery Trend (Active vs Filled)
                                </h6>
                                <AudienceStatsChart
                                    series={[
                                        { name: "Active Jobs", data: activeByMonth },
                                        { name: "Filled Jobs", data: filledByMonth },
                                    ]}
                                    categories={monthLabels}
                                    colors={["#487FFF", "#10B981"]}
                                    height={350}
                                />
                            </CardContent>
                        </Card>
                    </div>
                    <div className="xl:col-span-4">
                        <AnalysisDonutChart
                            title="Pod Job Status Distribution"
                            labels={["Active", "On Hold", "Filled", "Closed"]}
                            series={statusSeries.some((v) => v > 0) ? statusSeries : [1, 0, 0, 0]}
                            colors={["#10B981", "#F59E0B", "#487FFF", "#EF4444"]}
                            totalLabel="Jobs"
                        />
                    </div>
                </div>

                <Card className="border border-gray-200 dark:border-neutral-700 bg-white dark:bg-slate-800 rounded-md shadow-none">
                    <CardContent className="p-6">
                        <h6 className="font-semibold text-lg text-neutral-900 dark:text-white mb-4">
                            Pod Workload Analysis
                        </h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {podWorkloadRows.map(([podName, values]) => (
                                <div
                                    key={podName}
                                    className="rounded-lg border border-neutral-200 dark:border-slate-700 p-4 bg-neutral-50 dark:bg-slate-800/50"
                                >
                                    <p className="font-semibold text-neutral-900 dark:text-white truncate">{podName}</p>
                                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <p className="text-xs text-neutral-500">Total</p>
                                            <p className="font-semibold">{values.total}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-neutral-500">Active</p>
                                            <p className="font-semibold text-blue-600">{values.active}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-neutral-500">Filled</p>
                                            <p className="font-semibold text-emerald-600">{values.filled}</p>
                                        </div>
                                    </div>
                                </div>
                            )
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
