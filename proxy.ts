import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "./auth";

const publicRoutes = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/create-password",
  "/callback",
];

const roleRouteAccess = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/account-manager", roles: ["ACCOUNT_MANAGER", "ACCOUNT-MANAGER"] },
  { prefix: "/delivery-head", roles: ["DELIVERY_HEAD", "DELIVERY-HEAD"] },
  { prefix: "/recruiter", roles: ["RECRUITER"] },
  { prefix: "/pod-lead", roles: ["POD_LEAD", "POD-LEAD"] },
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/manifest.json")
  ) {
    return NextResponse.next();
  }

  let session = null;

  try {
    session = await auth();
    console.log("Proxy session check:", {
      pathname,
      hasSession: !!session,
      error: session?.error
    });
  } catch (error) {
    console.error("Proxy auth error:", error);
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

  if (!session?.user && !isPublic) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const userRoles = (((session?.user as { roles?: string[] } | undefined)?.roles) || [])
    .map((role) => role.toUpperCase().replace(/\s+|-|_/g, "_"));

  const requiredAccess = roleRouteAccess.find((route) => pathname.startsWith(route.prefix));
  if (requiredAccess && !requiredAccess.roles.some((role) => userRoles.includes(role))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}
