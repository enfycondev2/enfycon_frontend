"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * SessionSyncListener
 * 
 * This component handles the "glitch" where a user is stuck on the loading/hang tight screen
 * even after an admin has assigned them a role. 
 * 
 * It periodically checks the database for fresh roles. If it detects that the user now
 * has roles but the session hasn't updated yet, it triggers a session refresh (JWT update).
 */
export default function SessionSyncListener() {
    const { data: session, update } = useSession();
    const router = useRouter();
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        // Only run if user is logged in but session has no roles
        if (!session?.user) return;
        
        const currentRoles = session.user.roles || [];
        
        const checkRoles = async () => {
            if (isSyncing) return;
            
            try {
                // Fetch fresh user data from backend
                const res = await fetch("/api/auth/me", { cache: "no-store" });
                if (!res.ok) return;
                
                const dbUser = await res.json();
                const dbRoles = dbUser?.roles || [];
                
                // Compare role counts or content
                const needsSync = dbRoles.length > 0 && currentRoles.length === 0;
                
                if (needsSync) {
                    setIsSyncing(true);
                    console.log("[SessionSync] Detected new roles in DB. Synchronizing session...");
                    
                    // Trigger NextAuth session update to refresh the JWT
                    await update({
                        ...session,
                        user: {
                            ...session.user,
                            roles: dbRoles
                        }
                    });
                    
                    // Give it a moment to commit, then push to dashboard to trigger a fresh redirect
                    setTimeout(() => {
                        window.location.href = "/dashboard";
                    }, 500);
                }
            } catch (error) {
                console.error("[SessionSync] Error fetching fresh roles:", error);
            }
        };

        const interval = setInterval(checkRoles, 5000); // Check every 5 seconds
        return () => clearInterval(interval);
    }, [session, update, isSyncing, router]);

    return null; // Background listener only
}
