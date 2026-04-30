/**
 * GET /api/strava/activities — Fetch the user's Strava activities.
 *
 * The browser calls this → we call Strava → return normalized data.
 * This keeps the Strava access token on the server (never sent to browser).
 *
 * Query params:
 *   ?page=1    — Which page (default: 1)
 *   ?per_page=30 — How many per page (default: 30, max: 200)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActivities } from "@/lib/strava";
import { normalizeStravaActivities } from "@/lib/normalizers";

export async function GET(request: NextRequest) {
  // Check if the user is logged in
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Not authenticated. Please sign in with Strava." },
      { status: 401 }
    );
  }

  // Read query parameters
  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") ?? "1");
  const perPage = Number(searchParams.get("per_page") ?? "30");

  try {
    const stravaActivities = await getActivities(
      session.accessToken,
      page,
      perPage
    );

    // Convert to our unified format before sending to the browser
    const activities = normalizeStravaActivities(stravaActivities);

    return NextResponse.json({ activities, page, perPage });
  } catch (error) {
    console.error("Failed to fetch Strava activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities from Strava." },
      { status: 502 }
    );
  }
}
