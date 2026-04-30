"use client";

/**
 * Landing Page (/) — The first page users see.
 *
 * Shows a "Sign in with Strava" button.
 * If the user is already logged in, the proxy.ts redirects them to /dashboard,
 * so they'll never actually see this page when logged in.
 */

import { signIn } from "next-auth/react";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      {/* Hero section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
          TriForce
        </h1>
        <p className="mt-3 text-lg text-gray-600 md:text-xl">
          Your Strava &amp; Garmin data, unified.
        </p>
        <p className="mt-1 text-sm text-gray-400">
          Track activities, heart rate, VO2max, and routes in one place.
        </p>
      </div>

      {/* Sign in button — Strava orange (#FC4C02) */}
      <button
        onClick={() => signIn("strava", { callbackUrl: "/dashboard" })}
        className="mt-10 flex min-h-[48px] items-center gap-3 rounded-xl bg-[#FC4C02] px-8 py-3 text-base font-semibold text-white shadow-lg transition-all hover:bg-[#e34402] hover:shadow-xl active:scale-95"
      >
        {/* Activity pulse icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Connect with Strava
      </button>

      {/* Footer hint */}
      <p className="mt-6 text-center text-xs text-gray-400">
        Garmin can be connected after sign-in via Settings.
      </p>
    </div>
  );
}
