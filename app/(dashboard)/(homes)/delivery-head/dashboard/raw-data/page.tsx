"use client";

import * as React from "react";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import DefaultCardComponent from "@/app/(dashboard)/components/default-card-component";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";
import { Download, Loader2, Calendar, Filter, FileSpreadsheet } from "lucide-react";

interface AccountManager {
  id: string;
  fullName: string;
  email: string;
}

export default function RawDataExportPage() {
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [status, setStatus] = React.useState("ALL");
  const [amId, setAmId] = React.useState("ALL");
  const [accountManagers, setAccountManagers] = React.useState<AccountManager[]>([]);
  const [isFetchingAms, setIsFetchingAms] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);

  React.useEffect(() => {
    async function fetchAccountManagers() {
      try {
        const res = await apiClient("/auth/account-managers");
        if (res.ok) {
          const data = await res.json();
          setAccountManagers(Array.isArray(data) ? data : []);
        } else {
          console.error("Failed to fetch account managers");
        }
      } catch (error) {
        console.error("Error fetching account managers:", error);
      } finally {
        setIsFetchingAms(false);
      }
    }

    fetchAccountManagers();
  }, []);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExporting(true);

    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (status && status !== "ALL") params.append("finalStatus", status);
      if (amId && amId !== "ALL") params.append("accountManagerId", amId);

      const downloadUrl = `/recruiter-submissions/export?${params.toString()}`;
      
      const response = await apiClient(downloadUrl);
      if (!response.ok) {
        throw new Error("Failed to export spreadsheet");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const formattedDate = new Date().toISOString().split("T")[0];
      link.setAttribute("download", `enfysync_raw_report_${formattedDate}.xlsx`);
      
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Excel report generated successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to generate Excel report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <DashboardBreadcrumb title="Raw Data Export" text="Reports" />
      <div className="p-6 max-w-4xl space-y-6">
        <DefaultCardComponent title="Export Parameters">
          <form className="space-y-6" onSubmit={handleExport}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Date Filters */}
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-sm font-medium text-[#4b5563] dark:text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Start Date
                </Label>
                <Input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-neutral-300 dark:border-slate-500 focus:border-primary h-12 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-sm font-medium text-[#4b5563] dark:text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  End Date
                </Label>
                <Input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-neutral-300 dark:border-slate-500 focus:border-primary h-12 rounded-lg"
                />
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium text-[#4b5563] dark:text-white flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  Candidate Status
                </Label>
                <Select onValueChange={setStatus} value={status}>
                  <SelectTrigger className="border border-neutral-300 dark:border-slate-500 focus:border-primary h-12 rounded-lg bg-transparent text-left w-full">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PLACED">Placed (Offer + Join)</SelectItem>
                    <SelectItem value="JOIN">Joined Only</SelectItem>
                    <SelectItem value="OFFER">Offered Only</SelectItem>
                    <SelectItem value="SUBMITTED">Submitted / Pending</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Account Manager Filter */}
              <div className="space-y-2">
                <Label htmlFor="accountManager" className="text-sm font-medium text-[#4b5563] dark:text-white flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  Account Manager
                </Label>
                <Select onValueChange={setAmId} value={amId} disabled={isFetchingAms}>
                  <SelectTrigger className="border border-neutral-300 dark:border-slate-500 focus:border-primary h-12 rounded-lg bg-transparent text-left w-full">
                    <SelectValue placeholder={isFetchingAms ? "Loading AMs..." : "Select Account Manager"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Account Managers</SelectItem>
                    {accountManagers.map((am) => (
                      <SelectItem key={am.id} value={am.id}>
                        {am.fullName || am.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>

            {/* Export Details info box */}
            <div className="p-4 bg-muted/40 border border-neutral-200 dark:border-slate-700 rounded-lg flex items-start gap-3">
              <FileSpreadsheet className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-[#1f2937] dark:text-white">Export Dataset Info</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The generated Excel sheet integrates client profiles, active job orders, and candidate submissions. It includes submission date, recruiter comments, interview stage details, and final candidate statuses.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-slate-700">
              <Button
                type="submit"
                variant="default"
                className="h-12 px-8 flex items-center gap-2 min-w-[200px]"
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export Excel Sheet
                  </>
                )}
              </Button>
            </div>
          </form>
        </DefaultCardComponent>
      </div>
    </>
  );
}
