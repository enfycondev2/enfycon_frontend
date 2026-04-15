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
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";
import { Activity, Calendar, FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LogActivityModalProps {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LogActivityModal({ clientId, isOpen, onClose, onSuccess }: LogActivityModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "NOTE",
    title: "",
    description: "",
    activityDate: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Title is required");

    try {
      setLoading(true);
      const res = await apiClient(`/crm/clients/${clientId}/activities`, {
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to log activity");
      }

      toast.success("Engagement activity logged");
      setFormData({ type: "NOTE", title: "", description: "", activityDate: new Date().toISOString().split('T')[0] });
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
                 <Activity className="w-5 h-5 text-primary" />
                 Log Interaction
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-neutral-500">
                 Keep track of every touchpoint to build a rich relationship history.
              </DialogDescription>
           </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                 <Label htmlFor="type">Activity Type</Label>
                 <Select 
                   value={formData.type} 
                   onValueChange={(val) => setFormData({...formData, type: val})}
                 >
                   <SelectTrigger className="rounded-xl h-11">
                     <SelectValue placeholder="Select type" />
                   </SelectTrigger>
                   <SelectContent className="rounded-xl">
                     <SelectItem value="CALL">C-Level Call</SelectItem>
                     <SelectItem value="EMAIL">Strategic Email</SelectItem>
                     <SelectItem value="MEETING">Person Meeting</SelectItem>
                     <SelectItem value="NOTE">Internal Note</SelectItem>
                   </SelectContent>
                 </Select>
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                 <Label htmlFor="activityDate">Activity Date</Label>
                 <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input 
                      id="activityDate" 
                      type="date"
                      className="pl-10 rounded-xl h-11"
                      value={formData.activityDate}
                      onChange={(e) => setFormData({...formData, activityDate: e.target.value})}
                    />
                 </div>
              </div>
           </div>

           <div className="space-y-2">
              <Label htmlFor="title">Summary Title *</Label>
              <div className="relative">
                 <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                 <Input 
                    id="title" 
                    placeholder="e.g. Discussed Q3 resource requirements" 
                    className="pl-10 rounded-xl h-11"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                 />
              </div>
           </div>

           <div className="space-y-2">
              <Label htmlFor="description">Detailed Notes</Label>
              <Textarea 
                id="description" 
                placeholder="Log the key takeaways, feedback, or next steps..." 
                className="rounded-xl min-h-[120px] resize-none"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
           </div>

           <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</Button>
              <Button type="submit" disabled={loading} className="rounded-xl px-8 font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                 {loading ? "Logging..." : "Commit Activity"}
              </Button>
           </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
