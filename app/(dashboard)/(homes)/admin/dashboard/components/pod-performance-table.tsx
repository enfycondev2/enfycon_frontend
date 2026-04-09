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
import { parseISO, isValid } from "date-fns";
import { Users } from "lucide-react";

import { apiClient } from "@/lib/apiClient";
import { Loader2 } from "lucide-react";

interface PodPerformanceTableProps {
    jobs?: any[];
    submissions?: any[];
}

const PodPerformanceTable = ({ jobs: _jobs = [], submissions: _submissions = [] }: PodPerformanceTableProps) => {
    const [filter, setFilter] = useState("all");
    const [podData, setPodData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    React.useEffect(() => {
        const fetchPodPerformance = async () => {
            setIsLoading(true);
            try {
                let url = `/dashboard/admin/pod-performance`;
                const params = new URLSearchParams();
                
                const now = new Date();
                if (filter === "today") {
                    params.append("startDate", new Date(now.setHours(0,0,0,0)).toISOString());
                } else if (filter === "week") {
                    const first = now.getDate() - now.getDay();
                    params.append("startDate", new Date(now.setDate(first)).toISOString());
                } else if (filter === "month") {
                    params.append("startDate", new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
                } else if (filter === "year") {
                    params.append("startDate", new Date(now.getFullYear(), 0, 1).toISOString());
                }

                if (params.toString()) {
                    url += `?${params.toString()}`;
                }

                const response = await apiClient(url);
                const data = await response.json();
                if (Array.isArray(data)) {
                    setPodData(data);
                }
            } catch (error) {
                console.error("Error fetching pod performance:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPodPerformance();
    }, [filter]);

    const filteredData = podData;

    const totals = useMemo(() => {
        return filteredData.reduce((acc, current) => {
            acc.newReq += current.newReq || 0;
            acc.cfr += current.cfr || 0;
            acc.totalJobs += current.totalJobs || 0;
            acc.totalPositions += current.totalPositions || 0;
            acc.submissionDone += current.submissionDone || 0;
            acc.submissionRequired += current.submissionRequired || 0;
            acc.totalSubmissions += current.totalSubmissions || 0;
            acc.closure += current.closure || 0;
            return acc;
        }, {
            newReq: 0,
            cfr: 0,
            totalJobs: 0,
            totalPositions: 0,
            submissionDone: 0,
            submissionRequired: 0,
            totalSubmissions: 0,
            closure: 0
        });
    }, [filteredData]);

    const totalSubmissionRate = totals.submissionRequired > 0
        ? Math.round((totals.submissionDone / totals.submissionRequired) * 100)
        : 0;

    return (
        <Card className="card border-none shadow-premium overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-6 px-6 bg-neutral-50/50 dark:bg-slate-800/50">
                <div>
                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        Pod Performance
                    </CardTitle>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Cross-pod throughput and efficiency metrics</p>
                </div>
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-[160px] bg-white dark:bg-slate-900 shadow-sm border-neutral-200 dark:border-slate-700">
                        <SelectValue placeholder="Filter by" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 border-slate-700">
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-neutral-100/50 dark:bg-slate-700/50 border-y border-neutral-200 dark:border-slate-600">
                                <TableHead className="px-6 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider border-r border-neutral-200 dark:border-slate-600">Pod Name</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600">New Req</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600">CFR</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600">Jobs Assigned</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600">Total Positions</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600">Sub Required</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600"> Submissions Done</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600">Submission Rate</TableHead>
                                <TableHead className="px-6 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center">Closure</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length > 0 ? filteredData.map((pod, index) => (
                                <TableRow key={index} className="hover:bg-primary/[0.02] dark:hover:bg-primary/[0.05] transition-all duration-200 border-b border-neutral-100 dark:border-slate-700 last:border-0 even:bg-neutral-50/50 dark:even:bg-slate-800/20">
                                    <TableCell className="px-6 py-4 border-r border-neutral-100 dark:border-slate-700/50">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30 shadow-sm">
                                                <Users className="h-5 w-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-neutral-800 dark:text-neutral-100 text-[15px] capitalize">{pod.name.toLowerCase()}</span>
                                                <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-tighter italic">Active Pod</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-100 dark:border-blue-800/30">
                                            {pod.newReq}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-bold text-sm border border-purple-100 dark:border-purple-800/30">
                                            {pod.cfr}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center font-bold text-neutral-600 dark:text-neutral-300 text-sm border-r border-neutral-100 dark:border-slate-700/50">{pod.totalJobs}</TableCell>
                                    <TableCell className="px-4 py-4 text-center font-bold text-neutral-600 dark:text-neutral-300 text-sm border-r border-neutral-100 dark:border-slate-700/50">{pod.totalPositions}</TableCell>
                                    <TableCell className="px-4 py-4 text-center font-bold text-neutral-600 dark:text-neutral-300 text-sm border-r border-neutral-100 dark:border-slate-700/50">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold text-sm border border-amber-100 dark:border-amber-800/30">
                                            {pod.submissionRequired}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center font-bold text-neutral-600 dark:text-neutral-300 text-sm border-r border-neutral-100 dark:border-slate-700/50">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm border border-emerald-100 dark:border-emerald-800/30">
                                            {pod.totalSubmissions}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className={`text-sm font-black ${pod.submissionRate >= 70 ? 'text-emerald-500' : pod.submissionRate >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                {pod.submissionRate}%
                                            </span>
                                            <div className="w-20 h-2 bg-neutral-100 dark:bg-slate-700/50 rounded-full overflow-hidden p-[1px]">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${pod.submissionRate >= 70 ? 'bg-emerald-500' : pod.submissionRate >= 40 ? 'bg-amber-500' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`}
                                                    style={{ width: `${Math.min(pod.submissionRate, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-center">
                                        <span className="px-3 py-1.5 rounded-full bg-orange-500 text-white font-black text-xs shadow-lg shadow-orange-500/20 border border-orange-400/30">
                                            {pod.closure}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-40 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-neutral-400">
                                            <div className="p-3 rounded-full bg-neutral-50 dark:bg-slate-800/50">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                            </div>
                                            <span className="text-sm font-medium">No pod performance data found</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {filteredData.length > 0 && (
                                <TableRow className="bg-neutral-50 dark:bg-slate-800/80 font-black border-t-2 border-primary/20">
                                    <TableCell className="px-6 py-5 border-r border-neutral-100 dark:border-slate-700/50">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                                <span className="text-xs font-black">ALL</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[16px] text-emerald-600">Total Pod Performance</span>
                                                <span className="text-[10px] uppercase tracking-widest opacity-60">Global Aggregate</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-5 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-emerald-600 text-white font-black text-sm shadow-md shadow-emerald-500/20">
                                            {totals.newReq}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-5 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-purple-600 text-white font-black text-sm shadow-md shadow-purple-500/20">
                                            {totals.cfr}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-5 text-center text-lg text-emerald-600 border-r border-neutral-100 dark:border-slate-700/50">{totals.totalJobs}</TableCell>
                                    <TableCell className="px-4 py-5 text-center text-lg text-emerald-600 border-r border-neutral-100 dark:border-slate-700/50">{totals.totalPositions}</TableCell>
                                    <TableCell className="px-4 py-5 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-emerald-600 text-white font-black text-sm shadow-md shadow-emerald-500/20">
                                            {totals.totalSubmissions}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-5 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-amber-600 text-white font-black text-sm shadow-md shadow-amber-500/20">
                                            {totals.submissionRequired}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-5 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-sm font-black text-emerald-600">
                                                {totalSubmissionRate}%
                                            </span>
                                            <div className="w-20 h-2 bg-neutral-200 dark:bg-slate-700/50 rounded-full overflow-hidden p-[1px]">
                                                <div
                                                    className="h-full rounded-full bg-emerald-600 transition-all duration-1000 ease-out"
                                                    style={{ width: `${Math.min(totalSubmissionRate, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-5 text-center">
                                        <span className="px-4 py-2 rounded-xl bg-orange-600 text-white font-black text-sm shadow-xl shadow-orange-500/30 border border-orange-400/20">
                                            {totals.closure}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

export default PodPerformanceTable;
