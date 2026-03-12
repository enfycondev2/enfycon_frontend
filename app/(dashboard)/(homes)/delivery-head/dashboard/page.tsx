import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { auth } from "@/auth";
import { getGreeting } from "@/lib/utils";
import DeliveryStatsCards from "./components/delivery-stats-cards";
import PodSubmissionChart from "./components/pod-submission-chart";
import JobAgingChart from "./components/job-aging-chart";
import UrgentJobsTable from "./components/urgent-jobs-table";
import ManagerPerformanceTable from "@/app/(dashboard)/(homes)/admin/dashboard/components/manager-performance-table";
import { Suspense } from "react";
import LoadingSkeleton from "@/components/loading-skeleton";
import { serverApiClient } from "@/lib/serverApiClient";

export const dynamic = "force-dynamic";

const norm = (value?: string) => (value || "").trim().toUpperCase();

import { fetchAllPages } from "@/lib/pagination";

async function getDeliveryHeadData() {
    try {
        const [jobs, submissions] = await Promise.all([
            fetchAllPages<any>("/jobs"),
            fetchAllPages<any>("/recruiter-submissions")
        ]);

        return { jobs, submissions };
    } catch (error) {
        console.error("Error fetching Delivery Head dashboard data:", error);
        return { jobs: [], submissions: [] };
    }
}

export default async function DeliveryHeadDashboard() {
    const session = await auth();
    const userName = session?.user?.name || "Delivery Head";

    const welcomeMessage = `${getGreeting()}, ${userName}!`;

    const { jobs, submissions } = await getDeliveryHeadData();

    // Calculate Delivery Stats
    const activeHotJobs = jobs.filter((j: any) =>
        norm(j.status) === "ACTIVE" && norm(j.urgency) === "HOT"
    ).length;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklySubmissions = submissions.filter((s: any) => {
        if (!s.submissionDate) return false;
        return new Date(s.submissionDate) >= oneWeekAgo;
    }).length;

    const l1l2Conversion = submissions.filter((s: any) =>
        norm(s.l1Status) === "CLEARED" || norm(s.l2Status) === "CLEARED"
    ).length;

    const offerToJoin = submissions.filter((s: any) =>
        ["OFFER", "JOIN", "SELECTED", "FILLED"].includes(norm(s.finalStatus))
    ).length;

    const stats = {
        activeHotJobs,
        weeklySubmissions: submissions.length, // using total for now to match UI context better
        l1l2Conversion,
        offerToJoin
    };

    // Calculate Job Aging Stats
    const now = new Date();
    let agingStats = [0, 0, 0, 0]; // 0-7, 8-15, 16-30, 30+

    jobs.forEach((job: any) => {
        if (norm(job.status) !== "ACTIVE" || !job.createdAt) return;
        const createdAt = new Date(job.createdAt);
        const diffTime = Math.abs(now.getTime() - createdAt.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 7) agingStats[0]++;
        else if (diffDays <= 15) agingStats[1]++;
        else if (diffDays <= 30) agingStats[2]++;
        else agingStats[3]++;
    });


    const urgentJobs = jobs.filter((job: any) => {
        const s = norm(job.status);
        if (s !== "ACTIVE" && s !== "OPEN" && s !== "IN_PROGRESS" && s !== "SOURCING" && s !== "SUBMITTED") return false;

        const urgency = norm(job.urgency);
        // Default to a month ago if creation date is missing to ensure these jobs show up as aging
        const createdAt = job.createdAt ? new Date(job.createdAt) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const diffDays = Math.ceil(Math.abs(now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        job.daysOpen = diffDays; // attach for later use

        // Critical or High priority are always considered urgent
        if (urgency === "CRITICAL" || urgency === "HIGH") {
            job.reason = urgency === "CRITICAL" ? "Critical Priority" : "High Priority";
            return true;
        }

        // Jobs open for more than 14 days without being filled
        if (diffDays >= 14) {
            job.reason = `Aging Job (${diffDays} Days)`;
            return true;
        }

        return false;
    }).map((job: any) => {
        // compute basic submission count for the job
        const jobSubs = submissions.filter((s: any) => s.jobId === job.id).length;

        return {
            id: job.id,
            title: job.jobTitle || "Untitled Job",
            client: job.clientName || "Unknown Client",
            daysOpen: job.daysOpen || 0,
            submissions: jobSubs,
            priority: norm(job.urgency) || "MEDIUM",
            reason: job.reason || "Unknown",
            pod: job.pod?.name || "Unassigned"
        };
    }).sort((a: any, b: any) => {
        // Sort CRITICAL first, then HIGH, then by oldest days open
        const pValues: Record<string, number> = { "CRITICAL": 3, "HIGH": 2, "MEDIUM": 1, "LOW": 0 };
        const pDiff = (pValues[b.priority] || 0) - (pValues[a.priority] || 0);
        if (pDiff !== 0) return pDiff;
        return b.daysOpen - a.daysOpen;
    }).slice(0, 5); // Only show top 5 urgent jobs

    return (
        <>
            <DashboardBreadcrumb title={welcomeMessage} text="Delivery Dashboard" />
            <div className="p-6 space-y-6">
                <Suspense fallback={<LoadingSkeleton />}>
                    <DeliveryStatsCards stats={stats} />
                </Suspense>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-8">
                        <Suspense fallback={<LoadingSkeleton />}>
                            <PodSubmissionChart />
                        </Suspense>
                    </div>
                    <div className="xl:col-span-4">
                        <Suspense fallback={<LoadingSkeleton />}>
                            <JobAgingChart stats={agingStats} />
                        </Suspense>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <Suspense fallback={<LoadingSkeleton />}>
                        <UrgentJobsTable jobs={urgentJobs} />
                    </Suspense>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <Suspense fallback={<LoadingSkeleton />}>
                        <ManagerPerformanceTable jobs={jobs} />
                    </Suspense>
                </div>
            </div>
        </>
    );
}
