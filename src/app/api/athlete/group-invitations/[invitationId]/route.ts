import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { respondToGroupInvitation } from "@/services/group.service";

/**
 * POST /api/athlete/group-invitations/[invitationId]
 * Body: { action: "accept" | "decline" }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { invitationId } = await params;

  let body: { action?: string } = {};
  try {
    body = await req.json();
  } catch {
    // ignore empty body
  }

  const action = body.action === "decline" ? "decline" : "accept";

  try {
    const result = await respondToGroupInvitation(invitationId, session.user.id, action);
    if (!result) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, invitation: result });
  } catch (error) {
    console.error("Failed to respond to group invitation:", error);
    return NextResponse.json({ error: "Failed to respond." }, { status: 500 });
  }
}
