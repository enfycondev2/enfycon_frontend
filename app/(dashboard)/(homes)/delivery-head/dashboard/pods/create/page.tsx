"use client"

import * as React from "react";
import DefaultCardComponent from "@/app/(dashboard)/components/default-card-component";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect, Option } from "@/components/shared/multi-select";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

// Initial empty options, will be populated from API
const INITIAL_RECRUITER_OPTIONS: Option[] = [];

import { apiClient } from "@/lib/apiClient";

export default function DeliveryHeadCreatePodPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [selectedRecruiters, setSelectedRecruiters] = React.useState<string[]>([]);
    const [selectedPodLead, setSelectedPodLead] = React.useState<string>("");
    const [recruiterOptions, setRecruiterOptions] = React.useState<Option[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [podName, setPodName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        async function fetchData() {
            try {
                // Fetch recruiters
                const recruitersRes = await apiClient("/pods/delivery-head/available-recruiters");

                if (recruitersRes.ok) {
                    const recruiters = await recruitersRes.json();
                    console.log("Raw recruiters from API:", recruiters);
                    const mapped = recruiters.map((r: any) => ({
                        label: r.fullName,
                        value: r.id || r.keycloakId
                    }));
                    // Deduplicate by value
                    const unique = Array.from(new Map(mapped.map((m: any) => [m.value, m])).values()) as Option[];
                    setRecruiterOptions(unique);
                }

                // Also fetch potential pod leads if we have an endpoint, 
                // but let's stick to the recruiters first as requested.
                // Looking at auth.controller.ts, there isn't a specific "available pod leads" 
                // but recruiters can be pod leads too.
                // However, the request was specifically for available recruiters.

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        }

        if (session?.user?.id) {
            fetchData();
        }
    }, [session?.user?.id]);

    const handlePodLeadChange = (value: string) => {
        const previousLead = selectedPodLead;

        // If "none" or empty selected, just update the lead state and don't add to recruiters
        if (value === "none" || value === "") {
            setSelectedPodLead("");
            return;
        }

        setSelectedPodLead(value);

        setSelectedRecruiters((prev) => {
            if (prev.includes(value)) return prev;

            if (prev.length < 10) {
                return [...prev, value];
            } else {
                if (previousLead && prev.includes(previousLead)) {
                    return prev.map(id => id === previousLead ? value : id);
                } else {
                    toast.error("Maximum 10 members allowed. One recruiter was replaced.");
                    const newRecs = [...prev];
                    newRecs[0] = value;
                    return newRecs;
                }
            }
        });
    };

    const handleRecruitersChange = (values: string[]) => {
        console.log("handleRecruitersChange called with:", values);
        // Filter out "none" or empty if they somehow got in
        const uniqueValues = Array.from(new Set(values.filter(v => v && v !== "none")));

        if (uniqueValues.length > 10) {
            toast.error("A pod can have a maximum of 10 members.");
            return;
        }

        if (selectedPodLead && !uniqueValues.includes(selectedPodLead)) {
            toast.error("The Pod Lead must be included in the recruiters list.");
            return;
        }

        setSelectedRecruiters(uniqueValues);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!podName.trim()) {
            toast.error("Pod Name is required.");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await apiClient("/pods", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: podName,
                    ...(selectedPodLead && selectedPodLead !== "none" ? { podHeadId: selectedPodLead } : {}),
                    recruiterIds: selectedRecruiters
                })
            });

            if (response.ok) {
                toast.success("Pod created successfully!");
                router.refresh();
                router.push('/delivery-head/dashboard/pods');
            } else {
                const errData = await response.json();
                toast.error(errData.message || "Failed to create pod.");
            }
        } catch (error) {
            console.error("Error creating pod:", error);
            toast.error("An error occurred while creating the pod.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <DashboardBreadcrumb title="Create a New Pod" text="Pod Management" />
            <div className="p-6">
                <DefaultCardComponent title="Pod Details">
                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-6">
                            <div>
                                <Label htmlFor="podName" className="text-[#4b5563] dark:text-white mb-2">Pod Name *</Label>
                                <Input type="text" id="podName" value={podName} onChange={(e) => setPodName(e.target.value)} className="border border-neutral-300 px-5 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary h-12 rounded-lg !shadow-none !ring-0 w-full" placeholder="e.g. Engineering Pod Alpha" required />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="podLead" className="text-[#4b5563] dark:text-white mb-2">Assign Pod Lead</Label>
                                    <Select onValueChange={handlePodLeadChange} value={selectedPodLead || "none"} disabled={!isLoading && recruiterOptions.length === 0}>
                                        <SelectTrigger className="border border-neutral-300 px-5 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary !h-12 rounded-lg !shadow-none !ring-0 w-full bg-transparent text-left">
                                            <SelectValue placeholder={isLoading ? "Loading recruiters..." : (recruiterOptions.length === 0 ? "No recruiter found" : "Select a Pod Lead")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none" className="text-muted-foreground italic font-medium">
                                                None (Unassigned)
                                            </SelectItem>
                                            {recruiterOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-[#4b5563] dark:text-white mb-2 block">Assign Recruiters</Label>
                                    <MultiSelect
                                        options={recruiterOptions}
                                        selected={selectedRecruiters}
                                        onChange={handleRecruitersChange}
                                        placeholder={isLoading ? "Loading recruiters..." : (recruiterOptions.length === 0 ? "No recruiter found" : "Select recruiter(s)...")}
                                        disabled={!isLoading && recruiterOptions.length === 0}
                                        emptyMessage="No recruiter found"
                                    />
                                    <p className="text-xs text-neutral-500 mt-2">Select one or more recruiters to join this pod (Max 10 total).</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <Label htmlFor="description" className="text-[#4b5563] dark:text-white mb-2">Pod Description</Label>
                            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="border border-neutral-300 px-5 py-4 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary min-h-[120px] rounded-lg !shadow-none !ring-0" placeholder="Optional details about this pod's focus or goals..." />
                        </div>

                        <div className="flex justify-end gap-3 mt-4">
                            <Button type="button" variant="outline" className="h-12 px-8" onClick={() => router.push('/delivery-head/dashboard/pods')} disabled={isSubmitting}>Cancel</Button>
                            <Button type="submit" variant="default" className="h-12 px-8" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Pod"}</Button>
                        </div>
                    </form>
                </DefaultCardComponent>
            </div>
        </>
    );
}
