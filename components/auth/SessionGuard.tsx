"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

const PUBLIC_PATHS = ["/auth/login", "/auth/error", "/auth/signout", "/callback"];

/**
 * SessionGuard — watches for session loss across all tabs.
 * When the session becomes unauthenticated (e.g. logout from another tab),
 * it immediately redirects to the login page.
 */
export default function SessionGuard({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (status === "unauthenticated" && !PUBLIC_PATHS.some(p => pathname?.startsWith(p))) {
            router.replace("/auth/login");
        }
    }, [status, router, pathname]);

    return <>{children}</>;
}
