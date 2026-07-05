"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
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

  const firstName = session?.user?.name?.split(" ")[0] ?? t("members.coach");
  const firstGroup = data?.groups?.[0];
  const hasGroups = (data?.groups?.length ?? 0) > 0;

  // Dynamic links — go directly to group sub-page if there's exactly 1 group
  function groupLink(sub: string) {
    if (!hasGroups) return "/coach/groups/new";
    if (data!.groups.length === 1) return `/coach/groups/${firstGroup!.id}/${sub}`;
    return "/coach/groups";
  }

  function challengeLink() {
    if (!hasGroups) return "/coach/groups/new";
    return `/challenges/new?groupId=${firstGroup!.id}&redirectTo=/coach`;
  }

  const cubes: Cube[] = [
    {
      emoji: "👥",
      label: t("coach.members"),
      sub: data?.stats.totalAthletes ? t("coach.activeAthletes").replace("{count}", String(data.stats.totalAthletes)) : t("coach.statusAndState"),
      href: "/coach/stats",
      gradient: "from-[#1D9E75] via-[#158a63] to-[#0d6b4d]",
      shadow: "shadow-[0_12px_28px_rgba(29,158,117,0.3)]",
    },
    {
      emoji: "🏆",
      label: t("challenges.title"),
      sub: t("coach.manageAndCreate"),
      href: challengeLink(),
      gradient: "from-[#e07b3a] via-[#c45e2b] to-[#a34820]",
      shadow: "shadow-[0_12px_28px_rgba(192,94,43,0.25)]",
    },
    {
      emoji: "💬",
      label: t("coach.messages"),
      sub: data?.stats.pendingMessages ? `${data.stats.pendingMessages} ${t("coach.workoutsThisWeek")}` : t("coach.groupMessages"),
      href: groupLink("messages"),
      gradient: "from-[#6366f1] via-[#5558e8] to-[#4338ca]",
      shadow: "shadow-[0_12px_28px_rgba(99,102,241,0.25)]",
    },
    {
      emoji: "📅",
      label: t("coach.events"),
      sub: t("coach.schedule"),
      href: groupLink("events"),
      gradient: "from-[#0ea5e9] via-[#0284c7] to-[#0369a1]",
      shadow: "shadow-[0_12px_28px_rgba(14,165,233,0.25)]",
    },
    {
      emoji: "⚙️",
      label: t("groups.title"),
      sub: hasGroups ? `${data!.groups.length} ${t("groups.title")}` : t("groups.newCoachGroup"),
      href: hasGroups ? "/coach/groups" : "/coach/groups/new",
      gradient: "from-[#9b59b6] via-[#8e44ad] to-[#6c3483]",
      shadow: "shadow-[0_12px_28px_rgba(155,89,182,0.25)]",
    },
    {
      emoji: "🤝",
      label: t("coach.friends"),
      sub: t("coach.friendsSubtitle"),
      href: "/members",
      gradient: "from-[#14b8a6] via-[#0d9488] to-[#0f766e]",
      shadow: "shadow-[0_12px_28px_rgba(20,184,166,0.25)]",
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
        <div className="mb-6 text-start">
          <p className="text-lg text-slate-500">בוקר טוב,</p>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#085041]">
            {firstName}
          </h1>
          {data?.stats && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
                <div className="text-2xl font-extrabold text-[#2563eb]">{data.stats.totalAthletes}</div>
                <div className="text-xs text-slate-500">{t("coach.athletes")}</div>
              </div>
              <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
                <div className="text-2xl font-extrabold text-[#2563eb]">{data.stats.workoutsThisWeek}</div>
                <div className="text-xs text-slate-500">{t("coach.workoutsThisWeek")}</div>
              </div>
              <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
                <div className="text-2xl font-extrabold text-[#2563eb]">{data.groups.length}</div>
                <div className="text-xs text-slate-500">{t("groups.title")}</div>
              </div>
            </div>
          )}
        </div>

        {/* Cube Grid — 2×3 */}
        <div className="grid grid-cols-2 gap-4">
          {cubes.map((cube) => (
            <button
              key={cube.label}
              onClick={() => router.push(cube.href)}
              className={`group relative flex aspect-square flex-col items-start justify-end overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-br ${cube.gradient} ${cube.shadow} p-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1.5 hover:scale-[1.03] active:translate-y-0.5 active:scale-[0.98]`}
            >
              <div className="absolute start-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-2xl backdrop-blur-sm">
                {cube.emoji}
              </div>
              <span className="relative z-10 text-lg font-bold text-white">{cube.label}</span>
              <span className="relative z-10 text-xs text-white/70">{cube.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
