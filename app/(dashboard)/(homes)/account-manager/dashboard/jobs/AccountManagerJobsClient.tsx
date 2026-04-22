"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import JobsTable from "@/components/dashboard/account-manager/JobsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useSocket } from "@/contexts/SocketContext";
import { toast } from "react-hot-toast";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, Search, Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageMeta { total: number; page: number; limit: number; totalPages: number; }

const LIMIT = 25;

function extract(data: any) {
    const jobs = Array.isArray(data) ? data : (data?.data ?? data?.jobs ?? data?.content ?? []);
    const total = data?.total ?? data?.totalCount ?? jobs.length;
    const page = data?.page ?? data?.currentPage ?? 1;
    const limit = data?.limit ?? data?.pageSize ?? LIMIT;
    const totalPages = data?.totalPages ?? data?.pages ?? Math.ceil(total / limit) ?? 1;
    return { jobs: Array.isArray(jobs) ? jobs : [], meta: { total, page, limit, totalPages } as PageMeta };
}

/** Build query string from active filters */
function buildQuery(page: number, search: string, status: string, dateRange: DateRange | undefined): string {
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (search.trim()) params.set("search", search.trim());
    if (status && status !== "all") params.set("status", status);
    if (dateRange?.from) params.set("startDate", format(dateRange.from, "yyyy-MM-dd"));
    if (dateRange?.to) params.set("endDate", format(dateRange.to, "yyyy-MM-dd"));
    return `/jobs?${params.toString()}`;
}

