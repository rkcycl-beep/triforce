/**
 * normalizers.ts — Converts API-specific data into our unified Activity format.
 *
 * Why do we need this?
 * Strava calls distance "distance" and Garmin might call it "totalDistanceMeters".
 * Instead of handling both formats in every component, we convert once here.
 * The UI only ever sees our clean, unified Activity type.
 */

import type { Activity as DbActivity } from "@prisma/client";
import type { Activity, ActivitySource } from "@/types/activity";
import { normalizeSportType } from "@/types/activity";
import type { StravaActivity } from "@/types/strava";

/**
 * Convert a Strava activity into our unified Activity format.
 * Prefixes the ID with "strava_" to avoid collisions with Garmin IDs.
 */
export function normalizeStravaActivity(raw: StravaActivity): Activity {
  return {
    id: `strava_${raw.id}`,
    source: "strava",
    sourceId: String(raw.id),
    name: raw.name,
    sportType: normalizeSportType(raw.sport_type),
    rawSportType: raw.sport_type,
    startDate: raw.start_date,
    distance: raw.distance,
    movingTime: raw.moving_time,
    elapsedTime: raw.elapsed_time,
    elevationGain: raw.total_elevation_gain,
    averageSpeed: raw.average_speed,
    maxSpeed: raw.max_speed,
    averageHeartrate: raw.average_heartrate,
    maxHeartrate: raw.max_heartrate,
    hasHeartrate: raw.has_heartrate,
    mapPolyline: raw.map?.summary_polyline || undefined,
  };
}

/**
 * Convert an array of Strava activities to unified format.
 */
export function normalizeStravaActivities(
  activities: StravaActivity[]
): Activity[] {
  return activities.map(normalizeStravaActivity);
}

/**
 * Convert a Prisma Activity row into the unified UI Activity format.
 * Reconstructs the prefixed id (e.g. "strava_123") from provider columns
 * and converts Date → ISO string for the wire shape.
 */
export function dbActivityToUnified(row: DbActivity): Activity {
  return {
    id: `${row.provider}_${row.providerActivityId}`,
    source: row.provider as ActivitySource,
    sourceId: row.providerActivityId,
    name: row.name,
    sportType: normalizeSportType(row.rawSportType),
    rawSportType: row.rawSportType,
    startDate: row.startDate.toISOString(),
    distance: row.distance,
    movingTime: row.movingTime,
    elapsedTime: row.elapsedTime,
    elevationGain: row.elevationGain,
    averageSpeed: row.averageSpeed,
    maxSpeed: row.maxSpeed,
    averageHeartrate: row.averageHeartrate ?? undefined,
    maxHeartrate: row.maxHeartrate ?? undefined,
    hasHeartrate: row.hasHeartrate,
    mapPolyline: row.mapPolyline ?? undefined,
    calories: row.calories ?? undefined,
  };
}
