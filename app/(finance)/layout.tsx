import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SessionGuard from "@/components/auth/session-guard";
import FinanceShell from "./FinanceShell";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    // 1. Unlogged users -> Login
    if (!session?.user) {
        redirect("/auth/login");
    }

    // 2. Check for FIN_ADMIN role
    const roles = (session.user as any)?.roles || [];
    const normalizedRoles = roles.map((r: string) => r.toUpperCase());

    if (!normalizedRoles.includes("FIN_ADMIN")) {
        // Redirect to respective dashboards if not FIN_ADMIN
        if (normalizedRoles.includes("ADMIN")) {
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
            // Default fallback
            redirect("/dashboard");
        }
    }

    const cookieStore = await cookies();
    const theme = cookieStore.get("theme")?.value ?? "light";
    return (
        <SessionGuard>
            <FinanceShell theme={theme}>
                {children}
            </FinanceShell>
        </SessionGuard>
    );
}
