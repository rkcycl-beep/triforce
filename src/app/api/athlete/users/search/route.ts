/**
 * GET /api/athlete/users/search?q={name} — Search TriForce users by name.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  try {
    // Search users by name (case-insensitive), excluding self
    const users = await prisma.user.findMany({
      where: {
        id: { not: session.user.id },
        name: { contains: q, mode: "insensitive" },
      },
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
      },
      take: 20,
      orderBy: { name: "asc" },
    });

    // Check which ones the current user already follows
    const userIds = users.map((u) => u.id);
    const follows = await prisma.follow.findMany({
      where: {
        followerId: session.user.id,
        followingId: { in: userIds },
      },
      select: { followingId: true },
    });
    const followingSet = new Set(follows.map((f) => f.followingId));

    const results = users.map((u) => ({
      id: u.id,
      name: u.name,
      image: u.image,
      role: u.role,
      isFollowing: followingSet.has(u.id),
    }));

    return NextResponse.json({ users: results });
  } catch (error) {
    console.error("User search failed:", error);
    return NextResponse.json(
      { error: "Search failed." },
      { status: 500 }
    );
  }
}
