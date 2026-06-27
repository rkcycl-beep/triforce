/**
 * GET  /api/coach/groups/[groupId]/challenges — list challenges for a group
 * POST /api/coach/groups/[groupId]/challenges — create a new challenge
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createChallenge, getChallengesByGroup } from "@/services/challenge.service";
import type { ScoringMethod } from "@prisma/client";

const VALID_METHODS: ScoringMethod[] = ["PERSONAL_IMPROVEMENT", "AGE_GRADE", "CATEGORY"];
const VALID_SPORT_TYPES = ["run", "ride", "swim", "walk", "hike", "other"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.roles?.includes("COACH")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const { groupId } = await params;
  const challenges = await getChallengesByGroup(groupId);
  return NextResponse.json(challenges);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.roles?.includes("COACH")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { groupId } = await params;
  const { name, description, sportTypes, scoringMethod, startDate, endDate, config } =
    body as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim())
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!Array.isArray(sportTypes) || sportTypes.length === 0)
    return NextResponse.json({ error: "At least one sport type is required." }, { status: 400 });
  if (!VALID_METHODS.includes(scoringMethod as ScoringMethod))
    return NextResponse.json({ error: "Invalid scoring method." }, { status: 400 });
  if (!startDate || !endDate)
    return NextResponse.json({ error: "Start and end dates are required." }, { status: 400 });

  const validatedSports = (sportTypes as string[]).filter((s) =>
    VALID_SPORT_TYPES.includes(s)
  );

  try {
    const challenge = await createChallenge(session.user.id, {
      groupId,
      name: name as string,
      description: description as string | undefined,
      sportTypes: validatedSports,
      scoringMethod: scoringMethod as ScoringMethod,
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      config: (config as Record<string, unknown>) ?? {},
    });
    return NextResponse.json(challenge, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create challenge." }, { status: 500 });
  }
}
