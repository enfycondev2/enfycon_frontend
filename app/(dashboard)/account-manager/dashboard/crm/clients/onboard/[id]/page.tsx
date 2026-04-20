import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import CreateCrmClientForm from "@/components/crm/CreateCrmClientForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rectify Client Profile | enfySync",
};

export default async function AmCrmClientEditPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  return (
    <>
      <DashboardBreadcrumb 
        title="Rectify Client Profile" 
        text="Update and complete the business information for this relationship." 
      />
      <div className="p-6">
        <CreateCrmClientForm 
          basePath="/account-manager/dashboard/crm/clients" 
          isAdmin={false} 
          clientId={id}
          isEdit={true}
        />
      </div>
    </>
  );
}
