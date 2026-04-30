/**
 * utils.ts — Shared utility functions used across the app.
 * Formatting helpers for distances, durations, dates, etc.
 */

/**
 * Format meters into km with 1 decimal place.
 * Example: 10543 → "10.5 km"
 */
export function formatDistance(meters: number): string {
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

/**
 * Format seconds into a human-readable duration.
 * Example: 3665 → "1h 01m"
 * Example: 1830 → "30m 30s"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  return `${minutes}m ${secs.toString().padStart(2, "0")}s`;
}

/**
 * Format pace from meters/second to min/km.
 * Example: 3.5 m/s → "4:46 /km"
 */
export function formatPace(metersPerSecond: number): string {
  if (metersPerSecond <= 0) return "-";
  const minutesPerKm = 1000 / metersPerSecond / 60;
  const mins = Math.floor(minutesPerKm);
  const secs = Math.round((minutesPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
}

/**
 * Format a date string into a friendly format.
 * Example: "2024-03-15T10:30:00Z" → "Mar 15, 2024"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date string into a relative time.
 * Example: 2 hours ago → "2h ago", 3 days ago → "3d ago"
 */
export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

/**
 * Get a friendly sport name from Strava's sport type.
 * Example: "MountainBikeRide" → "Mountain Bike"
 */
export function formatSportType(type: string): string {
  const map: Record<string, string> = {
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
  return map[type] ?? type;
}
