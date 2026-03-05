"use client";

import { useMemo, useState } from "react";
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
import { Eye, Edit2, Users } from "lucide-react";
import Link from "next/link";
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
}

interface PodsTableProps {
    pods: Pod[];
    showActions?: boolean;
    basePath?: string;
    showSorting?: boolean;
}

export default function PodsTable({
    pods,
    showActions = true,
    basePath = "/delivery-head/dashboard/pods",
    showSorting = false,
}: PodsTableProps) {
    const [sortBy, setSortBy] = useState("jobs-desc");

    const displayedPods = useMemo(() => {
        const list = [...pods];
        return list.sort((a, b) => {
            const aJobs = a.jobs?.length ?? a._count?.jobs ?? 0;
            const bJobs = b.jobs?.length ?? b._count?.jobs ?? 0;
            const aRecruiters = a.recruiters?.length ?? a._count?.recruiters ?? 0;
            const bRecruiters = b.recruiters?.length ?? b._count?.recruiters ?? 0;
            const aUpdated = new Date(a.updatedAt).getTime();
            const bUpdated = new Date(b.updatedAt).getTime();

            switch (sortBy) {
                case "name-asc":
                    return a.name.localeCompare(b.name);
                case "name-desc":
                    return b.name.localeCompare(a.name);
                case "jobs-asc":
                    return aJobs - bJobs || a.name.localeCompare(b.name);
                case "jobs-desc":
                    return bJobs - aJobs || a.name.localeCompare(b.name);
                case "recruiters-asc":
                    return aRecruiters - bRecruiters || a.name.localeCompare(b.name);
                case "recruiters-desc":
                    return bRecruiters - aRecruiters || a.name.localeCompare(b.name);
                case "updated-asc":
                    return aUpdated - bUpdated || a.name.localeCompare(b.name);
                case "updated-desc":
                default:
                    return bUpdated - aUpdated || a.name.localeCompare(b.name);
            }
        });
    }, [pods, sortBy]);

    return (
        <div className="space-y-4">
            {showSorting && (
                <div className="flex justify-end">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Sort By</span>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-[190px] h-9 bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg">
                                <SelectValue placeholder="Sort By" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="jobs-desc">Jobs (High to Low)</SelectItem>
                                <SelectItem value="jobs-asc">Jobs (Low to High)</SelectItem>
                                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                                <SelectItem value="recruiters-desc">Recruiters (High to Low)</SelectItem>
                                <SelectItem value="recruiters-asc">Recruiters (Low to High)</SelectItem>
                                <SelectItem value="updated-desc">Recently Updated</SelectItem>
                                <SelectItem value="updated-asc">Oldest Updated</SelectItem>
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
                            <TableCell colSpan={showActions ? 6 : 5} className="h-24 text-center text-muted-foreground italic">
                                No pods found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        displayedPods.map((pod, index) => (
                            <TableRow
                                key={pod.id}
                                className={`transition-colors ${
                                    index % 2 === 0
                                        ? "bg-white dark:bg-slate-900/20 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                        : "bg-slate-50/70 dark:bg-slate-800/35 hover:bg-slate-100/70 dark:hover:bg-slate-800/75"
                                }`}
                            >
                                <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start font-medium capitalize">
                                    <Link
                                        href={`${basePath}/${pod.id}`}
                                        className="hover:text-primary hover:underline transition-colors"
                                    >
                                        {pod.name.toLowerCase()}
                                    </Link>
                                </TableCell>
                                <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm">{pod.podHead?.fullName || "Unassigned"}</span>
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
                                        {(pod.jobs?.length ?? pod._count?.jobs ?? 0)} Jobs
                                    </Badge>
                                </TableCell>
                                <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start">
                                    <div className="flex flex-col">
                                        <span className="text-sm">
                                            {new Date(pod.updatedAt).toLocaleDateString('en-US', {
                                                timeZone: 'America/New_York',
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground italic uppercase">
                                            {new Date(pod.updatedAt).toLocaleTimeString('en-US', {
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
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
        </div>
    );
}
