"use client";

import { useMemo, useState } from "react";
import { parseISO, formatDistanceToNow } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit2, Users, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DeletePodDialog from "./DeletePodDialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface PodMember {
    id: string;
    fullName: string | null;
    email: string;
}

interface Pod {
    id: string;
    name: string;
    podHead: PodMember;
    recruiters: PodMember[];
    jobs: Array<{ id?: string }>;
    _count: {
        recruiters?: number;
        jobs?: number;
    };
    createdAt: string;
    updatedAt: string;
    totalPositions?: number;
    submissionRequired?: number;
    submissionDone?: number;
    submissionRate?: number;
    filteredJobsCount?: number;
    lastActivityAt?: string;
    isAvailableForAssignment?: boolean;
}

interface PodsTableProps {
    pods: Pod[];
    jobs?: any[];
    showActions?: boolean;
    basePath?: string;
    showSorting?: boolean;
}

export default function PodsTable({
    pods,
    jobs = [],
    showActions = true,
    basePath = "/delivery-head/dashboard/pods",
    showSorting = false,
}: PodsTableProps) {
    const router = useRouter();
    const [filter, setFilter] = useState("all");
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [podToDelete, setPodToDelete] = useState<{ id: string; name: string } | null>(null);

    const openDeleteDialog = (id: string, name: string) => {
        setPodToDelete({ id, name });
        setIsDeleteDialogOpen(true);
    };

    const displayedPods = useMemo(() => {
        // EST Timezone Helpers (copied from ManagerPerformanceTable)
        const getESTPart = (date: Date, part: 'year' | 'month' | 'day' | 'week') => {
            if (part === 'week') {
                const d = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
                d.setHours(0, 0, 0, 0);
                d.setDate(d.getDate() + 4 - (d.getDay() || 7));
                const yearStart = new Date(d.getFullYear(), 0, 1);
                return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
            }
            const options: Intl.DateTimeFormatOptions = { timeZone: 'America/New_York' };
            if (part === 'year') options.year = 'numeric';
            if (part === 'month') options.month = 'numeric';
            if (part === 'day') options.day = 'numeric';
            return new Intl.DateTimeFormat('en-US', options).format(date);
        };

        const now = new Date();
        const currentYear = getESTPart(now, 'year');
        const currentMonth = getESTPart(now, 'month');
        const currentDay = getESTPart(now, 'day');
        const currentWeek = getESTPart(now, 'week');

        const podAggregations: Record<string, { totalJobs: number; totalPositions: number; subReq: number; subDone: number; lastActivityAt: string | null }> = {};

        // Only run filtering if jobs are provided
        if (jobs && jobs.length > 0) {
            jobs.forEach((job) => {
                if (!job.createdAt) return;

                const createdAt = parseISO(job.createdAt);

                const jobYear = getESTPart(createdAt, 'year');
                const jobMonth = getESTPart(createdAt, 'month');
                const jobDay = getESTPart(createdAt, 'day');
                const jobWeek = getESTPart(createdAt, 'week');

                let isInRange = false;
                if (filter === "all") isInRange = true;
                else if (filter === "today") isInRange = jobYear === currentYear && jobMonth === currentMonth && jobDay === currentDay;
                else if (filter === "week") isInRange = jobYear === currentYear && jobWeek === currentWeek;
                else if (filter === "month") isInRange = jobYear === currentYear && jobMonth === currentMonth;
                else if (filter === "year") isInRange = jobYear === currentYear;

                if (isInRange) {
                    const linkedPods = new Map<string, string>();
                    if (job.pod?.id) linkedPods.set(job.pod.id, job.pod.name);
                    (job.pods || []).forEach((p: any) => linkedPods.set(p.id, p.name));

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

                    linkedPods.forEach((podName, podId) => {
                        if (!podAggregations[podId]) {
                            podAggregations[podId] = { totalJobs: 0, totalPositions: 0, subReq: 0, subDone: 0, lastActivityAt: null };
                        }
                        podAggregations[podId].totalJobs += 1;
                        podAggregations[podId].totalPositions += (job.positions || 1);
                        podAggregations[podId].subReq += (job.submissionRequired || 0);
                        podAggregations[podId].subDone += (job.submissionDone || 0);

                        if (job.updatedAt) {
                            if (!podAggregations[podId].lastActivityAt || new Date(job.updatedAt) > new Date(podAggregations[podId].lastActivityAt!)) {
                                podAggregations[podId].lastActivityAt = job.updatedAt;
                            }
                        }
                    });
                }
            });
        }

        const list = pods.map(pod => {
            const agg = podAggregations[pod.id];

            // If filtering is active and jobs were provided, use the aggregated values
            // Otherwise fallback to the initial props values
            const totalJobs = agg ? agg.totalJobs : (filter === "all" ? (pod.jobs?.length ?? pod._count?.jobs ?? 0) : 0);
            const totalPositions = agg ? agg.totalPositions : (filter === "all" ? pod.totalPositions : 0);
            const submissionRequired = agg ? agg.subReq : (filter === "all" ? pod.submissionRequired : 0);
            const submissionDone = agg ? agg.subDone : (filter === "all" ? pod.submissionDone : 0);
            const submissionRate = submissionRequired && submissionRequired > 0
                ? Math.round((submissionDone! / submissionRequired) * 100)
                : 0;
            const lastActivityAt = agg?.lastActivityAt ? agg.lastActivityAt : pod.updatedAt; // Added this line

            return {
                ...pod,
                filteredJobsCount: totalJobs,
                totalPositions,
                submissionRequired,
                submissionDone,
                submissionRate,
                lastActivityAt, // Added this line
            };
        });

        return list.sort((a, b) => {
            const collatorOpt = { numeric: true, sensitivity: 'base' } as const;
            return a.name.localeCompare(b.name, undefined, collatorOpt);
        });
    }, [pods, jobs, filter]);

    return (
        <div className="space-y-4">
            {showSorting && (
                <div className="flex justify-end">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Filter By</span>
                        <Select value={filter} onValueChange={setFilter}>
                            <SelectTrigger className="w-[160px] bg-white dark:bg-slate-900 shadow-sm border-neutral-200 dark:border-slate-700">
                                <SelectValue placeholder="Filter by" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-900 border-slate-700">
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">This Week</SelectItem>
                                <SelectItem value="month">This Month</SelectItem>
                                <SelectItem value="year">This Year</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            <div className="rounded-lg border border-neutral-200 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-900/40">
                <Table className="table-grid-lines table-auto border-spacing-0 border-separate">
                    <TableHeader>
                        <TableRow className="border-0">
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Pod Name
                            </TableHead>
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Pod Lead
                            </TableHead>
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                                Recruiters
                            </TableHead>
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                                Jobs Assigned
                            </TableHead>
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                                Total Positions
                            </TableHead>
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                                Sub Required
                            </TableHead>
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                                Sub Done
                            </TableHead>
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                                Sub Rate
                            </TableHead>
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Last Updated
                            </TableHead>
                            {showActions && (
                                <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-end">
                                    Actions
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayedPods.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={showActions ? 10 : 9} className="h-24 text-center text-muted-foreground italic">
                                    No pods found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            displayedPods.map((pod, index) => (
                                <TableRow
                                    key={pod.id}
                                    className={`transition-colors ${index % 2 === 0
                                        ? "bg-white dark:bg-slate-900/20 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                        : "bg-slate-50/70 dark:bg-slate-800/35 hover:bg-slate-100/70 dark:hover:bg-slate-800/75"
                                        }`}
                                >
                                    <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start font-medium capitalize">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`shrink-0 h-2.5 w-2.5 rounded-full ${pod.isAvailableForAssignment !== false
                                                    ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.65)]"
                                                    : "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.55)]"
                                                    }`}
                                                title={
                                                    pod.isAvailableForAssignment !== false
                                                        ? "Available for job assignment"
                                                        : "Not available for assignment"
                                                }
                                            />
                                            <Link
                                                href={`${basePath}/${pod.id}`}
                                                className="hover:text-primary hover:underline transition-colors"
                                            >
                                                {pod.name.toLowerCase()}
                                            </Link>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{pod.podHead?.fullName || "No Head Assigned"}</span>
                                            <span className="text-xs text-muted-foreground">{pod.podHead?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center">
                                        <div className="flex flex-col items-center justify-center gap-1">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="font-semibold text-xs uppercase text-muted-foreground tracking-wider">
                                                    {pod.recruiters?.length || 0} Recruiters
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap justify-center gap-1 max-w-[200px]">
                                                {pod.recruiters && pod.recruiters.length > 0 ? (
                                                    pod.recruiters.map((recruiter) => (
                                                        <Badge
                                                            key={recruiter.id}
                                                            variant="secondary"
                                                            className="text-[10px] px-1.5 py-0 font-normal bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border-none"
                                                        >
                                                            {recruiter.fullName || recruiter.email.split('@')[0]}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground italic">No recruiters assigned</span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center">
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold px-3 py-1">
                                            {pod.filteredJobsCount ?? 0} Jobs
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center font-medium">
                                        {pod.totalPositions || 0}
                                    </TableCell>
                                    <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center font-medium">
                                        {pod.submissionRequired || 0}
                                    </TableCell>
                                    <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center font-medium">
                                        {pod.submissionDone || 0}
                                    </TableCell>
                                    <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className={`text-sm font-black ${(pod.submissionRate || 0) >= 70 ? 'text-emerald-500' : (pod.submissionRate || 0) >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                {((pod.submissionRequired || 0) > 0) ? `${pod.submissionRate || 0}%` : 'N/A'}
                                            </span>
                                            {((pod.submissionRequired || 0) > 0) && (
                                                <div className="w-20 h-2 bg-neutral-100 dark:bg-slate-700/50 rounded-full overflow-hidden p-[1px]">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${(pod.submissionRate || 0) >= 70 ? 'bg-emerald-500' : (pod.submissionRate || 0) >= 40 ? 'bg-amber-500' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`}
                                                        style={{ width: `${Math.min((pod.submissionRate || 0), 100)}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">
                                                {formatDistanceToNow(new Date(pod.lastActivityAt || pod.updatedAt), { addSuffix: true })}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground italic uppercase mt-0.5">
                                                {new Date(pod.lastActivityAt || pod.updatedAt).toLocaleDateString('en-US', {
                                                    timeZone: 'America/New_York',
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                                {' • '}
                                                {new Date(pod.lastActivityAt || pod.updatedAt).toLocaleTimeString('en-US', {
                                                    timeZone: 'America/New_York',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true,
                                                    timeZoneName: 'short'
                                                })}
                                            </span>
                                        </div>
                                    </TableCell>
                                    {showActions && (
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-end">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" asChild>
                                                    <Link href={`${basePath}/${pod.id}`}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20" asChild>
                                                    <Link href={`${basePath}/${pod.id}/edit`}>
                                                        <Edit2 className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                    onClick={() => openDeleteDialog(pod.id, pod.name)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {podToDelete && (
                <DeletePodDialog
                    isOpen={isDeleteDialogOpen}
                    onClose={() => setIsDeleteDialogOpen(false)}
                    podId={podToDelete.id}
                    podName={podToDelete.name}
                    availablePods={pods}
                    onSuccess={() => {
                        setIsDeleteDialogOpen(false);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
