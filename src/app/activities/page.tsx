"use client";

/**
 * Activities Page — Shows all activities in a scrollable list.
 *
 * Displays up to 50 recent activities from Strava.
 * Each activity is shown as an ActivityCard with sport type,
 * distance, time, and heart rate.
 */

import { useStravaActivities } from "@/hooks/useStravaActivities";
import ActivityCard from "@/components/activities/ActivityCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EmptyState from "@/components/ui/EmptyState";

export default function ActivitiesPage() {
  const { data, isLoading, error } = useStravaActivities(1, 50);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Activities</h1>

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <ErrorMessage message="Could not load activities. Please try again." />
      )}

      {data && data.activities.length === 0 && (
        <EmptyState
          title="No activities yet"
          message="Go for a run or ride and it will show up here!"
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
