"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Search,
    X,
    Filter,
    Pencil,
    MoreHorizontal,
    FileText,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn, formatUsDate, formatUsTime } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";

export interface CandidateSubmission {
    id: string | number;
    jobId: string;
    job?: {
        jobCode: string;
        jobTitle: string;
        accountManager: {
            fullName: string | null;
            email: string;
        };
        submissionRequired?: number;
        submissionDone?: number;
        requirementType?: string;
        createdAt?: string;
    };
    recruiterId: string;
    candidateName: string;
    candidateEmail: string;
    candidatePhone: string;
    candidateCurrentLocation: string;
    submissionDate: string;
    createdAt?: string;
    l1Status: string;
    l1Date: string;
    l2Status: string;
    l2Date: string;
    l3Status: string;
    l3Date: string;
    finalStatus: string;
    remarks: string;
    recruiterComment: string;
    recruiter?: {
        fullName: string;
        email: string;
    };
}

interface SubmittedJobsTableProps {
    submissions: CandidateSubmission[];
    showExtendedDetails?: boolean;
    isRecruiter?: boolean;
    baseUrl?: string;
    onUpdate?: () => void;
}

const getBadgeStyles = (status: string) => {
    const s = status?.toUpperCase() || "";
    if (s === "PENDING" || s === "ON HOLD" || s.includes("HOLD")) {
        return "bg-amber-100 text-amber-700";
    }
    if (s === "SUBMITTED" || s === "ACTIVE") {
        return "bg-blue-100 text-blue-700";
    }
    if (s === "SELECTED" || s === "APPROVED" || s === "PASSED" || s === "FILLED") {
        return "bg-green-100 text-green-700";
    }
    if (s === "REJECTED" || s === "CLOSED") {
        return "bg-red-100 text-red-700";
    }
    return "bg-gray-100 text-gray-700";
};

const STAGE_STATUSES = ["PENDING", "CLEARED", "REJECTED"];
const FINAL_STATUSES = ["SUBMITTED", "REJECTED", "OFFER", "JOIN"];
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const UTC_MIDNIGHT_RE = /^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z$/;

function isDateOnly(value?: string): boolean {
    if (!value) return false;
    return DATE_ONLY_RE.test(value) || UTC_MIDNIGHT_RE.test(value);
}

function formatSubmissionDate(value: string): string {
    if (!isDateOnly(value)) return formatUsDate(value);
    return new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(value));
}

function formatSubmissionTime(value: string, createdAt?: string): string {
    if (!isDateOnly(value)) return formatUsTime(value);
    // Backend stores many submission dates at 00:00:00Z; use createdAt as the real submission time when available.
    if (createdAt) return formatUsTime(createdAt);
    return formatUsTime(value);
}

