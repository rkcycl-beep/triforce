"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

/* ─── Types ─── */

interface AthleteRow {
  id: string;
  name: string | null;
  image: string | null;
  workoutsThisWeek: number;
  weeklyTarget: number;
  status: "OK" | "WATCH" | "ATTENTION";
}

interface ActiveChallenge {
  id: string;
  groupId: string;
  name: string;
  progress: number;
  participantsCount: number;
  totalAthletes: number;
  daysLeft: number;
}

interface DashboardData {
  stats: {
    totalAthletes: number;
    workoutsThisWeek: number;
    adherencePct: number;
    pendingMessages: number;
  };
  athletes: AthleteRow[];
  activeChallenge: ActiveChallenge | null;
  weeklyActivity: { day: string; count: number }[];
  groups: { id: string; name: string }[];
}

/* ─── Helpers ─── */

function statusColor(s: AthleteRow["status"]) {
  return s === "OK" ? "#1D9E75" : s === "WATCH" ? "#F59E0B" : "#EF4444";
}

function statusBg(s: AthleteRow["status"]) {
  return s === "OK" ? "bg-[#E1F5EE] text-[#085041]" : s === "WATCH" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600";
}

function Avatar({ src, name, size = 36 }: { src: string | null; name: string; size?: number }) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-full bg-gray-200 text-xs font-bold text-gray-500"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {(name || "?")[0].toUpperCase()}
        </div>
      )}
    </div>
  );
}

/* ─── Stat Card ─── */

function StatCard({
  label, value, sub, accent,
}: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-2xl font-extrabold" style={{ color: accent ?? "#111827" }}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  );
}

/* ─── Progress Bar ─── */

