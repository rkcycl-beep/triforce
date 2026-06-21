/**
 * DELETE /api/groups/[groupId] — owner deletes a group.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteGroup } from "@/services/group.service";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { groupId } = await params;

  try {
    const result = await deleteGroup(groupId, session.user.id);
    if (!result) {
      return NextResponse.json({ error: "Forbidden or group not found." }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Failed to delete group:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
