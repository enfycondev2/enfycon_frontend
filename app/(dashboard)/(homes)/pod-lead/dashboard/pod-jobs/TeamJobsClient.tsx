"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import RecruiterJobsTable from "@/components/dashboard/recruiter/RecruiterJobsTable";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/contexts/SocketContext";
import { toast } from "react-hot-toast";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";

interface PageMeta { total: number; page: number; limit: number; totalPages: number; }

const LIMIT = 100;

function extract(data: any) {
    const jobs = Array.isArray(data) ? data : (data?.data ?? data?.jobs ?? data?.content ?? []);
    const total = data?.total ?? data?.totalCount ?? jobs.length;
    const page = data?.page ?? data?.currentPage ?? 1;
    const limit = data?.limit ?? data?.pageSize ?? LIMIT;
    const totalPages = data?.totalPages ?? data?.pages ?? Math.ceil(total / limit) ?? 1;
    return { jobs: Array.isArray(jobs) ? jobs : [], meta: { total, page, limit, totalPages } as PageMeta };
}

interface TeamJobsClientProps {
    teamMemberIds: string[];
}

export default function TeamJobsClient({ teamMemberIds }: TeamJobsClientProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [jobs, setJobs] = useState<any[]>([]);
    const [meta, setMeta] = useState<PageMeta>({ total: 0, page: 1, limit: LIMIT, totalPages: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { socket } = useSocket();
    const cache = useRef<Map<number, { jobs: any[]; meta: PageMeta }>>(new Map());
    const inflight = useRef<Set<number>>(new Set());

    const teamIdSet = React.useMemo(() => new Set(teamMemberIds), [teamMemberIds]);

    const filterTeamJobs = useCallback((allJobs: any[]) => {
        return allJobs.filter((job: any) => {
            if (!job.assignedRecruiters || job.assignedRecruiters.length === 0) return false;
            return job.assignedRecruiters.some((rec: any) => teamIdSet.has(rec.id));
        });
    }, [teamIdSet]);

    const fetchPage = useCallback(async (page: number) => {
        try {
            const res = await apiClient(`/jobs?page=${page}&limit=${LIMIT}`);
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json();
            const extracted = extract(data);
            // Filter the batch for team-assigned jobs
            return {
                jobs: filterTeamJobs(extracted.jobs),
                meta: extracted.meta
            };
        } catch { return null; }
    }, [filterTeamJobs]);

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
        if (!r) { setError("Failed to load team jobs."); return; }
        setJobs(r.jobs); setMeta(r.meta); setCurrentPage(page);
        prefetch(page + 1, r.meta.totalPages); prefetch(page - 1, r.meta.totalPages);
    }, [meta.totalPages, fetchPage, prefetch]);

    useEffect(() => {
        (async () => {
            setIsLoading(true); setError(null);
            const r = await fetchPage(1); setIsLoading(false);
            if (!r) { setError("Failed to load team jobs."); return; }
            setJobs(r.jobs); setMeta(r.meta); setCurrentPage(1);
            if (r.meta.totalPages > 1) prefetch(2, r.meta.totalPages);
        })();
    }, [fetchPage, prefetch]);

    // Socket listener for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleNotification = async (payload: any) => {
            if (payload.type === "NEW_JOB" && payload.data?.jobId) {
                try {
                    const res = await apiClient(`/jobs/${payload.data.jobId}`);
                    if (res.ok) {
                        const newJob = await res.json();
                        // Only add if it belongs to our team
                        const filtered = filterTeamJobs([newJob]);
                        if (filtered.length > 0) {
                            setJobs(prevJobs => {
                                if (prevJobs.some(j => j.id === newJob.id)) return prevJobs;
                                return [newJob, ...prevJobs];
                            });
                            setMeta(prev => ({ ...prev, total: prev.total + 1 }));
                        }

                        cache.current.clear();
                        inflight.current.clear();
                    }
                } catch (error) {
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
    }, [socket, goTo, filterTeamJobs]);

    const tp = meta.totalPages;
    const ps = meta.limit || LIMIT;
    const start = meta.total === 0 ? 0 : (currentPage - 1) * ps + 1;
    const end = Math.min(currentPage * ps, meta.total);
    const btns: number[] = tp <= 5 ? Array.from({ length: tp }, (_, i) => i + 1)
        : currentPage <= 3 ? [1, 2, 3, 4, 5]
            : currentPage >= tp - 2 ? Array.from({ length: 5 }, (_, i) => tp - 4 + i)
                : Array.from({ length: 5 }, (_, i) => currentPage - 2 + i);

    const refresh = () => { cache.current.clear(); inflight.current.clear(); goTo(currentPage); };

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
                <RecruiterJobsTable
                    jobs={jobs}
                    baseUrl="/pod-lead/dashboard/jobs"
                    onRefresh={refresh}
                />
            )}
            {!isLoading && !error && tp > 1 && (
                <div className="flex items-center justify-between px-2 pt-1 border-t border-neutral-100 dark:border-slate-700">
                    <p className="text-xs text-muted-foreground italic">
                        Batch <span className="font-medium">{currentPage}</span> of <span className="font-medium">{tp}</span> — showing jobs in batch range {start}–{end} (Filtered by Team)
                    </p>
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
