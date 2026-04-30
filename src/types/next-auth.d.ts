/**
 * next-auth.d.ts — Extends NextAuth's built-in types.
 *
 * By default, NextAuth's Session type only has { user: { name, email, image } }.
 * But we added custom fields (accessToken, athleteId) in our auth.ts callbacks.
 * This file tells TypeScript about those extra fields so we don't get errors.
 *
 * The "declare module" syntax is TypeScript's way of saying:
 * "Hey TypeScript, this existing module also has these extra properties."
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    /** Strava API access token (expires every 6 hours, auto-refreshed) */
    accessToken: string;
    /** The athlete's Strava numeric ID */
    athleteId: string;
    /** Set to "RefreshTokenError" if token refresh failed */
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    athleteId?: string;
    error?: string;
  }
}
