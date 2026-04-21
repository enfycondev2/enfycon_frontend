"use client";

import React, { useState } from "react";
import { 
  UserCircle, 
  Briefcase, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  Loader2 
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const roles = [
  {
    id: "Recruiter",
    title: "Recruiter",
    description: "Manage candidate pipelines and job postings.",
    icon: UserCircle,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    id: "Account manager",
    title: "Account Manager",
    description: "Handle client relationships and requirements.",
    icon: Briefcase,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
  {
    id: "Delivery Head",
    title: "Delivery Head",
    description: "Oversee overall delivery and team performance.",
    icon: Users,
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
];

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedRole) {
      toast.error("Please select a role first");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient("/auth/request-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!res.ok) throw new Error("Failed to request role");

      toast.success("Role requested successfully!");
      // Force a refresh to show the "Hang Tight" screen
      window.location.reload();
    } catch (error) {
      console.error("Error requesting role:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] w-full items-center justify-center p-4 bg-slate-50/50 dark:bg-transparent">
      <div className="w-full max-w-4xl animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-neutral-800 dark:text-white tracking-tight mb-2">
            Welcome to Enfysync
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-lg">
            Please select your primary role to get started with your workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={cn(
                "relative flex flex-col items-center p-8 rounded-3xl transition-all duration-300 border-2 text-left group",
                selectedRole === role.id
                  ? "border-primary bg-white dark:bg-slate-800 shadow-xl scale-[1.02] ring-4 ring-primary/5"
                  : "border-neutral-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:border-neutral-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800"
              )}
            >
              {selectedRole === role.id && (
                <div className="absolute top-4 right-4 text-primary animate-in zoom-in duration-300">
                  <CheckCircle2 className="w-6 h-6 fill-primary text-white" />
                </div>
              )}
              
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 shadow-sm",
                role.bg
              )}>
                <role.icon className={cn("w-8 h-8", role.color)} />
              </div>

              <h3 className="text-xl font-bold text-neutral-800 dark:text-white mb-2">
                {role.title}
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed text-center">
                {role.description}
              </p>
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleSubmit}
            disabled={!selectedRole || isSubmitting}
            size="lg"
            className="h-14 px-10 rounded-2xl text-lg font-bold group shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all min-w-[240px]"
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
            ) : (
              <>
                Confirm Selection
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
