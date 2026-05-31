"use client";

/**
 * Activity Detail Page — Shows a single activity with route map + full stats.
 *
 * Displays:
 * - GPS route on a Leaflet map (with start/end markers)
 * - Full stats grid: distance, time, pace, elevation, heart rate, calories
 * - Splits per kilometer (if available)
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
import { useTranslation } from "@/hooks/useTranslation";

export default function ActivityDetailPage() {
  const params = useParams();
  const { t, locale } = useTranslation();

  // The URL param is like "strava_12345" — we need just "12345" for the API
  const rawId = params.id as string;
  const stravaId = rawId.replace("strava_", "");

  const { data, isLoading, error } = useActivityDetail(stravaId);

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
  const hasMap = a.map?.summary_polyline && a.map.summary_polyline.length > 0;

  return (
    <div className="space-y-5">
      {/* Back button */}
      <BackButton t={t} />

      {/* Activity header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{a.name}</h1>
        <p className="text-sm text-gray-500">
          {formatSportType(a.sport_type, locale)} &middot; {formatDate(a.start_date_local, locale)}
        </p>
      </div>

      {/* Route map */}
      {hasMap && (
        <RouteMapLazy polyline={a.map.summary_polyline} height={280} />
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard
          label={t("activities.distance")}
          value={formatDistance(a.distance, locale)}
        />
        <StatCard
          label={t("activities.movingTime")}
          value={formatDuration(a.moving_time, locale)}
        />
        {a.average_speed > 0 && (
          <StatCard
            label={a.sport_type.toLowerCase().includes("ride") ? t("activities.avgSpeed") : t("activities.avgPace")}
            value={
              a.sport_type.toLowerCase().includes("ride")
                ? `${(a.average_speed * 3.6).toFixed(1)} km/h`
                : formatPace(a.average_speed, locale)
            }
          />
        )}
        <StatCard
          label={t("activities.elevation")}
          value={`${Math.round(a.total_elevation_gain)}`}
          unit="m"
        />
        {a.has_heartrate && a.average_heartrate && (
          <StatCard
            label={t("activities.avgHr")}
            value={`${Math.round(a.average_heartrate)}`}
            unit="bpm"
          />
        )}
        {a.has_heartrate && a.max_heartrate && (
          <StatCard
            label={t("activities.maxHr")}
            value={`${Math.round(a.max_heartrate)}`}
            unit="bpm"
          />
        )}
        {a.calories > 0 && (
          <StatCard
            label={t("activities.calories")}
            value={`${Math.round(a.calories)}`}
            unit="kcal"
          />
        )}
        {a.suffer_score && (
          <StatCard
            label={t("activities.effort")}
            value={`${a.suffer_score}`}
          />
        )}
      </div>

      {/* Splits table (if available) */}
      {a.splits_metric && a.splits_metric.length > 0 && (
        <SplitsTable splits={a.splits_metric} t={t} locale={locale} />
      )}
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

/** Per-km splits table */
function SplitsTable({
  splits,
  t,
  locale,
}: {
  splits: { split: number; distance: number; moving_time: number; average_speed: number; average_heartrate?: number }[];
  t: (key: string) => string;
  locale: "he" | "en";
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-gray-900">{t("activities.splits")}</h2>
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-start text-xs uppercase text-gray-500">
              <th className="px-3 py-2">{t("activities.km")}</th>
              <th className="px-3 py-2">{t("activities.pace")}</th>
              <th className="px-3 py-2">{t("activities.time")}</th>
              {splits.some((s) => s.average_heartrate) && (
                <th className="px-3 py-2">{t("activities.hr")}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {splits.map((split) => (
              <tr key={split.split} className="border-b border-gray-50 last:border-0">
                <td className="px-3 py-2 font-medium text-gray-700">
                  {split.split}
                </td>
                <td className="px-3 py-2 text-gray-600">
                  {formatPace(split.average_speed, locale)}
                </td>
                <td className="px-3 py-2 text-gray-600">
                  {formatDuration(split.moving_time, locale)}
                </td>
                {splits.some((s) => s.average_heartrate) && (
                  <td className="px-3 py-2 text-gray-600">
                    {split.average_heartrate
                      ? `${Math.round(split.average_heartrate)}`
                      : "-"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
