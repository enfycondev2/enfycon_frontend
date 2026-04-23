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

    let isApproved = false;
    try {
      const { auth } = await import("@/auth");
      const session = await auth();
      const roles = (session?.user as any)?.roles;
      isApproved = (roles && roles.length > 0) ? true : false;
    } catch (err) {
      console.error("[DashboardLayout] Error checking approval status from session:", err);
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
