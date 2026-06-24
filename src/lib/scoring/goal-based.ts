import type { Activity, Challenge, SportReferencePace, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface GoalBasedScore {
  score: number;
  actualPace: number;
  expectedPace: number;
  tolerancePace: number;
  age: number;
  gender: string;
  distanceKm: number;
  paceRatio: number;
}

/**
 * Calculate a runner's age at a given date.
 */
export function getAgeAtDate(dateOfBirth: Date, atDate: Date): number {
  let age = atDate.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = atDate.getMonth() - dateOfBirth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && atDate.getDate() < dateOfBirth.getDate())
  ) {
    age--;
  }
  return age;
}

/**
 * Convert activity moving time and distance to pace in minutes per km.
 */
export function calculatePaceMinPerKm(
  movingTimeSeconds: number,
  distanceMeters: number
): number {
  if (!distanceMeters || distanceMeters <= 0) return 0;
  const distanceKm = distanceMeters / 1000;
  const minutes = movingTimeSeconds / 60;
  return minutes / distanceKm;
}

/**
 * Look up the expected average pace for a given sport/gender/age/distance.
 */
export async function getExpectedPace(
  sportType: string,
  gender: string,
  age: number,
  distanceKm: number
): Promise<SportReferencePace | null> {
  return prisma.sportReferencePace.findUnique({
    where: {
      sportType_gender_age_distanceKm: {
        sportType,
        gender,
        age,
        distanceKm,
      },
    },
  });
}

/**
 * Calculate a goal-based score for a single activity.
 * Returns null if the activity does not qualify or user lacks required data.
 */
export async function scoreGoalBasedActivity(
  activity: Activity,
  user: User,
  challenge: Challenge
): Promise<GoalBasedScore | null> {
  if (!user.dateOfBirth || !user.sex) {
    return null;
  }

  if (challenge.sportType !== activity.sportType) {
    return null;
  }

  const activityDistanceKm = activity.distance / 1000;
  if (activityDistanceKm < challenge.distanceKm) {
    return null;
  }

  const activityStart = new Date(activity.startDate);
  if (
    activityStart < new Date(challenge.startDate) ||
    activityStart > new Date(challenge.endDate)
  ) {
    return null;
  }

  const age = getAgeAtDate(user.dateOfBirth, new Date(challenge.startDate));
  const reference = await getExpectedPace(
    challenge.sportType,
    user.sex,
    age,
    challenge.distanceKm
  );

  if (!reference) {
    return null;
  }

  const expectedPace = reference.paceMinPerKm;
  const tolerancePace =
    expectedPace * (1 + (challenge.tolerancePercent ?? 30) / 100);
  const actualPace = calculatePaceMinPerKm(
    activity.movingTime,
    activity.distance
  );

  if (actualPace <= 0) {
    return null;
  }

  let score: number;
  let paceRatio: number;

  if (actualPace <= expectedPace) {
    // Faster than expected → bonus
    paceRatio = expectedPace / actualPace;
    const bonus = (paceRatio - 1) * (challenge.bonusFactor ?? 50);
    score = 100 + bonus;
  } else if (actualPace <= tolerancePace) {
    // Within tolerance range → full score
    paceRatio = 1;
    score = 100;
  } else {
    // Slower than tolerance → penalty
    paceRatio = tolerancePace / actualPace;
    const penalty = (1 - paceRatio) * (challenge.penaltyFactor ?? 100);
    score = 100 - penalty;
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  return {
    score: Math.round(score * 10) / 10,
    actualPace: Math.round(actualPace * 100) / 100,
    expectedPace: Math.round(expectedPace * 100) / 100,
    tolerancePace: Math.round(tolerancePace * 100) / 100,
    age,
    gender: user.sex,
    distanceKm: challenge.distanceKm,
    paceRatio: Math.round(paceRatio * 1000) / 1000,
  };
}

/**
 * Find the best qualifying activity for a user in a challenge.
 */
export async function findBestGoalBasedAttempt(
  activities: Activity[],
  user: User,
  challenge: Challenge
): Promise<GoalBasedScore | null> {
  const scores: GoalBasedScore[] = [];

  for (const activity of activities) {
    const result = await scoreGoalBasedActivity(activity, user, challenge);
    if (result) {
      scores.push(result);
    }
  }

  if (scores.length === 0) {
    return null;
  }

  // Highest score wins
  return scores.reduce((best, current) =>
    current.score > best.score ? current : best
  );
}

/**
 * Compute the final score and metadata for a goal-based challenge entry.
 */
export async function computeGoalBasedScore(
  challenge: Challenge,
  user: User,
  activities: Activity[]
): Promise<{ score: number; metadata: Record<string, unknown> }> {
  const bestAttempt = await findBestGoalBasedAttempt(activities, user, challenge);

  if (!bestAttempt) {
    return {
      score: 0,
      metadata: {
        reason: "no_qualifying_activity",
        qualifyingCount: 0,
      },
    };
  }

  return {
    score: bestAttempt.score,
    metadata: {
      ...bestAttempt,
      qualifyingCount: activities.filter(
        (a) =>
          a.sportType === challenge.sportType &&
          a.distance / 1000 >= challenge.distanceKm &&
          new Date(a.startDate) >= new Date(challenge.startDate) &&
          new Date(a.startDate) <= new Date(challenge.endDate)
      ).length,
    },
  };
}
