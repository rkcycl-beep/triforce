"use client";

/**
 * StatsOverview.tsx — Shows your Strava stats at a glance.
 *
 * Displays year-to-date totals for runs, rides, and swims
 * using the StatCard component. Data comes from Strava's
 * athlete/stats endpoint.
 */

import { useStravaStats } from "@/hooks/useStravaStats";
import StatCard from "@/components/ui/StatCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatDistance, formatDuration } from "@/lib/utils";

export default function StatsOverview() {
  const { data, isLoading, error } = useStravaStats();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Year to Date
        </h2>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !data?.stats) {
    return null; // Silently skip if stats aren't available
  }

  const { ytd_run_totals, ytd_ride_totals, ytd_swim_totals } = data.stats;

  // Build an array of stat cards — only show sports the user actually does
  const cards: { label: string; value: string; unit?: string }[] = [];

  if (ytd_run_totals.count > 0) {
    cards.push({
      label: "Runs (YTD)",
      value: String(ytd_run_totals.count),
      unit: "runs",
    });
    cards.push({
      label: "Run Distance",
      value: formatDistance(ytd_run_totals.distance),
    });
    cards.push({
      label: "Run Time",
      value: formatDuration(ytd_run_totals.moving_time),
    });
  }

  if (ytd_ride_totals.count > 0) {
    cards.push({
      label: "Rides (YTD)",
      value: String(ytd_ride_totals.count),
      unit: "rides",
    });
    cards.push({
      label: "Ride Distance",
      value: formatDistance(ytd_ride_totals.distance),
    });
  }

  if (ytd_swim_totals.count > 0) {
    cards.push({
      label: "Swims (YTD)",
      value: String(ytd_swim_totals.count),
      unit: "swims",
    });
    cards.push({
      label: "Swim Distance",
      value: formatDistance(ytd_swim_totals.distance),
    });
  }

  if (cards.length === 0) {
    return null; // No stats to show yet
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Year to Date</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} unit={card.unit} />
        ))}
      </div>
    </div>
  );
}
