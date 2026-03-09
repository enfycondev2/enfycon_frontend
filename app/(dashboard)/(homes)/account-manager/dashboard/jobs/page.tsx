import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import AccountManagerJobsClient from "./AccountManagerJobsClient";

export const dynamic = "force-dynamic";

export default function AccountManagerJobsPage() {
    return (
        <>
            <DashboardBreadcrumb title="My Posted Jobs" text="Job Management" />
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">My Posted Jobs</h1>
                        <p className="mt-1 text-muted-foreground italic text-sm">List of past posted jobs, allowing updates to status and properties.</p>
                    </div>
                    <Button asChild className="h-10 px-4">
                        <Link href="/account-manager/dashboard/jobs/create">
                            <Plus className="h-4 w-4 mr-2" />
                            Post a New Job
                        </Link>
                    </Button>
                </div>
                <AccountManagerJobsClient />
            </div>
        </>
    );
}
