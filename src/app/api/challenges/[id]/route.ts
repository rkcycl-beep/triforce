/**
 * GET /api/challenges/[id] — challenge detail + leaderboard
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canViewChallenge, getChallengeLeaderboard } from "@/services/challenge.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;

  const hasAccess = await canViewChallenge(id, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const result = await getChallengeLeaderboard(id);
    if (!result) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load challenge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