function ProgressBar({ pct, color = "#1D9E75" }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

/* ─── Main Page ─── */

export default function CoachDashboardPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["coach-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/coach/dashboard");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const firstName = session?.user?.name?.split(" ")[0] ?? t("coach.athlete");
  const stats = data?.stats;
  const attentionAthletes = data?.athletes.filter((a) => a.status === "ATTENTION") ?? [];
  const maxBar = Math.max(...(data?.weeklyActivity.map((d) => d.count) ?? [1]), 1);

  return (
    <div className="space-y-5 pb-10">

      {/* Header */}
      <div className="-mx-4 -mt-6 bg-gradient-to-br from-[#085041] to-[#1D9E75] px-5 py-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/60">{t("coach.title")}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          {t("coach.greeting", { name: firstName })}
        </h1>
        {data?.groups.length ? (
          <p className="mt-1 text-sm text-white/70">
            {data.groups.map((g) => g.name).join(" · ")}
          </p>
        ) : null}
        <Link
          href="/coach/groups/new"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
        >
          + {t("coach.newGroup")}
        </Link>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D9E75] border-t-transparent" />
        </div>
      )}

      {data && (
        <>
          {/* ── 4 Stat Cards ── */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label={t("coach.activeAthletes")}
              value={stats?.totalAthletes ?? 0}
              sub={t("coach.inAllGroups")}
              accent="#085041"
            />
            <StatCard
              label={t("coach.workoutsThisWeek")}
              value={stats?.workoutsThisWeek ?? 0}
              sub={t("coach.last7days")}
              accent="#1D9E75"
            />
            <StatCard
              label={t("coach.adherence")}
              value={`${stats?.adherencePct ?? 0}%`}
              sub={t("coach.adherenceSub")}
              accent={
                (stats?.adherencePct ?? 0) >= 70 ? "#1D9E75" :
                (stats?.adherencePct ?? 0) >= 40 ? "#F59E0B" : "#EF4444"
              }
            />
            <StatCard
              label={t("coach.pendingMessages")}
              value={stats?.pendingMessages ?? 0}
              sub={t("coach.last7days")}
              accent="#6366F1"
            />
          </div>

          {/* ── Athletes Table ── */}
          {data.athletes.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-bold text-gray-900">{t("coach.athletesTable")}</p>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                  {data.athletes.length}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {data.athletes.map((athlete) => {
                  const pct = athlete.weeklyTarget > 0
                    ? Math.round((athlete.workoutsThisWeek / athlete.weeklyTarget) * 100)
                    : 0;
                  const label = t(`coach.status${athlete.status}`);
                  return (
                    <div key={athlete.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar src={athlete.image} name={athlete.name ?? "?"} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {athlete.name ?? t("members.unknown")}
                          </p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBg(athlete.status)}`}>
                            {label}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1">
                            <ProgressBar pct={pct} color={statusColor(athlete.status)} />
                          </div>
                          <span className="shrink-0 text-[10px] text-gray-400">
                            {athlete.workoutsThisWeek}/{athlete.weeklyTarget}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Needs Attention Panel ── */}
          {attentionAthletes.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-red-100 bg-red-50/50 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              <div className="border-b border-red-100 px-4 py-3">
                <p className="text-sm font-bold text-red-700">
                  ⚠️ {t("coach.needsAttentionTitle")} ({attentionAthletes.length})
                </p>
              </div>
              <div className="divide-y divide-red-100/60">
                {attentionAthletes.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-red-400" />
                    <p className="flex-1 text-sm font-medium text-gray-800">{a.name ?? t("members.unknown")}</p>
                    <p className="text-xs text-red-500">{t("coach.noWorkoutsThisWeek")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Active Challenge ── */}
          {data.activeChallenge ? (
            <Link href={`/coach/groups/${data.activeChallenge.groupId}/challenges/new`}>
              <div className="rounded-2xl border border-[#1D9E75]/20 bg-gradient-to-br from-[#E1F5EE] to-white p-4 shadow-[0_2px_8px_rgba(29,158,117,0.08)] transition-all hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1D9E75]">
                      {t("coach.activeChallengeTitle")}
                    </p>
                    <p className="mt-0.5 truncate text-base font-bold text-[#085041]">
                      {data.activeChallenge.name}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#1D9E75]/10 px-2.5 py-1 text-xs font-bold text-[#1D9E75]">
                    {data.activeChallenge.daysLeft} {t("coach.daysLeft")}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>{t("coach.challengeProgress")}</span>
                    <span>{data.activeChallenge.progress}%</span>
                  </div>
                  <div className="mt-1">
                    <ProgressBar pct={data.activeChallenge.progress} />
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-gray-400">
                  {data.activeChallenge.participantsCount}/{data.activeChallenge.totalAthletes} {t("coach.participants")}
                </p>
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-center">
              <p className="text-sm font-semibold text-gray-600">{t("coach.noChallengesPrompt")}</p>
              {data.groups[0] && (
                <Link
                  href={`/coach/groups/${data.groups[0].id}/challenges/new`}
                  className="mt-3 inline-flex items-center gap-1 rounded-xl bg-[#1D9E75] px-4 py-2 text-xs font-bold text-white hover:bg-[#178c68]"
                >
                  + {t("coach.newChallenge")}
                </Link>
              )}
            </div>
          )}

          {/* ── Weekly Activity Bar Chart ── */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <p className="mb-3 text-sm font-bold text-gray-900">{t("coach.weeklyActivityTitle")}</p>
            {data.weeklyActivity.every((d) => d.count === 0) ? (
              <p className="py-4 text-center text-xs text-gray-400">{t("coach.noActivitiesThisWeek")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={data.weeklyActivity} barSize={28} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(29,158,117,0.06)" }}
                    contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12 }}
                    formatter={(v) => [`${v} ${t("coach.activitiesLabel")}`, ""]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.weeklyActivity.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.count === maxBar ? "#1D9E75" : "#D1FAE5"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Groups Quick Nav ── */}
          {data.groups.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("coach.myGroups")}</p>
              {data.groups.map((g) => (
                <Link
                  key={g.id}
                  href={`/coach/groups/${g.id}`}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all hover:border-[#1D9E75]/30 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E1F5EE] text-base font-bold text-[#085041]">
                      {g.name[0]}
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{g.name}</p>
                  </div>
                  <span className="text-sm text-gray-400">←</span>
                </Link>
              ))}
            </div>
          )}

          {/* No groups empty state */}
          {data.groups.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
              <p className="text-4xl">🏃</p>
              <p className="mt-3 text-sm font-bold text-gray-700">{t("coach.noGroups")}</p>
              <p className="mt-1 text-xs text-gray-400">{t("coach.noGroupsPrompt")}</p>
              <Link
                href="/coach/groups/new"
                className="mt-4 inline-flex items-center gap-1 rounded-xl bg-[#1D9E75] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#178c68]"
              >
                + {t("coach.createFirstGroup")}
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
