/**
 * POST /api/challenges/[id]/accept — accept a challenge invitation
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { acceptChallengeInvitation } from "@/services/challenge.service";

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
    const entry = await acceptChallengeInvitation(id, session.user.id);
    return NextResponse.json(entry);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to accept challenge";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
