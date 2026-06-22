"use client";

import { useQuery } from "@tanstack/react-query";
import type { Activity } from "@/types/activity";

interface ActivitiesResponse {
  activities: Activity[];
  page: number;
  perPage: number;
}

interface UseActivitiesOptions {
  page?: number;
  perPage?: number;
  from?: Date | null;
  to?: Date | null;
}

export function useActivities(
  pageOrOpts: number | UseActivitiesOptions = 1,
  perPage: number = 30
) {
  const opts: UseActivitiesOptions =
    typeof pageOrOpts === "number"
      ? { page: pageOrOpts, perPage }
      : pageOrOpts;

  const page    = opts.page    ?? 1;
  const per     = opts.perPage ?? perPage;
  const from    = opts.from    ?? null;
  const to      = opts.to      ?? null;

  return useQuery<ActivitiesResponse>({
    queryKey: ["activities", page, per, from?.toISOString(), to?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        page:     String(page),
        per_page: String(per),
      });
      if (from) params.set("from", from.toISOString());
      if (to)   params.set("to",   to.toISOString());
      const res = await fetch(`/api/athlete/activities?${params}`);
      if (!res.ok) throw new Error("Failed to fetch activities");
      return res.json();
    },
    staleTime: Infinity,
  });
}
