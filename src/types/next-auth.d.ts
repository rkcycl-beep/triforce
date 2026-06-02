/**
 * next-auth.d.ts — Extends NextAuth's built-in types.
 *
 * Adds the custom fields we set in the auth.ts callbacks:
 *  - user.id (Prisma cuid)
 *  - user.role (COACH | ATHLETE)
 *  - accessToken / athleteId (only present for users who signed in via Strava
 *    or who later linked Strava — coaches without Strava won't have them)
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** Prisma User.id (cuid) — always present after sign-in */
      id: string;
      /** Role on the account (NOT the per-group role) */
      role: "COACH" | "ATHLETE";
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    /** Strava API access token (only for users who have a Strava Account row) */
    accessToken?: string;
    /** The athlete's Strava numeric ID (only for users with Strava linked) */
    athleteId?: string;
    /** ISO timestamp of last Strava activity sync */
    lastStravaSync?: string;
    /** "RefreshTokenError" if Strava refresh failed,
     *  "InitialSyncError" if the first-sign-in activity sync failed. */
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** Prisma User.id */
    userId?: string;
    /** Role on the account */
    role?: "COACH" | "ATHLETE";
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    athleteId?: string;
    lastStravaSync?: string;
    error?: string;
  }
}
