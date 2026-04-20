"use client";

import React, { useState, useEffect } from "react";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    BriefcaseBusiness, 
    FileText, 
    UsersRound, 
    CheckCircle2, 
    TrendingUp, 
    ChevronRight,
    Search,
    Calendar as CalendarIcon,
    FilterX
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import ClientDetailView from "./components/client-detail-view";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ClientInsight {
    name: string;
    crmId: string | null;
    amName: string;
    jobs: number;
    submissions: number;
    placements: number;
    status: string;
}

export default function ClientInsightsPage() {
    const [loading, setLoading] = useState(true);
    const [insights, setInsights] = useState<ClientInsight[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedAM, setSelectedAM] = useState<string>("all_managers");
    const [ams, setAms] = useState<{ id: string, fullName: string }[]>([]);
    const [selectedClient, setSelectedClient] = useState<string | null>(null);

    const fetchAMs = async () => {
        try {
            const res = await apiClient("/auth/account-managers");
            if (res.ok) {
                const data = await res.json();
                setAms(data);
            }
        } catch (error) {
            console.error("Failed to fetch AMs", error);
        }
    };

    const fetchInsights = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);
            if (selectedAM !== "all_managers") params.append("accountManagerId", selectedAM);
            
            const res = await apiClient(`/crm/insights?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setInsights(data);
            }
        } catch (error) {
            toast.error("Failed to load insights");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAMs();
    }, []);

    useEffect(() => {
        fetchInsights();
    }, [startDate, endDate, selectedAM]);

    const filteredInsights = insights.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.amName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totals = {
        jobs: insights.reduce((acc, curr) => acc + curr.jobs, 0),
        submissions: insights.reduce((acc, curr) => acc + curr.submissions, 0),
        placements: insights.reduce((acc, curr) => acc + curr.placements, 0),
        clients: insights.length
    };

    const conversionRate = totals.jobs > 0 ? ((totals.placements / totals.jobs) * 100).toFixed(1) : "0";

    // Chart Data
    const topClients = [...insights].sort((a, b) => b.jobs - a.jobs).slice(0, 5);
    const chartOptions: any = {
        chart: { 
            type: 'bar', 
            toolbar: { show: false },
            fontFamily: 'Inter, sans-serif'
        },
        plotOptions: { 
            bar: { 
                borderRadius: 6, 
                horizontal: true,
                barHeight: '60%',
                distributed: true,
                dataLabels: {
                    position: 'top',
                },
            } 
        },
        colors: ['#3b82f6', '#4f46e5', '#8b5cf6', '#ec4899', '#f97316'],
        dataLabels: { 
            enabled: true,
            offsetX: 30,
            style: {
                fontSize: '12px',
                colors: ['#64748b'],
                fontWeight: 700
            },
            formatter: (val: any) => val + " Jobs"
        },
        grid: {
            show: false,
        },
        xaxis: { 
            categories: topClients.map(c => c.name),
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                style: {
                    fontSize: '13px',
                    fontWeight: 600,
                    colors: '#1e293b'
                }
            }
        },
        tooltip: {
            theme: 'light',
            y: {
                title: {
                    formatter: () => 'Active Volume: '
                }
            }
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'light',
                type: "horizontal",
                shadeIntensity: 0.25,
                gradientToColors: undefined,
                inverseColors: true,
                opacityFrom: 0.85,
                opacityTo: 0.95,
                stops: [50, 0, 100]
            },
        },
        title: { 
            text: 'Top Performer Leaderboard', 
            align: 'left',
            style: {
                fontSize: '16px',
                fontWeight: 800,
                color: '#0f172a'
            }
        }
    };
    const chartSeries = [{ name: 'Jobs', data: topClients.map(c => c.jobs) }];

    return (
        <>
            <DashboardBreadcrumb title="Client Insights" text="Admin CRM Reports" />
            
            <div className="p-6 space-y-6">
                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input 
                                placeholder="Search client reach..." 
                                className="pl-9 bg-gray-50/50 border-none focus-visible:ring-1 focus-visible:ring-blue-100 h-10" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                             <Select value={selectedAM} onValueChange={setSelectedAM}>
                                <SelectTrigger className="w-[200px] bg-gray-50/50 border-none h-10 font-medium">
                                    <SelectValue placeholder="Account Manager" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="all_managers">All Managers</SelectItem>
                                    {ams.map(am => (
                                        <SelectItem key={am.id} value={am.id}>{am.fullName}</SelectItem>
                                    ))}
                                </SelectContent>
                             </Select>

                             <div className="h-6 w-[1px] bg-gray-200 mx-1"></div>

                             <Input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)} 
                                className="w-36 bg-gray-50/50 border-none h-10"
                             />
                             <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">TO</span>
                             <Input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)} 
                                className="w-36 bg-gray-50/50 border-none h-10"
                             />
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="hover:bg-red-50 hover:text-red-500 rounded-full" 
                                onClick={() => { setStartDate(""); setEndDate(""); setSelectedAM("all_managers"); }}
                                title="Reset all filters"
                             >
                                <FilterX className="h-4 w-4" />
                             </Button>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-none shadow-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white overflow-hidden group">
                        <CardContent className="p-6 relative">
                             <div className="absolute -right-4 -bottom-4 bg-white/10 p-8 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">Job Pipeline</p>
                                    <h3 className="text-3xl font-black mt-1">{totals.jobs}</h3>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                                    <BriefcaseBusiness size={24} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-gradient-to-br from-purple-600 to-purple-700 text-white overflow-hidden group">
                        <CardContent className="p-6 relative">
                            <div className="absolute -right-4 -bottom-4 bg-white/10 p-8 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <p className="text-purple-100 text-[10px] font-bold uppercase tracking-widest">Reach Index</p>
                                    <h3 className="text-3xl font-black mt-1">{totals.submissions}</h3>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                                    <FileText size={24} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-600 to-emerald-700 text-white overflow-hidden group">
                        <CardContent className="p-6 relative">
                            <div className="absolute -right-4 -bottom-4 bg-white/10 p-8 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest">Success Rate</p>
                                    <h3 className="text-3xl font-black mt-1">{totals.placements}</h3>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                                    <CheckCircle2 size={24} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden group">
                        <CardContent className="p-6 relative">
                            <div className="absolute -right-4 -bottom-4 bg-white/10 p-8 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <p className="text-orange-100 text-[10px] font-bold uppercase tracking-widest">Conversion</p>
                                    <h3 className="text-3xl font-black mt-1">{conversionRate}%</h3>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                                    <TrendingUp size={24} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts & Table */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <Card className="xl:col-span-1 border-gray-100 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Volume Leaderboard</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="h-64 flex items-center justify-center">Loading Chart...</div>
                            ) : (
                                <Chart 
                                    options={chartOptions} 
                                    series={chartSeries} 
                                    type="bar" 
                                    height={300} 
                                />
                            )}
                        </CardContent>
                    </Card>

                    <Card className="xl:col-span-2 border-gray-100 shadow-sm overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-bold">Client Performance Breakdown</CardTitle>
                            <Badge variant="outline">{totals.clients} Clients Total</Badge>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow>
                                        <TableHead className="font-bold text-xs">Client Name</TableHead>
                                        <TableHead className="font-bold text-xs">Sales Manager</TableHead>
                                        <TableHead className="font-bold text-xs text-center">Jobs</TableHead>
                                        <TableHead className="font-bold text-xs text-center">Submissions</TableHead>
                                        <TableHead className="font-bold text-xs text-center">Placements</TableHead>
                                        <TableHead className="font-bold text-xs text-right pr-6">Efficiency</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell colSpan={6} className="h-12 animate-pulse bg-gray-50/50" />
                                            </TableRow>
                                        ))
                                    ) : filteredInsights.map((insight, idx) => {
                                        const efficiency = insight.jobs > 0 ? ((insight.placements / insight.jobs) * 100).toFixed(1) : "0";
                                        return (
                                            <TableRow 
                                                key={idx} 
                                                className="cursor-pointer hover:bg-blue-50/30 group transition-colors"
                                                onClick={() => setSelectedClient(insight.name)}
                                            >
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                            {insight.name}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500">{insight.status.replace(/_/g, ' ')}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-[13px] font-medium text-gray-600">{insight.amName}</TableCell>
                                                <TableCell className="text-center font-bold text-gray-900">{insight.jobs}</TableCell>
                                                <TableCell className="text-center text-gray-600">{insight.submissions}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={insight.placements > 0 ? "default" : "secondary"} className={insight.placements > 0 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2" : ""}>
                                                        {insight.placements}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="text-xs font-bold text-blue-600">{efficiency}%</span>
                                                        <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Drill-down Detail View */}
            <ClientDetailView 
                clientName={selectedClient} 
                onClose={() => setSelectedClient(null)} 
            />
        </>
    );
}
