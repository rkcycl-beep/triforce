"use client";

import Link from "next/link";
import { useChallenges } from "@/hooks/useChallenges";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EmptyState from "@/components/ui/EmptyState";
import { useTranslation } from "@/hooks/useTranslation";

function statusBadgeClass(status: string) {
  return status === "ACTIVE"
    ? "bg-green-100 text-green-700"
    : status === "COMPLETED"
    ? "bg-gray-100 text-gray-600"
    : "bg-yellow-100 text-yellow-700";
}

function statusLabel(status: string, t: (k: string) => string) {
  if (status === "ACTIVE") return t("challenges.active");
  if (status === "COMPLETED") return t("challenges.completed");
  return t("challenges.draft");
}

function participantStatusLabel(status: string) {
  if (status === "INVITED") return "ממתין לאישור";
  if (status === "ACCEPTED") return "משתתף";
  if (status === "DECLINED") return "דחה";
  if (status === "COMPLETED") return "השלים";
  return status;
}

export default function ChallengesPage() {
  const { data: challenges, isLoading, error } = useChallenges();
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("challenges.title")}</h1>
        <Link
          href="/challenges/new"
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          אתגר חדש
        </Link>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {error && <ErrorMessage message={t("activities.loadError")} />}

      {challenges && challenges.length === 0 && (
        <EmptyState
          title={t("challenges.emptyTitle")}
          message={t("challenges.emptyMessage")}
        />
      )}

      {challenges && challenges.length > 0 && (
        <ul className="space-y-3">
          {challenges.map((c: {
            id: string;
            name: string;
            status: string;
            startDate: string;
            endDate: string;
            group: { name: string } | null;
            createdBy: { name: string | null };
            entries: { status: string; rank?: number | null; score: number }[];
            _count: { entries: number };
          }) => {
            const entry = c.entries[0];
            const now = new Date();
            const start = new Date(c.startDate);
            const end = new Date(c.endDate);
            const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));

            return (
              <li key={c.id}>
                <Link
                  href={`/challenges/${c.id}`}
                  className="block rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{c.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {c.group?.name ?? `נשלח על ידי ${c.createdBy.name ?? "מישהו"}`}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(c.status)}`}>
                      {statusLabel(c.status, t)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {start.toLocaleDateString("he-IL", { day: "numeric", month: "short" })}
                      {" – "}
                      {end.toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" })}
                      {c.status === "ACTIVE" && daysLeft > 0 && ` · ${daysLeft} ימים נותרו`}
                    </span>
                    {entry && (
                      <span className="font-medium text-gray-700">
                        {entry.status === "INVITED"
                          ? participantStatusLabel(entry.status)
                          : `${entry.score.toFixed(1)} נק׳ · מקום ${entry.rank ?? "—"} מתוך ${c._count.entries}`}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
