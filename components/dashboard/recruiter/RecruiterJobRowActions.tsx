"use client";

import React from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Eye, ExternalLink, Copy, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface RecruiterJobRowActionsProps {
    jobId: string;
    jobCode: string;
    baseUrl: string;
    onAssign?: () => void;
    onSubmission?: () => void;
    canAssign?: boolean;
    isCfr?: boolean;
    isClosed?: boolean;
}

export default function RecruiterJobRowActions({
    jobId,
    jobCode,
    baseUrl,
    onAssign,
    onSubmission,
    canAssign,
    isCfr,
    isClosed,
}: RecruiterJobRowActionsProps) {
    const copyJobLink = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}${baseUrl}/${jobId}`;
        navigator.clipboard.writeText(url);
        toast.success("Job link copied to clipboard");
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-white hover:shadow-sm border border-transparent hover:border-neutral-200 transition-all dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
                align="end" 
                className="w-56 p-1.5" 
                onClick={(e) => e.stopPropagation()}
                onCloseAutoFocus={(e) => e.preventDefault()}
            >
                <DropdownMenuItem asChild className="focus:bg-blue-50 dark:focus:bg-blue-900/20">
                    <Link href={`${baseUrl}/${jobId}`} className="flex items-center gap-2.5 cursor-pointer w-full py-2">
                        <Eye className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">View Details</span>
                    </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                    onClick={copyJobLink} 
                    className="flex items-center gap-2.5 cursor-pointer py-2 focus:bg-emerald-50 dark:focus:bg-emerald-900/20"
                >
                    <Copy className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">Copy Job Link</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1.5" />

                {canAssign && (
                    <DropdownMenuItem 
                        onSelect={(e) => { 
                            e.preventDefault();
                            setTimeout(() => onAssign?.(), 150); 
                        }} 
                        className="flex items-center gap-2.5 cursor-pointer py-2 focus:bg-violet-50 dark:focus:bg-violet-900/20"
                    >
                        <Users className="h-4 w-4 text-violet-600" />
                        <span className="font-medium text-violet-700 dark:text-violet-400">Assign Recruiters</span>
                    </DropdownMenuItem>
                )}

                <DropdownMenuItem 
                    disabled={isClosed || isCfr} 
                    onSelect={(e) => { 
                        e.preventDefault();
                        setTimeout(() => onSubmission?.(), 150); 
                    }} 
                    className="flex items-center gap-2.5 cursor-pointer py-2 focus:bg-emerald-50 dark:focus:bg-emerald-900/20"
                >
                    <UserPlus className={cn("h-4 w-4", isClosed || isCfr ? "text-neutral-300" : "text-emerald-600")} />
                    <span className={cn("font-medium", isClosed || isCfr ? "text-neutral-400" : "text-emerald-700 dark:text-emerald-400")}>
                        Submit Candidate
                    </span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1.5" />
                
                <DropdownMenuItem asChild className="focus:bg-neutral-50 dark:focus:bg-slate-800/50">
                    <Link href={`${baseUrl}/${jobId}`} target="_blank" className="flex items-center gap-2.5 cursor-pointer w-full py-2">
                        <ExternalLink className="h-4 w-4 text-neutral-500" />
                        <span className="font-medium text-neutral-600 dark:text-slate-400">Open in New Tab</span>
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
