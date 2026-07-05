/**
 * GET /api/challenges/reference-pace
 *
 * Query params:
 * - sportType: string (default "run")
 * - distanceKm: number (default 5)
 * - gender: "M" | "F" (optional — returns both if omitted)
 * - age: number (optional — if provided, returns the exact/interpolated row for that age)
 *
 * When age is provided, the response is a single object (or null).
 * When age is omitted, the response is an array of rows for the reference table modal.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getExpectedPace } from "@/lib/scoring/goal-based";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const sportType = searchParams.get("sportType") ?? "run";
  const distanceKm = Number(searchParams.get("distanceKm") ?? "5");
  const gender = searchParams.get("gender");
  const ageParam = searchParams.get("age");

  try {
    // If age is provided, return the exact or interpolated row for that age.
    if (ageParam && gender) {
      const age = Number(ageParam);
      if (Number.isNaN(age)) {
        return NextResponse.json({ error: "Invalid age" }, { status: 400 });
      }

      const row = await getExpectedPace(sportType, gender, age, distanceKm);
      if (!row) {
        return NextResponse.json(null);
      }

      return NextResponse.json({
        sportType: row.sportType,
        gender: row.gender,
        age: row.age,
        distanceKm: row.distanceKm,
        paceMinPerKm: row.paceMinPerKm,
        source: row.source,
      });
    }

    // Otherwise return the full table (used by the reference table modal).
    const rows = await prisma.sportReferencePace.findMany({
      where: {
        sportType,
        distanceKm,
        ...(gender ? { gender } : {}),
      },
      orderBy: [{ gender: "asc" }, { age: "asc" }],
    });

    return NextResponse.json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load reference pace";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
