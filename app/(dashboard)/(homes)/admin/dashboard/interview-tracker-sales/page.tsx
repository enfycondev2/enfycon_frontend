"use client";
import React from "react";
import InterviewTrackerTable from "@/components/dashboard/admin/InterviewTrackerTable";
import { BriefcaseBusiness, ChartPie } from "lucide-react";

export default function InterviewTrackerSalesPage() {
    return (
        <div className="flex flex-col gap-8 p-8 min-h-screen bg-transparent">
            {/* Header Section */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                             <ChartPie className="h-5 w-5" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Interview Tracker (Sales)</h1>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                        Monitor candidate pipeline movement and interview schedules across all Account Managers.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2 overflow-hidden">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className={cn(
                                "inline-block h-8 w-8 rounded-full ring-2 ring-white",
                                i === 1 ? "bg-blue-500" : i === 2 ? "bg-green-500" : "bg-red-500"
                            )}>
                                <div className="h-full w-full flex items-center justify-center text-[10px] text-white font-bold uppercase">
                                    {i === 1 ? "P" : i === 2 ? "C" : "R"}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Tracker Table Component */}
            <InterviewTrackerTable />
        </div>
    );
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");
