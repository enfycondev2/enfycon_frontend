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
    
    // Controlled form states
    const [jobTitle, setJobTitle] = useState("");
    const [jobType, setJobType] = useState("FULL_TIME");
    const [location, setLocation] = useState("remote");
    const [clientName, setClientName] = useState("");
    const [endClientName, setEndClientName] = useState("");
    const [selectedVisaTypes, setSelectedVisaTypes] = useState<string[]>([]);
    const [clientBillRate, setClientBillRate] = useState("");
    const [payRate, setPayRate] = useState("");
    const [urgency, setUrgency] = useState("WARM");
    const [noOfPositions, setNoOfPositions] = useState("1");
    const [submissionRequired, setSubmissionRequired] = useState("1");
    const [descriptionHtml, setDescriptionHtml] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [jdText, setJdText] = useState("");

    const handleAutoFill = async () => {
        if (!jdText.trim()) {
            toast.error("Please paste a Job Description first.");
            return;
        }

        setIsAutoFilling(true);
        try {
            const res = await apiClient("/jobs/auto-fill-jd", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: jdText }),
            });

            if (res.ok) {
                const data = await res.json();
                const fill = data.autoFilledData;

                setJobTitle(fill.jobTitle || "");
                setJobType(fill.jobType || "FULL_TIME");
                setClientName(fill.clientName || "");
                setEndClientName(fill.endClientName || "");
                setClientBillRate(fill.clientBillRate || "");
                setPayRate(fill.payRate || "");
                setUrgency(fill.urgency || "WARM");
                setNoOfPositions(fill.noOfPositions?.toString() || "1");
                setSubmissionRequired(fill.submissionRequired?.toString() || "1");
                
                setLocation(fill.jobLocation || "remote");
                setSelectedVisaTypes(fill.visaType ? fill.visaType.split(",").map((v: string) => v.trim().toUpperCase()) : []);
                setDescriptionHtml(fill.jobDescription || jdText);

                toast.success("Form auto-filled successfully!");
            } else {
                toast.error("Failed to parse JD.");
            }
        } catch (err) {
            console.error("Auto-fill error:", err);
            toast.error("An error occurred during auto-fill.");
        } finally {
            setIsAutoFilling(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const cleanedDescription = sanitizeJobDescriptionHtml(descriptionHtml);

        // Fire-and-forget: upsert client names in the background
        const upsertClient = (name: string, type: "CLIENT" | "END_CLIENT") => {
            if (!name?.trim()) return;
            apiClient("/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), type }),
            }).catch((err) => console.error(`Failed to upsert ${type}:`, err));
        };
        upsertClient(clientName, "CLIENT");
        upsertClient(endClientName, "END_CLIENT");

        const payload = {
            jobTitle,
            jobType,
            jobDescription: cleanedDescription,
            jobLocation: location,
            visaType: selectedVisaTypes.join(","),
            clientBillRate,
            payRate,
            clientName,
            endClientName,
            noOfPositions: parseInt(noOfPositions, 10),
            submissionRequired: parseInt(submissionRequired, 10),
            urgency,
            accountManagerId: session?.user?.id || "",
            status: "ACTIVE",
            isDeleted: false,
            podId: "",
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
                    {/* Magic Auto-fill Section */}
                    <div className="mb-8 p-6 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/10 dark:to-blue-950/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/20 shadow-sm overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 dark:text-indigo-400 font-bold"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                        </div>
                        
                        <div className="flex items-center gap-2.5 mb-4 relative z-10">
                            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg ring-4 ring-indigo-500/10 transition-transform hover:scale-110">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-indigo-950 dark:text-indigo-200 tracking-tight uppercase flex items-center gap-2">
                                    AI Magic Auto-Fill
                                    <span className="text-[10px] px-2 py-0.5 bg-indigo-600 text-white font-bold rounded-full">BETA</span>
                                </h3>
                                <p className="text-[11px] text-indigo-700/70 dark:text-indigo-400/60 font-semibold">Speed up job posting with our NLP engine</p>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 relative z-10">
                            <textarea
                                className="flex-1 min-h-[140px] p-4 text-sm rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white/95 dark:bg-slate-950/80 backdrop-blur-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none shadow-sm placeholder:text-indigo-300 dark:placeholder:text-indigo-800"
                                placeholder="📋 Paste the raw Job Description here... our AI will extract fields and populate the form automatically."
                                value={jdText}
                                onChange={(e) => setJdText(e.target.value)}
                            />
                            <Button
                                type="button"
                                onClick={handleAutoFill}
                                disabled={isAutoFilling}
                                className="h-auto md:w-36 py-6 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 dark:shadow-indigo-950/40 border-none transition-all hover:scale-[1.02] active:scale-[0.98] font-black flex flex-col gap-2 items-center justify-center shrink-0 group rounded-xl"
                            >
                                {isAutoFilling ? (
                                    <>
                                        <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span className="text-[10px] uppercase tracking-widest font-black">Parsing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-2xl transition-transform group-hover:rotate-12">✨</span>
                                        <span className="text-[10px] uppercase tracking-widest font-black">Auto-fill Form</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Row 1 */}
                            <div>
                                <Label htmlFor="jobTitle" className="text-[#4b5563] dark:text-white mb-2 font-bold">Job Title *</Label>
                                <Input 
                                    type="text" id="jobTitle" name="jobTitle" required
                                    className="border border-neutral-300 px-5 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary h-12 rounded-lg !shadow-none !ring-0" 
                                    placeholder="e.g. Senior React Developer" 
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="jobType" className="text-[#4b5563] dark:text-white mb-2 font-bold">Job Type *</Label>
                                <Select value={jobType} onValueChange={setJobType} required>
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

                            {/* Row 2 */}
                            <div>
                                <Label className="text-[#4b5563] dark:text-white mb-2 font-bold">Client Name *</Label>
                                <ClientAutocomplete
                                    type="CLIENT"
                                    value={clientName}
                                    onChange={setClientName}
                                    required
                                />
                            </div>
                            <div>
                                <Label className="text-[#4b5563] dark:text-white mb-2 font-bold">End Client Name</Label>
                                <ClientAutocomplete
                                    type="END_CLIENT"
                                    value={endClientName}
                                    onChange={setEndClientName}
                                />
                            </div>

                            {/* Row 3 */}
                            <div>
                                <Label htmlFor="visaType" className="text-[#4b5563] dark:text-white mb-2 font-bold">Visa Type *</Label>
                                <MultiSelect
                                    options={visaOptions}
                                    selected={selectedVisaTypes}
                                    onChange={setSelectedVisaTypes}
                                    placeholder="Select visa type(s)"
                                />
                            </div>

                            <div>
                                <Label htmlFor="location" className="text-[#4b5563] dark:text-white mb-2 font-bold">Job Location *</Label>
                                <LocationSelect
                                    value={location}
                                    onChange={setLocation}
                                    placeholder="Select City or 'Remote'"
                                />
                            </div>

                            {/* Row 4 */}
                            <div>
                                <Label htmlFor="clientBillRate" className="text-[#4b5563] dark:text-white mb-2 font-bold">Client Bill Rate ($/hr) *</Label>
                                <Input 
                                    type="text" id="clientBillRate" name="clientBillRate" required
                                    className="border border-neutral-300 px-5 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary h-12 rounded-lg !shadow-none !ring-0" 
                                    placeholder="e.g. 60/hr" 
                                    value={clientBillRate}
                                    onChange={(e) => setClientBillRate(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="payRate" className="text-[#4b5563] dark:text-white mb-2 font-bold">Pay Rate ($/hr) *</Label>
                                <Input 
                                    type="text" id="payRate" name="payRate" required
                                    className="border border-neutral-300 px-5 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary h-12 rounded-lg !shadow-none !ring-0" 
                                    placeholder="e.g. 50/hr" 
                                    value={payRate}
                                    onChange={(e) => setPayRate(e.target.value)}
                                />
                            </div>

                            {/* Row 5 - Multi-column Row */}
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <Label htmlFor="urgency" className="text-[#4b5563] dark:text-white mb-2 font-bold">Urgency *</Label>
                                    <Select value={urgency} onValueChange={setUrgency} required>
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
                                    <Label htmlFor="noOfPositions" className="text-[#4b5563] dark:text-white mb-2 font-bold">Number of Positions *</Label>
                                    <Input 
                                        type="number" id="noOfPositions" name="noOfPositions" min="1" required
                                        className="border border-neutral-300 px-5 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary h-12 rounded-lg !shadow-none !ring-0" 
                                        placeholder="e.g. 2" 
                                        value={noOfPositions}
                                        onChange={(e) => setNoOfPositions(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="submissionRequired" className="text-[#4b5563] dark:text-white mb-2 font-bold">Submission Required *</Label>
                                    <Input 
                                        type="number" id="submissionRequired" name="submissionRequired" min="1" required
                                        className="border border-neutral-300 px-5 dark:border-slate-500 focus:border-primary dark:focus:border-primary focus-visible:border-primary h-12 rounded-lg !shadow-none !ring-0" 
                                        placeholder="e.g. 1" 
                                        value={submissionRequired}
                                        onChange={(e) => setSubmissionRequired(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Description Section */}
                        <div className="mt-2">
                            <Label className="text-[#4b5563] dark:text-white mb-2 font-bold">Job Description</Label>
                            <RichTextEditor
                                value={descriptionHtml}
                                onChange={setDescriptionHtml}
                                placeholder="Add role summary, responsibilities, must-have skills, and interview process..."
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-4 mt-6">
                            <Button type="button" variant="outline" className="h-12 px-10 border-neutral-300 dark:border-slate-700" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
                            <Button type="submit" variant="default" className="h-12 px-10 dark:bg-primary dark:text-white font-bold" disabled={isSubmitting}>
                                {isSubmitting ? "Posting..." : "Post Job"}
                            </Button>
                        </div>
                    </form>
                </DefaultCardComponent>
            </div>
        </>
    );
}