function FeedbackPopover({ remarks, comment }: { remarks?: string; comment?: string }) {
    const hasContent = !!(remarks || comment);
    if (!hasContent) return <span className="text-gray-400 text-xs italic">-</span>;
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline">
                    View feedback
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4 space-y-2" align="end">
                <p className="text-xs font-semibold text-neutral-700 border-b pb-2">Feedback</p>
                {remarks && (
                    <div>
                        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Remarks</span>
                        <p className="text-xs text-neutral-700 mt-0.5 whitespace-pre-wrap">{remarks}</p>
                    </div>
                )}
                {comment && (
                    <div>
                        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Recruiter Note</span>
                        <p className="text-xs text-neutral-600 mt-0.5 whitespace-pre-wrap">{comment}</p>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

function EditStatusDialog({
    sub,
    onSaved,
    isRecruiter = false,
    trigger
}: {
    sub: CandidateSubmission;
    onSaved?: () => void;
    isRecruiter?: boolean;
    trigger?: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        l1Status: sub.l1Status || "PENDING",
        l2Status: sub.l2Status || "PENDING",
        l3Status: sub.l3Status || "PENDING",
        finalStatus: sub.finalStatus || "PENDING",
        remarks: sub.remarks || "",
    });

    const handleSave = async () => {
        setSaving(true);
        try {
            const changedFields: any = {};
            if (form.l1Status !== sub.l1Status) changedFields.l1Status = form.l1Status;
            if (form.l2Status !== sub.l2Status) changedFields.l2Status = form.l2Status;
            if (form.l3Status !== sub.l3Status) changedFields.l3Status = form.l3Status;
            if (form.finalStatus !== sub.finalStatus) changedFields.finalStatus = form.finalStatus;
            if (form.remarks !== (sub.remarks || "")) changedFields.remarks = form.remarks;

            if (Object.keys(changedFields).length === 0) {
                setOpen(false);
                return;
            }

            const res = await apiClient(`/recruiter-submissions/${sub.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(changedFields),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || "Update failed");
            }
            toast.success("Status updated");
            setOpen(false);
            onSaved?.();
        } catch (e: any) {
            toast.error(e.message || "Failed to update status");
        } finally {
            setSaving(false);
        }
    };

    const sf = (key: keyof typeof form) => (val: string) => setForm(p => ({ ...p, [key]: val }));

    const isL1Rejected = form.l1Status === "REJECTED";
    const isL2Rejected = form.l2Status === "REJECTED";
    const isL3Rejected = form.l3Status === "REJECTED";
    const isAnyRejected = isL1Rejected || isL2Rejected || isL3Rejected;

    const disableL2 = isL1Rejected || !form.l1Status || form.l1Status === "PENDING";
    const disableL3 = disableL2 || isL2Rejected || !form.l2Status || form.l2Status === "PENDING";
    const disableFinal = isAnyRejected;

    const displayFinalStatus = isAnyRejected ? "REJECTED" : form.finalStatus;

    const stages = [
        { key: "l1Status", label: "L1", disabled: false },
        { key: "l2Status", label: "L2", disabled: disableL2 },
        { key: "l3Status", label: "L3", disabled: disableL3 },
    ] as const;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs">
                        <Pencil className="h-3 w-3" /> Edit
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md p-6 space-y-4">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold text-neutral-800 tracking-tight">
                        {isRecruiter ? "Update Recruitment Feedback" : "Update Candidate Pipeline Status"}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {!isRecruiter && (
                        <div className="grid grid-cols-1 gap-3">
                            {stages.map((stage) => (
                                <div key={stage.key} className="flex items-center gap-3">
                                    <span className="text-xs font-bold w-12 text-neutral-500 uppercase tracking-wider">{stage.label}</span>
                                    <Select value={form[stage.key]} onValueChange={sf(stage.key)} disabled={stage.disabled}>
                                        <SelectTrigger className="h-9 text-sm flex-1 border-neutral-200 focus:ring-blue-500 rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STAGE_STATUSES.map(s => (
                                                <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}

                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold w-12 text-neutral-500 uppercase tracking-wider">Final</span>
                                <Select value={displayFinalStatus} onValueChange={sf("finalStatus")} disabled={disableFinal}>
                                    <SelectTrigger className="h-9 text-sm flex-1 border-neutral-200 focus:ring-blue-500 rounded-lg">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FINAL_STATUSES.map(s => (
                                            <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Feedback & Remarks</label>
                        {isRecruiter ? (
                            <Textarea
                                value={form.remarks}
                                onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
                                placeholder="Provide detailed feedback on the recruitment process..."
                                className="text-sm min-h-[160px] resize-none border-neutral-200 focus:ring-blue-500 rounded-lg p-3"
                            />
                        ) : (
                            <Input
                                value={form.remarks}
                                onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
                                placeholder="Add technical or process remarks..."
                                className="h-10 text-sm border-neutral-200 focus:ring-blue-500 rounded-lg px-3"
                            />
                        )}
                    </div>
                </div>

                <DialogFooter className="sm:justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving} className="h-10 px-4 font-medium text-neutral-500">
                        Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="h-10 px-6 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all rounded-lg">
                        {saving ? "Saving Changes..." : "Save Updates"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Pipeline Component for L1/L2/L3
const PipelineProgress = ({ sub }: { sub: CandidateSubmission }) => {
    // Determine effective status based on cascading rules
    const effectiveL1 = sub.l1Status || "PENDING";
    const isL1Rejected = effectiveL1 === "REJECTED";
    const isL1Pending = effectiveL1 === "PENDING";

    // If L1 is pending or rejected, L2 must visually be pending
    const effectiveL2 = (isL1Rejected || isL1Pending) ? "PENDING" : (sub.l2Status || "PENDING");
    const isL2Rejected = effectiveL2 === "REJECTED";
    const isL2Pending = effectiveL2 === "PENDING";

    // If L2 is pending or rejected (which cascades from L1), L3 must visually be pending
    const effectiveL3 = (isL2Rejected || isL2Pending) ? "PENDING" : (sub.l3Status || "PENDING");

    const stages = [
        { label: "L1", status: effectiveL1, date: sub.l1Date },
        { label: "L2", status: effectiveL2, date: sub.l2Date },
        { label: "L3", status: effectiveL3, date: sub.l3Date },
    ];

    return (
        <div className="flex items-center space-x-2">
            {stages.map((stage, idx) => {
                const s = (stage.status || "").toUpperCase();
                let circleColor = "bg-gray-200 border-gray-300"; // Pending default
                let textColor = "text-gray-400";

                if (s === "CLEARED") {
                    circleColor = "bg-green-500 border-green-600";
                    textColor = "text-green-700 font-medium";
                } else if (s === "REJECTED") {
                    circleColor = "bg-red-500 border-red-600";
                    textColor = "text-red-700 font-medium";
                } else if (s === "PENDING") {
                    circleColor = "bg-blue-500 border-blue-600 ring-2 ring-blue-200";
                    textColor = "text-blue-700 font-medium";
                } else if (s) {
                    circleColor = "bg-gray-400 border-gray-500";
                    textColor = "text-gray-600 font-medium";
                }

                return (
                    <div key={idx} className="flex items-center">
                        <div className="flex flex-col items-center gap-1 group relative">
                            <div className={cn("w-3 h-3 rounded-full border", circleColor)} title={`${stage.label}: ${stage.status || 'Pending'}`} />
                            <span className={cn("text-[11px]", textColor)}>{stage.label}</span>
                        </div>
                        {idx < stages.length - 1 && (
                            <div className={cn("w-6 h-px mb-4", (s === "CLEARED") ? "bg-green-500" : "bg-gray-200")} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};


export default function SubmittedJobsTable({
    submissions,
    showExtendedDetails = true,
    isRecruiter = false,
    baseUrl = "/delivery-head/dashboard/jobs",
    onUpdate,
}: SubmittedJobsTableProps) {
    const { data: session } = useSession();
    const sessionRoles = (session?.user as any)?.roles || [];
    const isAdmin = sessionRoles.includes("ADMIN");
    const isDeliveryHead = sessionRoles.includes("DELIVERY_HEAD") || sessionRoles.includes("DELIVERY-HEAD");
    const isAccountManager = sessionRoles.includes("ACCOUNT_MANAGER") || sessionRoles.includes("ACCOUNT-MANAGER");

    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [l1Filter, setL1Filter] = useState("all");
    const [l2Filter, setL2Filter] = useState("all");
    const [l3Filter, setL3Filter] = useState("all");
    const [dateFilter, setDateFilter] = useState("");
    const itemsPerPage = 10;

    // Derived Statistics
    const stats = useMemo(() => {
        const total = submissions.length;
        let l1 = 0;
        let l2 = 0;
        let l3 = 0;
        let selected = 0;
        let rejected = 0;

        submissions.forEach(sub => {
            const l1Status = (sub.l1Status || "PENDING").toUpperCase();
            const l2Status = (sub.l2Status || "PENDING").toUpperCase();
            const l3Status = (sub.l3Status || "PENDING").toUpperCase();
            const final = (sub.finalStatus || "").toUpperCase();

            if (final === "SELECTED") selected++;
            if (final === "REJECTED" || l1Status === "REJECTED" || l2Status === "REJECTED" || l3Status === "REJECTED") {
                rejected++;
            }
            if (l1Status === "PENDING") l1++;
            if (l1Status === "CLEARED" && l2Status === "PENDING") l2++;
            if (l1Status === "CLEARED" && l2Status === "CLEARED" && l3Status === "PENDING") l3++;
        });

        return { total, l1, l2, l3, selected, rejected };
    }, [submissions]);

    // Calculate submission counts per job
    const submissionCountsByJob = useMemo(() => {
        const counts: Record<string, number> = {};
        submissions.forEach(sub => {
            if (sub.jobId) {
                counts[sub.jobId] = (counts[sub.jobId] || 0) + 1;
            }
        });
        return counts;
    }, [submissions]);

    // Apply filtering
    const filteredSubmissions = useMemo(() => {
        return submissions.filter(sub => {
            const matchesSearch = !searchQuery ||
                sub.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (sub.job?.jobCode && sub.job.jobCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (sub.job?.jobTitle && sub.job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
                sub.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === "all" || (sub.finalStatus && sub.finalStatus.toUpperCase() === statusFilter.toUpperCase());
            const matchesL1 = l1Filter === "all" || (sub.l1Status && sub.l1Status.toUpperCase() === l1Filter.toUpperCase());
            const matchesL2 = l2Filter === "all" || (sub.l2Status && sub.l2Status.toUpperCase() === l2Filter.toUpperCase());
            const matchesL3 = l3Filter === "all" || (sub.l3Status && sub.l3Status.toUpperCase() === l3Filter.toUpperCase());
            const matchesDate = !dateFilter || new Date(sub.submissionDate).toISOString().split('T')[0] === dateFilter;

            return matchesSearch && matchesStatus && matchesL1 && matchesL2 && matchesL3 && matchesDate;
        });
    }, [submissions, searchQuery, statusFilter, l1Filter, l2Filter, l3Filter, dateFilter]);


    // Apply sorting (Prioritize Today's Jobs/CFR Extended, then by newest submission date)
    const sortedSubmissions = useMemo(() => {
        const today = formatUsDate(new Date());
        return [...filteredSubmissions].sort((a, b) => {
            const aIsToday = formatUsDate(a.job?.createdAt) === today ||
                formatUsDate(a.createdAt) === today ||
                formatUsDate(a.submissionDate) === today ||
                a.job?.requirementType === 'CFR_EXTENDED';
            const bIsToday = formatUsDate(b.job?.createdAt) === today ||
                formatUsDate(b.createdAt) === today ||
                formatUsDate(b.submissionDate) === today ||
                b.job?.requirementType === 'CFR_EXTENDED';

            if (aIsToday && !bIsToday) return -1;
            if (!aIsToday && bIsToday) return 1;

            if (aIsToday && bIsToday) {
                // Within Today, prioritize CFR_EXTENDED
                const aIsCfrExt = a.job?.requirementType === 'CFR_EXTENDED';
                const bIsCfrExt = b.job?.requirementType === 'CFR_EXTENDED';
                if (aIsCfrExt && !bIsCfrExt) return -1;
                if (!aIsCfrExt && bIsCfrExt) return 1;

                // Then NEW
                const aIsNew = a.job?.requirementType === 'NEW';
                const bIsNew = b.job?.requirementType === 'NEW';
                if (aIsNew && !bIsNew) return -1;
                if (!aIsNew && bIsNew) return 1;
            }

            return new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime();
        });
    }, [filteredSubmissions]);

    const totalPages = Math.ceil(sortedSubmissions.length / itemsPerPage);

    const currentSubmissions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedSubmissions.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedSubmissions, currentPage]);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const clearFilters = () => {
        setSearchQuery("");
        setStatusFilter("all");
        setL1Filter("all");
        setL2Filter("all");
        setL3Filter("all");
        setDateFilter("");
        setCurrentPage(1);
    };

    // Extract unique statuses for dropdown
    const uniqueStatuses = Array.from(new Set(submissions.map(s => s.finalStatus).filter(Boolean)));

    return (
        <div className="space-y-6">

            {/* 1. Top Summary Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-500">Total Submissions</span>
                    <span className="text-3xl font-semibold text-gray-900">{stats.total}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-500">Rejected</span>
                    <span className="text-3xl font-semibold text-red-600">{stats.rejected}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-500">L1</span>
                    <span className="text-3xl font-semibold text-amber-600">{stats.l1}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-500">L2</span>
                    <span className="text-3xl font-semibold text-blue-600">{stats.l2}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-500">L3</span>
                    <span className="text-3xl font-semibold text-indigo-600">{stats.l3}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-500">Selected</span>
                    <span className="text-3xl font-semibold text-green-600">{stats.selected}</span>
                </div>
            </div>

            {/* 6. Improved Search Section */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Candidate name, email or job code..."
                            className="pl-9 h-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 min-w-[120px]">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                        <Filter className="h-3 w-3" /> L1
                    </label>
                    <Select value={l1Filter} onValueChange={(v) => { setL1Filter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="h-10 bg-white border-gray-200 rounded-lg">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {STAGE_STATUSES.map(status => (
                                <SelectItem key={status} value={status}>
                                    <span className="capitalize">{status.toLowerCase()}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1.5 min-w-[120px]">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                        <Filter className="h-3 w-3" /> L2
                    </label>
                    <Select value={l2Filter} onValueChange={(v) => { setL2Filter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="h-10 bg-white border-gray-200 rounded-lg">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {STAGE_STATUSES.map(status => (
                                <SelectItem key={status} value={status}>
                                    <span className="capitalize">{status.toLowerCase()}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1.5 min-w-[120px]">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                        <Filter className="h-3 w-3" /> L3
                    </label>
                    <Select value={l3Filter} onValueChange={(v) => { setL3Filter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="h-10 bg-white border-gray-200 rounded-lg">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {STAGE_STATUSES.map(status => (
                                <SelectItem key={status} value={status}>
                                    <span className="capitalize">{status.toLowerCase()}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1.5 min-w-[120px]">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                        <Filter className="h-3 w-3" /> Submission Date
                    </label>
                    <Input
                        type="date"
                        className="h-10 bg-white border-gray-200 rounded-lg"
                        value={dateFilter}
                        onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                    />
                </div>

                <div className="flex flex-col gap-1.5 min-w-[150px]">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                        <Filter className="h-3 w-3" /> Status
                    </label>
                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="h-10 bg-white border-gray-200 rounded-lg">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            {FINAL_STATUSES.map(status => (
                                <SelectItem key={status} value={status}>
                                    <span className="capitalize">{status.toLowerCase()}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {(searchQuery || statusFilter !== "all" || l1Filter !== "all" || l2Filter !== "all" || l3Filter !== "all" || dateFilter) && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-gray-500 hover:text-red-600 hover:bg-red-50"
                        onClick={clearFilters}
                        title="Clear Filters"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Table wrapper inside clean card container */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="table-grid-lines table-auto border-spacing-0 w-full min-w-max border-separate">
                        <TableHeader className="bg-gray-50 border-b border-gray-200">
                            <TableRow className="border-0 hover:bg-transparent">
                                <TableHead className="sticky left-0 z-30 bg-gray-50 text-gray-600 font-medium text-sm px-6 py-4 text-start border-b border-r border-neutral-200 dark:border-slate-600 shadow-[1px_0_0_0_rgba(226,232,240,1)] dark:shadow-[1px_0_0_0_rgba(71,85,105,1)]">
                                    Job Reference
                                </TableHead>
                                <TableHead className="text-gray-600 font-medium text-sm px-6 py-4 text-start border-b border-r border-neutral-200 dark:border-slate-600">
                                    Account Manager
                                </TableHead>
                                <TableHead className="text-gray-600 font-medium text-sm px-6 py-4 text-start border-b border-r border-neutral-200 dark:border-slate-600">
                                    Submitted By
                                </TableHead>


                                <TableHead className="text-gray-600 font-medium text-sm px-6 py-4 text-start border-b border-r border-neutral-200 dark:border-slate-600">
                                    Candidate Details
                                </TableHead>
                                <TableHead className="text-gray-600 font-medium text-sm px-6 py-4 text-start border-b border-r border-neutral-200 dark:border-slate-600">
                                    Created At
                                </TableHead>
                                <TableHead className="text-gray-600 font-medium text-sm px-6 py-4 text-start border-b border-r border-neutral-200 dark:border-slate-600">
                                    Submission Date
                                </TableHead>
                                {showExtendedDetails && (
                                    <TableHead className="text-gray-600 font-medium text-sm px-6 py-4 text-start border-b border-r border-neutral-200 dark:border-slate-600">
                                        Pipeline Progress
                                    </TableHead>
                                )}
                                <TableHead className="text-gray-600 font-medium text-sm px-6 py-4 text-center border-b border-r border-neutral-200 dark:border-slate-600">
                                    Status
                                </TableHead>
                                {showExtendedDetails && (
                                    <>
                                        <TableHead className="text-gray-600 font-medium text-sm px-6 py-4 text-start border-b border-r border-neutral-200 dark:border-slate-600">
                                            Feedback
                                        </TableHead>
                                    </>
                                )}
                                <TableHead className="text-gray-600 font-medium text-sm px-6 py-4 text-end border-b border-neutral-200 dark:border-slate-600 sticky right-0 z-30 bg-gray-50 shadow-[-1px_0_0_0_rgba(226,232,240,1)]">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {currentSubmissions.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={showExtendedDetails ? 10 : 8}
                                        className="h-32 text-center text-gray-500"
                                    >
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Search className="h-8 w-8 text-gray-300" />
                                            <span>No candidate submissions found.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                (() => {
                                    let hasShownTodayHeader = false;
                                    let hasShownPastHeader = false;
                                    let hasShownNewSubHeader = false;
                                    let hasShownCfrExtSubHeader = false;

                                    const today = formatUsDate(new Date());
                                    return currentSubmissions.map((sub, index) => {
                                        const isToday = formatUsDate(sub.job?.createdAt) === today ||
                                            formatUsDate(sub.createdAt) === today ||
                                            formatUsDate(sub.submissionDate) === today ||
                                            sub.job?.requirementType === 'CFR_EXTENDED';
                                        const showTodayHeader = isToday && !hasShownTodayHeader;
                                        const showPastHeader = !isToday && !hasShownPastHeader;

                                        const showNewSubHeader = isToday && sub.job?.requirementType === 'NEW' && !hasShownNewSubHeader;
                                        const showCfrExtSubHeader = isToday && sub.job?.requirementType === 'CFR_EXTENDED' && !hasShownCfrExtSubHeader;

                                        if (showTodayHeader) hasShownTodayHeader = true;
                                        if (showPastHeader) hasShownPastHeader = true;
                                        if (showNewSubHeader) hasShownNewSubHeader = true;
                                        if (showCfrExtSubHeader) hasShownCfrExtSubHeader = true;

                                        const colSpanTotal = showExtendedDetails ? 9 : 7;
                                        const stickyBgClass = index % 2 === 0
                                            ? "bg-white dark:bg-slate-900/20"
                                            : "bg-slate-50/70 dark:bg-slate-800/35";

                                        return (
                                            <React.Fragment key={sub.id}>
                                                {showTodayHeader && (
                                                    <TableRow className="bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 shadow-sm">
                                                        <TableCell colSpan={colSpanTotal} className="py-2 px-0 border-b border-emerald-100 dark:border-emerald-900/30">
                                                            <div className="sticky left-0 px-6 flex items-center gap-2 w-max">
                                                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Today's Jobs</span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                {showNewSubHeader && (
                                                    <TableRow className="bg-emerald-100/10 dark:bg-emerald-900/5 hover:bg-emerald-100/10 dark:hover:bg-emerald-900/5 border-0">
                                                        <TableCell colSpan={colSpanTotal} className="py-1 px-0 border-b border-emerald-50 dark:border-emerald-900/20 text-start">
                                                            <div className="sticky left-0 px-8 w-max">
                                                                <span className="text-[10px] font-bold text-emerald-600/80 dark:text-emerald-500/80 uppercase tracking-widest italic">New Requirements</span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                {showCfrExtSubHeader && (
                                                    <TableRow className="bg-amber-100/10 dark:bg-amber-900/5 hover:bg-amber-100/10 dark:hover:bg-amber-900/5 border-0">
                                                        <TableCell colSpan={colSpanTotal} className="py-1 px-0 border-b border-amber-50 dark:border-amber-900/20 text-start">
                                                            <div className="sticky left-0 px-8 w-max">
                                                                <span className="text-[10px] font-bold text-amber-600/80 dark:text-amber-500/80 uppercase tracking-widest italic">Requirement Extensions (CFR)</span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                {showPastHeader && (
                                                    <TableRow className="bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50/50 dark:hover:bg-red-950/20 shadow-sm">
                                                        <TableCell colSpan={colSpanTotal} className="py-2 px-0 border-b border-red-100 dark:border-red-900/30">
                                                            <div className="sticky left-0 px-6 w-max">
                                                                <span className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-widest">Past Jobs</span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                <TableRow
                                                    className={cn(
                                                        "transition-colors group",
                                                        index % 2 === 0
                                                            ? "bg-white dark:bg-slate-900/20 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                                            : "bg-slate-50/70 dark:bg-slate-800/35 hover:bg-slate-100/70 dark:hover:bg-slate-800/75"
                                                    )}
                                                >
                                                    <TableCell className={cn(
                                                        "sticky left-0 z-20 px-6 py-4 text-start border-b border-r border-neutral-200 dark:border-slate-600 shadow-[1px_0_0_0_rgba(226,232,240,1)] dark:shadow-[1px_0_0_0_rgba(71,85,105,1)]",
                                                        stickyBgClass
                                                    )}>
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-gray-900 text-sm">
                                                                    {sub.job?.jobCode || "N/A"}
                                                                </span>
                                                                {(sub.job?.submissionRequired !== undefined || submissionCountsByJob[sub.jobId]) && (
                                                                    <span className="bg-gray-100 text-gray-600 text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
                                                                        {sub.job?.submissionRequired !== undefined
                                                                            ? `${sub.job?.submissionDone || 0}/${sub.job.submissionRequired}`
                                                                            : `${submissionCountsByJob[sub.jobId]}`}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-gray-500 capitalize truncate max-w-[220px]" title={sub.job?.jobTitle}>
                                                                {sub.job?.jobTitle?.toLowerCase() || "-"}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 text-start border-b border-r border-neutral-200 dark:border-slate-600">
                                                        <div className="flex flex-col gap-0.5" title={sub.job?.accountManager?.email}>
                                                            <span className="text-sm text-gray-900 font-medium">
                                                                {sub.job?.accountManager?.fullName || "-"}
                                                            </span>
                                                            <span className="text-[11px] text-gray-500 lowercase truncate max-w-[150px]">
                                                                {sub.job?.accountManager?.email}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 text-start border-b border-r border-neutral-200 dark:border-slate-600">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-medium text-sm text-gray-900 capitalize">
                                                                {sub.recruiter?.fullName || "-"}
                                                            </span>
                                                            <a href={`mailto:${sub.recruiter?.email}`} className="text-xs text-gray-500 hover:text-blue-600 hover:underline break-all">
                                                                {sub.recruiter?.email || "-"}
                                                            </a>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 text-start border-b border-r border-neutral-200 dark:border-slate-600">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-medium text-sm text-gray-900 capitalize">
                                                                {sub.candidateName}
                                                            </span>
                                                            <a href={`mailto:${sub.candidateEmail}`} className="text-xs text-gray-500 hover:text-blue-600 hover:underline break-all">
                                                                {sub.candidateEmail}
                                                            </a>
                                                            {sub.candidatePhone && (
                                                                <span className="text-[11px] text-gray-500">Phone: {sub.candidatePhone}</span>
                                                            )}
                                                            {sub.candidateCurrentLocation && (
                                                                <span className="text-[11px] text-gray-500">Loc: {sub.candidateCurrentLocation}</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 text-start whitespace-nowrap border-b border-r border-neutral-200 dark:border-slate-600">
                                                        <div className="flex flex-col gap-0.5">
                                                            {sub.createdAt ? (
                                                                <>
                                                                    <span className="text-sm text-gray-900 font-medium">
                                                                        {formatUsDate(sub.createdAt)}
                                                                    </span>
                                                                    <span className="text-xs text-gray-400">
                                                                        {formatUsTime(sub.createdAt)}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-sm text-gray-400 italic">-</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 text-start whitespace-nowrap border-b border-r border-neutral-200 dark:border-slate-600">
                                                        <div className="flex flex-col gap-0.5" title="Submission Date">
                                                            <span className="text-sm text-gray-900 font-medium">
                                                                {formatSubmissionDate(sub.submissionDate)}
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                                {formatSubmissionTime(sub.submissionDate, sub.createdAt)}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    {showExtendedDetails && (
                                                        <TableCell className="px-6 py-4 text-center border-b border-r border-neutral-200 dark:border-slate-600">
                                                            <PipelineProgress sub={sub} />
                                                        </TableCell>
                                                    )}
                                                    <TableCell className="px-6 py-4 text-center border-b border-r border-neutral-200 dark:border-slate-600">
                                                        <span className={cn(
                                                            "rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide inline-flex items-center justify-center",
                                                            getBadgeStyles(sub.finalStatus)
                                                        )}>
                                                            {sub.finalStatus || "PENDING"}
                                                        </span>
                                                    </TableCell>
                                                    {showExtendedDetails && (
                                                        <TableCell className="px-4 py-4 text-start w-[120px] border-b border-r border-neutral-200 dark:border-slate-600">
                                                            <FeedbackPopover remarks={sub.remarks} comment={sub.recruiterComment} />
                                                        </TableCell>
                                                    )}
                                                    <TableCell className={cn(
                                                        "px-4 py-4 text-end whitespace-nowrap w-[80px] border-b border-neutral-200 dark:border-slate-600 sticky right-0 z-20 shadow-[-1px_0_0_0_rgba(226,232,240,1)]",
                                                        stickyBgClass
                                                    )}>
                                                        <div className="flex justify-end items-center">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48">
                                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                        <EditStatusDialog sub={sub} onSaved={onUpdate} isRecruiter={isRecruiter} trigger={
                                                                            <div className="flex items-center gap-2 w-full">
                                                                                <Pencil className="h-4 w-4" />
                                                                                <span>Edit status</span>
                                                                            </div>
                                                                        } />
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem asChild disabled={!baseUrl}>
                                                                        <Link href={`${baseUrl}/${sub.jobId}`} className="flex items-center gap-2 w-full cursor-pointer">
                                                                            <FileText className="h-4 w-4" />
                                                                            <span>View Details</span>
                                                                        </Link>
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
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
            </div >

            {/* Pagination Controls */}
            {
                totalPages > 1 && (
                    <div className="flex items-center justify-between px-2 pt-2">
                        <p className="text-sm text-gray-500">
                            Showing <span className="font-medium text-gray-900">{Math.min((currentPage - 1) * itemsPerPage + 1, sortedSubmissions.length)}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, sortedSubmissions.length)}</span> of <span className="font-medium text-gray-900">{sortedSubmissions.length}</span> results
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-gray-200 text-gray-600 hover:bg-gray-50"
                                onClick={() => handlePageChange(1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-gray-200 text-gray-600 hover:bg-gray-50"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-1 px-1">
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
                                            className={cn(
                                                "h-8 w-8 text-xs",
                                                currentPage === pageNum
                                                    ? "bg-blue-600 hover:bg-blue-700 text-white border-0"
                                                    : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                            )}
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
                                className="h-8 w-8 border-gray-200 text-gray-600 hover:bg-gray-50"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-gray-200 text-gray-600 hover:bg-gray-50"
                                onClick={() => handlePageChange(totalPages)}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
