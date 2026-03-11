import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import AssignedJobsClient from "./AssignedJobsClient";

export const dynamic = "force-dynamic";

export default function RecruiterAssignedJobsPage() {
    return (
        <>
            <DashboardBreadcrumb title="Assigned Jobs" text="Job Management" />
            <div className="p-6">
                <AssignedJobsClient />
            </div>
        </>
    );
}
