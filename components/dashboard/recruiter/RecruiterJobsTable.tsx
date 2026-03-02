"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
import {
    Eye,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Search,
    X,
    UserPlus,
} from "lucide-react";
import Link from "next/link";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn, formatUsDate, formatUsTime } from "@/lib/utils";
import JobEditDialog from "../delivery-head/JobEditDialog";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import RecruiterAssignCell, { TeamMember } from "./RecruiterAssignCell";
import JobSubmissionDialog from "./JobSubmissionDialog";
import { apiClient } from "@/lib/apiClient";

interface Job {
    id: string;
    jobTitle: string;
    clientName: string;
    endClientName: string;
    jobCode: string;
    status: string;
    createdAt: string;
    submissionRequired?: number;
    submissionDone?: number;
    accountManager?: {
        fullName: string | null;
        email: string;
    };
    assignedRecruiters?: TeamMember[];
    requirementType?: string;
    carryForwardAge?: number;
    pod?: {
        id: string;
        name: string;
    };
}

interface RecruiterJobsTableProps {
    jobs: Job[];
    baseUrl?: string;
    onRefresh?: () => void;
    hideRecruiterFilter?: boolean;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "warning" | "info" }> = {
    ACTIVE: { label: "Active", variant: "default" },
    CLOSED: { label: "Closed", variant: "destructive" },
    ON_HOLD: { label: "On Hold", variant: "warning" },
    HOLD_BY_CLIENT: { label: "Hold By Client", variant: "info" },
    FILLED: { label: "Filled", variant: "outline" },
};

