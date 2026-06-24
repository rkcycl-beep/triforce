/**
 * GET /api/challenges/reference-pace
 *
 * Query params:
 * - sportType: string (default "run")
 * - distanceKm: number (default 5)
 * - gender: "M" | "F" (optional — returns both if omitted)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const sportType = searchParams.get("sportType") ?? "run";
  const distanceKm = Number(searchParams.get("distanceKm") ?? "5");
  const gender = searchParams.get("gender");

  try {
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
