"use client";

import React, { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";
import { UserPlus, Info } from "lucide-react";

interface AddContactModalProps {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddContactModal({ clientId, isOpen, onClose, onSuccess }: AddContactModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    designation: "",
    email: "",
    phone: "",
    isPrimary: false,
    remarks: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Name is required");

    try {
      setLoading(true);
      const res = await apiClient(`/crm/clients/${clientId}/contacts`, {
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to add contact");
      }

      toast.success("Contact added to history");
      setFormData({ name: "", designation: "", email: "", phone: "", isPrimary: false, remarks: "" });
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
      <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl overflow-hidden p-0">
        <div className="bg-primary/5 p-6 border-b border-primary/10">
           <DialogHeader>
              <DialogTitle className="text-xl font-black text-neutral-900 flex items-center gap-2">
                 <UserPlus className="w-5 h-5 text-primary" />
                 Add New POC
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-neutral-500">
                 Adding a new contact will archive the existing one if replaced. (Append-only history)
              </DialogDescription>
           </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                 <Label htmlFor="name">Full Name *</Label>
                 <Input 
                   id="name" 
                   placeholder="e.g. Jane Smith" 
                   className="rounded-xl h-11"
                   value={formData.name}
                   onChange={(e) => setFormData({...formData, name: e.target.value})}
                 />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                 <Label htmlFor="designation">Designation</Label>
                 <Input 
                   id="designation" 
                   placeholder="e.g. HR Manager" 
                   className="rounded-xl h-11"
                   value={formData.designation}
                   onChange={(e) => setFormData({...formData, designation: e.target.value})}
                 />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                 <Label htmlFor="email">Email</Label>
                 <Input 
                   id="email" 
                   type="email"
                   placeholder="jane@company.com" 
                   className="rounded-xl h-11"
                   value={formData.email}
                   onChange={(e) => setFormData({...formData, email: e.target.value})}
                 />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                 <Label htmlFor="phone">Phone</Label>
                 <Input 
                   id="phone" 
                   placeholder="+1 (xxx) xxx-xxxx" 
                   className="rounded-xl h-11"
                   value={formData.phone}
                   onChange={(e) => setFormData({...formData, phone: e.target.value})}
                 />
              </div>
           </div>

           <div className="flex items-center space-x-2 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              <Checkbox 
                id="isPrimary" 
                checked={formData.isPrimary} 
                onCheckedChange={(checked) => setFormData({...formData, isPrimary: checked === true})}
              />
              <Label htmlFor="isPrimary" className="text-xs font-bold text-neutral-600 cursor-pointer select-none">
                 Mark as primary contact for this account
              </Label>
           </div>

           <div className="space-y-2">
              <Label htmlFor="remarks">Onboarding Remarks (Internal)</Label>
              <Textarea 
                id="remarks" 
                placeholder="Brief notes about this POC relationship..." 
                className="rounded-xl min-h-[80px] resize-none"
                value={formData.remarks}
                onChange={(e) => setFormData({...formData, remarks: e.target.value})}
              />
           </div>
           <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</Button>
              <Button type="submit" disabled={loading} className="rounded-xl px-8 font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                 {loading ? "Adding..." : "Add POC Row"}
              </Button>
           </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
