import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import AdminJobsClient from "./AdminJobsClient";

export const dynamic = "force-dynamic";

export default function AdminAllJobsPage() {
  return (
    <>
      <DashboardBreadcrumb title="All Jobs" text="Admin Dashboard" />
      <div className="p-6">
        <AdminJobsClient />
      </div>
    </>
  );
}
