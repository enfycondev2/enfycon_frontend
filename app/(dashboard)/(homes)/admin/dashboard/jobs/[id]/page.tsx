"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/apiClient";
import { useSession } from "next-auth/react";
import {
    ArrowLeft,
    Briefcase,
    MapPin,
    Users,
    FileText,
    DollarSign,
    Clock,
    Building2,
    CreditCard,
    Zap,
    CalendarDays,
    Loader2,
    Edit,
} from "lucide-react";
import Link from "next/link";

const statusMap: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: "Active", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    CLOSED: { label: "Closed", color: "bg-red-100 text-red-700 border-red-200" },
    ON_HOLD: { label: "On Hold", color: "bg-amber-100 text-amber-700 border-amber-200" },
    HOLD_BY_CLIENT: { label: "Hold By Client", color: "bg-sky-100 text-sky-700 border-sky-200" },
    FILLED: { label: "Filled", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

const urgencyMap: Record<string, { color: string }> = {
    HOT: { color: "bg-red-100 text-red-700 border-red-200" },
    WARM: { color: "bg-orange-100 text-orange-700 border-orange-200" },
    COLD: { color: "bg-blue-100 text-blue-700 border-blue-200" },
};

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value?: string | number | null }) {
    if (!value && value !== 0) return null;
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-slate-800/50 border border-neutral-100 dark:border-slate-700">
            <div className="mt-0.5 p-1.5 rounded-md bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600">
                <Icon className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{label}</p>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 capitalize break-words">{String(value)}</p>
            </div>
        </div>
    );
}

export default function AdminJobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const id = params?.id as string;

    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        apiClient(`/jobs/${id}`)
            .then(async (res) => {
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body?.message || `Error ${res.status}`);
                }
                return res.json();
            })
            .then(setJob)
            .catch((e) => setError(e.message || "Failed to load job"))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <p className="text-destructive font-medium">{error || "Job not found."}</p>
                <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" /> Go Back</Button>
            </div>
        );
    }

    const statusInfo = statusMap[job.status] || { label: job.status, color: "bg-neutral-100 text-neutral-700 border-neutral-200" };
    const urgencyInfo = job.urgency ? (urgencyMap[job.urgency] || { color: "bg-neutral-100 text-neutral-700 border-neutral-200" }) : null;

    return (
        <>
            <DashboardBreadcrumb title={job.jobTitle} text="Admin Dashboard" />
            <div className="p-6 max-w-6xl mx-auto space-y-6">

                {/* Hero Header */}
                <div className="rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3">
                            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 mt-0.5" asChild>
                                <Link href="/admin/dashboard/jobs"><ArrowLeft className="h-4 w-4" /></Link>
                            </Button>
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <code className="text-xs font-mono bg-neutral-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-slate-600 text-neutral-500">
                                        {job.jobCode}
                                    </code>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${statusInfo.color}`}>
                                        {statusInfo.label}
                                    </span>
                                    {urgencyInfo && (
                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${urgencyInfo.color}`}>
                                            🔥 {job.urgency}
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white capitalize leading-tight">
                                    {job.jobTitle?.toLowerCase()}
                                </h1>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                                    <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {job.clientName}{job.endClientName ? ` → ${job.endClientName}` : ""}</span>
                                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.jobLocation}</span>
                                    <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {(job.jobType || "").replace(/_/g, " ").toLowerCase()}</span>
                                    <span className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> {job.visaType}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick stats strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-neutral-100 dark:border-slate-800">
                        <div className="flex flex-col items-center p-3 rounded-lg bg-neutral-50 dark:bg-slate-800/50">
                            <span className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{job.noOfPositions ?? "—"}</span>
                            <span className="text-[10px] uppercase tracking-wider text-neutral-400 mt-0.5">Positions</span>
                        </div>
                        <div className="flex flex-col items-center p-3 rounded-lg bg-neutral-50 dark:bg-slate-800/50">
                            <span className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{job.submissionDone ?? 0}</span>
                            <span className="text-[10px] uppercase tracking-wider text-neutral-400 mt-0.5">Submitted</span>
                        </div>
                        <div className="flex flex-col items-center p-3 rounded-lg bg-neutral-50 dark:bg-slate-800/50">
                            <span className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{job.submissionRequired ?? 0}</span>
                            <span className="text-[10px] uppercase tracking-wider text-neutral-400 mt-0.5">Required</span>
                        </div>
                        <div className="flex flex-col items-center p-3 rounded-lg bg-neutral-50 dark:bg-slate-800/50">
                            <span className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{job.carryForwardAge ?? 0}d</span>
                            <span className="text-[10px] uppercase tracking-wider text-neutral-400 mt-0.5">CFR Age</span>
                        </div>
                    </div>

                    {/* Submission progress bar */}
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-neutral-400 mb-1">
                            <span>Submission Progress</span>
                            <span>{Math.round(((job.submissionDone ?? 0) / Math.max(1, job.submissionRequired ?? 1)) * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-neutral-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, ((job.submissionDone ?? 0) / Math.max(1, job.submissionRequired ?? 1)) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Main grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left: Description + Recruiters */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Job Description */}
                        <div className="rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-neutral-400" /> Job Description
                            </h2>
                            {job.jobDescription ? (
                                <div
                                    className="jd-prose text-neutral-700 dark:text-neutral-300"
                                    dangerouslySetInnerHTML={{ __html: job.jobDescription }}
                                />
                            ) : (
                                <p className="text-sm text-neutral-400 italic">No description provided.</p>
                            )}
                        </div>

                        {/* Assigned Recruiters */}
                        {job.assignedRecruiters && job.assignedRecruiters.length > 0 && (
                            <div className="rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                                <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-neutral-400" /> Assigned Recruiters
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {job.assignedRecruiters.map((rec: any) => (
                                        <div key={rec.id} className="flex items-center gap-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl px-3 py-2">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase shrink-0">
                                                {(rec.fullName || rec.email)?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold">{rec.fullName || "N/A"}</p>
                                                <p className="text-[10px] text-muted-foreground">{rec.email}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Consolidated details sidebar */}
                    <div className="rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-1 h-fit">
                        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Job Info</h2>

                        <InfoCard icon={DollarSign} label="Pay Rate" value={job.payRate} />
                        <InfoCard icon={Zap} label="Requirement Type" value={(job.requirementType || "").replace(/_/g, " ").toLowerCase()} />

                        <div className="pt-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">Client</p>
                            <div className="space-y-1">
                                <InfoCard icon={Building2} label="Client" value={job.clientName} />
                                {job.endClientName && <InfoCard icon={Building2} label="End Client" value={job.endClientName} />}
                            </div>
                        </div>

                        {job.accountManager && (
                            <div className="pt-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">Account Manager</p>
                                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-neutral-50 dark:bg-slate-800/50 border border-neutral-100 dark:border-slate-700">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase shrink-0">
                                        {(job.accountManager.fullName || job.accountManager.email)?.[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">{job.accountManager.fullName || "N/A"}</p>
                                        <p className="text-[10px] text-muted-foreground">{job.accountManager.email}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {job.pods && job.pods.length > 0 && (
                            <div className="pt-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">Assigned Pods</p>
                                <div className="space-y-2">
                                    {job.pods.map((pod: any) => (
                                        <div key={pod.id} className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30">
                                            <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">{pod.name}</p>
                                            {/* We can add more pod info here if needed */}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">Timeline</p>
                            <div className="space-y-1">
                                <InfoCard icon={CalendarDays} label="Posted On" value={new Date(job.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} />
                                <InfoCard icon={Clock} label="Last Updated" value={new Date(job.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
