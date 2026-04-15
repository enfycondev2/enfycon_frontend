"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Search,
    FilterX,
    Maximize,
    Minimize,
    Calendar,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn, formatUsDate } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";

interface Submission {
    id: number;
    candidateName: string;
    submissionDate: string;
    l1Status: string;
    l1Date: string;
    l2Status: string;
    l2Date: string;
    l3Status: string;
    l3Date: string;
    remarks: string;
    job: {
        jobCode: string;
        jobTitle: string;
        clientName: string;
        endClientName: string;
        accountManager: {
            fullName: string;
        };
    };
    recruiter: {
        fullName: string;
    };
}

const STAGE_STATUSES = ["PENDING", "CLEARED", "REJECTED"];

const StatusDot = ({ status, label, date }: { status: string; label: string; date?: string }) => {
    const s = (status || "PENDING").toUpperCase();
    let color = "bg-blue-500 border-blue-600"; // Default Blue for Pending
    
    if (s === "CLEARED") color = "bg-green-500 border-green-600";
    if (s === "REJECTED") color = "bg-red-500 border-red-600";

    return (
        <div className="flex flex-col items-center gap-0.5 min-w-[60px]">
            <div className={cn("w-3 h-3 rounded-full border shadow-sm", color)} title={s} />
            <span className="text-[10px] font-bold text-neutral-500">{label}</span>
            {date && (
                <span className="text-[9px] text-neutral-400 font-medium">
                    {formatUsDate(date)}
                </span>
            )}
        </div>
    );
};

const RemarksCell = ({ sub, fetchSubmissions }: { sub: Submission, fetchSubmissions: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <TableCell>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <button 
                        className="text-left group/rem w-full"
                        onMouseEnter={() => setIsOpen(true)}
                    >
                        <p className="text-[10px] text-gray-500 italic line-clamp-2 max-w-[150px] group-hover/rem:text-blue-600 transition-colors" title="View/Edit Remarks">
                            {sub.remarks || "Add remarks..."}
                        </p>
                    </button>
                </PopoverTrigger>
                <PopoverContent 
                    className="w-80 p-4 shadow-xl border-gray-100 rounded-xl" 
                    align="start"
                    onMouseLeave={() => setIsOpen(false)}
                >
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Remarks & Feedback</span>
                            <span className="text-[9px] font-medium text-gray-400 tabular-nums">{formatUsDate(sub.submissionDate)}</span>
                        </div>
                        <textarea 
                            className="w-full min-h-[100px] text-xs text-gray-700 bg-gray-50 border-none focus:ring-1 focus:ring-blue-100 rounded-lg p-3 resize-none"
                            defaultValue={sub.remarks || ""}
                            placeholder="Provide detailed interview feedback..."
                            onFocus={() => setIsOpen(true)}
                            onBlur={async (e) => {
                                setIsOpen(false);
                                const newRemarks = e.target.value;
                                if (newRemarks === (sub.remarks || "")) return;
                                try {
                                    const res = await apiClient(`/recruiter-submissions/${sub.id}`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ remarks: newRemarks }),
                                    });
                                    if (res.ok) {
                                        toast.success("Remarks updated");
                                        fetchSubmissions();
                                    }
                                } catch (err) {
                                    toast.error("Failed to update remarks");
                                }
                            }}
                        />
                        <div className="flex items-center justify-end">
                            <span className="text-[9px] text-gray-400 italic">Auto-saves on blur</span>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </TableCell>
    );
};

