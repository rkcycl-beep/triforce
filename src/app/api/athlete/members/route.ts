/**
 * GET /api/athlete/members — List all members of the athlete's group(s).
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
    // Find all groups this athlete belongs to
    const memberships = await prisma.groupMembership.findMany({
      where: { userId: session.user.id },
      select: { groupId: true },
    });

    const groupIds = memberships.map((m) => m.groupId);

    if (groupIds.length === 0) {
      return NextResponse.json({ members: [] });
    }

    // Get all members of those groups (excluding self)
    const members = await prisma.groupMembership.findMany({
      where: {
        groupId: { in: groupIds },
        userId: { not: session.user.id },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Deduplicate users (an athlete might be in multiple groups)
    const seen = new Set<string>();
    const uniqueMembers = members
      .map((m) => ({
        id: m.user.id,
        name: m.user.name,
        image: m.user.image,
        role: m.user.role,
        groupName: m.group.name,
      }))
      .filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });

    return NextResponse.json({ members: uniqueMembers });
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return NextResponse.json(
      { error: "Failed to load members." },
      { status: 500 }
    );
  }
}
