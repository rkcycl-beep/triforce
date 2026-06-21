/**
 * GET /api/groups — all groups in the system, annotated with caller's membership status.
 * Any authenticated user can call this.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllGroups } from "@/services/group.service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const groups = await getAllGroups(session.user.id);
    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Failed to fetch all groups:", error);
    return NextResponse.json({ error: "Failed to load groups." }, { status: 500 });
  }
}