export default function InterviewTrackerTable() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const containerRef = React.useRef<HTMLDivElement>(null);
    // UI State
    const [isFullScreen, setIsFullScreen] = useState(false);
    
    // Filters
    const [amFilter, setAmFilter] = useState("all");
    const [clientFilter, setClientFilter] = useState("");
    const [l1Filter, setL1Filter] = useState("all");
    const [l2Filter, setL2Filter] = useState("all");
    const [l3Filter, setL3Filter] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    
    // Lists for dropdowns
    const [accountManagers, setAccountManagers] = useState<{ id: string, fullName: string }[]>([]);
    const [stats, setStats] = useState({ total: 0, l1Pending: 0, l2Pending: 0, l3Pending: 0 });

    useEffect(() => {
        const fetchAMs = async () => {
            try {
                const res = await apiClient("/auth/users");
                if (res.ok) {
                    const users = await res.json();
                    setAccountManagers(users.filter((u: any) => u.roles.includes("ACCOUNT_MANAGER")));
                }
            } catch (e) {
                console.error("Failed to fetch AMs", e);
            }
        };
        const fetchStats = async () => {
            try {
                const res = await apiClient("/recruiter-submissions/stats/tracker");
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (e) {
                console.error("Failed to fetch stats", e);
            }
        };
        fetchAMs();
        fetchStats();
    }, []);

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                ...(amFilter !== "all" && { accountManagerId: amFilter }),
                ...(clientFilter && { clientName: clientFilter }),
                ...(l1Filter !== "all" && { l1Status: l1Filter }),
                ...(l2Filter !== "all" && { l2Status: l2Filter }),
                ...(l3Filter !== "all" && { l3Status: l3Filter }),
                ...(startDate && { startDate }),
                ...(endDate && { endDate }),
            });

            const res = await apiClient(`/recruiter-submissions?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch data");
            const result = await res.json();
            setSubmissions(result.data);
            setTotal(result.total);
            setTotalPages(result.totalPages);
        } catch (e) {
            toast.error("Error loading tracker data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmissions();
    }, [page, amFilter, l1Filter, l2Filter, l3Filter, startDate, endDate]);

    // Use debounced trigger for client filter if needed, or manual trigger
    const handleClientSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchSubmissions();
    };

    const clearFilters = () => {
        setAmFilter("all");
        setClientFilter("");
        setL1Filter("all");
        setL2Filter("all");
        setL3Filter("all");
        setStartDate("");
        setEndDate("");
        setPage(1);
    };



    return (
        <div
            ref={containerRef}
            className={cn(
                "space-y-6 transition-all duration-300",
                isFullScreen && "fixed inset-0 z-[100] bg-gray-50 p-8 overflow-auto h-screen w-screen"
            )}
            style={isFullScreen ? { isolation: "auto" } : undefined}
        >
            {/* Quick Stats Cards */}
            {!isFullScreen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: "Total Submissions", value: stats.total, color: "blue" },
                        { label: "Pending L1", value: stats.l1Pending, color: "blue" },
                        { label: "Pending L2", value: stats.l2Pending, color: "amber" },
                        { label: "Pending L3", value: stats.l3Pending, color: "emerald" },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-1">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                                <div className={cn("h-1.5 w-1.5 rounded-full", stat.color === "blue" ? "bg-blue-500" : stat.color === "amber" ? "bg-amber-500" : "bg-emerald-500")} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Manager</label>
                    <Select value={amFilter} onValueChange={(v) => { setAmFilter(v); setPage(1); }}>
                        <SelectTrigger className="h-9 text-xs rounded-lg bg-gray-50 border-gray-200">
                            <SelectValue placeholder="All Managers" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Managers</SelectItem>
                            {accountManagers.map(am => (
                                <SelectItem key={am.id} value={am.id}>{am.fullName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <form onSubmit={handleClientSearch} className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Client</label>
                    <div className="relative">
                        <Input 
                            placeholder="Search..." 
                            value={clientFilter} 
                            onChange={(e) => setClientFilter(e.target.value)}
                            className="h-9 text-xs pr-8 rounded-lg bg-gray-50 border-gray-200"
                        />
                        <button type="submit" className="absolute right-2.5 top-2.5 text-gray-400 hover:text-blue-500">
                            <Search className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </form>

                {/* Date Filters */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">From</label>
                    <Input 
                        type="date"
                        value={startDate} 
                        onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                        className="h-9 text-[11px] rounded-lg bg-gray-50 border-gray-200 w-36"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">To</label>
                    <Input 
                        type="date"
                        value={endDate} 
                        onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                        className="h-9 text-[11px] rounded-lg bg-gray-50 border-gray-200 w-36"
                    />
                </div>

                <div className="flex flex-col gap-1.5 w-24">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">L1</label>
                    <Select value={l1Filter} onValueChange={(v) => { setL1Filter(v); setPage(1); }}>
                        <SelectTrigger className="h-9 text-xs rounded-lg bg-gray-50 border-gray-200">
                             <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                             <SelectItem value="all">All</SelectItem>
                             {STAGE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1.5 w-24">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">L2</label>
                    <Select value={l2Filter} onValueChange={(v) => { setL2Filter(v); setPage(1); }}>
                        <SelectTrigger className="h-9 text-xs rounded-lg bg-gray-50 border-gray-200">
                             <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                             <SelectItem value="all">All</SelectItem>
                             {STAGE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1.5 w-24">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">L3</label>
                    <Select value={l3Filter} onValueChange={(v) => { setL3Filter(v); setPage(1); }}>
                        <SelectTrigger className="h-9 text-xs rounded-lg bg-gray-50 border-gray-200">
                             <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                             <SelectItem value="all">All</SelectItem>
                             {STAGE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2 items-center h-9">
                    <Button variant="outline" size="icon" onClick={clearFilters} className="h-9 w-9 rounded-lg" title="Clear Filters">
                        <FilterX className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setIsFullScreen(!isFullScreen)} className="h-9 w-9 rounded-lg border-blue-100 text-blue-600 bg-blue-50/30">
                        {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow className="hover:bg-transparent border-b">
                            <TableHead className="w-14 text-[10px] font-bold text-neutral-500 uppercase">SL</TableHead>
                            <TableHead className="text-[10px] font-bold text-neutral-500 uppercase">Job ID</TableHead>
                            <TableHead className="text-[10px] font-bold text-neutral-500 uppercase">Sales Manager</TableHead>
                            <TableHead className="text-[10px] font-bold text-neutral-500 uppercase">Job / End Client</TableHead>
                            <TableHead className="text-[10px] font-bold text-neutral-500 uppercase">Candidate</TableHead>
                            <TableHead className="text-[10px] font-bold text-neutral-500 uppercase text-center min-w-[120px]">L1 Stage</TableHead>
                            <TableHead className="text-[10px] font-bold text-neutral-500 uppercase text-center min-w-[120px]">L2 Stage</TableHead>
                            <TableHead className="text-[10px] font-bold text-neutral-500 uppercase text-center min-w-[120px]">L3 Stage</TableHead>
                            <TableHead className="text-[10px] font-bold text-neutral-500 uppercase">Remarks</TableHead>
                            <TableHead className="text-[10px] font-bold text-neutral-500 uppercase">Recruiter</TableHead>
                            <TableHead className="text-[10px] font-bold text-neutral-500 uppercase text-right pr-6">Submitted</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={11} className="h-16 text-center animate-pulse bg-gray-50/20" />
                                </TableRow>
                            ))
                        ) : submissions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} className="h-32 text-center text-gray-400">
                                    No interview records found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            submissions.map((sub, idx) => (
                                <TableRow key={sub.id} className={cn(
                                    "transition-colors group",
                                    sub.l3Status === "CLEARED"
                                        ? "bg-green-50 hover:bg-green-100/60 border-l-[3px] border-l-green-500"
                                        : (sub.l1Status === "REJECTED" || sub.l2Status === "REJECTED" || sub.l3Status === "REJECTED")
                                            ? "bg-red-100/70 hover:bg-red-100 border-l-[3px] border-l-red-500"
                                            : "hover:bg-gray-50/50"
                                )}>
                                    <TableCell className="text-xs font-medium text-gray-400">
                                        {((page - 1) * 20) + idx + 1}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100 max-w-max">{sub.job.jobCode}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold text-gray-900 leading-tight">{sub.job.accountManager.fullName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-xs font-bold text-blue-600 line-clamp-1">{sub.job.jobTitle}</span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[10px] font-semibold text-gray-700">{sub.job.clientName}</span>
                                                {sub.job.endClientName && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] text-gray-400 italic">»</span>
                                                        <span className="text-[10px] font-medium text-purple-600">{sub.job.endClientName}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs font-semibold text-gray-900">{sub.candidateName}</span>
                                    </TableCell>
                                    
                                    {/* L1 Stage */}
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                             <div className={cn(
                                                 "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                                                 sub.l1Status === "CLEARED" ? "bg-green-100 text-green-700" : 
                                                 sub.l1Status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                             )}>
                                                {sub.l1Status || "PENDING"}
                                             </div>
                                             <span className="text-[10px] font-bold text-gray-600 tabular-nums">
                                                {sub.l1Date ? formatUsDate(sub.l1Date) : "--"}
                                             </span>
                                        </div>
                                    </TableCell>

                                    {/* L2 Stage */}
                                    <TableCell className="text-center border-x border-gray-50">
                                        <div className="flex flex-col items-center gap-1">
                                             <div className={cn(
                                                 "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                                                 sub.l2Status === "CLEARED" ? "bg-green-100 text-green-700" : 
                                                 sub.l2Status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                             )}>
                                                {sub.l2Status || "PENDING"}
                                             </div>
                                             <span className="text-[10px] font-bold text-gray-600 tabular-nums">
                                                {sub.l2Date ? formatUsDate(sub.l2Date) : "--"}
                                             </span>
                                        </div>
                                    </TableCell>

                                    {/* L3 Stage */}
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                             <div className={cn(
                                                 "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                                                 sub.l3Status === "CLEARED" ? "bg-green-100 text-green-700" : 
                                                 sub.l3Status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                             )}>
                                                {sub.l3Status || "PENDING"}
                                             </div>
                                             <span className="text-[10px] font-bold text-gray-600 tabular-nums">
                                                {sub.l3Date ? formatUsDate(sub.l3Date) : "--"}
                                             </span>
                                        </div>
                                    </TableCell>

                                    <RemarksCell sub={sub} fetchSubmissions={fetchSubmissions} />
                                    <TableCell>
                                        <span className="text-[10px] font-medium text-gray-700">{sub.recruiter.fullName}</span>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <span className="text-[10px] font-semibold text-gray-600 tabular-nums">
                                            {formatUsDate(sub.submissionDate)}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination Footer */}
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-t">
                    <p className="text-xs text-gray-500 font-medium italic">
                        Showing <span className="text-gray-900 font-bold">{Math.min((page - 1) * 20 + 1, total)}</span> to <span className="text-gray-900 font-bold">{Math.min(page * 20, total)}</span> of <span className="text-gray-900 font-bold">{total}</span> interviews
                    </p>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="icon" onClick={() => setPage(1)} disabled={page === 1} className="h-8 w-8 rounded-lg">
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setPage(page - 1)} disabled={page === 1} className="h-8 w-8 rounded-lg">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center px-4 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <span className="text-xs font-bold text-blue-600">Page {page} of {totalPages || 1}</span>
                        </div>
                        <Button variant="outline" size="icon" onClick={() => setPage(page + 1)} disabled={page === totalPages} className="h-8 w-8 rounded-lg">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setPage(totalPages)} disabled={page === totalPages} className="h-8 w-8 rounded-lg">
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
