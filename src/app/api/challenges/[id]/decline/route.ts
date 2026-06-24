/**
 * POST /api/challenges/[id]/decline — decline a challenge invitation
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { declineChallengeInvitation } from "@/services/challenge.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const entry = await declineChallengeInvitation(id, session.user.id);
    return NextResponse.json(entry);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to decline challenge";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
