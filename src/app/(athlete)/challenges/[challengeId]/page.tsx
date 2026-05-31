"use client";

import { notFound } from "next/navigation";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useChallengeDetail } from "@/hooks/useChallengeDetail";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { formatDistance, formatDuration } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

function methodLabel(m: string, t: (k: string) => string) {
  if (m === "PERSONAL_IMPROVEMENT") return t("challenges.personalImprovement");
  if (m === "AGE_GRADE") return t("challenges.ageGrade");
  return t("challenges.categoryScoring");
}

function formatScore(score: number, method: string, cfg: Record<string, unknown>, locale: "he" | "en"): string {
  if (method === "PERSONAL_IMPROVEMENT") return `${score >= 0 ? "+" : ""}${score.toFixed(1)}%`;
  if (method === "AGE_GRADE") return `${score.toFixed(1)}%`;
  const metric = (cfg.metric as string) ?? "distance";
  if (metric === "distance") return formatDistance(score, locale);
  if (metric === "movingTime") return formatDuration(-score, locale); // stored negated
  return `${(score * 3.6).toFixed(1)} km/h`;
}

export default function ChallengeDetailPage() {
  const params = useParams();
  const { challengeId } = params as { challengeId: string };
  const { data: session } = useSession();
  const { data, isLoading, error } = useChallengeDetail(challengeId);
  const { t, locale } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorMessage message={t("activities.loadError")} />;
  }

  const { challenge: c, entries } = data;
  if (!c) notFound();

  const cfg = (c.config ?? {}) as Record<string, unknown>;
  const myUserId = session?.user?.id ?? "";
  const myEntry = entries.find((e: { user: { id: string } }) => e.user.id === myUserId);
  const totalAthletes = entries.length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{c.name}</h1>
        {c.description && <p className="mt-1 text-sm text-gray-600">{c.description}</p>}
        <p className="mt-1 text-xs text-gray-500">
          {methodLabel(c.scoringMethod, t)} ·{" "}
          {new Date(c.startDate).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { day: "numeric", month: "short" })}
          {" – "}
          {new Date(c.endDate).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>

      {/* My result card */}
      {myEntry && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">{t("challenges.yourResult")}</p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-blue-900">
              {formatScore(myEntry.score, c.scoringMethod, cfg, locale)}
            </span>
            <span className="text-sm text-blue-700">
              {t("challenges.rankOf", { rank: String(myEntry.rank ?? "—"), total: String(totalAthletes) })}
            </span>
          </div>
          {myEntry.metadata && typeof myEntry.metadata === "object" &&
            typeof (myEntry.metadata as Record<string, unknown>).category === "string" && (
            <p className="mt-1 text-xs text-blue-600">
              {t("challenges.category")}: {String((myEntry.metadata as Record<string, unknown>).category)}
            </p>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">{t("challenges.leaderboard")}</h2>
        </div>
        {entries.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">{t("challenges.noScores")}</p>
        ) : (
          <ol className="divide-y divide-gray-100">
            {entries.map((entry: { id: string; rank: number; user: { id: string; name: string | null; image: string | null }; score: number; metadata?: unknown }) => {
              const isMe = entry.user.id === myUserId;
              return (
                <li
                  key={entry.id}
                  className={`flex items-center gap-3 px-5 py-3 ${isMe ? "bg-blue-50" : ""}`}
                >
                  <span className={`w-6 shrink-0 text-center text-sm font-bold ${entry.rank === 1 ? "text-yellow-500" : entry.rank === 2 ? "text-gray-400" : entry.rank === 3 ? "text-amber-600" : "text-gray-400"}`}>
                    {entry.rank}
                  </span>
                  {entry.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.user.image} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                      {(entry.user.name ?? "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${isMe ? "text-blue-900" : "text-gray-900"}`}>
                      {entry.user.name ?? t("nav.dashboard")}{isMe && ` (${t("challenges.you")})`}
                    </p>
                    {entry.metadata && typeof entry.metadata === "object" &&
                      typeof (entry.metadata as Record<string, unknown>).category === "string" ? (
                      <p className="text-xs text-gray-500">
                        {String((entry.metadata as Record<string, unknown>).category)}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-gray-700">
                    {formatScore(entry.score, c.scoringMethod, cfg, locale)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
