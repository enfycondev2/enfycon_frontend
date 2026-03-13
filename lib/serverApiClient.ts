import { auth } from "@/auth";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://backend.enfycon.com").replace(/\/+$/, "");

/**
 * A wrapper around native `fetch` intended for use in Server Components.
 * 
 * Features:
 * - Uses NextAuth's `auth()` helper to securely get the session on the server.
 * - Automatically prepends the base API URL (NEXT_PUBLIC_API_URL).
 * - Injects the Bearer token. 
 * - In NextAuth, `auth()` will automatically rotate expired tokens if configured in `jwt` callback,
 *   so we do not need a manual retry loop for 401s like the client-side fetcher does.
 * 
 * @param endpoint The API endpoint path (e.g. "/jobs", "users/me").
 * @param options Standard fetch RequestInit options.
 * @returns The Response object from the fetch call.
 */
export async function serverApiClient(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const session = await auth();
    const token = (session as any)?.user?.accessToken;

    const url = `${API_URL}/${endpoint.replace(/^\/+/, "")}`;

    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        console.error(`[serverApiClient] 401 Unauthorized for ${url}. Token might be fully expired or invalid.`);
        // In server components, handling redirects for unauthenticated users is typically
        // done via middleware.ts or throwing specific Next.js redirect() errors in the component.
        // We just return the response to let the caller handle the layout logic.
    }

    return response;
}
