"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslation } from "@/hooks/useTranslation";

interface Activity {
  id: string;
  name: string;
  sportType: string;
  startDate: string;
  distance: number;
  movingTime: number;
  elevationGain: number;
  averageHeartrate: number | null;
  averageSpeed: number;
}

interface AthleteDetail {
  user: { id: string; name: string | null; image: string | null };
  activities: Activity[];
}

const SPORT_EMOJI: Record<string, string> = {
  run: "🏃",
  ride: "🚴",
  swim: "🏊",
  walk: "🚶",
  hike: "🥾",
  other: "🏅",
};

function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} ק"מ` : `${m.toFixed(0)} מ'`;
}

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")} שע'` : `${m} דק'`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

async function fetchAthlete(userId: string): Promise<AthleteDetail> {
  const res = await fetch(`/api/athlete/users/${userId}/activities`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function CoachAthleteDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery<AthleteDetail>({
    queryKey: ["coach-athlete-detail", userId],
    queryFn: () => fetchAthlete(userId),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-red-500">{t("members.loadError")}</p>
        <button onClick={() => router.back()} className="mt-3 text-sm text-[#1D9E75] underline">
          {t("nav.back")}
        </button>
      </div>
    );
  }

  const { user, activities } = data;

  return (
    <div className="space-y-4 pb-24" dir="rtl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          {user.image ? (
            <img src={user.image} className="h-9 w-9 rounded-full object-cover" alt="" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1D9E75]/10 text-sm font-bold text-[#1D9E75]">
              {user.name?.[0] ?? "?"}
            </div>
          )}
          <h1 className="text-lg font-extrabold text-gray-900">{user.name ?? t("members.unknown")}</h1>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-gray-700">{t("coach.athleteStats")}</p>
        <div className="mt-2 flex gap-4 text-sm text-gray-600">
          <span>{activities.length} {t("coach.activitiesLabel")}</span>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-[20px] border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl">🏅</div>
          <p className="mt-2 text-sm text-gray-500">{t("activities.emptyTitle")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">{activities.length} {t("coach.activitiesLabel")} {t("coach.recent")}</p>
          {activities.map((act) => (
            <Link
              key={act.id}
              href={`/activities/${act.id}`}
              className="block rounded-[16px] border border-gray-100 bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F5EE] text-lg">
                  {SPORT_EMOJI[act.sportType] ?? "🏅"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">{act.name}</p>
                  <p className="text-xs text-gray-400">{formatDate(act.startDate)}</p>
                </div>
              </div>
              <div className="mt-2 flex gap-4 text-xs text-gray-500">
                {act.distance > 0 && <span>{formatDistance(act.distance)}</span>}
                <span>{formatTime(act.movingTime)}</span>
                {act.elevationGain > 0 && <span>↑ {act.elevationGain.toFixed(0)} מ'</span>}
                {act.averageHeartrate && <span>❤️ {act.averageHeartrate.toFixed(0)}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
