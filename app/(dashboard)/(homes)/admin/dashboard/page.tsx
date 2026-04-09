import GenerateContentCard from "@/app/(dashboard)/(homes)/dashboard/components/generate-content-card";
import SalesStaticCard from "@/app/(dashboard)/(homes)/dashboard/components/sales-static-card";
import StatCard from "@/app/(dashboard)/(homes)/dashboard/components/stat-card";
import TabsWithTableCard from "@/app/(dashboard)/(homes)/dashboard/components/tabs-with-table-card";
import TopCountriesCard from "@/app/(dashboard)/(homes)/dashboard/components/top-countries-card";
import TopPerformerCard from "@/app/(dashboard)/(homes)/dashboard/components/top-performer-card";
import TotalSubscriberCard from "@/app/(dashboard)/(homes)/dashboard/components/total-subscriber-card";
import UserOverviewCard from "@/app/(dashboard)/(homes)/dashboard/components/user-overview-card";
import PodPerformanceCard from "@/app/(dashboard)/(homes)/dashboard/components/pod-performance-card";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import LoadingSkeleton from "@/components/loading-skeleton";
import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/auth";
import { getGreeting } from "@/lib/utils";
import { serverApiClient } from "@/lib/serverApiClient";
import ManagerPerformanceTable from "./components/manager-performance-table";
import PodPerformanceTable from "./components/pod-performance-table";
import RecruiterPerformanceTable from "./components/recruiter-performance-table";
import DatewiseSubmissionTable from "./components/datewise-submission-table";

export const metadata: Metadata = {
  title: "Admin Dashboard | enfySync",
  description: "Recruitment Management Dashboard",
};

interface JobRow {
  id: string;
  jobCode?: string;
  status: string;
  accountManager?: {
    id: string;
    fullName: string;
    email: string;
  };
  pod?: {
    id: string;
    name: string;
  };
  requirementType?: string;
  submissionRequired?: number;
  submissionDone?: number;
  createdAt: string;
  updatedAt: string;
  noOfPositions?: number;
  positions?: number;
}

interface SubmissionRow {
  jobId?: string;
  l1Status?: string;
  l2Status?: string;
  l3Status?: string;
  finalStatus?: string;
}

const normalizeStatus = (status?: string) => (status || "").trim().toUpperCase();

async function getAdminStats(): Promise<any> {
  try {
    const response = await serverApiClient("/dashboard/admin/stats", { cache: "no-store" });
    if (!response.ok) return { summaryCards: [], agingStats: [], urgentJobs: [], podPerformance: [] };
    return await response.json();
  } catch {
    return { summaryCards: [], agingStats: [], urgentJobs: [], podPerformance: [] };
  }
}

async function getPerformanceTrends(interval: string = "daily"): Promise<any[]> {
  try {
    const response = await serverApiClient(`/dashboard/admin/performance-trends?interval=${interval}`, { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.data) ? data.data : [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name || "User";
  const [stats, performanceTrends] = await Promise.all([
    getAdminStats(),
    getPerformanceTrends("daily")
  ]);

  const welcomeMessage = `${getGreeting()}, ${userName}!`;

  const adminStats = stats.summaryCards;

  return (
    <>
      <DashboardBreadcrumb title={welcomeMessage} text="Admin Dashboard" />

      <Suspense fallback={<LoadingSkeleton />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-6">
          <StatCard data={adminStats} />
        </div>
      </Suspense>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
        {/* Performance Tables - Added as per USER_REQUEST */}
        <div className="xl:col-span-12">
          <Suspense fallback={<LoadingSkeleton />}>
            <DatewiseSubmissionTable initialTrends={performanceTrends} />
          </Suspense>
        </div>

        <div className="xl:col-span-12">
          <Suspense fallback={<LoadingSkeleton />}>
            <ManagerPerformanceTable />
          </Suspense>
        </div>

        <div className="xl:col-span-12">
          <Suspense fallback={<LoadingSkeleton />}>
            <PodPerformanceTable />
          </Suspense>
        </div>

        <div className="xl:col-span-12">
          <Suspense fallback={<LoadingSkeleton />}>
            <RecruiterPerformanceTable />
          </Suspense>
        </div>

        {/* <div className="xl:col-span-12 2xl:col-span-6">
          <Suspense fallback={<LoadingSkeleton />}>
            <SalesStaticCard
              title="Recruitment Throughput"
              value="156 Placements"
              subtitle="+ 12 from last month"
              percentage="15%"
            />
          </Suspense>
        </div>

        <div className="xl:col-span-12 2xl:col-span-6">
          <Suspense fallback={<LoadingSkeleton />}>
            <PodPerformanceCard />
          </Suspense>
        </div>

        <div className="xl:col-span-6 2xl:col-span-8">
          <Suspense fallback={<LoadingSkeleton />}>
            <TotalSubscriberCard />
          </Suspense>
        </div>

        <div className="xl:col-span-6 2xl:col-span-4">
          <Suspense fallback={<LoadingSkeleton />}>
            <UserOverviewCard />
          </Suspense>
        </div>

        <div className="xl:col-span-12 2xl:col-span-9">
          <Suspense fallback={<LoadingSkeleton />}>
            <TabsWithTableCard />
          </Suspense>
        </div>

        <div className="xl:col-span-12 2xl:col-span-3">
          <Suspense fallback={<LoadingSkeleton />}>
            <TopPerformerCard />
          </Suspense>
        </div>

        <div className="xl:col-span-12 2xl:col-span-6">
          <Suspense fallback={<LoadingSkeleton />}>
            <TopCountriesCard />
          </Suspense>
        </div>

        <div className="xl:col-span-12 2xl:col-span-6">
          <Suspense fallback={<LoadingSkeleton />}>
            <GenerateContentCard />
          </Suspense>
        </div> */}
      </div>
    </>
  );
}
