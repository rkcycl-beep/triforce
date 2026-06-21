/**
 * POST /api/athlete/groups/[groupId]/invite — invite a chosen friend (by triforceUserId).
 * Body: { userId: string }
 * The caller must already be a member of the PEER group.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { inviteFriendToPeerGroup } from "@/services/group.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { groupId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { userId } = body as { userId?: unknown };
  if (typeof userId !== "string" || userId.trim().length === 0) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  try {
    const result = await inviteFriendToPeerGroup(groupId, session.user.id, userId);
    if (!result) {
      return NextResponse.json(
        { error: "Group not found, not a PEER group, or you are not a member." },
        { status: 403 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to invite friend to group:", error);
    return NextResponse.json({ error: "Failed to invite friend." }, { status: 500 });
  }
}
