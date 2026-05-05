/**
 * next-auth.d.ts — Extends NextAuth's built-in types.
 *
 * By default, NextAuth's Session type only has { user: { name, email, image } }.
 * We add custom fields (user.id, accessToken, athleteId) in our auth.ts callbacks
 * and tell TypeScript about them here.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    /** The signed-in user (DB row) */
    user: {
      /** Prisma User.id (cuid) — use this to scope DB queries */
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    /** Strava API access token (expires every 6 hours, auto-refreshed) */
    accessToken: string;
    /** The athlete's Strava numeric ID */
    athleteId: string;
    /** Set to "RefreshTokenError" if Strava refresh failed,
     *  or "InitialSyncError" if the first-sign-in activity sync failed. */
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** Prisma User.id (set on first sign-in via the adapter-provided `user`) */
    userId?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    athleteId?: string;
    error?: string;
  }
}
