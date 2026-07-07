/**
 * DELETE /api/athlete/metrics/[id] — delete one of the current athlete's metrics.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const metric = await prisma.userMetric.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!metric) {
      return NextResponse.json({ error: "Metric not found." }, { status: 404 });
    }

    if (metric.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    await prisma.userMetric.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete metric";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
