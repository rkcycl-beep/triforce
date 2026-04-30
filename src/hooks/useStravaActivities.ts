/**
 * useStravaActivities — A React hook to fetch Strava activities.
 *
 * What's a "hook"? It's a reusable function that any component can call
 * to get data. Instead of every component writing its own fetch logic,
 * they just call: const { data, isLoading } = useStravaActivities();
 *
 * Uses TanStack Query which gives us:
 * - Automatic caching (won't re-fetch if data is fresh)
 * - Loading and error states
 * - Background refresh when the user returns to the tab
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import type { Activity } from "@/types/activity";

interface ActivitiesResponse {
  activities: Activity[];
  page: number;
  perPage: number;
}

export function useStravaActivities(page: number = 1, perPage: number = 30) {
  return useQuery<ActivitiesResponse>({
    queryKey: ["strava-activities", page, perPage],
    queryFn: async () => {
      const res = await fetch(
        `/api/strava/activities?page=${page}&per_page=${perPage}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch activities");
      }
      return res.json();
    },
  });
}
