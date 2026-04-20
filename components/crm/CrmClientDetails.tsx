"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { 
  Building2, 
  Users, 
  History, 
  Info, 
  Plus, 
  Phone, 
  Mail, 
  ExternalLink,
  MapPin,
  Calendar,
  MoreVertical,
  Activity,
  UserPlus,
  Settings,
  ArrowLeft,
  Edit2
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import AddContactModal from "./modals/AddContactModal";
import LogActivityModal from "./modals/LogActivityModal";
import EditCrmClientModal from "./modals/EditCrmClientModal";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Activity {
  id: string;
  type: 'CALL' | 'EMAIL' | 'NOTE' | 'MEETING';
  title: string;
  description: string | null;
  activityDate: string;
  createdAt: string;
}

interface Contact {
  id: string;
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  isActive: boolean;
  remarks: string | null;
  createdAt: string;
}

interface CrmClient {
  id: string;
  companyName: string;
  endClientName: string | null;
  clientType: 'DIRECT_CLIENT' | 'VENDOR';
  status: 'NEW_LEAD' | 'CONTACTED' | 'ACTIVE' | 'ON_HOLD' | 'INACTIVE';
  industry: string | null;
  website: string | null;
  companySize: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  onboardingDate: string;
  lastContactedDate: string | null;
  nextFollowUpDate: string | null;
  remarks: string | null;
  accountManager: {
    fullName: string | null;
    email: string;
  };
  accountManagerId: string;
  contacts: Contact[];
  activities: Activity[];
}

