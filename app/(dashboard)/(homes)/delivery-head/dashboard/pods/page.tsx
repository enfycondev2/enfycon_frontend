import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { auth } from "@/auth";
import PodsTable from "@/components/dashboard/delivery-head/PodsTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { serverApiClient } from "@/lib/serverApiClient";
import ResetPodsButton from "@/components/dashboard/delivery-head/ResetPodsButton";
import PodCycleStatusPanel, { type CycleStatusData } from "@/components/dashboard/delivery-head/PodCycleStatusPanel";

export const dynamic = 'force-dynamic';

async function getJobs() {
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

async function getPods() {
    try {
        const response = await serverApiClient("/pods/all", {
            cache: 'no-store',
        });

        if (!response.ok) {
            const fallback = await serverApiClient("/pods/my-pods", { cache: 'no-store' });
            if (!fallback.ok) {
                console.error("Failed to fetch pods. Status:", response.status);
                return [];
            }
            return fallback.json();
        }

        return response.json();
    } catch (error) {
        console.error("Error fetching pods:", error);
        return [];
    }
}

async function getCycleStatus(): Promise<CycleStatusData | null> {
    try {
        const response = await serverApiClient("/pods/cycle-status", { cache: 'no-store' });
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

export default async function DeliveryHeadPodsPage() {
    const [pods, jobs, cycleStatus] = await Promise.all([getPods(), getJobs(), getCycleStatus()]);

    const norm = (value?: string) => (value || "").trim().toUpperCase();
    const podIdSet = new Set(pods.map((pod: any) => pod.id));
    const podBuckets = new Map<string, { positions: number; subReq: number; subDone: number }>();

    for (const job of jobs) {
        const linkedPods = new Map<string, string>();
        if (job.pod?.id && job.pod?.name) linkedPods.set(job.pod.id, job.pod.name);
        (job.pods || []).forEach((p: any) => linkedPods.set(p.id, p.name));

        const linkedPodIds = new Set([
            ...Array.from(linkedPods.keys()),
            ...(job.podIds || []),
        ]);

        if (linkedPods.size === 0 && linkedPodIds.size > 0) {
            linkedPodIds.forEach((id) => {
                const pod = pods.find((p: any) => p.id === id);
                if (pod) linkedPods.set(pod.id, pod.name);
            });
        }

        if (linkedPods.size === 0) continue;

        linkedPods.forEach((podName, podId) => {
            if (!podIdSet.has(podId)) return;
            const current = podBuckets.get(podName) || { positions: 0, subReq: 0, subDone: 0 };
            current.positions += (job.positions || job.noOfPositions || 1);
            current.subReq += (job.submissionRequired || 0);
            current.subDone += (job.submissionDone || 0);
            podBuckets.set(podName, current);
        });
    }

    const podsForTable = pods.map((pod: any) => ({
        ...pod,
        totalPositions: podBuckets.get(pod.name)?.positions || 0,
        submissionRequired: podBuckets.get(pod.name)?.subReq || 0,
        submissionDone: podBuckets.get(pod.name)?.subDone || 0,
        submissionRate: Math.round(
            ((podBuckets.get(pod.name)?.subDone || 0) /
                (podBuckets.get(pod.name)?.subReq || 1)) * 100
        ),
    }));

    return (
        <>
            <DashboardBreadcrumb title="All Pods" text="Pods" />
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <p className="text-muted-foreground italic text-sm">Managing recruitment pods and assigning team leaders.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <ResetPodsButton />
                        <Button asChild className="h-10 px-4 bg-primary hover:bg-primary/90">
                            <Link href="/delivery-head/dashboard/pods/create">
                                <Plus className="h-4 w-4 mr-2" />
                                Create New Pod
                            </Link>
                        </Button>
                    </div>
                </div>

                <PodsTable pods={podsForTable} />

                <div className="mt-6">
                    <PodCycleStatusPanel data={cycleStatus} />
                </div>
            </div>
        </>
    );
}
