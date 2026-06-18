"use client";

import { useState } from "react";
import { use } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDistance, formatDuration, formatPace } from "@/lib/utils";
import type { CompareResponse, CompareStats } from "@/app/api/athlete/compare/[contactId]/route";

const AVATAR_COLORS = ["#D85A30", "#185FA5", "#1D9E75", "#8B5CF6", "#F59E0B", "#EC4899"];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  if (image) {
    return (
      <img src={image} alt={name} className="h-14 w-14 rounded-full object-cover" />
    );
  }
  const parts = name.trim().split(" ");
  const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ background: avatarColor(name) }}
    >
      {initials}
    </div>
  );
}

type WhoWins = "me" | "friend" | "tie";

function whoWinsHigher(meVal: number, friendVal: number): WhoWins {
  if (meVal > friendVal) return "me";
  if (friendVal > meVal) return "friend";
  return "tie";
}

function whoWinsLower(meVal: number, friendVal: number): WhoWins {
  if (meVal < friendVal) return "me";
  if (friendVal < meVal) return "friend";
  return "tie";
}

function StatRow({
  label,
  meValue,
  friendValue,
  winner,
}: {
  label: string;
  meValue: string;
  friendValue: string;
  winner: WhoWins;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-3">
      <div
        className={`min-w-0 flex-1 text-start text-sm font-bold ${winner === "me" ? "text-[#1D9E75]" : "text-gray-700"}`}
      >
        {meValue}
        {winner === "me" && <span className="ms-1 text-xs">👑</span>}
      </div>
      <div className="shrink-0 px-2 text-center text-[10px] font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </div>
      <div
        className={`min-w-0 flex-1 text-end text-sm font-bold ${winner === "friend" ? "text-[#1D9E75]" : "text-gray-700"}`}
      >
        {winner === "friend" && <span className="me-1 text-xs">👑</span>}
        {friendValue}
      </div>
    </div>
  );
}

const PERIODS = [
  { key: "30d", labelKey: "compare.period30d" },
  { key: "90d", labelKey: "compare.period90d" },
  { key: "all", labelKey: "compare.periodAll" },
] as const;

const SPORTS = [
  { key: "run", labelKey: "compare.sportRun" },
  { key: "ride", labelKey: "compare.sportRide" },
  { key: "swim", labelKey: "compare.sportSwim" },
  { key: "all", labelKey: "compare.sportAll" },
] as const;

function buildStats(stats: CompareStats, locale: "he" | "en") {
  return {
    totalDistance: formatDistance(stats.totalDistance, locale),
    totalActivities: String(stats.totalActivities),
    totalTime: formatDuration(stats.totalTime, locale),
    totalElevation: `${Math.round(stats.totalElevation)} מ'`,
    longestActivity: formatDistance(stats.longestActivity, locale),
    avgPace: stats.avgPace != null ? formatPace(stats.avgPace, locale) : "—",
    fastestPace: stats.fastestPace != null ? formatPace(stats.fastestPace, locale) : "—",
  };
}

