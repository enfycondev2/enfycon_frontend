import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import RecruiterJobsClient from "./RecruiterJobsClient";

export const dynamic = 'force-dynamic';

export default function PodLeadJobsPage() {
    return (
        <>
            <DashboardBreadcrumb title="Available Jobs" text="Pod Lead Dashboard" />
            <div className="p-6">
                <RecruiterJobsClient />
            </div>
        </>
    );
}
