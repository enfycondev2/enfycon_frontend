import { auth } from "@/auth";
import { Smile } from "lucide-react";
import { redirect } from "next/navigation";

export default async function DashboardRedirect() {
    const session = await auth();

    if (!session?.user) {
        redirect("/auth/login");
    }

    const roles = (session.user as any)?.roles || [];

    // Standardize roles for comparison
    const normalizedRoles = roles.map((r: string) => r.toUpperCase());

    if (normalizedRoles.includes("FIN_ADMIN")) {
        redirect("/finance");
    } else if (normalizedRoles.includes("ADMIN")) {
        redirect("/admin/dashboard");
    } else if (normalizedRoles.includes("DELIVERY_HEAD") || normalizedRoles.includes("DELIVERY-HEAD")) {
        redirect("/delivery-head/dashboard");
    } else if (normalizedRoles.includes("POD_LEAD") || normalizedRoles.includes("POD-LEAD")) {
        redirect("/pod-lead/dashboard");
    } else if (normalizedRoles.includes("ACCOUNT_MANAGER") || normalizedRoles.includes("ACCOUNT-MANAGER")) {
        redirect("/account-manager/dashboard");
    } else if (normalizedRoles.includes("RECRUITER")) {
        redirect("/recruiter/dashboard");
    } else {
        // Default fallback if no specific role matched
        return (
            <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center p-4">
                <div className="text-center max-w-md mx-auto p-10 bg-white dark:bg-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-neutral-100 dark:border-slate-700/50">
                    <div className="flex justify-center mb-8 relative">
                        <div className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full w-28 h-28 mx-auto animate-pulse"></div>
                        <div className="w-28 h-28 bg-yellow-400/10 rounded-full flex items-center justify-center relative shadow-inner">
                            <Smile className="w-16 h-16 text-yellow-500 animate-bounce drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                        </div>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold mb-4 text-neutral-800 dark:text-neutral-100 tracking-tight">Hang Tight!</h1>
                    <p className="text-neutral-500 dark:text-neutral-400 text-base sm:text-lg mb-2 leading-relaxed">
                        We're preparing your workspace.
                    </p>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-2 leading-relaxed">
                        Please kindly wait while your designation is assigned by your admin.
                    </p>
                </div>
            </div>
        );
    }
}
