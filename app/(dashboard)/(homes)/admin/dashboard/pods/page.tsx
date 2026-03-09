import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import LoadingSkeleton from "@/components/loading-skeleton";
import { getGreeting } from "@/lib/utils";
import { auth } from "@/auth";
import { Suspense } from "react";
import { serverApiClient } from "@/lib/serverApiClient";
import StatCard from "@/app/(dashboard)/(homes)/dashboard/components/stat-card";
import AudienceStatsChart from "@/components/charts/audience-stats-chart";
import AnalysisDonutChart from "@/components/dashboard/admin/AnalysisDonutChart";
import { Card, CardContent } from "@/components/ui/card";
import PodsTable from "@/components/dashboard/delivery-head/PodsTable";

export const dynamic = "force-dynamic";

interface JobRow {
  id: string;
  status?: string;
  urgency?: string;
  createdAt?: string;
  updatedAt?: string;
  pod?: { id: string; name: string } | null;
  pods?: Array<{ id: string; name: string }>;
  podIds?: string[];
  positions?: number;
  submissionRequired?: number;
  submissionDone?: number;
}

interface PodMember {
  id?: string;
  fullName?: string | null;
  email?: string;
}

interface PodRow {
  id: string;
  name: string;
  podHead?: PodMember | null;
  recruiters?: PodMember[];
  jobs?: Array<{ id?: string }>;
  _count?: {
    jobs?: number;
  };
  createdAt?: string;
  updatedAt?: string;
  totalPositions?: number;
  submissionRequired?: number;
  submissionDone?: number;
  submissionRate?: number;
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

async function getPods(): Promise<PodRow[]> {
  try {
    const response = await serverApiClient("/pods/all", { cache: "no-store" });
    if (!response.ok) {
      const fallbackResponse = await serverApiClient("/pods", { cache: "no-store" });
      if (!fallbackResponse.ok) return [];
      const fallbackData = await fallbackResponse.json();
      const fallbackPods = Array.isArray(fallbackData)
        ? fallbackData
        : (fallbackData?.data ?? fallbackData?.content ?? fallbackData?.pods ?? []);
      return Array.isArray(fallbackPods) ? fallbackPods : [];
    }

    const data = await response.json();
    const pods = Array.isArray(data) ? data : (data?.data ?? data?.content ?? data?.pods ?? []);
    return Array.isArray(pods) ? pods : [];
  } catch {
    return [];
  }
}

export default async function AdminPodsDashboardPage() {
  const session = await auth();
  const userName = session?.user?.name || "Admin";
  const [jobs, pods] = await Promise.all([getJobs(), getPods()]);

  const welcomeMessage = `${getGreeting()}, ${userName}!`;

  const norm = (value?: string) => (value || "").trim().toUpperCase();
  const podIdSet = new Set(pods.map((pod) => pod.id));
  const podBuckets = new Map<string, { total: number; active: number; filled: number; positions: number; subReq: number; subDone: number }>();

  for (const job of jobs) {
    const linkedPods = new Map<string, string>();
    if (job.pod?.id && job.pod?.name) linkedPods.set(job.pod.id, job.pod.name);
    (job.pods || []).forEach((p) => linkedPods.set(p.id, p.name));

    const linkedPodIds = new Set([
      ...Array.from(linkedPods.keys()),
      ...(job.podIds || []),
    ]);

    if (linkedPods.size === 0 && linkedPodIds.size > 0) {
      linkedPodIds.forEach((id) => {
        const pod = pods.find((p) => p.id === id);
        if (pod) linkedPods.set(pod.id, pod.name);
      });
    }

    if (linkedPods.size === 0) continue;

    linkedPods.forEach((podName, podId) => {
      if (!podIdSet.has(podId)) return;
      const current = podBuckets.get(podName) || { total: 0, active: 0, filled: 0, positions: 0, subReq: 0, subDone: 0 };
      current.total += 1;
      if (norm(job.status) === "ACTIVE") current.active += 1;
      if (norm(job.status) === "FILLED") current.filled += 1;
      current.positions += (job.positions || 1);
      current.subReq += (job.submissionRequired || 0);
      current.subDone += (job.submissionDone || 0);
      podBuckets.set(podName, current);
    });
  }

  const podsWithJobs = pods.filter((pod) => (pod._count?.jobs ?? pod.jobs?.length ?? 0) > 0);
  const totalPods = podsWithJobs.length;
  const jobsAssignedToPods = pods.reduce(
    (sum, pod) => sum + (pod._count?.jobs ?? pod.jobs?.length ?? 0),
    0
  );

  const hotRequisitions = jobs.filter((job) => {
    const hasPodLink =
      !!job.pod?.id ||
      (job.pods && job.pods.length > 0) ||
      (job.podIds && job.podIds.length > 0);
    const s = norm(job.status);
    const u = norm(job.urgency);
    return hasPodLink && (s === "ACTIVE" || s === "OPEN") && (u === "HOT" || u === "CRITICAL");
  }).length;
  const activeJobs = jobs.filter((job) => {
    const hasPodLink =
      !!job.pod?.id ||
      (job.pods && job.pods.length > 0) ||
      (job.podIds && job.podIds.length > 0);
    return hasPodLink && norm(job.status) === "ACTIVE";
  }).length;
  const avgJobsPerPod = totalPods ? (jobsAssignedToPods / totalPods).toFixed(1) : "0";

  const podStats = [
    {
      title: "Total Active Pods",
      value: String(totalPods),
      icon: "UsersRound",
      iconBg: "bg-cyan-600",
      gradientFrom: "from-cyan-600/10",
      growth: `${totalPods}`,
      growthIcon: "ArrowUp",
      growthColor: "text-green-600 dark:text-green-400",
      description: "Pods with active requisitions",
    },
    {
      title: "Jobs Assigned To Pods",
      value: String(jobsAssignedToPods),
      icon: "BriefcaseBusiness",
      iconBg: "bg-blue-600",
      gradientFrom: "from-blue-600/10",
      growth: `${activeJobs}`,
      growthIcon: "ArrowUp",
      growthColor: "text-green-600 dark:text-green-400",
      description: "Currently active jobs",
    },
    {
      title: "Hot Requisitions",
      value: String(hotRequisitions),
      icon: "Timer",
      iconBg: "bg-orange-600",
      gradientFrom: "from-orange-600/10",
      growth: `${hotRequisitions}`,
      growthIcon: "ArrowUp",
      growthColor: hotRequisitions > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400",
      description: "Hot or Critical requisitions",
    },
    {
      title: "Average Jobs Per Pod",
      value: avgJobsPerPod,
      icon: "FileText",
      iconBg: "bg-purple-600",
      gradientFrom: "from-purple-600/10",
      growth: `${jobsAssignedToPods}`,
      growthIcon: "ArrowUp",
      growthColor: "text-green-600 dark:text-green-400",
      description: "Load balancing indicator",
    },
  ];

  const podsForTable = pods
    .map((pod) => ({
      id: pod.id,
      name: pod.name || "Unnamed Pod",
      podHead: {
        id: pod.podHead?.id || "",
        fullName: pod.podHead?.fullName || null,
        email: pod.podHead?.email || "",
      },
      recruiters: (pod.recruiters || []).map((recruiter) => ({
        id: recruiter.id || "",
        fullName: recruiter.fullName || null,
        email: recruiter.email || "",
      })),
      jobs:
        typeof pod._count?.jobs === "number"
          ? Array.from({ length: pod._count.jobs }, (_, i) => ({ id: `${pod.id}-${i}` }))
          : (pod.jobs || []),
      _count: {
        recruiters: (pod.recruiters || []).length,
        jobs: pod._count?.jobs ?? pod.jobs?.length ?? 0,
      },
      createdAt: "",
      updatedAt: pod.updatedAt || new Date(0).toISOString(),
      totalPositions: podBuckets.get(pod.name || "Unnamed Pod")?.positions || 0,
      submissionRequired: podBuckets.get(pod.name || "Unnamed Pod")?.subReq || 0,
      submissionDone: podBuckets.get(pod.name || "Unnamed Pod")?.subDone || 0,
      submissionRate: Math.round(
        ((podBuckets.get(pod.name || "Unnamed Pod")?.subDone || 0) /
          (podBuckets.get(pod.name || "Unnamed Pod")?.subReq || 1)) * 100
      ),
      isAvailableForAssignment: (pod as any).isAvailableForAssignment !== false,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  const topPods = podsForTable.slice(0, 6);
  const categories = topPods.map((pod) => pod.name);
  const podSeries = [
    { name: "Total Jobs", data: topPods.map((pod) => pod._count.jobs ?? 0) },
    {
      name: "Active",
      data: topPods.map((pod) => {
        const bucket = podBuckets.get(pod.name);
        return bucket?.active ?? 0;
      }),
    },
    {
      name: "Filled",
      data: topPods.map((pod) => {
        const bucket = podBuckets.get(pod.name);
        return bucket?.filled ?? 0;
      }),
    },
  ];

  const statusSeries = [
    jobs.filter((j) => norm(j.status) === "ACTIVE").length,
    jobs.filter((j) => norm(j.status) === "ON_HOLD" || norm(j.status) === "HOLD_BY_CLIENT").length,
    jobs.filter((j) => norm(j.status) === "FILLED").length,
    jobs.filter((j) => norm(j.status) === "CLOSED").length,
  ];

  return (
    <>
      <DashboardBreadcrumb title={welcomeMessage} text="Pods " />
      <div className="p-6 space-y-6">
        <Suspense fallback={<LoadingSkeleton />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard data={podStats} />
          </div>
        </Suspense>

        <Card className="border border-gray-200 dark:border-neutral-700 bg-white dark:bg-slate-800 rounded-md shadow-none">
          <CardContent className="p-6">
            <h6 className="font-semibold text-lg text-neutral-900 dark:text-white mb-4">All Pods</h6>
            <PodsTable
              pods={podsForTable}
              jobs={jobs}
              showActions={false}
              basePath="/admin/dashboard/pods"
              showSorting={true}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8">
            <Card className="border border-gray-200 dark:border-neutral-700 bg-white dark:bg-slate-800 rounded-md shadow-none h-full">
              <CardContent className="p-6">
                <h6 className="font-semibold text-lg text-neutral-900 dark:text-white mb-4">
                  Pod Throughput Analysis
                </h6>
                <div className="apexcharts-tooltip-z-none">
                  <AudienceStatsChart
                    series={podSeries}
                    categories={categories.length ? categories : ["No Pod Data"]}
                    colors={["#487FFF", "#10B981", "#8B5CF6"]}
                    height={350}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="xl:col-span-4">
            <AnalysisDonutChart
              title="Pod Job Status Mix"
              labels={["Active", "On Hold", "Filled", "Closed"]}
              series={statusSeries.some((v) => v > 0) ? statusSeries : [1, 0, 0, 0]}
              colors={["#10B981", "#F59E0B", "#487FFF", "#EF4444"]}
              totalLabel="Jobs"
            />
          </div>
        </div>
      </div>
    </>
  );
}
