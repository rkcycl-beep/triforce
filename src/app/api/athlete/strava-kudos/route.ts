import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActivities, getActivityKudos } from "@/lib/strava";

async function refreshStravaAccessToken(account: {
  providerAccountId: string;
  refresh_token: string | null;
}) {
  if (!account.refresh_token) throw new Error("No refresh token");
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
  if (!res.ok) throw new Error(data.message || "Refresh failed");
  await prisma.account.update({
    where: {
      provider_providerAccountId: {
        provider: "strava",
        providerAccountId: account.providerAccountId,
      },
    },
    data: {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? account.refresh_token,
      expires_at: data.expires_at,
    },
  });
  return data.access_token as string;
}

// Always scan the last 3 months — enough to cover all range options except 1y.
// Filtering by range happens client-side to avoid multiple Strava API calls.
const SCAN_MONTHS = 3;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "strava" },
      select: {
        providerAccountId: true,
        access_token: true,
        refresh_token: true,
        expires_at: true,
      },
    });

    if (!account?.access_token) {
      return NextResponse.json({ error: "Strava not connected." }, { status: 400 });
    }

    let accessToken = account.access_token;
    if (account.expires_at && Date.now() >= account.expires_at * 1000) {
      accessToken = await refreshStravaAccessToken(account);
    }

    const after = Math.floor((Date.now() - SCAN_MONTHS * 30 * 24 * 60 * 60 * 1000) / 1000);

    // Fetch activities — stop when a batch is short (no more pages) or page > 10
    const allActivities: Array<{ id: number; kudos_count: number; start_date: string }> = [];
    for (let page = 1; page <= 10; page++) {
      try {
        const batch = await getActivities(accessToken, page, 100, after);
        allActivities.push(...batch);
        if (batch.length < 100) break;
      } catch {
        break;
      }
    }

    // Cap at 80 to stay within Strava's 100 req/15min limit
    // (activity list uses ~2 calls, leaving 98 for kudos)
    const withKudos = allActivities.filter((a) => a.kudos_count > 0).slice(0, 80);
    console.log(`[kudos] scanned=${allActivities.length} withKudos=${withKudos.length}`);

    // name → { name, count, latestDate }
    // latestDate = the most recent activity date where this person gave a kudos
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
            if (activity.start_date > existing.latestDate) {
              existing.latestDate = activity.start_date;
            }
          } else {
            kudosMap.set(name, { name, count: 1, latestDate: activity.start_date });
          }
        }
      } catch (err) {
        kudosErrors++;
        console.error(`[kudos] activity=${activity.id}:`, err instanceof Error ? err.message : err);
      }
    }

    console.log(`[kudos] uniquePeople=${kudosMap.size} errors=${kudosErrors}`);

    const kudosFriends = Array.from(kudosMap.values())
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      kudosFriends,
      scanned: allActivities.length,
      withKudos: withKudos.length,
      uniquePeople: kudosMap.size,
      errors: kudosErrors,
    });
  } catch (error) {
    console.error("strava-kudos error:", error);
    return NextResponse.json({ error: "Failed to load kudos friends." }, { status: 500 });
  }
}
