/**
 * GET /api/athlete/groups — List groups the athlete belongs to.
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
    const memberships = await prisma.groupMembership.findMany({
      where: { userId: session.user.id },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            inviteCode: true,
          },
        },
      },
    });

    const groups = memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      inviteCode: m.group.inviteCode,
    }));

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    return NextResponse.json(
      { error: "Failed to load groups." },
      { status: 500 }
    );
  }
}
