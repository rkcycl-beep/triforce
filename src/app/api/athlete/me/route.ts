/**
 * GET /api/athlete/me — Returns current athlete's profile data.
 * PUT /api/athlete/me — Updates current athlete's profile data.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, lastStravaSync: true, sex: true, dateOfBirth: true, tolerancePercent: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, sex, dateOfBirth, tolerancePercent } = body;

    // Validate sex
    if (sex !== undefined && sex !== null && sex !== "M" && sex !== "F") {
      return NextResponse.json({ error: "Invalid sex. Use 'M' or 'F'." }, { status: 400 });
    }

    // Validate tolerancePercent
    let parsedTolerance: number | null = null;
    if (tolerancePercent !== undefined && tolerancePercent !== null && tolerancePercent !== "") {
      parsedTolerance = Number(tolerancePercent);
      if (Number.isNaN(parsedTolerance) || parsedTolerance <= 0 || parsedTolerance > 100) {
        return NextResponse.json({ error: "Invalid tolerance percent. Use a number between 1 and 100." }, { status: 400 });
      }
    }

    // Validate dateOfBirth
    let parsedDate: Date | null = null;
    if (dateOfBirth !== undefined && dateOfBirth !== null && dateOfBirth !== "") {
      parsedDate = new Date(dateOfBirth);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: "Invalid date of birth." }, { status: 400 });
      }
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (sex !== undefined) data.sex = sex;
    if (parsedDate) data.dateOfBirth = parsedDate;
    if (dateOfBirth === null || dateOfBirth === "") data.dateOfBirth = null;
    if (parsedTolerance !== null) data.tolerancePercent = parsedTolerance;
    if (tolerancePercent === null || tolerancePercent === "") data.tolerancePercent = null;

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { id: true, name: true, email: true, role: true, lastStravaSync: true, sex: true, dateOfBirth: true, tolerancePercent: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
