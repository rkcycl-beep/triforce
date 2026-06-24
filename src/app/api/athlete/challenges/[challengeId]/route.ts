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

  // Confirm the athlete has access to the challenge
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { groupId: true, createdById: true },
  });
  if (!challenge) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let hasAccess = false;
  if (challenge.groupId) {
    // Group-scoped challenge: member of the group
    const membership = await prisma.groupMembership.findUnique({
      where: {
        userId_groupId: { userId: session.user.id, groupId: challenge.groupId },
      },
    });
    hasAccess = !!membership;
  } else {
    // Friend challenge: participant or creator
    const entry = await prisma.challengeEntry.findUnique({
      where: {
        challengeId_userId: { challengeId, userId: session.user.id },
      },
    });
    hasAccess = !!entry || challenge.createdById === session.user.id;
  }

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const result = await computeLeaderboard(challengeId);
  if (!result) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json(result);
}
