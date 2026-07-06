import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { StravaAthleteStats } from "@/types/strava";

export interface CompareStats {
  totalDistance: number;
  totalActivities: number;
  totalElevation: number;
  totalTime: number;
  avgPace: number | null;
  longestActivity: number;
  fastestPace: number | null;
}

export interface CompareUser {
  id: string;
  name: string | null;
  image: string | null;
  stats: CompareStats;
}

export interface CompareResponse {
  me: CompareUser;
  friend: CompareUser;
  period: string;
  sportType: string;
  dataSource: "triforce" | "strava";
}

// ─── TriForce DB mode ───────────────────────────────────────────

function computeStats(activities: {
  distance: number;
  movingTime: number;
  elevationGain: number;
  averageSpeed: number;
}[]): CompareStats {
  if (activities.length === 0) {
    return { totalDistance: 0, totalActivities: 0, totalElevation: 0, totalTime: 0, avgPace: null, longestActivity: 0, fastestPace: null };
  }
  const totalDistance = activities.reduce((s, a) => s + a.distance, 0);
  const totalTime = activities.reduce((s, a) => s + a.movingTime, 0);
  const totalElevation = activities.reduce((s, a) => s + a.elevationGain, 0);
  const longestActivity = Math.max(...activities.map(a => a.distance));
  const avgPace = totalTime > 0 ? totalDistance / totalTime : null;
  const speeds = activities.map(a => a.averageSpeed).filter(s => s > 0);
  const fastestPace = speeds.length > 0 ? Math.max(...speeds) : null;
  return { totalDistance, totalActivities: activities.length, totalElevation, totalTime, avgPace, longestActivity, fastestPace };
}

// ─── Strava direct mode ─────────────────────────────────────────

async function getStravaToken(userId: string): Promise<string> {
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

async function fetchStravaStats(accessToken: string, athleteId: string): Promise<StravaAthleteStats | null> {
  const res = await fetch(`https://www.strava.com/api/v3/athletes/${athleteId}/stats`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<StravaAthleteStats>;
}

// Map period + sportType to the right Strava stats bucket
function stravaStatsToCompare(stats: StravaAthleteStats, period: string, sportType: string): CompareStats {
  const bucket = period === "all" ? "all" : period === "90d" ? "ytd" : "recent";
  const key = sportType === "ride" ? "ride" : sportType === "swim" ? "swim" : "run";

  const totals = stats[`${bucket}_${key}_totals` as keyof StravaAthleteStats] as {
    count: number; distance: number; moving_time: number; elevation_gain: number;
  } | undefined;

  if (!totals) return { totalDistance: 0, totalActivities: 0, totalElevation: 0, totalTime: 0, avgPace: null, longestActivity: 0, fastestPace: null };

  const avgPace = totals.moving_time > 0 ? totals.distance / totals.moving_time : null;
  return {
    totalDistance: totals.distance,
    totalActivities: totals.count,
    totalElevation: totals.elevation_gain,
    totalTime: totals.moving_time,
    avgPace,
    longestActivity: 0,   // not available in aggregate stats
    fastestPace: null,    // not available in aggregate stats
  };
}

// ─── Route ──────────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { contactId } = await params;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "30d";
  const sportType = searchParams.get("sportType") ?? "run";

  let contact = await prisma.stravaContact.findFirst({
    where: { id: contactId, userId: session.user.id },
    select: { triforceUserId: true, stravaAthleteId: true, name: true },
  });

  let friendUserId: string | null = contact?.triforceUserId ?? null;
  let friendName: string | null = contact?.name ?? null;
  let friendStravaAthleteId: string | null = contact?.stravaAthleteId ?? null;

  // If no StravaContact matches, treat contactId as a TriForce User ID.
  if (!contact) {
    const targetUser = await prisma.user.findUnique({
      where: { id: contactId },
      select: { id: true, name: true, image: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Privacy check: caller must follow target or share a group.
    const [follow, sharedGroup] = await Promise.all([
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: session.user.id, followingId: targetUser.id } },
      }),
      prisma.groupMembership.findFirst({
        where: { userId: targetUser.id, group: { memberships: { some: { userId: session.user.id } } } },
      }),
    ]);
    if (!follow && !sharedGroup) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    friendUserId = targetUser.id;
    friendName = targetUser.name;
  }

  // ── Mode A: both on TriForce — use DB activities (exact date filter) ──
  if (friendUserId) {
    const cutoff = period === "all" ? undefined : new Date(
      Date.now() - (period === "90d" ? 90 : 30) * 24 * 60 * 60 * 1000
    );
    const activityFilter = {
      sportType: sportType === "all" ? undefined : sportType,
      isDuplicate: false,
      ...(cutoff ? { startDate: { gte: cutoff } } : {}),
    };
    const sel = { id: true, name: true, sportType: true, startDate: true, distance: true, movingTime: true, elevationGain: true, averageSpeed: true };

    const [meUser, friendUser, myActivities, friendActivities] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, image: true } }),
      prisma.user.findUnique({ where: { id: friendUserId }, select: { id: true, name: true, image: true } }),
      prisma.activity.findMany({ where: { userId: session.user.id, ...activityFilter }, select: sel }),
      prisma.activity.findMany({ where: { userId: friendUserId }, select: sel }),
    ]);

    if (!meUser || !friendUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
      me: { ...meUser, stats: computeStats(myActivities) },
      friend: { ...friendUser, stats: computeStats(friendActivities) },
      period, sportType, dataSource: "triforce",
    } satisfies CompareResponse);
  }

  // ── Mode B: friend has Strava ID — pull stats directly from Strava API ──
  if (friendStravaAthleteId) {
    const myAccount = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "strava" },
      select: { providerAccountId: true },
    });
    const myUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, image: true },
    });

    try {
      const accessToken = await getStravaToken(session.user.id);
      const [myStats, friendStats] = await Promise.all([
        fetchStravaStats(accessToken, myAccount!.providerAccountId),
        fetchStravaStats(accessToken, friendStravaAthleteId),
      ]);

      if (!myStats) return NextResponse.json({ error: "Could not load your Strava stats" }, { status: 500 });

      return NextResponse.json({
        me: {
          id: session.user.id,
          name: myUser?.name ?? null,
          image: myUser?.image ?? null,
          stats: stravaStatsToCompare(myStats, period, sportType),
        },
        friend: {
          id: friendStravaAthleteId,
          name: friendName,
          image: null,
          stats: friendStats ? stravaStatsToCompare(friendStats, period, sportType) : { totalDistance: 0, totalActivities: 0, totalElevation: 0, totalTime: 0, avgPace: null, longestActivity: 0, fastestPace: null },
        },
        period, sportType, dataSource: "strava",
      } satisfies CompareResponse);
    } catch (err) {
      console.error("Strava direct compare error:", err);
      return NextResponse.json({ error: "Failed to load Strava data" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Friend not on TriForce and no Strava ID available. Run club scan first." }, { status: 404 });
}
