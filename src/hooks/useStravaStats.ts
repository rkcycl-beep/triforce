/**
 * useStravaStats — A React hook to fetch the athlete's Strava stats.
 *
 * Returns lifetime totals, year-to-date, and recent stats for
 * runs, rides, and swims. Used by the dashboard stat cards.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import type { StravaAthleteStats } from "@/types/strava";

interface StatsResponse {
  stats: StravaAthleteStats;
}

export function useStravaStats() {
  return useQuery<StatsResponse>({
    queryKey: ["strava-stats"],
    queryFn: async () => {
      const res = await fetch("/api/strava/stats");
      if (!res.ok) {
        throw new Error("Failed to fetch stats");
      }
      return res.json();
    },
  });
}
