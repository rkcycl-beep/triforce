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
  // /invite/* is intentionally public — anyone can open an invite link.
  const protectedPaths = [
    "/dashboard", "/activities", "/challenges", "/profile",
    "/messages", "/events", "/settings", "/friends",
    "/athlete", "/coach", "/groups", "/members", "/compare",
    "/gate",
  ];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Role-first enforcement: each side requires the matching triforce_role cookie.
  const role = request.cookies.get("triforce_role")?.value;

  if (pathname.startsWith("/athlete") && role !== "athlete") {
    return NextResponse.redirect(new URL("/gate", request.url));
  }

  if (pathname.startsWith("/coach") && role !== "coach") {
    return NextResponse.redirect(new URL("/gate", request.url));
  }

  return NextResponse.next();
}

// Only run on page routes — skip API, static files, images
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
