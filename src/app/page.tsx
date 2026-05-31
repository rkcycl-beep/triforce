"use client";

import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      if (session.user.role === "COACH") {
        router.replace("/coach");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D9E75] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      {/* Logo / Brand */}
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1D9E75]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="6" />
            <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-[#085041]">TriForce</h1>
        <p className="mt-2 text-base text-gray-400">מעקב אימונים ואתגרים לקבוצה</p>
      </div>

      {/* Connect button */}
      <div className="w-full max-w-xs">
        <button
          onClick={() => signIn("strava", { callbackUrl: "/dashboard" })}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#1D9E75] px-5 py-4 text-white shadow-md transition-all active:scale-[0.98] hover:bg-[#178c65] hover:shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="text-base font-bold">התחבר עם Strava</span>
        </button>
      </div>

      {/* Footer */}
      <p className="mt-10 text-center text-xs text-gray-300">
        ניתן לחבר Garmin בשלב מאוחר יותר
      </p>
    </div>
  );
}
