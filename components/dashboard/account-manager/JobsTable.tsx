"use client";

import { useState, useMemo, useEffect } from "react";
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
    Filter
} from "lucide-react";
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

import { apiClient } from "@/lib/apiClient";

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
    onRefresh?: () => void;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "warning" | "success" | "info" }> = {
    ACTIVE: { label: "Active", variant: "success" },
    CLOSED: { label: "Closed", variant: "destructive" },
    ON_HOLD: { label: "On Hold", variant: "warning" },
    HOLD_BY_CLIENT: { label: "Hold By Client", variant: "secondary" },
    FILLED: { label: "Filled", variant: "info" },
};

function JobStatusSelect({ job, onRefresh }: { job: Job; onRefresh?: () => void }) {
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
            if (onRefresh) onRefresh();
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
                    className="font-semibold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider absolute "
                >
                    {currentConfig.label}
                </Badge>
            </SelectTrigger>
            <SelectContent>
                {Object.entries(statusMap).map(([key, config]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                        <Badge
                            variant={config.variant as any}
                            className="font-semibold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider"
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
    jobs,
    baseUrl = "/account-manager/dashboard/jobs",
    showActions = true,
    showAccountManager = false,
    showPod = false,
    showFilters = false,
    showEstCreatedDateTime = false,
    onRefresh
}: JobsTableProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const [currentPage, setCurrentPage] = useState(1);
    const [podFilter, setPodFilter] = useState<string>("all");
    const [amFilter, setAmFilter] = useState<string>("all");
    const [clientFilter, setClientFilter] = useState<string>("all");
    const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<string>("date-desc");

    // Modal states
    const [editJob, setEditJob] = useState<Job | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const [availablePods, setAvailablePods] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        if (showPod) {
            apiClient("/pods/my-pods")
                .then(res => res.ok ? res.json() : [])
                .then(data => {
                    if (Array.isArray(data)) {
                        setAvailablePods(data.map((p: any) => ({ id: p.id, name: p.name })));
                    } else if (data && Array.isArray(data.items)) {
                        setAvailablePods(data.items.map((p: any) => ({ id: p.id, name: p.name })));
                    } else if (data && Array.isArray(data.data)) {
                        setAvailablePods(data.data.map((p: any) => ({ id: p.id, name: p.name })));
                    }
                })
                .catch(console.error);
        }
    }, [showPod]);

    const itemsPerPage = 10;

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
        return jobs.filter(job => {
            const matchesPod = podFilter === "all" || job.pod?.id === podFilter || job.pods?.some((p: any) => p.id === podFilter) || job.podIds?.includes(podFilter);
            const matchesAM = amFilter === "all" || job.accountManager?.email === amFilter;
            const matchesClient = clientFilter === "all" || job.clientName === clientFilter;
            const matchesDate = !dateFilter || isSameDay(new Date(job.createdAt), dateFilter);
            const matchesSearch = !searchQuery ||
                job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.jobCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.clientName.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesPod && matchesAM && matchesClient && matchesDate && matchesSearch;
        });
    }, [jobs, podFilter, amFilter, clientFilter, dateFilter, searchQuery]);

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

    const estDateFormatter = { format: (date: Date) => formatUsDate(date) };
    const estTimeFormatter = { format: (date: Date) => formatUsTime(date) };

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
        setPodFilter("all");
        setAmFilter("all");
        setClientFilter("all");
        setDateFilter(undefined);
        setSearchQuery("");
        setSortBy("date-desc");
        setCurrentPage(1);
    };

    const handleEdit = (job: any) => {
        setEditJob(job);
        setIsEditDialogOpen(true);
    };



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
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Date</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[150px] h-10 justify-start text-left font-normal bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg",
                                        !dateFilter && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateFilter ? format(dateFilter, "PPP") : <span>Pick date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={dateFilter}
                                    onSelect={(d) => { setDateFilter(d); setCurrentPage(1); }}
                                    initialFocus
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

                    {(podFilter !== "all" || amFilter !== "all" || clientFilter !== "all" || dateFilter || searchQuery || sortBy !== "date-desc") && (
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

            <div className="rounded-lg border border-neutral-200 dark:border-slate-600 overflow-hidden">
                <Table className="table-auto border-spacing-0 border-separate">
                    <TableHeader>
                        <TableRow className="border-0">
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Job Title
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Job Code
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Type / Location
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Visa
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Client
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                End Client
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                                Positions
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                                Submissions
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Urgency
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Req Type
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                                CFR Age
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Rates
                            </TableHead>
                            {showAccountManager && (
                                <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                    Account Manager
                                </TableHead>
                            )}
                            {showPod && (
                                <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                    Assigned Pod
                                </TableHead>
                            )}
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Created Date
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                                Last Updated
                            </TableHead>
                            <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                                Status
                            </TableHead>
                            {showActions && (
                                <TableHead className="bg-neutral-100 dark:bg-slate-700 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-end">
                                    Actions
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentJobs.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={13 + (showAccountManager ? 1 : 0) + (showPod ? 1 : 0) + (showActions ? 1 : 0)}
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
                                            <code className="bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">
                                                {job.jobCode}
                                            </code>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start whitespace-nowrap">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-medium capitalize">{(job.jobType || "").replace("_", " ").toLowerCase()}</span>
                                                <span className="text-[10px] text-muted-foreground capitalize">{job.jobLocation}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start">
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{job.visaType}</Badge>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start">
                                            {job.clientName}
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start">
                                            {job.endClientName}
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center">
                                            <span className="font-semibold text-sm">{job.noOfPositions ?? "-"}</span>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className="font-medium text-sm">{job.submissionDone ?? 0} / {job.submissionRequired ?? 0}</span>
                                                <span className="text-[10px] text-muted-foreground">done / req</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start">
                                            {job.urgency && (
                                                <Badge variant={job.urgency === "HOT" ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0 w-fit">{job.urgency}</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start">
                                            <span className="text-xs capitalize">{(job.requirementType || "").replace(/_/g, " ").toLowerCase()}</span>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center">
                                            <span className="text-sm font-medium">{job.carryForwardAge ?? 0}</span>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start whitespace-nowrap">
                                            <div className="flex flex-col gap-0.5 text-xs">
                                                <span><span className="text-muted-foreground">Bill:</span> {job.clientBillRate || "-"}</span>
                                                <span><span className="text-muted-foreground">Pay:</span> {job.payRate || "-"}</span>
                                            </div>
                                        </TableCell>
                                        {showAccountManager && (
                                            <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{job.accountManager?.fullName || "N/A"}</span>
                                                    <span className="text-[10px] text-muted-foreground">{job.accountManager?.email}</span>
                                                </div>
                                            </TableCell>
                                        )}
                                        {showPod && (
                                            <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start">
                                                <PodAssignCell
                                                    jobId={job.id}
                                                    assignedPods={
                                                        job.pods && job.pods.length > 0
                                                            ? job.pods
                                                            : job.podIds && job.podIds.length > 0 && availablePods.length > 0
                                                                ? (job.podIds.map(id => availablePods.find(p => p.id === id)).filter(Boolean) as { id: string; name: string }[])
                                                                : job.pod
                                                                    ? [job.pod]
                                                                    : []
                                                    }
                                                    availablePods={availablePods}
                                                    canEdit={(session as any)?.user?.roles?.includes("DELIVERY_HEAD") || (session as any)?.user?.roles?.includes("ADMIN")}
                                                    onSuccess={() => {
                                                        if (onRefresh) onRefresh();
                                                        else router.refresh();
                                                    }}
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start whitespace-nowrap">
                                            {showEstCreatedDateTime
                                                ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-sm">
                                                            {estDateFormatter.format(new Date(job.createdAt))}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {estTimeFormatter.format(new Date(job.createdAt))}
                                                        </span>
                                                    </div>
                                                )
                                                : new Date(job.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm">{estDateFormatter.format(new Date(job.updatedAt))}</span>
                                                <span className="text-[10px] text-muted-foreground">{estTimeFormatter.format(new Date(job.updatedAt))}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center flex justify-center">
                                            <JobStatusSelect job={job} onRefresh={onRefresh} />
                                        </TableCell>
                                        {showActions && (
                                            <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-end">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" asChild>
                                                        <Link href={`${baseUrl}/${job.id}`}>
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20" onClick={() => handleEdit(job)}>
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>

                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <JobEditDialog
                job={editJob as any}
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                onSuccess={() => {
                    if (onRefresh) {
                        onRefresh();
                    } else {
                        router.refresh();
                    }
                }}
            />



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
        </div>
    );
}
