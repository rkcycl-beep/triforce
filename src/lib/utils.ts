/**
 * utils.ts — Shared utility functions used across the app.
 * Formatting helpers for distances, durations, dates, etc.
 *
 * All formatters accept an optional `locale` parameter ("he" | "en").
 * Default is Hebrew.
 */

import type { Locale } from "@/lib/i18n";

/**
 * Format meters into km with 1 decimal place.
 * Example: 10543 → "10.5 ק"מ" (he) or "10.5(km)" (en)
 */
export function formatDistance(meters: number, locale: Locale = "en"): string {
  const km = meters / 1000;
  const unit = locale === "he" ? 'ק"מ' : "(km)";
  return `${km.toFixed(1)}${unit}`;
}

/**
 * Format seconds into a human-readable duration.
 * Example: 3665 → "שעה ו-01 דק'" (he) or "61.08 min" (en)
 */
export function formatDuration(seconds: number, locale: Locale = "en"): string {
  if (locale === "he") {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours} שעות ${minutes.toString().padStart(2, "0")} דק'`;
    }
    return `${minutes} דק' ${secs.toString().padStart(2, "0")} ש"`;
  }

  const totalMinutes = seconds / 60;
  return `${totalMinutes.toFixed(2)} min`;
}

/**
 * Format pace from meters/second to min/km.
 * Example: 3.5 m/s → "4:46 דק'/ק"מ" (he) or "4:46(min/km)" (en)
 */
export function formatPace(metersPerSecond: number, locale: Locale = "en"): string {
  if (metersPerSecond <= 0) return "-";
  const minutesPerKm = 1000 / metersPerSecond / 60;
  const mins = Math.floor(minutesPerKm);
  const secs = Math.round((minutesPerKm - mins) * 60);
  const unit = locale === "he" ? ' דק\'/ק"מ' : "(min/km)";
  return `${mins}:${secs.toString().padStart(2, "0")}${unit}`;
}

/**
 * Format pace from minutes/kilometer.
 * Example: 7.62 min/km → "7:37 דק'/ק"מ" (he) or "7:37(min/km)" (en)
 */
export function formatPaceMinPerKm(minutesPerKm: number, locale: Locale = "en"): string {
  if (minutesPerKm <= 0) return "-";
  const totalSeconds = Math.round(minutesPerKm * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const unit = locale === "he" ? ' דק\'/ק"מ' : "(min/km)";
  return `${mins}:${secs.toString().padStart(2, "0")}${unit}`;
}

/**
 * Format a date string into a friendly format.
 * Example: "2024-03-15T10:30:00Z" → "15 במרץ 2024" (he) or "3-15-2024" (en)
 */
export function formatDate(dateString: string, locale: Locale = "en"): string {
  const date = new Date(dateString);
  if (locale === "he") {
    return date.toLocaleDateString("he-IL", {
      month: "numeric",
      day: "2-digit",
      year: "numeric",
    });
  }
  return date
    .toLocaleDateString("en-US", {
      month: "numeric",
      day: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "-");
}

/**
 * Format a date string into a relative time.
 * Example: 2 hours ago → "לפני 2 שעות" (he) or "2h ago" (en)
 */
export function formatRelativeTime(dateString: string, locale: Locale = "en"): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (locale === "he") {
    if (diffMins < 60) return `לפני ${diffMins} דק'`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    return formatDate(dateString, locale);
  }

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString, locale);
}

/**
 * Get a friendly sport name from Strava's sport type.
 * Example: "MountainBikeRide" → "Mountain Bike"
 */
export function formatSportType(type: string, locale: Locale = "he"): string {
  const normalized = type.charAt(0).toUpperCase() + type.slice(1);
  const mapEn: Record<string, string> = {
    Run: "Run",
    Ride: "Ride",
    Swim: "Swim",
    Walk: "Walk",
    Hike: "Hike",
    MountainBikeRide: "MTB",
    VirtualRide: "Virtual Ride",
    VirtualRun: "Virtual Run",
    TrailRun: "Trail Run",
    WeightTraining: "Weights",
    Yoga: "Yoga",
  };

  const mapHe: Record<string, string> = {
    Run: "ריצה",
    Ride: "אופניים",
    Swim: "שחייה",
    Walk: "הליכה",
    Hike: "טיול",
    MountainBikeRide: "אופני הרים",
    VirtualRide: "אופניים וירטואליים",
    VirtualRun: "ריצה וירטואלית",
    TrailRun: "ריצת שטח",
    WeightTraining: "אימון משקולות",
    Yoga: "יוגה",
  };

  return (locale === "he" ? mapHe : mapEn)[normalized] ?? normalized;
}
