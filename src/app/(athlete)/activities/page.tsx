"use client";

/**
 * Activities Page — Shows all activities in a scrollable list.
 *
 * Displays up to 50 recent activities from Strava.
 * Each activity is shown as an ActivityCard with sport type,
 * distance, time, and heart rate.
 */

import { useActivities } from "@/hooks/useActivities";
import ActivityCard from "@/components/activities/ActivityCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EmptyState from "@/components/ui/EmptyState";
import { useTranslation } from "@/hooks/useTranslation";

export default function ActivitiesPage() {
  const { data, isLoading, error } = useActivities(1, 500);
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{t("activities.title")}</h1>

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <ErrorMessage message={t("activities.loadError")} />
      )}

      {data && data.activities.length === 0 && (
        <EmptyState
          title={t("activities.emptyTitle")}
          message={t("activities.emptyMessage")}
        />
      )}

      {data && data.activities.length > 0 && (
        <div className="space-y-3">
          {data.activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
}
