"use client";

import { useState, useEffect, useMemo } from "react";
import { Check, ChevronDown, Crown, Loader2, Search, Plus, Users, LayoutGrid } from "lucide-react";
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { apiClient } from "@/lib/apiClient";
import { PodHoverCard } from "@/components/shared/pod-hover-card";
import { MessageCircle } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";

export interface PodData {
    id: string;
    name: string;
    isAvailable?: boolean;
}

interface RecruiterData {
    id: string;
    fullName: string | null;
    email: string;
    podId?: string | null;
    podName?: string | null;
    pod?: {
        id: string;
        name: string;
    } | null;
}

interface PodAssignCellProps {
    jobId: string;
    assignedPods: PodData[];
    availablePods: PodData[];
    assignedRecruiters?: RecruiterData[];
    jobCode?: string;
    canEdit?: boolean;
    onSuccess?: () => void;
}

export default function PodAssignCell({
    jobId,
    assignedPods,
    availablePods,
    assignedRecruiters = [],
    jobCode,
    canEdit = false,
    onSuccess,
}: PodAssignCellProps) {
    const { openChatWithUser } = useChat();
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("pods");
    const [selectedPods, setSelectedPods] = useState<Set<string>>(
        new Set(assignedPods.map((p) => p.id))
    );
    const [selectedRecruiters, setSelectedRecruiters] = useState<Set<string>>(
        new Set(assignedRecruiters.map((r) => r.id))
    );
    const [allRecruiters, setAllRecruiters] = useState<RecruiterData[]>([]);
    const [isLoadingRecruiters, setIsLoadingRecruiters] = useState(false);
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);
    const [podLeads, setPodLeads] = useState<Record<string, { fullName?: string | null; email?: string }>>({});

    // Fetch all recruiters for the selection list
    useEffect(() => {
        if (open && allRecruiters.length === 0) {
            setIsLoadingRecruiters(true);
            apiClient("/pods/all-recruiters")
                .then(res => res.ok ? res.json() : [])
                .then(data => setAllRecruiters(data))
                .catch(err => {
                    console.error("Failed to fetch recruiters:", err);
                    toast.error("Failed to load recruiters list");
                })
                .finally(() => setIsLoadingRecruiters(false));
        }
    }, [open, allRecruiters.length]);

    // Fetch pod leads for assigned pods only if not already provided
    useEffect(() => {
        assignedPods.forEach(pod => {
            const head = (pod as any).podHead;
            if (head) {
                setPodLeads(prev => {
                    if (prev[pod.id] === head) return prev;
                    return { ...prev, [pod.id]: head };
                });
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
            setSelectedPods(new Set(assignedPods.map((p) => p.id)));
            setSelectedRecruiters(new Set(assignedRecruiters.map((r) => r.id)));
            setSearch("");
            setActiveTab("pods");
        }
    }, [open]); // Only sync when popover opens

    const filteredPods = useMemo(() => {
        const q = search.toLowerCase();
        return availablePods.filter((p) => p.name.toLowerCase().includes(q));
    }, [availablePods, search]);

    const groupedRecruiters = useMemo(() => {
        const q = search.toLowerCase();
        const filtered = allRecruiters.filter(r =>
            r.fullName?.toLowerCase().includes(q) ||
            r.email.toLowerCase().includes(q)
        );

        const groups: Record<string, RecruiterData[]> = {};

        filtered.forEach(r => {
            // Check both flattened and nested pod data
            const actualPodName = r.pod?.name || r.podName || "OTHERS";
            if (!groups[actualPodName]) groups[actualPodName] = [];
            groups[actualPodName].push(r);
        });

        // Sort pods: currently selected pods first, then by name, OTHERS last
        return Object.entries(groups).sort(([nameA, recruitersA], [nameB, recruitersB]) => {
            if (nameA === "OTHERS") return 1;
            if (nameB === "OTHERS") return -1;

            const aHasSelectedPod = recruitersA.some(r => {
                const pid = r.pod?.id || r.podId;
                return pid && selectedPods.has(pid);
            });
            const bHasSelectedPod = recruitersB.some(r => {
                const pid = r.pod?.id || r.podId;
                return pid && selectedPods.has(pid);
            });

            if (aHasSelectedPod && !bHasSelectedPod) return -1;
            if (!aHasSelectedPod && bHasSelectedPod) return 1;

            return nameA.localeCompare(nameB);
        });
    }, [allRecruiters, search, selectedPods]);

    const togglePod = (id: string) => {
        setSelectedPods((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleRecruiter = (id: string) => {
        setSelectedRecruiters((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const hasChanges = useMemo(() => {
        const podChanges = selectedPods.size !== assignedPods.length ||
            [...selectedPods].some((id) => !assignedPods.find((p) => p.id === id));

        const recruiterChanges = selectedRecruiters.size !== assignedRecruiters.length ||
            [...selectedRecruiters].some((id) => !assignedRecruiters.find((r) => r.id === id));

        return podChanges || recruiterChanges;
    }, [selectedPods, assignedPods, selectedRecruiters, assignedRecruiters]);

    const handleSave = async () => {
        if (!canEdit) {
            toast.error("You do not have permission to modify assignments.");
            return;
        }

        setSaving(true);
        try {
            // 1. Update Pods
            const podRes = await apiClient(`/jobs/${jobId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ podIds: [...selectedPods] }),
            });

            if (!podRes.ok) throw new Error("Failed to update pod assignments");

            // 2. Update Recruiters
            const recruiterRes = await apiClient(`/jobs/${jobId}/assign`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recruiterIds: [...selectedRecruiters] }),
            });

            if (!recruiterRes.ok) throw new Error("Failed to update recruiter assignments");

            toast.success("Assignments updated successfully");
            setOpen(false);
            onSuccess?.();
        } catch (err: any) {
            toast.error(err.message || "Something went wrong while saving assignments.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setOpen(false);
    };

    // ── Display ─────────────────────────────────────────
    const trigger =
        assignedPods.length === 0 && assignedRecruiters.length === 0 ? (
            canEdit ? (
                <button
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2.5 py-1.5 rounded-lg border border-dashed border-red-300 dark:border-red-900/50 transition-colors group"
                    type="button"
                    title="Assign Pods & Recruiters"
                >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="font-semibold group-hover:text-red-600">Assign</span>
                </button>
            ) : (
                <span className="text-xs text-muted-foreground italic px-1">Unassigned</span>
            )
        ) : (
            <div
                className={`flex items-center gap-2 group rounded-lg px-1.5 py-1 transition-colors ${canEdit
                    ? "hover:bg-neutral-100 dark:hover:bg-slate-700 cursor-pointer"
                    : "cursor-default"
                    }`}
                title={canEdit ? "Edit Assignments" : "View Assignments"}
            >
                <div className="flex flex-col gap-1 flex-1">
                    {/* Pods Row */}
                    <div className="flex flex-wrap items-center gap-1">
                        {assignedPods.slice(0, 1).map(pod => (
                            <PodHoverCard key={pod.id} podId={pod.id} podName={pod.name}>
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-none font-medium flex gap-1 items-center cursor-help w-fit h-5 px-1.5 text-[10px]">
                                    <LayoutGrid className="h-2.5 w-2.5" />
                                    {pod.name}
                                </Badge>
                            </PodHoverCard>
                        ))}
                        {assignedPods.length > 1 && (
                            <span className="text-[9px] bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-400 font-medium px-1 rounded ml-px">
                                +{assignedPods.length - 1}
                            </span>
                        )}
                    </div>

                    {/* Recruiters Row */}
                    <div className="flex flex-wrap items-center gap-1">
                        {assignedRecruiters.slice(0, 2).map((recruiter, idx) => (
                            <Badge key={recruiter.id} variant="outline" className="h-4 px-1 text-[9px] font-normal border-blue-200 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                                {recruiter.fullName?.split(' ')[0] || recruiter.email.split('@')[0]}
                                {idx === 0 && assignedRecruiters.length > 2 && ","}
                            </Badge>
                        ))}
                        {assignedRecruiters.length > 2 && (
                            <span className="text-[9px] text-blue-500 font-medium">+{assignedRecruiters.length - 2}</span>
                        )}
                    </div>
                </div>
                
                {canEdit && (
                    <div className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                        <div className="h-6 w-6 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center border border-red-200 dark:border-red-900/50">
                            <Plus className="h-3.5 w-3.5 text-red-500" strokeWidth={3} />
                        </div>
                    </div>
                )}
            </div>
        );

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
                    className="w-[340px] p-0 shadow-xl border border-neutral-200 dark:border-slate-600 rounded-xl overflow-hidden"
                    align="end"
                    side="bottom"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="bg-neutral-50 dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-600 px-3 py-2">
                            <div className="flex flex-col gap-0.5 mb-2">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Assignment for</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-3.5 bg-red-500 rounded-sm" />
                                    <span className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">{jobCode || "Select Job"}</span>
                                </div>
                            </div>
                            <TabsList className="w-full bg-slate-200/50 dark:bg-slate-700/50 p-1 h-8 gap-1 rounded-lg">
                                <TabsTrigger value="pods" className="flex-1 py-1 text-[10px] gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm rounded-md transition-all">
                                    <LayoutGrid className="h-3 w-3" />
                                    Pods ({selectedPods.size})
                                </TabsTrigger>
                                <TabsTrigger value="recruiters" className="flex-1 py-1 text-[10px] gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm rounded-md transition-all">
                                    <Users className="h-3 w-3" />
                                    Recruiters ({selectedRecruiters.size})
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Search Bar */}
                        <div className="px-3 py-2 border-b border-neutral-100 dark:border-slate-700 bg-white dark:bg-slate-900">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                                <Input
                                    placeholder={activeTab === "pods" ? "Search pods..." : "Search recruiters..."}
                                    className="pl-8 h-8 text-xs bg-neutral-50 dark:bg-slate-800 border-neutral-200 dark:border-slate-700"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto bg-white dark:bg-slate-900">
                            <TabsContent value="pods" className="m-0">
                                <div className="py-1">
                                    {filteredPods.length === 0 ? (
                                        <p className="text-xs text-neutral-400 text-center py-8">No pods found</p>
                                    ) : (
                                        filteredPods.map((pod) => {
                                            const isSelected = selectedPods.has(pod.id);
                                            return (
                                                <button
                                                    key={pod.id}
                                                    type="button"
                                                    onClick={() => togglePod(pod.id)}
                                                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-slate-800/60 ${isSelected ? "bg-purple-50/60 dark:bg-purple-900/20" : ""}`}
                                                >
                                                    <div className={`shrink-0 flex items-center justify-center h-4 w-4 rounded border transition-colors ${isSelected ? "bg-purple-600 border-purple-600" : "border-neutral-300 dark:border-slate-600"}`}>
                                                        {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-neutral-800 dark:text-slate-100 truncate">{pod.name}</p>
                                                    </div>
                                                </button>
                                            )
                                        })
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="recruiters" className="m-0">
                                {isLoadingRecruiters ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Loading recruiters…</span>
                                    </div>
                                ) : groupedRecruiters.length === 0 ? (
                                    <p className="text-xs text-neutral-400 text-center py-8">No recruiters found</p>
                                ) : (
                                    <div className="flex flex-col">
                                        {groupedRecruiters.map(([podName, recruiters]) => (
                                            <div key={podName} className="flex flex-col">
                                                <div className="bg-slate-100/80 dark:bg-slate-800/80 px-4 py-2 border-y border-neutral-200 dark:border-slate-700/50 sticky top-0 z-10 backdrop-blur-sm">
                                                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                        <div className="w-1 h-3 bg-red-500 rounded-full" />
                                                        {podName}
                                                    </span>
                                                </div>
                                                {recruiters.map((recruiter) => {
                                                    const isSelected = selectedRecruiters.has(recruiter.id);
                                                    const pid = recruiter.pod?.id || recruiter.podId;
                                                    const inSelectedPod = pid && selectedPods.has(pid);

                                                    return (
                                                        <button
                                                            key={recruiter.id}
                                                            type="button"
                                                            onClick={() => toggleRecruiter(recruiter.id)}
                                                            className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-slate-800/60 ${isSelected ? "bg-blue-50/60 dark:bg-blue-900/20" : ""}`}
                                                        >
                                                            <div className={`shrink-0 flex items-center justify-center h-5 w-5 rounded-full border transition-all duration-200 ${isSelected
                                                                ? "bg-blue-600 border-blue-600 shadow-sm"
                                                                : "border-neutral-300 dark:border-slate-600 hover:border-blue-400"
                                                                }`}>
                                                                {isSelected ? (
                                                                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                                                                ) : (
                                                                    <Plus className="h-3 w-3 text-neutral-400" strokeWidth={3} />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <p className="text-sm font-medium text-neutral-800 dark:text-slate-100 truncate">{recruiter.fullName || recruiter.email.split('@')[0]}</p>
                                                                    {inSelectedPod && (
                                                                        <Badge variant="secondary" className="text-[8px] h-3.5 px-1 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-none">Member</Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] text-neutral-500 truncate">{recruiter.email}</p>
                                                            </div>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between gap-2 px-3 py-3 border-t border-neutral-100 dark:border-slate-700 bg-neutral-50/80 dark:bg-slate-800/80 backdrop-blur-sm">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    if (activeTab === "pods") setSelectedPods(new Set(availablePods.map(p => p.id)));
                                    else setSelectedRecruiters(new Set(allRecruiters.map(r => r.id)));
                                }}
                                className="text-[10px] text-purple-600 hover:text-purple-700 dark:text-purple-400 font-bold uppercase tracking-tight"
                            >
                                All
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (activeTab === "pods") setSelectedPods(new Set());
                                    else setSelectedRecruiters(new Set());
                                }}
                                className="text-[10px] text-neutral-400 hover:text-destructive font-bold uppercase tracking-tight"
                            >
                                Clear
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-8 text-xs px-3 rounded-lg" onClick={handleCancel} disabled={saving}>Cancel</Button>
                            <Button size="sm" className="h-8 text-xs px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm shadow-purple-600/20" onClick={handleSave} disabled={saving || !hasChanges}>
                                {saving ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Saving</> : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
