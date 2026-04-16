"use client";

import React, { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { apiClient } from "@/lib/apiClient";
import { 
    BriefcaseBusiness, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    ExternalLink,
    Mail,
    User,
    Building2,
    ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatUsDate } from "@/lib/utils";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ClientDetailViewProps {
    clientName: string | null;
    onClose: () => void;
}

export default function ClientDetailView({ clientName, onClose }: ClientDetailViewProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!clientName) {
            setData(null);
            return;
        }

        const fetchDetail = async () => {
            setLoading(true);
            try {
                const res = await apiClient(`/crm/insights/${encodeURIComponent(clientName)}`);
                if (res.ok) {
                    const result = await res.json();
                    setData(result);
                }
            } catch (error) {
                console.error("Failed to fetch client detail", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [clientName]);

    if (!clientName) return null;

    // Helper to calculate percentage of total
    const getPercent = (val: number, total: number) => {
        if (total === 0) return 0;
        return ((val / total) * 100).toFixed(0);
    };

    return (
        <Sheet open={!!clientName} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="sm:max-w-xl overflow-y-auto bg-gray-50/50 p-0 border-l border-gray-100">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-sm font-bold text-gray-400 animate-pulse">Analysing Account Data...</p>
                    </div>
                ) : data ? (
                    <div className="space-y-0 h-full flex flex-col">
                        {/* Header Section */}
                        <div className="bg-white p-8 border-b border-gray-100 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                             <Building2 size={20} />
                                        </div>
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-blue-50/50 text-blue-700 border-blue-100">Client Profile</Badge>
                                    </div>
                                    <h2 className="text-3xl font-black tracking-tight text-gray-900">{data.clientName}</h2>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <User size={14} className="text-gray-400" />
                                            <span>AM: {data.crmClient?.accountManager?.fullName || "Unassigned"}</span>
                                        </div>
                                        <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                                        <div className="flex items-center gap-1.5">
                                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-100 text-[10px] py-0 px-2 uppercase font-bold">
                                                {data.crmClient?.status?.replace(/_/g, ' ') || "NOT ONBOARDED"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 pb-20">
                            
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Overall Jobs</span>
                                    <div className="flex items-baseline justify-between mt-1">
                                        <span className="text-2xl font-black text-gray-900">{data.stats.totalJobs}</span>
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{data.stats.activeJobs} Active</span>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Placements</span>
                                    <div className="flex items-baseline justify-between mt-1">
                                        <span className="text-2xl font-black text-emerald-600">{data.stats.placements}</span>
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                            {getPercent(data.stats.placements, data.stats.totalSubmissions)}% Yield
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Status Analysis Chart */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Performance Breakdown</h3>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Success</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Reject</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <Chart 
                                    options={{
                                        chart: { type: 'donut', toolbar: { show: false } },
                                        labels: ['Placements', 'Rejections', 'Other'],
                                        colors: ['#10b981', '#f87171', '#e2e8f0'],
                                        legend: { show: false },
                                        dataLabels: { enabled: false },
                                        plotOptions: {
                                            pie: {
                                                donut: {
                                                    size: '75%',
                                                    labels: {
                                                        show: true,
                                                        total: {
                                                            show: true,
                                                            label: 'Submissions',
                                                            formatter: () => data.stats.totalSubmissions
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }}
                                    series={[data.stats.placements, data.stats.rejections, data.stats.totalSubmissions - (data.stats.placements + data.stats.rejections)]}
                                    type="donut"
                                    height={220}
                                />
                            </div>

                            {/* Recent Jobs List */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pl-1">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Recent Job Posting Map</h3>
                                    <span className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer">View All Jobs</span>
                                </div>
                                
                                <div className="space-y-3">
                                    {data.recentJobs.map((job: any, index: number) => (
                                        <div key={index} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 transition-colors group">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">{job.jobCode}</span>
                                                        <span className="text-xs font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{job.jobTitle}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium">
                                                        <span className="flex items-center gap-1"><Clock size={10} /> {formatUsDate(job.createdAt)}</span>
                                                        <span>•</span>
                                                        <span>{job._count.recruiterSubmissions} Submissions</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <Badge variant="outline" className={job.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] py-0" : "bg-gray-50 text-gray-500 border-gray-200 text-[9px] py-0"}>
                                                        {job.status}
                                                    </Badge>
                                                    <div className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tighter">AM: {job.accountManager.fullName.split(' ')[0]}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {data.recentJobs.length === 0 && (
                                        <div className="py-12 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 italic text-gray-400 text-sm">
                                            No job history found for this entity.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-12 text-center text-gray-400 font-medium">Failed to load data. Please try again.</div>
                )}
            </SheetContent>
        </Sheet>
    );
}
