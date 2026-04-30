"use client";

/**
 * ActivityCard.tsx — Displays a single activity in a compact card.
 *
 * Shows: sport icon, name, date, distance, time, pace/speed, and heart rate.
 * Tapping it navigates to the activity detail page.
 * Designed for mobile-first — touch-friendly with min 48px tap targets.
 */

import Link from "next/link";
import type { Activity } from "@/types/activity";
import { sportTypeLabel } from "@/types/activity";
import {
  formatDistance,
  formatDuration,
  formatRelativeTime,
  formatPace,
} from "@/lib/utils";

interface ActivityCardProps {
  activity: Activity;
}

/** Emoji icons for each sport type */
const sportIcons: Record<string, string> = {
  run: "\u{1F3C3}",
  ride: "\u{1F6B4}",
  swim: "\u{1F3CA}",
  walk: "\u{1F6B6}",
  hike: "\u{26F0}\uFE0F",
  other: "\u{1F4AA}",
};

export default function ActivityCard({ activity }: ActivityCardProps) {
  return (
    <Link
      href={`/activities/${activity.source}_${activity.sourceId}`}
      className="block rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all active:scale-[0.98] hover:shadow-md"
    >
      {/* Top row: icon + name + date */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label={activity.sportType}>
            {sportIcons[activity.sportType] || sportIcons.other}
          </span>
          <div>
            <h3 className="font-semibold text-gray-900 leading-tight">
              {activity.name}
            </h3>
            <p className="text-xs text-gray-500">
              {sportTypeLabel(activity.sportType)} &middot;{" "}
              {formatRelativeTime(activity.startDate)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex items-center gap-4 text-sm">
        <Stat label="Distance" value={formatDistance(activity.distance)} />
        <Stat label="Time" value={formatDuration(activity.movingTime)} />
        {activity.sportType === "run" && activity.averageSpeed > 0 && (
          <Stat label="Pace" value={formatPace(activity.averageSpeed)} />
        )}
        {activity.hasHeartrate && activity.averageHeartrate && (
          <Stat
            label="HR"
            value={`${Math.round(activity.averageHeartrate)} bpm`}
          />
        )}
      </div>
    </Link>
  );
}

/** A tiny stat display used inside the card */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-700">{value}</p>
    </div>
  );
}
