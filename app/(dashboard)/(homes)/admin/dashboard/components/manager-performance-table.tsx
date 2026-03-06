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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    isToday,
    isThisWeek,
    isThisMonth,
    isThisYear,
    parseISO,
} from "date-fns";

interface ManagerPerformanceTableProps {
    jobs: any[];
}

const ManagerPerformanceTable = ({ jobs }: ManagerPerformanceTableProps) => {
    const [filter, setFilter] = useState("all");

    const filteredData = useMemo(() => {
        const managers: Record<string, any> = {};

        // EST Timezone Helpers
        const getESTPart = (date: Date, part: 'year' | 'month' | 'day' | 'week') => {
            if (part === 'week') {
                // Approximate week of year in EST
                const d = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
                d.setHours(0, 0, 0, 0);
                d.setDate(d.getDate() + 4 - (d.getDay() || 7));
                const yearStart = new Date(d.getFullYear(), 0, 1);
                return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
            }
            const options: Intl.DateTimeFormatOptions = { timeZone: 'America/New_York' };
            if (part === 'year') options.year = 'numeric';
            if (part === 'month') options.month = 'numeric';
            if (part === 'day') options.day = 'numeric';
            return new Intl.DateTimeFormat('en-US', options).format(date);
        };

        const now = new Date();
        const currentYear = getESTPart(now, 'year');
        const currentMonth = getESTPart(now, 'month');
        const currentDay = getESTPart(now, 'day');
        const currentWeek = getESTPart(now, 'week');

        jobs.forEach((job) => {
            const manager = job.accountManager;
            if (!manager) return;

            const createdAt = parseISO(job.createdAt);
            const updatedAt = parseISO(job.updatedAt);

            const jobYear = getESTPart(createdAt, 'year');
            const jobMonth = getESTPart(createdAt, 'month');
            const jobDay = getESTPart(createdAt, 'day');
            const jobWeek = getESTPart(createdAt, 'week');

            let isInRange = false;
            if (filter === "all") isInRange = true;
            else if (filter === "today") isInRange = jobYear === currentYear && jobMonth === currentMonth && jobDay === currentDay;
            else if (filter === "week") isInRange = jobYear === currentYear && jobWeek === currentWeek;
            else if (filter === "month") isInRange = jobYear === currentYear && jobMonth === currentMonth;
            else if (filter === "year") isInRange = jobYear === currentYear;

            let isClosedInRange = false;
            const isClosedStatus = job.status === "CLOSED" || job.status === "FILLED";
            if (isClosedStatus) {
                const updatedYear = getESTPart(updatedAt, 'year');
                const updatedMonth = getESTPart(updatedAt, 'month');
                const updatedDay = getESTPart(updatedAt, 'day');
                const updatedWeek = getESTPart(updatedAt, 'week');

                if (filter === "all") isClosedInRange = true;
                else if (filter === "today") isClosedInRange = updatedYear === currentYear && updatedMonth === currentMonth && updatedDay === currentDay;
                else if (filter === "week") isClosedInRange = updatedYear === currentYear && updatedWeek === currentWeek;
                else if (filter === "month") isClosedInRange = updatedYear === currentYear && updatedMonth === currentMonth;
                else if (filter === "year") isClosedInRange = updatedYear === currentYear;
            }

            if (!managers[manager.id]) {
                managers[manager.id] = {
                    name: manager.fullName || "Unknown",
                    newReq: 0,
                    cfr: 0,
                    totalJobs: 0,
                    submissionDone: 0,
                    submissionRequired: 0,
                    closure: 0,
                };
            }

            const m = managers[manager.id];

            if (isInRange) {
                m.newReq += 1;
                m.totalJobs += 1;
                if (job.requirementType === "CFR" || job.requirementType === "CFR_EXTENDED") {
                    m.cfr += 1;
                }
                m.submissionDone += job.submissionDone || 0;
                m.submissionRequired += job.submissionRequired || 0;
            }

            if (isClosedInRange) {
                m.closure += 1;
            }
        });

        return Object.values(managers).map((m: any) => ({
            ...m,
            submissionRate: m.submissionRequired > 0
                ? Math.round((m.submissionDone / m.submissionRequired) * 100)
                : 0
        }));
    }, [jobs, filter]);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const totals = useMemo(() => {
        return filteredData.reduce((acc, current) => {
            acc.newReq += current.newReq;
            acc.cfr += current.cfr;
            acc.totalJobs += current.totalJobs;
            acc.submissionDone += current.submissionDone;
            acc.submissionRequired += current.submissionRequired;
            acc.closure += current.closure;
            return acc;
        }, {
            newReq: 0,
            cfr: 0,
            totalJobs: 0,
            submissionDone: 0,
            submissionRequired: 0,
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
                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                        Account Manager Performance
                    </CardTitle>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Real-time tracking of manager targets and closures</p>
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
                                <TableHead className="px-6 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider">Sales Manager</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center">New Req</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center">CFR</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center">Total Jobs</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center">Submission Rate</TableHead>
                                <TableHead className="px-6 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center">Closure</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length > 0 ? filteredData.map((manager, index) => (
                                <TableRow key={index} className="hover:bg-primary/[0.02] dark:hover:bg-primary/[0.05] transition-all duration-200 border-b border-neutral-100 dark:border-slate-700 last:border-0">
                                    <TableCell className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-10 w-10 ring-2 ring-primary/10 transition-transform hover:scale-105">
                                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-blue-500/20 text-primary text-sm font-black border border-primary/20">
                                                    {getInitials(manager.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-neutral-800 dark:text-neutral-100 text-[15px]">{manager.name}</span>
                                                <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-tighter">Account Manager</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-100 dark:border-blue-800/30">
                                            {manager.newReq}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-bold text-sm border border-purple-100 dark:border-purple-800/30">
                                            {manager.cfr}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center font-bold text-neutral-600 dark:text-neutral-300 text-sm">{manager.totalJobs}</TableCell>
                                    <TableCell className="px-4 py-4 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className={`text-sm font-black ${manager.submissionRate >= 70 ? 'text-emerald-500' : manager.submissionRate >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                {manager.submissionRate}%
                                            </span>
                                            <div className="w-20 h-2 bg-neutral-100 dark:bg-slate-700/50 rounded-full overflow-hidden p-[1px]">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${manager.submissionRate >= 70 ? 'bg-emerald-500' : manager.submissionRate >= 40 ? 'bg-amber-500' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`}
                                                    style={{ width: `${Math.min(manager.submissionRate, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-center">
                                        <span className="px-3 py-1.5 rounded-full bg-orange-500 text-white font-black text-xs shadow-lg shadow-orange-500/20 border border-orange-400/30">
                                            {manager.closure}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-40 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-neutral-400">
                                            <div className="p-3 rounded-full bg-neutral-50 dark:bg-slate-800/50">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                            </div>
                                            <span className="text-sm font-medium">No performance data found for the selected period</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {filteredData.length > 0 && (
                                <TableRow className="bg-neutral-50 dark:bg-slate-800/80 font-black border-t-2 border-primary/20">
                                    <TableCell className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                                <span className="text-xs font-black">ALL</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[16px] text-primary">Grand Total</span>
                                                <span className="text-[10px] uppercase tracking-widest opacity-60">Cumulative Performance</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-5 text-center">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-primary text-white font-black text-sm shadow-md shadow-primary/20">
                                            {totals.newReq}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-5 text-center">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-purple-600 text-white font-black text-sm shadow-md shadow-purple-500/20">
                                            {totals.cfr}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-5 text-center text-lg text-primary">{totals.totalJobs}</TableCell>
                                    <TableCell className="px-4 py-5 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-sm font-black text-primary">
                                                {totalSubmissionRate}%
                                            </span>
                                            <div className="w-20 h-2 bg-neutral-200 dark:bg-slate-700/50 rounded-full overflow-hidden p-[1px]">
                                                <div
                                                    className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
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

export default ManagerPerformanceTable;
