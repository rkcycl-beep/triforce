"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";

export default function LandingHero() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center px-4 py-16">
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

      <button
        onClick={() => signIn("strava", { callbackUrl: "/dashboard" })}
        className="mt-10 flex min-h-[48px] items-center gap-3 rounded-xl bg-[#FC4C02] px-8 py-3 text-base font-semibold text-white shadow-lg transition-all hover:bg-[#e34402] hover:shadow-xl active:scale-95"
      >
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

      <p className="mt-6 text-center text-xs text-gray-400">
        Garmin can be connected after sign-in via Settings.
      </p>

      <p className="mt-10 text-center text-sm text-gray-500">
        Coaching a group?{" "}
        <Link
          href="/coach/sign-in"
          className="font-medium text-blue-600 hover:text-blue-700"
        >
          Coach sign-in
        </Link>
      </p>
    </div>
  );
}
