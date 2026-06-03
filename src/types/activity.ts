/**
 * activity.ts — The UNIFIED activity type used throughout the app.
 *
 * Why? Strava and Garmin return data in different formats.
 * Instead of handling both formats everywhere in the UI,
 * we convert everything into ONE standard format here.
 *
 * Think of it like a universal translator — no matter where
 * the data comes from, the UI always sees the same shape.
 */

import type { Locale } from "@/lib/i18n";

/** Where did this activity come from? */
export type ActivitySource = "strava" | "garmin";

/** The unified activity format used by ALL UI components */
export interface Activity {
  /** Unique ID (prefixed with source: "strava_123" or "garmin_456") */
  id: string;
  /** Which service this came from */
  source: ActivitySource;
  /** Original ID from the source API */
  sourceId: string;
  /** Activity name (e.g., "Morning Run") */
  name: string;
  /** Sport type normalized to a common set */
  sportType: SportType;
  /** Original sport type string from the source */
  rawSportType: string;
  /** When the activity started (ISO 8601) */
  startDate: string;
  /** Distance in meters */
  distance: number;
  /** Active moving time in seconds */
  movingTime: number;
  /** Total time including pauses in seconds */
  elapsedTime: number;
  /** Elevation gained in meters */
  elevationGain: number;
  /** Average speed in meters/second */
  averageSpeed: number;
  /** Max speed in meters/second */
  maxSpeed: number;
  /** Average heart rate in BPM (if available) */
  averageHeartrate?: number;
  /** Max heart rate in BPM (if available) */
  maxHeartrate?: number;
  /** Whether heart rate data is available */
  hasHeartrate: boolean;
  /** Encoded polyline for drawing routes on a map */
  mapPolyline?: string;
  /** Calories burned (if available) */
  calories?: number;
}

/** Standardized sport types we support */
export type SportType =
  | "run"
  | "ride"
  | "swim"
  | "walk"
  | "hike"
  | "other";

/** Map Strava's sport_type string to our unified SportType */
export function normalizeSportType(rawType: string): SportType {
  const lower = rawType.toLowerCase();

  if (lower.includes("run")) return "run";
  if (lower.includes("ride") || lower.includes("cycling")) return "ride";
  if (lower.includes("swim")) return "swim";
  if (lower.includes("walk")) return "walk";
  if (lower.includes("hike")) return "hike";
  return "other";
}

/** Get a display-friendly label for a sport type */
export function sportTypeLabel(type: SportType, locale: Locale = "he"): string {
  const labelsHe: Record<SportType, string> = {
    run: "ריצה",
    ride: "אופניים",
    swim: "שחייה",
    walk: "הליכה",
    hike: "טיול",
    other: "פעילות",
  };

  const labelsEn: Record<SportType, string> = {
    run: "Run",
    ride: "Ride",
    swim: "Swim",
    walk: "Walk",
    hike: "Hike",
    other: "Activity",
  };

  return (locale === "he" ? labelsHe : labelsEn)[type];
}

/** Get an emoji icon for a sport type */
export function sportTypeIcon(type: SportType): string {
  const icons: Record<SportType, string> = {
    run: "person-running",
    ride: "person-biking",
    swim: "person-swimming",
    walk: "person-walking",
    hike: "mountain",
    other: "dumbbell",
  };
  return icons[type];
}
