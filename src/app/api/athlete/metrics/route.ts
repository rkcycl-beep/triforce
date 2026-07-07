/**
 * GET /api/athlete/metrics — list current athlete's metrics.
 * POST /api/athlete/metrics — create or update a metric (upsert by type+date).
 *
 * Query params (GET):
 * - type: MetricType filter (optional)
 * - from: ISO date string (inclusive, optional)
 * - to: ISO date string (inclusive, optional)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MetricType, MetricSource } from "@prisma/client";

const METRIC_TYPES: MetricType[] = [
  MetricType.VO2MAX,
  MetricType.FTP,
  MetricType.WEIGHT,
  MetricType.BODY_FAT,
  MetricType.RESTING_HEART_RATE,
  MetricType.SLEEP_SCORE,
  MetricType.RECOVERY_SCORE,
];

function isMetricType(value: unknown): value is MetricType {
  return typeof value === "string" && METRIC_TYPES.includes(value as MetricType);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (type && !isMetricType(type)) {
    return NextResponse.json({ error: "Invalid metric type." }, { status: 400 });
  }

  const where: {
    userId: string;
    type?: MetricType;
    date?: { gte?: Date; lte?: Date };
  } = { userId: session.user.id };

  if (type) where.type = type as MetricType;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  try {
    const metrics = await prisma.userMetric.findMany({
      where,
      orderBy: { date: "desc" },
    });
    return NextResponse.json(metrics);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load metrics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, date, value, unit, notes } = body;

    if (!isMetricType(type)) {
      return NextResponse.json({ error: "Invalid metric type." }, { status: 400 });
    }

    if (!date || typeof date !== "string") {
      return NextResponse.json({ error: "Date is required." }, { status: 400 });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date." }, { status: 400 });
    }

    const parsedValue = typeof value === "string" ? Number(value) : Number(value);
    if (Number.isNaN(parsedValue)) {
      return NextResponse.json({ error: "Value must be a number." }, { status: 400 });
    }

    const upsert = await prisma.userMetric.upsert({
      where: {
        userId_type_date: {
          userId: session.user.id,
          type,
          date: parsedDate,
        },
      },
      update: {
        value: parsedValue,
        unit: unit ?? null,
        notes: notes ?? null,
        source: MetricSource.MANUAL,
      },
      create: {
        userId: session.user.id,
        type,
        date: parsedDate,
        value: parsedValue,
        unit: unit ?? null,
        notes: notes ?? null,
        source: MetricSource.MANUAL,
      },
    });

    return NextResponse.json(upsert);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save metric";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
