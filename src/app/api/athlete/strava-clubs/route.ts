/**
 * GET /api/athlete/strava-clubs — List Strava clubs the athlete belongs to.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAthleteClubs } from "@/lib/strava";

async function refreshStravaAccessToken(account: {
  providerAccountId: string;
  refresh_token: string | null;
}) {
  if (!account.refresh_token) throw new Error("No refresh token");
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Refresh failed");
  await prisma.account.update({
    where: {
      provider_providerAccountId: { provider: "strava", providerAccountId: account.providerAccountId },
    },
    data: {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? account.refresh_token,
      expires_at: data.expires_at,
    },
  });
  return data.access_token as string;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "strava" },
      select: { providerAccountId: true, access_token: true, refresh_token: true, expires_at: true },
    });

    if (!account || !account.access_token) {
      return NextResponse.json({ error: "Strava not connected." }, { status: 400 });
    }

    let accessToken = account.access_token;
    if (account.expires_at && Date.now() >= account.expires_at * 1000) {
      accessToken = await refreshStravaAccessToken(account);
    }

    const clubs = await getAthleteClubs(accessToken);
    return NextResponse.json({ clubs });
  } catch (error) {
    console.error("Failed to fetch Strava clubs:", error);
    return NextResponse.json({ error: "Failed to load clubs." }, { status: 500 });
  }
}
