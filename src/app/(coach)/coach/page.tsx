"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

interface DashboardData {
  stats: { totalAthletes: number; workoutsThisWeek: number; adherencePct: number; pendingMessages: number };
  groups: { id: string; name: string }[];
}

interface Cube {
  emoji: string;
  label: string;
  sub: string;
  href: string;
  gradient: string;
  shadow: string;
}

export default function CoachHomePage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const router = useRouter();

  const { data } = useQuery<DashboardData>({
    queryKey: ["coach-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/coach/dashboard");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const firstName = session?.user?.name?.split(" ")[0] ?? "מאמן";
  const firstGroup = data?.groups?.[0];
  const hasGroups = (data?.groups?.length ?? 0) > 0;

  // Dynamic links — go directly to group sub-page if there's exactly 1 group
  function groupLink(sub: string) {
    if (!hasGroups) return "/coach/groups/new";
    if (data!.groups.length === 1) return `/coach/groups/${firstGroup!.id}/${sub}`;
    return "/coach/groups";
  }

  const cubes: Cube[] = [
    {
      emoji: "👥",
      label: "מתאמנים",
      sub: data?.stats.totalAthletes ? `${data.stats.totalAthletes} פעילים` : "מצב וסטטוס",
      href: "/coach/stats",
      gradient: "from-[#1D9E75] via-[#158a63] to-[#0d6b4d]",
      shadow: "shadow-[0_12px_28px_rgba(29,158,117,0.3)]",
    },
    {
      emoji: "🏆",
      label: "אתגרים",
      sub: "ניהול ויצירה",
      href: groupLink("challenges/new"),
      gradient: "from-[#e07b3a] via-[#c45e2b] to-[#a34820]",
      shadow: "shadow-[0_12px_28px_rgba(192,94,43,0.25)]",
    },
    {
      emoji: "💬",
      label: "הודעות",
      sub: data?.stats.pendingMessages ? `${data.stats.pendingMessages} השבוע` : "לקבוצה",
      href: groupLink("messages"),
      gradient: "from-[#6366f1] via-[#5558e8] to-[#4338ca]",
      shadow: "shadow-[0_12px_28px_rgba(99,102,241,0.25)]",
    },
    {
      emoji: "📅",
      label: "אירועים",
      sub: "לוח ותכנון",
      href: groupLink("events"),
      gradient: "from-[#0ea5e9] via-[#0284c7] to-[#0369a1]",
      shadow: "shadow-[0_12px_28px_rgba(14,165,233,0.25)]",
    },
    {
      emoji: "📊",
      label: "סטטיסטיקות",
      sub: data?.stats.adherencePct != null ? `${data.stats.adherencePct}% עמידה` : "גרפים ומדדים",
      href: "/coach/stats",
      gradient: "from-slate-500 via-slate-600 to-slate-700",
      shadow: "shadow-[0_12px_28px_rgba(71,85,105,0.25)]",
    },
    {
      emoji: "⚙️",
      label: "קבוצות",
      sub: hasGroups ? `${data!.groups.length} קבוצות` : "צור קבוצה",
      href: hasGroups ? "/coach/groups" : "/coach/groups/new",
      gradient: "from-[#9b59b6] via-[#8e44ad] to-[#6c3483]",
      shadow: "shadow-[0_12px_28px_rgba(155,89,182,0.25)]",
    },
  ];

  return (
    <div className="relative flex min-h-[calc(100vh-120px)] flex-col items-center justify-center overflow-hidden px-4 py-8">
      {/* Background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 30%, rgba(29,158,117,0.06) 0%, transparent 55%), radial-gradient(circle at 80% 80%, rgba(8,80,65,0.04) 0%, transparent 40%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1D9E75] to-[#085041] shadow-[0_6px_20px_rgba(29,158,117,0.3)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="6" />
                <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#085041]">
            שלום, {firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {hasGroups
              ? data!.groups.map((g) => g.name).join(" · ")
              : "ממשק ניהול מאמן"}
          </p>
          {data?.stats && (
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-400">
              <span><strong className="text-[#1D9E75]">{data.stats.totalAthletes}</strong> מתאמנים</span>
              <span>·</span>
              <span><strong className="text-[#1D9E75]">{data.stats.workoutsThisWeek}</strong> אימונים השבוע</span>
            </div>
          )}
        </div>

        {/* Cube Grid — 2×3 */}
        <div className="grid grid-cols-2 gap-4">
          {cubes.map((cube) => (
            <button
              key={cube.label}
              onClick={() => router.push(cube.href)}
              className={`group flex aspect-square flex-col items-center justify-center gap-2 rounded-[20px] border border-white/15 bg-gradient-to-br ${cube.gradient} ${cube.shadow} transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1.5 hover:scale-[1.04] active:translate-y-0.5 active:scale-[0.98]`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-2xl backdrop-blur-sm">
                {cube.emoji}
              </div>
              <span className="text-base font-bold text-white">{cube.label}</span>
              <span className="text-[11px] text-white/60">{cube.sub}</span>
            </button>
          ))}
        </div>

        {/* Sign out */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-slate-400 underline underline-offset-2 hover:text-slate-600">
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
