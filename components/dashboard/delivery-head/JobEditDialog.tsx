"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientAutocomplete } from "@/components/shared/client-autocomplete";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/apiClient";
import { LocationSelect } from "@/components/shared/location-select";
import { MultiSelect, Option } from "@/components/shared/multi-select";
import RichTextEditor from "@/components/shared/rich-text-editor";
import { 
    Save, 
    X, 
    Loader2, 
    Briefcase, 
    User, 
    Globe, 
    DollarSign, 
    ClipboardList, 
    AlertCircle, 
    FileText 
} from "lucide-react";
import { cn } from "@/lib/utils";

const visaOptions: Option[] = [
    { label: "All Visa", value: "ALL_VISA" },
    { label: "All Visa except H1B", value: "ALL_VISA_EXCEPT_H1B" },
    { label: "H1B", value: "H1B" },
    { label: "Green Card (GC)", value: "GC" },
    { label: "US Citizen", value: "US_CITIZEN" },
    { label: "OPT/CPT", value: "OPT" },
    { label: "EAD", value: "EAD" },
    { label: "TN Visa", value: "TN" },
];

const parseVisaTypes = (visaType?: string) =>
    (visaType || "").split(",").map((v) => v.trim()).filter(Boolean);

interface Job {
    id: string;
    jobTitle: string;
    jobCode: string;
    jobLocation: string;
    visaType?: string;
    clientBillRate: string;
    payRate: string;
    clientName: string;
    endClientName: string;
    noOfPositions: number;
    submissionRequired: number;
    urgency: string;
    status: string;
    podId?: string | null;
    accountManagerId: string;
    jobDescription: string;
}

interface Pod {
    id: string;
    name: string;
}

