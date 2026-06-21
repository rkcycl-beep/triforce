/**
 * GET  /api/athlete/mutual-friends          — reads persisted results from DB (fast, no Strava calls)
 * GET  /api/athlete/mutual-friends?refresh=1 — scans Strava clubs, persists results, returns fresh data
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getAccessToken(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "strava" },
    select: { providerAccountId: true, access_token: true, refresh_token: true, expires_at: true },
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

function toRow(c: {
  id: string; name: string; kudosCount: number; latestKudosAt: Date;
  isChosen: boolean; mutualClubs: string[]; triforceUserId: string | null; scannedAt: Date;
}) {
  return {
    id: c.id,
    name: c.name,
    kudosCount: c.kudosCount,
    latestKudosAt: c.latestKudosAt.toISOString(),
    isChosen: c.isChosen,
    clubs: c.mutualClubs,
    triforceUserId: c.triforceUserId,
    lastScan: c.scannedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const refresh = new URL(request.url).searchParams.get("refresh") === "1";

  // Fast path — just read from DB
  if (!refresh) {
    const contacts = await prisma.stravaContact.findMany({
      where: { userId: session.user.id, isMutual: true },
      orderBy: { kudosCount: "desc" },
    });
    return NextResponse.json({
      mutual: contacts.map(toRow),
      totalClubMembers: null,
      totalClusters: null,
      fromCache: true,
    });
  }

  // Slow path — scan Strava clubs, persist results
  try {
    const accessToken = await getAccessToken(session.user.id);

    const clubsRes = await fetch(
      "https://www.strava.com/api/v3/athlete/clubs?per_page=30",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!clubsRes.ok) throw new Error("Failed to fetch clubs");
    const clubs = await clubsRes.json() as Array<{ id: number; name: string }>;

    // Collect all member names → which clubs they appear in
    const clubsByMember: Record<string, string[]> = {};
    for (const club of clubs) {
      for (let page = 1; page <= 3; page++) {
        const res = await fetch(
          `https://www.strava.com/api/v3/clubs/${club.id}/members?per_page=200&page=${page}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) break;
        const members = await res.json() as Array<{ firstname?: string; lastname?: string }>;
        for (const m of members) {
          const name = `${m.firstname ?? ""} ${m.lastname ?? ""}`.trim();
          if (!name) continue;
          if (!clubsByMember[name]) clubsByMember[name] = [];
          clubsByMember[name].push(club.name);
        }
        if (members.length < 200) break;
      }
    }

    const clubMemberNames = new Set(Object.keys(clubsByMember));

    // Update all existing StravaContacts: set isMutual + mutualClubs
    const allContacts = await prisma.stravaContact.findMany({
      where: { userId: session.user.id },
    });

    await Promise.all(
      allContacts.map((c) => {
        const isMutual = clubMemberNames.has(c.name);
        return prisma.stravaContact.update({
          where: { id: c.id },
          data: {
            isMutual,
            mutualClubs: isMutual ? clubsByMember[c.name] : [],
          },
        });
      })
    );

    const mutualContacts = await prisma.stravaContact.findMany({
      where: { userId: session.user.id, isMutual: true },
      orderBy: { kudosCount: "desc" },
    });

    return NextResponse.json({
      mutual: mutualContacts.map(toRow),
      totalClubMembers: clubMemberNames.size,
      totalClusters: clubs.length,
      fromCache: false,
    });
  } catch (error) {
    console.error("mutual-friends error:", error);
    return NextResponse.json({ error: "Failed to scan clubs." }, { status: 500 });
  }
}
