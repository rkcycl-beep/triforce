/**
 * useActivities — A React hook to fetch the signed-in athlete's activities.
 *
 * Reads from /api/athlete/activities, which is backed by the Postgres
 * Activity table (populated by sign-in sync + future webhooks).
 *
 * Uses TanStack Query for caching, loading/error states, and background refresh.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import type { Activity } from "@/types/activity";

interface ActivitiesResponse {
  activities: Activity[];
  page: number;
  perPage: number;
}

export function useActivities(page: number = 1, perPage: number = 30) {
  return useQuery<ActivitiesResponse>({
    queryKey: ["activities", page, perPage],
    queryFn: async () => {
      const res = await fetch(
        `/api/athlete/activities?page=${page}&per_page=${perPage}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch activities");
      }
      return res.json();
    },
  });
}
