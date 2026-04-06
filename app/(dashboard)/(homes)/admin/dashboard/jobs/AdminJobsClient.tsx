"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import JobsTable from "@/components/dashboard/account-manager/JobsTable";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/contexts/SocketContext";
import { toast } from "react-hot-toast";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";

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

export default function AdminJobsClient() {
    const [currentPage, setCurrentPage] = useState(1);
    const [jobs, setJobs] = useState<any[]>([]);
    const [meta, setMeta] = useState<PageMeta>({ total: 0, page: 1, limit: LIMIT, totalPages: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { socket } = useSocket();
    const cache = useRef<Map<number, { jobs: any[]; meta: PageMeta }>>(new Map());
    const inflight = useRef<Set<number>>(new Set());

    const fetchPage = useCallback(async (page: number) => {
        try {
            const res = await apiClient(`/jobs?page=${page}&limit=${LIMIT}`);
            if (!res.ok) throw new Error(`${res.status}`);
            return extract(await res.json());
        } catch { return null; }
    }, []);

    const prefetch = useCallback((page: number, total: number) => {
        if (page < 1 || page > total || cache.current.has(page) || inflight.current.has(page)) return;
        inflight.current.add(page);
        fetchPage(page).then(r => { if (r) cache.current.set(page, r); inflight.current.delete(page); });
    }, [fetchPage]);

    const goTo = useCallback(async (page: number) => {
        if (page < 1 || page > meta.totalPages) return;
        const hit = cache.current.get(page);
        if (hit) { setJobs(hit.jobs); setMeta(hit.meta); setCurrentPage(page); prefetch(page + 1, hit.meta.totalPages); prefetch(page - 1, hit.meta.totalPages); return; }
        setIsLoading(true); setError(null);
        const r = await fetchPage(page); setIsLoading(false);
        if (!r) { setError("Failed to load jobs."); return; }
        setJobs(r.jobs); setMeta(r.meta); setCurrentPage(page);
        prefetch(page + 1, r.meta.totalPages); prefetch(page - 1, r.meta.totalPages);
    }, [meta.totalPages, fetchPage, prefetch]);

    useEffect(() => {
        (async () => {
            setIsLoading(true); setError(null);
            const r = await fetchPage(1); setIsLoading(false);
            if (!r) { setError("Failed to load jobs."); return; }
            setJobs(r.jobs); setMeta(r.meta); setCurrentPage(1);
            if (r.meta.totalPages > 1) prefetch(2, r.meta.totalPages);
        })();
    }, [fetchPage, prefetch]);

    // Socket listener for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleNotification = async (payload: any) => {
            if (payload.type === "NEW_JOB" && payload.data?.jobId) {
                console.log("[AdminJobsClient] Auto-refreshing due to NEW_JOB notification");

                try {
                    // Fetch just the new job to avoid a full page reload
                    const res = await apiClient(`/jobs/${payload.data.jobId}`);
                    if (res.ok) {
                        const newJob = await res.json();
                        // Add to the top of the current list
                        setJobs(prevJobs => {
                            if (prevJobs.some(j => j.id === newJob.id)) return prevJobs;
                            return [newJob, ...prevJobs];
                        });

                        // Update total count
                        setMeta(prev => ({ ...prev, total: prev.total + 1 }));

                        // Clear prefetch cache so subsequent page visits get fresh data
                        cache.current.clear();
                        inflight.current.clear();

                        toast.success("Jobs list updated with new requirement", {
                            id: "jobs-auto-refresh",
                            duration: 3000,
                        });
                    }
                } catch (error) {
                    console.error("Failed to fetch new job details:", error);
                    // Fallback to full page refresh if single fetch fails
                    cache.current.clear();
                    inflight.current.clear();
                    goTo(1);
                }
            }
        };

        socket.on("notification", handleNotification);
        return () => {
            socket.off("notification", handleNotification);
        };
    }, [socket, goTo]);

    const tp = meta.totalPages;
    const ps = meta.limit || LIMIT;
    const start = meta.total === 0 ? 0 : (currentPage - 1) * ps + 1;
    const end = Math.min(currentPage * ps, meta.total);
    const btns: number[] = tp <= 5 ? Array.from({ length: tp }, (_, i) => i + 1)
        : currentPage <= 3 ? [1, 2, 3, 4, 5]
            : currentPage >= tp - 2 ? Array.from({ length: 5 }, (_, i) => tp - 4 + i)
                : Array.from({ length: 5 }, (_, i) => currentPage - 2 + i);

    const refresh = () => { cache.current.clear(); inflight.current.clear(); goTo(currentPage); };

    /** Silently patch one job in state after an edit — no loading flicker */
    const handleJobUpdated = useCallback(async (jobId: string) => {
        try {
            const res = await apiClient(`/jobs/${jobId}`);
            if (!res.ok) return;
            const updated = await res.json();
            setJobs(prev => prev.map((j: any) => j.id === updated.id ? updated : j));
            cache.current.clear();
            inflight.current.clear();
        } catch {
            // Silently ignore
        }
    }, []);

    return (
        <div className="space-y-4">
            {isLoading ? (
                <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <p className="text-sm text-destructive">{error}</p>
                    <Button variant="outline" size="sm" onClick={refresh}>Retry</Button>
                </div>
            ) : (
                <JobsTable
                    jobs={jobs}
                    baseUrl="/admin/dashboard/jobs"
                    showAccountManager={true}
                    showPod={true}
                    showActions={false}
                    showFilters={true}
                    showEstCreatedDateTime={true}
                    showCfrExtend={true}
                    showRates={false}
                    serverPaginated={true}
                    serverTotal={meta.total}
                    onRefresh={refresh}
                    onJobUpdated={handleJobUpdated}
                />
            )}
            {!isLoading && !error && tp > 1 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-muted-foreground italic">Showing <span className="font-medium">{start}</span> to <span className="font-medium">{end}</span> of <span className="font-medium">{meta.total}</span> jobs</p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goTo(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                        <div className="flex items-center gap-1">
                            {btns.map(n => (
                                <Button key={n} variant={currentPage === n ? "default" : "outline"} size="sm" className="h-8 w-8 text-xs" onClick={() => goTo(n)} onMouseEnter={() => prefetch(n, tp)}>{n}</Button>
                            ))}
                        </div>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goTo(currentPage + 1)} disabled={currentPage === tp}><ChevronRight className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goTo(tp)} disabled={currentPage === tp}><ChevronsRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            )}
        </div>
    );
}
