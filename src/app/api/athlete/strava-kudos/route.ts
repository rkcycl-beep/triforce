import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActivities, getActivityKudos } from "@/lib/strava";

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

// GET — returns contacts from DB. Pass ?refresh=1 to re-scan Strava.
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const refresh = new URL(request.url).searchParams.get("refresh") === "1";

  // Always read from DB first. Only scan Strava when ?refresh=1 is explicit.
  // Auto-scanning on every empty-DB visit burns through Strava's 100 req/15min limit.
  if (!refresh) {
    const contacts = await prisma.stravaContact.findMany({
      where: { userId: session.user.id },
      orderBy: { kudosCount: "desc" },
    });
    const lastSync = contacts.length > 0
      ? contacts.reduce((latest, c) => c.scannedAt > latest ? c.scannedAt : latest, contacts[0].scannedAt)
      : null;
    return NextResponse.json({
      kudosFriends: contacts.map((c) => ({
        id: c.id,
        name: c.name,
        count: c.kudosCount,
        latestDate: c.latestKudosAt.toISOString(),
        isChosen: c.isChosen,
      })),
      scanned: null,
      withKudos: null,
      uniquePeople: contacts.length,
      errors: 0,
      fromCache: true,
      lastSync: lastSync?.toISOString() ?? null,
    });
  }

  // Scan Strava and save to DB
  try {
    const accessToken = await getAccessToken(session.user.id);
    const after = Math.floor((Date.now() - 3 * 30 * 24 * 60 * 60 * 1000) / 1000);

    const allActivities: Array<{ id: number; kudos_count: number; start_date: string }> = [];
    for (let page = 1; page <= 10; page++) {
      try {
        const batch = await getActivities(accessToken, page, 100, after);
        allActivities.push(...batch);
        if (batch.length < 100) break;
      } catch { break; }
    }

    // Sort by kudos count descending, take top 30 — most-liked activities have most unique friends.
    // 30 kudos calls + ~2 activity pages = ~32 total, safely under Strava's 100 req/15min limit.
    const withKudos = allActivities
      .filter((a) => a.kudos_count > 0)
      .sort((a, b) => b.kudos_count - a.kudos_count)
      .slice(0, 30);

    const kudosMap = new Map<string, { name: string; count: number; latestDate: string }>();
    let kudosErrors = 0;

    for (const activity of withKudos) {
      try {
        const kudos = await getActivityKudos(accessToken, activity.id, 1, 30);
        for (const k of kudos) {
          const name = `${k.firstname} ${k.lastname}`.trim();
          const existing = kudosMap.get(name);
          if (existing) {
            existing.count += 1;
            if (activity.start_date > existing.latestDate) existing.latestDate = activity.start_date;
          } else {
            kudosMap.set(name, { name, count: 1, latestDate: activity.start_date });
          }
        }
      } catch {
        kudosErrors++;
      }
    }

    // Upsert all contacts to DB
    for (const contact of kudosMap.values()) {
      await prisma.stravaContact.upsert({
        where: { userId_name: { userId: session.user.id, name: contact.name } },
        create: {
          userId: session.user.id,
          name: contact.name,
          kudosCount: contact.count,
          latestKudosAt: new Date(contact.latestDate),
          scannedAt: new Date(),
        },
        update: {
          kudosCount: contact.count,
          latestKudosAt: new Date(contact.latestDate),
          scannedAt: new Date(),
        },
      });
    }

    const kudosFriends = Array.from(kudosMap.values())
      .sort((a, b) => b.count - a.count)
      .map((c) => ({ name: c.name, count: c.count, latestDate: c.latestDate }));

    return NextResponse.json({
      kudosFriends,
      scanned: allActivities.length,
      withKudos: withKudos.length,
      uniquePeople: kudosMap.size,
      errors: kudosErrors,
      fromCache: false,
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    console.error("strava-kudos error:", error);
    return NextResponse.json({ error: "Failed to scan Strava." }, { status: 500 });
  }
}
