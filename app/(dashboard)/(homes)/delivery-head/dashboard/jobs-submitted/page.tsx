"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import SubmittedJobsTable, { CandidateSubmission } from "@/components/dashboard/recruiter/SubmittedJobsTable";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";

export default function DeliveryHeadSubmittedJobsPage() {
    const { status } = useSession();
    const [submissions, setSubmissions] = useState<CandidateSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchSubmissions = async () => {
        setIsLoading(true);
        setError("");

        try {
            // Optimization: Fetch all 230+ submissions in one go (limit 500 is safe for this volume)
            // This prevents the "Machine Gun" parallel request loop that was causing the hang.
            const response = await apiClient("/recruiter-submissions?page=1&limit=500");
            if (!response.ok) {
                throw new Error("Failed to fetch submitted jobs");
            }

            const result = await response.json();
            const allSubmissions = Array.isArray(result?.data)
                ? result.data
                : (Array.isArray(result?.submissions) ? result.submissions : (Array.isArray(result) ? result : []));

            console.log("Fetched total submissions:", allSubmissions.length);
            setSubmissions(allSubmissions);
        } catch (err: any) {
            console.error("Fetch submissions error:", err);
            setError(err.message || "An error occurred while fetching submissions");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (status === "authenticated") {
            fetchSubmissions();
        } else if (status === "unauthenticated") {
            setIsLoading(false);
        }
    }, [status]);

    if (status === "loading") {
        return null;
    }

    return (
        <>
            <DashboardBreadcrumb title="Submitted Candidates" text="Job Management" />
            <div className="p-6 bg-gray-50 min-h-[calc(100vh-4rem)]">
                <div className="max-w-[96rem] mx-auto space-y-6">
                    {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                                 Candidates Pipeline
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                View and track the status of candidates submitted for your jobs.
                            </p>
                        </div>
                    </div> */}

                    {error && (
                        <div className="p-4 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-neutral-50/50 dark:bg-slate-800/20 rounded-xl border border-neutral-200 dark:border-slate-700">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                            <p className="text-sm text-neutral-500 font-medium">Loading submissions...</p>
                        </div>
                    ) : (
                        <SubmittedJobsTable
                            submissions={submissions}
                            showExtendedDetails={true}
                            baseUrl="/delivery-head/dashboard/jobs"
                            statsMode="cleared"
                        />
                    )}
                </div>
            </div>
        </>
    );
}
