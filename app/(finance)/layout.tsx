import { cookies } from "next/headers";
import SessionGuard from "@/components/auth/session-guard";
import FinanceShell from "./FinanceShell";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
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
