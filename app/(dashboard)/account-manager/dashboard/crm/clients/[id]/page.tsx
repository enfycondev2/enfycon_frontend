import CrmClientDetails from "@/components/crm/CrmClientDetails";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Profile | enfySync",
};

export default function AmCrmClientDetailsPage() {
  return (
    <>
      <DashboardBreadcrumb 
        title="Client Engagement Profile" 
        text="Manage your relationship touchpoints and key contact history for this account." 
      />
      <div className="p-6">
        <CrmClientDetails />
      </div>
    </>
  );
}