export default function AccountManagerJobsClient() {
    const [currentPage, setCurrentPage] = useState(1);
    const [jobs, setJobs] = useState<any[]>([]);
    const [meta, setMeta] = useState<PageMeta>({ total: 0, page: 1, limit: LIMIT, totalPages: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── Server-side filter state
    const [searchInput, setSearchInput] = useState("");     // raw input (controlled)
    const [searchQuery, setSearchQuery] = useState("");     // debounced value sent to API
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const { socket } = useSocket();
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // ── Debounce search input → searchQuery (400ms)
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearchQuery(searchInput);
            setCurrentPage(1);
        }, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchInput]);

    const fetchPage = useCallback(async (page: number, search: string, status: string, dates: DateRange | undefined) => {
        try {
            const url = buildQuery(page, search, status, dates);
            const res = await apiClient(url);
            if (!res.ok) throw new Error(`${res.status}`);
            return extract(await res.json());
        } catch { return null; }
    }, []);

    const load = useCallback(async (page: number, search: string, status: string, dates: DateRange | undefined) => {
        setIsLoading(true);
        setError(null);
        const r = await fetchPage(page, search, status, dates);
        setIsLoading(false);
        if (!r) { setError("Failed to load jobs."); return; }
        setJobs(r.jobs);
        setMeta(r.meta);
        setCurrentPage(page);
    }, [fetchPage]);

    // Re-fetch whenever page or any filter changes
    useEffect(() => {
        load(currentPage, searchQuery, statusFilter, dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, searchQuery, statusFilter, dateRange]);

    // Socket listener — real-time new-job injection
    useEffect(() => {
        if (!socket) return;
        const handleNotification = async (payload: any) => {
            if (payload.type === "NEW_JOB" && payload.data?.jobId) {
                try {
                    const res = await apiClient(`/jobs/${payload.data.jobId}`);
                    if (res.ok) {
                        const newJob = await res.json();
                        setJobs(prev => {
                            if (prev.some(j => j.id === newJob.id)) return prev;
                            return [newJob, ...prev];
                        });
                        setMeta(prev => ({ ...prev, total: prev.total + 1 }));
                        toast.success("Jobs list updated with new requirement", { id: "jobs-auto-refresh", duration: 3000 });
                    }
                } catch {
                    load(1, searchQuery, statusFilter, dateRange);
                }
            }
        };
        socket.on("notification", handleNotification);
        return () => { socket.off("notification", handleNotification); };
    }, [socket, searchQuery, statusFilter, dateRange, load]);

    const refresh = useCallback(() => {
        load(currentPage, searchQuery, statusFilter, dateRange);
    }, [currentPage, searchQuery, statusFilter, dateRange, load]);

    /** Silently patch one job in state after an inline edit — no loading flicker */
    const handleJobUpdated = useCallback(async (jobId: string) => {
        try {
            const res = await apiClient(`/jobs/${jobId}`);
            if (!res.ok) return;
            const updated = await res.json();
            setJobs(prev => prev.map((j: any) => j.id === updated.id ? updated : j));
        } catch { /* silent */ }
    }, []);

    const clearFilters = () => {
        setSearchInput("");
        setSearchQuery("");
        setStatusFilter("all");
        setDateRange(undefined);
        setCurrentPage(1);
    };
    const hasActiveFilters = !!(searchInput || statusFilter !== "all" || dateRange?.from);

    const tp = meta.totalPages;
    const ps = meta.limit || LIMIT;
    const start = meta.total === 0 ? 0 : (currentPage - 1) * ps + 1;
    const end = Math.min(currentPage * ps, meta.total);
    const btns: number[] = tp <= 5
        ? Array.from({ length: tp }, (_, i) => i + 1)
        : currentPage <= 3 ? [1, 2, 3, 4, 5]
            : currentPage >= tp - 2 ? Array.from({ length: 5 }, (_, i) => tp - 4 + i)
                : Array.from({ length: 5 }, (_, i) => currentPage - 2 + i);

    return (
        <div className="space-y-4">
            {/* ── Server-side filter bar ── */}
            <div className="bg-neutral-50 dark:bg-slate-800/40 p-4 rounded-xl border border-neutral-200 dark:border-slate-700 flex flex-wrap gap-3 items-end">

                {/* Search */}
                <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                        <Input
                            id="am-jobs-search"
                            placeholder="Job title, code, or client..."
                            className="pl-9 h-10 bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg"
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                        />
                    </div>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Status</label>
                    <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[155px] h-10 bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="ON_HOLD">On Hold</SelectItem>
                            <SelectItem value="HOLD_BY_CLIENT">Hold By Client</SelectItem>
                            <SelectItem value="FILLED">Filled</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Date Range */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Date Range</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-[210px] h-10 justify-start text-left font-normal bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg",
                                    !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                <span className="flex-1 truncate">
                                    {dateRange?.from
                                        ? dateRange.to
                                            ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d")}`
                                            : format(dateRange.from, "MMM d, yyyy")
                                        : "Pick a range"}
                                </span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={d => { setDateRange(d); setCurrentPage(1); }}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Clear filters */}
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-neutral-500 hover:text-destructive hover:bg-destructive/10 self-end"
                        onClick={clearFilters}
                        title="Clear Filters"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                )}

                {/* Result count */}
                {!isLoading && meta.total > 0 && (
                    <span className="self-end text-xs text-neutral-500 italic ml-auto">
                        {meta.total.toLocaleString()} job{meta.total !== 1 ? "s" : ""} found
                    </span>
                )}
            </div>

            {/* ── Table ── */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <p className="text-sm text-destructive">{error}</p>
                    <Button variant="outline" size="sm" onClick={refresh}>Retry</Button>
                </div>
            ) : (
                <JobsTable
                    jobs={jobs}
                    baseUrl="/account-manager/dashboard/jobs"
                    showPod={true}
                    showActions={true}
                    showFilters={false}          // filters owned by this parent now
                    showEstCreatedDateTime={true}
                    serverPaginated={true}
                    serverTotal={meta.total}
                    onRefresh={refresh}
                    onJobUpdated={handleJobUpdated}
                />
            )}

            {/* ── Pagination controls ── */}
            {!isLoading && !error && tp > 1 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-muted-foreground italic">
                        Showing <span className="font-medium">{start}</span> to <span className="font-medium">{end}</span> of <span className="font-medium">{meta.total}</span> jobs
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                            {btns.map(n => (
                                <Button
                                    key={n}
                                    variant={currentPage === n ? "default" : "outline"}
                                    size="sm"
                                    className="h-8 w-8 text-xs"
                                    onClick={() => setCurrentPage(n)}
                                >
                                    {n}
                                </Button>
                            ))}
                        </div>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(tp, p + 1))} disabled={currentPage === tp}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(tp)} disabled={currentPage === tp}>
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
