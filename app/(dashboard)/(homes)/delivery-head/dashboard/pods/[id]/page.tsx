import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Users, User, Briefcase, Mail, MapPin, Calendar, Clock, CheckCircle2, CircleDashed, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Dummy data for demonstration
const dummyPodData = {
    id: "pod-123",
    name: "Engineering Alpha Pod",
    lead: {
        fullName: "Sarah Montgomery",
        email: "sarah.m@enfysync.com",
        location: "New York, USA",
        joinedDate: "Jan 12, 2024",
    },
    recruiters: [
        {
            id: "rec-1",
            fullName: "James Wilson",
            email: "james.w@enfysync.com",
            assignedJobs: [
                { id: "job-1", title: "Senior Frontend Engineer", client: "TechFlow Solutions", status: "OPEN", priority: "High" },
                { id: "job-2", title: "Full Stack Developer", client: "InnoSoft Systems", status: "IN_PROGRESS", priority: "Medium" }
            ]
        },
        {
            id: "rec-2",
            fullName: "Emily Chen",
            email: "emily.c@enfysync.com",
            assignedJobs: [
                { id: "job-3", title: "UX/UI Designer", client: "Creative Labs", status: "IN_PROGRESS", priority: "High" },
                { id: "job-4", title: "Product Manager", client: "Global Trade Co", status: "CLOSED", priority: "Low" },
                { id: "job-5", title: "Cloud Architect", client: "SkyNet Services", status: "OPEN", priority: "Critical" }
            ]
        },
        {
            id: "rec-3",
            fullName: "Michael O'Connor",
            email: "michael.o@enfysync.com",
            assignedJobs: [
                { id: "job-6", title: "Data Scientist", client: "Insight Analytics", status: "OPEN", priority: "Medium" }
            ]
        }
    ]
};

const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
        case 'OPEN':
            return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200/50">Open</Badge>;
        case 'IN_PROGRESS':
            return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-200/50">In Progress</Badge>;
        case 'CLOSED':
            return <Badge className="bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 border-slate-200/50">Closed</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
};

const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
        case 'CRITICAL': return 'text-rose-600';
        case 'HIGH': return 'text-orange-600';
        case 'MEDIUM': return 'text-blue-600';
        default: return 'text-slate-600';
    }
};

export default function PodDetailsPage({ params }: { params: { id: string } }) {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
            <DashboardBreadcrumb title={`Pod: ${dummyPodData.name}`} text="Pod Management" />

            <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header Section with Pod Lead */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Pod Overview
                            </CardTitle>
                            <Badge variant="outline" className="font-mono text-xs opacity-60">ID: {params.id}</Badge>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight group-hover:text-primary transition-colors">
                                {dummyPodData.name}
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recruiters</p>
                                    <p className="text-2xl font-bold">{dummyPodData.recruiters.length}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Jobs</p>
                                    <p className="text-2xl font-bold">{dummyPodData.recruiters.reduce((acc, r) => acc + r.assignedJobs.filter(j => j.status !== 'CLOSED').length, 0)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completion Rate</p>
                                    <p className="text-2xl font-bold">68%</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg. Time to Fill</p>
                                    <p className="text-2xl font-bold">14d</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                Pod Lead
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center text-center space-y-4 py-2">
                                <Avatar className="h-20 w-20 border-2 border-primary/10 p-0.5">
                                    <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold">
                                        {dummyPodData.lead?.fullName?.split(' ').map(n => n[0]).join('') || "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                                        {dummyPodData.lead?.fullName || "No Head Assigned"}
                                    </h3>
                                    <div className="flex items-center justify-center gap-1.5 text-sm text-slate-500">
                                        <Mail className="h-3.5 w-3.5" />
                                        {dummyPodData.lead.email}
                                    </div>
                                </div>
                                <div className="w-full pt-4 space-y-2 text-left">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400 flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Location</span>
                                        <span className="font-medium">{dummyPodData.lead.location}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400 flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Joined</span>
                                        <span className="font-medium">{dummyPodData.lead.joinedDate}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recruiters List Section */}
                <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Assigned Recruiters
                            </CardTitle>
                            <span className="text-sm font-medium text-slate-500">{dummyPodData.recruiters.length} Team Members</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-slate-100 dark:divide-slate-800">
                            {dummyPodData.recruiters.map((recruiter) => (
                                <div key={recruiter.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <div className="flex items-start gap-4 mb-4">
                                        <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-700">
                                            <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-xs font-bold">
                                                {recruiter.fullName.split(' ').map(n => n[0]).join('')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                                {recruiter.fullName}
                                            </h4>
                                            <p className="text-xs text-slate-500 truncate w-full max-w-[150px]">{recruiter.email}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-auto">
                                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-2.5 shadow-sm">
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Active Jobs</span>
                                            <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                                {recruiter.assignedJobs.filter(j => j.status !== 'CLOSED').length}
                                            </span>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-2.5 shadow-sm">
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Success Rate</span>
                                            <span className="text-lg font-bold text-slate-800 dark:text-slate-200">82%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Job Details per Recruiter Table */}
                <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-primary" />
                            Assigned Job Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="font-bold text-slate-800 dark:text-slate-200 h-12">Recruiter</TableHead>
                                        <TableHead className="font-bold text-slate-800 dark:text-slate-200 h-12">Job Title</TableHead>
                                        <TableHead className="font-bold text-slate-800 dark:text-slate-200 h-12">Client</TableHead>
                                        <TableHead className="font-bold text-slate-800 dark:text-slate-200 h-12">Priority</TableHead>
                                        <TableHead className="font-bold text-slate-800 dark:text-slate-200 h-12">Status</TableHead>
                                        <TableHead className="text-right font-bold text-slate-800 dark:text-slate-200 h-12">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dummyPodData.recruiters.flatMap(recruiter =>
                                        recruiter.assignedJobs.map((job, index) => (
                                            <TableRow key={job.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-slate-100 dark:border-slate-800">
                                                <TableCell className="font-medium align-top py-4">
                                                    {index === 0 ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2 w-2 rounded-full bg-primary" />
                                                            <span className="font-bold">{recruiter.fullName}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-slate-700 ml-4">↳</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 dark:text-white">{job.title}</span>
                                                        <span className="text-xs text-slate-400 font-mono">#{job.id}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 font-medium">{job.client}</TableCell>
                                                <TableCell className="py-4">
                                                    <div className={`flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider ${getPriorityColor(job.priority)}`}>
                                                        {job.priority === 'Critical' && <AlertCircle className="h-3 w-3" />}
                                                        {job.priority}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">{getStatusBadge(job.status)}</TableCell>
                                                <TableCell className="text-right py-4">
                                                    <button className="text-xs font-bold text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                                                        View Details
                                                    </button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Premium Touch: Background Patterns */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -ml-64 -mb-64" />
            </div>
        </div>
    );
}
