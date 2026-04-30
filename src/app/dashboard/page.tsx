"use client";

/**
 * Dashboard Page — The main view after login.
 *
 * Shows real data from Strava:
 * - Year-to-date stats (runs, rides, swims)
 * - Weekly distance bar chart
 * - Recent activities list
 *
 * Each section is wrapped in an ErrorBoundary so if one crashes,
 * the rest of the dashboard keeps working.
 */

import { useSession } from "next-auth/react";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import StatsOverview from "@/components/dashboard/StatsOverview";
import WeeklySummary from "@/components/dashboard/WeeklySummary";
import RecentActivities from "@/components/dashboard/RecentActivities";

export default function DashboardPage() {
  const { data: session } = useSession();

  // Get first name for the greeting
  const firstName = session?.user?.name?.split(" ")[0] ?? "Athlete";

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hey, {firstName}!
        </h1>
        <p className="text-sm text-gray-500">
          Here&apos;s your training overview.
        </p>
      </div>

      {/* Stats cards — year-to-date totals */}
      <ErrorBoundary>
        <StatsOverview />
      </ErrorBoundary>

      {/* Weekly distance chart */}
      <ErrorBoundary>
        <WeeklySummary />
      </ErrorBoundary>

      {/* Recent activities */}
      <ErrorBoundary>
        <RecentActivities />
      </ErrorBoundary>
    </div>
  );
}
