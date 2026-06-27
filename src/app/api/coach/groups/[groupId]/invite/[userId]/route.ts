import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inviteUserToGroup } from "@/services/group.service";

/**
 * POST /api/coach/groups/[groupId]/invite/[userId]
 *
 * Coach invites a specific user to join their group.
 * Creates a GroupInvitation record and a notification for the invitee.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ groupId: string; userId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { groupId, userId: inviteeId } = await params;

  try {
    const result = await inviteUserToGroup(groupId, session.user.id, inviteeId);
    if (!result) {
      return NextResponse.json({ error: "Forbidden or group not found." }, { status: 403 });
    }

    if ("alreadyMember" in result) {
      return NextResponse.json({ message: "User is already a member." });
    }

    // Send notification to invitee
    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
    const inviter = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });

    await prisma.notification.create({
      data: {
        userId: inviteeId,
        type: "GROUP_INVITED" as const,
        title: "הוזמנת להצטרף לקבוצה",
        content: `${inviter?.name ?? "מאמן"} הזמין אותך להצטרף לקבוצה "${group?.name ?? "קבוצה"}"`,
        metadata: { groupId, inviterId: session.user.id, invitationId: result.invitation.id },
      },
    });

    return NextResponse.json({ invitation: result.invitation });
  } catch (error) {
    console.error("Failed to invite user to group:", error);
    return NextResponse.json({ error: "Failed to send invitation." }, { status: 500 });
  }
}
