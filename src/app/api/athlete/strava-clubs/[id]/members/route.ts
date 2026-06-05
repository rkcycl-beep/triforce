/**
 * GET /api/athlete/strava-clubs/{id}/members — List members of a Strava club.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClubMembers } from "@/lib/strava";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const clubId = Number(id);
  if (!clubId || isNaN(clubId)) {
    return NextResponse.json({ error: "Invalid club ID." }, { status: 400 });
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

    const members = await getClubMembers(accessToken, clubId);

    // Cross-reference with TriForce users
    const stravaIds = members.map((m) => String(m.id));
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

    // Check who the current user follows
    const triForceUserIds = triForceUsers.map((u) => u.user.id);
    const follows = await prisma.follow.findMany({
      where: {
        followerId: session.user.id,
        followingId: { in: triForceUserIds },
      },
      select: { followingId: true },
    });
    const followingSet = new Set(follows.map((f) => f.followingId));

    const enriched = members.map((member) => {
      const triForceUser = triForceMap.get(String(member.id));
      return {
        stravaId: member.id,
        name: `${member.firstname} ${member.lastname}`.trim(),
        image: member.profile,
        isOnTriForce: !!triForceUser,
        triForceUserId: triForceUser?.id ?? null,
        triForceName: triForceUser?.name ?? null,
        triForceImage: triForceUser?.image ?? null,
        isFollowing: triForceUser ? followingSet.has(triForceUser.id) : false,
      };
    });

    return NextResponse.json({ members: enriched });
  } catch (error) {
    console.error("Failed to fetch club members:", error);
    return NextResponse.json({ error: "Failed to load club members." }, { status: 500 });
  }
}
