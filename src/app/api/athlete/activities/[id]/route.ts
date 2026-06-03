/**
 * GET /api/athlete/activities/[id] — Read a single activity from the DB.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dbActivityToUnified } from "@/lib/normalizers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;

  try {
    // id may be a prefixed source id like "strava_123" or a raw CUID
    let activity;
    if (id.includes("_")) {
      const underscoreIndex = id.indexOf("_");
      const provider = id.slice(0, underscoreIndex);
      const providerActivityId = id.slice(underscoreIndex + 1);
      activity = await prisma.activity.findFirst({
        where: { provider, providerActivityId, userId: session.user.id },
      });
    } else {
      activity = await prisma.activity.findFirst({
        where: { id, userId: session.user.id },
      });
    }

    if (!activity) {
      return NextResponse.json({ error: "Activity not found." }, { status: 404 });
    }

    return NextResponse.json({ activity: dbActivityToUnified(activity) });
  } catch (error) {
    console.error("Failed to read activity from DB:", error);
    return NextResponse.json(
      { error: "Failed to load activity." },
      { status: 500 }
    );
  }
}
