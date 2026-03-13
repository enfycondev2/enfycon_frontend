import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import AssignedJobsClient from "./AssignedJobsClient";

export const dynamic = "force-dynamic";

export default function PodLeadAssignedJobsPage() {
    return (
        <>
            <DashboardBreadcrumb title="Assigned Jobs" text="Pod Lead Dashboard" />
            <div className="p-6">
                <AssignedJobsClient />
            </div>
        </>
    );
}
