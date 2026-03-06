import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { auth } from "@/auth";
import { getGreeting } from "@/lib/utils";
import { Suspense } from "react";
import LoadingSkeleton from "@/components/loading-skeleton";
import { serverApiClient } from "@/lib/serverApiClient";
import StatCard from "@/app/(dashboard)/(homes)/dashboard/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import AnalysisDonutChart from "@/components/dashboard/admin/AnalysisDonutChart";
import RecruiterProductivityTable from "@/components/dashboard/admin/RecruiterProductivityTable";
import AudienceStatsChart from "@/components/charts/audience-stats-chart";

export const dynamic = "force-dynamic";

interface JobRow {
  id: string;
  status?: string;
  createdAt?: string;
  jobTitle?: string;
  clientName?: string;
}

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

async function getRecruiterJobs(): Promise<JobRow[]> {
  try {
    const response = await serverApiClient("/jobs", {
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to fetch recruiter jobs. Status:", response.status);
      return [];
    }

    const data = await response.json();
    const jobs = Array.isArray(data) ? data : (data?.data ?? data?.content ?? data?.jobs ?? []);
    return Array.isArray(jobs) ? jobs : [];
  } catch (error) {
    console.error("Error fetching recruiter jobs:", error);
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
  } catch (error) {
    console.error("Error fetching recruiter submissions:", error);
    return [];
  }
}

export default async function AdminRecruiterDashboardPage() {
  const session = await auth();
  const userName = session?.user?.name || "Admin";
  const [jobs, submissions] = await Promise.all([getRecruiterJobs(), getSubmissions()]);

  const welcomeMessage = `${getGreeting()}, ${userName}!`;
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((job) => norm(job.status) === "ACTIVE").length;
  const totalSubmissions = submissions.length;

  const l1Count = submissions.filter((s) => norm(s.l1Status) && norm(s.l2Status) === "" && norm(s.l3Status) === "" && !["SELECTED", "REJECTED", "FILLED", "CLOSED"].includes(norm(s.finalStatus))).length;
  const l2Count = submissions.filter((s) => norm(s.l2Status) && norm(s.l3Status) === "" && !["SELECTED", "REJECTED", "FILLED", "CLOSED"].includes(norm(s.finalStatus))).length;
  const finalRoundCount = submissions.filter((s) => norm(s.l3Status) && !["SELECTED", "REJECTED", "FILLED", "CLOSED"].includes(norm(s.finalStatus))).length;
  const selectedCount = submissions.filter((s) => ["SELECTED", "FILLED"].includes(norm(s.finalStatus))).length;
  const rejectedCount = submissions.filter((s) => norm(s.finalStatus) === "REJECTED").length;

  const recruiterMap = new Map<
    string,
    { name: string; email: string; submissions: number; selected: number; rejected: number; inProgress: number }
  >();

  submissions.forEach((submission) => {
    const key = submission.recruiterId || "unknown";
    const displayName =
      submission.recruiter?.fullName ||
      submission.recruiter?.email ||
      key;
    const email = submission.recruiter?.email || key;
    const current = recruiterMap.get(key) || {
      name: displayName,
      email,
      submissions: 0,
      selected: 0,
      rejected: 0,
      inProgress: 0,
    };
    current.submissions += 1;
    if (["SELECTED", "FILLED"].includes(norm(submission.finalStatus))) current.selected += 1;
    if (norm(submission.finalStatus) === "REJECTED") current.rejected += 1;
    if (!["SELECTED", "REJECTED", "FILLED", "CLOSED"].includes(norm(submission.finalStatus))) {
      current.inProgress += 1;
    }
    recruiterMap.set(key, current);
  });

  const recruiterRows = Array.from(recruiterMap.values()).sort(
    (a, b) => b.submissions - a.submissions
  );
  const activeRecruiters = recruiterRows.length;

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
      description: "Contributing in current cycle",
    },
    {
      title: "Open Jobs",
      value: String(activeJobs),
      icon: "BriefcaseBusiness",
      iconBg: "bg-blue-600",
      gradientFrom: "from-blue-600/10",
      growth: `${totalJobs > 0 ? Math.round((activeJobs / totalJobs) * 100) : 0}%`,
      growthIcon: "ArrowUp",
      growthColor: "text-green-600 dark:text-green-400",
      description: "Share of active requisitions",
    },
    {
      title: "Total Submissions",
      value: String(totalSubmissions),
      icon: "FileText",
      iconBg: "bg-purple-600",
      gradientFrom: "from-purple-600/10",
      growth: `${selectedCount}`,
      growthIcon: "ArrowUp",
      growthColor: "text-green-600 dark:text-green-400",
      description: "Selected candidates so far",
    },
    {
      title: "Pipeline In Progress",
      value: String(l1Count + l2Count + finalRoundCount),
      icon: "Timer",
      iconBg: "bg-amber-600",
      gradientFrom: "from-amber-600/10",
      growth: `${l2Count + finalRoundCount}`,
      growthIcon: "ArrowUp",
      growthColor: "text-amber-600 dark:text-amber-400",
      description: "Candidates beyond L1",
    },
  ];

  const recruiterTableRows = recruiterRows.map((row, index) => {
    const conversion = row.submissions > 0 ? Math.round((row.selected / row.submissions) * 100) : 0;
    return {
      id: `${row.email}-${index}`,
      name: row.name,
      email: row.email,
      submissions: row.submissions,
      selected: row.selected,
      rejected: row.rejected,
      inProgress: row.inProgress,
      conversion,
    };
  });

  const topRecruiters = recruiterTableRows.slice(0, 6);
  const recruiterChartCategories = topRecruiters.map((row) => row.name);
  const recruiterChartSeries = [
    { name: "Submissions", data: topRecruiters.map((row) => row.submissions) },
    { name: "Selected", data: topRecruiters.map((row) => row.selected) },
    { name: "Rejected", data: topRecruiters.map((row) => row.rejected) },
  ];

  return (
    <>
      <DashboardBreadcrumb title={welcomeMessage} text="Admin Recruiter Dashboard" />
      <div className="p-6 space-y-6">
        <Suspense fallback={<LoadingSkeleton />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard data={recruiterStats} />
          </div>
        </Suspense>

        <Card className="border border-gray-200 dark:border-neutral-700 bg-white dark:bg-slate-800 rounded-md shadow-none">
          <CardContent className="p-6">
            <h6 className="font-semibold text-lg text-neutral-900 dark:text-white mb-4">
              Recruiter Productivity Analysis
            </h6>
            <RecruiterProductivityTable rows={recruiterTableRows} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8">
            <Card className="border border-gray-200 dark:border-neutral-700 bg-white dark:bg-slate-800 rounded-md shadow-none h-full">
              <CardContent className="p-6">
                <h6 className="font-semibold text-lg text-neutral-900 dark:text-white mb-4">
                  Recruiter Performance Overview
                </h6>
                <div className="apexcharts-tooltip-z-none">
                  <AudienceStatsChart
                    series={recruiterChartSeries}
                    categories={recruiterChartCategories.length ? recruiterChartCategories : ["No Recruiter Data"]}
                    colors={["#487FFF", "#10B981", "#EF4444"]}
                    height={350}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="xl:col-span-4 xl:col-start-9">
            <AnalysisDonutChart
              title="Recruitment Pipeline Mix"
              labels={["L1", "L2", "Final Round", "Selected", "Rejected"]}
              series={statusDistribution.some((value) => value > 0) ? statusDistribution : [1, 0, 0, 0, 0]}
              colors={["#06B6D4", "#487FFF", "#F59E0B", "#10B981", "#EF4444"]}
              totalLabel="Candidates"
            />
          </div>
        </div>
      </div>
    </>
  );
}
