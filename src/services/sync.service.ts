/**
 * sync.service.ts — Pull provider activities into the DB.
 *
 * For Phase 1A this only handles Strava and only syncs the latest page on
 * sign-in. Webhooks (Phase 1D) and historical backfill come later.
 */

import { getActivities } from "@/lib/strava";
import { prisma } from "@/lib/prisma";
import { normalizeSportType } from "@/types/activity";
import type { StravaActivity } from "@/types/strava";
import { upsertActivity, type UpsertActivityInput } from "./activity.service";

function stravaActivityToDbInput(
  userId: string,
  raw: StravaActivity
): UpsertActivityInput {
  return {
    userId,
    provider: "strava",
    providerActivityId: String(raw.id),
    name: raw.name,
    sportType: normalizeSportType(raw.sport_type),
    rawSportType: raw.sport_type,
    // Always UTC. Never start_date_local — challenge windows compare across athletes.
    startDate: new Date(raw.start_date),
    distance: raw.distance,
    movingTime: raw.moving_time,
    elapsedTime: raw.elapsed_time,
    elevationGain: raw.total_elevation_gain,
    averageSpeed: raw.average_speed,
    maxSpeed: raw.max_speed,
    averageHeartrate: raw.average_heartrate ?? null,
    maxHeartrate: raw.max_heartrate ?? null,
    hasHeartrate: Boolean(raw.has_heartrate),
    mapPolyline: raw.map?.summary_polyline ?? null,
    // Basic StravaActivity doesn't carry calories — the detail endpoint does.
    calories: null,
  };
}

export async function syncStravaActivitiesForUser(
  userId: string,
  accessToken: string,
  months = 3          // pass 0 for full history (no date limit)
): Promise<{ synced: number }> {
  const after = months > 0
    ? Math.floor((Date.now() - months * 30 * 24 * 60 * 60 * 1000) / 1000)
    : undefined;
  const allActivities: StravaActivity[] = [];
  for (let page = 1; page <= 50; page++) {   // up to 5 000 activities
    const batch = await getActivities(accessToken, page, 100, after);
    allActivities.push(...batch);
    if (batch.length < 100) break;
  }

  const results = await Promise.allSettled(
    allActivities.map((raw) =>
      upsertActivity(stravaActivityToDbInput(userId, raw))
    )
  );

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    console.error(
      `Strava sync: ${failures.length}/${results.length} upserts failed`,
      failures.map((f) => (f as PromiseRejectedResult).reason)
    );
  }

  // Record sync timestamp
  await prisma.user.update({
    where: { id: userId },
    data: { lastStravaSync: new Date() },
  });

  return { synced: results.length - failures.length };
}
