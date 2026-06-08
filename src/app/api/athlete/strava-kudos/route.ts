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

async function safeGetActivities(token: string, page: number) {
  try {
    return await getActivities(token, page, 25);
  } catch {
    return [];
  }
}

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

    // Fetch up to 8 pages (200 activities) — stop early if a page comes back short
    const allActivities = [];
    for (let page = 1; page <= 8; page++) {
      const batch = await safeGetActivities(accessToken, page);
      allActivities.push(...batch);
      if (batch.length < 25) break;
    }

    // Only look at activities that actually received kudos
    const withKudos = allActivities.filter((a) => a.kudos_count > 0);

    console.log(`[kudos] scanned=${allActivities.length} withKudos=${withKudos.length}`);

    // Fetch kudos one activity at a time — fully sequential, no rate limit risk
    const kudosMap = new Map<number, { name: string; image: string }>();
    let kudosErrors = 0;
    const perActivityLog: { id: number; kudos_count: number; returned: number; error?: string }[] = [];

    for (const activity of withKudos) {
      try {
        const kudos = await getActivityKudos(accessToken, activity.id, 1, 30);
        perActivityLog.push({ id: activity.id, kudos_count: activity.kudos_count, returned: kudos.length });
        for (const k of kudos) {
          if (!kudosMap.has(k.id)) {
            kudosMap.set(k.id, {
              name: `${k.firstname} ${k.lastname}`.trim(),
              image: k.profile,
            });
          }
        }
      } catch (err) {
        kudosErrors++;
        const msg = err instanceof Error ? err.message : String(err);
        perActivityLog.push({ id: activity.id, kudos_count: activity.kudos_count, returned: 0, error: msg });
        console.error(`[kudos] activity=${activity.id} error:`, msg);
      }
    }

    console.log(`[kudos] scanned=${allActivities.length} withKudos=${withKudos.length} uniquePeople=${kudosMap.size} errors=${kudosErrors}`);
    console.log("[kudos] per-activity:", JSON.stringify(perActivityLog));

    if (kudosMap.size === 0) {
      return NextResponse.json({
        kudosFriends: [],
        scanned: allActivities.length,
        withKudos: withKudos.length,
        uniquePeople: 0,
        errors: kudosErrors,
        debug: perActivityLog,
      });
    }

    // Cross-reference with TriForce users
    const stravaIds = Array.from(kudosMap.keys()).map(String);
    const triForceUsers = await prisma.account.findMany({
      where: { provider: "strava", providerAccountId: { in: stravaIds } },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
    const triForceMap = new Map(triForceUsers.map((u) => [u.providerAccountId, u.user]));

    const triForceUserIds = triForceUsers.map((u) => u.user.id);
    const follows = await prisma.follow.findMany({
      where: { followerId: session.user.id, followingId: { in: triForceUserIds } },
      select: { followingId: true },
    });
    const followingSet = new Set(follows.map((f) => f.followingId));

    const kudosFriends = Array.from(kudosMap.entries())
      .map(([stravaId, info]) => {
        const tf = triForceMap.get(String(stravaId));
        return {
          stravaId,
          name: info.name,
          image: info.image,
          isOnTriForce: !!tf,
          triForceUserId: tf?.id ?? null,
          triForceName: tf?.name ?? null,
          triForceImage: tf?.image ?? null,
          isFollowing: tf ? followingSet.has(tf.id) : false,
        };
      })
      .sort((a, b) => (b.isOnTriForce ? 1 : 0) - (a.isOnTriForce ? 1 : 0));

    return NextResponse.json({
      kudosFriends,
      scanned: allActivities.length,
      withKudos: withKudos.length,
      uniquePeople: kudosMap.size,
      errors: kudosErrors,
      debug: perActivityLog,
    });
  } catch (error) {
    console.error("strava-kudos error:", error);
    return NextResponse.json({ error: "Failed to load kudos friends." }, { status: 500 });
  }
}