export default function ComparePage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = use(params);
  const { t, locale } = useTranslation();
  const searchParams = useSearchParams();
  const initialSport = (searchParams.get("sport") ?? "run") as "run" | "ride" | "swim" | "all";
  const [period, setPeriod] = useState<"30d" | "90d" | "all">("30d");
  const [sportType, setSportType] = useState<"run" | "ride" | "swim" | "all">(initialSport);

  const { data, isLoading, error } = useQuery<CompareResponse>({
    queryKey: ["compare", contactId, period, sportType],
    queryFn: async () => {
      const res = await fetch(
        `/api/athlete/compare/${contactId}?period=${period}&sportType=${sportType}`
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    retry: false,
  });

  return (
    <div className="mx-auto max-w-md space-y-4 pb-8">
      {/* Back link */}
      <Link href="/compare" className="flex items-center gap-1 text-sm text-gray-500">
        <span className="rtl:rotate-180 inline-block">←</span>
        {t("nav.back")}
      </Link>

      <h1 className="text-xl font-bold text-gray-900">{t("compare.title")}</h1>

      {/* Period tabs */}
      <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              period === p.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            {t(p.labelKey)}
          </button>
        ))}
      </div>

      {/* Sport tabs */}
      <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
        {SPORTS.map(s => (
          <button
            key={s.key}
            onClick={() => setSportType(s.key)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              sportType === s.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            {t(s.labelKey)}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <div className="space-y-2">
          <ErrorMessage message={t("compare.loadError")} />
          <p className="text-center text-xs text-gray-400">
            אם החבר לא על TriForce — לחץ &quot;סרוק עוקבים&quot; ב
            <a href="/compare" className="text-[#1D9E75] underline"> דף ההשוואה</a> כדי לייבא חברי מועדון
          </p>
        </div>
      )}

      {data && (
        <>
          {/* Players header */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <Avatar name={data.me.name ?? ""} image={data.me.image} />
              <span className="max-w-[90px] truncate text-xs font-semibold text-gray-800">
                {data.me.name}
              </span>
              <span className="text-[10px] text-gray-400">{t("compare.me")}</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-black text-gray-200">VS</span>
              {data.dataSource === "strava" && (
                <span className="rounded-full bg-[#FC4C02]/10 px-2 py-0.5 text-[9px] font-bold text-[#FC4C02]">
                  Strava
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <Avatar name={data.friend.name ?? ""} image={data.friend.image} />
              <span className="max-w-[90px] truncate text-xs font-semibold text-gray-800">
                {data.friend.name}
              </span>
              <span className="text-[10px] text-gray-400">{t("compare.friend")}</span>
            </div>
          </div>

          {/* Stats */}
          {data.me.stats.totalActivities === 0 && data.friend.stats.totalActivities === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
              {t("compare.noActivities")}
            </div>
          ) : (
            <div className="space-y-2">
              {(() => {
                const me = buildStats(data.me.stats, locale);
                const fr = buildStats(data.friend.stats, locale);
                const s = data.me.stats;
                const fs = data.friend.stats;
                return (
                  <>
                    <StatRow
                      label={t("compare.statDistance")}
                      meValue={me.totalDistance}
                      friendValue={fr.totalDistance}
                      winner={whoWinsHigher(s.totalDistance, fs.totalDistance)}
                    />
                    <StatRow
                      label={t("compare.statActivities")}
                      meValue={me.totalActivities}
                      friendValue={fr.totalActivities}
                      winner={whoWinsHigher(s.totalActivities, fs.totalActivities)}
                    />
                    <StatRow
                      label={t("compare.statTime")}
                      meValue={me.totalTime}
                      friendValue={fr.totalTime}
                      winner={whoWinsHigher(s.totalTime, fs.totalTime)}
                    />
                    <StatRow
                      label={t("compare.statElevation")}
                      meValue={me.totalElevation}
                      friendValue={fr.totalElevation}
                      winner={whoWinsHigher(s.totalElevation, fs.totalElevation)}
                    />
                    <StatRow
                      label={t("compare.statLongest")}
                      meValue={me.longestActivity}
                      friendValue={fr.longestActivity}
                      winner={whoWinsHigher(s.longestActivity, fs.longestActivity)}
                    />
                    {sportType !== "all" && (
                      <>
                        <StatRow
                          label={t("compare.statAvgPace")}
                          meValue={me.avgPace}
                          friendValue={fr.avgPace}
                          winner={
                            s.avgPace != null && fs.avgPace != null
                              ? whoWinsHigher(s.avgPace, fs.avgPace)
                              : "tie"
                          }
                        />
                        <StatRow
                          label={t("compare.statFastestPace")}
                          meValue={me.fastestPace}
                          friendValue={fr.fastestPace}
                          winner={
                            s.fastestPace != null && fs.fastestPace != null
                              ? whoWinsHigher(s.fastestPace, fs.fastestPace)
                              : "tie"
                          }
                        />
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
