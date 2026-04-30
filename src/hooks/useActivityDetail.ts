"use client";

/**
 * useActivityDetail — Fetches full details for a single activity.
 *
 * Used on the activity detail page to get the full polyline (for the map),
 * splits, laps, calories, and other detailed info.
 */

import { useQuery } from "@tanstack/react-query";
import type { StravaDetailedActivity } from "@/types/strava";

interface ActivityDetailResponse {
  activity: StravaDetailedActivity;
}

export function useActivityDetail(activityId: string) {
  return useQuery<ActivityDetailResponse>({
    queryKey: ["activity-detail", activityId],
    queryFn: async () => {
      const res = await fetch(`/api/strava/activities/${activityId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch activity details");
      }
      return res.json();
    },
    // Activity details rarely change — cache for 10 minutes
    staleTime: 10 * 60 * 1000,
  });
}
