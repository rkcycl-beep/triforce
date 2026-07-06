import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { userId } = await params;

  // Privacy: caller must be the user, follow them, or share a group.
  if (session.user.id !== userId) {
    const [follow, sharedGroup] = await Promise.all([
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: session.user.id, followingId: userId } },
      }),
      prisma.groupMembership.findFirst({
        where: { userId, group: { memberships: { some: { userId: session.user.id } } } },
      }),
    ]);
    if (!follow && !sharedGroup) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const [user, activities] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, image: true },
    }),
    prisma.activity.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        sportType: true,
        startDate: true,
        distance: true,
        movingTime: true,
        elevationGain: true,
        averageHeartrate: true,
        averageSpeed: true,
      },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user, activities });
}
