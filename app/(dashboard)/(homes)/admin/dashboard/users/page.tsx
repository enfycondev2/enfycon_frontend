"use client";

import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import CustomSelect from "@/components/shared/custom-select";
import UsersListTable from '@/components/table/users-list-table';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminUsersManagement = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("Status");
    const [activeTab, setActiveTab] = useState("ALL");

    return (
        <div className="min-h-screen pb-12">
            <DashboardBreadcrumb title="Users Management" text="Users Management" />

            {/* Page Header Area */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-2xl mb-1">
                        Team Directory
                    </h1>
                    <p className="text-neutral-500 dark:text-slate-400 max-w-2xl text-sm">
                        Manage your team's access and monitor real-time presence.
                    </p>
                </div>
            </div>

            <Card className="border-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden border border-white/20 dark:border-slate-800/50 transition-all duration-300">
                <CardHeader className="p-0 border-b border-neutral-100 dark:border-slate-800/60">
                    {/* Integrated Filter Bar */}
                    <div className="px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-b from-neutral-50/50 to-transparent dark:from-slate-800/30 dark:to-transparent">
                        
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative group">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    className="h-10 pl-10 pr-4 bg-white/50 dark:bg-slate-950/40 border border-neutral-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 w-full sm:w-[280px] transition-all placeholder:text-neutral-400 font-medium"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <CustomSelect
                                    placeholder="Status"
                                    options={["Status", "Active", "Inactive"]}
                                    onValueChange={(value) => setStatusFilter(value)}
                                    className="h-10 min-w-[120px] rounded-xl border-neutral-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40"
                                />
                                
                                <div className="h-10 px-4 py-2 bg-neutral-100 dark:bg-slate-800 rounded-xl flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 border border-transparent shadow-sm">
                                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mr-1">Limit:</span>
                                    <CustomSelect
                                        placeholder="10"
                                        options={["10", "20", "50", "100"]}
                                        className="h-6 border-0 bg-transparent p-0 min-w-[30px] shadow-none ring-0 focus:ring-0 text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="hidden lg:block">
                             <Button className="h-10 px-5 rounded-xl gap-2 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
                                <Plus className="w-4 h-4" />
                                <span>Invite Member</span>
                             </Button>
                        </div>
                    </div>

                    {/* Premium Tab Navigation */}
                    <div className="px-6 bg-white/30 dark:bg-slate-900/20 py-2">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="bg-neutral-100/50 dark:bg-slate-800/50 h-auto p-1 lg:p-1.5 flex gap-1 w-fit rounded-xl">
                                {[
                                    { label: "Overview", value: "ALL" },
                                    { label: "Admins", value: "ADMIN" },
                                    { label: "Production", value: "DELIVERY_HEAD" },
                                    { label: "Accounts", value: "ACCOUNT_MANAGER" },
                                    { label: "Sourcing", value: "RECRUITER" }
                                ].map((tab) => (
                                    <TabsTrigger
                                        key={tab.value}
                                        value={tab.value}
                                        className={cn(
                                            "relative px-4 py-2 rounded-lg bg-transparent data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm text-neutral-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest transition-all border-0 shadow-none ring-0 focus:ring-0"
                                        )}
                                    >
                                        {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="px-0 sm:px-6 py-6 overflow-x-auto">
                        <UsersListTable 
                            searchQuery={searchQuery} 
                            statusFilter={statusFilter} 
                            roleFilter={activeTab}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
export default AdminUsersManagement;
