import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { serverApiClient } from "@/lib/serverApiClient";
import TeamJobsClient from "./TeamJobsClient";

export const dynamic = "force-dynamic";

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
    const teamMembers = await getTeamMembers();
    const teamMemberIds = teamMembers.map((m: any) => m.id);

    return (
        <>
            <DashboardBreadcrumb title="Team Assigned Jobs" text="Pod Lead Dashboard" />
            <div className="p-6">
                <TeamJobsClient teamMemberIds={teamMemberIds} />
            </div>
        </>
    );
}
