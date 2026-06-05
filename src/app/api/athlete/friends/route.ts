/**
 * GET /api/athlete/friends — List athletes the user follows on TriForce.
 *
 * Strava's API does NOT expose friends/followers list (endpoint removed ~2018).
 * Instead, we built an internal follow system within TriForce.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const following = await prisma.follow.findMany({
      where: { followerId: session.user.id },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const friends = following.map((f) => ({
      id: f.following.id,
      name: f.following.name,
      image: f.following.image,
      role: f.following.role,
      followedAt: f.createdAt,
    }));

    return NextResponse.json({ friends });
  } catch (error) {
    console.error("Failed to fetch friends:", error);
    return NextResponse.json(
      { error: "Failed to load friends." },
      { status: 500 }
    );
  }
}
