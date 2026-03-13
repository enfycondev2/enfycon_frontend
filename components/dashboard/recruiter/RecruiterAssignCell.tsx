"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, Loader2, Search, UserPlus, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/apiClient";

export interface TeamMember {
    id: string;
    fullName: string | null;
    email: string;
}

interface RecruiterAssignCellProps {
    jobId: string;
    assignedRecruiters: TeamMember[];
    teamMembers: TeamMember[];
    token: string;
    canEdit?: boolean;
    onSuccess?: () => void;
    triggerMode?: "button" | "icon" | "none";
    variant?: "popover" | "dialog";
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

function getInitials(name: string | null, email: string): string {
    if (name) {
        const parts = name.trim().split(" ");
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0][0].toUpperCase();
    }
    return email[0].toUpperCase();
}

const AVATAR_COLORS = [
    "bg-violet-100 text-violet-700 border-violet-200",
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-rose-100 text-rose-700 border-rose-200",
    "bg-cyan-100 text-cyan-700 border-cyan-200",
];

function getAvatarColor(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function RecruiterAssignCell({
    jobId,
    assignedRecruiters,
    teamMembers,
    token,
    canEdit,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    onSuccess,
    triggerMode = "button",
    variant = "popover",
}: RecruiterAssignCellProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;

    const [selected, setSelected] = useState<Set<string>>(
        new Set(assignedRecruiters.map((r) => r.id))
    );
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);

    // Reset selection when popover opens (reflect current state)
    useEffect(() => {
        if (open) {
            setSelected(new Set(assignedRecruiters.map((r) => r.id)));
            setSearch("");
        }
    }, [open, assignedRecruiters]);

    const filteredMembers = teamMembers.filter((m) => {
        const q = search.toLowerCase();
        return (
            (m.fullName?.toLowerCase().includes(q) ?? false) ||
            m.email.toLowerCase().includes(q)
        );
    });

    const toggleMember = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const hasChanges =
        selected.size !== assignedRecruiters.length ||
        [...selected].some((id) => !assignedRecruiters.find((r) => r.id === id));

    const handleSave = async () => {
        if (!canEdit) {
            toast.error("Only pod lead can edit assigned recruiters");
            return;
        }

        setSaving(true);
        try {
            const res = await apiClient(`/jobs/${jobId}/assign`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ recruiterIds: [...selected] }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.message || "Failed to assign recruiters");
            }

            toast.success(
                selected.size === 0
                    ? "Recruiters removed"
                    : `${selected.size} recruiter${selected.size > 1 ? "s" : ""} assigned`
            );
            setOpen(false);
            onSuccess?.();
        } catch (err: any) {
            toast.error(err.message || "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setOpen(false);
    };

    // ── Display: avatar chips ─────────────────────────────────────────
    const MAX_VISIBLE = 3;
    const visibleRecruiters = assignedRecruiters.slice(0, MAX_VISIBLE);
    const overflow = assignedRecruiters.length - MAX_VISIBLE;

    if (!canEdit) {
        if (assignedRecruiters.length === 0) {
            return <div className="text-xs text-neutral-400 italic px-2 py-1">Unassigned</div>;
        }
        return (
            <div className="flex items-center gap-1 rounded-lg px-1.5 py-1" title="Assigned Recruiters">
                <div className="flex -space-x-1.5">
                    {visibleRecruiters.map((r) => (
                        <span
                            key={r.id}
                            title={r.fullName || r.email}
                            className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-[10px] font-bold border-2 border-white dark:border-slate-800 ${getAvatarColor(r.id)}`}
                        >
                            {getInitials(r.fullName, r.email)}
                        </span>
                    ))}
                    {overflow > 0 && (
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full text-[10px] font-bold border-2 border-white dark:border-slate-800 bg-neutral-200 dark:bg-slate-600 text-neutral-600 dark:text-slate-300">
                            +{overflow}
                        </span>
                    )}
                </div>
            </div>
        );
    }

    const trigger =
        assignedRecruiters.length === 0 ? (
        <button
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2.5 py-1.5 rounded-lg border border-dashed border-neutral-300 dark:border-slate-600 transition-colors group"
            type="button"
            title="Assign Recruiters"
        >
            <UserPlus className="h-3.5 w-3.5" />
            <span className="font-medium group-hover:text-blue-600">Assign</span>
        </button>
        ) : (
            <button
                className="flex items-center gap-1 rounded-lg px-1.5 py-1 transition-colors hover:bg-neutral-100 dark:hover:bg-slate-700"
                type="button"
                title="Edit Assigned Recruiters"
            >
                <div className="flex -space-x-1.5">
                    {visibleRecruiters.map((r) => (
                        <span
                            key={r.id}
                            title={r.fullName || r.email}
                            className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-[10px] font-bold border-2 border-white dark:border-slate-800 ${getAvatarColor(r.id)}`}
                        >
                            {getInitials(r.fullName, r.email)}
                        </span>
                    ))}
                    {overflow > 0 && (
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full text-[10px] font-bold border-2 border-white dark:border-slate-800 bg-neutral-200 dark:bg-slate-600 text-neutral-600 dark:text-slate-300">
                            +{overflow}
                        </span>
                    )}
                </div>
                <ChevronDown className="h-3 w-3 text-neutral-400 ml-0.5" />
            </button>
        );

    const iconTrigger = (
        <button
            className="h-8 w-8 flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            type="button"
            title="Assign Recruiters"
        >
            <UserPlus className="h-4 w-4" />
        </button>
    );

    const finalTrigger = triggerMode === "none" ? null : (triggerMode === "icon" ? iconTrigger : trigger);

    const content = (
        <>
            {/* Header */}
            <div className="flex items-center justify-between px-3 pr-10 py-2.5 bg-neutral-50 dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-600">
                <span className="text-xs font-semibold text-neutral-600 dark:text-slate-300 uppercase tracking-wider">
                    Assign Recruiters
                </span>
                {selected.size > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
                        {selected.size} selected
                    </Badge>
                )}
            </div>

            {/* Search - only show if more than 6 members */}
            {teamMembers.length > 6 && (
                <div className="px-3 py-2 border-b border-neutral-100 dark:border-slate-700">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                        <Input
                            placeholder="Search team members..."
                            className="pl-8 h-8 text-xs bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 focus-visible:ring-blue-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>
            )}

            {/* Member list */}
            <div className="max-h-[320px] overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-slate-700">
                {filteredMembers.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center py-6">
                        No members found
                    </p>
                ) : (
                    filteredMembers.map((member) => {
                        const isSelected = selected.has(member.id);
                        return (
                            <button
                                key={member.id}
                                type="button"
                                onClick={() => toggleMember(member.id)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-slate-700/60 ${isSelected
                                    ? "bg-blue-50/60 dark:bg-blue-900/20"
                                    : ""
                                    }`}
                            >
                                {/* Avatar */}
                                <span
                                    className={`inline-flex shrink-0 items-center justify-center h-7 w-7 rounded-full text-[10px] font-bold ${getAvatarColor(member.id)}`}
                                >
                                    {getInitials(member.fullName, member.email)}
                                </span>
                                {/* Name + email */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-neutral-800 dark:text-slate-100 truncate leading-tight">
                                        {member.fullName || "Unknown"}
                                    </p>
                                    <p className="text-[10px] text-neutral-400 truncate leading-tight">
                                        {member.email}
                                    </p>
                                </div>
                                {/* Checkbox */}
                                <div className={`flex items-center justify-center h-4 w-4 rounded border transition-colors ${isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-neutral-300 dark:border-slate-600"}`}>
                                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {/* Footer / Actions */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-neutral-50 dark:bg-slate-800/50 border-t border-neutral-200 dark:border-slate-600">
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-8 px-2 text-neutral-500 hover:text-neutral-700"
                    onClick={() => setSelected(new Set())}
                >
                    Clear all
                </Button>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] h-8 px-3"
                        onClick={() => setOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        className="text-[11px] h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        disabled={!hasChanges || saving}
                        onClick={handleSave}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                                Saving...
                            </>
                        ) : (
                            "Save"
                        )}
                    </Button>
                </div>
            </div>
        </>
    );

    if (variant === "dialog") {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                {finalTrigger && <DialogTrigger asChild>{finalTrigger}</DialogTrigger>}
                <DialogContent
                    className="max-w-md p-0 overflow-hidden border-none shadow-2xl"
                >
                    <DialogHeader className="sr-only">
                        <DialogTitle>Assign Recruiters</DialogTitle>
                        <DialogDescription>Select team members to assign to this job.</DialogDescription>
                    </DialogHeader>
                    {content}
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            {finalTrigger && <PopoverTrigger asChild>{finalTrigger}</PopoverTrigger>}
            <PopoverContent
                className="w-72 p-0 shadow-xl border border-neutral-200 dark:border-slate-600 rounded-xl overflow-hidden"
                align="start"
                side="bottom"
            >
                {content}
            </PopoverContent>
        </Popover>
    );
}
