/**
 * GET /api/athlete/groups/[groupId]/non-members
 * Returns TriForce users who can be added by the group owner.
 * COACH group → all registered users not yet members.
 * PEER group  → caller's chosen friends with a TriForce account, not yet members.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getNonMembers } from "@/services/group.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { groupId } = await params;

  try {
    const users = await getNonMembers(groupId, session.user.id);
    if (users === null) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to fetch non-members:", error);
    return NextResponse.json({ error: "Failed to load candidates." }, { status: 500 });
  }
}
