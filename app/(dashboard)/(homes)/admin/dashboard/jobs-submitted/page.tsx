"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import SubmittedJobsTable, { CandidateSubmission } from "@/components/dashboard/recruiter/SubmittedJobsTable";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";

export default function AdminJobsSubmittedPage() {
    const { status } = useSession();
    const [submissions, setSubmissions] = useState<CandidateSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchSubmissions = async () => {
        setIsLoading(true);
        setError("");

        try {
            const firstResponse = await apiClient("/recruiter-submissions?page=1&limit=100");
            if (!firstResponse.ok) {
                throw new Error("Failed to fetch submitted jobs");
            }

            const firstData = await firstResponse.json();
            let allSubmissions = Array.isArray(firstData?.data)
                ? firstData.data
                : (Array.isArray(firstData?.submissions) ? firstData.submissions : (Array.isArray(firstData) ? firstData : []));

            const totalPages = firstData?.totalPages || 1;
            if (totalPages > 1) {
                const promises = [];
                for (let i = 2; i <= totalPages; i++) {
                    promises.push(apiClient(`/recruiter-submissions?page=${i}&limit=100`).then(res => res.json()));
                }
                const results = await Promise.all(promises);
                results.forEach(res => {
                    const arr = Array.isArray(res?.data)
                        ? res.data
                        : (Array.isArray(res?.submissions) ? res.submissions : (Array.isArray(res) ? res : []));
                    allSubmissions = [...allSubmissions, ...arr];
                });
            }

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
            <DashboardBreadcrumb title="Submitted Candidates" text="Admin Dashboard" />
            <div className="p-6 bg-gray-50 min-h-[calc(100vh-4rem)]">
                <div className="max-w-[96rem] mx-auto space-y-6">
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
                            baseUrl="/admin/dashboard/jobs"
                            onUpdate={fetchSubmissions}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
