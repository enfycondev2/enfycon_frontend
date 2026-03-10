"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import JobsTable from "@/components/dashboard/account-manager/JobsTable";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/contexts/SocketContext";
import { toast } from "react-hot-toast";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Loader2,
} from "lucide-react";

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
    accountManager?: { fullName: string | null; email: string };
    pod?: { id: string; name: string };
    pods?: { id: string; name: string }[];
    podIds?: string[];
    assignedRecruiters?: { id: string; fullName: string | null; email: string }[];
}

interface PageMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/**
 * Jobs per API page.
 *
 * The backend now sorts by:
 *   1. cfrDaysRemaining DESC  → CFR_EXTENDED jobs always float to the top of EVERY page
 *   2. createdAt DESC         → newest jobs follow
 *
 * So a single page of 100 always includes all active CFR_EXTENDED jobs first,
 * regardless of how many total jobs exist.  At 10 000 jobs/year (~27/day) the
 * backend guarantees correct ordering at the DB level.
 */
const LIMIT = 100;

function extractPageData(data: any): { jobs: Job[]; meta: PageMeta } {
    const jobs: Job[] = Array.isArray(data)
        ? data
        : (data?.data ?? data?.jobs ?? data?.content ?? []);

    const total: number = data?.total ?? data?.totalCount ?? data?.count ?? jobs.length;
    const page: number = data?.page ?? data?.currentPage ?? 1;
    const limit: number = data?.limit ?? data?.pageSize ?? LIMIT;
    const totalPages: number =
        data?.totalPages ?? data?.pages ?? Math.ceil(total / limit) ?? 1;

    return { jobs: Array.isArray(jobs) ? jobs : [], meta: { total, page, limit, totalPages } };
}

