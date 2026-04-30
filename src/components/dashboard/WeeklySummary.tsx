"use client";

/**
 * WeeklySummary.tsx — Shows a simple bar chart of distance per week.
 *
 * Takes the recent activities and groups them by week,
 * then renders a visual bar chart using Recharts.
 * This gives a quick "am I training consistently?" view.
 */

import { useStravaActivities } from "@/hooks/useStravaActivities";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WeekData {
  week: string;
  distance: number;
}

/** Group activities into weeks and sum their distances */
function groupByWeek(
  activities: { startDate: string; distance: number }[]
): WeekData[] {
  const weeks = new Map<string, number>();

  // Initialize last 4 weeks with 0
  for (let i = 3; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i * 7);
    const weekLabel = getWeekLabel(date);
    weeks.set(weekLabel, 0);
  }

  // Sum distances per week
  for (const activity of activities) {
    const date = new Date(activity.startDate);
    const weekLabel = getWeekLabel(date);
    if (weeks.has(weekLabel)) {
      weeks.set(weekLabel, (weeks.get(weekLabel) ?? 0) + activity.distance);
    }
  }

  return Array.from(weeks.entries()).map(([week, distance]) => ({
    week,
    distance: Math.round(distance / 1000 * 10) / 10, // Convert to km
  }));
}

/** Get a short week label like "Mar 10" */
function getWeekLabel(date: Date): string {
  // Get Monday of this week
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  return monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function WeeklySummary() {
  // Fetch more activities to cover ~4 weeks
  const { data, isLoading } = useStravaActivities(1, 50);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Weekly Distance</h2>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const activities = data?.activities ?? [];
  if (activities.length === 0) return null;

  const weekData = groupByWeek(activities);

  // Don't show if all weeks are 0
  if (weekData.every((w) => w.distance === 0)) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Weekly Distance</h2>
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weekData}>
            <XAxis
              dataKey="week"
              tick={{ fontSize: 12, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
              width={40}
              unit=" km"
            />
            <Tooltip
              formatter={(value) => [`${value} km`, "Distance"]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                fontSize: "14px",
              }}
            />
            <Bar
              dataKey="distance"
              fill="#3B82F6"
              radius={[6, 6, 0, 0]}
              maxBarSize={50}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
