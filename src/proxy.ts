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

  // Public paths that must never be blocked, even when they start with a protected prefix.
  const alwaysPublic = ["/coach/sign-in", "/coach/sign-up"];
  if (alwaysPublic.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // These paths require the user to be logged in (any role).
  // Role-based protection (e.g. /coach requires COACH role) is handled in the
  // route group layout via getServerSession — proxy can't decode the JWT role
  // under Next 16 without triggering "Router action dispatched before init" errors.
  // /invite/* is intentionally public — anyone can open an invite link.
  const protectedPaths = [
    "/dashboard", "/activities", "/challenges", "/profile",
    "/messages", "/events", "/settings", "/friends",
    "/athlete", "/coach", "/groups", "/members", "/compare",
  ];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  // Not authenticated → send to coach sign-in for /coach/* paths, otherwise home
  if (isProtected && !hasSession) {
    const dest = pathname.startsWith("/coach") ? "/coach/sign-in" : "/";
    return NextResponse.redirect(new URL(dest, request.url));
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
