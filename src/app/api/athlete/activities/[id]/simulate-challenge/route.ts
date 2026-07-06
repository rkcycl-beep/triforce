/**
 * POST /api/athlete/activities/[id]/simulate-challenge
 *
 * Simulates how a single past activity would score as a goal-based challenge.
 * Does NOT create a challenge. Returns the derived challenge parameters,
 * reference pace, and calculated score.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreGoalBasedActivity, getExpectedPace, getAgeAtDate } from "@/lib/scoring/goal-based";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const where = id.includes("_")
      ? { provider: id.split("_")[0], providerActivityId: id.split("_").slice(1).join("_"), userId: session.user.id }
      : { id, userId: session.user.id };

    const [activity, user] = await Promise.all([
      prisma.activity.findFirst({ where }),
      prisma.user.findUnique({ where: { id: session.user.id } }),
    ]);

    const tolerancePercent = user?.tolerancePercent ?? 30;

    if (!activity) {
      return NextResponse.json({ error: "Activity not found." }, { status: 404 });
    }

    if (!user?.dateOfBirth || !user.sex) {
      return NextResponse.json(
        { error: "Profile missing age or gender for scoring." },
        { status: 400 }
      );
    }

    // Derived challenge parameters from the activity
    const distanceKm = activity.distance / 1000;
    const sportType = activity.sportType;
    const activityPaceMinPerKm = activity.distance > 0 ? activity.movingTime / 60 / distanceKm : 0;

    // Mock challenge that matches the activity
    const mockChallenge = {
      id: "simulate",
      createdById: user.id,
      groupId: null,
      name: `${activity.name} — simulation`,
      description: null,
      sportTypes: [sportType],
      sportType,
      distanceKm,
      metric: "pace",
      targetValue: null,
      targetUnit: null,
      tolerancePercent,
      bonusFactor: 50,
      penaltyFactor: 100,
      scoringMethod: "GOAL_BASED" as const,
      startDate: activity.startDate,
      endDate: activity.startDate,
      status: "ACTIVE" as const,
      config: null,
      createdAt: new Date(),
    };

    const simulation = await scoreGoalBasedActivity(activity, user, mockChallenge);

    const age = getAgeAtDate(user.dateOfBirth, new Date(activity.startDate));
    const reference = await getExpectedPace(sportType, user.sex, age, distanceKm);

    return NextResponse.json({
      activity: {
        id: activity.id,
        name: activity.name,
        sportType,
        distanceKm,
        movingTime: activity.movingTime,
        paceMinPerKm: activityPaceMinPerKm,
        startDate: activity.startDate,
      },
      challengeParams: {
        name: activity.name,
        sportType,
        distanceKm,
        metric: "pace",
        tolerancePercent,
        startDate: activity.startDate,
        endDate: activity.startDate,
      },
      reference: reference
        ? {
            paceMinPerKm: reference.paceMinPerKm,
            gender: reference.gender,
            age: reference.age,
          }
        : null,
      simulation,
    });
  } catch (error) {
    console.error("Failed to simulate challenge:", error);
    const message = error instanceof Error ? error.message : "Failed to simulate challenge.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
