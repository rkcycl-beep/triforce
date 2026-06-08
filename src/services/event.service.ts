import { prisma } from "@/lib/prisma";

export async function createEvent(data: {
  groupId: string;
  createdById: string;
  name: string;
  description?: string;
  location?: string;
  eventDate: Date;
}) {
  return prisma.event.create({
    data,
    include: {
      createdBy: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } },
    },
  });
}

export async function getGroupEvents(groupId: string) {
  return prisma.event.findMany({
    where: { groupId },
    orderBy: { eventDate: "asc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function getUpcomingEventsForUser(userId: string) {
  const memberships = await prisma.groupMembership.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = memberships.map((m) => m.groupId);
  if (groupIds.length === 0) return [];

  return prisma.event.findMany({
    where: { groupId: { in: groupIds } },
    orderBy: { eventDate: "asc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } },
    },
  });
}

export async function deleteEvent(eventId: string, requesterId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, createdById: requesterId },
  });
  if (!event) throw new Error("Not found");
  return prisma.event.delete({ where: { id: eventId } });
}
