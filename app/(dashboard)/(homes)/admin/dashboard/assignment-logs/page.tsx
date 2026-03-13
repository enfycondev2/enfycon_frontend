"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { apiClient } from "@/lib/apiClient";
import { 
    Loader2, 
    RefreshCw, 
    AlertCircle, 
    Search, 
    Calendar as CalendarIcon, 
    X, 
    ChevronLeft, 
    ChevronRight, 
    ChevronsLeft, 
    ChevronsRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import AssignmentLogsTable from "@/components/dashboard/admin/AssignmentLogsTable";

export default function AssignmentLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const limit = 20;

    // Filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let url = `/jobs/assignment-logs?page=${currentPage}&limit=${limit}`;
            if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
            if (dateRange?.from) url += `&startDate=${dateRange.from.toISOString()}`;
            if (dateRange?.to) url += `&endDate=${dateRange.to.toISOString()}`;

            const res = await apiClient(url);
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.message || `Error ${res.status}`);
            }
            const data = await res.json();
            setLogs(data.data || []);
            setTotalLogs(data.total || 0);
            setTotalPages(data.totalPages || 0);
        } catch (err: any) {
            setError(err.message || "Failed to load assignment logs.");
        } finally {
            setLoading(false);
        }
    }, [currentPage, debouncedSearch, dateRange]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const clearFilters = () => {
        setSearchQuery("");
        setDateRange(undefined);
        setCurrentPage(1);
    };

    return (
        <>
            <DashboardBreadcrumb title="Pod Assignment Logs" text="Admin Dashboard" />
            <div className="p-6 max-w-full mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Track and audit manual pod reassignments to ensure fair distribution.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchLogs}
                        disabled={loading}
                        className="gap-2 shrink-0 h-9"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>

                {/* Filters Section */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-neutral-200 dark:border-slate-700 flex flex-wrap gap-4 items-end shadow-sm">
                    <div className="flex-1 min-w-[250px] flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Search Job</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                            <Input
                                placeholder="Job title or code..."
                                className="pl-9 h-10 bg-neutral-50 dark:bg-slate-800/50 border-neutral-200 dark:border-slate-700 rounded-lg"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Date Range</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] h-10 justify-start text-left font-normal bg-neutral-50 dark:bg-slate-800/50 border-neutral-200 dark:border-slate-700 rounded-lg",
                                        !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                                {format(dateRange.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(dateRange.from, "LLL dd, y")
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
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={(range) => {
                                        setDateRange(range);
                                        setCurrentPage(1);
                                    }}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearFilters}
                        className="h-10 px-4 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-slate-800"
                    >
                        Clear
                    </Button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-700">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-neutral-500 dark:text-neutral-400 mt-4 font-medium italic">Loading logs...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 p-8 text-center">
                        <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-red-800 dark:text-red-400 mb-2">Something went wrong</h3>
                        <p className="text-red-600 dark:text-red-300 max-w-md mx-auto mb-6">
                            {error}
                        </p>
                        <Button onClick={fetchLogs} variant="default" className="bg-red-600 hover:bg-red-700 border-none px-6">
                            Try Again
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <AssignmentLogsTable logs={logs} />
                        
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-4 gap-4">
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 order-2 sm:order-1">
                                    Showing <span className="font-semibold text-neutral-900 dark:text-neutral-200">{(currentPage - 1) * limit + 1}</span> to <span className="font-semibold text-neutral-900 dark:text-neutral-200">{Math.min(currentPage * limit, totalLogs)}</span> of <span className="font-semibold text-neutral-900 dark:text-neutral-200">{totalLogs}</span> logs
                                </p>
                                <div className="flex items-center gap-2 order-1 sm:order-2">
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
                                                    className={cn("h-8 min-w-[32px] text-xs font-semibold", currentPage === pageNum ? "bg-primary text-white" : "")}
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
                )}
            </div>
        </>
    );
}
