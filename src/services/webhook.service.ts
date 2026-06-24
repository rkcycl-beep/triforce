/**
 * webhook.service.ts — Process Strava webhook events.
 *
 * Handles:
 * - activity.create: fetch, normalize, persist, recalculate challenge scores
 * - activity.update: refetch and update
 * - activity.delete: remove from DB, recalculate scores
 * - athlete.update (authorized=false): delete Strava connection
 */

import { prisma } from "@/lib/prisma";
import {
  getValidStravaAccessToken,
  fetchStravaActivity,
} from "@/lib/strava-webhooks";
import { upsertActivity } from "./activity.service";
import { computeScore } from "@/lib/scoring";
import type { StravaDetailedActivity } from "@/types/strava";
import { normalizeSportType } from "@/types/activity";

export interface StravaWebhookEvent {
  aspect_type: "create" | "update" | "delete";
  event_time: number;
  object_id: number;
  object_type: "activity" | "athlete";
  owner_id: number;
  subscription_id: number;
  updates: Record<string, unknown>;
}

async function findUserByStravaAthleteId(athleteId: number): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: {
      provider: "strava",
      providerAccountId: String(athleteId),
    },
    select: { userId: true },
  });
  return account?.userId ?? null;
}

function stravaDetailToDbInput(userId: string, raw: StravaDetailedActivity) {
  return {
    userId,
    provider: "strava" as const,
    providerActivityId: String(raw.id),
    name: raw.name,
    sportType: normalizeSportType(raw.sport_type),
    rawSportType: raw.sport_type,
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
    calories: raw.calories ?? null,
  };
}

/**
 * Recalculate challenge entries for a single user after an activity change.
 * Only affects active challenges that include this sport type and date.
 */
async function recalculateUserChallenges(
  userId: string,
  activitySportType: string,
  activityStartDate: Date
) {
  const memberships = await prisma.groupMembership.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = memberships.map((m) => m.groupId);

  const participantChallengeIds = await prisma.challengeEntry.findMany({
    where: { userId },
    select: { challengeId: true },
  });
  const entryChallengeIds = participantChallengeIds.map((e) => e.challengeId);

  const challenges = await prisma.challenge.findMany({
    where: {
      status: "ACTIVE",
      startDate: { lte: activityStartDate },
      endDate: { gte: activityStartDate },
      AND: [
        {
          OR: [
            { groupId: { in: groupIds } },
            { id: { in: entryChallengeIds } },
          ],
        },
        {
          OR: [
            { sportTypes: { has: activitySportType } },
            { sportType: activitySportType },
          ],
        },
      ],
    },
  });

  if (challenges.length === 0) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  for (const challenge of challenges) {
    const cfg = (challenge.config ?? {}) as Record<string, unknown>;
    const baselineWeeks = (cfg.baselineWeeks as number) ?? 4;
    const baselineStart = new Date(challenge.startDate);
    baselineStart.setDate(baselineStart.getDate() - baselineWeeks * 7);

    const sportFilter =
      challenge.sportTypes.length > 0
        ? challenge.sportTypes
        : [challenge.sportType];

    const [activities, baseline] = await Promise.all([
      prisma.activity.findMany({
        where: {
          userId,
          sportType: { in: sportFilter },
          startDate: { gte: challenge.startDate, lte: challenge.endDate },
          isDuplicate: false,
        },
      }),
      prisma.activity.findMany({
        where: {
          userId,
          sportType: { in: sportFilter },
          startDate: { gte: baselineStart, lt: challenge.startDate },
          isDuplicate: false,
        },
      }),
    ]);

    const { score, metadata } = await computeScore(challenge, user, activities, baseline);

    await prisma.challengeEntry.upsert({
      where: { challengeId_userId: { challengeId: challenge.id, userId } },
      update: { score, metadata: metadata as object },
      create: {
        challengeId: challenge.id,
        userId,
        score,
        metadata: metadata as object,
      },
    });
  }

  // Re-rank all entries for each affected challenge
  await Promise.all(
    challenges.map(async (challenge) => {
      const entries = await prisma.challengeEntry.findMany({
        where: { challengeId: challenge.id },
        orderBy: { score: "desc" },
      });
      await Promise.all(
        entries.map((e, i) =>
          prisma.challengeEntry.update({
            where: { id: e.id },
            data: { rank: i + 1 },
          })
        )
      );
    })
  );
}

export async function processWebhookEvent(event: StravaWebhookEvent): Promise<void> {
  if (event.object_type === "athlete") {
    if (event.aspect_type === "update" && event.updates.authorized === "false") {
      const userId = await findUserByStravaAthleteId(event.owner_id);
      if (userId) {
        await prisma.account.deleteMany({
          where: { userId, provider: "strava" },
        });
        console.log(`[webhook] Deleted Strava connection for user ${userId}`);
      }
    }
    return;
  }

  if (event.object_type !== "activity") {
    console.log(`[webhook] Ignoring object_type: ${event.object_type}`);
    return;
  }

  const userId = await findUserByStravaAthleteId(event.owner_id);
  if (!userId) {
    console.log(`[webhook] No user found for Strava athlete ${event.owner_id}`);
    return;
  }

  if (event.aspect_type === "delete") {
    const activity = await prisma.activity.findUnique({
      where: {
        provider_providerActivityId_userId: {
          provider: "strava",
          providerActivityId: String(event.object_id),
          userId,
        },
      },
    });

    if (activity) {
      await prisma.activity.delete({ where: { id: activity.id } });
      await recalculateUserChallenges(userId, activity.sportType, activity.startDate);
      console.log(`[webhook] Deleted activity ${event.object_id} for user ${userId}`);
    }
    return;
  }

  // create or update: fetch full details and upsert
  try {
    const accessToken = await getValidStravaAccessToken(userId);
    const detail = await fetchStravaActivity(accessToken, event.object_id);

    const dbInput = stravaDetailToDbInput(userId, detail);
    await upsertActivity(dbInput);

    await recalculateUserChallenges(userId, dbInput.sportType, dbInput.startDate);

    console.log(
      `[webhook] ${event.aspect_type} activity ${event.object_id} for user ${userId}`
    );
  } catch (error) {
    console.error(
      `[webhook] Failed to process ${event.aspect_type} activity ${event.object_id} for user ${userId}:`,
      error
    );
    throw error;
  }
}
