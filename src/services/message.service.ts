import { prisma } from "@/lib/prisma";
import { MessageType } from "@prisma/client";

export async function sendMessage(
  groupId: string,
  userId: string,
  content: string,
  type: MessageType = "CHAT"
) {
  return prisma.message.create({
    data: { groupId, userId, content, type },
    include: { user: { select: { id: true, name: true, image: true, role: true } } },
  });
}

export async function getGroupMessages(groupId: string, limit = 50) {
  return prisma.message.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, image: true, role: true } } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export async function getMessagesForUser(userId: string, limit = 50) {
  const memberships = await prisma.groupMembership.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = memberships.map((m) => m.groupId);
  if (groupIds.length === 0) return [];

  return prisma.message.findMany({
    where: { groupId: { in: groupIds } },
    include: {
      user: { select: { id: true, name: true, image: true, role: true } },
      group: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
