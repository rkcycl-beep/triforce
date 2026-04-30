/**
 * GET /api/strava/athlete — Fetch the logged-in athlete's profile.
 *
 * Returns name, profile picture, location, etc.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAthlete } from "@/lib/strava";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Not authenticated. Please sign in with Strava." },
      { status: 401 }
    );
  }

  try {
    const athlete = await getAthlete(session.accessToken);
    return NextResponse.json({ athlete });
  } catch (error) {
    console.error("Failed to fetch Strava athlete:", error);
    return NextResponse.json(
      { error: "Failed to fetch athlete profile from Strava." },
      { status: 502 }
    );
  }
}
