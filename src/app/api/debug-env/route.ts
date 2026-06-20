import { NextResponse } from "next/server";

export async function GET() {
  const db = process.env.DATABASE_URL ?? "";
  return NextResponse.json({
    length: db.length,
    first20: db.slice(0, 20),
    hasPgbouncer: db.includes("pgbouncer"),
    hasSslmode: db.includes("sslmode"),
    hasNeon: db.includes("neon.tech"),
    startsWithPostgres: db.startsWith("postgres"),
  });
}
