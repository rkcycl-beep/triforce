/**
 * POST /api/athlete/groups/join — join a group using a 6-char invite code.
 * Body: { inviteCode: string }
 * Returns: 200 with { groupId, groupName }; 404 if code unknown.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { joinGroupByCode } from "@/services/group.service";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { inviteCode } = body as { inviteCode?: unknown };
  if (typeof inviteCode !== "string" || inviteCode.trim().length === 0) {
    return NextResponse.json({ error: "Invite code is required." }, { status: 400 });
  }

  const group = await joinGroupByCode(session.user.id, inviteCode);
  if (!group) {
    return NextResponse.json({ error: "Invalid invite code." }, { status: 404 });
  }

  return NextResponse.json({ groupId: group.id, groupName: group.name });
}
