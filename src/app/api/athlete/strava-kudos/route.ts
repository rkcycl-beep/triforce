/**
 * GET /api/athlete/strava-kudos — Find friends through activity kudos.
 *
 * Fetches recent activities, then gets kudos (likes) on each activity.
 * People who kudos your activities are likely your friends.
 */

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

    // Fetch recent activities (last 10)
    const activities = await getActivities(accessToken, 1, 10);

    // Get kudos for each activity
    const kudosMap = new Map<number, { name: string; image: string }>();
    for (const activity of activities.slice(0, 5)) {
      try {
        const kudos = await getActivityKudos(accessToken, activity.id, 1, 30);
        for (const k of kudos) {
          if (!kudosMap.has(k.id)) {
            kudosMap.set(k.id, {
              name: `${k.firstname} ${k.lastname}`.trim(),
              image: k.profile,
            });
          }
        }
      } catch {
        // Skip activities where kudos fetch fails
      }
    }

    // Cross-reference with TriForce users
    const stravaIds = Array.from(kudosMap.keys()).map((id) => String(id));
    if (stravaIds.length === 0) {
      return NextResponse.json({ kudosFriends: [] });
    }

    const triForceUsers = await prisma.account.findMany({
      where: {
        provider: "strava",
        providerAccountId: { in: stravaIds },
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });
    const triForceMap = new Map(triForceUsers.map((u) => [u.providerAccountId, u.user]));

    // Check follows
    const triForceUserIds = triForceUsers.map((u) => u.user.id);
    const follows = await prisma.follow.findMany({
      where: {
        followerId: session.user.id,
        followingId: { in: triForceUserIds },
      },
      select: { followingId: true },
    });
    const followingSet = new Set(follows.map((f) => f.followingId));

    const kudosFriends = Array.from(kudosMap.entries()).map(([stravaId, info]) => {
      const triForceUser = triForceMap.get(String(stravaId));
      return {
        stravaId,
        name: info.name,
        image: info.image,
        isOnTriForce: !!triForceUser,
        triForceUserId: triForceUser?.id ?? null,
        triForceName: triForceUser?.name ?? null,
        triForceImage: triForceUser?.image ?? null,
        isFollowing: triForceUser ? followingSet.has(triForceUser.id) : false,
      };
    });

    return NextResponse.json({ kudosFriends });
  } catch (error) {
    console.error("Failed to fetch kudos friends:", error);
    return NextResponse.json({ error: "Failed to load kudos friends." }, { status: 500 });
  }
}
