"use client";

/**
 * RecentActivities.tsx — Shows the latest activities on the dashboard.
 *
 * Fetches the 10 most recent activities from Strava and displays them
 * as ActivityCards. Shows loading skeleton while fetching, and an
 * error message if something goes wrong.
 */

import { useStravaActivities } from "@/hooks/useStravaActivities";
import ActivityCard from "@/components/activities/ActivityCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EmptyState from "@/components/ui/EmptyState";
import Link from "next/link";

export default function RecentActivities() {
  const { data, isLoading, error } = useStravaActivities(1, 10);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Recent Activities
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
          Recent Activities
        </h2>
        <ErrorMessage message="Could not load activities. Please try again." />
      </div>
    );
  }

  const activities = data?.activities ?? [];

  if (activities.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Recent Activities
        </h2>
        <EmptyState
          title="No activities yet"
          message="Go for a run or ride and it will show up here!"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Recent Activities
        </h2>
        <Link
          href="/activities"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View all
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
