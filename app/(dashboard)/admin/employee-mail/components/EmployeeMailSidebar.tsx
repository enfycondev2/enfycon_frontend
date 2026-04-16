"use client";

import { useEmployeeMail } from "@/contexts/EmployeeMailContext";
import { useEmailSidebar } from "@/contexts/email-sidebar-context";
import { cn } from "@/lib/utils";
import { Search, Mail, Send, Pencil, Trash2, User, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const EmployeeMailSidebar = () => {
  const { isSidebarOpen } = useEmailSidebar();
  const { 
    employees, 
    selectedEmployee, 
    setSelectedEmployee, 
    folders, 
    activeFolderId, 
    setActiveFolderId 
  } = useEmployeeMail();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEmployees = employees.filter(emp => 
    emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={cn(
      "email-sidebar h-full p-4 border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md absolute left-0 top-0 z-[10] xl:static w-[300px] flex flex-col gap-6",
      isSidebarOpen ? "block shadow-2xl" : "hidden xl:flex"
    )}>
      {/* Employee Selector Section */}
      <div className="flex flex-col gap-3">
        <h6 className="text-xs font-bold uppercase tracking-wider text-slate-500">Personnel</h6>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search employee..."
            className="pl-9 bg-slate-100/50 border-0 focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
          {filteredEmployees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => setSelectedEmployee(emp)}
              className={cn(
                "flex items-center gap-3 p-2 rounded-xl transition-all duration-200 group text-left",
                selectedEmployee?.id === emp.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]" 
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              )}
            >
              <Avatar className="h-8 w-8 border-2 border-white/20">
                <AvatarImage src={emp.profilePicture || ""} />
                <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-[10px]">
                  {emp.fullName?.split(" ").map(n => n[0]).join("") || emp.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">{emp.fullName || emp.email}</p>
                <p className={cn("text-[10px] truncate", selectedEmployee?.id === emp.id ? "text-white/70" : "text-slate-400")}>
                  {emp.email}
                </p>
              </div>
              {selectedEmployee?.id === emp.id && <ChevronRight className="w-4 h-4 opacity-70" />}
            </button>
          ))}
          {filteredEmployees.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">No employees found</p>
          )}
        </div>
      </div>

      <div className="h-px bg-slate-200 dark:bg-slate-800 mx-2" />

      {/* Folders Section */}
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
        <h6 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {selectedEmployee ? "Mailboxes" : "Select an Employee"}
        </h6>
        
        {selectedEmployee ? (
          <ul className="flex flex-col gap-1">
            {folders.length > 0 ? folders.map((folder) => (
              <li key={folder.id}>
                <button
                  onClick={() => setActiveFolderId(folder.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group",
                    activeFolderId === folder.id
                      ? "bg-slate-100 dark:bg-slate-800 text-primary font-bold shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      activeFolderId === folder.id ? "bg-primary/10" : "bg-slate-100 dark:bg-slate-800 group-hover:bg-white"
                    )}>
                       {getFolderIcon(folder.displayName, activeFolderId === folder.id)}
                    </span>
                    <span className="text-sm">{folder.displayName}</span>
                  </div>
                  {folder.unreadItemCount > 0 && (
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold",
                      activeFolderId === folder.id ? "bg-primary text-white" : "bg-slate-200 dark:bg-slate-700"
                    )}>
                      {folder.unreadItemCount}
                    </span>
                  )}
                </button>
              </li>
            )) : (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />)}
              </div>
            )}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-400 opacity-50">
            <Mail className="w-12 h-12 stroke-[1px]" />
            <p className="text-xs text-center">Choose an account to start reading emails</p>
          </div>
        )}
      </div>
    </div>
  );
};

const getFolderIcon = (name: string, isActive: boolean) => {
  const iconClass = cn("w-4 h-4", isActive ? "text-primary" : "text-slate-400");
  const lowName = name.toLowerCase();
  if (lowName.includes("inbox")) return <Mail className={iconClass} />;
  if (lowName.includes("sent")) return <Send className={iconClass} />;
  if (lowName.includes("draft")) return <Pencil className={iconClass} />;
  if (lowName.includes("trash") || lowName.includes("deleted")) return <Trash2 className={iconClass} />;
  return <ChevronRight className={iconClass} />;
};

export default EmployeeMailSidebar;
