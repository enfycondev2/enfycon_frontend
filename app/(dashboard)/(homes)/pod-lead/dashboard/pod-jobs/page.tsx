import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import RecruiterJobsTable from "@/components/dashboard/recruiter/RecruiterJobsTable";
import { serverApiClient } from "@/lib/serverApiClient";

export const dynamic = "force-dynamic";

async function getTeamJobs() {
    try {
        const response = await serverApiClient("/jobs", { cache: "no-store" });
        if (!response.ok) {
            console.error("Failed to fetch team jobs. Status:", response.status);
            return [];
        }
        const data = await response.json();
        return Array.isArray(data?.data) ? data.data : [];
    } catch (error) {
        console.error("Error fetching team jobs:", error);
        return [];
    }
}

async function getTeamMembers() {
    try {
        const response = await serverApiClient("/pods/my-team", { cache: "no-store" });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : (data?.members ?? data?.recruiters ?? []);
    } catch {
        return [];
    }
}

export default async function PodLeadTeamJobsPage() {
    const [allJobs, teamMembers] = await Promise.all([
        getTeamJobs(),
        getTeamMembers()
    ]);

    // Create a Set of team member IDs for O(1) lookups
    const teamMemberIds = new Set(teamMembers.map((m: any) => m.id));

    // Filter jobs: only keep jobs where at least one assigned recruiter is in our team
    const jobs = allJobs.filter((job: any) => {
        if (!job.assignedRecruiters || job.assignedRecruiters.length === 0) return false;
        return job.assignedRecruiters.some((rec: any) => teamMemberIds.has(rec.id));
    });

    return (
        <>
            <DashboardBreadcrumb title="Team Assigned Jobs" text="Pod Lead Dashboard" />
            <div className="p-6">
                <RecruiterJobsTable
                    jobs={jobs}
                    baseUrl="/pod-lead/dashboard/jobs"
                />
            </div>
        </>
    );
}
