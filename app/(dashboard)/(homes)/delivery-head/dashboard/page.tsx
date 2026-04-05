import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { auth } from "@/auth";
import { getGreeting } from "@/lib/utils";
import StatCard from "@/app/(dashboard)/(homes)/dashboard/components/stat-card";
import PodSubmissionChart from "./components/pod-submission-chart";
import JobAgingChart from "./components/job-aging-chart";
import UrgentJobsTable from "./components/urgent-jobs-table";
import ManagerPerformanceTable from "@/app/(dashboard)/(homes)/admin/dashboard/components/manager-performance-table";
import { Suspense } from "react";
import LoadingSkeleton from "@/components/loading-skeleton";
import { serverApiClient } from "@/lib/serverApiClient";

export const dynamic = "force-dynamic";

async function getDeliveryHeadStats() {
    try {
        const response = await serverApiClient("/dashboard/delivery-head/stats", { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`Failed to fetch stats: ${response.statusText}`);
        }
        const data = await response.json();
        return {
            ...data,
            summaryCards: Array.isArray(data?.summaryCards) ? data.summaryCards : []
        };
    } catch (error) {
        console.error("Error fetching Delivery Head dashboard stats:", error);
        return {
            summaryCards: [],
            agingStats: [0, 0, 0, 0],
            urgentJobs: [],
            podPerformance: []
        };
    }
}

export default async function DeliveryHeadDashboard() {
    const session = await auth();
    const userName = session?.user?.name || "Delivery Head";
    const welcomeMessage = `${getGreeting()}, ${userName}!`;

    // Initiate fetch but keep it as a promise if we want true streaming, 
    // or await it here for a simpler transition (still much faster than before).
    const statsData = await getDeliveryHeadStats();

    return (
        <>
            <DashboardBreadcrumb title={welcomeMessage} text="Delivery Dashboard" />
            <div className="p-6 space-y-6">
                <Suspense fallback={<LoadingSkeleton />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-6">
                        <StatCard data={statsData.summaryCards} />
                    </div>
                </Suspense>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-8">
                        <Suspense fallback={<LoadingSkeleton />}>
                            <PodSubmissionChart initialData={statsData.podPerformance} />
                        </Suspense>
                    </div>
                    <div className="xl:col-span-4">
                        <Suspense fallback={<LoadingSkeleton />}>
                            <JobAgingChart stats={statsData.agingStats} />
                        </Suspense>
                    </div>
                </div>

                {/* <div className="grid grid-cols-1 gap-6">
                    <Suspense fallback={<LoadingSkeleton />}>
                        <UrgentJobsTable jobs={statsData.urgentJobs} />
                    </Suspense>
                </div> */}

                <div className="grid grid-cols-1 gap-6">
                    <Suspense fallback={<LoadingSkeleton />}>
                        <ManagerPerformanceTable />
                    </Suspense>
                </div>
            </div>
        </>
    );
}
