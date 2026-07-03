"use client";

/**
 * Activity Detail Page — Shows a single activity with route map + full stats.
 */

import { useParams } from "next/navigation";
import { useActivityDetail } from "@/hooks/useActivityDetail";
import RouteMapLazy from "@/components/maps/RouteMapLazy";
import StatCard from "@/components/ui/StatCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatDate,
  formatSportType,
} from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const rawId = params.id as string;

  const { data, isLoading, error } = useActivityDetail(rawId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !data?.activity) {
    return (
      <div className="space-y-4">
        <BackButton t={t} />
        <ErrorMessage message={t("activities.loadError")} />
      </div>
    );
  }

  const a = data.activity;
  const hasMap = a.mapPolyline && a.mapPolyline.length > 0;

  return (
    <div className="space-y-5">
      {/* Back button */}
      <BackButton t={t} />

      {/* Activity header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{a.name}</h1>
        <p className="text-sm text-gray-500">
          {formatSportType(a.sportType, locale)} &middot; {formatDate(a.startDate, locale)}
        </p>
      </div>

      {/* Turn into challenge — moved to top for visibility */}
      <div className="rounded-2xl bg-gradient-to-br from-[#f0faf6] to-[#E1F5EE] p-4 shadow-sm">
        <p className="text-sm font-bold text-[#085041]">{t("activities.turnIntoChallenge")}</p>
        <p className="mt-0.5 text-xs text-gray-500">{t("activities.simulateDescription")}</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => router.push(`/activities/${rawId}/challenge-simulate`)}
            className="flex-1 rounded-xl bg-[#1D9E75] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#178c68]"
          >
            {t("activities.simulateAsChallenge")}
          </button>
          <Link
            href={`/challenges/new?activityId=${rawId}`}
            className="flex-1 rounded-xl bg-white py-2.5 text-center text-xs font-bold text-[#1D9E75] shadow-sm ring-1 ring-[#1D9E75]/30 hover:bg-[#E1F5EE]"
          >
            {t("activities.createChallengeFromActivity")}
          </Link>
        </div>
      </div>

      {/* Route map */}
      {hasMap && (
        <RouteMapLazy polyline={a.mapPolyline!} height={280} />
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard
          label={t("activities.distance")}
          value={formatDistance(a.distance, locale)}
        />
        <StatCard
          label={t("activities.movingTime")}
          value={formatDuration(a.movingTime, locale)}
        />
        {a.averageSpeed > 0 && (
          <StatCard
            label={a.sportType === "ride" ? t("activities.avgSpeed") : t("activities.avgPace")}
            value={
              a.sportType === "ride"
                ? `${(a.averageSpeed * 3.6).toFixed(1)} km/h`
                : formatPace(a.averageSpeed, locale)
            }
          />
        )}
        <StatCard
          label={t("activities.elevation")}
          value={`${Math.round(a.elevationGain)}`}
          unit="m"
        />
        {a.hasHeartrate && a.averageHeartrate && (
          <StatCard
            label={t("activities.avgHr")}
            value={`${Math.round(a.averageHeartrate)}`}
            unit="bpm"
          />
        )}
        {a.hasHeartrate && a.maxHeartrate && (
          <StatCard
            label={t("activities.maxHr")}
            value={`${Math.round(a.maxHeartrate)}`}
            unit="bpm"
          />
        )}
        {a.calories && a.calories > 0 && (
          <StatCard
            label={t("activities.calories")}
            value={`${Math.round(a.calories)}`}
            unit="kcal"
          />
        )}
      </div>
    </div>
  );
}

/** Back navigation button */
function BackButton({ t }: { t: (key: string) => string }) {
  return (
    <Link
      href="/activities"
      className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="rtl:rotate-180"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {t("activities.backToActivities")}
    </Link>
  );
}
