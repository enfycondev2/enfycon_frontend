import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import CreateCrmClientForm from "@/components/crm/CreateCrmClientForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Onboarding | enfySync",
};

export default function AmCrmClientCreatePage() {
  return (
    <>
      <DashboardBreadcrumb 
        title="New Relationship" 
        text="Onboard a new client and start tracking your interactions." 
      />
      <div className="p-6">
        <CreateCrmClientForm 
          basePath="/account-manager/dashboard/crm/clients" 
          isAdmin={false} 
        />
      </div>
    </>
  );
}
