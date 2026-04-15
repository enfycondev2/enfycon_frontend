"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  BriefcaseBusiness, 
  Building2, 
  Mail, 
  ChevronRight, 
  Search, 
  Plus, 
  Filter,
  UsersRound,
  Building
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface CrmClient {
  id: string;
  companyName: string;
  endClientName: string | null;
  clientType: 'DIRECT_CLIENT' | 'VENDOR';
  status: 'NEW_LEAD' | 'CONTACTED' | 'ACTIVE' | 'ON_HOLD' | 'INACTIVE';
  accountManagerId: string;
  accountManager?: {
    fullName: string | null;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  _count?: {
    contacts: number;
  };
}

interface CrmClientListProps {
  basePath: string; // /admin/dashboard/crm/clients or /account-manager/dashboard/crm/clients
  isAdminView?: boolean;
}

export default function CrmClientList({ basePath, isAdminView = false }: CrmClientListProps) {
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [accountManagerFilter, setAccountManagerFilter] = useState<string>("ALL");
  const [accountManagers, setAccountManagers] = useState<{ id: string, fullName: string }[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const search = params.get('search');
      if (search) setSearchQuery(search);
    }
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await apiClient("/crm/clients");
      if (!res.ok) throw new Error("Failed to fetch clients");
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    if (isAdminView) {
      const fetchAMs = async () => {
        try {
          const res = await apiClient("/auth/account-managers");
          if (res.ok) {
            const data = await res.json();
            setAccountManagers(data);
          }
        } catch (error) {
          console.error("Error fetching AMs:", error);
        }
      };
      fetchAMs();
    }
  }, [isAdminView]);

  const filteredClients = clients.filter((client) => {
    const matchesSearch = 
      !searchQuery || 
      client.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.endClientName?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === "ALL" || 
      client.status === statusFilter;

    const matchesAM = 
      accountManagerFilter === "ALL" ||
      client.accountManagerId === accountManagerFilter;

    return matchesSearch && matchesStatus && matchesAM;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', label: 'Active' };
      case 'NEW_LEAD':
        return { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'New Lead' };
      case 'CONTACTED':
        return { color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', label: 'Contacted' };
      case 'ON_HOLD':
        return { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'On Hold' };
      case 'INACTIVE':
        return { color: 'bg-slate-500/10 text-slate-600 border-slate-500/20', label: 'Inactive' };
      default:
        return { color: 'bg-slate-500/10 text-slate-600 border-slate-500/20', label: status };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-lg font-bold text-neutral-800 dark:text-white">Loading Relationship Hub</p>
          <p className="text-xs text-neutral-500 animate-pulse mt-0.5">Fetching client portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-neutral-100 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search company or end client..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl flex gap-2 text-xs font-bold uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5" />
                {statusFilter === 'ALL' ? 'All Statuses' : statusFilter.replace('_', ' ')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl min-w-[150px]">
              <DropdownMenuItem onClick={() => setStatusFilter('ALL')}>All Statuses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('NEW_LEAD')}>New Lead</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('CONTACTED')}>Contacted</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('ACTIVE')}>Active</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('ON_HOLD')}>On Hold</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('INACTIVE')}>Inactive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {isAdminView && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl flex gap-2 text-xs font-bold uppercase tracking-wider">
                  <UsersRound className="w-3.5 h-3.5" />
                  {accountManagerFilter === 'ALL' ? 'All AMs' : accountManagers.find(am => am.id === accountManagerFilter)?.fullName || 'Selected AM'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl min-w-[150px]">
                <DropdownMenuItem onClick={() => setAccountManagerFilter('ALL')}>All Account Managers</DropdownMenuItem>
                {accountManagers.map(am => (
                   <DropdownMenuItem key={am.id} onClick={() => setAccountManagerFilter(am.id)}>
                     {am.fullName}
                   </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Link href={`${basePath}/create`}>
            <Button className="rounded-xl flex gap-2 text-xs font-bold uppercase tracking-wider shadow-lg shadow-primary/20">
              <Plus className="w-3.5 h-3.5" />
              Add Client
            </Button>
          </Link>
        </div>
      </div>

      {filteredClients.length === 0 ? (
        <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-sm">
          <div className="w-16 h-16 bg-neutral-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-neutral-300" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white">No clients found</h3>
          <p className="text-neutral-500 max-w-sm mx-auto mt-2 text-sm">
            {searchQuery || statusFilter !== 'ALL' 
              ? "We couldn't find any clients matching your criteria. Try adjusting your filters."
              : "Start building your portfolio by adding your first client relationship."}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-neutral-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-neutral-50/50 dark:bg-slate-800/20 border-b border-neutral-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">Company & Type</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap text-center">Status</th>
                  {isAdminView && <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">Account Manager</th>}
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap text-center">Contacts</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">Created</th>
                  <th className="px-6 py-4 w-[60px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-800/60">
                {filteredClients.map((client) => {
                  const status = getStatusConfig(client.status);
                  return (
                    <tr 
                      key={client.id} 
                      className="group hover:bg-neutral-50/50 dark:hover:bg-slate-800/20 transition-all duration-200 cursor-pointer"
                      onClick={() => {
                        const currentRole = window.location.pathname.split('/')[1]; // Detect account_manager or account-manager
                        window.location.href = `/${currentRole}/dashboard/crm/clients/${client.id}`;
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-slate-800 flex items-center justify-center border border-white dark:border-slate-700 shadow-sm group-hover:scale-110 transition-transform duration-300">
                            {client.clientType === 'DIRECT_CLIENT' ? (
                              <Building2 className="w-5 h-5 text-primary/60" />
                            ) : (
                              <Building className="w-5 h-5 text-amber-500/60" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-neutral-900 dark:text-white text-sm leading-tight">
                              {client.companyName}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-tight",
                                client.clientType === 'DIRECT_CLIENT' ? "text-primary/70" : "text-amber-500/70"
                              )}>
                                {client.clientType.replace('_', ' ')}
                              </span>
                              {client.endClientName && (
                                <>
                                  <span className="text-neutral-300">•</span>
                                  <span className="text-[10px] font-medium text-neutral-400 truncate max-w-[150px]">
                                    End Client: {client.endClientName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap",
                            status.color
                          )}>
                            {status.label}
                          </span>
                        </div>
                      </td>

                      {isAdminView && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 max-w-[200px]">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <UsersRound className="w-3 h-3 text-primary" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-neutral-700 dark:text-slate-300 truncate">
                                    {client.accountManager?.fullName || 'Unassigned'}
                                </span>
                                <span className="text-[10px] text-neutral-400 truncate">
                                    {client.accountManager?.email}
                                </span>
                            </div>
                          </div>
                        </td>
                      )}

                      <td className="px-6 py-4 text-center text-sm font-bold text-neutral-600 dark:text-slate-400">
                        {client._count?.contacts || 0}
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-neutral-500">
                          {format(new Date(client.createdAt), "MMM dd, yyyy")}
                        </span>
                      </td>

                      <td className="px-6 py-4 flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronRight className="w-4 h-4 text-neutral-300" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
