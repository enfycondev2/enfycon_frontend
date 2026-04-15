import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import CreateCrmClientForm from "@/components/crm/CreateCrmClientForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboard Client | Admin | enfySync",
};

export default function AdminCrmClientCreatePage() {
  return (
    <>
      <DashboardBreadcrumb 
        title="Client Onboarding" 
        text="Initialize a new enterprise partnership and assign ownership." 
      />
      <div className="p-6">
        <CreateCrmClientForm 
          basePath="/admin/dashboard/crm/clients" 
          isAdmin={true} 
        />
      </div>
    </>
  );
}
