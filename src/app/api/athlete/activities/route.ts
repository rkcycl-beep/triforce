/**
 * GET /api/athlete/activities — Read the signed-in user's activities from the DB.
 *
 * Replaces the live Strava proxy at /api/strava/activities. Data is populated
 * by the sign-in sync (see services/sync.service.ts) and, in Phase 1D, by
 * Strava webhooks.
 *
 * Query params:
 *   ?page=1       — Which page (default: 1)
 *   ?per_page=30  — How many per page (default: 30)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listActivitiesForUser } from "@/services/activity.service";
import { dbActivityToUnified } from "@/lib/normalizers";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const perPage = Math.max(1, Number(searchParams.get("per_page") ?? "30"));

  try {
    const rows = await listActivitiesForUser(session.user.id, {
      take: perPage,
      skip: (page - 1) * perPage,
    });
    const activities = rows.map(dbActivityToUnified);
    return NextResponse.json({ activities, page, perPage });
  } catch (error) {
    console.error("Failed to read activities from DB:", error);
    return NextResponse.json(
      { error: "Failed to load activities." },
      { status: 500 }
    );
  }
}
