"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClientAutocomplete } from "@/components/shared/client-autocomplete";
import { 
  Building2, 
  Globe, 
  MapPin, 
  Users, 
  Save, 
  ArrowLeft,
  Building,
  Briefcase
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationSelect } from "@/components/shared/location-select";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

const INDUSTRIES = [
  "Information Technology",
  "Healthcare",
  "Financial Services",
  "Retail",
  "Manufacturing",
  "Telecommunications",
  "Energy",
  "Education",
  "Consulting",
  "Automotive",
  "Pharmaceuticals",
  "Real Estate",
  "Hospitality & Tourism"
];

interface CreateCrmClientFormProps {
  basePath: string;
  isAdmin?: boolean;
  clientId?: string;
  isEdit?: boolean;
}

export default function CreateCrmClientForm({ basePath, isAdmin = false, clientId, isEdit = false }: CreateCrmClientFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [accountManagers, setAccountManagers] = useState<{ id: string, fullName: string }[]>([]);

  const [formData, setFormData] = useState({
    companyName: "",
    endClientName: "",
    clientType: "DIRECT_CLIENT",
    industry: "",
    website: "",
    companySize: "",
    city: "",
    state: "",
    country: "USA",
    accountManagerId: "",
  });

  const [checkingName, setCheckingName] = useState(false);
  const [nameStatus, setNameStatus] = useState<'IDLE' | 'UNIQUE' | 'DUPLICATE'>('IDLE');
  const debouncedCompanyName = useDebounce(formData.companyName, 500);

  // Fetch AMs for Admin
  useEffect(() => {
    if (isAdmin) {
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
  }, [isAdmin]);

  // Fetch client details if editing
  useEffect(() => {
    if (isEdit && clientId) {
      const fetchClient = async () => {
        try {
          setInitialLoading(true);
          const res = await apiClient(`/crm/clients/${clientId}`);
          if (!res.ok) throw new Error("Failed to fetch client for edit");
          const data = await res.json();
          
          setFormData({
            companyName: data.companyName || "",
            endClientName: data.endClientName || "",
            clientType: data.clientType || "DIRECT_CLIENT",
            industry: data.industry || "",
            website: data.website || "",
            companySize: data.companySize || "",
            city: data.city || "",
            state: data.state || "",
            country: data.country || "USA",
            accountManagerId: data.accountManagerId || "",
          });
        } catch (error) {
          console.error(error);
          toast.error("Could not load client details");
        } finally {
          setInitialLoading(false);
        }
      };
      fetchClient();
    }
  }, [isEdit, clientId]);

  useEffect(() => {
    // Only check name uniqueness if NOT editing (company name changes might be allowed but check isn't needed for existing ID)
    if (!isEdit && debouncedCompanyName.trim().length > 2) {
      const checkName = async () => {
        setCheckingName(true);
        try {
          const res = await apiClient(`/clients?type=CLIENT&search=${encodeURIComponent(debouncedCompanyName)}`);
          if (res.ok) {
            const data = await res.json();
            const exists = data.some((c: any) => c.name.toLowerCase() === debouncedCompanyName.toLowerCase());
            setNameStatus(exists ? 'DUPLICATE' : 'UNIQUE');
          }
        } catch (e) {
          console.error(e);
        } finally {
          setCheckingName(false);
        }
      };
      checkName();
    } else {
      setNameStatus('IDLE');
    }
  }, [debouncedCompanyName, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName) return toast.error("Company Name is required");

    try {
      setLoading(true);
      
      const payload = { ...formData };
      if (!payload.accountManagerId) {
        delete (payload as any).accountManagerId;
      }

      const url = isEdit ? `/crm/clients/${clientId}` : "/crm/clients";
      const method = isEdit ? "PATCH" : "POST";

      const res = await apiClient(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `Failed to ${isEdit ? 'update' : 'create'} client`);
      }

      toast.success(isEdit ? "Client profile rectified" : "Client onboarded successfully");
      
      // If editing, redirect back to the client detail page
      if (isEdit) {
        router.push(`${basePath}/${clientId}`);
      } else {
        router.push(basePath);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-neutral-500 animate-pulse">Loading client profile...</p>
      </div>
    );
  }


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full h-10 w-10 border border-neutral-200 dark:border-slate-800"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
            {isEdit ? "Rectify Client Profile" : "Onboard New Client"}
          </h2>
          <p className="text-sm text-neutral-500">
            {isEdit ? "Complete or correct historical information for this relationship." : "Establish a new enterprise relationship in the portfolio."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 space-y-6">
          <Card className="border border-neutral-100 dark:border-slate-800 shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="bg-neutral-50/50 dark:bg-slate-800/20 border-b border-neutral-100 dark:border-slate-800">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <div className="flex items-center gap-1.5 h-4">
                      {checkingName && <Loader2 className="w-3 h-3 animate-spin text-neutral-400" />}
                      {!checkingName && nameStatus === 'UNIQUE' && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">
                          <CheckCircle2 className="w-3 h-3" /> New Account
                        </span>
                      )}
                      {!checkingName && nameStatus === 'DUPLICATE' && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-500 font-bold uppercase tracking-tighter">
                          <AlertCircle className="w-3 h-3" /> Global Match Found
                        </span>
                      )}
                    </div>
                  </div>
                  <ClientAutocomplete
                    type="CLIENT"
                    value={formData.companyName}
                    onChange={(val) => setFormData({...formData, companyName: val})}
                    placeholder="Search master directory (e.g. Google)..."
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientType">Client Type</Label>
                  <Select 
                    value={formData.clientType} 
                    onValueChange={(val) => setFormData({...formData, clientType: val})}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="DIRECT_CLIENT">Direct Client</SelectItem>
                      <SelectItem value="VENDOR">Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endClientName">End Client (Optional)</Label>
                  <ClientAutocomplete
                    type="END_CLIENT"
                    value={formData.endClientName || ""}
                    onChange={(val) => setFormData({...formData, endClientName: val})}
                    placeholder="If Vendor, who is the end client?"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-neutral-50 dark:border-slate-800/60 pt-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <div className="space-y-3">
                    <Select 
                      value={INDUSTRIES.includes(formData.industry) ? formData.industry : (formData.industry ? "Other" : "")} 
                      onValueChange={(val) => {
                        if (val === "Other") {
                          setFormData({...formData, industry: ""}); // Clear to let them type
                        } else {
                          setFormData({...formData, industry: val});
                        }
                      }}
                    >
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {INDUSTRIES.map(ind => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                        <SelectItem value="Other">Other / Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {(formData.industry === "" || !INDUSTRIES.includes(formData.industry)) && (
                      <div className="relative animate-in slide-in-from-top-2 duration-300">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <Input 
                          id="industry_custom" 
                          placeholder="Type custom industry..." 
                          className="pl-10 rounded-xl h-11 border-primary/20 bg-primary/5 focus:bg-white transition-all shadow-sm"
                          value={formData.industry}
                          onChange={(e) => setFormData({...formData, industry: e.target.value})}
                          autoFocus={!INDUSTRIES.includes(formData.industry) && formData.industry !== ""}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input 
                      id="companySize" 
                      placeholder="e.g. 1000-5000" 
                      className="pl-10 rounded-xl h-11"
                      value={formData.companySize}
                      onChange={(e) => setFormData({...formData, companySize: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <Input 
                    id="website" 
                    placeholder="https://example.com" 
                    className="pl-10 rounded-xl h-11"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-neutral-100 dark:border-slate-800 shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="bg-neutral-50/50 dark:bg-slate-800/20 border-b border-neutral-100 dark:border-slate-800">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" />
                Office Location
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                <Label>Headquarters Location</Label>
                <LocationSelect 
                  value={formData.city && formData.state ? `${formData.city.toLowerCase()}-${formData.state.toLowerCase()}` : ""}
                  onChange={(val) => {
                    const [city, state] = val.split('-');
                    setFormData({
                      ...formData,
                      city: city ? city.charAt(0).toUpperCase() + city.slice(1) : "",
                      state: state ? state.toUpperCase() : "",
                      country: val === "remote" ? "Remote" : "USA"
                    });
                  }}
                  placeholder="Search city (e.g. Seattle, WA)..."
                />
                <p className="text-[10px] text-neutral-400 mt-1 pl-1">
                  Type to search for USA cities or select 'Remote'.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-4 space-y-6 flex flex-col pt-[1px]">
          <div className="rounded-2xl overflow-hidden border border-neutral-100 dark:border-slate-800 shadow-sm relative group bg-white dark:bg-slate-900 bg-opacity-50">
             <img src="/images/onboarding-illustration.png" alt="Onboarding" className="w-full h-auto object-cover opacity-90 transition-all duration-700 group-hover:opacity-100 group-hover:scale-105" />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent pointer-events-none" />
             <div className="absolute bottom-4 left-4 right-4 text-white">
                <h4 className="font-bold text-sm tracking-tight mb-1 text-white shadow-sm">Scale Your Relationships</h4>
                <p className="text-[10px] text-white/80 leading-tight">Every new connection is a stepping stone to exponential growth.</p>
             </div>
          </div>

          <Button 
            type="submit" 
            className={cn(
              "w-full h-14 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-primary/20 transition-all",
              loading ? "opacity-70 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"
            )}
            disabled={loading}
          >
            {loading ? (isEdit ? "Updating Profile..." : "Establishing Relationship...") : (
              <>
                <Save className="w-5 h-5 mr-2" />
                {isEdit ? "Update Profile" : "Onboard Client"}
              </>
            )}
          </Button>

          {isAdmin && (
            <Card className="border border-neutral-100 dark:border-slate-800 shadow-sm overflow-hidden rounded-2xl">
              <CardHeader className="bg-neutral-50/50 dark:bg-slate-800/20 border-b border-neutral-100 dark:border-slate-800">
                <CardTitle className="text-base flex items-center gap-2 text-primary">
                  Ownership
                </CardTitle>
                <CardDescription className="text-[11px]">Define who manages this relationship.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountManagerId">Assigned Account Manager</Label>
                    <Select 
                      value={formData.accountManagerId} 
                      onValueChange={(val) => setFormData({...formData, accountManagerId: val})}
                    >
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Select AM" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {accountManagers.map(am => (
                          <SelectItem key={am.id} value={am.id}>{am.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-neutral-400 italic mt-2">
                      Admins can assign any verified Account Manager to this client.
                    </p>
                  </div>
              </CardContent>
            </Card>
          )}
        </div>
      </form>
    </div>
  );
}
