"use client";

import { useEffect } from "react";
import { useSession, signIn, signOut as nextAuthSignOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { setRoleCookie, clearRoleCookie } from "@/lib/roleCookie";

interface GateCardProps {
  title: string;
  description: string;
  badge: string;
  gradient: string;
  shadow: string;
  onClick: () => void;
}

function GateCard({ title, description, badge, gradient, shadow, onClick }: GateCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-[28px] ${gradient} ${shadow} p-6 text-start text-white transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]`}
    >
      {/* Decorative sheen */}
      <div className="pointer-events-none absolute -start-1/4 -top-1/2 h-full w-1/2 -rotate-12 bg-gradient-to-r from-white/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      {/* Arrow */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute start-6 top-6 text-white/70 transition-transform duration-300 group-hover:-translate-x-1 rtl:rotate-180"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>

      {/* Title */}
      <h2 className="relative z-10 text-3xl font-extrabold tracking-tight">{title}</h2>

      {/* Description */}
      <p className="relative z-10 mt-2 text-sm font-medium text-white/90">{description}</p>

      {/* Badge */}
      <span className="relative z-10 mt-4 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
        {badge}
      </span>
    </button>
  );
}

export default function GatePage() {
  const { status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  const chooseAthlete = () => {
    setRoleCookie("athlete");
    router.push("/athlete");
  };

  const chooseCoach = () => {
    setRoleCookie("coach");
    router.push("/coach");
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D9E75] border-t-transparent" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <button
          onClick={() => signIn("strava", { callbackUrl: "/gate" })}
          className="rounded-xl bg-[#1D9E75] px-6 py-3 font-semibold text-white"
        >
          {t("landing.connectStrava")}
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-10">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 30%, rgba(29, 158, 117, 0.05) 0%, transparent 55%), radial-gradient(circle at 20% 80%, rgba(37, 99, 235, 0.04) 0%, transparent 40%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Top identity */}
        <div className="mb-2 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1D9E75] to-[#085041] shadow-[0_6px_20px_rgba(29,158,117,0.3)]">
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

        <h1 className="text-center text-3xl font-extrabold tracking-tight text-[#085041]">
          TriForce
        </h1>
        <p className="text-center text-xl font-semibold text-gray-800">Sports App</p>
        <p className="mt-2 text-center text-base text-slate-500">{t("gate.title")}</p>

        {/* Cards */}
        <div className="mt-10 flex flex-col gap-4">
          <GateCard
            title={t("gate.athleteTitle")}
            description={t("gate.athleteDesc")}
            badge={t("gate.athleteBadge")}
            gradient="bg-gradient-to-br from-[#22c55e] to-[#16a34a]"
            shadow="shadow-[0_12px_28px_rgba(34,197,94,0.3)]"
            onClick={chooseAthlete}
          />

          <GateCard
            title={t("gate.personalTrainerTitle")}
            description={t("gate.personalTrainerDesc")}
            badge={t("gate.trainerBadge")}
            gradient="bg-gradient-to-br from-[#3b82f6] to-[#2563eb]"
            shadow="shadow-[0_12px_28px_rgba(59,130,246,0.3)]"
            onClick={chooseCoach}
          />

          <GateCard
            title={t("gate.teamTrainerTitle")}
            description={t("gate.teamTrainerDesc")}
            badge={t("gate.trainerBadge")}
            gradient="bg-gradient-to-br from-[#6366f1] to-[#4f46e5]"
            shadow="shadow-[0_12px_28px_rgba(99,102,241,0.3)]"
            onClick={chooseCoach}
          />
        </div>

        <p className="mt-8 text-center text-xs leading-5 text-slate-400">{t("gate.note")}</p>

        <button
          onClick={() => { clearRoleCookie(); nextAuthSignOut({ callbackUrl: "/" }); }}
          className="mx-auto mt-3 block text-xs text-slate-400 underline underline-offset-2 transition-colors hover:text-slate-600"
        >
          {t("gate.signOut")}
        </button>
      </div>
    </div>
  );
}
