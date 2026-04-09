"use client";

import React, { useState, useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { parseISO, format, startOfDay, isValid } from "date-fns";
import { Calendar, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface DatewiseSubmissionTableProps {
    jobs?: any[];
    initialTrends?: any[];
}

const DatewiseSubmissionTable = ({ jobs = [], initialTrends = [] }: DatewiseSubmissionTableProps) => {
    const [filter, setFilter] = useState("daily");
    const [trends, setTrends] = useState<any[]>(initialTrends);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Page sizes as requested
    const getPageSize = () => {
        if (filter === "daily") return 10;
        if (filter === "monthly") return 12;
        if (filter === "yearly") return 10;
        if (filter === "weekly") return 8; // Roughly 2 months
        return 10;
    };

    const pageSize = getPageSize();

    // Fetch trends when filter changes (except for the initial render)
    React.useEffect(() => {
        const fetchTrends = async () => {
            setIsLoading(true);
            try {
                const response = await apiClient(`/dashboard/admin/performance-trends?interval=${filter}`);
                const resData = await response.json();
                if (resData?.data) {
                    setTrends(resData.data);
                    setCurrentPage(1); // Reset to first page on filter change
                }
            } catch (error) {
                console.error("Error fetching performance trends:", error);
            } finally {
                setIsLoading(false);
            }
        };

        // Don't fetch on first mount if initialTrends is provided and filter is daily
        if (filter === "daily" && trends === initialTrends && trends.length > 0) {
            return;
        }

        fetchTrends();
    }, [filter]);

    const formattedData = useMemo(() => {
        return [...trends].sort((a, b) => {
            const dateA = a.period.startsWith("Week of ") ? a.period.replace("Week of ", "") : a.period;
            const dateB = b.period.startsWith("Week of ") ? b.period.replace("Week of ", "") : b.period;
            return dateB.localeCompare(dateA);
        });
    }, [trends]);

    // Pagination Logic
    const totalPages = Math.ceil(formattedData.length / pageSize);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return formattedData.slice(start, start + pageSize);
    }, [formattedData, currentPage, pageSize]);

    const totals = useMemo(() => {
        return formattedData.reduce((acc, current) => {
            acc.newReq += current.newJobs || 0;
            acc.cfrExtended += current.cfrExtendedJobs || 0;
            acc.totalJobPost += current.jobsPosted || 0;
            acc.totalPosition += current.positionsPosted || 0;
            acc.totalSubmissionReq += current.submissionsRequired || 0;
            acc.totalSubmissionDone += current.submissionsDone || 0;
            return acc;
        }, {
            newReq: 0,
            cfrExtended: 0,
            totalJobPost: 0,
            totalPosition: 0,
            totalSubmissionReq: 0,
            totalSubmissionDone: 0,
        });
    }, [formattedData]);

    const totalSubmissionRate = totals.totalSubmissionReq > 0
        ? Math.round((totals.totalSubmissionDone / totals.totalSubmissionReq) * 100)
        : 0;

    return (
        <Card className="card border-none shadow-premium overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-6 px-6 bg-neutral-50/50 dark:bg-slate-800/50">
                <div>
                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        Datewise Submission Performance
                    </CardTitle>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Aggregation of job posts and submission activity</p>
                </div>
                <div className="flex items-center gap-3">
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-[160px] bg-white dark:bg-slate-900 shadow-sm border-neutral-200 dark:border-slate-700">
                            <SelectValue placeholder="Filter by" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-900 border-slate-700">
                            <SelectItem value="daily">Daily View</SelectItem>
                            <SelectItem value="weekly">Weekly View</SelectItem>
                            <SelectItem value="monthly">Monthly View</SelectItem>
                            <SelectItem value="yearly">Yearly View</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-neutral-100/50 dark:bg-slate-700/50 border-y border-neutral-200 dark:border-slate-600">
                                <TableHead className="px-6 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider border-r border-neutral-200 dark:border-slate-600">Period</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600 whitespace-nowrap">New Req</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600 whitespace-nowrap">CFR / Ext</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600 whitespace-nowrap">Total Job Post</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600">Total Position</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600">Total Submission Req</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600">Total Submission Done</TableHead>
                                <TableHead className="px-6 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center">Rate Of Submission</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedData.length > 0 ? paginatedData.map((group, index) => {
                                const rate = group.submissionsRequired > 0 ? Math.round((group.submissionsDone / group.submissionsRequired) * 100) : 0;
                                return (
                                    <TableRow key={index} className="hover:bg-primary/[0.02] dark:hover:bg-primary/[0.05] transition-all duration-200 border-b border-neutral-100 dark:border-slate-700 last:border-0 even:bg-neutral-50/50 dark:even:bg-slate-800/20">
                                        <TableCell className="px-6 py-4 border-r border-neutral-100 dark:border-slate-700/50">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30">
                                                    <Calendar className="h-4 w-4" />
                                                </div>
                                                <span className="font-bold text-neutral-800 dark:text-neutral-100 text-sm whitespace-nowrap">
                                                    {group.period}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-4 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                            <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm border border-emerald-100 dark:border-emerald-800/30">
                                                {group.newJobs}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-4 py-4 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                            <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-bold text-sm border border-orange-100 dark:border-orange-800/30">
                                                {group.cfrExtendedJobs}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-4 py-4 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                            <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-100 dark:border-blue-800/30">
                                                {group.jobsPosted}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-4 py-4 text-center border-r border-neutral-100 dark:border-slate-700/50 font-bold text-neutral-600 dark:text-neutral-300 text-sm">
                                            {group.positionsPosted}
                                        </TableCell>
                                        <TableCell className="px-4 py-4 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                            <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold text-sm border border-amber-100 dark:border-amber-800/30">
                                                {group.submissionsRequired}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-4 py-4 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                            <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm border border-emerald-100 dark:border-emerald-800/30">
                                                {group.submissionsDone}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className={`text-sm font-black ${rate >= 70 ? 'text-emerald-500' : rate >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                    {rate}%
                                                </span>
                                                <div className="w-24 h-2 bg-neutral-100 dark:bg-slate-700/50 rounded-full overflow-hidden p-[1px]">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${rate >= 70 ? 'bg-emerald-500' : rate >= 40 ? 'bg-amber-500' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`}
                                                        style={{ width: `${Math.min(rate, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-40 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-neutral-400">
                                            <div className="p-3 rounded-full bg-neutral-50 dark:bg-slate-800/50">
                                                <Calendar className="h-6 w-6" />
                                            </div>
                                            <span className="text-sm font-medium">No submission data found for the selected period</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {formattedData.length > 0 && (
                                <TableRow className="bg-neutral-50 dark:bg-slate-800/80 font-black border-t-2 border-primary/20">
                                    <TableCell className="px-6 py-5 border-r border-neutral-100 dark:border-slate-700/50">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                                <span className="text-[10px] font-black uppercase">Tot</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[15px] text-emerald-600">Grand Total</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-5 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-emerald-600 text-white font-black text-sm shadow-md shadow-emerald-500/20">
                                            {totals.newReq}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-5 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-orange-600 text-white font-black text-sm shadow-md shadow-orange-500/20">
                                            {totals.cfrExtended}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-5 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-blue-600 text-white font-black text-sm shadow-md shadow-blue-500/20">
                                            {totals.totalJobPost}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-5 text-center text-lg text-neutral-700 dark:text-neutral-200 border-r border-neutral-100 dark:border-slate-700/50">{totals.totalPosition}</TableCell>
                                    <TableCell className="px-4 py-5 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-amber-600 text-white font-black text-sm shadow-md shadow-amber-500/20">
                                            {totals.totalSubmissionReq}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-5 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-emerald-600 text-white font-black text-sm shadow-md shadow-emerald-500/20">
                                            {totals.totalSubmissionDone}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-6 py-5 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-sm font-black text-emerald-600">
                                                {totalSubmissionRate}%
                                            </span>
                                            <div className="w-24 h-2 bg-neutral-200 dark:bg-slate-700/50 rounded-full overflow-hidden p-[1px]">
                                                <div
                                                    className="h-full rounded-full bg-emerald-600 transition-all duration-1000 ease-out"
                                                    style={{ width: `${Math.min(totalSubmissionRate, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 bg-neutral-50/50 dark:bg-slate-800/50 border-t border-neutral-200 dark:border-slate-700">
                        <div className="text-sm text-neutral-500 dark:text-neutral-400">
                            Showing <span className="font-bold text-neutral-700 dark:text-neutral-200">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                            <span className="font-bold text-neutral-700 dark:text-neutral-200">
                                {Math.min(currentPage * pageSize, trends.length)}
                            </span>{" "}
                            of <span className="font-bold text-neutral-700 dark:text-neutral-200">{trends.length}</span> periods
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-neutral-700 dark:text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Previous
                            </button>
                            <div className="flex items-center px-4 text-sm font-bold text-neutral-700 dark:text-neutral-200">
                                Page {currentPage} of {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-neutral-700 dark:text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default DatewiseSubmissionTable;
