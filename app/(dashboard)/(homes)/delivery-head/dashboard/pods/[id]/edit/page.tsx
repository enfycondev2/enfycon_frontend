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
import { transformPodUpdateData } from "./transform-pod-data";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/apiClient";

export default function DeliveryHeadEditPodPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = React.use(params);
    const podId = resolvedParams.id;
    const { data: session, status } = useSession();
    const router = useRouter();

    // Consolidated form state
    const [formData, setFormData] = React.useState({
        podName: "",
        description: "",
        selectedPodLead: "",
        selectedRecruiters: [] as string[]
    });
    const [recruiterOptions, setRecruiterOptions] = React.useState<Option[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const token = (session as any)?.user?.accessToken;

    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            // Parallel fetching
            const [recruitersRes, podRes] = await Promise.all([
                apiClient("/pods/delivery-head/available-recruiters"),
                apiClient(`/pods/${podId}`)
            ]);

            if (!podRes.ok) {
                toast.error("Failed to fetch pod details.");
                router.push('/delivery-head/dashboard/pods');
                return;
            }

            const [recruiters, podData] = await Promise.all([
                recruitersRes.ok ? recruitersRes.json() : Promise.resolve([]),
                podRes.json()
            ]);

            const transformed = transformPodUpdateData(recruiters, podData);

            setFormData({
                podName: transformed.podName,
                description: transformed.description,
                selectedPodLead: transformed.selectedPodLead,
                selectedRecruiters: transformed.selectedRecruiters
            });
            setRecruiterOptions(transformed.recruiterOptions);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("An unexpected error occurred while loading data.");
        } finally {
            setIsLoading(false);
        }
    }, [podId, router]);

    React.useEffect(() => {
        if (status === "authenticated") {
            fetchData();
        } else if (status === "unauthenticated") {
            router.push('/login');
        }
    }, [status, fetchData, router]);

    const handlePodLeadChange = React.useCallback((value: string) => {
        setFormData(prev => {
            const previousLead = prev.selectedPodLead;
            let newRecs = [...prev.selectedRecruiters];

            // If a valid recruiter is selected as lead, ensure they are in the recruiters list
            if (value && value !== "none" && !newRecs.includes(value)) {
                if (newRecs.length < 10) {
                    newRecs.push(value);
                } else if (previousLead && newRecs.includes(previousLead)) {
                    newRecs = newRecs.map(id => id === previousLead ? value : id);
                } else {
                    toast.error("Maximum 10 members allowed. One recruiter was replaced.");
                    newRecs[0] = value;
                }
            }

            // Remove "none" or empty string from recruiters if it somehow got in
            newRecs = newRecs.filter(id => id && id !== "none");

            const newLead = value === "none" ? "" : value;

            return {
                ...prev,
                selectedPodLead: newLead,
                selectedRecruiters: newRecs
            };
        });
    }, []);

    const handleRecruitersChange = React.useCallback((values: string[]) => {
        const uniqueValues = Array.from(new Set(values));

        if (uniqueValues.length > 10) {
            toast.error("A pod can have a maximum of 10 members including the Pod Leader.");
            return;
        }

        if (formData.selectedPodLead && !uniqueValues.includes(formData.selectedPodLead)) {
            toast.error("The Pod Lead must be included in the recruiters list.");
            return;
        }

        setFormData(prev => ({ ...prev, selectedRecruiters: uniqueValues }));
    }, [formData.selectedPodLead]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsSubmitting(true);

        try {
            const response = await apiClient(`/pods/${podId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: formData.podName,
                    podHeadId: formData.selectedPodLead || null,
                    recruiterIds: formData.selectedRecruiters
                })
            });

            if (response.ok) {
                toast.success("Pod updated successfully!");
                router.refresh();
                router.push('/delivery-head/dashboard/pods');
            } else {
                const errData = await response.json();
                toast.error(errData.message || "Failed to update pod.");
            }
        } catch (error) {
            console.error("Error updating pod:", error);
            toast.error("An error occurred while updating the pod.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading && status !== "unauthenticated") {
        return (
            <>
                <DashboardBreadcrumb title="Edit Pod" text="Pod Management" />
                <div className="p-6">
                    <DefaultCardComponent title="Edit Pod Details">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-6">
                                <div>
                                    <Skeleton className="h-4 w-20 mb-2" />
                                    <Skeleton className="h-12 w-full rounded-lg" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Skeleton className="h-4 w-32 mb-2" />
                                        <Skeleton className="h-12 w-full rounded-lg" />
                                    </div>
                                    <div>
                                        <Skeleton className="h-4 w-32 mb-2" />
                                        <Skeleton className="h-12 w-full rounded-lg" />
                                        <Skeleton className="h-3 w-48 mt-2" />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <Skeleton className="h-4 w-28 mb-2" />
                                <Skeleton className="h-[120px] w-full rounded-lg" />
                            </div>

                            <div className="flex justify-end gap-3 mt-4">
                                <Skeleton className="h-12 px-8 w-24" />
                                <Skeleton className="h-12 px-8 w-32" />
                            </div>
                        </div>
                    </DefaultCardComponent>
                </div>
            </>
        );
    }

    return (
        <>
            <DashboardBreadcrumb title="Edit Pod" text="Pod Management" />
            <div className="p-6">
                <DefaultCardComponent title="Edit Pod Details">
                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-6">
                            <div>
                                <Label htmlFor="podName" className="text-[#4b5563] dark:text-white mb-2">Pod Name *</Label>
                                <Input
                                    type="text"
                                    id="podName"
                                    value={formData.podName}
                                    onChange={(e) => setFormData(p => ({ ...p, podName: e.target.value }))}
                                    className="border border-neutral-300 px-5 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary h-12 rounded-lg !shadow-none !ring-0 w-full"
                                    placeholder="e.g. Engineering Pod Alpha"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="podLead" className="text-[#4b5563] dark:text-white mb-2">Assign Pod Lead</Label>
                                    <Select onValueChange={handlePodLeadChange} value={formData.selectedPodLead === "" ? "none" : formData.selectedPodLead}>
                                        <SelectTrigger className="border border-neutral-300 px-5 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary !h-12 rounded-lg !shadow-none !ring-0 w-full bg-transparent text-left">
                                            <SelectValue placeholder="Remove Pod Head / Unassigned" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none" className="text-rose-500 font-medium italic">
                                                None / Remove Pod Head
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
                                        selected={formData.selectedRecruiters}
                                        onChange={handleRecruitersChange}
                                        placeholder="Select recruiter(s)..."
                                    />
                                    <p className="text-xs text-neutral-500 mt-2">Select one or more recruiters to join this pod (Max 10 total).</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <Label htmlFor="description" className="text-[#4b5563] dark:text-white mb-2">Pod Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                                className="border border-neutral-300 px-5 py-4 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary min-h-[120px] rounded-lg !shadow-none !ring-0"
                                placeholder="Optional details about this pod's focus or goals..."
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-4">
                            <Button type="button" variant="outline" className="h-12 px-8" onClick={() => router.push('/delivery-head/dashboard/pods')} disabled={isSubmitting}>Cancel</Button>
                            <Button type="submit" variant="default" className="h-12 px-8" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
                        </div>
                    </form>
                </DefaultCardComponent>
            </div >
        </>
    );
}
