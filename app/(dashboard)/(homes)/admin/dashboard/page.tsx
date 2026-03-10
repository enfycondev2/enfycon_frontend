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
const hasStageValue = (status?: string) => normalizeStatus(status) !== "";
const isFinalized = (status?: string) => {
  const s = normalizeStatus(status);
  return ["SELECTED", "REJECTED", "FILLED", "CLOSED", "JOIN", "OFFER"].includes(s);
};

function getCurrentPipelineStage(submission: SubmissionRow) {
  const finalStatus = normalizeStatus(submission.finalStatus);
  if (finalStatus === "JOIN" || finalStatus === "JOINED") return "JOINED";
  if (isFinalized(submission.finalStatus)) return "FINALIZED";

  // Check from latest to earliest stage. 
  // If the stage is "PENDING", it means they haven't cleared it yet, so we don't count them as IN that stage.
  // We count them in the NEXT stage if it's pending, but normally they should have cleared previous rounds.
  // If a stage has ANY value OTHER than PENDING/REJECTED, they are AT LEAST in that stage
  const l3 = normalizeStatus(submission.l3Status);
  const l2 = normalizeStatus(submission.l2Status);
  const l1 = normalizeStatus(submission.l1Status);

  // Consider it "L3" if L3 has started assessing them (e.g. SCHEDULED, SELECTED)
  if (l3 !== "" && l3 !== "PENDING" && l3 !== "REJECTED") return "L3";
  // Consider it "L2" if L2 has started but L3 is barely pending or empty
  if (l2 !== "" && l2 !== "PENDING" && l2 !== "REJECTED") return "L2";
  // Consider it "L1" if L1 has started ...
  if (l1 !== "" && l1 !== "PENDING" && l1 !== "REJECTED") return "L1";
  
  return "UNSTAGED";
}

async function getJobs(): Promise<JobRow[]> {
  try {
    const firstResponse = await serverApiClient("/jobs?page=1&limit=100", { cache: "no-store" });
    if (!firstResponse.ok) return [];
    const firstData = await firstResponse.json();
    let allJobs = Array.isArray(firstData?.data) ? firstData.data : (Array.isArray(firstData) ? firstData : []);
    
    const totalPages = firstData?.totalPages || 1;
    if (totalPages > 1) {
      const promises = [];
      for (let i = 2; i <= totalPages; i++) {
        promises.push(serverApiClient(`/jobs?page=${i}&limit=100`, { cache: "no-store" }).then(res => res.json()));
      }
      const results = await Promise.all(promises);
      results.forEach(res => {
        const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        allJobs = [...allJobs, ...arr];
      });
    }
    return allJobs;
  } catch {
    return [];
  }
}

async function getSubmissions(): Promise<SubmissionRow[]> {
  try {
    const firstResponse = await serverApiClient("/recruiter-submissions?page=1&limit=100", { cache: "no-store" });
    if (!firstResponse.ok) return [];
    const firstData = await firstResponse.json();
    let allSubmissions = Array.isArray(firstData?.data) 
      ? firstData.data 
      : (Array.isArray(firstData?.submissions) ? firstData.submissions : (Array.isArray(firstData) ? firstData : []));
    
    const totalPages = firstData?.totalPages || 1;
    if (totalPages > 1) {
      const promises = [];
      for (let i = 2; i <= totalPages; i++) {
        promises.push(serverApiClient(`/recruiter-submissions?page=${i}&limit=100`, { cache: "no-store" }).then(res => res.json()));
      }
      const results = await Promise.all(promises);
      results.forEach(res => {
        const arr = Array.isArray(res?.data) 
          ? res.data 
          : (Array.isArray(res?.submissions) ? res.submissions : (Array.isArray(res) ? res : []));
        allSubmissions = [...allSubmissions, ...arr];
      });
    }
    return allSubmissions;
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name || "User";
  const [jobs, submissions] = await Promise.all([getJobs(), getSubmissions()]);

  const welcomeMessage = `${getGreeting()}, ${userName}!`;

  const openJobs = jobs.filter((job) => {
    const s = normalizeStatus(job.status);
    return s === "ACTIVE" || s === "ON_HOLD" || s === "HOLD_BY_CLIENT";
  }).length;

  const stageCounts = submissions.reduce(
    (acc, sub) => {
      const stage = getCurrentPipelineStage(sub);
      if (stage === "L1") acc.l1 += 1;
      if (stage === "L2") acc.l2 += 1;
      if (stage === "L3") acc.l3 += 1;
      if (stage === "JOINED") acc.joined += 1;
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
            <DatewiseSubmissionTable jobs={jobs} />
          </Suspense>
        </div>

        <div className="xl:col-span-12">
          <Suspense fallback={<LoadingSkeleton />}>
            <ManagerPerformanceTable jobs={jobs} />
          </Suspense>
        </div>

        <div className="xl:col-span-12">
          <Suspense fallback={<LoadingSkeleton />}>
            <PodPerformanceTable jobs={jobs} />
          </Suspense>
        </div>

        <div className="xl:col-span-12">
          <Suspense fallback={<LoadingSkeleton />}>
            <RecruiterPerformanceTable jobs={jobs} />
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
