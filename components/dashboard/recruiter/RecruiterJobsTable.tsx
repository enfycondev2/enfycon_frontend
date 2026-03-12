"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
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
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Search,
    X,
    UserPlus,
} from "lucide-react";
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
import RecruiterJobRowActions from "./RecruiterJobRowActions";
import { apiClient } from "@/lib/apiClient";

import { DateRange } from "react-day-picker";
import { format, isSameDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

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
    cfrDaysRemaining?: number;
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
    jobs: jobsProp,
    baseUrl = "/recruiter/dashboard/jobs",
    onRefresh,
    hideRecruiterFilter = false
}: RecruiterJobsTableProps) {
    const jobs: Job[] = Array.isArray(jobsProp) ? jobsProp : [];
    const { data: session } = useSession();
    const router = useRouter();
    const [currentPage, setCurrentPage] = useState(1);
    const [amFilter, setAmFilter] = useState<string>("all");
    const [clientFilter, setClientFilter] = useState<string>("all");
    const [recruiterFilter, setRecruiterFilter] = useState<string>("all");
    const [timeFilter, setTimeFilter] = useState<string>("all");
    const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<string>("date-desc");
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [submissionJob, setSubmissionJob] = useState<{ id: string; jobCode: string } | null>(null);
    const [assigningJobId, setAssigningJobId] = useState<string | null>(null);

    const token = (session as any)?.user?.accessToken;
    const roles: string[] = (session?.user as any)?.roles || [];
    const hasPodLeadRole = roles.some((role) => {
        const normalizedRole = role?.toUpperCase?.();
        return normalizedRole === "POD_LEAD" || normalizedRole === "POD-LEAD";
    });
    const isPodLead = hasPodLeadRole;
    const itemsPerPage = 10;

    // Fetch team members from /pods/my-team once
    useEffect(() => {
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
        // Use teamMembers (scoped to the current pod via /pods/my-team) instead of
        // deriving recruiters from job.assignedRecruiters, which would include
        // recruiters from other pods when a job is assigned to multiple pods.
        const recruiters = teamMembers
            .map(m => ({ id: m.id, name: m.fullName || m.email }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return {
            ams: Array.from(ams.entries()).map(([email, name]) => ({ email, name })),
            clients: Array.from(clients).sort(),
            recruiters,
        };
    }, [jobs, teamMembers]);

    // Apply filtering
    const filteredJobs = useMemo(() => {
        // EST Timezone Helpers
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

        return jobs.filter(job => {
            const matchesAM = amFilter === "all" || job.accountManager?.email === amFilter;
            const matchesClient = clientFilter === "all" || job.clientName === clientFilter;
            const matchesRecruiter = recruiterFilter === "all" ||
                (job.assignedRecruiters && job.assignedRecruiters.some(r => r.id === recruiterFilter));

            let matchesTime = true;
            if (timeFilter !== "all") {
                const jobDate = new Date(job.createdAt);
                const jobYear = getESTPart(jobDate, 'year');
                const jobMonth = getESTPart(jobDate, 'month');
                const jobDay = getESTPart(jobDate, 'day');
                const jobWeek = getESTPart(jobDate, 'week');

                if (timeFilter === "today") matchesTime = jobYear === currentYear && jobMonth === currentMonth && jobDay === currentDay;
                else if (timeFilter === "week") matchesTime = jobYear === currentYear && jobWeek === currentWeek;
                else if (timeFilter === "month") matchesTime = jobYear === currentYear && jobMonth === currentMonth;
                else if (timeFilter === "year") matchesTime = jobYear === currentYear;
            }

            let matchesDate = true;
            if (dateFilter?.from) {
                const jobDate = new Date(job.createdAt);
                jobDate.setHours(0, 0, 0, 0);

                if (dateFilter.to) {
                    const toDate = new Date(dateFilter.to);
                    toDate.setHours(23, 59, 59, 999);
                    matchesDate = jobDate >= dateFilter.from && jobDate <= toDate;
                } else {
                    matchesDate = jobDate >= dateFilter.from;
                }
            }

            const matchesSearch = !searchQuery ||
                job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.jobCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.clientName.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesAM && matchesClient && matchesRecruiter && matchesTime && matchesDate && matchesSearch;
        });
    }, [jobs, amFilter, clientFilter, recruiterFilter, timeFilter, dateFilter, searchQuery]);

    const sortedJobs = useMemo(() => {
        const today = formatUsDate(new Date());

        const isTodayGroup = (job: Job) => {
            return formatUsDate(job.createdAt) === today || job.requirementType === 'CFR_EXTENDED';
        };

        return [...filteredJobs].sort((a, b) => {
            if (sortBy === "date-desc") {
                const isTodayA = isTodayGroup(a);
                const isTodayB = isTodayGroup(b);

                if (isTodayA && !isTodayB) return -1;
                if (!isTodayA && isTodayB) return 1;

                if (isTodayA) {
                    const typeA = a.requirementType;
                    const typeB = b.requirementType;

                    // NEW jobs are #1 priority
                    if (typeA === 'NEW' && typeB !== 'NEW') return -1;
                    if (typeA !== 'NEW' && typeB === 'NEW') return 1;

                    // CFR_EXTENDED jobs are #2 priority
                    if (typeA === 'CFR_EXTENDED' && typeB !== 'CFR_EXTENDED') return -1;
                    if (typeA !== 'CFR_EXTENDED' && typeB === 'CFR_EXTENDED') return 1;

                    // Within CFR_EXTENDED, sort by days remaining
                    if (typeA === 'CFR_EXTENDED' && typeB === 'CFR_EXTENDED') {
                        return (a.cfrDaysRemaining ?? 0) - (b.cfrDaysRemaining ?? 0);
                    }
                }
            }

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
        setTimeFilter("all");
        setDateFilter(undefined);
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

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Period</label>
                    <Select value={timeFilter} onValueChange={(v) => { setTimeFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[150px] h-10 bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg">
                            <SelectValue placeholder="All Time" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="year">This Year</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Range</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-[200px] h-10 justify-start text-left font-normal bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg",
                                    !dateFilter && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateFilter?.from ? (
                                    dateFilter.to ? (
                                        <>
                                            {format(dateFilter.from, "LLL dd, yy")} -{" "}
                                            {format(dateFilter.to, "LLL dd, yy")}
                                        </>
                                    ) : (
                                        format(dateFilter.from, "LLL dd, yyyy")
                                    )
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateFilter?.from}
                                selected={dateFilter}
                                onSelect={(d) => { setDateFilter(d); setCurrentPage(1); }}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {(amFilter !== "all" || clientFilter !== "all" || recruiterFilter !== "all" || timeFilter !== "all" || dateFilter?.from || searchQuery || sortBy !== "date-desc") && (
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
                            <TableHead className="sticky left-0 z-20 min-w-[170px] w-[170px] whitespace-nowrap bg-slate-100/95 dark:bg-slate-700/95 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start shadow-[1px_0_0_0_rgba(226,232,240,1)] dark:shadow-[1px_0_0_0_rgba(71,85,105,1)]">
                                Job Code
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start min-w-[220px]">
                                Job Title
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                Client
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                End Client
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                Account Manager
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                Recruiters
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                Created Date
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-center">
                                CFR Age
                            </TableHead>
                                    <TableHead 
                                        className="sticky right-0 z-30 w-[80px] min-w-[80px] text-center bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-sm py-3 px-4 border-b border-l border-neutral-200 dark:border-slate-600 font-semibold shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]"
                                    >
                                        Actions
                                    </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentJobs.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={9}
                                    className="h-24 text-center text-muted-foreground italic"
                                >
                                    No jobs found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            (() => {
                                const now = new Date();
                                const todayDateStr = new Intl.DateTimeFormat('en-US', {
                                    timeZone: 'America/New_York',
                                    year: 'numeric',
                                    month: 'numeric',
                                    day: 'numeric'
                                }).format(now);

                                let hasShownTodayHeader = false;
                                let hasShownPastHeader = false;
                                let hasShownNewSubHeader = false;
                                let hasShownCfrExtSubHeader = false;

                                return currentJobs.map((job, index) => {
                                    const jobDateStr = new Intl.DateTimeFormat('en-US', {
                                        timeZone: 'America/New_York',
                                        year: 'numeric',
                                        month: 'numeric',
                                        day: 'numeric'
                                    }).format(new Date(job.createdAt));

                                    const isToday = jobDateStr === todayDateStr || job.requirementType === 'CFR_EXTENDED';
                                    const showTodayHeader = isToday && !hasShownTodayHeader;
                                    const showPastHeader = !isToday && !hasShownPastHeader;

                                    const showNewSubHeader = isToday && job.requirementType === 'NEW' && !hasShownNewSubHeader;
                                    const showCfrExtSubHeader = isToday && job.requirementType === 'CFR_EXTENDED' && !hasShownCfrExtSubHeader;

                                    if (showTodayHeader) hasShownTodayHeader = true;
                                    if (showPastHeader) hasShownPastHeader = true;
                                    if (showNewSubHeader) hasShownNewSubHeader = true;
                                    if (showCfrExtSubHeader) hasShownCfrExtSubHeader = true;

                                    const status = statusMap[job.status] || { label: job.status, variant: "secondary" };

                                    return (
                                        <React.Fragment key={job.id}>
                                            {showTodayHeader && (
                                                <TableRow className="bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                                                    <TableCell colSpan={9} className="py-2 px-0">
                                                        <div className="sticky left-0 px-4 flex items-center gap-2 w-max">
                                                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Today's Jobs</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {showNewSubHeader && (
                                                <TableRow className="bg-emerald-100/10 dark:bg-emerald-900/5 hover:bg-emerald-100/10 dark:hover:bg-emerald-900/5 border-0">
                                                    <TableCell colSpan={9} className="py-1 px-0 border-b border-emerald-50 dark:border-emerald-900/20 text-start">
                                                        <div className="sticky left-0 px-6 w-max">
                                                            <span className="text-[11px] font-bold text-emerald-600/80 dark:text-emerald-500/80 uppercase tracking-widest italic">New Requirements</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {showCfrExtSubHeader && (
                                                <TableRow className="bg-amber-100/10 dark:bg-amber-900/5 hover:bg-amber-100/10 dark:hover:bg-amber-900/5 border-0">
                                                    <TableCell colSpan={9} className="py-1 px-0 border-b border-amber-50 dark:border-amber-900/20 text-start">
                                                        <div className="sticky left-0 px-6 w-max">
                                                            <span className="text-[11px] font-bold text-amber-600/80 dark:text-amber-500/80 uppercase tracking-widest italic">Requirement Extensions (CFR)</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {showPastHeader && (
                                                <TableRow className="bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50/50 dark:hover:bg-red-950/20 shadow-sm">
                                                    <TableCell colSpan={9} className="py-2 px-0 border-b border-red-100 dark:border-red-900/30">
                                                        <div className="sticky left-0 px-4 w-max">
                                                            <span className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-widest">Past Jobs</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            <TableRow 
                                                className={cn(
                                                    "transition-colors cursor-pointer group/row",
                                                    index % 2 === 0
                                                        ? "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                                        : "bg-slate-50 dark:bg-slate-800/35 hover:bg-slate-100/70 dark:hover:bg-slate-800/75"
                                                )}
                                                onClick={() => router.push(`${baseUrl}/${job.id}`)}
                                            >
                                                {/* Job Code - never editable */}
                                                <TableCell 
                                                    className={cn("sticky left-0 z-30 min-w-[170px] w-[170px] whitespace-nowrap overflow-hidden py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start shadow-[1px_0_0_0_rgba(226,232,240,1)] dark:shadow-[1px_0_0_0_rgba(71,85,105,1)]", index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800")}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <code className="inline-block bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono whitespace-nowrap">{job.jobCode}</code>
                                                    {job.submissionRequired !== undefined && (
                                                        <div className="mt-1">
                                                            <Badge variant="outline" className="text-[8px] h-4 px-1.5 bg-neutral-50 dark:bg-slate-800 text-neutral-500 whitespace-nowrap">
                                                                {job.submissionDone || 0} / {job.submissionRequired} done
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                {/* Job Title */}
                                                <TableCell className="py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                                    <div className="flex flex-col gap-1.5 justify-center">
                                                        <span className="font-medium capitalize">{job.jobTitle.toLowerCase()}</span>
                                                        <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                                            {job.requirementType === "NEW" && (
                                                                <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-600 border-emerald-200">New</span>
                                                            )}
                                                            {job.requirementType === "CFR" && (
                                                                <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border bg-rose-50 text-rose-600 border-rose-200">CFR</span>
                                                            )}
                                                            {job.requirementType === "CFR_EXTENDED" && (
                                                                <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border bg-amber-50 text-amber-600 border-amber-200">
                                                                    CFR Ext {job.cfrDaysRemaining !== undefined ? `· ${job.cfrDaysRemaining}d left` : ""}
                                                                </span>
                                                            )}
                                                            <Badge variant={status.variant as any} className="font-semibold px-2 py-0.5 rounded text-[9px] uppercase tracking-widest h-auto min-h-0">
                                                                {status.label}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                                    {job.clientName}
                                                </TableCell>
                                                <TableCell className="py-3 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                                    {job.endClientName}
                                                </TableCell>
                                                <TableCell className="py-3 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{job.accountManager?.fullName || "N/A"}</span>
                                                        <span className="text-[10px] text-muted-foreground">{job.accountManager?.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell 
                                                    className="py-3 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <RecruiterAssignCell
                                                        jobId={job.id}
                                                        assignedRecruiters={job.assignedRecruiters || []}
                                                        teamMembers={teamMembers}
                                                        token={token}
                                                        canEdit={isPodLead || roles.includes('ADMIN') || roles.includes('DELIVERY_HEAD')}
                                                        variant="popover"
                                                        onSuccess={() => {
                                                            if (onRefresh) onRefresh();
                                                            else router.refresh();
                                                        }}
                                                    />
                                                    
                                                    {/* Hidden dialog variant for action menu trigger */}
                                                    <RecruiterAssignCell
                                                        jobId={job.id}
                                                        assignedRecruiters={job.assignedRecruiters || []}
                                                        teamMembers={teamMembers}
                                                        token={token}
                                                        canEdit={isPodLead || roles.includes('ADMIN') || roles.includes('DELIVERY_HEAD')}
                                                        variant="dialog"
                                                        triggerMode="none"
                                                        open={assigningJobId === job.id}
                                                        onOpenChange={(open) => {
                                                            if (!open && assigningJobId === job.id) setAssigningJobId(null);
                                                        }}
                                                        onSuccess={() => {
                                                            if (onRefresh) onRefresh();
                                                            else router.refresh();
                                                        }}
                                                    />
                                                </TableCell>

                                                <TableCell className="py-3 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm">
                                                            {formatUsDate(job.createdAt)}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {formatUsTime(job.createdAt)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-center">
                                                    <span className="text-sm font-medium">{job.carryForwardAge ?? 0}</span>
                                                </TableCell>
                                                <TableCell 
                                                    className={cn(
                                                        "sticky right-0 z-30 w-[80px] min-w-[80px] py-3 px-4 border-b border-l border-neutral-200 dark:border-slate-600 text-center shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors",
                                                        index % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-800/50" : "bg-slate-100/50 dark:bg-slate-700/50"
                                                    )}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="flex justify-center">
                                                        <RecruiterJobRowActions 
                                                            jobId={job.id} 
                                                            jobCode={job.jobCode} 
                                                            baseUrl={baseUrl}
                                                            onAssign={() => setAssigningJobId(job.id)}
                                                            onSubmission={() => setSubmissionJob({ id: job.id, jobCode: job.jobCode })}
                                                            canAssign={isPodLead || roles.includes('ADMIN') || roles.includes('DELIVERY_HEAD')}
                                                            isCfr={job.requirementType === "CFR"}
                                                            isClosed={job.status === "CLOSED"}
                                                        />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                });
                            })()
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
