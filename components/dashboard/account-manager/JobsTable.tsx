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
    Eye,
    Edit2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Search,
    X,
    Calendar as CalendarIcon,
    Filter,
    MessageCircle,
    MoreVertical,
    RefreshCw,
    RotateCcw,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay } from "date-fns";
import { cn, formatUsDate, formatUsTime } from "@/lib/utils";
import JobEditDialog from "../delivery-head/JobEditDialog";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import PodAssignCell from "../delivery-head/PodAssignCell";
import { Save, X as XIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { apiClient } from "@/lib/apiClient";
import { LocationSelect } from "@/components/shared/location-select";
import CfrExtendButton from "./CfrExtendButton";
import { MultiSelect, Option } from "@/components/shared/multi-select";
import { useChat } from "@/contexts/ChatContext";

interface Job {
    id: string;
    jobTitle: string;
    jobType: string;
    jobDescription?: string;
    jobLocation: string;
    visaType: string;
    clientBillRate: string;
    payRate: string;
    clientName: string;
    endClientName: string;
    jobCode: string;
    noOfPositions: number;
    submissionRequired: number;
    submissionDone: number;
    urgency: string;
    requirementType: string;
    cfrDaysRemaining: number;
    carryForwardAge: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    accountManager?: {
        fullName: string | null;
        email: string;
    };
    pod?: {
        id: string;
        name: string;
    };
    pods?: {
        id: string;
        name: string;
    }[];
    podIds?: string[];
    assignedRecruiters?: {
        id: string;
        fullName: string | null;
        email: string;
    }[];
}

interface JobsTableProps {
    jobs: Job[];
    baseUrl?: string;
    showActions?: boolean;
    showAccountManager?: boolean;
    showPod?: boolean;
    showFilters?: boolean;
    showEstCreatedDateTime?: boolean;
    showCfrExtend?: boolean;
    /** Whether to show Bill and Pay rates (finance sensitive data) */
    showRates?: boolean;
    onRefresh?: () => void;
    /** Called with the saved job's ID after an inline edit — lets the parent silently patch just that row */
    onJobUpdated?: (jobId: string) => void;
    /** When true, disables internal client-side pagination — the parent manages pages via the API */
    serverPaginated?: boolean;
    /** Total count from the server (used for display only when serverPaginated=true) */
    serverTotal?: number;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "warning" | "success" | "info" }> = {
    ACTIVE: { label: "Active", variant: "success" },
    CLOSED: { label: "Closed", variant: "destructive" },
    ON_HOLD: { label: "On Hold", variant: "warning" },
    HOLD_BY_CLIENT: { label: "Hold By Client", variant: "secondary" },
    FILLED: { label: "Filled", variant: "info" },
};

const visaOptions: Option[] = [
    { label: "All Visa", value: "ALL_VISA" },
    { label: "All Visa except H1B", value: "ALL_VISA_EXCEPT_H1B" },
    { label: "H1B", value: "H1B" },
    { label: "Green Card (GC)", value: "GC" },
    { label: "US Citizen", value: "US_CITIZEN" },
    { label: "OPT/CPT", value: "OPT" },
    { label: "EAD", value: "EAD" },
    { label: "TN Visa", value: "TN" },
];

const parseVisaTypes = (visaType?: string) =>
    (visaType || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

const formatVisaType = (visaType?: string) =>
    parseVisaTypes(visaType)
        .map((value) => visaOptions.find((option) => option.value === value)?.label || value.replace(/_/g, " "))
        .join(", ");

/**
 * InlineExtendMenu
 * Sticky-right bubble menu (⋮) for DH / Admin to extend or re-extend a CFR job.
 * - CFR job:          Extend button  (1–5 days)
 * - CFR_EXTENDED job: Re-extend  (0 = revert, 1–4 days)
 * - Other types:      dots button dims to ~20% opacity so column stays consistent
 */
function InlineExtendMenu({
    jobId,
    requirementType,
    onSuccess,
}: {
    jobId: string;
    requirementType?: string;
    onSuccess?: (data?: any) => void;
}) {
    const isCfr = requirementType === "CFR";
    const isExtended = requirementType === "CFR_EXTENDED";
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const applyExtension = async (days: number) => {
        setLoading(true);
        try {
            const body =
                days === 0
                    ? { requirementType: "CFR" }
                    : { requirementType: "CFR_EXTENDED", cfrExtensionDays: days };

            const res = await apiClient(`/jobs/${jobId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.message || "Request failed");
            }

            if (days === 0) {
                toast.success("Job reverted to CFR — submissions blocked");
            } else {
                toast.success(`CFR extended by ${days} day${days > 1 ? "s" : ""}`);
            }

            if (onSuccess) {
                const updatedData = await res.json().catch(() => null);
                onSuccess(updatedData);
            }
        } catch (e: any) {
            toast.error(e.message || "Action failed");
        } finally {
            setLoading(false);
        }
    };

    if (!isCfr && !isExtended) {
        // Show a dimmed placeholder so the column is always the same width
        return (
            <button
                disabled
                className="h-7 w-7 flex items-center justify-center rounded opacity-20 cursor-default"
                aria-hidden="true"
            >
                <MoreVertical className="h-4 w-4 text-neutral-400" />
            </button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-7 w-7",
                        loading && "opacity-50 pointer-events-none",
                        isCfr
                            ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            : "text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                    )}
                    title={isCfr ? "Extend CFR" : "Re-extend CFR"}
                >
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="w-52">
                <DropdownMenuLabel className="text-xs font-semibold">
                    {isCfr ? "Extend CFR" : "Re-extend / Revert CFR"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isCfr && (
                    <>
                        <p className="text-[10px] text-muted-foreground px-2 pb-1">
                            Extend by how many days?
                        </p>
                        {[1, 2, 3, 4, 5].map((d) => (
                            <DropdownMenuItem
                                key={d}
                                onClick={() => applyExtension(d)}
                                disabled={loading}
                                className="gap-2 cursor-pointer"
                            >
                                <RefreshCw className="h-3.5 w-3.5 text-amber-500" />
                                Extend {d} day{d > 1 ? "s" : ""}
                            </DropdownMenuItem>
                        ))}
                    </>
                )}
                {isExtended && (
                    <>
                        <p className="text-[10px] text-muted-foreground px-2 pb-1">
                            Select new duration (0 = revert to CFR)
                        </p>
                        <DropdownMenuItem
                            onClick={() => applyExtension(0)}
                            disabled={loading}
                            className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Revert to CFR
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {[1, 2, 3, 4].map((d) => (
                            <DropdownMenuItem
                                key={d}
                                onClick={() => applyExtension(d)}
                                disabled={loading}
                                className="gap-2 cursor-pointer"
                            >
                                <RefreshCw className="h-3.5 w-3.5 text-violet-500" />
                                Re-extend {d} day{d > 1 ? "s" : ""}
                            </DropdownMenuItem>
                        ))}
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function JobStatusSelect({ job, onRefresh }: { job: Job; onRefresh?: (updatedJob?: any) => void }) {
    const [status, setStatus] = useState(job.status);
    const [isUpdating, setIsUpdating] = useState(false);
    const { data: session } = useSession();

    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === status) return;
        setIsUpdating(true);
        setStatus(newStatus); // optimistic update

        try {
            const res = await apiClient(`/jobs/${job.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.message || "Failed to update status");
            }

            toast.success("Job status updated");
            if (onRefresh) {
                const updatedData = await res.json().catch(() => null);
                onRefresh(updatedData);
            }
        } catch (error: any) {
            toast.error(error.message || "Something went wrong");
            setStatus(job.status); // revert on error
        } finally {
            setIsUpdating(false);
        }
    };

    const currentConfig = statusMap[status] || { label: status, variant: "outline" };

    return (
        <Select
            value={status}
            onValueChange={handleStatusChange}
            disabled={isUpdating}
        >
            <SelectTrigger className="h-7 w-[100px] px-2 py-0 border-0 focus:ring-0 bg-transparent flex justify-center shadow-none hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors rounded-full relative group">
                <Badge
                    variant={currentConfig.variant as any}
                    className="font-semibold px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wider absolute "
                >
                    {currentConfig.label}
                </Badge>
            </SelectTrigger>
            <SelectContent>
                {Object.entries(statusMap).map(([key, config]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                        <Badge
                            variant={config.variant as any}
                            className="font-semibold px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wider"
                        >
                            {config.label}
                        </Badge>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export default function JobsTable({
    jobs: jobsProp,
    baseUrl = "/account-manager/dashboard/jobs",
    showActions = true,
    showAccountManager = false,
    showPod = false,
    showFilters = false,
    showEstCreatedDateTime = false,
    showCfrExtend = false,
    showRates = true,
    onRefresh,
    onJobUpdated,
    serverPaginated = false,
    serverTotal,
}: JobsTableProps) {
    console.log("[JobsTable] Rendered with", jobsProp?.length, "jobs");
    const jobs: Job[] = Array.isArray(jobsProp) ? jobsProp : [];
    const router = useRouter();
    const { data: session } = useSession();
    const { openChatWithUser } = useChat();

    // Check roles
    const userRoles = session?.user?.roles || [];
    const sessionRoles: string[] = userRoles.map((r: string) => r?.toUpperCase?.());
    const isAdmin = sessionRoles.includes("ADMIN");
    const isDeliveryHead = sessionRoles.includes("DELIVERY_HEAD") || sessionRoles.includes("DELIVERY-HEAD");
    const isAccountManager = sessionRoles.includes("ACCOUNT_MANAGER") || sessionRoles.includes("ACCOUNT-MANAGER");
    const canEditByRole = isAdmin || isDeliveryHead || isAccountManager;
    const [currentPage, setCurrentPage] = useState(1);
    const [podFilter, setPodFilter] = useState<string>("all");
    const [amFilter, setAmFilter] = useState<string>("all");
    const [clientFilter, setClientFilter] = useState<string>("all");
    const [timeFilter, setTimeFilter] = useState<string>("all");
    const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<string>("date-desc");

    // Modal states (unused now - kept for safety, remove after verification)
    const [availablePods, setAvailablePods] = useState<{ id: string, name: string, isAvailable?: boolean }[]>([]);

    const itemsPerPage = 10;
    const isInteractiveTarget = (target: EventTarget | null) => {
        const el = target as HTMLElement | null;
        if (!el) return false;
        return !!el.closest("a, button, input, textarea, select, [role='combobox'], [role='listbox'], [data-radix-collection-item]");
    };

    // Extract unique values for filters
    const filterOptions = useMemo(() => {
        const pods = new Map();
        const ams = new Map();
        const clients = new Set<string>();

        jobs.forEach(job => {
            if (job.pod) pods.set(job.pod.id, job.pod.name);
            if (job.pods) job.pods.forEach((p: any) => pods.set(p.id, p.name));
            if (job.podIds && job.podIds.length > 0) {
                job.podIds.forEach(id => {
                    const found = availablePods.find(p => p.id === id);
                    if (found) pods.set(found.id, found.name);
                });
            }
            if (job.accountManager) {
                const name = job.accountManager.fullName || job.accountManager.email;
                ams.set(job.accountManager.email, name);
            }
            if (job.clientName) clients.add(job.clientName);
        });

        return {
            pods: Array.from(pods.entries()).map(([id, name]) => ({ id, name })),
            ams: Array.from(ams.entries()).map(([email, name]) => ({ email, name })),
            clients: Array.from(clients).sort(),
        };
    }, [jobs]);

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
            const matchesPod = podFilter === "all" || job.pod?.id === podFilter || job.pods?.some((p: any) => p.id === podFilter) || job.podIds?.includes(podFilter);
            const matchesAM = amFilter === "all" || job.accountManager?.email === amFilter;
            const matchesClient = clientFilter === "all" || job.clientName === clientFilter;

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

            return matchesPod && matchesAM && matchesClient && matchesTime && matchesDate && matchesSearch;
        });
    }, [jobs, podFilter, amFilter, clientFilter, timeFilter, dateFilter, searchQuery]);

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

    const estDateFormatter = { format: (date: Date) => formatUsDate(date) };
    const estTimeFormatter = { format: (date: Date) => formatUsTime(date) };

    const totalPages = serverPaginated ? 1 : Math.ceil(sortedJobs.length / itemsPerPage);

    const currentJobs = useMemo(() => {
        if (serverPaginated) return sortedJobs; // show all — parent controls pages
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedJobs.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedJobs, currentPage, serverPaginated]);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const clearFilters = () => {
        setPodFilter("all");
        setAmFilter("all");
        setClientFilter("all");
        setTimeFilter("all");
        setDateFilter(undefined);
        setSearchQuery("");
        setSortBy("date-desc");
        setCurrentPage(1);
    };

    // Inline editing state (used by showActions column only)
    const [editingJobId, setEditingJobId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Job>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Popup edit dialog state (used by ⋮ sticky column)
    const [editDialogJob, setEditDialogJob] = useState<Job | null>(null);

    const startEdit = (job: Job) => {
        setEditingJobId(job.id);
        setEditForm({
            jobTitle: job.jobTitle,
            jobType: job.jobType,
            jobLocation: job.jobLocation,
            visaType: job.visaType,
            clientName: job.clientName,
            endClientName: job.endClientName,
            clientBillRate: job.clientBillRate,
            payRate: job.payRate,
            noOfPositions: job.noOfPositions,
            submissionRequired: job.submissionRequired,
            urgency: job.urgency,
        });
    };

    const cancelEdit = () => {
        setEditingJobId(null);
        setEditForm({});
    };

    const saveEdit = async (jobId: string) => {
        setIsSaving(true);
        try {
            const res = await apiClient(`/jobs/${jobId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.message || "Failed to save");
            }
            toast.success("Job updated successfully");
            setEditingJobId(null);
            refreshJob(jobId);
        } catch (error: any) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Silently patches a single job row after any inline action.
     * Calls onJobUpdated if the parent supports silent patching,
     * otherwise falls back to onRefresh (full re-fetch).
     */
    const refreshJob = useCallback((jobDataOrId: string | any) => {
        if (onJobUpdated) {
            onJobUpdated(jobDataOrId);
        } else if (onRefresh) {
            onRefresh();
        }
    }, [onJobUpdated, onRefresh]);

    const ef = (field: keyof Job) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setEditForm(prev => ({ ...prev, [field]: e.target.value }));
    const efSel = (field: keyof Job) => (val: string) =>
        setEditForm(prev => ({ ...prev, [field]: val }));



    return (
        <div className="space-y-4">
            {showFilters && (
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
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Pod</label>
                        <Select value={podFilter} onValueChange={(v) => { setPodFilter(v); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[150px] h-10 bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg">
                                <SelectValue placeholder="All Pods" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Pods</SelectItem>
                                {filterOptions.pods.map(pod => (
                                    <SelectItem key={pod.id} value={pod.id}>{pod.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                                    variant={"outline"}
                                    className={cn(
                                        "w-[190px] h-10 justify-start text-left font-normal bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg",
                                        !dateFilter && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    <div className="flex-1 truncate">
                                        {dateFilter?.from ? (
                                            dateFilter.to ? (
                                                <>
                                                    {format(dateFilter.from, "MMM d")} - {format(dateFilter.to, "MMM d")}
                                                </>
                                            ) : (
                                                format(dateFilter.from, "MMM d")
                                            )
                                        ) : (
                                            <span>Pick a range</span>
                                        )}
                                    </div>
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

                    {(podFilter !== "all" || amFilter !== "all" || clientFilter !== "all" || timeFilter !== "all" || dateFilter?.from || searchQuery || sortBy !== "date-desc") && (
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
            )}

            <div className="rounded-lg border border-neutral-200 dark:border-slate-600 overflow-x-auto">
                <Table className="jobs-table-grid table-auto border-spacing-0 border-separate">
                    <TableHeader>
                        <TableRow className="border-0">
                            <TableHead className="sticky left-0 z-20 min-w-[170px] w-[170px] whitespace-nowrap bg-slate-100/95 dark:bg-slate-700/95 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start shadow-[1px_0_0_0_rgba(226,232,240,1)] dark:shadow-[1px_0_0_0_rgba(71,85,105,1)]">
                                Job Code
                            </TableHead>
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start min-w-[220px]">
                                Job Title
                            </TableHead>
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-center min-w-[120px]">
                                Status
                            </TableHead>
                            {showPod && (
                                <>
                                    <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                        Pods & Recruiters
                                    </TableHead>

                                </>
                            )}
                            {showAccountManager && (
                                <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                    Account Manager
                                </TableHead>
                            )}
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                Type / Location
                            </TableHead>
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                Visa
                            </TableHead>
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                Client
                            </TableHead>
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                End Client
                            </TableHead>
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-center">
                                Positions
                            </TableHead>
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-center">
                                Submissions
                            </TableHead>

                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                Req Type
                            </TableHead>
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-center">
                                CFR Age
                            </TableHead>
                            {showRates && (
                                <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                    Rates
                                </TableHead>
                            )}
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                Created Date
                            </TableHead>
                            <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                Last Updated
                            </TableHead>

                            {showActions && (
                                <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-r border-neutral-200 dark:border-slate-600 text-end">
                                    Actions
                                </TableHead>
                            )}
                            {canEditByRole && (
                                <TableHead className="sticky right-0 z-20 bg-slate-100/95 dark:bg-slate-700/95 text-[10px] px-4 h-12 border-b border-l border-neutral-200 dark:border-slate-600 text-center w-[80px] min-w-[80px] shadow-[-1px_0_0_0_rgba(226,232,240,1)] dark:shadow-[-1px_0_0_0_rgba(71,85,105,1)] font-bold text-neutral-500 uppercase tracking-widest">
                                    Actions
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentJobs.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={(showRates ? 14 : 13) + (showAccountManager ? 1 : 0) + (showPod ? 1 : 0) + (showActions ? 1 : 0) + (canEditByRole ? 1 : 0)}
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

                                    const isEditing = editingJobId === job.id;
                                    const isClosed = job.status === "CLOSED";
                                    const inputCls = "h-7 px-1.5 text-xs border border-blue-300 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-400";
                                    const selCls = "h-7 text-xs border border-blue-300 rounded focus:ring-blue-400";
                                    const stickyBgClass = isEditing
                                        ? "bg-blue-50 dark:bg-blue-950"
                                        : isClosed
                                            ? "bg-neutral-50/80 dark:bg-slate-900/60"
                                            : index % 2 === 0
                                                ? "bg-white dark:bg-slate-900"
                                                : "bg-slate-50 dark:bg-slate-800";

                                    return (
                                        <React.Fragment key={job.id}>
                                            {showTodayHeader && (
                                                <TableRow className="bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                                                    <TableCell colSpan={(showRates ? 14 : 13) + (showAccountManager ? 1 : 0) + (showPod ? 1 : 0) + (showActions ? 1 : 0) + (canEditByRole ? 1 : 0)} className="py-2 px-0">
                                                        <div className="sticky left-0 px-4 flex items-center gap-2 w-max">
                                                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Today's Jobs</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {showNewSubHeader && (
                                                <TableRow className="bg-emerald-100/10 dark:bg-emerald-900/5 hover:bg-emerald-100/10 dark:hover:bg-emerald-900/5 border-0">
                                                    <TableCell colSpan={(showRates ? 14 : 13) + (showAccountManager ? 1 : 0) + (showPod ? 1 : 0) + (showActions ? 1 : 0) + (canEditByRole ? 1 : 0)} className="py-1 px-0 border-b border-emerald-50 dark:border-emerald-900/20 text-start">
                                                        <div className="sticky left-0 px-6 w-max">
                                                            <span className="text-[10px] font-bold text-emerald-600/80 dark:text-emerald-500/80 uppercase tracking-widest italic">New Requirements</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {showCfrExtSubHeader && (
                                                <TableRow className="bg-amber-100/10 dark:bg-amber-900/5 hover:bg-amber-100/10 dark:hover:bg-amber-900/5 border-0">
                                                    <TableCell colSpan={(showRates ? 14 : 13) + (showAccountManager ? 1 : 0) + (showPod ? 1 : 0) + (showActions ? 1 : 0) + (canEditByRole ? 1 : 0)} className="py-1 px-0 border-b border-amber-50 dark:border-amber-900/20 text-start">
                                                        <div className="sticky left-0 px-6 w-max">
                                                            <span className="text-[10px] font-bold text-amber-600/80 dark:text-amber-500/80 uppercase tracking-widest italic">Requirement Extensions (CFR)</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {showPastHeader && (
                                                <TableRow className="bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50/50 dark:hover:bg-red-950/20 shadow-sm border-0">
                                                    <TableCell colSpan={(showRates ? 14 : 13) + (showAccountManager ? 1 : 0) + (showPod ? 1 : 0) + (showActions ? 1 : 0) + (canEditByRole ? 1 : 0)} className="py-2 px-0 border-b border-red-100 dark:border-red-900/30">
                                                        <div className="sticky left-0 px-4 w-max">
                                                            <span className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-widest">Past Jobs</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            <TableRow
                                                className={cn(
                                                    "transition-colors border-b border-neutral-100 dark:border-slate-700/80",
                                                    isEditing
                                                        ? "bg-blue-50 dark:bg-blue-950/30"
                                                        : index % 2 === 0
                                                            ? "bg-white dark:bg-slate-900/20 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                                            : "bg-slate-50/70 dark:bg-slate-800/35 hover:bg-slate-100/70 dark:hover:bg-slate-800/75",
                                                    isClosed && "bg-neutral-50/50 dark:bg-slate-950/50",
                                                    !isEditing && !isClosed && "cursor-pointer"
                                                )}
                                                onClick={(e) => {
                                                    if (isEditing || isInteractiveTarget(e.target)) return;
                                                    const fromPath = typeof window !== 'undefined' ? window.location.pathname : '';
                                                    router.push(`${baseUrl}/${job.id}${fromPath ? `?from=${fromPath}` : ''}`);
                                                }}
                                            >
                                                {/* Job Code - never editable */}
                                                <TableCell className={cn("sticky left-0 z-30 min-w-[170px] w-[170px] whitespace-nowrap overflow-hidden py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start shadow-[1px_0_0_0_rgba(226,232,240,1)] dark:shadow-[1px_0_0_0_rgba(71,85,105,1)]", stickyBgClass)}>
                                                    <code className={cn(
                                                        "inline-block px-1.5 py-0.5 rounded text-xs font-mono whitespace-nowrap border transition-colors",
                                                        isClosed 
                                                            ? "bg-red-50/50 text-red-800/50 border-red-100/50 dark:bg-red-950/10 dark:text-red-400/40 dark:border-red-900/20" 
                                                            : "bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-slate-700"
                                                    )}>
                                                        {job.jobCode}
                                                    </code>
                                                </TableCell>
                                                {/* Job Title */}
                                                <TableCell className="py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                                    <div className={cn(isClosed && "opacity-40 grayscale-[0.5]")}>
                                                        {isEditing
                                                            ? <Input className={inputCls} value={editForm.jobTitle ?? ""} onChange={ef("jobTitle")} />
                                                            : (
                                                                <div className="flex items-center gap-1 flex-wrap">
                                                                    <span className="font-medium capitalize">{job.jobTitle.toLowerCase()}</span>
                                                                    {job.requirementType === "NEW" && (
                                                                        <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-600 border-emerald-200">New</span>
                                                                    )}
                                                                    {job.requirementType === "CFR" && (
                                                                        <>
                                                                            <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border bg-rose-50 text-rose-600 border-rose-200">CFR</span>
                                                                            {showCfrExtend && canEditByRole && (
                                                                                <CfrExtendButton jobId={job.id} currentType={job.requirementType} onSuccess={() => refreshJob(job.id)} />
                                                                            )}
                                                                        </>
                                                                    )}
                                                                    {job.requirementType === "CFR_EXTENDED" && (
                                                                        <>
                                                                            <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border bg-amber-50 text-amber-600 border-amber-200">
                                                                                CFR Ext {job.cfrDaysRemaining !== undefined ? `· ${job.cfrDaysRemaining}d left` : ""}
                                                                            </span>
                                                                            {showCfrExtend && canEditByRole && (
                                                                                <CfrExtendButton jobId={job.id} currentType={job.requirementType} onSuccess={() => refreshJob(job.id)} />
                                                                            )}
                                                                        </>
                                                                    )}
                                                                    {job.urgency && (
                                                                        <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${job.urgency === "HOT" ? "bg-red-50 text-red-600 border-red-200" :
                                                                            job.urgency === "WARM" ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                                                "bg-blue-50 text-blue-600 border-blue-200"
                                                                            }`}>{job.urgency}</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                    </div>
                                                </TableCell>
                                                {/* Status */}
                                                <TableCell className="py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-center">
                                                    <div className={cn("flex justify-center", isClosed && "opacity-40 grayscale-[0.5]")}>
                                                        <JobStatusSelect job={job} onRefresh={() => refreshJob(job.id)} />
                                                    </div>
                                                </TableCell>
                                                {/* Pod & Recruiters */}
                                                {showPod && (
                                                    <>
                                                        <TableCell className="py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                                            <div className={cn(isClosed && "opacity-40 grayscale-[0.5]")}>
                                                                {(() => {
                                                                    const resolvedAssignedPods =
                                                                        job.pods && job.pods.length > 0
                                                                            ? job.pods
                                                                            : job.pod ? [job.pod] : [];

                                                                    const myPodIds = new Set(availablePods.map(p => p.id));
                                                                    const isJobActive = job.status !== "CLOSED" && job.status !== "FILLED";
                                                                    const canEdit = (isAdmin || isDeliveryHead || isAccountManager) && isJobActive;

                                                                    return (
                                                                        <div className="flex flex-col gap-1.5">
                                                                            <PodAssignCell
                                                                                jobId={job.id}
                                                                                jobCode={job.jobCode}
                                                                                assignedPods={resolvedAssignedPods}
                                                                                availablePods={availablePods}
                                                                                assignedRecruiters={job.assignedRecruiters || []}
                                                                                canEdit={canEdit}
                                                                                onSuccess={() => refreshJob(job.id)}
                                                                            />
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </TableCell>
                                                    </>
                                                )}
                                                {/* Account Manager */}
                                                {showAccountManager && (
                                                    <TableCell className="py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start whitespace-nowrap">
                                                        <div className={cn("flex flex-col", isClosed && "opacity-40 grayscale-[0.5]")}>
                                                            <span className="font-medium text-sm">{job.accountManager?.fullName || "N/A"}</span>
                                                            <span className="text-[10px] text-muted-foreground">{job.accountManager?.email}</span>
                                                        </div>
                                                    </TableCell>
                                                )}
                                                {/* Type / Location */}
                                                <TableCell className="py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                                    <div className={cn(isClosed && "opacity-40 grayscale-[0.5]")}>
                                                        {isEditing ? (
                                                            <div className="flex flex-col gap-1">
                                                                <Select value={editForm.jobType ?? ""} onValueChange={efSel("jobType")}>
                                                                    <SelectTrigger className={selCls}><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {["FULL_TIME", "PART_TIME", "CONTRACT", "CONTRACT_TO_HIRE", "TEMPORARY", "INTERNSHIP", "FREELANCE"].map(t => <SelectItem key={t} value={t} className="text-xs">{t.replace(/_/g, " ")}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                                <LocationSelect
                                                                    value={editForm.jobLocation ?? ""}
                                                                    onChange={(val) => setEditForm(p => ({ ...p, jobLocation: val }))}
                                                                    placeholder="Select location"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-xs font-medium capitalize">{(job.jobType || "").replace(/_/g, " ").toLowerCase()}</span>
                                                                <span className="text-[10px] text-muted-foreground capitalize">{job.jobLocation}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                {/* Visa */}
                                                <TableCell className="py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                                    <div className={cn(isClosed && "opacity-40 grayscale-[0.5]")}>
                                                        {isEditing ? (
                                                            <MultiSelect
                                                                options={visaOptions}
                                                                selected={parseVisaTypes(editForm.visaType)}
                                                                onChange={(selected) => setEditForm((prev) => ({ ...prev, visaType: selected.join(",") }))}
                                                                placeholder="Select visa type(s)"
                                                            />
                                                        ) : (
                                                            <Badge variant="outline" className="text-[8px] px-1.5 py-0">{formatVisaType(job.visaType)}</Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                {/* Client */}
                                                <TableCell className="py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                                    <div className={cn(isClosed && "opacity-40 grayscale-[0.5]")}>
                                                        {isEditing
                                                            ? <Input className={inputCls} value={editForm.clientName ?? ""} onChange={ef("clientName")} />
                                                            : job.clientName}
                                                    </div>
                                                </TableCell>
                                                {/* End Client */}
                                                <TableCell className="py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                                    <div className={cn(isClosed && "opacity-40 grayscale-[0.5]")}>
                                                        {isEditing
                                                            ? <Input className={inputCls} value={editForm.endClientName ?? ""} onChange={ef("endClientName")} />
                                                            : job.endClientName}
                                                    </div>
                                                </TableCell>
                                                {/* Positions */}
                                                <TableCell className="py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-center">
                                                    <div className={cn(isClosed && "opacity-40 grayscale-[0.5]")}>
                                                        {isEditing
                                                            ? <Input type="number" min={1} className={inputCls} value={editForm.noOfPositions ?? ""} onChange={(e) => setEditForm(p => ({ ...p, noOfPositions: parseInt(e.target.value) }))} />
                                                            : <span className="font-semibold text-sm">{job.noOfPositions ?? "-"}</span>}
                                                    </div>
                                                </TableCell>
                                                {/* Submissions */}
                                                <TableCell className="py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-center">
                                                    <div className={cn(isClosed && "opacity-40 grayscale-[0.5]")}>
                                                        {isEditing ? (
                                                            <Input type="number" min={0} className={inputCls} value={editForm.submissionRequired ?? ""} onChange={(e) => setEditForm(p => ({ ...p, submissionRequired: parseInt(e.target.value) }))} />
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <span className="font-medium text-sm">{job.submissionDone ?? 0} / {job.submissionRequired ?? 0}</span>
                                                                <span className="text-[9px] text-muted-foreground">done / req</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Req Type */}
                                                <TableCell className="py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                                    <div className={cn("flex flex-col gap-1", isClosed && "opacity-40 grayscale-[0.5]")}>
                                                        {job.requirementType === "NEW" && (
                                                            <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border w-fit bg-emerald-50 text-emerald-700 border-emerald-200">New</span>
                                                        )}
                                                        {job.requirementType === "CFR" && (
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border w-fit bg-red-50 text-red-700 border-red-200">Carry Forward</span>
                                                                {showCfrExtend && <CfrExtendButton jobId={job.id} currentType={job.requirementType} onSuccess={() => refreshJob(job.id)} />}
                                                            </div>
                                                        )}
                                                        {job.requirementType === "CFR_EXTENDED" && (
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border w-fit bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap">
                                                                    CFR Ext · {job.cfrDaysRemaining ?? 0}d left
                                                                </span>
                                                                {showCfrExtend && <CfrExtendButton jobId={job.id} currentType={job.requirementType} onSuccess={() => refreshJob(job.id)} />}
                                                            </div>
                                                        )}
                                                        {!["NEW", "CFR", "CFR_EXTENDED"].includes(job.requirementType) && (
                                                            <span className="text-[8px] capitalize text-neutral-500">{(job.requirementType || "").replace(/_/g, " ").toLowerCase()}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                {/* CFR Age */}
                                                <TableCell className="py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-center">
                                                    <div className={cn(isClosed && "opacity-40 grayscale-[0.5]")}>
                                                        <span className="text-sm font-medium">{job.carryForwardAge ?? 0}</span>
                                                    </div>
                                                </TableCell>
                                                {/* Rates */}
                                                {showRates && (
                                                    <TableCell className="py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start">
                                                        <div className={cn(isClosed && "opacity-40 grayscale-[0.5]")}>
                                                            {isEditing ? (
                                                                <div className="flex flex-col gap-1">
                                                                    <Input className={inputCls} value={editForm.clientBillRate ?? ""} onChange={ef("clientBillRate")} placeholder="Bill rate" />
                                                                    <Input className={inputCls} value={editForm.payRate ?? ""} onChange={ef("payRate")} placeholder="Pay rate" />
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-0.5 text-xs">
                                                                    <span><span className="text-muted-foreground">Bill:</span> {job.clientBillRate ? `$${job.clientBillRate}` : "-"}</span>
                                                                    <span><span className="text-muted-foreground">Pay:</span> {job.payRate ? `$${job.payRate}` : "-"}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                )}
                                                {/* Created Date */}
                                                <TableCell className="py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start whitespace-nowrap">
                                                    <div className={cn(isClosed && "opacity-40 grayscale-[0.5]")}>
                                                        {showEstCreatedDateTime ? (
                                                            <div className="flex flex-col">
                                                                <span className="text-sm">{estDateFormatter.format(new Date(job.createdAt))}</span>
                                                                <span className="text-[10px] text-muted-foreground">{estTimeFormatter.format(new Date(job.createdAt))}</span>
                                                            </div>
                                                        ) : new Date(job.createdAt).toLocaleDateString()}
                                                    </div>
                                                </TableCell>
                                                {/* Last Updated */}
                                                <TableCell className="py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-start whitespace-nowrap">
                                                    <div className={cn("flex flex-col", isClosed && "opacity-40 grayscale-[0.5]")}>
                                                        <span className="text-sm">{estDateFormatter.format(new Date(job.updatedAt))}</span>
                                                        <span className="text-[10px] text-muted-foreground">{estTimeFormatter.format(new Date(job.updatedAt))}</span>
                                                    </div>
                                                </TableCell>

                                                {/* Actions */}
                                                {showActions && (
                                                    <TableCell className="py-2 px-4 border-b border-r border-neutral-200 dark:border-slate-600 text-end">
                                                        <div className="flex justify-end gap-1">
                                                            {isEditing ? (
                                                                <>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => saveEdit(job.id)} disabled={isSaving} title="Save">
                                                                        <Save className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={cancelEdit} title="Cancel">
                                                                        <XIcon className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" asChild>
                                                                        <Link href={`${baseUrl}/${job.id}${typeof window !== 'undefined' ? `?from=${window.location.pathname}` : ''}`}><Eye className="h-4 w-4" /></Link>
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20" onClick={() => startEdit(job)} title="Edit">
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                )}
                                                {/* Sticky-right ⋮ menu for DH & Admin */}
                                                {canEditByRole && (
                                                    <TableCell
                                                        className={cn(
                                                            "sticky right-0 z-30 py-2 px-2 border-b border-l border-neutral-200 dark:border-slate-600 text-center w-12 min-w-[48px] shadow-[-1px_0_0_0_rgba(226,232,240,1)] dark:shadow-[-1px_0_0_0_rgba(71,85,105,1)]",
                                                            stickyBgClass
                                                        )}
                                                    >
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-slate-700"
                                                                    title="Action"
                                                                >
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" side="bottom" className="w-40">
                                                                <DropdownMenuItem
                                                                    className="gap-2 cursor-pointer"
                                                                    asChild
                                                                >
                                                                    <Link href={`${baseUrl}/${job.id}${typeof window !== 'undefined' ? `?from=${window.location.pathname}` : ''}`}>
                                                                        <Eye className="h-3.5 w-3.5 text-blue-500" />
                                                                        View Details
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => setEditDialogJob(job)}
                                                                    className="gap-2 cursor-pointer"
                                                                >
                                                                    <Edit2 className="h-3.5 w-3.5 text-amber-500" />
                                                                    Edit job
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                });
                            })()
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls — hidden when parent owns pagination */}
            {!serverPaginated && totalPages > 1 && (
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
            {/* Job edit popup dialog */}
            <JobEditDialog
                job={editDialogJob as any}
                isOpen={!!editDialogJob}
                onClose={() => setEditDialogJob(null)}
                onSuccess={() => {
                    const savedId = editDialogJob?.id;
                    setEditDialogJob(null);
                    if (savedId && onJobUpdated) {
                        onJobUpdated(savedId);
                    } else if (onRefresh) {
                        onRefresh();
                    }
                }}
            />
        </div>
    );
}