export default function DeliveryHeadJobsClient() {
    const [currentPage, setCurrentPage] = useState(1);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [meta, setMeta] = useState<PageMeta>({ total: 0, page: 1, limit: LIMIT, totalPages: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { socket } = useSocket();

    // Prefetch cache: pageNum → result
    const prefetchCache = useRef<Map<number, { jobs: Job[]; meta: PageMeta }>>(new Map());
    const prefetchingPages = useRef<Set<number>>(new Set());

    const fetchPage = useCallback(async (page: number): Promise<{ jobs: Job[]; meta: PageMeta } | null> => {
        try {
            const res = await apiClient(`/jobs?page=${page}&limit=${LIMIT}`);
            if (!res.ok) throw new Error(`API error: ${res.status}`);
            const data = await res.json();
            return extractPageData(data);
        } catch (err) {
            console.error(`[DeliveryHeadJobsClient] Failed to fetch page ${page}:`, err);
            return null;
        }
    }, []);

    const prefetchPage = useCallback((page: number, totalPages: number) => {
        if (
            page < 1 ||
            page > totalPages ||
            prefetchCache.current.has(page) ||
            prefetchingPages.current.has(page)
        ) return;

        prefetchingPages.current.add(page);
        fetchPage(page).then((result) => {
            if (result) prefetchCache.current.set(page, result);
            prefetchingPages.current.delete(page);
        });
    }, [fetchPage]);

    const goToPage = useCallback(async (page: number) => {
        if (page < 1 || page > meta.totalPages) return;

        // Serve from prefetch cache instantly if available
        const cached = prefetchCache.current.get(page);
        if (cached) {
            setJobs(cached.jobs);
            setMeta(cached.meta);
            setCurrentPage(page);
            prefetchPage(page + 1, cached.meta.totalPages);
            prefetchPage(page - 1, cached.meta.totalPages);
            return;
        }

        setIsLoading(true);
        setError(null);
        const result = await fetchPage(page);
        setIsLoading(false);

        if (!result) {
            setError("Failed to load jobs. Please try again.");
            return;
        }

        setJobs(result.jobs);
        setMeta(result.meta);
        setCurrentPage(page);
        prefetchPage(page + 1, result.meta.totalPages);
        prefetchPage(page - 1, result.meta.totalPages);
    }, [meta.totalPages, fetchPage, prefetchPage]);

    // Initial load
    useEffect(() => {
        (async () => {
            setIsLoading(true);
            setError(null);
            const result = await fetchPage(1);
            setIsLoading(false);
            if (!result) {
                setError("Failed to load jobs. Please try again.");
                return;
            }
            setJobs(result.jobs);
            setMeta(result.meta);
            setCurrentPage(1);
            // Immediately prefetch page 2 in the background
            if (result.meta.totalPages > 1) {
                prefetchPage(2, result.meta.totalPages);
            }
        })();
    }, [fetchPage, prefetchPage]);

    // Socket listener for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleNotification = async (payload: any) => {
            if (payload.type === "NEW_JOB" && payload.data?.jobId) {
                console.log("[DeliveryHeadJobsClient] Auto-refreshing due to NEW_JOB notification");

                try {
                    // Fetch just the new job to avoid a full page reload
                    const res = await apiClient(`/jobs/${payload.data.jobId}`);
                    if (res.ok) {
                        const newJob = await res.json();
                        // Add to the top of the current list
                        setJobs(prevJobs => {
                            // Avoid duplicates if we already got it
                            if (prevJobs.some(j => j.id === newJob.id)) return prevJobs;
                            return [newJob, ...prevJobs];
                        });

                        // Update total count
                        setMeta(prev => ({ ...prev, total: prev.total + 1 }));

                        // Clear prefetch cache so subsequent page visits get fresh data
                        prefetchCache.current.clear();
                        prefetchingPages.current.clear();

                        toast.success("Jobs list updated with new requirement", {
                            id: "jobs-auto-refresh",
                            duration: 3000,
                        });
                    }
                } catch (error) {
                    console.error("Failed to fetch new job details:", error);
                    // Fallback to full page refresh if single fetch fails
                    prefetchCache.current.clear();
                    prefetchingPages.current.clear();
                    goToPage(1);
                }
            }
        };

        socket.on("notification", handleNotification);
        return () => {
            socket.off("notification", handleNotification);
        };
    }, [socket, goToPage]);

    const totalPages = meta.totalPages;
    const pageSize = meta.limit || LIMIT;
    const startItem = meta.total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, meta.total);

    // Visible page number window (max 5 buttons)
    const pageButtons: number[] = [];
    if (totalPages <= 5) {
        for (let i = 1; i <= totalPages; i++) pageButtons.push(i);
    } else if (currentPage <= 3) {
        pageButtons.push(1, 2, 3, 4, 5);
    } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - 4; i <= totalPages; i++) pageButtons.push(i);
    } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) pageButtons.push(i);
    }

    const handleRefresh = () => {
        prefetchCache.current.clear();
        prefetchingPages.current.clear();
        goToPage(currentPage);
    };

    return (
        <div className="space-y-4">
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <p className="text-sm text-destructive">{error}</p>
                    <Button variant="outline" size="sm" onClick={handleRefresh}>Retry</Button>
                </div>
            ) : (
                <JobsTable
                    jobs={jobs}
                    baseUrl="/delivery-head/dashboard/jobs"
                    showAccountManager={true}
                    showPod={true}
                    showActions={false}
                    showFilters={true}
                    showEstCreatedDateTime={true}
                    showCfrExtend={true}
                    serverPaginated={false}
                    serverTotal={meta.total}
                    onRefresh={handleRefresh}
                />
            )}

            {/* Pagination controls */}
            {!isLoading && !error && totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-muted-foreground italic">
                        Showing{" "}
                        <span className="font-medium">{startItem}</span> to{" "}
                        <span className="font-medium">{endItem}</span> of{" "}
                        <span className="font-medium">{meta.total}</span> jobs
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline" size="icon" className="h-8 w-8"
                            onClick={() => goToPage(1)} disabled={currentPage === 1}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline" size="icon" className="h-8 w-8"
                            onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                            {pageButtons.map((pageNum) => (
                                <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    className="h-8 w-8 text-xs"
                                    onClick={() => goToPage(pageNum)}
                                    onMouseEnter={() => prefetchPage(pageNum, totalPages)}
                                >
                                    {pageNum}
                                </Button>
                            ))}
                        </div>
                        <Button
                            variant="outline" size="icon" className="h-8 w-8"
                            onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline" size="icon" className="h-8 w-8"
                            onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
