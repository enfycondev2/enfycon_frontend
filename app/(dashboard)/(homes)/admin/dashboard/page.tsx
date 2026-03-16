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

import { fetchAllPages } from "@/lib/pagination";

async function getJobs(): Promise<JobRow[]> {
  return await fetchAllPages<JobRow>("/jobs");
}

async function getSubmissions(): Promise<SubmissionRow[]> {
  return await fetchAllPages<SubmissionRow>("/recruiter-submissions");
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
  const [jobs, submissions, performanceTrends] = await Promise.all([
    getJobs(),
    getSubmissions(),
    getPerformanceTrends("daily")
  ]);

  const welcomeMessage = `${getGreeting()}, ${userName}!`;

  const openJobs = jobs.filter((job) => {
    const s = normalizeStatus(job.status);
    return s === "ACTIVE" || s === "ON_HOLD" || s === "HOLD_BY_CLIENT";
  }).length;

  const stageCounts = submissions.reduce(
    (acc, sub) => {
      const l1Status = normalizeStatus(sub.l1Status);
      const l2Status = normalizeStatus(sub.l2Status);
      const l3Status = normalizeStatus(sub.l3Status);
      const finalStatus = normalizeStatus(sub.finalStatus);

      if (finalStatus === "JOIN" || finalStatus === "JOINED") {
        acc.joined += 1;
      } else if (l3Status === "CLEARED") {
        acc.l3 += 1;
      } else if (l2Status === "CLEARED") {
        acc.l2 += 1;
      } else if (l1Status === "CLEARED") {
        acc.l1 += 1;
      }
      return acc;
    },
    { l1: 0, l2: 0, l3: 0, joined: 0 }
  );

  const totalSubmissions = submissions.length;
  const pipelineCoverage = totalSubmissions > 0
    ? Math.round(((stageCounts.l1 + stageCounts.l2 + stageCounts.l3 + stageCounts.joined) / totalSubmissions) * 100)
    : 0;
  const openRatio = jobs.length > 0 ? Math.round((openJobs / jobs.length) * 100) : 0;

  const adminStats = [
    {
      title: "Total Open Jobs",
      value: String(openJobs),
      icon: "BriefcaseBusiness",
      iconBg: "bg-blue-600",
      gradientFrom: "from-blue-600/10",
      growth: `${openRatio}%`,
      growthIcon: "ArrowUp",
      growthColor: "text-green-600 dark:text-green-400",
      description: "Open roles vs total jobs",
    },
    {
      title: "Total Submissions",
      value: String(totalSubmissions),
      icon: "FileText",
      iconBg: "bg-purple-600",
      gradientFrom: "from-purple-600/10",
      growth: `${pipelineCoverage}%`,
      growthIcon: "ArrowUp",
      growthColor: "text-green-600 dark:text-green-400",
      description: "Tagged in active pipeline stages",
    },
    {
      title: "Candidates in L1",
      value: String(stageCounts.l1),
      icon: "UsersRound",
      iconBg: "bg-cyan-600",
      gradientFrom: "from-cyan-600/10",
      growth: String(stageCounts.l1),
      growthIcon: "ArrowUp",
      growthColor: "text-green-600 dark:text-green-400",
      description: "Currently in screening",
    },
    {
      title: "Candidates in L2",
      value: String(stageCounts.l2),
      icon: "Timer",
      iconBg: "bg-orange-600",
      gradientFrom: "from-orange-600/10",
      growth: String(stageCounts.l2),
      growthIcon: "ArrowUp",
      growthColor: "text-green-600 dark:text-green-400",
      description: "Technical rounds scheduled",
    },
    {
      title: "Candidates in L3",
      value: String(stageCounts.l3),
      icon: "UsersRound",
      iconBg: "bg-indigo-600",
      gradientFrom: "from-indigo-600/10",
      growth: String(stageCounts.l3),
      growthIcon: "ArrowUp",
      growthColor: "text-green-600 dark:text-green-400",
      description: "Final technical rounds",
    },
    {
      title: "Successfully Placed",
      value: String(stageCounts.joined),
      icon: "CheckCircle",
      iconBg: "bg-green-600",
      gradientFrom: "from-green-600/10",
      growth: String(stageCounts.joined),
      growthIcon: "ArrowUp",
      growthColor: "text-green-600 dark:text-green-400",
      description: "Successfully onboarded",
    },
  ];

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
            <DatewiseSubmissionTable jobs={jobs} initialTrends={performanceTrends} />
          </Suspense>
        </div>

        <div className="xl:col-span-12">
          <Suspense fallback={<LoadingSkeleton />}>
            <ManagerPerformanceTable jobs={jobs} />
          </Suspense>
        </div>

        <div className="xl:col-span-12">
          <Suspense fallback={<LoadingSkeleton />}>
            <PodPerformanceTable jobs={jobs} submissions={submissions} />
          </Suspense>
        </div>

        <div className="xl:col-span-12">
          <Suspense fallback={<LoadingSkeleton />}>
            <RecruiterPerformanceTable jobs={jobs} submissions={submissions} />
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
