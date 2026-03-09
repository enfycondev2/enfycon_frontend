import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import DeliveryHeadJobsClient from "./DeliveryHeadJobsClient";

export const dynamic = 'force-dynamic';

export default function DeliveryHeadJobsPage() {
    return (
        <>
            <DashboardBreadcrumb title="All Jobs" text="Jobs" />
            <div className="p-6">
                <DeliveryHeadJobsClient />
            </div>
        </>
    );
}
