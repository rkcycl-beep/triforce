"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const isAuth = status === "authenticated";
  const role = session?.user?.role;

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8faf9]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D9E75] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#f8faf9] px-6">
      {/* Subtle background pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 40%, rgba(29, 158, 117, 0.05) 0%, transparent 50%), radial-gradient(circle at 30% 70%, rgba(8, 80, 65, 0.03) 0%, transparent 40%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[420px] text-center">
        {/* Logo / Brand */}
        <div className="mb-3 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1D9E75] to-[#085041] shadow-[0_6px_20px_rgba(29,158,117,0.25)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
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
        </div>
        <h1 className="text-[1.75rem] font-extrabold tracking-tight text-[#085041]">
          TriForce
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {t("landing.tagline")}
        </p>

        {/* User greeting when logged in */}
        {isAuth && (
          <p className="mt-2 text-sm font-medium text-[#1D9E75]">
            {t("landing.greeting", { name: session?.user?.name || t("landing.userFallback") })}
          </p>
        )}

        {/* 5 Cubes Grid */}
        <div className="mt-10 grid grid-cols-2 gap-4">
          {/* Cube 1: Athlete */}
          <button
            onClick={() => {
              if (isAuth && role === "ATHLETE") {
                router.push("/dashboard");
              } else {
                signIn("strava", { callbackUrl: "/dashboard" });
              }
            }}
            className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-[20px] border border-white/15 bg-gradient-to-br from-[#1D9E75] via-[#158a63] to-[#0d6b4d] shadow-[0_12px_28px_rgba(29,158,117,0.3),0_4px_8px_rgba(29,158,117,0.15)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1.5 hover:scale-[1.04] hover:shadow-[0_20px_40px_rgba(29,158,117,0.4),0_6px_12px_rgba(29,158,117,0.2)] active:translate-y-0.5 active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-xl backdrop-blur-sm">
              🏃
            </div>
            <span className="text-base font-bold text-white">{t("landing.athlete")}</span>
            <span className="text-xs text-white/60">
              {isAuth && role === "ATHLETE" ? t("landing.toDashboard") : "Strava"}
            </span>
          </button>

          {/* Cube 2: Coach */}
          <button
            onClick={() => {
              if (isAuth && role === "COACH") {
                router.push("/coach");
              } else {
                router.push("/coach/sign-in");
              }
            }}
            className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-[20px] border border-white/15 bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 shadow-[0_12px_28px_rgba(51,65,85,0.25),0_4px_8px_rgba(51,65,85,0.12)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1.5 hover:scale-[1.04] hover:shadow-[0_20px_40px_rgba(51,65,85,0.35),0_6px_12px_rgba(51,65,85,0.18)] active:translate-y-0.5 active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-xl backdrop-blur-sm">
              👤
            </div>
            <span className="text-base font-bold text-white">{t("landing.coach")}</span>
            <span className="text-xs text-white/60">
              {isAuth && role === "COACH" ? t("landing.coachDashboard") : t("landing.coachSignIn")}
            </span>
          </button>

          {/* Cube 3: Challenges */}
          <button
            onClick={() => router.push("/challenges")}
            className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-[20px] border border-white/15 bg-gradient-to-br from-[#e07b3a] via-[#c45e2b] to-[#a34820] shadow-[0_12px_28px_rgba(192,94,43,0.25),0_4px_8px_rgba(192,94,43,0.12)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1.5 hover:scale-[1.04] hover:shadow-[0_20px_40px_rgba(192,94,43,0.35),0_6px_12px_rgba(192,94,43,0.18)] active:translate-y-0.5 active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-xl backdrop-blur-sm">
              🏆
            </div>
            <span className="text-base font-bold text-white">{t("landing.challenges")}</span>
            <span className="text-xs text-white/60">{t("landing.yourChallenges")}</span>
          </button>

          {/* Cube 4: Members */}
          <button
            onClick={() => router.push("/members")}
            className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-[20px] border border-white/15 bg-gradient-to-br from-[#9b59b6] via-[#8e44ad] to-[#6c3483] shadow-[0_12px_28px_rgba(155,89,182,0.25),0_4px_8px_rgba(155,89,182,0.12)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1.5 hover:scale-[1.04] hover:shadow-[0_20px_40px_rgba(155,89,182,0.35),0_6px_12px_rgba(155,89,182,0.18)] active:translate-y-0.5 active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-xl backdrop-blur-sm">
              👥
            </div>
            <span className="text-base font-bold text-white">{t("landing.members")}</span>
            <span className="text-xs text-white/60">{t("landing.myFriends")}</span>
          </button>

          {/* Cube 5: Settings */}
          <button
            onClick={() => router.push("/settings")}
            className="group col-span-2 mx-auto flex aspect-[2/1] w-full max-w-[200px] flex-col items-center justify-center gap-2 rounded-[20px] border border-white/15 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 shadow-[0_12px_28px_rgba(37,99,235,0.25),0_4px_8px_rgba(37,99,235,0.12)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1.5 hover:scale-[1.04] hover:shadow-[0_20px_40px_rgba(37,99,235,0.35),0_6px_12px_rgba(37,99,235,0.18)] active:translate-y-0.5 active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-xl backdrop-blur-sm">
              ⚙️
            </div>
            <span className="text-base font-bold text-white">{t("landing.settings")}</span>
            <span className="text-xs text-white/60">{t("landing.deviceSetup")}</span>
          </button>
        </div>

        {/* Sign out link when logged in */}
        {isAuth && (
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-6 text-sm text-slate-400 underline underline-offset-2 transition-colors hover:text-slate-600"
          >
            {t("landing.signOut")}
          </button>
        )}

        {/* Footer hint */}
        <p className="mt-6 text-xs text-slate-300">
          {t("landing.garminNote")}
        </p>
      </div>
    </div>
  );
}
