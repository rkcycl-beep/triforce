/**
 * Unified challenge API.
 *
 * POST /api/challenges — create a challenge + send invitations
 * GET  /api/challenges — list challenges for the current user
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createUnifiedChallenge,
  getMyChallenges,
} from "@/services/challenge.service";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const body = await req.json();

    const input = {
      name: body.name,
      description: body.description,
      sportType: body.sportType,
      distanceKm: Number(body.distanceKm),
      metric: body.metric ?? "pace",
      targetValue: body.targetValue ? Number(body.targetValue) : undefined,
      targetUnit: body.targetUnit,
      tolerancePercent: body.tolerancePercent
        ? Number(body.tolerancePercent)
        : undefined,
      bonusFactor: body.bonusFactor ? Number(body.bonusFactor) : undefined,
      penaltyFactor: body.penaltyFactor
        ? Number(body.penaltyFactor)
        : undefined,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      groupIds: body.groupIds ?? [],
      userIds: body.userIds ?? [],
    };

    const challenge = await createUnifiedChallenge(session.user.id, input);
    return NextResponse.json(challenge, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create challenge";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const challenges = await getMyChallenges(session.user.id);
    return NextResponse.json(challenges);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load challenges";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
