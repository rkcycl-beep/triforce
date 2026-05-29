/**
 * GET /api/athlete/challenges — challenges for all groups the athlete belongs to.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAthleteChallenges } from "@/services/challenge.service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const challenges = await getAthleteChallenges(session.user.id);
  return NextResponse.json(challenges);
}
