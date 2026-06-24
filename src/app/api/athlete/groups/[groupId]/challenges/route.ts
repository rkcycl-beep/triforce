/**
 * GET /api/athlete/groups/[groupId]/challenges
 * List challenges for a group. Any member can call this.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChallengesByGroup } from "@/services/challenge.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { groupId } = await params;

  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const challenges = await getChallengesByGroup(groupId);
    return NextResponse.json({ challenges });
  } catch (error) {
    console.error("Failed to fetch group challenges:", error);
    return NextResponse.json({ error: "Failed to load challenges." }, { status: 500 });
  }
}
