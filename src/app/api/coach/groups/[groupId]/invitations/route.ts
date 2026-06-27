import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGroupInvitations } from "@/services/group.service";

/**
 * GET /api/coach/groups/[groupId]/invitations
 *
 * Returns pending invitations for the group (coach only).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { groupId } = await params;

  const invitations = await getGroupInvitations(groupId, session.user.id);
  if (invitations === null) {
    return NextResponse.json({ error: "Forbidden or group not found." }, { status: 403 });
  }

  return NextResponse.json({ invitations });
}
