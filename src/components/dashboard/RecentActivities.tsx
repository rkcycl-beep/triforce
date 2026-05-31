"use client";

/**
 * RecentActivities.tsx — Shows the latest activities on the dashboard.
 *
 * Fetches the 10 most recent activities from Strava and displays them
 * as ActivityCards. Shows loading skeleton while fetching, and an
 * error message if something goes wrong.
 */

import { useActivities } from "@/hooks/useActivities";
import ActivityCard from "@/components/activities/ActivityCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EmptyState from "@/components/ui/EmptyState";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

export default function RecentActivities() {
  const { data, isLoading, error } = useActivities(1, 10);
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          {t("dashboard.recentActivities")}
        </h2>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          {t("dashboard.recentActivities")}
        </h2>
        <ErrorMessage message={t("activities.loadError")} />
      </div>
    );
  }

  const activities = data?.activities ?? [];

  if (activities.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          {t("dashboard.recentActivities")}
        </h2>
        <EmptyState
          title={t("activities.emptyTitle")}
          message={t("activities.emptyMessage")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {t("dashboard.recentActivities")}
        </h2>
        <Link
          href="/activities"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          {t("dashboard.viewAll")}
        </Link>
      </div>

      <div className="space-y-3">
        {activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}
