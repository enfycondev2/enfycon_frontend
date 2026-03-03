"use server"

import { signOut } from "@/auth";
import { redirect } from "next/navigation";

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

export async function doSocialLogin (formData:FormData) {
    const action = formData.get("action");
    if (action !== "microsoft") {
      redirect("/auth/login");
    }

    const issuer = process.env.KEYCLOAK_ISSUER?.replace(/\/+$/, "");
    const clientId = process.env.KEYCLOAK_CLIENT_ID;
    const redirectUri = normalizeRedirectUri(
      process.env.NEXT_PUBLIC_SSO_REDIRECT_URI || "http://localhost:3000/callback"
    );
    const scope = "openid profile email offline_access";

    if (!issuer || !clientId) {
      console.error("Missing KEYCLOAK_ISSUER or KEYCLOAK_CLIENT_ID for SSO redirect.");
      redirect("/auth/login");
    }

    const authUrl = new URL(`${issuer}/protocol/openid-connect/auth`);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("kc_idp_hint", "microsoft");

    redirect(authUrl.toString());
}

export async function doLogout () {
    await signOut();
}
