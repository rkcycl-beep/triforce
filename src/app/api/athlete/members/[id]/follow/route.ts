/**
 * POST /api/athlete/members/[id]/follow — Toggle follow/unfollow another group member.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: targetUserId } = await params;
  const followerId = session.user.id;

  if (followerId === targetUserId) {
    return NextResponse.json(
      { error: "Cannot follow yourself." },
      { status: 400 }
    );
  }

  try {
    // Check if already following
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUserId,
        },
      },
    });

    if (existing) {
      // Unfollow
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId: targetUserId,
          },
        },
      });
      return NextResponse.json({ following: false });
    }

    // Follow
    await prisma.follow.create({
      data: {
        followerId,
        followingId: targetUserId,
      },
    });
    return NextResponse.json({ following: true });
  } catch (error) {
    console.error("Follow toggle failed:", error);
    return NextResponse.json(
      { error: "Failed to update follow status." },
      { status: 500 }
    );
  }
}
