/**
 * POST /api/athlete/sync — Manually trigger Strava activity sync.
 *
 * Fetches latest activities from Strava, upserts to DB, and updates
 * the user's lastStravaSync timestamp.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncStravaActivitiesForUser } from "@/services/sync.service";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.accessToken) {
    return NextResponse.json({ error: "Not authenticated or no Strava token." }, { status: 401 });
  }

  try {
    // months = 0 → no date limit, fetches full history
    const result = await syncStravaActivitiesForUser(
      session.user.id,
      session.accessToken,
      0
    );
    return NextResponse.json({ success: true, synced: result.synced });
  } catch (error) {
    console.error("Manual sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed. Try reconnecting Strava." },
      { status: 500 }
    );
  }
}
