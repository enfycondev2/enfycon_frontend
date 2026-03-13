"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import SubmittedJobsTable, { CandidateSubmission } from "@/components/dashboard/recruiter/SubmittedJobsTable";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";

export default function AccountManagerSubmittedJobsPage() {
    const { data: session, status } = useSession();
    const [submissions, setSubmissions] = useState<CandidateSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchSubmissions = async () => {
        setIsLoading(true);
        setError("");

        try {
            const userId = (session?.user as any)?.id;

            // Fetch all jobs and all submissions in parallel
            const [jobsRes, subsRes] = await Promise.all([
                apiClient("/jobs"),
                apiClient("/recruiter-submissions"),
            ]);

            if (!jobsRes.ok || !subsRes.ok) {
                throw new Error("Failed to fetch data");
            }

            const jobsData = await jobsRes.json();
            const subsData = await subsRes.json();

            // /jobs returns { data: [...] }
            const allJobs: { id: string; accountManagerId?: string }[] =
                Array.isArray(jobsData?.data) ? jobsData.data : [];

            // Keep only jobs where this user is the account manager
            const myJobIds = new Set(
                allJobs
                    .filter((j) => j.accountManagerId === userId)
                    .map((j) => j.id)
            );

            // Filter submissions to only this AM's jobs
            const allSubs: CandidateSubmission[] = Array.isArray(subsData)
                ? subsData
                : (subsData?.data ?? subsData?.submissions ?? []);

            const mySubs = allSubs.filter((s: any) => s.jobId && myJobIds.has(s.jobId));
            setSubmissions(mySubs);
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
            <DashboardBreadcrumb title="Submitted Jobs" text="Job Management" />
            <div className="p-6 bg-gray-50 min-h-[calc(100vh-4rem)]">
                <div className="space-y-6">
                    {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                                Submitted Candidates
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                View and track the status of candidates submitted for your posted jobs.
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
                            baseUrl="/account-manager/dashboard/jobs"
                            showExtendedDetails={true} 
                            onUpdate={fetchSubmissions} 
                        />
                    )}
                </div>
            </div>
        </>
    );
}
