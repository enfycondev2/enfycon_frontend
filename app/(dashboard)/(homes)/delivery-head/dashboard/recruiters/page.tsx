import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { auth } from "@/auth";
import { Suspense } from "react";
import LoadingSkeleton from "@/components/loading-skeleton";
import { serverApiClient } from "@/lib/serverApiClient";
import StatCard from "@/app/(dashboard)/(homes)/dashboard/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import AudienceStatsChart from "@/components/charts/audience-stats-chart";
import AnalysisDonutChart from "@/components/dashboard/admin/AnalysisDonutChart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

interface SubmissionRow {
    recruiterId?: string;
    recruiter?: {
        fullName?: string | null;
        email?: string;
    } | null;
    submissionDate?: string;
    l1Status?: string;
    l2Status?: string;
    l3Status?: string;
    finalStatus?: string;
}

const norm = (value?: string) => (value || "").trim().toUpperCase();

import { fetchAllPages } from "@/lib/pagination";

async function getSubmissions(): Promise<SubmissionRow[]> {
    return await fetchAllPages<SubmissionRow>("/recruiter-submissions");
}

export default async function DeliveryHeadRecruiterDashboardPage() {
    const session = await auth();
    const userName = session?.user?.name || "Delivery Head";
    const submissions = await getSubmissions();

    const totalSubmissions = submissions.length;

    const l1Count = submissions.filter((s) => norm(s.l1Status) && norm(s.l2Status) === "" && norm(s.l3Status) === "" && !["SELECTED", "REJECTED", "FILLED", "CLOSED", "JOIN"].includes(norm(s.finalStatus))).length;
    const l2Count = submissions.filter((s) => norm(s.l2Status) && norm(s.l3Status) === "" && !["SELECTED", "REJECTED", "FILLED", "CLOSED", "JOIN"].includes(norm(s.finalStatus))).length;
    const finalRoundCount = submissions.filter((s) => norm(s.l3Status) && !["SELECTED", "REJECTED", "FILLED", "CLOSED", "JOIN"].includes(norm(s.finalStatus))).length;
    const selectedCount = submissions.filter((s) => ["SELECTED", "FILLED", "JOIN", "OFFER"].includes(norm(s.finalStatus))).length;
    const rejectedCount = submissions.filter((s) => norm(s.finalStatus) === "REJECTED").length;

    const recruiterMap = new Map<
        string,
        { name: string; email: string; submissions: number; selected: number; rejected: number; inProgress: number }
    >();

    submissions.forEach((submission) => {
        const key = submission.recruiterId || "unknown";
        const displayName = submission.recruiter?.fullName || submission.recruiter?.email || key;
        const email = submission.recruiter?.email || "No Email";

        const current = recruiterMap.get(key) || {
            name: displayName,
            email: email,
            submissions: 0,
            selected: 0,
            rejected: 0,
            inProgress: 0,
        };

        current.submissions += 1;
        if (["SELECTED", "FILLED", "JOIN", "OFFER"].includes(norm(submission.finalStatus))) {
            current.selected += 1;
        } else if (norm(submission.finalStatus) === "REJECTED") {
            current.rejected += 1;
        } else {
            current.inProgress += 1;
        }

        recruiterMap.set(key, current);
    });

    const recruiterRows = Array.from(recruiterMap.values()).sort(
        (a, b) => b.submissions - a.submissions
    );

    const activeRecruiters = recruiterRows.length;

    const recentMonths: string[] = [];
    const monthlySubmissions: number[] = [];
    const monthlySelections: number[] = [];
    for (let i = 5; i >= 0; i -= 1) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const month = d.getMonth();
        const year = d.getFullYear();
        recentMonths.push(d.toLocaleString("en-US", { month: "short" }));

        monthlySubmissions.push(
            submissions.filter((s) => {
                if (!s.submissionDate) return false;
                const date = new Date(s.submissionDate);
                return date.getMonth() === month && date.getFullYear() === year;
            }).length
        );

        monthlySelections.push(
            submissions.filter((s) => {
                if (!s.submissionDate || !["SELECTED", "FILLED", "JOIN", "OFFER"].includes(norm(s.finalStatus))) return false;
                const date = new Date(s.submissionDate);
                return date.getMonth() === month && date.getFullYear() === year;
            }).length
        );
    }

    const statusDistribution = [
        l1Count,
        l2Count,
        finalRoundCount,
        selectedCount,
        rejectedCount,
    ];

    const recruiterStats = [
        {
            title: "Active Recruiters",
            value: String(activeRecruiters),
            icon: "UsersRound",
            iconBg: "bg-cyan-600",
            gradientFrom: "from-cyan-600/10",
            growth: `${activeRecruiters}`,
            growthIcon: "ArrowUp",
            growthColor: "text-green-600 dark:text-green-400",
            description: "Contributing across your pods",
        },
        {
            title: "Total Submissions",
            value: String(totalSubmissions),
            icon: "FileText",
            iconBg: "bg-blue-600",
            gradientFrom: "from-blue-600/10",
            growth: `${totalSubmissions > 0 ? 100 : 0}%`,
            growthIcon: "ArrowUp",
            growthColor: "text-green-600 dark:text-green-400",
            description: "Submissions across pods",
        },
        {
            title: "Selected Candidates",
            value: String(selectedCount),
            icon: "CheckCircle",
            iconBg: "bg-green-600",
            gradientFrom: "from-green-600/10",
            growth: `${totalSubmissions > 0 ? Math.round((selectedCount / totalSubmissions) * 100) : 0}%`,
            growthIcon: "ArrowUp",
            growthColor: "text-green-600 dark:text-green-400",
            description: "Selection rate",
        },
        {
            title: "Pipeline In Progress",
            value: String(totalSubmissions - selectedCount - rejectedCount),
            icon: "Timer",
            iconBg: "bg-amber-600",
            gradientFrom: "from-amber-600/10",
            growth: `${totalSubmissions - selectedCount - rejectedCount}`,
            growthIcon: "ArrowRight",
            growthColor: "text-amber-600 dark:text-amber-400",
            description: "Candidates interviewing",
        },
    ];

    return (
        <>
            <DashboardBreadcrumb title={`Recruiters Performance`} text="Overview of recruiter performance" />
            <div className="p-6 space-y-6">
                <Suspense fallback={<LoadingSkeleton />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                        <StatCard data={recruiterStats} />
                    </div>
                </Suspense>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-8">
                        <Card className="border border-gray-200 dark:border-neutral-700 bg-white dark:bg-slate-800 rounded-md shadow-none h-full">
                            <CardContent className="p-6">
                                <h6 className="font-semibold text-lg text-neutral-900 dark:text-white mb-4">
                                    Recruiter Throughput Trend (6 Months)
                                </h6>
                                <AudienceStatsChart
                                    series={[
                                        { name: "Submissions", data: monthlySubmissions },
                                        { name: "Selections", data: monthlySelections },
                                    ]}
                                    categories={recentMonths}
                                    colors={["#487FFF", "#10B981"]}
                                    height={350}
                                />
                            </CardContent>
                        </Card>
                    </div>
                    <div className="xl:col-span-4">
                        <AnalysisDonutChart
                            title="Recruitment Pipeline Mix"
                            labels={["L1", "L2", "Final Round", "Selected", "Rejected"]}
                            series={statusDistribution.some((value) => value > 0) ? statusDistribution : [1, 0, 0, 0, 0]}
                            colors={["#06B6D4", "#487FFF", "#F59E0B", "#10B981", "#EF4444"]}
                            totalLabel="Candidates"
                        />
                    </div>
                </div>

                <Card className="border border-gray-200 dark:border-neutral-700 bg-white dark:bg-slate-800 rounded-md shadow-none h-full">
                    <CardContent className="p-0">
                        <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
                            <h6 className="font-semibold text-lg text-neutral-900 dark:text-white">
                                Recruiter Breakdown
                            </h6>
                            <p className="text-sm text-neutral-500">
                                Performance metrics for each recruiter submitting to your pods
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500">Recruiter Details</TableHead>
                                        <TableHead className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500 text-center">Submissions</TableHead>
                                        <TableHead className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500 text-center">In Progress</TableHead>
                                        <TableHead className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500 text-center">Selected</TableHead>
                                        <TableHead className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500 text-center">Rejected</TableHead>
                                        <TableHead className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500 text-end">Conversion Rate</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recruiterRows.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-neutral-500">
                                                No recruiters found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {recruiterRows.map((row) => {
                                        const conversion = row.submissions > 0 ? Math.round((row.selected / row.submissions) * 100) : 0;
                                        return (
                                            <TableRow key={row.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group border-b border-gray-100 dark:border-slate-700">
                                                <TableCell className="px-6 py-4">
                                                    <div>
                                                        <p className="font-semibold text-sm text-neutral-900 dark:text-white capitalize">{row.name}</p>
                                                        <p className="text-xs text-neutral-500 font-mono tracking-tight">{row.email}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-center">
                                                    <span className="font-medium text-neutral-900">{row.submissions}</span>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                                                        {row.inProgress}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                                        {row.selected}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                                                        {row.rejected}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-end">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary rounded-full" style={{ width: `${conversion}%` }}></div>
                                                        </div>
                                                        <span className="text-sm font-semibold text-neutral-900 w-8">{conversion}%</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </>
    );
}
