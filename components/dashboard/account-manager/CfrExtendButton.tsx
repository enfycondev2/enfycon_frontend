"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { RefreshCw, RotateCcw } from "lucide-react";

interface CfrExtendButtonProps {
    jobId: string;
    /** Pass the current requirementType so we can show the right UI */
    currentType?: string;
    onSuccess?: () => void;
}

/**
 * CfrExtendButton
 *
 * - On a plain CFR job  → "Extend" trigger, shows day picker 1–3 (initial extension)
 * - On a CFR_EXTENDED job → "Re-extend" trigger, shows 0 / 1 / 2 / 3:
 *     0 = revert to CFR (blocks submissions again)
 *     1/2/3 = extend by that many days (replaces current countdown)
 */
export default function CfrExtendButton({ jobId, currentType, onSuccess }: CfrExtendButtonProps) {
    const isAlreadyExtended = currentType === "CFR_EXTENDED";

    // Default selection: 0 for re-extend (so the DH has to consciously pick a day)
    const [days, setDays] = useState<number>(isAlreadyExtended ? 0 : 1);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async () => {
        setLoading(true);
        try {
            let body: Record<string, any>;

            if (days === 0) {
                // Revert to plain CFR — no extension, submissions blocked
                body = { requirementType: "CFR" };
            } else {
                body = {
                    requirementType: "CFR_EXTENDED",
                    cfrExtensionDays: days,
                };
            }

            const res = await apiClient(`/jobs/${jobId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || "Request failed");
            }

            if (days === 0) {
                toast.success("Job reverted to CFR — submissions blocked");
            } else {
                toast.success(`CFR extended by ${days} day${days > 1 ? "s" : ""}`);
            }

            setOpen(false);
            if (onSuccess) onSuccess();
            else router.refresh();
        } catch (e: any) {
            toast.error(e.message || "Action failed");
        } finally {
            setLoading(false);
        }
    };

    // ── Initial extend (CFR → CFR_EXTENDED): options 1 / 2 / 3
    if (!isAlreadyExtended) {
        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px] gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                        <RefreshCw className="h-3 w-3" /> Extend
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-3 space-y-3" align="start">
                    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                        Extend CFR by how many days?
                    </p>
                    <div className="flex gap-1 flex-wrap">
                        {[1, 2, 3, 4, 5].map(d => (
                            <button
                                key={d}
                                onClick={() => setDays(d)}
                                className={`h-8 w-8 rounded-md text-sm font-semibold border transition-colors ${days === d
                                        ? "bg-amber-500 text-white border-amber-500"
                                        : "border-neutral-200 text-neutral-600 hover:border-amber-400 hover:text-amber-700"
                                    }`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                    <Button
                        size="sm"
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? "Extending…" : `Extend ${days}d`}
                    </Button>
                </PopoverContent>
            </Popover>
        );
    }

    // ── Re-extend (CFR_EXTENDED → adjust): options 0 / 1 / 2 / 3
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px] gap-1 border-violet-300 text-violet-700 hover:bg-violet-50"
                >
                    <RotateCcw className="h-3 w-3" /> Re-extend
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 space-y-3" align="start">
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                    Adjust extension days
                </p>
                <p className="text-[10px] text-muted-foreground">
                    Selecting <span className="font-bold text-red-500">0</span> reverts job to CFR — submissions will be blocked.
                </p>
                <div className="flex gap-1 flex-wrap">
                    {[0, 1, 2, 3, 4].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`h-8 w-8 rounded-md text-sm font-semibold border transition-colors ${days === d
                                    ? d === 0
                                        ? "bg-red-500 text-white border-red-500"
                                        : "bg-violet-500 text-white border-violet-500"
                                    : d === 0
                                        ? "border-red-200 text-red-500 hover:border-red-400 hover:bg-red-50"
                                        : "border-neutral-200 text-neutral-600 hover:border-violet-400 hover:text-violet-700"
                                }`}
                        >
                            {d}
                        </button>
                    ))}
                </div>
                <Button
                    size="sm"
                    className={`w-full text-white ${days === 0
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-violet-500 hover:bg-violet-600"
                        }`}
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading
                        ? "Saving…"
                        : days === 0
                            ? "Revert to CFR"
                            : `Extend ${days}d`}
                </Button>
            </PopoverContent>
        </Popover>
    );
}
