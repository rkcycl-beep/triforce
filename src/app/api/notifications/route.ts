/**
 * Notifications API.
 *
 * GET  /api/notifications — list my notifications
 * PATCH /api/notifications — mark all as read
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUnreadNotifications,
  markAllNotificationsRead,
} from "@/services/challenge.service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const notifications = await getUnreadNotifications(session.user.id);
    return NextResponse.json(notifications);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    await markAllNotificationsRead(session.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to mark notifications read";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
