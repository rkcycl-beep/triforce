/**
 * PATCH /api/notifications/[id]/read — mark a single notification as read
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markNotificationRead } from "@/services/challenge.service";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const notification = await markNotificationRead(session.user.id, id);
    return NextResponse.json(notification);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to mark notification read";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
