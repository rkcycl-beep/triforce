/**
 * GET /api/strava/activities/[id] — Fetch a single activity with full details.
 *
 * Returns detailed data including splits, laps, calories, and the full
 * polyline for drawing the route on a map.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActivityById } from "@/lib/strava";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const activity = await getActivityById(session.accessToken, id);
    return NextResponse.json({ activity });
  } catch (error) {
    console.error(`Failed to fetch activity ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch activity from Strava." },
      { status: 502 }
    );
  }
}
