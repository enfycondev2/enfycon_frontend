import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { auth } from "@/auth";
import { getGreeting } from "@/lib/utils";
import RecentJobsTable from "./components/recent-jobs-table";
import { Suspense } from "react";
import LoadingSkeleton from "@/components/loading-skeleton";
import { serverApiClient } from "@/lib/serverApiClient";
import StatCard from "@/app/(dashboard)/(homes)/dashboard/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import AudienceStatsChart from "@/components/charts/audience-stats-chart";
import AnalysisDonutChart from "@/components/dashboard/admin/AnalysisDonutChart";

export const dynamic = "force-dynamic";

interface JobRow {
    id: string;
    jobTitle?: string;
    status?: string;
    createdAt?: string;
    clientName?: string;
}

interface SubmissionRow {
    jobId?: string;
    finalStatus?: string;
    submissionDate?: string;
}

import { fetchAllPages } from "@/lib/pagination";

async function getJobs(): Promise<JobRow[]> {
    return await fetchAllPages<JobRow>("/jobs?my=true");
}

async function getSubmissions(): Promise<SubmissionRow[]> {
    return await fetchAllPages<SubmissionRow>("/recruiter-submissions");
}

export default async function RecruiterDashboard() {
    const session = await auth();
    const userName = session?.user?.name || "Recruiter";
    const [jobs, submissions] = await Promise.all([getJobs(), getSubmissions()]);
    const recentJobs = jobs.map((job) => ({
        id: job.id,
        jobTitle: job.jobTitle || "Untitled Job",
        clientName: job.clientName || "Unknown Client",
        status: job.status || "ACTIVE",
        createdAt: job.createdAt || new Date(0).toISOString(),
    }));

    const welcomeMessage = `${getGreeting()}, ${userName}!`;

    const myJobIds = new Set(jobs.map((job) => job.id));
    const mySubmissions = submissions.filter((sub) => (sub.jobId ? myJobIds.has(sub.jobId) : false));

    const totalJobs = jobs.length;
    const activeJobs = jobs.filter((j) => j.status === "ACTIVE").length;
    const selectedCount = mySubmissions.filter(
        (sub) => (sub.finalStatus || "").toUpperCase() === "SELECTED"
    ).length;
    const rejectedCount = mySubmissions.filter(
        (sub) => (sub.finalStatus || "").toUpperCase() === "REJECTED"
    ).length;

    const stats = [
        {
            title: "Assigned Jobs",
            value: String(totalJobs),
            icon: "BriefcaseBusiness",
            iconBg: "bg-blue-600",
            gradientFrom: "from-blue-600/10",
            growth: `+${Math.max(activeJobs, 0)}`,
            growthIcon: "ArrowUp",
            growthColor: "text-green-600 dark:text-green-400",
            description: "Currently active roles",
        },
        {
            title: "Candidate Submissions",
            value: String(mySubmissions.length),
            icon: "FileText",
            iconBg: "bg-purple-600",
            gradientFrom: "from-purple-600/10",
            growth: `${totalJobs ? (mySubmissions.length / totalJobs).toFixed(1) : "0"}/job`,
            growthIcon: "ArrowUp",
            growthColor: "text-green-600 dark:text-green-400",
            description: "Submission throughput",
        },
        {
            title: "Selected Candidates",
            value: String(selectedCount),
            icon: "UsersRound",
            iconBg: "bg-emerald-600",
            gradientFrom: "from-emerald-600/10",
            growth: `-${rejectedCount}`,
            growthIcon: "ArrowUp",
            growthColor: "text-green-600 dark:text-green-400",
            description: "Conversion to final select",
        },
        {
            title: "Jobs On Hold",
            value: String(
                jobs.filter((job) => job.status === "ON_HOLD" || job.status === "HOLD_BY_CLIENT").length
            ),
            icon: "Timer",
            iconBg: "bg-amber-600",
            gradientFrom: "from-amber-600/10",
            growth: "+1",
            growthIcon: "ArrowUp",
            growthColor: "text-amber-600 dark:text-amber-400",
            description: "Need follow-up action",
        },
    ];

    const monthLabels: string[] = [];
    const assignedByMonth: number[] = [];
    const submittedByMonth: number[] = [];
    for (let i = 5; i >= 0; i -= 1) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const month = d.getMonth();
        const year = d.getFullYear();
        monthLabels.push(d.toLocaleString("en-US", { month: "short" }));

        assignedByMonth.push(
            jobs.filter((job) => {
                if (!job.createdAt) return false;
                const created = new Date(job.createdAt);
                return created.getMonth() === month && created.getFullYear() === year;
            }).length
        );

        submittedByMonth.push(
            mySubmissions.filter((sub) => {
                if (!sub.submissionDate) return false;
                const submitted = new Date(sub.submissionDate);
                return submitted.getMonth() === month && submitted.getFullYear() === year;
            }).length
        );
    }

    const statusSeries = [
        jobs.filter((job) => job.status === "ACTIVE").length,
        jobs.filter((job) => job.status === "ON_HOLD" || job.status === "HOLD_BY_CLIENT").length,
        jobs.filter((job) => job.status === "FILLED").length,
        jobs.filter((job) => job.status === "CLOSED").length,
    ];

    const clientBuckets = new Map<string, number>();
    jobs.forEach((job) => {
        const key = job.clientName || "Unknown";
        clientBuckets.set(key, (clientBuckets.get(key) || 0) + 1);
    });
    const topClients = Array.from(clientBuckets.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    return (
        <>
            <DashboardBreadcrumb title={welcomeMessage} text="Recruiter Dashboard" />
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
                                    Activity Trend (Assigned vs Submitted)
                                </h6>
                                <AudienceStatsChart
                                    series={[
                                        { name: "Assigned Jobs", data: assignedByMonth },
                                        { name: "Submissions", data: submittedByMonth },
                                    ]}
                                    categories={monthLabels}
                                    colors={["#487FFF", "#8B5CF6"]}
                                    height={350}
                                />
                            </CardContent>
                        </Card>
                    </div>
                    <div className="xl:col-span-4">
                        <AnalysisDonutChart
                            title="Job Status Mix"
                            labels={["Active", "On Hold", "Filled", "Closed"]}
                            series={statusSeries.some((v) => v > 0) ? statusSeries : [1, 0, 0, 0]}
                            colors={["#10B981", "#F59E0B", "#487FFF", "#EF4444"]}
                            totalLabel="Jobs"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-8">
                        <Suspense fallback={<LoadingSkeleton />}>
                            <RecentJobsTable jobs={recentJobs} />
                        </Suspense>
                    </div>
                    <div className="xl:col-span-4">
                        <Card className="border border-gray-200 dark:border-neutral-700 bg-white dark:bg-slate-800 rounded-md shadow-none h-full">
                            <CardContent className="p-6">
                                <h6 className="font-semibold text-lg text-neutral-900 dark:text-white mb-4">
                                    Top Client Demand
                                </h6>
                                <div className="space-y-3">
                                    {(topClients.length ? topClients : [["No client data", 0]]).map(([client, count]) => (
                                        <div
                                            key={client}
                                            className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-slate-700 px-3 py-2"
                                        >
                                            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate pr-2">
                                                {client}
                                            </p>
                                            <span className="text-sm font-semibold text-primary">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}
