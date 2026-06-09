import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const RANGE_MONTHS: Record<string, number> = { "1m": 1, "2m": 2, "3m": 3, "1y": 12 };

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rangeKey = searchParams.get("range") ?? "1m";
  const months = RANGE_MONTHS[rangeKey] ?? 1;
  const since = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;

  const follows = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });
  const friendIds = follows.map((f) => f.followingId);

  if (friendIds.length === 0) {
    return NextResponse.json({ activities: [], hasMore: false, total: 0 });
  }

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where: { userId: { in: friendIds }, startDate: { gte: since } },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { startDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.activity.count({
      where: { userId: { in: friendIds }, startDate: { gte: since } },
    }),
  ]);

  return NextResponse.json({ activities, hasMore: page * limit < total, total });
}
