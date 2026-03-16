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
import { parseISO, isValid } from "date-fns";
import { UserCheck } from "lucide-react";

interface RecruiterPerformanceTableProps {
    jobs: any[];
    submissions: any[];
}

const RecruiterPerformanceTable = ({ jobs, submissions }: RecruiterPerformanceTableProps) => {
    const [filter, setFilter] = useState("all");

    const filteredData = useMemo(() => {
        const recruiters: Record<string, any> = {};

        // EST Timezone Helpers
        const getESTPart = (date: Date, part: 'year' | 'month' | 'day' | 'week') => {
            if (!date || !isValid(date)) return "N/A";

            if (part === 'week') {
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
        const normalizeStatus = (status?: string) => (status || "").trim().toUpperCase();

        const isInSelectedRange = (date: Date) => {
            const year = getESTPart(date, 'year');
            const month = getESTPart(date, 'month');
            const day = getESTPart(date, 'day');
            const week = getESTPart(date, 'week');

            if (filter === "all") return true;
            if (filter === "today") return year === currentYear && month === currentMonth && day === currentDay;
            if (filter === "week") return year === currentYear && week === currentWeek;
            if (filter === "month") return year === currentYear && month === currentMonth;
            if (filter === "year") return year === currentYear;
            return false;
        };

        jobs.forEach((job) => {
            if (!job || !job.createdAt) return;

            const createdAt = parseISO(job.createdAt);

            if (!isValid(createdAt)) return;
            const isInRange = isInSelectedRange(createdAt);

            const assignedRecruiters = job.assignedRecruiters || [];
            if (assignedRecruiters.length === 0) return;

            assignedRecruiters.forEach((recruiter: any) => {
                if (!recruiter || !recruiter.id) return;

                if (!recruiters[recruiter.id]) {
                    recruiters[recruiter.id] = {
                        name: recruiter.fullName || recruiter.email?.split('@')[0] || "Unknown",
                        email: recruiter.email,
                        newReq: 0,
                        cfr: 0,
                        totalJobs: 0,
                        totalPositions: 0,
                        submissionDone: 0,
                        submissionRequired: 0,
                        totalSubmissions: 0,
                        closure: 0,
                    };
                }

                const r = recruiters[recruiter.id];

                if (isInRange) {
                    r.newReq += 1;
                    r.totalJobs += 1;
                    r.totalPositions += job.noOfPositions || job.positions || 1;
                    if (job.requirementType === "CFR" || job.requirementType === "CFR_EXTENDED") {
                        r.cfr += 1;
                    }
                    // Note: submissionDone/Required on Job are aggregates for all recruiters.
                    // For a true individual recruiter performance, we might need to filter submissions by recruiterId.
                    // However, to keep it consistent with the existing dashboard metrics which rely on the jobs array:
                    // we allocate the job's target/done to each assigned recruiter.
                    r.submissionDone += job.submissionDone || 0;
                    r.submissionRequired += job.submissionRequired || 0;
                    r.totalSubmissions += job.submissionDone || 0;
                }

            });
        });

        submissions.forEach((submission) => {
            if (!submission) return;
            if (normalizeStatus(submission.finalStatus) !== "JOIN") return;

            const closureAtRaw = submission.createdAt || submission.submissionDate;
            if (!closureAtRaw) return;

            const closureAt = parseISO(closureAtRaw);
            if (!isValid(closureAt) || !isInSelectedRange(closureAt)) return;

            const recruiterKey = submission.recruiter?.id || submission.recruiterId;
            if (!recruiterKey) return;

            if (!recruiters[recruiterKey]) {
                recruiters[recruiterKey] = {
                    name:
                        submission.recruiter?.fullName ||
                        submission.recruiter?.email?.split("@")[0] ||
                        "Unknown",
                    email: submission.recruiter?.email,
                    newReq: 0,
                    cfr: 0,
                    totalJobs: 0,
                    totalPositions: 0,
                    submissionDone: 0,
                    submissionRequired: 0,
                    totalSubmissions: 0,
                    closure: 0,
                };
            }

            recruiters[recruiterKey].closure += 1;
        });

        return Object.values(recruiters).map((r: any) => ({
            ...r,
            submissionRate: r.submissionRequired > 0
                ? Math.round((r.submissionDone / r.submissionRequired) * 100)
                : 0
        })).sort((a, b) => b.totalSubmissions - a.totalSubmissions);
    }, [jobs, submissions, filter]);

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
            acc.totalPositions += current.totalPositions;
            acc.submissionDone += current.submissionDone;
            acc.submissionRequired += current.submissionRequired;
            acc.totalSubmissions += current.totalSubmissions;
            acc.closure += current.closure;
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
                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                        Recruiter Performance
                    </CardTitle>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Individual recruiter submission activity and closure tracking</p>
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
                                <TableHead className="px-6 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider border-r border-neutral-200 dark:border-slate-600">Recruiter</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600">Jobs</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600">CFR</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600">Positions</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600">Sub Req</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600">Sub Done</TableHead>
                                <TableHead className="px-4 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center border-r border-neutral-200 dark:border-slate-600">Sub Rate</TableHead>
                                <TableHead className="px-6 py-4 font-bold text-neutral-700 dark:text-neutral-200 uppercase text-xs tracking-wider text-center">Closure</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length > 0 ? filteredData.map((recruiter, index) => (
                                <TableRow key={index} className="hover:bg-primary/[0.02] dark:hover:bg-primary/[0.05] transition-all duration-200 border-b border-neutral-100 dark:border-slate-700 last:border-0 even:bg-neutral-50/50 dark:even:bg-slate-800/20">
                                    <TableCell className="px-6 py-4 border-r border-neutral-100 dark:border-slate-700/50">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-10 w-10 ring-2 ring-primary/10 transition-transform hover:scale-105">
                                                <AvatarFallback className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-orange-600 dark:text-orange-400 text-sm font-black border border-orange-500/20">
                                                    {getInitials(recruiter.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-neutral-800 dark:text-neutral-100 text-[15px]">{recruiter.name}</span>
                                                <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-tight">Assigned Recruiter</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center border-r border-neutral-100 dark:border-slate-700/50 font-bold text-neutral-600 dark:text-neutral-300 text-sm">
                                        {recruiter.totalJobs}
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-bold text-sm border border-orange-100 dark:border-orange-800/30">
                                            {recruiter.cfr}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center border-r border-neutral-100 dark:border-slate-700/50 font-bold text-neutral-600 dark:text-neutral-300 text-sm">
                                        {recruiter.totalPositions}
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold text-sm border border-amber-100 dark:border-amber-800/30">
                                            {recruiter.submissionRequired}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm border border-emerald-100 dark:border-emerald-800/30">
                                            {recruiter.totalSubmissions}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center border-r border-neutral-100 dark:border-slate-700/50">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className={`text-sm font-black ${recruiter.submissionRate >= 70 ? 'text-emerald-500' : recruiter.submissionRate >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                {recruiter.submissionRate}%
                                            </span>
                                            <div className="w-20 h-2 bg-neutral-100 dark:bg-slate-700/50 rounded-full overflow-hidden p-[1px]">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${recruiter.submissionRate >= 70 ? 'bg-emerald-500' : recruiter.submissionRate >= 40 ? 'bg-amber-500' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`}
                                                    style={{ width: `${Math.min(recruiter.submissionRate, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-center">
                                        <span className="px-3 py-1.5 rounded-full bg-orange-600 text-white font-black text-xs shadow-lg shadow-orange-600/20 border border-orange-500/30">
                                            {recruiter.closure}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-40 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-neutral-400">
                                            <div className="p-3 rounded-full bg-neutral-50 dark:bg-slate-800/50">
                                                <UserCheck className="h-6 w-6" />
                                            </div>
                                            <span className="text-sm font-medium">No recruiter performance data found</span>
                                        </div>
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

export default RecruiterPerformanceTable;
