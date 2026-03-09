"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown, Crown, Loader2, Search, Plus } from "lucide-react";
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
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { apiClient } from "@/lib/apiClient";
import { PodHoverCard } from "@/components/shared/pod-hover-card";
import { MessageCircle } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";

export interface PodData {
    id: string;
    name: string;
    isAvailable?: boolean;
}

interface PodAssignCellProps {
    jobId: string;
    assignedPods: PodData[];
    availablePods: PodData[];
    assignedRecruiters?: any[];
    canEdit?: boolean;
    onSuccess?: () => void;
}

export default function PodAssignCell({
    jobId,
    assignedPods,
    availablePods,
    assignedRecruiters = [],
    canEdit = false,
    onSuccess,
}: PodAssignCellProps) {
    const { openChatWithUser } = useChat();
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(
        new Set(assignedPods.map((p) => p.id))
    );
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);
    const [podLeads, setPodLeads] = useState<Record<string, { fullName?: string | null; email?: string }>>({});

    // Fetch pod leads for assigned pods only if not already provided
    useEffect(() => {
        assignedPods.forEach(pod => {
            if ((pod as any).podHead) {
                setPodLeads(prev => ({ ...prev, [pod.id]: (pod as any).podHead }));
                return;
            }
            if (!podLeads[pod.id]) {
                apiClient(`/pods/${pod.id}`)
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (data?.podHead) {
                            setPodLeads(prev => ({ ...prev, [pod.id]: data.podHead }));
                        }
                    })
                    .catch(() => { });
            }
        });
    }, [assignedPods]);

    // Reset selection when popover opens (reflect current state)
    useEffect(() => {
        if (open) {
            setSelected(new Set(assignedPods.map((p) => p.id)));
            setSearch("");
        }
    }, [open, assignedPods]);

    const filteredPods = availablePods.filter((p) => {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q);
    });

    const togglePod = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const hasChanges =
        selected.size !== assignedPods.length ||
        [...selected].some((id) => !assignedPods.find((p) => p.id === id));

    const handleSave = async () => {
        if (!canEdit) {
            toast.error("You do not have permission to reassign pods.");
            return;
        }

        setSaving(true);
        try {
            const res = await apiClient(`/jobs/${jobId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ podIds: [...selected] }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.message || "Failed to assign pods");
            }

            toast.success(
                selected.size === 0
                    ? "Job unassigned from all pods"
                    : `Job assigned to ${selected.size} pod${selected.size > 1 ? "s" : ""}`
            );
            setOpen(false);
            onSuccess?.();
        } catch (err: any) {
            toast.error(err.message || "Something went wrong while reassigning pods.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setOpen(false);
    };

    // ── Display ─────────────────────────────────────────
    const trigger =
        assignedPods.length === 0 ? (
            canEdit ? (
                <button
                    className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-2.5 py-1.5 rounded-lg border border-dashed border-neutral-300 dark:border-slate-600 transition-colors group"
                    type="button"
                    title="Assign Pods"
                >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="font-medium group-hover:text-purple-600">Assign Pod</span>
                </button>
            ) : (
                <span className="text-xs text-muted-foreground italic px-1">Unassigned</span>
            )
        ) : (
            <div
                className={`flex items-center gap-1 rounded-lg px-1.5 py-1 transition-colors ${canEdit
                    ? "hover:bg-neutral-100 dark:hover:bg-slate-700 cursor-pointer"
                    : "cursor-default"
                    }`}
                title={canEdit ? "Edit Assigned Pods" : "View Assigned Pod Members"}
            >
                <div className="flex items-center gap-1">
                    {assignedPods.slice(0, 1).map(pod => {
                        const lead = podLeads[pod.id];
                        return (
                            <div key={pod.id} className="flex flex-col gap-0.5">
                                <PodHoverCard podId={pod.id} podName={pod.name}>
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-none font-medium flex gap-1 items-center cursor-help w-fit">
                                        {pod.name}
                                    </Badge>
                                </PodHoverCard>
                                {lead && (
                                    <span className="flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400 group/lead">
                                        <Crown className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                                        {lead.fullName || lead.email?.split('@')[0]}
                                        {(lead as any).id && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    openChatWithUser((lead as any).id);
                                                }}
                                                className="ml-0.5 text-neutral-400 hover:text-primary transition-colors opacity-0 group-hover/lead:opacity-100"
                                                title="Message Pod Lead"
                                            >
                                                <MessageCircle className="h-3 w-3" />
                                            </button>
                                        )}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                    {assignedPods.length > 1 && (
                        <HoverCard openDelay={200} closeDelay={200}>
                            <HoverCardTrigger asChild>
                                <span className="text-[10px] bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-400 font-medium px-1.5 py-0.5 rounded-md ml-0.5 cursor-help">
                                    +{assignedPods.length - 1} pod{assignedPods.length > 2 ? 's' : ''}
                                </span>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-48 p-3" side="top" align="start">
                                <div className="flex flex-col gap-2">
                                    <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Assigned Pods</h4>
                                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                                        {assignedPods.slice(1).map(pod => (
                                            <div key={pod.id} className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                                                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                                                    {pod.name}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </HoverCardContent>
                        </HoverCard>
                    )}
                </div>
                {canEdit && <ChevronDown className="h-3 w-3 text-neutral-400 ml-0.5" />}
            </div>
        );

    // If we only want to display for Account Manager, we can also render recruiters easily.
    // However, PodAssignCell only displays pods natively. We will use a custom wrapper outside if needed.

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <Popover
                open={open}
                onOpenChange={(nextOpen) => {
                    if (!canEdit && nextOpen) return;
                    setOpen(nextOpen);
                }}
            >
                <PopoverTrigger asChild>{trigger}</PopoverTrigger>
                <PopoverContent
                    className="w-72 p-0 shadow-xl border border-neutral-200 dark:border-slate-600 rounded-xl overflow-hidden"
                    align="start"
                    side="bottom"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2.5 bg-neutral-50 dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-600">
                        <span className="text-xs font-semibold text-neutral-600 dark:text-slate-300 uppercase tracking-wider">
                            Assign Pods
                        </span>
                        {selected.size > 0 && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                {selected.size} selected
                            </Badge>
                        )}
                    </div>

                    {/* Search */}
                    <div className="px-3 py-2 border-b border-neutral-100 dark:border-slate-700">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                            <Input
                                placeholder="Search pods..."
                                className="pl-8 h-8 text-xs bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-52 overflow-y-auto py-1">
                        {filteredPods.length === 0 ? (
                            <p className="text-xs text-neutral-400 text-center py-6">
                                No pods found
                            </p>
                        ) : (
                            filteredPods.map((pod) => {
                                const isSelected = selected.has(pod.id);
                                const available = pod.isAvailable !== false; // default to available if not specified
                                return (
                                    <button
                                        key={pod.id}
                                        type="button"
                                        onClick={() => togglePod(pod.id)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-slate-700/60 ${isSelected
                                            ? "bg-purple-50/60 dark:bg-purple-900/20"
                                            : ""
                                            }`}
                                    >
                                        {/* Availability indicator */}
                                        <span
                                            className={`shrink-0 h-2 w-2 rounded-full ${available
                                                ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.6)]"
                                                : "bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]"
                                                }`}
                                            title={available ? "Available" : "No recruiters assigned"}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-neutral-800 dark:text-slate-100 truncate leading-tight">
                                                {pod.name}
                                            </p>
                                            <p className={`text-[10px] font-medium ${available ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
                                                {available ? "Available" : "No recruiters"}
                                            </p>
                                        </div>
                                        {/* Checkbox */}
                                        <span
                                            className={`shrink-0 flex items-center justify-center h-4 w-4 rounded border transition-colors ${isSelected
                                                ? "bg-purple-600 border-purple-600"
                                                : "border-neutral-300 dark:border-slate-500"
                                                }`}
                                        >
                                            {isSelected && (
                                                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                                            )}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Footer actions */}
                    <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t border-neutral-100 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setSelected(new Set(availablePods.map(p => p.id)))}
                                className="text-[11px] text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium transition-colors underline-offset-2 hover:underline"
                            >
                                Select all
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelected(new Set())}
                                className="text-[11px] text-neutral-400 hover:text-destructive transition-colors underline-offset-2 hover:underline"
                            >
                                Clear all
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-3"
                                onClick={handleCancel}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                className="h-7 text-xs px-3 bg-purple-600 hover:bg-purple-700 text-white"
                                onClick={handleSave}
                                disabled={saving || !hasChanges}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        Saving…
                                    </>
                                ) : (
                                    "Save"
                                )}
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
