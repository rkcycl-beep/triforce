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

import type { AuthOptions, Account, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { OAuthConfig } from "next-auth/providers/oauth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { syncStravaActivitiesForUser } from "@/services/sync.service";

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

// ─── Credentials Provider (coach email/password) ──────────────
// PrismaAdapter does NOT auto-create User rows for Credentials sign-ins —
// users register via /api/coach/register first, then sign in here.

const CoachCredentialsProvider = CredentialsProvider({
  id: "credentials",
  name: "Email and password",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const email = credentials?.email?.toLowerCase().trim();
    const password = credentials?.password;
    if (!email || !password) return null;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;

    // Return shape becomes the `user` argument in the jwt callback.
    // `id` MUST be the Prisma cuid — it propagates to JWT.userId.
    return {
      id: user.id,
      name: user.name ?? null,
      email: user.email,
      image: user.image,
      role: user.role,
    };
  },
});

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  providers: [StravaProvider, CoachCredentialsProvider],

  callbacks: {
    /**
     * JWT callback — runs every time the token is created or accessed.
     *
     * First login: saves the access_token, refresh_token, expiry, AND
     * triggers an initial Strava-activity sync so the dashboard has data
     * to read from the DB on first dashboard load.
     * Later visits: checks if the token expired and refreshes if needed.
     */
    async jwt({
      token,
      account,
      user,
    }: {
      token: JWT;
      account: Account | null;
      user?: User & { role?: "COACH" | "ATHLETE" };
    }): Promise<JWT> {
      // OAuth (Strava) first sign-in: account + user both populated by the adapter.
      if (account && user && account.provider !== "credentials") {
        // Look up role + last sync once on first sign-in.
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, lastStravaSync: true },
        });
        let syncError: string | undefined;
        if (account.access_token) {
          try {
            await syncStravaActivitiesForUser(user.id, account.access_token);
          } catch (error) {
            console.error("Initial Strava sync failed:", error);
            syncError = "InitialSyncError";
          }
        }
        return {
          ...token,
          userId: user.id,
          role: dbUser?.role ?? "ATHLETE",
          lastStravaSync: dbUser?.lastStravaSync?.toISOString() ?? undefined,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          athleteId: account.providerAccountId,
          error: syncError,
        };
      }

      // Credentials first sign-in: no account.access_token, no Strava sync.
      // `user.role` comes straight from CoachCredentialsProvider.authorize().
      if (user) {
        return {
          ...token,
          userId: user.id,
          role: user.role ?? "ATHLETE",
        };
      }

      // Subsequent requests with no Strava token — pure Credentials sessions.
      if (!token.expiresAt && !token.refreshToken) {
        return token;
      }

      // Strava-backed token: check if still valid.
      const expiresAt = token.expiresAt as number | undefined;
      if (expiresAt && Date.now() < expiresAt * 1000) {
        return token;
      }

      // Expired — refresh.
      return refreshStravaToken(token);
    },

    /**
     * Session callback — controls what data the browser can see.
     *
     * We add user.id (DB cuid), accessToken, and athleteId so server-side
     * route handlers can scope DB queries and call Strava on the user's behalf.
     */
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId as string,
          role: (token.role as "COACH" | "ATHLETE") ?? "ATHLETE",
        },
        accessToken: token.accessToken as string | undefined,
        athleteId: token.athleteId as string | undefined,
        lastStravaSync: token.lastStravaSync as string | undefined,
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
