import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMessages, sendMessage } from "@/services/message.service";

async function assertCoachAccess(userId: string, groupId: string) {
  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  return membership?.role === "COACH";
}

async function assertMessageOwner(messageId: string, userId: string, groupId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });
  return message && message.userId === userId && message.groupId === groupId;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await assertCoachAccess(session.user.id, groupId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const messages = await getGroupMessages(groupId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json({ error: "Failed to load messages." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await assertCoachAccess(session.user.id, groupId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { content, type = "ANNOUNCEMENT" } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required." }, { status: 400 });
    }
    const message = await sendMessage(groupId, session.user.id, content.trim(), type);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Failed to send message:", error);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await assertCoachAccess(session.user.id, groupId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("messageId");
    if (!messageId) {
      return NextResponse.json({ error: "messageId required" }, { status: 400 });
    }
    if (!(await assertMessageOwner(messageId, session.user.id, groupId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.message.delete({ where: { id: messageId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete message:", error);
    return NextResponse.json({ error: "Failed to delete message." }, { status: 500 });
  }
}
