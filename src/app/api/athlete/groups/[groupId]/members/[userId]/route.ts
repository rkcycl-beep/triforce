/**
 * POST   /api/athlete/groups/[groupId]/members/[userId] — owner adds a member
 * DELETE /api/athlete/groups/[groupId]/members/[userId] — owner removes a member
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addMemberToGroup, removeMemberFromGroup } from "@/services/group.service";

type Ctx = { params: Promise<{ groupId: string; userId: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { groupId, userId } = await params;

  try {
    const result = await addMemberToGroup(groupId, session.user.id, userId);
    if (!result) {
      return NextResponse.json({ error: "Forbidden or group not found." }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to add member:", error);
    return NextResponse.json({ error: "Failed to add member." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { groupId, userId } = await params;

  try {
    const result = await removeMemberFromGroup(groupId, session.user.id, userId);
    if (result === null) {
      return NextResponse.json({ error: "Forbidden, not found, or cannot remove yourself." }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to remove member:", error);
    return NextResponse.json({ error: "Failed to remove member." }, { status: 500 });
  }
}
