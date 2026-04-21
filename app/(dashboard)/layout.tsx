import { ClientRoot } from "@/app/client-root";
import { cookies } from "next/headers";
import SessionGuard from "@/components/auth/session-guard";
import { serverApiClient } from "@/lib/serverApiClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const cookieStore = await cookies();
    const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

    // Fetch fresh user data to determine if we should show the full dashboard shell
    let isApproved = false;
    try {
      const res = await serverApiClient("/auth/me", { cache: "no-store" });
      if (res.ok) {
        const user = await res.json();
        isApproved = (user?.roles && user.roles.length > 0) || user?.isApproved;
      }
    } catch (err) {
      console.error("[DashboardLayout] Error checking approval status:", err);
    }

    return (
      <SessionGuard>
        <ClientRoot defaultOpen={defaultOpen} isApproved={isApproved}>
          {children}
        </ClientRoot>
      </SessionGuard>
    );
  } catch (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Something went wrong!</h2>
        <p className="text-muted-foreground">We couldn't load the layout. Please try again later.</p>
      </div>
    );
  }
}