export default function RecruiterJobsTable({
    jobs,
    baseUrl = "/recruiter/dashboard/jobs",
    onRefresh,
    hideRecruiterFilter = false
}: RecruiterJobsTableProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const [currentPage, setCurrentPage] = useState(1);
    const [amFilter, setAmFilter] = useState<string>("all");
    const [clientFilter, setClientFilter] = useState<string>("all");
    const [recruiterFilter, setRecruiterFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<string>("date-desc");
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [submissionJob, setSubmissionJob] = useState<{ id: string; jobCode: string } | null>(null);
    const [isPodHeadUser, setIsPodHeadUser] = useState(false);

    const token = (session as any)?.user?.accessToken;
    const roles: string[] = (session?.user as any)?.roles || [];
    const hasPodLeadRole = roles.some((role) => {
        const normalizedRole = role?.toUpperCase?.();
        return normalizedRole === "POD_LEAD" || normalizedRole === "POD-LEAD";
    });
    const isPodLead = hasPodLeadRole || isPodHeadUser;
    const itemsPerPage = 10;

    // Fetch team members from /pods/my-team once
    useEffect(() => {
        apiClient("/auth/me")
            .then((res) => (res.ok ? res.json() : {}))
            .then((data: any) => {
                if (data?.isPodHead) {
                    setIsPodHeadUser(true);
                }
            })
            .catch(console.error);

        apiClient("/pods/my-team")
            .then((res) => res.ok ? res.json() : [])
            .then((data) => {
                // API may return array directly or { members: [] }
                const members = Array.isArray(data) ? data : (data?.members ?? data?.recruiters ?? []);
                setTeamMembers(members);
            })
            .catch(() => setTeamMembers([]));
    }, [token]);

    // Extract unique values for filters
    const filterOptions = useMemo(() => {
        const ams = new Map<string, string>();
        const clients = new Set<string>();
        const recruiters = new Map<string, string>();

        jobs.forEach(job => {
            if (job.accountManager) {
                const name = job.accountManager.fullName || job.accountManager.email;
                ams.set(job.accountManager.email, name);
            }
            if (job.clientName) clients.add(job.clientName);

            if (job.assignedRecruiters) {
                job.assignedRecruiters.forEach(rec => {
                    const name = rec.fullName || rec.email;
                    recruiters.set(rec.id, name);
                });
            }
        });

        return {
            ams: Array.from(ams.entries()).map(([email, name]) => ({ email, name })),
            clients: Array.from(clients).sort(),
            recruiters: Array.from(recruiters.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
        };
    }, [jobs]);

    // Apply filtering
    const filteredJobs = useMemo(() => {
        return jobs.filter(job => {
            const matchesAM = amFilter === "all" || job.accountManager?.email === amFilter;
            const matchesClient = clientFilter === "all" || job.clientName === clientFilter;
            const matchesRecruiter = recruiterFilter === "all" ||
                (job.assignedRecruiters && job.assignedRecruiters.some(r => r.id === recruiterFilter));
            const matchesSearch = !searchQuery ||
                job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.jobCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.clientName.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesAM && matchesClient && matchesRecruiter && matchesSearch;
        });
    }, [jobs, amFilter, clientFilter, recruiterFilter, searchQuery]);

    const sortedJobs = useMemo(() => {
        return [...filteredJobs].sort((a, b) => {
            switch (sortBy) {
                case "date-desc":
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case "date-asc":
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case "title-asc":
                    return a.jobTitle.localeCompare(b.jobTitle);
                case "title-desc":
                    return b.jobTitle.localeCompare(a.jobTitle);
                case "client-asc":
                    return a.clientName.localeCompare(b.clientName);
                case "client-desc":
                    return b.clientName.localeCompare(a.clientName);
                default:
                    return 0;
            }
        });
    }, [filteredJobs, sortBy]);

    const totalPages = Math.ceil(sortedJobs.length / itemsPerPage);

    const currentJobs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedJobs.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedJobs, currentPage]);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const clearFilters = () => {
        setAmFilter("all");
        setClientFilter("all");
        setRecruiterFilter("all");
        setSearchQuery("");
        setSortBy("date-desc");
        setCurrentPage(1);
    };

    return (
        <div className="space-y-4 w-full min-w-0 overflow-x-hidden">
            <div className="bg-neutral-50 dark:bg-slate-800/40 p-4 rounded-xl border border-neutral-200 dark:border-slate-700 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                        <Input
                            placeholder="Job title or code..."
                            className="pl-9 h-10 bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Account Manager</label>
                    <Select value={amFilter} onValueChange={(v) => { setAmFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[180px] h-10 bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg">
                            <SelectValue placeholder="All AMs" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All AMs</SelectItem>
                            {filterOptions.ams.map(am => (
                                <SelectItem key={am.email} value={am.email}>{am.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {!hideRecruiterFilter && (
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Recruiter</label>
                        <Select value={recruiterFilter} onValueChange={(v) => { setRecruiterFilter(v); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[180px] h-10 bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg">
                                <SelectValue placeholder="All Recruiters" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Recruiters</SelectItem>
                                {filterOptions.recruiters.map(rec => (
                                    <SelectItem key={rec.id} value={rec.id}>{rec.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Client</label>
                    <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[150px] h-10 bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg">
                            <SelectValue placeholder="All Clients" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Clients</SelectItem>
                            {filterOptions.clients.map(client => (
                                <SelectItem key={client} value={client}>{client}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Sort By</label>
                    <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[150px] h-10 bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg">
                            <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date-desc">Latest Posted</SelectItem>
                            <SelectItem value="date-asc">Oldest Posted</SelectItem>
                            <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                            <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                            <SelectItem value="client-asc">Client (A-Z)</SelectItem>
                            <SelectItem value="client-desc">Client (Z-A)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {(amFilter !== "all" || clientFilter !== "all" || recruiterFilter !== "all" || searchQuery || sortBy !== "date-desc") && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-neutral-500 hover:text-destructive hover:bg-destructive/10"
                        onClick={clearFilters}
                        title="Clear Filters"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                )}
            </div>

            <div className="rounded-lg border border-neutral-200 dark:border-slate-600 overflow-hidden">
                <Table className="table-auto border-spacing-0 border-separate min-w-max">
                    <TableHeader>
                        <TableRow className="border-0">
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Job Title
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Job Code
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Client
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                End Client
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Account Manager
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Assigned Recruiter
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Created Date
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Req Type
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                                CFR Age
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                                Status
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-end">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentJobs.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="h-24 text-center text-muted-foreground italic"
                                >
                                    No jobs found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            currentJobs.map((job) => {
                                const status = statusMap[job.status] || { label: job.status, variant: "secondary" };

                                return (
                                    <TableRow key={job.id} className="hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start font-medium capitalize">
                                            {job.jobTitle.toLowerCase()}
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono w-fit">
                                                        {job.jobCode}
                                                    </code>
                                                    {job.submissionRequired !== undefined && (
                                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-neutral-50 dark:bg-slate-800 text-neutral-500 whitespace-nowrap">
                                                            {job.submissionDone || 0} / {job.submissionRequired} done
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start">
                                            {job.clientName}
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start">
                                            {job.endClientName}
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{job.accountManager?.fullName || "N/A"}</span>
                                                <span className="text-[10px] text-muted-foreground">{job.accountManager?.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start">
                                            <RecruiterAssignCell
                                                jobId={job.id}
                                                assignedRecruiters={job.assignedRecruiters ?? []}
                                                teamMembers={teamMembers}
                                                token={token}
                                                canEdit={isPodLead && job.status !== "CLOSED"}
                                                onSuccess={() => router.refresh()}
                                            />
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm">
                                                    {formatUsDate(job.createdAt)}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {formatUsTime(job.createdAt)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start">
                                            <div className="flex flex-col gap-1">
                                                {job.requirementType === "NEW" && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border w-fit bg-emerald-50 text-emerald-700 border-emerald-200">New</span>
                                                )}
                                                {job.requirementType === "CFR" && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border w-fit bg-red-50 text-red-700 border-red-200">Carry Forward</span>
                                                )}
                                                {job.requirementType === "CFR_EXTENDED" && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border w-fit bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap">
                                                        CFR Ext
                                                    </span>
                                                )}
                                                {!job.requirementType && <span className="text-xs text-neutral-400">—</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center">
                                            <span className="text-sm font-medium">{job.carryForwardAge ?? 0}</span>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center">
                                            <Badge variant={status.variant as any} className="font-semibold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                                                {status.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-end">
                                            <div className="flex justify-end gap-2">
                                                {job.requirementType === "CFR" ? (
                                                    <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                                                        Submissions blocked
                                                    </span>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10"
                                                        onClick={() => setSubmissionJob({ id: job.id, jobCode: job.jobCode })}
                                                        title="Submit Candidate"
                                                        disabled={job.status === "CLOSED"}
                                                    >
                                                        <UserPlus className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" asChild>
                                                    <Link href={`${baseUrl}/${job.id}`}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-muted-foreground italic">
                        Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, sortedJobs.length)}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedJobs.length)}</span> of <span className="font-medium">{sortedJobs.length}</span> {sortedJobs.length === jobs.length ? "jobs" : "filtered jobs"}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <Button
                                        key={pageNum}
                                        variant={currentPage === pageNum ? "default" : "outline"}
                                        size="sm"
                                        className="h-8 w-8 text-xs"
                                        onClick={() => handlePageChange(pageNum)}
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {submissionJob && (
                <JobSubmissionDialog
                    isOpen={!!submissionJob}
                    onClose={() => setSubmissionJob(null)}
                    jobCode={submissionJob.jobCode}
                    recruiterId={(session?.user as any)?.id || ""}
                    token={token}
                    onSuccess={() => {
                        if (onRefresh) onRefresh();
                        else router.refresh();
                    }}
                />
            )}
        </div>
    );
}
