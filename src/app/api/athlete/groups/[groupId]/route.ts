/**
 * GET /api/athlete/groups/[groupId]
 * Returns group detail. Non-members get basic info (name, type, count).
 * Members get the full member list. Owners also get the invite code.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGroupDetail } from "@/services/group.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { groupId } = await params;

  try {
    const group = await getGroupDetail(groupId, session.user.id);
    if (!group) {
      return NextResponse.json({ error: "Group not found." }, { status: 404 });
    }
    return NextResponse.json({ group });
  } catch (error) {
    console.error("Failed to fetch group detail:", error);
    return NextResponse.json({ error: "Failed to load group." }, { status: 500 });
  }
}
