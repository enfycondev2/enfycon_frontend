"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import SubmittedJobsTable, { CandidateSubmission } from "@/components/dashboard/recruiter/SubmittedJobsTable";
import { Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";

interface PageMeta { total: number; page: number; limit: number; totalPages: number; }

const LIMIT = 20;

function extract(data: any) {
    const arr = Array.isArray(data) ? data : (data?.data ?? data?.submissions ?? []);
    const total = data?.total ?? data?.totalCount ?? arr.length;
    const page = data?.page ?? data?.currentPage ?? 1;
    const limit = data?.limit ?? data?.pageSize ?? LIMIT;
    const totalPages = data?.totalPages ?? data?.pages ?? Math.ceil(total / limit) ?? 1;
    return { submissions: Array.isArray(arr) ? arr : [], meta: { total, page, limit, totalPages } as PageMeta };
}

export default function PodLeadSubmittedJobsPage() {
    const { status } = useSession();
    const [currentPage, setCurrentPage] = useState(1);
    const [submissions, setSubmissions] = useState<CandidateSubmission[]>([]);
    const [meta, setMeta] = useState<PageMeta>({ total: 0, page: 1, limit: LIMIT, totalPages: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cache = useRef<Map<number, { submissions: CandidateSubmission[]; meta: PageMeta }>>(new Map());
    const inflight = useRef<Set<number>>(new Set());

    const fetchPage = useCallback(async (page: number) => {
        try {
            const res = await apiClient(`/recruiter-submissions?page=${page}&limit=${LIMIT}`);
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
        if (hit) {
            setSubmissions(hit.submissions); setMeta(hit.meta); setCurrentPage(page);
            prefetch(page + 1, hit.meta.totalPages); prefetch(page - 1, hit.meta.totalPages);
            return;
        }
        setIsLoading(true); setError(null);
        const r = await fetchPage(page); setIsLoading(false);
        if (!r) { setError("Failed to load submissions."); return; }
        setSubmissions(r.submissions); setMeta(r.meta); setCurrentPage(page);
        cache.current.set(page, r);
        prefetch(page + 1, r.meta.totalPages); prefetch(page - 1, r.meta.totalPages);
    }, [meta.totalPages, fetchPage, prefetch]);

    useEffect(() => {
        if (status !== "authenticated") {
            if (status === "unauthenticated") setIsLoading(false);
            return;
        }
        (async () => {
            setIsLoading(true); setError(null);
            const r = await fetchPage(1); setIsLoading(false);
            if (!r) { setError("Failed to load submissions."); return; }
            setSubmissions(r.submissions); setMeta(r.meta); setCurrentPage(1);
            cache.current.set(1, r);
            if (r.meta.totalPages > 1) prefetch(2, r.meta.totalPages);
        })();
    }, [status, fetchPage, prefetch]);

    const refresh = () => { cache.current.clear(); inflight.current.clear(); goTo(currentPage); };

    const tp = meta.totalPages;
    const ps = meta.limit || LIMIT;
    const start = meta.total === 0 ? 0 : (currentPage - 1) * ps + 1;
    const end = Math.min(currentPage * ps, meta.total);
    const btns: number[] = tp <= 5 ? Array.from({ length: tp }, (_, i) => i + 1)
        : currentPage <= 3 ? [1, 2, 3, 4, 5]
            : currentPage >= tp - 2 ? Array.from({ length: 5 }, (_, i) => tp - 4 + i)
                : Array.from({ length: 5 }, (_, i) => currentPage - 2 + i);

    if (status === "loading") return null;

    return (
        <>
            <DashboardBreadcrumb title="Submitted Jobs" text="Pod Lead Dashboard" />
            <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                            Submitted Candidates
                        </h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                            View and track the status of candidates you have submitted for various roles.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive text-sm font-medium flex items-center justify-between">
                        <span>{error}</span>
                        <Button variant="outline" size="sm" onClick={refresh}>Retry</Button>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-neutral-50/50 dark:bg-slate-800/20 rounded-xl border border-neutral-200 dark:border-slate-700">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-sm text-neutral-500 font-medium">Loading submissions...</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <SubmittedJobsTable submissions={submissions} isRecruiter={true} baseUrl="/pod-lead/dashboard/jobs" onUpdate={refresh} />

                        {tp > 1 && (
                            <div className="flex items-center justify-between px-2">
                                <p className="text-sm text-muted-foreground italic">
                                    Showing <span className="font-medium">{start}</span> to{" "}
                                    <span className="font-medium">{end}</span> of{" "}
                                    <span className="font-medium">{meta.total}</span> submissions
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goTo(1)} disabled={currentPage === 1}>
                                        <ChevronsLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        {btns.map(n => (
                                            <Button key={n} variant={currentPage === n ? "default" : "outline"} size="sm" className="h-8 w-8 text-xs" onClick={() => goTo(n)} onMouseEnter={() => prefetch(n, tp)}>{n}</Button>
                                        ))}
                                    </div>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goTo(currentPage + 1)} disabled={currentPage === tp}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goTo(tp)} disabled={currentPage === tp}>
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
