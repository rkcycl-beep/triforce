/**
 * GET /api/athlete/strava-following
 *
 * Scans all Strava clubs the athlete belongs to and collects every member.
 * Club members are the only Strava social data that includes athlete IDs,
 * which lets us do exact TriForce user matching (no name guessing).
 *
 * Strava removed /athlete/following, /athlete/followers, /athlete/friends
 * and /activities/following from their public API. Club members are the
 * best available substitute.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAthleteClubs, getClubMembers } from "@/lib/strava";

async function getAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "strava" },
    select: { access_token: true, refresh_token: true, expires_at: true, providerAccountId: true },
  });
  if (!account?.access_token) throw new Error("Strava not connected");

  if (account.expires_at && Date.now() >= account.expires_at * 1000) {
    const res = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error("Token refresh failed");
    await prisma.account.update({
      where: { provider_providerAccountId: { provider: "strava", providerAccountId: account.providerAccountId } },
      data: { access_token: data.access_token, refresh_token: data.refresh_token ?? account.refresh_token, expires_at: data.expires_at },
    });
    return data.access_token as string;
  }
  return account.access_token;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const accessToken = await getAccessToken(session.user.id);

    // Step 1: get all clubs
    const clubs = await getAthleteClubs(accessToken, 1, 30);
    if (clubs.length === 0) {
      return NextResponse.json({ following: [], matched: 0, total: 0, clubs: 0 });
    }

    // Step 2: collect all members across all clubs (unique by Strava athlete ID)
    const athleteMap = new Map<number, { stravaId: number; name: string; image: string; stravaAthleteId: string }>();

    for (const club of clubs) {
      let page = 1;
      while (true) {
        const members = await getClubMembers(accessToken, club.id, page, 200);
        for (const m of members) {
          if (!athleteMap.has(m.id)) {
            athleteMap.set(m.id, {
              stravaId: m.id,
              name: `${m.firstname} ${m.lastname}`.trim(),
              image: m.profile_medium || m.profile || "",
              stravaAthleteId: String(m.id),
            });
          }
        }
        if (members.length < 200) break;
        page++;
      }
    }

    // Remove self from the list
    const myAccount = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "strava" },
      select: { providerAccountId: true },
    });
    if (myAccount) athleteMap.delete(Number(myAccount.providerAccountId));

    if (athleteMap.size === 0) {
      return NextResponse.json({ following: [], matched: 0, total: 0, clubs: clubs.length });
    }

    // Step 3: exact TriForce matching via Strava athlete ID → Account table
    const stravaIds = Array.from(athleteMap.keys()).map(String);
    const triforceAccounts = await prisma.account.findMany({
      where: { provider: "strava", providerAccountId: { in: stravaIds } },
      select: { providerAccountId: true, userId: true },
    });
    const stravaToTriforce = new Map(triforceAccounts.map(a => [a.providerAccountId, a.userId]));

    // Step 4: upsert into StravaContact so they appear in compare hub
    const now = new Date();
    for (const athlete of athleteMap.values()) {
      const triforceUserId = stravaToTriforce.get(String(athlete.stravaId)) ?? null;
      await prisma.stravaContact.upsert({
        where: { userId_name: { userId: session.user.id, name: athlete.name } },
        create: {
          userId: session.user.id,
          name: athlete.name,
          kudosCount: 0,
          latestKudosAt: now,
          scannedAt: now,
          triforceUserId,
          stravaAthleteId: athlete.stravaAthleteId,
        },
        update: {
          triforceUserId,
          stravaAthleteId: athlete.stravaAthleteId,
          scannedAt: now,
        },
      });
    }

    return NextResponse.json({
      following: Array.from(athleteMap.values()).map(a => ({
        ...a,
        triforceUserId: stravaToTriforce.get(String(a.stravaId)) ?? null,
      })),
      matched: triforceAccounts.length,
      total: athleteMap.size,
      clubs: clubs.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("429")) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    console.error("strava-following error:", error);
    return NextResponse.json({ error: "Failed to scan Strava clubs" }, { status: 500 });
  }
}
