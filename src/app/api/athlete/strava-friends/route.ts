import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActivities, getActivityKudos } from "@/lib/strava";

async function getAccessToken(userId: string): Promise<string> {
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
    return data.access_token;
  }

  return account.access_token;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const token = await getAccessToken(session.user.id);

    // Fetch all activities from the last 3 months
    const threeMonthsAgo = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);
    const activities = [];
    for (let page = 1; page <= 20; page++) {
      try {
        const batch = await getActivities(token, page, 100, threeMonthsAgo);
        activities.push(...batch);
        if (batch.length < 100) break; // no more pages
      } catch {
        break;
      }
    }

    // Only activities with kudos
    const withKudos = activities.filter((a) => a.kudos_count > 0);

    // Collect kudos givers — count how many times each person liked
    const peopleMap = new Map<number, { name: string; image: string; count: number }>();

    for (let i = 0; i < withKudos.length; i += 3) {
      const batch = withKudos.slice(i, i + 3);
      await Promise.all(
        batch.map(async (activity) => {
          try {
            const kudos = await getActivityKudos(token, activity.id, 1, 30);
            for (const k of kudos) {
              const existing = peopleMap.get(k.id);
              if (existing) {
                existing.count += 1;
              } else {
                peopleMap.set(k.id, {
                  name: `${k.firstname} ${k.lastname}`.trim(),
                  image: k.profile_medium || k.profile,
                  count: 1,
                });
              }
            }
          } catch {
            // skip
          }
        })
      );
    }

    // Sort by kudos count descending (most frequent givers first)
    const friends = Array.from(peopleMap.entries())
      .map(([stravaId, info]) => ({ stravaId, ...info }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      friends,
      scanned: activities.length,
      withKudos: withKudos.length,
    });
  } catch (error) {
    console.error("[strava-friends]", error);
    return NextResponse.json({ error: "Failed to load friends" }, { status: 500 });
  }
}
