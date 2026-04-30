/**
 * GET /api/strava/stats — Fetch the athlete's stats from Strava.
 *
 * Returns lifetime totals, year-to-date totals, and recent totals
 * for runs, rides, and swims.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAthleteStats } from "@/lib/strava";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session?.athleteId) {
    return NextResponse.json(
      { error: "Not authenticated. Please sign in with Strava." },
      { status: 401 }
    );
  }

  try {
    const stats = await getAthleteStats(
      session.accessToken,
      session.athleteId
    );

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Failed to fetch Strava stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats from Strava." },
      { status: 502 }
    );
  }
}
