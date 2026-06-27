import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/user/become-coach
 *
 * Adds the "COACH" capability to the current user's roles.
 * Every user already has "ATHLETE"; after this call they have both.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true, role: true },
    });

    if (!current) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const roles =
      current.roles && current.roles.length > 0
        ? current.roles
        : current.role === "COACH"
        ? ["ATHLETE", "COACH"]
        : ["ATHLETE"];

    if (roles.includes("COACH")) {
      return NextResponse.json({ message: "Already a coach.", roles });
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        roles: [...roles, "COACH"],
        role: "COACH", // keep legacy field in sync
      },
      select: { id: true, role: true, roles: true },
    });

    return NextResponse.json({ message: "Coach capability added.", roles: updated.roles });
  } catch (error) {
    console.error("Failed to upgrade user to coach:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to upgrade role.", details: message },
      { status: 500 }
    );
  }
}
