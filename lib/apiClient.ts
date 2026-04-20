import { getSession, signOut } from "next-auth/react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://api.enfycon.com").replace(/\/+$/, "");

/**
 * A wrapper around native `fetch` intended for use in Client Components ("use client").
 * 
 * Features:
 * - Automatically prepends the base API URL (NEXT_PUBLIC_API_URL).
 * - Injects the Bearer token from the NextAuth session.
 * - Automatically handles 401 Unauthorized errors by attempting to refresh the session
 *   and retrying the request once. 
 * - If the retry fails with 401 (e.g. refresh token expired), it forces a logout.
 * 
 * @param endpoint The API endpoint path (e.g. "/jobs", "users/me").
 * @param options Standard fetch RequestInit options.
 * @returns The Response object from the fetch call.
 */
export async function apiClient(endpoint: string, options: RequestInit = {}): Promise<Response> {
    // 1. Get the current session
    let session = await getSession();
    let token = (session as any)?.user?.accessToken;

    const url = `${API_URL}/${endpoint.replace(/^\/+/, "")}`;

    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    // 2. Make the initial request
    let response = await fetch(url, {
        ...options,
        headers,
    });

    // 3. Handle 401 Unauthorized
    if (response.status === 401) {
        console.warn(`[apiClient] 401 Unauthorized for ${url}. Attempting to refresh token...`);

        // Eagerly call getSession() to force NextAuth's jwt callback to evaluate expiration
        // and fetch a new token from Keycloak if needed. NextAuth handles the debouncing internally.
        // We pass { broadcast: true } / { update: true } equivalent if update() was exposed, 
        // but getSession() triggers a fetch to /api/auth/session which forces a check.
        // In NextAuth v5, `update()` from `useSession` is also an option, but `getSession` works standalone.
        session = await getSession();
        token = (session as any)?.user?.accessToken;

        if (token) {
            headers.set("Authorization", `Bearer ${token}`);

            // Retry the request ONCE with the new token
            response = await fetch(url, {
                ...options,
                headers,
            });

            // If it still returns 401, the refresh token is also likely expired
            if (response.status === 401) {
                console.error(`[apiClient] Retry also failed with 401 for ${url}. Forcing sign out.`);
                // Force logout as the user session is completely invalid
                signOut({ callbackUrl: "/login" });
            }
        } else {
            console.error(`[apiClient] No token available after refresh attempt for ${url}. Forcing sign out.`);
            signOut({ callbackUrl: "/login" });
        }
    }

    return response;
}
