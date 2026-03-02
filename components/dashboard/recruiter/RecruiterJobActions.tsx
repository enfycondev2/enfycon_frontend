"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useSession } from "next-auth/react";
import JobSubmissionDialog from "./JobSubmissionDialog";

interface RecruiterJobActionsProps {
    jobId: string;
    jobCode: string;
    status: string;
}

export default function RecruiterJobActions({ jobId, jobCode, status }: RecruiterJobActionsProps) {
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const token = (session as any)?.user?.accessToken;

    return (
        <>
            <Button
                className="shrink-0 gap-2"
                disabled={status === "CLOSED" || status === "FILLED"}
                onClick={() => setOpen(true)}
            >
                <UserPlus className="h-4 w-4" />
                Submit Candidate
            </Button>

            {open && (
                <JobSubmissionDialog
                    isOpen={open}
                    onClose={() => setOpen(false)}
                    jobCode={jobCode}
                    recruiterId={(session?.user as any)?.id || ""}
                    token={token}
                    onSuccess={() => setOpen(false)}
                />
            )}
        </>
    );
}
