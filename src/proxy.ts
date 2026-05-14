/**
 * proxy.ts — Protects routes that require authentication.
 *
 * In Next.js 16, this replaces the old "middleware.ts".
 * It runs BEFORE every page load and checks: "Is this user logged in?"
 * If not, it redirects them to the home page to sign in.
 *
 * We check for the NextAuth session cookie directly (instead of getToken())
 * because getToken() can cause "Router action dispatched before initialization"
 * errors in Next.js 16's proxy.
 *
 * Protected routes: /dashboard, /activities, /settings
 * Public routes: / (home/landing), /api/* (API routes handle their own auth)
 */

import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Check for the NextAuth session cookie.
  // NextAuth sets this cookie when the user is logged in.
  // In dev mode (HTTP) it's "next-auth.session-token"
  // In production (HTTPS) it's "__Secure-next-auth.session-token"
  const hasSession =
    request.cookies.has("next-auth.session-token") ||
    request.cookies.has("__Secure-next-auth.session-token");

  // These paths require the user to be logged in (any role).
  // Role-based protection (e.g. /coach) is handled in the route group's
  // server-component layout via getServerSession — proxy can't decode the
  // JWT under Next 16 without triggering "Router action dispatched before
  // initialization" errors (see comment block above).
  const protectedPaths = ["/dashboard", "/activities", "/settings"];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  // If the route is protected and user has no session → redirect to home
  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // The "/" → role-aware redirect is handled by app/page.tsx (server component).
  // We don't redirect from here because we can't read the role from the cookie.

  return NextResponse.next();
}

// Only run on page routes — skip API, static files, images
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
