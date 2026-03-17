"use client";

import { useState } from "react";
import DefaultCardComponent from "@/app/(dashboard)/components/default-card-component";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationSelect } from "@/components/shared/location-select";
import { ClientAutocomplete } from "@/components/shared/client-autocomplete";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/apiClient";
import RichTextEditor from "@/components/shared/rich-text-editor";
import { sanitizeJobDescriptionHtml } from "@/lib/jd-html";
import { MultiSelect, Option } from "@/components/shared/multi-select";

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

export default function AccountManagerCreateJobPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [location, setLocation] = useState("remote"); // Default to Remote as per user request example
    const [clientName, setClientName] = useState("");
    const [endClientName, setEndClientName] = useState("");
    const [selectedVisaTypes, setSelectedVisaTypes] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [descriptionHtml, setDescriptionHtml] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        const cleanedDescription = sanitizeJobDescriptionHtml(descriptionHtml);

        // Fire-and-forget: upsert client names in the background (won't block job creation)
        const upsertClient = (name: string, type: "CLIENT" | "END_CLIENT") => {
            if (!name?.trim()) return;
            apiClient("/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), type }),
            }).catch((err) => console.error(`Failed to upsert ${type}:`, err));
        };
        upsertClient(data.clientName as string, "CLIENT");
        upsertClient(data.endClientName as string, "END_CLIENT");

        // Prepare the payload according to the requested JSON body
        const payload = {
            jobTitle: data.jobTitle,
            jobType: data.jobType,
            jobDescription: cleanedDescription,
            jobLocation: data.jobLocation,
            visaType: selectedVisaTypes.join(","),
            clientBillRate: data.clientBillRate,
            payRate: data.payRate,
            clientName: data.clientName,
            endClientName: data.endClientName,
            noOfPositions: parseInt(data.noOfPositions as string, 10),
            submissionRequired: parseInt(data.submissionRequired as string, 10),
            urgency: data.urgency,
            accountManagerId: session?.user?.id || "",
            status: "ACTIVE",
            isDeleted: false,
            podId: "", // Added as per requested body
        };

        try {
            const response = await apiClient("/jobs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success("Job posted successfully!");
                router.push("/account-manager/dashboard/jobs");
                router.refresh();
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || "Failed to post job.");
            }
        } catch (error) {
            console.error("Error posting job:", error);
            toast.error("An error occurred while posting the job.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <DashboardBreadcrumb title="Post a New Job" text="Job Management" />
            <div className="p-6">
                <DefaultCardComponent title="Job Details">
                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="jobTitle" className="text-[#4b5563] dark:text-white mb-2">Job Title *</Label>
                                <Input type="text" id="jobTitle" name="jobTitle" className="border border-neutral-300 px-5 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary h-12 rounded-lg !shadow-none !ring-0" placeholder="e.g. Senior React Developer" required />
                            </div>

                            <div>
                                <Label htmlFor="jobType" className="text-[#4b5563] dark:text-white mb-2">Job Type *</Label>
                                <Select name="jobType" required>
                                    <SelectTrigger className="border border-neutral-300 px-5 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary !h-12 rounded-lg !shadow-none !ring-0 w-full bg-transparent text-left">
                                        <SelectValue placeholder="Select Job Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FULL_TIME">Full Time</SelectItem>
                                        <SelectItem value="PART_TIME">Part Time</SelectItem>
                                        <SelectItem value="CONTRACT">Contract</SelectItem>
                                        <SelectItem value="CONTRACT_TO_HIRE">Contract to Hire</SelectItem>
                                        <SelectItem value="TEMPORARY">Temporary</SelectItem>
                                        <SelectItem value="INTERNSHIP">Internship</SelectItem>
                                        <SelectItem value="FREELANCE">Freelance</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                         

                            <div>
                                <Label className="text-[#4b5563] dark:text-white mb-2">Client Name *</Label>
                                <ClientAutocomplete
                                    type="CLIENT"
                                    value={clientName}
                                    onChange={setClientName}
                                    required
                                />
                            </div>
                            <div>
                                <Label className="text-[#4b5563] dark:text-white mb-2">End Client Name</Label>
                                <ClientAutocomplete
                                    type="END_CLIENT"
                                    value={endClientName}
                                    onChange={setEndClientName}
                                />
                            </div>
                               <div>
                                <Label htmlFor="visaType" className="text-[#4b5563] dark:text-white mb-2">Visa Type *</Label>
                                <MultiSelect
                                    options={visaOptions}
                                    selected={selectedVisaTypes}
                                    onChange={setSelectedVisaTypes}
                                    placeholder="Select visa type(s)"
                                />
                                <input type="hidden" name="visaType" value={selectedVisaTypes.join(",")} required />
                            </div>

                            <div>
                                <Label htmlFor="location" className="text-[#4b5563] dark:text-white mb-2">Job Location *</Label>
                                <LocationSelect
                                    value={location}
                                    onChange={setLocation}
                                    placeholder="Select City or 'Remote'"
                                />
                                <input type="hidden" name="jobLocation" value={location} required />
                            </div>




                            <div>
                                <Label htmlFor="clientBillRate" className="text-[#4b5563] dark:text-white mb-2">Client Bill Rate ($/hr) *</Label>
                                <Input type="text" id="clientBillRate" name="clientBillRate" className="border border-neutral-300 px-5 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary h-12 rounded-lg !shadow-none !ring-0" placeholder="e.g. 60/hr" required />
                            </div>
                            <div>
                                <Label htmlFor="payRate" className="text-[#4b5563] dark:text-white mb-2">Pay Rate ($/hr) *</Label>
                                <Input type="text" id="payRate" name="payRate" className="border border-neutral-300 px-5 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary h-12 rounded-lg !shadow-none !ring-0" placeholder="e.g. 50/hr" required />
                            </div>
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="urgency" className="text-[#4b5563] dark:text-white mb-2">Job Type *</Label>
                                    <Select name="urgency" required>
                                        <SelectTrigger className="border border-neutral-300 px-5 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary !h-12 rounded-lg !shadow-none !ring-0 w-full bg-transparent text-left">
                                            <SelectValue placeholder="Hot, Warm, Cold" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem className="hover:bg-red-500 hover:text-white" value="HOT">HOT</SelectItem>
                                            <SelectItem className="hover:bg-yellow-500 hover:text-white" value="WARM">WARM</SelectItem>
                                            <SelectItem className="hover:bg-green-500 hover:text-white" value="COLD">COLD</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="noOfPositions" className="text-[#4b5563] dark:text-white mb-2">Number of Positions *</Label>
                                    <Input type="number" id="noOfPositions" name="noOfPositions" min="1" className="border border-neutral-300 px-5 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary h-12 rounded-lg !shadow-none !ring-0" placeholder="e.g. 2" required />
                                </div>
                                <div>
                                    <Label htmlFor="submissionRequired" className="text-[#4b5563] dark:text-white mb-2">Submission Required *</Label>
                                    <Input type="number" id="submissionRequired" name="submissionRequired" min="1" className="border border-neutral-300 px-5 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary h-12 rounded-lg !shadow-none !ring-0" placeholder="e.g. 1" required />
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label className="text-[#4b5563] dark:text-white mb-2">Job Description</Label>
                            <RichTextEditor
                                value={descriptionHtml}
                                onChange={setDescriptionHtml}
                                placeholder="Add role summary, responsibilities, must-have skills, and interview process..."
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-4">
                            <Button type="button" variant="outline" className="h-12 px-8" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
                            <Button type="submit" variant="default" className="h-12 px-8" disabled={isSubmitting}>
                                {isSubmitting ? "Posting..." : "Post Job"}
                            </Button>
                        </div>
                    </form>
                </DefaultCardComponent>
            </div>
        </>
    );
}
