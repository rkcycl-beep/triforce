/**
 * GET /api/athlete/challenges/[challengeId]
 *
 * Recalculates scores on every request (pull model for Phase 1C).
 * Returns the full leaderboard + challenge metadata.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { computeLeaderboard } from "@/services/challenge.service";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { challengeId } = await params;

  // Confirm the athlete is a member of the challenge's group
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { groupId: true },
  });
  if (!challenge) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const membership = await prisma.groupMembership.findUnique({
    where: {
      userId_groupId: { userId: session.user.id, groupId: challenge.groupId },
    },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const result = await computeLeaderboard(challengeId);
  if (!result) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json(result);
}