interface JobEditDialogProps {
    job: Job | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function JobEditDialog({ job, isOpen, onClose, onSuccess }: JobEditDialogProps) {
    const { data: session } = useSession();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [pods, setPods] = React.useState<Pod[]>([]);
    const [formData, setFormData] = React.useState<Partial<Job>>({});
    const [selectedPodIds, setSelectedPodIds] = React.useState<string[]>([]);

    const token = (session as any)?.user?.accessToken;
    const userRoles = (session?.user as any)?.roles || [];
    const isAccountManager = userRoles.some((r: string) => r.toUpperCase() === "ACCOUNT_MANAGER" || r.toUpperCase() === "ACCOUNT-MANAGER");

    const fetchJobDetails = React.useCallback(async () => {
        if (!job) return;
        setIsLoading(true);
        try {
            const response = await apiClient(`/jobs/${job.id}`);
            if (response.ok) {
                const fullJob = await response.json();
                setFormData({
                    jobTitle: fullJob.jobTitle,
                    jobLocation: fullJob.jobLocation,
                    visaType: fullJob.visaType,
                    clientBillRate: fullJob.clientBillRate,
                    payRate: fullJob.payRate,
                    clientName: fullJob.clientName,
                    endClientName: fullJob.endClientName,
                    noOfPositions: fullJob.noOfPositions,
                    submissionRequired: fullJob.submissionRequired,
                    urgency: fullJob.urgency,
                    status: fullJob.status,
                    accountManagerId: fullJob.accountManagerId,
                    jobDescription: fullJob.jobDescription || "",
                });
                // Pre-populate selected pods from the many-to-many pods array
                setSelectedPodIds(
                    Array.isArray(fullJob.pods) ? fullJob.pods.map((p: any) => p.id) : []
                );
            } else {
                toast.error("Failed to fetch job details");
            }
        } catch (error) {
            console.error("Error fetching job details:", error);
            toast.error("Error loading job details");
        } finally {
            setIsLoading(false);
        }
    }, [job]);

    React.useEffect(() => {
        if (isOpen && job) {
            fetchJobDetails();
        } else {
            setFormData({});
            setSelectedPodIds([]);
        }
    }, [isOpen, job, fetchJobDetails]);

    React.useEffect(() => {
        const fetchPods = async () => {
            try {
                const response = await apiClient("/pods/all");
                if (response.ok) {
                    const data = await response.json();
                    setPods(data);
                    return;
                }
                const fallback = await apiClient("/pods/my-pods");
                if (fallback.ok) {
                    const data = await fallback.json();
                    setPods(data);
                }
            } catch (error) {
                console.error("Error fetching pods:", error);
            }
        };

        if (isOpen) {
            fetchPods();
        }
    }, [isOpen, token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!job) return;

        setIsSubmitting(true);
        try {
            const { accountManagerId, jobCode, podId, ...sanitizedData } = formData;

            const patchData: any = {
                ...sanitizedData,
                noOfPositions: Number(formData.noOfPositions) || 0,
                submissionRequired: Number(formData.submissionRequired) || 0,
                ...(isAccountManager ? {} : { podIds: selectedPodIds }),
            };

            const response = await apiClient(`/jobs/${job.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(patchData),
            });

            if (response.ok) {
                toast.success("Job updated successfully");
                onSuccess();
                onClose();
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to update job");
            }
        } catch (error) {
            console.error("Error updating job:", error);
            toast.error("An error occurred while updating the job");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!job) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Job: {job.jobCode}</DialogTitle>
                    <DialogDescription>
                        Update job details and assign to a pod.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4 relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10 rounded-lg">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    )}
                    <div className="sticky top-[-16px] z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm pb-4 pt-1 mb-2 border-b border-neutral-100 dark:border-slate-800 flex justify-between items-center -mx-6 px-6 transition-all">
                        <div className="flex flex-col">
                            <h3 className="text-sm font-semibold text-primary">Job Editor</h3>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Quick Actions</p>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="h-9 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors">
                                <X className="mr-1.5 h-3.5 w-3.5" />
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={isSubmitting} className="h-9 px-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] bg-primary text-primary-foreground hover:opacity-90">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-1.5 h-3.5 w-3.5" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Section 1: Core Job Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-slate-800/50">
                            <Briefcase className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">Core Job Details</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="jobTitle" className="text-xs font-semibold">Job Title</Label>
                                <Input
                                    id="jobTitle"
                                    className="h-10 border-neutral-200 focus:border-primary transition-all"
                                    value={formData.jobTitle || ""}
                                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Assigned Pods</Label>
                                <MultiSelect
                                    options={pods.map((p) => ({ label: p.name, value: p.id }))}
                                    selected={selectedPodIds}
                                    onChange={setSelectedPodIds}
                                    placeholder={isAccountManager ? "View assigned pods" : "Select pods..."}
                                    disabled={isAccountManager}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Client Info */}
                    <div className="space-y-4 mt-6">
                        <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-slate-800/50">
                            <User className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">Client Information</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Primary Client</Label>
                                <ClientAutocomplete
                                    type="CLIENT"
                                    value={formData.clientName || ""}
                                    onChange={(value) => setFormData({ ...formData, clientName: value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">End Client</Label>
                                <ClientAutocomplete
                                    type="END_CLIENT"
                                    value={formData.endClientName || ""}
                                    onChange={(value) => setFormData({ ...formData, endClientName: value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Location & Eligibility */}
                    <div className="space-y-4 mt-6">
                        <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-slate-800/50">
                            <Globe className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">Location & Requirements</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="jobLocation" className="text-xs font-semibold">Job Location</Label>
                                <LocationSelect
                                    value={formData.jobLocation || ""}
                                    onChange={(val) => setFormData({ ...formData, jobLocation: val })}
                                    placeholder="Select location"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="visaType" className="text-xs font-semibold">Eligible Visa Types</Label>
                                <MultiSelect
                                    options={visaOptions}
                                    selected={parseVisaTypes(formData.visaType)}
                                    onChange={(selected) =>
                                        setFormData({ ...formData, visaType: selected.join(",") })
                                    }
                                    placeholder="Select visa type(s)"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Compensation & Capacity */}
                    <div className="space-y-4 mt-6">
                        <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-slate-800/50">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">Financials & Staffing</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="clientBillRate" className="text-xs font-semibold">Client Bill Rate ($/hr)</Label>
                                <Input
                                    id="clientBillRate"
                                    className="h-10 border-neutral-200 focus:border-primary transition-all font-mono"
                                    value={formData.clientBillRate || ""}
                                    onChange={(e) => setFormData({ ...formData, clientBillRate: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="payRate" className="text-xs font-semibold">Maximum Pay Rate ($/hr)</Label>
                                <Input
                                    id="payRate"
                                    className="h-10 border-neutral-200 focus:border-primary transition-all font-mono"
                                    value={formData.payRate || ""}
                                    onChange={(e) => setFormData({ ...formData, payRate: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="space-y-2">
                                <Label htmlFor="noOfPositions" className="text-xs font-semibold">Open Positions</Label>
                                <Input
                                    id="noOfPositions"
                                    type="number"
                                    className="h-10 border-neutral-200 focus:border-primary transition-all"
                                    value={formData.noOfPositions || 0}
                                    onChange={(e) => setFormData({ ...formData, noOfPositions: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="submissionRequired" className="text-xs font-semibold">Target Submissions</Label>
                                <Input
                                    id="submissionRequired"
                                    type="number"
                                    className="h-10 border-neutral-200 focus:border-primary transition-all"
                                    value={formData.submissionRequired || 0}
                                    onChange={(e) => setFormData({ ...formData, submissionRequired: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 5: Priority & Status */}
                    <div className="space-y-4 mt-6">
                        <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-slate-800/50">
                            <AlertCircle className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">Management Status</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="urgency" className="text-xs font-semibold">Priority Level</Label>
                                <Select
                                    value={formData.urgency || "WARM"}
                                    onValueChange={(value) => setFormData({ ...formData, urgency: value })}
                                >
                                    <SelectTrigger className="h-10 border-neutral-200 focus:border-primary transition-all">
                                        <SelectValue placeholder="Select urgency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="HOT">🔴 Hot - Immediate</SelectItem>
                                        <SelectItem value="WARM">🟡 Warm - Normal</SelectItem>
                                        <SelectItem value="COLD">🔵 Cold - Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status" className="text-xs font-semibold">Current Status</Label>
                                <Select
                                    value={formData.status || "ACTIVE"}
                                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                                >
                                    <SelectTrigger className={cn(
                                        "h-10 border-neutral-200 focus:border-primary transition-all",
                                        formData.status === "CLOSED" && "bg-neutral-50 text-neutral-500"
                                    )}>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACTIVE" className="text-green-600 font-medium">Active</SelectItem>
                                        <SelectItem value="ON_HOLD" className="text-orange-600 font-medium">On Hold</SelectItem>
                                        <SelectItem value="HOLD_BY_CLIENT" className="text-orange-700 font-medium">Hold By Client</SelectItem>
                                        <SelectItem value="FILLED" className="text-blue-600 font-medium">Filled</SelectItem>
                                        <SelectItem value="CLOSED" className="text-neutral-500 font-medium font-strike">Closed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Section 6: Full Job Description */}
                    <div className="space-y-4 mt-6">
                        <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-slate-800/50">
                            <FileText className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">Role Description</h4>
                        </div>
                        <RichTextEditor
                            value={formData.jobDescription || ""}
                            onChange={(val) => setFormData({ ...formData, jobDescription: val })}
                            placeholder="Provide a detailed job summary, responsibilities, and requirements..."
                        />
                    </div>


                </form>
            </DialogContent>
        </Dialog>
    );
}
