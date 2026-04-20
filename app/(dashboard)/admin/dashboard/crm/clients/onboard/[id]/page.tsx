import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import CreateCrmClientForm from "@/components/crm/CreateCrmClientForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rectify Client Profile | enfySync",
};

export default async function AdminCrmClientEditPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  return (
    <>
      <DashboardBreadcrumb 
        title="Rectify Client Profile" 
        text="Administrative update and completion of the business relationship details." 
      />
      <div className="p-6">
        <CreateCrmClientForm 
          basePath="/admin/dashboard/crm/clients" 
          isAdmin={true} 
          clientId={id}
          isEdit={true}
        />
      </div>
    </>
  );
}
