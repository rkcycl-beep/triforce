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

async function safeGetActivitiesAfter(token: string, page: number, after: number) {
  try {
    return await getActivities(token, page, 100, after);
  } catch {
    return [];
  }
}

const RANGE_MONTHS: Record<string, number> = { "1m": 1, "2m": 2, "3m": 3, "1y": 12 };

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rangeKey = searchParams.get("range") ?? "3m";
  const months = RANGE_MONTHS[rangeKey] ?? 3;
  const after = Math.floor((Date.now() - months * 30 * 24 * 60 * 60 * 1000) / 1000);

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

    // Fetch activities for the selected time range
    const allActivities = [];
    for (let page = 1; page <= 20; page++) {
      const batch = await safeGetActivitiesAfter(accessToken, page, after);
      allActivities.push(...batch);
      if (batch.length < 100) break;
    }

    // Only look at activities that actually received kudos
    const withKudos = allActivities.filter((a) => a.kudos_count > 0);

    console.log(`[kudos] scanned=${allActivities.length} withKudos=${withKudos.length}`);

    // Strava's kudos endpoint returns { firstname, lastname } only — no id field.
    // Use full name as the deduplication key.
    const kudosMap = new Map<string, { name: string; count: number }>();
    let kudosErrors = 0;

    for (const activity of withKudos) {
      try {
        const kudos = await getActivityKudos(accessToken, activity.id, 1, 30);
        for (const k of kudos) {
          const name = `${k.firstname} ${k.lastname}`.trim();
          const existing = kudosMap.get(name);
          if (existing) {
            existing.count += 1;
          } else {
            kudosMap.set(name, { name, count: 1 });
          }
        }
      } catch (err) {
        kudosErrors++;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[kudos] activity=${activity.id} error:`, msg);
      }
    }

    console.log(`[kudos] scanned=${allActivities.length} withKudos=${withKudos.length} uniquePeople=${kudosMap.size} errors=${kudosErrors}`);

    const kudosFriends = Array.from(kudosMap.values())
      .sort((a, b) => b.count - a.count)
      .map((info) => ({
        name: info.name,
        count: info.count,
      }));

    return NextResponse.json({
      kudosFriends,
      scanned: allActivities.length,
      withKudos: withKudos.length,
      uniquePeople: kudosMap.size,
      errors: kudosErrors,
      range: rangeKey,
    });
  } catch (error) {
    console.error("strava-kudos error:", error);
    return NextResponse.json({ error: "Failed to load kudos friends." }, { status: 500 });
  }
}
