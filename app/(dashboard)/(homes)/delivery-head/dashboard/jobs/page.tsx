import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { auth } from "@/auth";
import JobsTable from "@/components/dashboard/account-manager/JobsTable";
import { serverApiClient } from "@/lib/serverApiClient";

export const dynamic = 'force-dynamic';

async function getJobs() {
    try {
        const response = await serverApiClient("/jobs", {
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error("Failed to fetch jobs. Status:", response.status);
            return [];
        }

        const data = await response.json();
        const jobs = Array.isArray(data) ? data : (data?.data ?? data?.content ?? data?.jobs ?? []);
        return Array.isArray(jobs) ? jobs : [];
    } catch (error) {
        console.error("Error fetching jobs:", error);
        return [];
    }
}

export default async function DeliveryHeadJobsPage() {
    const jobs = await getJobs();

    return (
        <>
            <DashboardBreadcrumb title="All Jobs" text="Jobs" />
            <div className="p-6">
                {/* <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">All Jobs</h1>
                        <p className="mt-1 text-muted-foreground italic text-sm">Overview of all jobs posted in the system across all account managers.</p>
                    </div>
                </div> */}

                <JobsTable
                    jobs={jobs}
                    baseUrl="/delivery-head/dashboard/jobs"
                    showAccountManager={true}
                    showPod={true}
                    showActions={false}
                    showFilters={true}
                    showEstCreatedDateTime={true}
                    showCfrExtend={true}
                />
            </div>
        </>
    );
}
