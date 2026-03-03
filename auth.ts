import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { ZodError } from "zod"
import { loginSchema } from "./lib/zod"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      roles: string[]
      accessToken: string
      podName?: string | null
      email: string
      name: string
      image?: string | null
    }
    error?: "RefreshTokenError"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string
    refreshToken: string
    expiresAt: number
    roles: string[]
    podName?: string | null
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    error?: "RefreshTokenError"
  }
}


/**
 * Calculates the next occurrence of 6:30 PM IST (13:00 UTC).
 * If the current time is already past 13:00 UTC today, it returns 13:00 UTC tomorrow.
 */
function getNextScheduledLogout(): number {
  const now = new Date();
  const scheduledTime = new Date(now);

  // Set to 13:00:00 UTC (which is 18:30:00 IST)
  scheduledTime.setUTCHours(13, 0, 0, 0);

  // If we already passed 13:00 UTC today, the next logout is tomorrow
  if (now.getTime() >= scheduledTime.getTime()) {
    scheduledTime.setUTCDate(scheduledTime.getUTCDate() + 1);
  }

  return scheduledTime.getTime();
}

// Base URL for API calls. Standardizing this prevents double-slash issues.
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://api.enfycon.com").replace(/\/+$/, "");

// Global variable to store the refresh promise and avoid multiple simultaneous refresh calls
let refreshPromise: Promise<any> | null = null;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        accessToken: {},
        userString: {},
        refreshToken: {},
        expiresIn: {},
      },
      authorize: async (credentials) => {
        try {
          const ssoAccessToken = credentials?.accessToken as string | undefined;
          const userString = credentials?.userString as string | undefined;
          const ssoRefreshToken = credentials?.refreshToken as string | undefined;
          const ssoExpiresIn = credentials?.expiresIn ? Number(credentials.expiresIn) : undefined;

          // SSO callback path: backend has already validated code and returned user + token.
          if (ssoAccessToken && userString) {
            const parsedUser = JSON.parse(userString);
            return {
              ...parsedUser,
              id: parsedUser.id,
              email: parsedUser.email,
              name: parsedUser.fullName || parsedUser.name || parsedUser.email,
              roles: parsedUser.roles || [],
              accessToken: ssoAccessToken,
              refreshToken: ssoRefreshToken,
              expiresIn: ssoExpiresIn,
            };
          }

          // Validate credentials locally without async wait if possible
          const { email, password } = loginSchema.parse(credentials);

          // Hitting the custom backend login endpoint with offline_access scope
          const res = await fetch(`${API_URL}/auth/login?scope=offline_access`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          if (!res.ok) return null;
          const data = await res.json();

          if (!data?.user || !(data?.access_token || data?.accessToken)) {
            console.error("Invalid response from auth server:", {
              hasUser: !!data?.user,
              hasToken: !!(data?.access_token || data?.accessToken),
              keys: Object.keys(data || {})
            });
            return null;
          }

          // Extract tokens with fallbacks for both formats
          const {
            user: userData,
            access_token,
            accessToken,
            refresh_token,
            refreshToken,
            expires_in,
            expiresIn
          } = data

          const finalAccessToken = access_token || accessToken;
          const finalRefreshToken = refresh_token || refreshToken;
          const finalExpiresIn = expires_in || expiresIn;

          console.log("Login successful. Mapping tokens:", {
            accessToken: !!finalAccessToken,
            refreshToken: !!finalRefreshToken,
            expiresIn: finalExpiresIn
          });

          return {
            ...userData,
            id: userData.id,
            email: userData.email,
            name: userData.fullName || userData.email,
            roles: userData.roles,
            accessToken: finalAccessToken,
            refreshToken: finalRefreshToken,
            expiresIn: finalExpiresIn,
          }
        }
        catch (error) {
          console.error("Authorization error:", error);
          if (error instanceof ZodError || error instanceof SyntaxError) {
            return null
          }
          return null
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours fallback
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        let expiresAt = Date.now() + 3600 * 1000; // Default 1 hour

        if ((user as any).expiresIn) {
          // From Credentials provider
          console.log("Setting expiry from user.expiresIn:", (user as any).expiresIn);
          expiresAt = Date.now() + (user as any).expiresIn * 1000;
        } else if (account.expires_at) {
          // From OAuth providers
          console.log("Setting expiry from account.expires_at:", account.expires_at);
          expiresAt = account.expires_at * 1000;
        }

        // CAP EXPIRE AT TO NEXT 6:30 PM IST (13:00 UTC)
        const scheduledLogout = getNextScheduledLogout();
        console.log("Scheduled logout check:", {
          calculatedExpiresAt: new Date(expiresAt).toISOString(),
          scheduledLogout: new Date(scheduledLogout).toISOString(),
          capping: expiresAt > scheduledLogout
        });
        if (expiresAt > scheduledLogout) {
          expiresAt = scheduledLogout;
        }

        console.log("Initial sign-in successful.", {
          userId: user.id,
          hasAccessToken: !!((user as any).accessToken || account.access_token),
          hasRefreshToken: !!((user as any).refreshToken || account.refresh_token),
          expiresAt: new Date(expiresAt).toISOString(),
        });

        const newToken = {
          ...token,
          accessToken: (user as any).accessToken || account.access_token,
          refreshToken: (user as any).refreshToken || account.refresh_token,
          expiresAt,
          roles: (user as any).roles || [],
          podName: (user as any).podName || (user as any).pod?.name || null,
          id: user.id as string,
          name: user.name || (user as any).fullName,
          email: user.email,
          image: user.image || (user as any).picture,
        }

        return newToken;
      }

      // Return previous token if the access token has not expired yet
      // Increased buffer to 60s to be safer for short 5min sessions
      const isExpired = Date.now() >= token.expiresAt - 60 * 1000;

      if (!isExpired) {
        return token
      }

      // Access token has expired, try to update it
      console.log("JWT Refresh Branch Triggered:", {
        now: new Date().toISOString(),
        expiresAt: new Date(token.expiresAt).toISOString(),
        diffMs: token.expiresAt - Date.now(),
        isExpired
      });
      if (refreshPromise) {
        return await refreshPromise;
      }

      console.log("Refresh required. Token state:", {
        now: new Date().toISOString(),
        expiresAt: new Date(token.expiresAt).toISOString(),
        hasRefreshToken: !!token.refreshToken,
        id: token.id
      });

      refreshPromise = (async () => {
        try {
          const refreshUrl = `${API_URL}/auth/refresh`;

          console.log(`Attempting refresh at ${refreshUrl} (JSON format)...`, {
            tokenPrefix: token.refreshToken?.substring(0, 15),
            nowIST: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            expiresAtIST: new Date(token.expiresAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
          });

          const response = await fetch(refreshUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              refresh_token: token.refreshToken,
              refreshToken: token.refreshToken,
              grant_type: "refresh_token",
              client_id: process.env.KEYCLOAK_CLIENT_ID || "submission_tracker_app",
              client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
            }),
          })

          const tokens = await response.json()
          console.log("Refresh response raw data:", tokens);

          if (!response.ok) {
            console.error("Refresh token API error details:", {
              status: response.status,
              url: refreshUrl,
              sentBodyKeys: ["refresh_token", "refreshToken", "grant_type", "client_id"],
              responseBody: tokens
            });
            throw tokens;
          }

          const {
            access_token,
            accessToken,
            refresh_token,
            refreshToken,
            expires_in,
            expiresIn
          } = tokens;

          const finalAccessToken = access_token || accessToken;
          const finalRefreshToken = refresh_token || refreshToken || token.refreshToken;
          const finalExpiresIn = expires_in || expiresIn;

          let expiresAt = Date.now() + (finalExpiresIn ?? 300) * 1000;

          const scheduledLogout = getNextScheduledLogout();
          if (expiresAt > scheduledLogout) {
            expiresAt = scheduledLogout;
          }

          console.log("Successfully refreshed token. Mapping:", {
            hasAccessToken: !!finalAccessToken,
            hasRefreshToken: !!finalRefreshToken,
            expiresAt: new Date(expiresAt).toISOString()
          });

          return {
            ...token,
            accessToken: finalAccessToken,
            refreshToken: finalRefreshToken,
            expiresAt,
            error: null
          }
        } catch (error) {
          console.error("Failed to refresh access token. Error details:", error);
          // Only set error if it's a real failure, not just a network hiccup?
          // But usually we set it to force re-login.
          return { ...token, error: "RefreshTokenError" }
        } finally {
          setTimeout(() => {
            refreshPromise = null;
          }, 10000);
        }
      })();

      return await refreshPromise;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.roles = token.roles
        session.user.accessToken = token.accessToken
        session.user.podName = token.podName || null
        session.user.image = token.image
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.error = token.error
      }
      return session
    },
  },
})
