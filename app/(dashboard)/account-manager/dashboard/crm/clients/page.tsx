import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import CrmClientList from "@/components/crm/CrmClientList";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Clients | enfySync",
};

export default function AmCrmClientsPage() {
  return (
    <>
      <DashboardBreadcrumb 
        title="My Clients" 
        text="Hand-shake, manage, and grow your assigned client relationships." 
      />
      <div className="p-6">
        <CrmClientList 
          basePath="/account-manager/dashboard/crm/clients" 
          isAdminView={false} 
        />
      </div>
    </>
  );
}
