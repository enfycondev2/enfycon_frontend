import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import RecruiterJobsClient from "./RecruiterJobsClient";

export const dynamic = 'force-dynamic';

export default function RecruiterJobsPage() {
    return (
        <>
            <DashboardBreadcrumb title="Available Jobs" text="Job Management" />
            <div className="p-6">
                <RecruiterJobsClient />
            </div>
        </>
    );
}
