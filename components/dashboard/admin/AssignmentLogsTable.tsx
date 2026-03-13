"use client";

import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { User, Briefcase, Boxes, Calendar } from "lucide-react";

interface AssignmentLog {
    id: string;
    jobId: string;
    job: {
        jobTitle: string;
        jobCode: string;
        accountManager: {
            fullName: string;
            email: string;
        };
    };
    previousPod: { 
        name: string;
        podHead?: { fullName: string };
    } | null;
    newPod: { 
        name: string;
        podHead?: { fullName: string };
    } | null;
    changedBy: {
        fullName: string;
        email: string;
    };
    changedAt: string;
}

interface AssignmentLogsTableProps {
    logs: AssignmentLog[];
}

export default function AssignmentLogsTable({ logs }: AssignmentLogsTableProps) {
    if (!logs || logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-neutral-200 dark:border-slate-700">
                <Boxes className="h-12 w-12 text-neutral-300 dark:text-slate-700 mb-4" />
                <p className="text-neutral-500 dark:text-neutral-400 font-medium text-lg">No assignment logs found.</p>
                <p className="text-neutral-400 dark:text-neutral-500 text-sm mt-1">Manual pod reassignment logs will appear here.</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-neutral-50 dark:bg-slate-800/50">
                        <TableRow className="hover:bg-transparent border-b border-neutral-200 dark:border-slate-700">
                            <TableHead className="font-semibold text-neutral-600 dark:text-neutral-400 py-4 px-6">Job Info</TableHead>
                            <TableHead className="font-semibold text-neutral-600 dark:text-neutral-400 py-4 px-6">Account Manager</TableHead>
                            <TableHead className="font-semibold text-neutral-600 dark:text-neutral-400 py-4 px-6">Assignment Change</TableHead>
                            <TableHead className="font-semibold text-neutral-600 dark:text-neutral-400 py-4 px-6">Changed By</TableHead>
                            <TableHead className="font-semibold text-neutral-600 dark:text-neutral-400 py-4 px-6">Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((log) => (
                            <TableRow key={log.id} className="group border-b border-neutral-100 dark:border-slate-800 hover:bg-neutral-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <TableCell className="py-4 px-6">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-2 rounded-lg bg-primary/5 text-primary border border-primary/10">
                                            <Briefcase className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate capitalize">
                                                {log.job.jobTitle.toLowerCase()}
                                            </p>
                                            <code className="text-[10px] font-mono bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-neutral-500 border border-neutral-200 dark:border-slate-700 mt-1 inline-block">
                                                {log.job.jobCode}
                                            </code>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 px-6 font-medium text-neutral-700 dark:text-neutral-300">
                                    <div className="flex flex-col">
                                        <span className="text-sm">{log.job.accountManager.fullName}</span>
                                        <span className="text-[10px] text-neutral-400">{log.job.accountManager.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-center gap-1 min-w-[80px]">
                                            {log.previousPod ? (
                                                <>
                                                    <Badge variant="outline" className="bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-slate-700 text-[10px] px-2 py-0">
                                                        {log.previousPod.name}
                                                    </Badge>
                                                    <span className="text-[9px] text-neutral-400 font-medium whitespace-nowrap">
                                                        {log.previousPod.podHead?.fullName || "No Head"}
                                                    </span>
                                                </>
                                            ) : (
                                                <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30 text-[10px] px-2 py-0">
                                                    Initial
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        <span className="text-neutral-300 font-mono text-lg">→</span>
                                        
                                        <div className="flex flex-col items-center gap-1 min-w-[80px]">
                                            {log.newPod ? (
                                                <>
                                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold px-2 py-0">
                                                        {log.newPod.name}
                                                    </Badge>
                                                    <span className="text-[9px] text-primary/70 font-medium whitespace-nowrap">
                                                        {log.newPod.podHead?.fullName || "No Head"}
                                                    </span>
                                                </>
                                            ) : (
                                                <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/30 text-[10px] px-2 py-0">
                                                    Removed
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                    <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-neutral-500">
                                            {log.changedBy.fullName[0]}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                {log.changedBy.fullName}
                                            </span>
                                            <span className="text-[10px] text-neutral-400">
                                                {log.changedBy.email}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 px-6 text-sm text-neutral-600 dark:text-neutral-400">
                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                        <Calendar className="h-3.5 w-3.5 opacity-50" />
                                        {format(new Date(log.changedAt), "MMM d, h:mm a")}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
