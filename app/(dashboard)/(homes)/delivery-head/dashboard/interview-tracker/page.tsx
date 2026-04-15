"use client";
import React from "react";
import InterviewTrackerTable from "@/components/dashboard/admin/InterviewTrackerTable";
import { ChartPie } from "lucide-react";

export default function DeliveryHeadInterviewTrackerPage() {
    return (
        <div className="flex flex-col gap-8 p-8 min-h-screen bg-transparent">
            {/* Header Section */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                             <ChartPie className="h-5 w-5" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Interview Tracker</h1>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                        Monitor candidate pipeline movement and interview schedules across the entire organization.
                    </p>
                </div>
            </div>

            {/* Main Tracker Table Component */}
            <InterviewTrackerTable />
        </div>
    );
}
