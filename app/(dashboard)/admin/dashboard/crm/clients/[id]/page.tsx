import CrmClientDetails from "@/components/crm/CrmClientDetails";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Profile | Admin | enfySync",
};

export default function AdminCrmClientDetailsPage() {
  return (
    <>
      <DashboardBreadcrumb 
        title="Client Profile" 
        text="Comprehensive view of relationship history, key contacts, and strategic notes." 
      />
      <div className="p-6">
        <CrmClientDetails />
      </div>
    </>
  );
}
