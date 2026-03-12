"use client";

import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import LoadingSkeleton from "@/components/loading-skeleton";
import { getGreeting } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import StatCard from "@/app/(dashboard)/(homes)/dashboard/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import AccountManagerProductivityTable, { AccountManagerTableRow } from "@/components/dashboard/admin/AccountManagerProductivityTable";
import { apiClient } from "@/lib/apiClient";

export default function AdminAccountManagerDashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Admin";
  const [data, setData] = useState<AccountManagerTableRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient("/dashboard/admin/am-productivity");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Error fetching AM productivity:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const welcomeMessage = `${getGreeting()}, ${userName}!`;

  // Calculate high-level stats from the "all" metrics
  const totalAMs = data.length;
  const totalJobs = data.reduce((acc, row) => acc + row.metrics.all.postedJobs, 0);
  const activeJobs = data.reduce((acc, row) => acc + row.metrics.all.activeJobs, 0);
  const totalClosures = data.reduce((acc, row) => acc + row.metrics.all.closures, 0);
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
      title: "Total Jobs Posted",
      value: String(totalJobs),
      icon: "BriefcaseBusiness",
      iconBg: "bg-blue-600",
      gradientFrom: "from-blue-600/10",
      growth: `${totalJobs}`,
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
      growth: `${activeJobs}`,
      growthIcon: "ArrowUp",
      growthColor: "text-green-600 dark:text-green-400",
      description: "Currently in hiring pipeline",
    },
    {
      title: "Total Closures",
      value: String(totalClosures),
      icon: "FileText",
      iconBg: "bg-purple-600",
      gradientFrom: "from-purple-600/10",
      growth: `${totalClosures}`,
      growthIcon: "ArrowUp",
      growthColor: "text-green-600 dark:text-green-400",
      description: "Total candidates joined",
    },
  ];

  return (
    <>
      <DashboardBreadcrumb title={welcomeMessage} text="Admin Account Manager Dashboard" />
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
            <AccountManagerProductivityTable rows={data} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
