import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import LoadingSkeleton from "@/components/loading-skeleton";
import { getGreeting } from "@/lib/utils";
import { auth } from "@/auth";
import { Suspense } from "react";
import { serverApiClient } from "@/lib/serverApiClient";
import StatCard from "@/app/(dashboard)/(homes)/dashboard/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import AccountManagerProductivityTable from "@/components/dashboard/admin/AccountManagerProductivityTable";
import ManagerPerformanceTable from "@/app/(dashboard)/(homes)/admin/dashboard/components/manager-performance-table";

export const dynamic = "force-dynamic";

interface JobRow {
  id: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  accountManager?: {
    id?: string;
    email?: string;
    fullName?: string | null;
  } | null;
  requirementType?: string;
  noOfPositions?: number;
  positions?: number;
  submissionDone?: number;
  submissionRequired?: number;
}

async function getJobs(): Promise<JobRow[]> {
  try {
    const response = await serverApiClient("/jobs", { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json();
    const jobs = Array.isArray(data) ? data : (data?.data ?? data?.content ?? data?.jobs ?? []);
    return Array.isArray(jobs) ? jobs : [];
  } catch {
    return [];
  }
}

export default async function DeliveryHeadAccountManagerPage() {
  const session = await auth();
  const userName = session?.user?.name || "Delivery Head";
  const jobs = await getJobs();

  const welcomeMessage = `${getGreeting()}, ${userName}!`;

  const norm = (value?: string) => (value || "").trim().toUpperCase();
  const amBuckets = new Map<string, { id: string; name: string; jobs: number; active: number; filled: number; blocked: number }>();

  for (const job of jobs) {
    const key = job.accountManager?.email || "unassigned";
    const name = job.accountManager?.fullName || job.accountManager?.email || "Unassigned";
    const id = job.accountManager?.id || "";
    const current = amBuckets.get(key) || { id, name, jobs: 0, active: 0, filled: 0, blocked: 0 };
    current.jobs += 1;
    if (norm(job.status) === "ACTIVE") current.active += 1;
    if (norm(job.status) === "FILLED") current.filled += 1;
    if (norm(job.status) === "ON_HOLD" || norm(job.status) === "HOLD_BY_CLIENT") current.blocked += 1;
    amBuckets.set(key, current);
  }

  const amRows = Array.from(amBuckets.entries())
    .filter(([key]) => key !== "unassigned")
    .sort((a, b) => b[1].jobs - a[1].jobs);

  const totalAMs = amRows.length;
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((j) => norm(j.status) === "ACTIVE").length;
  const blockedJobs = jobs.filter((j) => norm(j.status) === "ON_HOLD" || norm(j.status) === "HOLD_BY_CLIENT").length;
  const avgJobsPerAM = totalAMs ? (totalJobs / totalAMs).toFixed(1) : "0";

  const amStats = [
    {
      title: "Active Account Managers",
      value: String(totalAMs),
      icon: "UsersRound",
      iconBg: "bg-cyan-600",
      gradientFrom: "from-cyan-600/10",
      growth: `${totalAMs}`,
      growthIcon: "ArrowUp",
      growthColor: "text-green-600 dark:text-green-400",
      description: "Posting jobs this cycle",
    },
    {
      title: "Total Requisitions Posted",
      value: String(totalJobs),
      icon: "BriefcaseBusiness",
      iconBg: "bg-blue-600",
      gradientFrom: "from-blue-600/10",
      growth: `${activeJobs}`,
      growthIcon: "ArrowUp",
      growthColor: "text-green-600 dark:text-green-400",
      description: "Across all account managers",
    },
    {
      title: "Active Open Requisitions",
      value: String(activeJobs),
      icon: "Timer",
      iconBg: "bg-amber-600",
      gradientFrom: "from-amber-600/10",
      growth: `${blockedJobs}`,
      growthIcon: "ArrowUp",
      growthColor: blockedJobs > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400",
      description: "Currently in hiring pipeline",
    },
    {
      title: "Avg Jobs / Account Manager",
      value: avgJobsPerAM,
      icon: "FileText",
      iconBg: "bg-purple-600",
      gradientFrom: "from-purple-600/10",
      growth: `${totalJobs}`,
      growthIcon: "ArrowUp",
      growthColor: "text-green-600 dark:text-green-400",
      description: "Workload distribution index",
    },
  ];

  const now = new Date();
  const isWithinRange = (dateValue: string | undefined, range: "day" | "week" | "month" | "quarter" | "year") => {
    if (!dateValue) return false;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return false;
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return false;

    switch (range) {
      case "day":
        return diffMs <= 24 * 60 * 60 * 1000;
      case "week":
        return diffMs <= 7 * 24 * 60 * 60 * 1000;
      case "month":
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      case "quarter": {
        const nowQuarter = Math.floor(now.getMonth() / 3);
        const dateQuarter = Math.floor(date.getMonth() / 3);
        return date.getFullYear() === now.getFullYear() && dateQuarter === nowQuarter;
      }
      case "year":
        return date.getFullYear() === now.getFullYear();
      default:
        return true;
    }
  };

  const getMetrics = (rows: JobRow[]) => {
    const postedJobs = rows.length;
    const activeJobs = rows.filter((j) => norm(j.status) === "ACTIVE").length;
    const closures = rows.filter((j) => norm(j.status) === "FILLED").length;
    const totalPositions = rows.reduce((acc, j) => acc + (j.positions || j.noOfPositions || 0), 0);
    const submissions = rows.reduce((acc, j) => acc + (j.submissionDone || 0), 0);
    const closureRate = postedJobs > 0 ? Math.round((closures / postedJobs) * 100) : 0;
    
    return { 
      postedJobs, 
      activeJobs, 
      totalPositions, 
      submissions, 
      closures, 
      closureRate 
    };
  };

  const jobsByAM = new Map<string, JobRow[]>();
  for (const job of jobs) {
    const key = job.accountManager?.email || "unassigned";
    if (!jobsByAM.has(key)) jobsByAM.set(key, []);
    jobsByAM.get(key)?.push(job);
  }

  const amTableRows = amRows
    .filter(([email]) => email.toLowerCase() !== "sambit@enfycon.com")
    .map(([email, v]) => {
      const amJobs = jobsByAM.get(email) || [];
      return {
        id: v.id || email,
        email,
        name: v.name,
        metrics: {
          all: getMetrics(amJobs),
          day: getMetrics(amJobs.filter((j) => isWithinRange(j.createdAt, "day"))),
          week: getMetrics(amJobs.filter((j) => isWithinRange(j.createdAt, "week"))),
          month: getMetrics(amJobs.filter((j) => isWithinRange(j.createdAt, "month"))),
          quarter: getMetrics(amJobs.filter((j) => isWithinRange(j.createdAt, "quarter"))),
          year: getMetrics(amJobs.filter((j) => isWithinRange(j.createdAt, "year"))),
        },
      };
    });

  return (
    <>
      <DashboardBreadcrumb title={welcomeMessage} text="Account Manager Dashboard" />
      <div className="p-6 space-y-6">
        <Suspense fallback={<LoadingSkeleton />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard data={amStats} />
          </div>
        </Suspense>

        <Card className="border border-gray-200 dark:border-neutral-700 bg-white dark:bg-slate-800 rounded-md shadow-none">
          <CardContent className="p-6">
            <h6 className="font-semibold text-lg text-neutral-900 dark:text-white mb-4">
              Account Manager Productivity Analysis
            </h6>
            <AccountManagerProductivityTable rows={amTableRows} />
          </CardContent>
        </Card>

        <ManagerPerformanceTable jobs={jobs} />
      </div>
    </>
  );
}
