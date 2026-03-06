import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { auth } from "@/auth";
import { getGreeting } from "@/lib/utils";
import { serverApiClient } from "@/lib/serverApiClient";
import { Suspense } from "react";
import LoadingSkeleton from "@/components/loading-skeleton";
import StatCard from "@/app/(dashboard)/(homes)/dashboard/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import AudienceStatsChart from "@/components/charts/audience-stats-chart";
import AnalysisDonutChart from "@/components/dashboard/admin/AnalysisDonutChart";

export const dynamic = "force-dynamic";

interface JobRow {
    id: string;
    createdAt?: string;
    status?: string;
    clientName?: string;
}

interface SubmissionRow {
    jobId?: string;
    finalStatus?: string;
}

async function getMyJobs(): Promise<JobRow[]> {
    try {
        const response = await serverApiClient("/jobs?my=true", {
            cache: "no-store",
        });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data?.data) ? data.data : [];
    } catch {
        return [];
    }
}

async function getSubmissions(): Promise<SubmissionRow[]> {
    try {
        const response = await serverApiClient("/recruiter-submissions", {
            cache: "no-store",
        });
        if (!response.ok) return [];
        const data = await response.json();
        const arr = Array.isArray(data)
            ? data
            : (data?.data || data?.submissions || []);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

export default async function AccountManagerDashboard() {
    const session = await auth();
    const userName = session?.user?.name || "Account Manager";
    const [jobs, submissions] = await Promise.all([getMyJobs(), getSubmissions()]);

    const hour = new Date().getHours();
    const welcomeMessage = `${getGreeting()}, ${userName}!`;
    const myJobIds = new Set(jobs.map((job) => job.id));
    const mySubmissions = submissions.filter((sub) => (sub.jobId ? myJobIds.has(sub.jobId) : false));

    const totalJobs = jobs.length;
    const activeJobs = jobs.filter((job) => job.status === "ACTIVE").length;
    const filledJobs = jobs.filter((job) => job.status === "FILLED").length;
    const holdJobs = jobs.filter(
        (job) => job.status === "ON_HOLD" || job.status === "HOLD_BY_CLIENT"
    ).length;
    const selectedSubmissions = mySubmissions.filter(
        (sub) => (sub.finalStatus || "").toUpperCase() === "SELECTED"
    ).length;
    const submissionRate = totalJobs > 0 ? (mySubmissions.length / totalJobs).toFixed(1) : "0";

    const clientCounts = new Map<string, number>();
    jobs.forEach((job) => {
        const client = job.clientName || "Unknown";
        clientCounts.set(client, (clientCounts.get(client) || 0) + 1);
    });
    const topClients = Array.from(clientCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    const monthLabels: string[] = [];
    const postedSeries: number[] = [];
    const filledSeries: number[] = [];
    for (let i = 5; i >= 0; i -= 1) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const month = d.getMonth();
        const year = d.getFullYear();
        monthLabels.push(d.toLocaleString("en-US", { month: "short" }));
        postedSeries.push(
            jobs.filter((job) => {
                if (!job.createdAt) return false;
                const created = new Date(job.createdAt);
                return created.getMonth() === month && created.getFullYear() === year;
            }).length
        );
        filledSeries.push(
            jobs.filter((job) => {
                if (!job.createdAt || job.status !== "FILLED") return false;
                const created = new Date(job.createdAt);
                return created.getMonth() === month && created.getFullYear() === year;
            }).length
        );
    }

    const stats = [
        {
            title: "Total Jobs Posted",
            value: String(totalJobs),
            icon: "BriefcaseBusiness",
            iconBg: "bg-blue-600",
            gradientFrom: "from-blue-600/10",
            growth: `+${Math.max(activeJobs, 0)}`,
            growthIcon: "ArrowUp",
            growthColor: "text-green-600 dark:text-green-400",
            description: "Currently active requisitions",
        },
        {
            title: "Total Submissions",
            value: String(mySubmissions.length),
            icon: "FileText",
            iconBg: "bg-purple-600",
            gradientFrom: "from-purple-600/10",
            growth: `${submissionRate}/job`,
            growthIcon: "ArrowUp",
            growthColor: "text-green-600 dark:text-green-400",
            description: "Average submissions per job",
        },
        {
            title: "Filled Jobs",
            value: String(filledJobs),
            icon: "UsersRound",
            iconBg: "bg-emerald-600",
            gradientFrom: "from-emerald-600/10",
            growth: `${selectedSubmissions}`,
            growthIcon: "ArrowUp",
            growthColor: "text-green-600 dark:text-green-400",
            description: "Selected candidates overall",
        },
        {
            title: "Jobs On Hold",
            value: String(holdJobs),
            icon: "Timer",
            iconBg: "bg-amber-600",
            gradientFrom: "from-amber-600/10",
            growth: holdJobs > 0 ? "+1" : "0",
            growthIcon: "ArrowUp",
            growthColor: holdJobs > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400",
            description: "Needs AM follow-up",
        },
    ];

    return (
        <>
            <DashboardBreadcrumb title={welcomeMessage} text="Account Manager Dashboard" />
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
                                    Job Posting & Fulfillment Trend (Last 6 Months)
                                </h6>
                                <div className="apexcharts-tooltip-z-none">
                                    <AudienceStatsChart
                                        series={[
                                            { name: "Posted Jobs", data: postedSeries },
                                            { name: "Filled Jobs", data: filledSeries },
                                        ]}
                                        categories={monthLabels}
                                        colors={["#487FFF", "#10B981"]}
                                        height={350}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="xl:col-span-4">
                        <AnalysisDonutChart
                            title="Job Status Distribution"
                            labels={["Active", "On Hold", "Filled", "Closed"]}
                            series={[
                                jobs.filter((job) => job.status === "ACTIVE").length,
                                holdJobs,
                                filledJobs,
                                jobs.filter((job) => job.status === "CLOSED").length,
                            ].some((v) => v > 0) ? [
                                jobs.filter((job) => job.status === "ACTIVE").length,
                                holdJobs,
                                filledJobs,
                                jobs.filter((job) => job.status === "CLOSED").length,
                            ] : [1, 0, 0, 0]}
                            colors={["#10B981", "#F59E0B", "#487FFF", "#EF4444"]}
                            totalLabel="Jobs"
                        />
                    </div>
                </div>

                <Card className="border border-gray-200 dark:border-neutral-700 bg-white dark:bg-slate-800 rounded-md shadow-none">
                    <CardContent className="p-6">
                        <h6 className="font-semibold text-lg text-neutral-900 dark:text-white mb-4">
                            Top Client Demand Analysis
                        </h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {(topClients.length ? topClients : [["No client data", 0]]).map(([client, count]) => (
                                <div
                                    key={client}
                                    className="rounded-lg border border-neutral-200 dark:border-slate-700 p-4 bg-neutral-50 dark:bg-slate-800/50"
                                >
                                    <p className="text-sm text-neutral-500 dark:text-neutral-300">Client</p>
                                    <p className="font-semibold text-neutral-900 dark:text-white mt-1 truncate">
                                        {client}
                                    </p>
                                    <p className="text-2xl font-bold text-primary mt-2">{count}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        Opened requisitions
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
