import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import CrmClientList from "@/components/crm/CrmClientList";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Portfolio | Admin | enfySync",
};

export default function AdminCrmClientsPage() {
  return (
    <>
      <DashboardBreadcrumb 
        title="Client Portfolio" 
        text="Manage all enterprise relationships and onboard new clients." 
      />
      <div className="p-6">
        <CrmClientList 
          basePath="/admin/dashboard/crm/clients" 
          isAdminView={true} 
        />
      </div>
    </>
  );
}
