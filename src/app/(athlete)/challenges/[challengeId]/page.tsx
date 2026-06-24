"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useChallengeDetail } from "@/hooks/useChallengeDetail";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Button from "@/components/ui/Button";
import ReferenceTableModal from "@/components/challenges/ReferenceTableModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/useTranslation";

function formatPace(paceMinPerKm: number): string {
  const totalSeconds = Math.round(paceMinPerKm * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function participantStatusLabel(status: string) {
  if (status === "INVITED") return "ממתין לאישור";
  if (status === "ACCEPTED") return "משתתף";
  if (status === "DECLINED") return "דחה";
  if (status === "COMPLETED") return "השלים";
  return status;
}

export default function ChallengeDetailPage() {
  const params = useParams();
  const { challengeId } = params as { challengeId: string };
  const { data: session } = useSession();
  const { data, isLoading, error } = useChallengeDetail(challengeId);
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();
  const [showTable, setShowTable] = useState(false);

  const respondMutation = useMutation({
    mutationFn: async ({ action }: { action: "accept" | "decline" }) => {
      const res = await fetch(`/api/challenges/${challengeId}/${action}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to respond");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-detail", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["my-challenges"] });
    },
  });

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

  const myUserId = session?.user?.id ?? "";
  const myEntry = entries.find((e: { user: { id: string } }) => e.user.id === myUserId);
  const metadata = (myEntry?.metadata ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{c.name}</h1>
        {c.description && <p className="mt-1 text-sm text-gray-600">{c.description}</p>}
        <p className="mt-1 text-xs text-gray-500">
          {c.distanceKm} ק״מ · {c.sportType === "run" ? "ריצה" : c.sportType} ·{" "}
          {new Date(c.startDate).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { day: "numeric", month: "short" })}
          {" – "}
          {new Date(c.endDate).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>

      {/* Invitation actions */}
      {myEntry?.status === "INVITED" && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-900">הוזמנת להשתתף באתגר זה</p>
          <div className="mt-3 flex gap-3">
            <Button onClick={() => respondMutation.mutate({ action: "accept" })} loading={respondMutation.isPending}>
              אשר השתתפות
            </Button>
            <Button
              variant="secondary"
              onClick={() => respondMutation.mutate({ action: "decline" })}
              loading={respondMutation.isPending}
            >
              דחה
            </Button>
          </div>
        </div>
      )}

      {/* My result card */}
      {myEntry && myEntry.status !== "INVITED" && myEntry.status !== "DECLINED" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">התוצאה שלי</p>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-blue-900">
                  {myEntry.score.toFixed(1)} נק׳
                </span>
                <span className="text-sm text-blue-700">
                  מקום {myEntry.rank ?? "—"} מתוך {entries.length}
                </span>
              </div>
            </div>
            <Button variant="secondary" onClick={() => setShowTable(true)} className="text-xs">
              טבלת ערכים
            </Button>
          </div>
          {typeof metadata.actualPace === "number" && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-white p-2">
                <p className="text-gray-500">קצב שלי</p>
                <p className="font-semibold text-gray-900">{formatPace(Number(metadata.actualPace))}</p>
              </div>
              <div className="rounded-lg bg-white p-2">
                <p className="text-gray-500">ממוצע צפוי</p>
                <p className="font-semibold text-gray-900">{formatPace(Number(metadata.expectedPace))}</p>
              </div>
              <div className="rounded-lg bg-white p-2">
                <p className="text-gray-500">טווח מלא</p>
                <p className="font-semibold text-green-700">עד {formatPace(Number(metadata.tolerancePace))}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reference table button for non-participants or pending */}
      {(!myEntry || myEntry.status === "INVITED" || myEntry.status === "DECLINED") && (
        <Button variant="secondary" onClick={() => setShowTable(true)} className="w-full">
          צפה בטבלת ערכים וניקוד
        </Button>
      )}

      {/* Leaderboard */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">לוח תוצאות</h2>
        </div>
        {entries.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">אין עדיין משתתפים</p>
        ) : (
          <ol className="divide-y divide-gray-100">
            {entries.map((entry: { id: string; status: string; rank: number; user: { id: string; name: string | null; image: string | null }; score: number }) => {
              const isMe = entry.user.id === myUserId;
              return (
                <li
                  key={entry.id}
                  className={`flex items-center gap-3 px-5 py-3 ${isMe ? "bg-blue-50" : ""}`}
                >
                  <span className={`w-6 shrink-0 text-center text-sm font-bold ${entry.rank === 1 ? "text-yellow-500" : entry.rank === 2 ? "text-gray-400" : entry.rank === 3 ? "text-amber-600" : "text-gray-400"}`}>
                    {entry.rank ?? "—"}
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
                      {entry.user.name ?? "?"}{isMe && " (אתה)"}
                    </p>
                    <p className="text-xs text-gray-500">{participantStatusLabel(entry.status)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-gray-700">
                    {entry.score > 0 ? `${entry.score.toFixed(1)} נק׳` : "—"}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <ReferenceTableModal
        sportType={c.sportType}
        distanceKm={Number(c.distanceKm)}
        tolerancePercent={Number(c.tolerancePercent)}
        isOpen={showTable}
        onClose={() => setShowTable(false)}
      />
    </div>
  );
}
