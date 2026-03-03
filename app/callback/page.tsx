"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://api.enfycon.com").replace(/\/+$/, "");

function normalizeRedirectUri(rawUri: string): string {
  let normalized = rawUri.trim();
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Keep original if not URI-encoded.
  }

  try {
    return new URL(normalized).toString();
  } catch {
    return "http://localhost:3000/callback";
  }
}

const REDIRECT_URI = normalizeRedirectUri(
  process.env.NEXT_PUBLIC_SSO_REDIRECT_URI || "http://localhost:3000/callback"
);

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const hasFetched = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || hasFetched.current) return;
    hasFetched.current = true;

    const run = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/sso-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            redirectUri: REDIRECT_URI,
          }),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.message || "SSO exchange failed.");
        }

        const accessToken = data?.access_token || data?.accessToken;
        const refreshToken = data?.refresh_token || data?.refreshToken;
        const expiresIn = data?.expires_in || data?.expiresIn;

        if (!accessToken || !data?.user) {
          throw new Error("Missing token or user in SSO response.");
        }

        const signInResult = await signIn("credentials", {
          accessToken,
          userString: JSON.stringify(data.user),
          refreshToken: refreshToken || "",
          expiresIn: expiresIn?.toString() || "",
          redirect: false,
        });

        if (signInResult?.error) {
          throw new Error(signInResult.error);
        }

        router.replace("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed.");
      }
    };

    void run();
  }, [code, router]);

  if (!code) {
    return <div className="p-6">Missing SSO authorization code.</div>;
  }

  if (error) {
    return <div className="p-6">Authentication failed: {error}</div>;
  }

  return <div className="p-6">Authenticating with Microsoft...</div>;
}
