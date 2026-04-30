/**
 * [...nextauth]/route.ts — The NextAuth API route handler.
 *
 * This file creates the endpoints that handle the OAuth dance:
 *   GET  /api/auth/signin     → Redirects to Strava login page
 *   GET  /api/auth/callback/* → Strava sends the user back here
 *   GET  /api/auth/signout    → Logs the user out
 *   GET  /api/auth/session    → Returns the current session
 *
 * The [...nextauth] folder name is special Next.js syntax meaning
 * "catch all routes under /api/auth/*" — NextAuth handles the rest.
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
