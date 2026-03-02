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
import { RefreshCw } from "lucide-react";

interface CfrExtendButtonProps {
    jobId: string;
    onSuccess?: () => void;
}

export default function CfrExtendButton({ jobId, onSuccess }: CfrExtendButtonProps) {
    const [open, setOpen] = useState(false);
    const [days, setDays] = useState<number>(1);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleExtend = async () => {
        setLoading(true);
        try {
            const res = await apiClient(`/jobs/${jobId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requirementType: "CFR_EXTENDED",
                    cfrExtensionDays: days,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || "Failed to extend CFR");
            }
            toast.success(`CFR extended by ${days} day${days > 1 ? "s" : ""}`);
            setOpen(false);
            if (onSuccess) onSuccess();
            else router.refresh();
        } catch (e: any) {
            toast.error(e.message || "Extension failed");
        } finally {
            setLoading(false);
        }
    };

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
                <p className="text-xs font-semibold text-neutral-700">Extend CFR by how many days?</p>
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
                    onClick={handleExtend}
                    disabled={loading}
                >
                    {loading ? "Extending…" : `Extend ${days}d`}
                </Button>
            </PopoverContent>
        </Popover>
    );
}
