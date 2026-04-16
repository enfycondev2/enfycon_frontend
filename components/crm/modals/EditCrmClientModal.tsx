"use client";

import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";
import { Settings, Building2, Globe, MapPin, Calendar, UsersRound } from "lucide-react";
import { LocationSelect } from "@/components/shared/location-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditCrmClientModalProps {
  client: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditCrmClientModal({ client, isOpen, onClose, onSuccess }: EditCrmClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [accountManagers, setAccountManagers] = useState<{ id: string, fullName: string }[]>([]);
  const [formData, setFormData] = useState({
    industry: "",
    website: "",
    companySize: "",
    address: "",
    city: "",
    state: "",
    country: "",
    nextFollowUpDate: "",
    accountManagerId: "",
  });

  useEffect(() => {
    if (client) {
      setFormData({
        industry: client.industry || "",
        website: client.website || "",
        companySize: client.companySize || "",
        address: client.address || "",
        city: client.city || "",
        state: client.state || "",
        country: client.country || "",
        nextFollowUpDate: client.nextFollowUpDate ? new Date(client.nextFollowUpDate).toISOString().split('T')[0] : "",
        accountManagerId: client.accountManagerId || "",
      });
      
      if (isOpen) {
        const fetchAMs = async () => {
          try {
            const res = await apiClient("/auth/account-managers");
            if (res.ok) {
              const data = await res.json();
              setAccountManagers(data);
            }
          } catch (error) {
            // Silently ignore if user does not have permission
          }
        };
        fetchAMs();
      }
    }
  }, [client, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiClient(`/crm/clients/${client.id}`, {
        method: "PATCH",
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to update client profile");
      }

      toast.success("Profile updated successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] rounded-3xl border-none shadow-2xl overflow-hidden p-0">
        <div className="bg-primary/5 p-6 border-b border-primary/10">
           <DialogHeader>
              <DialogTitle className="text-xl font-black text-neutral-900 flex items-center gap-2">
                 <Settings className="w-5 h-5 text-primary" />
                 Update Client Profile
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-neutral-500">
                 Modify business metadata and location details for {client?.companyName}.
              </DialogDescription>
           </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                 <Label htmlFor="industry" className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 opacity-60" /> Industry
                 </Label>
                 <Input 
                   id="industry" 
                   placeholder="e.g. Information Technology" 
                   className="rounded-xl h-11"
                   value={formData.industry}
                   onChange={(e) => setFormData({...formData, industry: e.target.value})}
                 />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                 <Label htmlFor="companySize" className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 opacity-60" /> Company Size
                 </Label>
                 <Input 
                   id="companySize" 
                   placeholder="e.g. 1000-5000" 
                   className="rounded-xl h-11"
                   value={formData.companySize}
                   onChange={(e) => setFormData({...formData, companySize: e.target.value})}
                 />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                 <Label htmlFor="website" className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 opacity-60" /> Website URL
                 </Label>
                 <Input 
                   id="website" 
                   placeholder="https://example.com" 
                   className="rounded-xl h-11"
                   value={formData.website}
                   onChange={(e) => setFormData({...formData, website: e.target.value})}
                 />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1 border-l border-neutral-100 dark:border-slate-800 pl-4 ml-2">
                 <Label htmlFor="nextFollowUpDate" className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-500">
                    <Calendar className="w-3.5 h-3.5" /> Next Follow-Up (Mental Note)
                 </Label>
                 <Input 
                   id="nextFollowUpDate" 
                   type="date"
                   className="rounded-xl h-11 border-amber-200 dark:border-amber-900/50 focus-visible:ring-amber-500"
                   value={formData.nextFollowUpDate}
                   onChange={(e) => setFormData({...formData, nextFollowUpDate: e.target.value})}
                 />
              </div>
           </div>

           <div className="space-y-4 pt-4 border-t border-dashed border-neutral-100 dark:border-slate-800">
              <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                 <MapPin className="w-3.5 h-3.5" /> Physical Headquarters
              </h4>
              
              <div className="space-y-2">
                 <Label htmlFor="address">St. Address</Label>
                 <Input 
                   id="address" 
                   placeholder="Floor, Building, Road..." 
                   className="rounded-xl h-11"
                   value={formData.address}
                   onChange={(e) => setFormData({...formData, address: e.target.value})}
                 />
              </div>

              <div className="space-y-4 pt-4 border-t border-dashed border-neutral-100 dark:border-slate-800">
                  <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                     <MapPin className="w-3.5 h-3.5" /> Office Location
                  </h4>
                  <div className="space-y-2">
                     <Label>Headquarters Location</Label>
                     <LocationSelect 
                       value={formData.city && formData.state ? `${formData.city.toLowerCase()}-${formData.state.toLowerCase()}` : (formData.country === 'Remote' ? 'remote' : "")}
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
                  </div>
              </div>
           </div>

           {accountManagers.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-dashed border-neutral-100 dark:border-slate-800 xl:col-span-2">
                 <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                    <UsersRound className="w-3.5 h-3.5" /> Ownership (Admin Only)
                 </h4>
                 <div className="space-y-2">
                    <Label>Assigned Account Manager</Label>
                    <Select 
                      value={formData.accountManagerId} 
                      onValueChange={(val) => setFormData({...formData, accountManagerId: val})}
                    >
                      <SelectTrigger className="rounded-xl h-11 border-primary/20">
                        <SelectValue placeholder="Select AM" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {accountManagers.map(am => (
                          <SelectItem key={am.id} value={am.id}>{am.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                 </div>
              </div>
           )}

           <DialogFooter className="pt-4 border-t border-neutral-100 dark:border-slate-800">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</Button>
              <Button type="submit" disabled={loading} className="rounded-xl px-8 font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                 {loading ? "Saving..." : "Save Changes"}
              </Button>
           </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
