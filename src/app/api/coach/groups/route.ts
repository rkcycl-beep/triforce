/**
 * POST /api/coach/groups — create a new group for the signed-in coach.
 * Body: { name: string }
 * Returns: 201 with the created Group; 400 on bad input; 403 if not a coach.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createGroup, getGroupsByCoach } from "@/services/group.service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!session.user.roles?.includes("COACH")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const groups = await getGroupsByCoach(session.user.id);
    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Failed to fetch coach groups:", error);
    return NextResponse.json({ error: "Failed to load groups." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!session.user.roles?.includes("COACH")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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
  if (name.trim().length > 80) {
    return NextResponse.json(
      { error: "Group name must be under 80 characters." },
      { status: 400 }
    );
  }

  const group = await createGroup(session.user.id, { name });
  return NextResponse.json(group, { status: 201 });
}
