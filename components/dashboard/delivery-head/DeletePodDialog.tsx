"use client";

import React, { useState, useEffect } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import { Loader2, Trash2, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

import { apiClient } from "@/lib/apiClient";

interface Pod {
    id: string;
    name: string;
}

interface DeletePodDialogProps {
    isOpen: boolean;
    onClose: () => void;
    podId: string;
    podName: string;
    onSuccess: () => void;
    availablePods: Pod[];
}

export default function DeletePodDialog({
    isOpen,
    onClose,
    podId,
    podName,
    onSuccess,
    availablePods,
}: DeletePodDialogProps) {
    const [migrateToPodId, setMigrateToPodId] = useState<string>("none");
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const queryParam = migrateToPodId !== "none" ? `?migrateToPodId=${migrateToPodId}` : "";
            const response = await apiClient(`pods/${podId}${queryParam}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to delete pod");
            }

            toast.success(`Pod "${podName}" deleted successfully.`);
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "An error occurred");
        } finally {
            setIsDeleting(false);
        }
    };

    // Filter out the current pod from migration candidates
    const destinationPods = availablePods.filter(p => p.id !== podId);

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                        <Trash2 className="h-5 w-5" />
                        Delete Pod
                    </AlertDialogTitle>
                    <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg p-3 my-2 flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                        <div className="text-xs text-rose-900 dark:text-rose-200 space-y-1">
                            <p className="font-bold uppercase">Critical Warning</p>
                            <p>Deleting <span className="font-bold underline">"{podName}"</span> will instantly disband the team. All recruiters will be unassigned and active jobs will be moved/unassigned.</p>
                        </div>
                    </div>
                </AlertDialogHeader>

                <div className="py-4 space-y-4 border-y border-slate-100 dark:border-slate-800">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                            <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                            Migrate active jobs to:
                        </Label>
                        <Select value={migrateToPodId} onValueChange={setMigrateToPodId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Do not migrate (unassign jobs)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none" className="text-muted-foreground italic">
                                    None (Drop all active jobs)
                                </SelectItem>
                                {destinationPods.map((pod) => (
                                    <SelectItem key={pod.id} value={pod.id}>
                                        {pod.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            {migrateToPodId === "none"
                                ? "Jobs will remain in the system but won't be assigned to any team."
                                : `All active jobs from "${podName}" will be instantly moved to the selected pod.`}
                        </p>
                    </div>
                </div>

                <div className="flex items-start space-x-3 pt-2">
                    <Checkbox
                        id="confirm-delete"
                        checked={confirmDelete}
                        onCheckedChange={(checked) => setConfirmDelete(!!checked)}
                        className="mt-0.5"
                    />
                    <div className="grid gap-1.5 leading-none">
                        <label
                            htmlFor="confirm-delete"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700 dark:text-slate-300"
                        >
                            I understand that this action is permanent and cannot be undone.
                        </label>
                    </div>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleDelete();
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white"
                        disabled={isDeleting || !confirmDelete}
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            "Permanently Delete"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
