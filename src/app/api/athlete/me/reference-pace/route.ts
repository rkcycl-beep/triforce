/**
 * GET /api/athlete/me/reference-pace
 *
 * Returns the current athlete's expected reference paces for common distances,
 * based on their profile (sex + dateOfBirth).
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgeAtDate, getExpectedPace } from "@/lib/scoring/goal-based";

const DISTANCES = [
  { labelKey: "referencePace.5k", distanceKm: 5 },
  { labelKey: "referencePace.10k", distanceKm: 10 },
  { labelKey: "referencePace.halfMarathon", distanceKm: 21.0975 },
  { labelKey: "referencePace.marathon", distanceKm: 42.195 },
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { sex: true, dateOfBirth: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (!user.sex || !user.dateOfBirth) {
    return NextResponse.json(
      {
        missingProfile: true,
        message: "Set your gender and date of birth to see reference paces.",
        paces: [],
      },
      { status: 200 }
    );
  }

  const age = getAgeAtDate(new Date(user.dateOfBirth), new Date());

  const paces = await Promise.all(
    DISTANCES.map(async ({ labelKey, distanceKm }) => {
      const ref = await getExpectedPace("run", user.sex as string, age, distanceKm);
      return {
        labelKey,
        distanceKm,
        paceMinPerKm: ref?.paceMinPerKm ?? null,
      };
    })
  );

  return NextResponse.json({
    age,
    gender: user.sex,
    paces,
  });
}
