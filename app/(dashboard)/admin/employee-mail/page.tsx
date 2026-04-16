"use client";

import { EmployeeMailProvider, useEmployeeMail } from "@/contexts/EmployeeMailContext";
import EmployeeMailSidebar from "./components/EmployeeMailSidebar";
import EmployeeMailList from "./components/EmployeeMailList";
import EmployeeMailViewer from "./components/EmployeeMailViewer";
import EmployeeMailComposeModal from "./components/EmployeeMailComposeModal";
import { useState } from "react";
import { CirclePlus, Search, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AdminMailPageContent = () => {
  const { selectedEmployee, refreshMessages, loading } = useEmployeeMail();
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      {/* Dynamic Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border-b border-white/20 dark:border-slate-800/50">
        <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                Corporate <span className="text-primary italic">Mailroom</span>
            </h1>
            <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <Button variant="ghost" size="sm" className="rounded-lg h-8 px-3 text-xs font-bold bg-white dark:bg-slate-700 shadow-sm">All Mail</Button>
                <Button variant="ghost" size="sm" className="rounded-lg h-8 px-3 text-xs font-bold text-slate-400">Attachments</Button>
            </div>
        </div>

        <div className="flex items-center gap-3">
            <Button 
                variant="outline" 
                size="icon" 
                onClick={refreshMessages} 
                disabled={!selectedEmployee || loading}
                className="rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50"
            >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
            <Button 
                onClick={() => setIsComposeOpen(true)}
                disabled={!selectedEmployee}
                className="rounded-xl font-black shadow-lg shadow-primary/20 h-10 px-6 bg-primary hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
            >
                <CirclePlus className="w-4 h-4 mr-2" />
                Compose
            </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <EmployeeMailSidebar />

        {/* Main Viewport */}
        <div className="flex-1 flex overflow-hidden bg-slate-50/50 dark:bg-slate-950/20 shadow-inner">
            <EmployeeMailList />
            <EmployeeMailViewer />
        </div>
      </div>

      <EmployeeMailComposeModal 
        isOpen={isComposeOpen} 
        onClose={() => setIsComposeOpen(false)} 
      />
    </div>
  );
};

export default function AdminMailPage() {
  return (
    <EmployeeMailProvider>
      <AdminMailPageContent />
    </EmployeeMailProvider>
  );
}
