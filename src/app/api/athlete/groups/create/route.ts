/**
 * POST /api/athlete/groups/create — athlete creates a PEER group.
 * Body: { name: string }
 * Returns: { groupId, inviteCode }
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createPeerGroup } from "@/services/group.service";

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

  const { name } = body as { name?: unknown };
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Group name is required." }, { status: 400 });
  }
  if (name.trim().length > 60) {
    return NextResponse.json({ error: "Group name must be 60 characters or fewer." }, { status: 400 });
  }

  try {
    const group = await createPeerGroup(session.user.id, name);
    return NextResponse.json({ groupId: group.id, inviteCode: group.inviteCode });
  } catch (error) {
    console.error("Failed to create peer group:", error);
    return NextResponse.json({ error: "Failed to create group." }, { status: 500 });
  }
}
