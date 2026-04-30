/**
 * auth.ts — NextAuth configuration for Strava OAuth.
 *
 * How OAuth works (simplified):
 * 1. User clicks "Connect with Strava"
 * 2. They're sent to Strava's website to approve access
 * 3. Strava sends them back to our app with a temporary code
 * 4. We exchange that code for an access_token (lets us fetch their data)
 * 5. The access_token expires after 6 hours, so we also get a refresh_token
 *    to get a new one without bothering the user again
 *
 * This file handles ALL of that automatically.
 */

import type { AuthOptions, Account } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { OAuthConfig } from "next-auth/providers/oauth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";

// ─── Custom Strava Provider ───────────────────────────────────
// NextAuth doesn't have a built-in Strava provider, so we define one.

const StravaProvider: OAuthConfig<StravaProfile> = {
  id: "strava",
  name: "Strava",
  type: "oauth",
  authorization: {
    url: "https://www.strava.com/oauth/authorize",
    params: {
      scope: "read,activity:read_all",
      response_type: "code",
      approval_prompt: "auto",
    },
  },
  // Strava requires client_id and client_secret in the POST body,
  // NOT as HTTP Basic Auth headers (which is NextAuth's default).
  // So we handle the token exchange manually.
  token: {
    url: "https://www.strava.com/oauth/token",
    async request({ params }) {
      const code = params.code ?? "";
      const response = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/strava`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Strava token exchange failed");
      }

      return {
        tokens: {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
          token_type: "Bearer",
        },
      };
    },
  },
  userinfo: "https://www.strava.com/api/v3/athlete",
  clientId: process.env.STRAVA_CLIENT_ID,
  clientSecret: process.env.STRAVA_CLIENT_SECRET,
  profile(profile) {
    return {
      id: String(profile.id),
      name: `${profile.firstname} ${profile.lastname}`,
      image: profile.profile,
      email: null,
    };
  },
};

/** Shape of Strava's /athlete response (used in profile() above) */
interface StravaProfile {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;
}

// ─── Token Refresh Logic ──────────────────────────────────────

/**
 * Refresh an expired Strava access token.
 *
 * Strava tokens expire after 6 hours. When that happens, we use
 * the refresh_token to get a new access_token — silently, without
 * the user having to log in again.
 */
async function refreshStravaToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshed = await response.json();

    if (!response.ok) {
      throw new Error(refreshed.message || "Failed to refresh token");
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      expiresAt: refreshed.expires_at,
    };
  } catch (error) {
    console.error("Error refreshing Strava token:", error);
    // Return the old token with an error flag — the UI can handle this
    return { ...token, error: "RefreshTokenError" };
  }
}

// ─── NextAuth Options ─────────────────────────────────────────

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [StravaProvider],

  callbacks: {
    /**
     * JWT callback — runs every time the token is created or accessed.
     *
     * First login: saves the access_token, refresh_token, and expiry.
     * Later visits: checks if the token expired and refreshes if needed.
     */
    async jwt({ token, account }: { token: JWT; account: Account | null }) {
      // First sign-in: save the tokens from Strava
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          athleteId: account.providerAccountId,
        };
      }

      // On later requests: check if the token is still valid
      const expiresAt = token.expiresAt as number | undefined;
      if (expiresAt && Date.now() < expiresAt * 1000) {
        // Token is still good — return it as-is
        return token;
      }

      // Token expired — refresh it
      return refreshStravaToken(token);
    },

    /**
     * Session callback — controls what data the browser can see.
     *
     * We add the accessToken and athleteId to the session so our
     * API routes can use them to fetch data from Strava.
     */
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken as string,
        athleteId: token.athleteId as string,
        error: token.error as string | undefined,
      };
    },
  },

  pages: {
    signIn: "/", // Use our landing page as the sign-in page
    error: "/", // On error, go back to landing page
  },

  // Use JWT strategy (no database needed)
  session: {
    strategy: "jwt",
  },
};
