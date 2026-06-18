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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const accessToken = await getAccessToken(session.user.id);

    // Step 1 — get all user's clubs
    const clubsRes = await fetch(
      "https://www.strava.com/api/v3/athlete/clubs?per_page=30",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!clubsRes.ok) throw new Error("Failed to fetch clubs");
    const clubs = await clubsRes.json() as Array<{ id: number; name: string }>;

    // Step 2 — collect all member names from all clubs
    const clubMemberNames = new Set<string>();
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
          clubMemberNames.add(name);
          if (!clubsByMember[name]) clubsByMember[name] = [];
          clubsByMember[name].push(club.name);
        }
        if (members.length < 200) break;
      }
    }

    // Step 3 — cross-reference with StravaContacts (people who gave kudos)
    const contacts = await prisma.stravaContact.findMany({
      where: { userId: session.user.id },
      orderBy: { kudosCount: "desc" },
    });

    const mutual = contacts
      .filter((c) => clubMemberNames.has(c.name))
      .map((c) => ({
        id: c.id,
        name: c.name,
        kudosCount: c.kudosCount,
        latestKudosAt: c.latestKudosAt.toISOString(),
        isChosen: c.isChosen,
        clubs: clubsByMember[c.name] ?? [],
        triforceUserId: c.triforceUserId,
      }));

    return NextResponse.json({
      mutual,
      totalClubMembers: clubMemberNames.size,
      totalClusters: clubs.length,
    });
  } catch (error) {
    console.error("mutual-friends error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
