"use client";

import { useState, useEffect } from "react";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { apiClient } from "@/lib/apiClient";
import { Crown, Users } from "lucide-react";

interface PodHoverCardProps {
    podId: string;
    podName: string;
    initialMembers?: any[];
    children: React.ReactNode;
}

export function PodHoverCard({ podId, podName, initialMembers, children }: PodHoverCardProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [podDetails, setPodDetails] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && !podDetails && !loading && !error) {
            setLoading(true);
            apiClient(`/pods/${podId}`)
                .then(async (res) => {
                    if (!res.ok) throw new Error("Failed to load pod details");
                    return res.json();
                })
                .then(setPodDetails)
                .catch((err) => {
                    setError(err.message || "Failed to load pod details");
                })
                .finally(() => setLoading(false));
        }
    }, [open, podId, podDetails, loading, error]);

    const podLead = podDetails?.podHead;

    return (
        <HoverCard open={open} onOpenChange={setOpen} openDelay={200} closeDelay={200}>
            <HoverCardTrigger asChild>
                {children}
            </HoverCardTrigger>
            <HoverCardContent className="w-52 p-3" side="top" align="start">
                <div className="flex flex-col gap-2">
                    {/* Pod name */}
                    <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{podName}</span>
                    </div>

                    {/* Pod lead */}
                    {loading && (
                        <p className="text-xs text-neutral-400 italic">Loading...</p>
                    )}
                    {!loading && podLead && (
                        <div className="flex items-start gap-1.5 pt-0.5 border-t border-neutral-100 dark:border-slate-700">
                            <Crown className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">Pod Lead</span>
                                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200 truncate">
                                    {podLead.fullName || podLead.email}
                                </span>
                                {podLead.fullName && (
                                    <span className="text-[10px] text-neutral-400 truncate">{podLead.email}</span>
                                )}
                            </div>
                        </div>
                    )}
                    {!loading && !error && podDetails && !podLead && (
                        <p className="text-xs text-neutral-400 italic border-t border-neutral-100 dark:border-slate-700 pt-1.5">No pod lead assigned</p>
                    )}
                    {error && (
                        <p className="text-xs text-red-400 italic">{error}</p>
                    )}
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}