export default function CrmClientDetails() {
  const { id } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const [client, setClient] = useState<CrmClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<{ id: string, roles: string[] } | null>(null);

  const editPath = useMemo(() => {
    if (pathname?.includes("/admin")) return `/admin/dashboard/crm/clients/onboard/${id}`;
    return `/account-manager/dashboard/crm/clients/onboard/${id}`;
  }, [pathname, id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await apiClient(`/crm/clients/${id}`);
      if (!res.ok) throw new Error("Failed to fetch client details");
      const data = await res.json();
      setClient(data);
    } catch (error) {
      console.error(error);
      toast.error("Could not load client profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await apiClient("/auth/me");
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
    if (id) fetchDetails();
  }, [id]);

  const canEdit = useMemo(() => {
    if (!currentUser || !client) return false;
    const isAdmin = currentUser.roles.includes("ADMIN") || currentUser.roles.includes("DELIVERY_HEAD");
    const isAssignedAM = client.accountManagerId === currentUser.id;
    return isAdmin || isAssignedAM;
  }, [currentUser, client]);

  const contacts = useMemo(() => {
    if (!client?.contacts) return [];
    return [...client.contacts].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [client?.contacts]);


  if (loading) return <CrmDetailsSkeleton />;
  if (!client) return <div className="p-12 text-center font-bold">Client not found.</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-5">
           <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-xl h-10 w-10 border border-neutral-100 dark:border-slate-800"
            onClick={() => router.back()}
           >
              <ArrowLeft className="w-5 h-5" />
           </Button>
           <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Building2 className="w-8 h-8" />
           </div>
           <div>
              <div className="flex items-center gap-3">
                 <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                    {client.companyName}
                 </h1>
                 <Badge variant="outline" className={cn(
                   "uppercase text-[10px] font-bold tracking-widest",
                   client.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-neutral-500/10 text-neutral-600 border-neutral-500/20"
                 )}>
                   {client.status.replace('_', ' ')}
                 </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 font-medium text-sm text-neutral-500">
                  <span className="flex items-center gap-1.5 uppercase text-[10px] tracking-tight font-bold text-primary/70">
                    {client.clientType.replace('_', ' ')}
                 </span>
                 {client.website && (
                    <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" className="flex items-center gap-1 text-blue-500 hover:underline">
                       <ExternalLink className="w-3 h-3" />
                       Visit Website
                    </a>
                 )}
                 {(client.city || client.state) && (
                   <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {client.city}{client.city && client.state ? ', ' : ''}{client.state}
                   </span>
                 )}
              </div>
           </div>
        </div>
         <div className="flex gap-2 shrink-0">
           {canEdit && (
             <Select 
              value={client.status} 
              onValueChange={async (newStatus) => {
                try {
                  const res = await apiClient(`/crm/clients/${id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: newStatus }),
                  });
                  if (!res.ok) throw new Error("Failed to update status");
                  toast.success("Relationship status updated");
                  fetchDetails();
                } catch (error: any) {
                  toast.error(error.message);
                }
              }}
             >
                <SelectTrigger className="w-[140px] rounded-xl h-10 border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-[10px] uppercase tracking-widest">
                  <SelectValue placeholder="Update Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="NEW_LEAD">New Lead</SelectItem>
                  <SelectItem value="CONTACTED">Contacted</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
             </Select>
           )}

           {canEdit && (
             <Button 
               variant="outline"
               className="rounded-xl h-10 border-neutral-200 dark:border-slate-800 font-bold text-[10px] uppercase tracking-widest flex gap-2"
               onClick={() => router.push(editPath)}
             >
                <Settings className="w-4 h-4" />
                Edit Profile
             </Button>
           )}

           <Button 
            className="rounded-xl shadow-lg shadow-primary/20 flex gap-2 h-10 font-bold text-[10px] uppercase tracking-widest"
            onClick={() => setIsActivityModalOpen(true)}
           >
              <Plus className="w-4 h-4" />
              Log Interaction
           </Button>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
         <SummaryCard 
            title="Total POC History" 
            value={`${client.contacts.length} / 10`} 
            subtitle="Maximum capacity"
            icon={<Users className="w-5 h-5 text-blue-500" />} 
          />
         <SummaryCard 
            title="Recent Activity" 
            value={String(client.activities.length)} 
            subtitle="Lifetime interactions"
            icon={<Activity className="w-5 h-5 text-purple-500" />} 
          />
         <SummaryCard 
            title="Next Follow-up" 
            value={safeFormat(client.nextFollowUpDate, "MMM dd, yyyy", "Not Set")} 
            subtitle="Growth reminder"
            icon={<Calendar className="w-5 h-5 text-amber-500" />} 
          />
      </div>

      {/* Main Tabs Segment */}
      <Card className="border border-neutral-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
        <Tabs defaultValue="overview" className="w-full">
           <CardHeader className="bg-neutral-50/50 dark:bg-slate-800/20 border-b border-neutral-100 dark:border-slate-800 px-0 py-0">
              <TabsList className="bg-transparent h-auto p-0 flex px-6">
                 <TabsTrigger value="overview" className="tab-premium">Overview</TabsTrigger>
                 <TabsTrigger value="contacts" className="tab-premium">POC History</TabsTrigger>
                 <TabsTrigger value="activity" className="tab-premium">Activity Feed</TabsTrigger>
              </TabsList>
           </CardHeader>
           
           <CardContent className="p-6">
              <TabsContent value="overview">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <div className="flex justify-between items-center group/section">
                          <Section title="Business Profile">
                             <DetailItem label="Industry" value={client.industry} />
                             <DetailItem label="Size" value={client.companySize} />
                             <DetailItem label="Onboarded On" value={safeFormat(client.onboardingDate, "PPP")} />
                          </Section>
                          {canEdit && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg text-neutral-400 hover:text-primary hover:bg-primary/10 transition-all opacity-0 group-hover/section:opacity-100"
                              onClick={() => router.push(editPath)}
                              title="Edit Business Profile (Comprehensive)"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                       </div>

                       <Section title="Assigned Account Manager">
                          <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-slate-800/50 rounded-2xl border border-neutral-100 dark:border-slate-800">
                             <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                {client.accountManager.fullName?.substring(0,2)}
                             </div>
                             <div>
                                <p className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-tight">
                                   {client.accountManager.fullName}
                                </p>
                                <p className="text-xs text-neutral-500">{client.accountManager.email}</p>
                             </div>
                          </div>
                       </Section>

                       {canEdit && (
                         <div className="flex flex-col gap-2 pt-2">
                            <Button 
                              variant="outline" 
                              className="w-full justify-start gap-2 rounded-xl border-dashed border-primary/30 dark:border-primary/20 h-11 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/5 transition-all shadow-sm"
                              onClick={() => router.push(editPath)}
                            >
                               <Settings className="w-4 h-4" />
                               Rectify / Complete Company Profile
                            </Button>
                            <Button 
                              variant="outline" 
                              className="w-full justify-start gap-2 rounded-xl border-dashed border-neutral-300 dark:border-slate-700 h-11 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-primary hover:border-primary/50 transition-all"
                              onClick={() => setIsContactModalOpen(true)}
                            >
                               <UserPlus className="w-4 h-4" />
                               Add Primary Point of Contact
                            </Button>
                         </div>
                       )}
                    </div>
                    <div>
                       <div className="flex justify-between items-center group/remarks">
                          <Section title="Key Remarks & Notes" />
                          {canEdit && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg text-neutral-400 hover:text-primary hover:bg-primary/10 transition-all opacity-0 group-hover/remarks:opacity-100"
                              onClick={() => setIsActivityModalOpen(true)}
                              title="Log Activity/Note"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                       </div>
                       <div className="mt-2 p-4 bg-amber-50/30 dark:bg-amber-500/5 rounded-2xl border border-amber-500/10 min-h-[150px] text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed italic">
                          {client.remarks || "No high-level remarks provided for this client profile. Log an activity to start building history."}
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="contacts">
                 <div className="space-y-6">
                    <div className="flex justify-between items-center">
                       <h3 className="text-lg font-bold text-neutral-900 dark:text-white">POC History</h3>
                       <Button 
                        size="sm" 
                        className="rounded-xl flex gap-2"
                        onClick={() => setIsContactModalOpen(true)}
                       >
                          <UserPlus className="w-4 h-4" />
                          Add POC Entry
                       </Button>
                    </div>

                    <div className="space-y-4">
                       {contacts.map(contact => (
                          <ContactCard 
                            key={contact.id} 
                            contact={contact} 
                            isInactive={!contact.isActive}
                            clientId={id as string}
                            onUpdate={fetchDetails}
                          />
                       ))}
                       {contacts.length === 0 && <p className="text-center py-8 text-neutral-400 font-medium">No contacts found.</p>}
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="activity">
                 <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-neutral-100 dark:before:bg-slate-800">
                    {client.activities.sort((a,b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime()).map(act => (
                       <div key={act.id} className="relative">
                          <div className="absolute -left-[26px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-primary z-10" />
                          <div className="flex flex-col">
                             <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm text-neutral-900 dark:text-white">{act.title}</h4>
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                   {format(new Date(act.activityDate), "MMM dd, yyyy")}
                                </span>
                             </div>
                             <div className="mt-1 p-3 bg-neutral-50 dark:bg-slate-800/20 rounded-xl border border-neutral-100 dark:border-slate-800 text-sm text-neutral-500">
                                {act.description}
                             </div>
                              <Badge variant="secondary" className="w-fit mt-1 text-[9px] font-black uppercase tracking-tighter opacity-50">
                                Type: {act.type}
                              </Badge>
                          </div>
                       </div>
                    ))}
                    {client.activities.length === 0 && <p className="text-center pt-8 text-neutral-400 font-medium pb-4">No activity history recorded yet.</p>}
                 </div>
              </TabsContent>
           </CardContent>
        </Tabs>
      </Card>

      <AddContactModal 
        clientId={id as string} 
        isOpen={isContactModalOpen} 
        onClose={() => setIsContactModalOpen(false)} 
        onSuccess={fetchDetails}
      />

      <LogActivityModal 
        clientId={id as string} 
        isOpen={isActivityModalOpen} 
        onClose={() => setIsActivityModalOpen(false)} 
        onSuccess={fetchDetails}
      />

      <EditCrmClientModal
        client={client}
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        onSuccess={fetchDetails}
      />
      
      <style jsx global>{`
        .tab-premium {
          @apply py-4 px-6 font-bold text-xs uppercase tracking-widest text-neutral-400 transition-all border-b-2 border-transparent relative
          data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none;
        }
      `}</style>
    </div>
  );
}

function SummaryCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <Card className="border border-neutral-100 dark:border-slate-800 shadow-sm rounded-3xl group hover:border-primary/20 transition-all overflow-hidden relative">
       <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          {icon}
       </div>
       <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-8 rounded-xl bg-neutral-50 dark:bg-slate-800/50 flex items-center justify-center">
                {icon}
             </div>
             <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{title}</p>
          </div>
          <h3 className="text-2xl font-black text-neutral-900 dark:text-white leading-none">{value}</h3>
          <p className="text-[10px] text-neutral-500 font-medium mt-1">{subtitle}</p>
       </CardContent>
    </Card>
  );
}

function ContactCard({ contact, isInactive, clientId, onUpdate }: { contact: Contact; isInactive?: boolean; clientId: string; onUpdate: () => void; }) {
  const [loading, setLoading] = useState(false);

  const handleDeactivate = async () => {
    const reason = window.prompt("Reason for deactivation (Mandatory):");
    if (!reason) return;

    try {
      setLoading(true);
      const res = await apiClient(`/crm/clients/${clientId}/contacts/${contact.id}/deactivate`, {
        method: "PATCH",
        body: JSON.stringify({ remarks: reason }),
      });
      if (!res.ok) throw new Error("Failed to deactivate contact");
      toast.success("Contact deactivated");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setLoading(true);
      const res = await apiClient(`/crm/clients/${clientId}/contacts/${contact.id}/reactivate`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to reactivate contact");
      toast.success("Contact reactivated");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePrimary = async () => {
    try {
      setLoading(true);
      const res = await apiClient(`/crm/clients/${clientId}/contacts/${contact.id}/toggle-primary`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(contact.isPrimary ? "Primary status removed" : "Marked as Primary contact");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(
      "p-4 grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_auto] gap-4 sm:gap-6 items-center rounded-2xl border transition-all",
      isInactive 
        ? "bg-neutral-50/50 dark:bg-slate-900/10 border-neutral-100 dark:border-slate-800/50" 
        : "bg-white dark:bg-slate-950 border-neutral-100 dark:border-slate-800/60 hover:shadow-md hover:border-primary/20"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg",
          isInactive ? "bg-neutral-200 text-neutral-400" : "bg-primary/5 text-primary border border-primary/10"
        )}>
          {contact.name.substring(0, 1).toUpperCase()}
        </div>
        <div>
           <div className="flex items-center gap-2">
              <h5 className="font-bold text-neutral-900 dark:text-white text-sm">{contact.name}</h5>
              {!isInactive && contact.isPrimary && (
                <Badge className="bg-primary/10 text-primary border-none text-[8px] uppercase tracking-tighter">Primary</Badge>
              )}
              {contact.remarks && !isInactive && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-neutral-400 hover:text-primary transition-colors focus:outline-hidden" title="View Internal Remarks">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 text-sm border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800" align="start">
                    <p className="font-semibold text-amber-800 dark:text-amber-200 text-xs mb-1 uppercase tracking-wider">Internal Remarks</p>
                    <p className="text-amber-700 dark:text-amber-300/80 leading-relaxed text-xs">
                      {contact.remarks}
                    </p>
                  </PopoverContent>
                </Popover>
              )}
           </div>
           <p className="text-xs text-neutral-500 font-medium">{contact.designation || 'Strategic Partner'}</p>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 min-w-[220px]">
         {contact.email && (
           <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-medium">
              <div className="w-6 h-6 rounded-md bg-neutral-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                 <Mail className="w-3 h-3 text-neutral-400" />
              </div>
              <span className="truncate">{contact.email}</span>
           </div>
         )}
         {contact.phone && (
           <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-medium">
              <div className="w-6 h-6 rounded-md bg-neutral-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                 <Phone className="w-3 h-3 text-neutral-400" />
              </div>
              <span className="truncate">{contact.phone}</span>
           </div>
         )}
      </div>

       <div className="flex items-center gap-2">
          {isInactive ? (
            <>
              <div className="text-[10px] italic text-neutral-400 text-right mr-2 leading-tight">
                 Deactivated: {safeFormat(contact.createdAt, "MMM d, yy")} <br />
                 "{contact.remarks || 'No reason provided'}"
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-tight text-primary hover:bg-primary/5"
                onClick={handleReactivate}
                disabled={loading}
              >
                {loading ? "..." : "Reactivate"}
              </Button>
            </>
          ) : (
            <>
              <label className={cn(
                "flex items-center gap-2 mr-3 text-[10px] font-bold uppercase tracking-tight cursor-pointer",
                contact.isPrimary ? "text-amber-500" : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300",
                loading && "opacity-50 pointer-events-none"
              )}>
                <Checkbox 
                  checked={contact.isPrimary} 
                  onCheckedChange={handleTogglePrimary} 
                  disabled={loading}
                  className={cn("rounded-sm w-4 h-4", contact.isPrimary && "data-[state=checked]:bg-amber-500 data-[state=checked]:text-white data-[state=checked]:border-amber-500 border-amber-500")}
                />
                Primary
              </label>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-tight text-red-500 hover:text-red-600 hover:bg-red-50/50"
                onClick={handleDeactivate}
                disabled={loading}
              >
                {loading ? "..." : "Deactivate"}
              </Button>
            </>
          )}
       </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-3">
       <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{title}</h4>
       <div className="space-y-2">
          {children}
       </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-slate-800/50">
       <span className="text-xs font-medium text-neutral-500">{label}</span>
       <span className="text-sm font-bold text-neutral-800 dark:text-slate-200">{value || "---"}</span>
    </div>
  );
}

function CrmDetailsSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Skeleton className="h-32 w-full rounded-3xl" />
      <div className="grid grid-cols-4 gap-6">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
      </div>
      <Skeleton className="h-96 w-full rounded-3xl" />
    </div>
  );
}

function safeFormat(dateStr: string | null | undefined, formatStr: string, fallback: string = "---") {
  if (!dateStr) return fallback;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return fallback;
  return format(date, formatStr);
}
