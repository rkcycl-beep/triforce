import { prisma } from "@/lib/prisma";

function generateInviteCode(): string {
  // Unambiguous chars — no 0/O, 1/I/l
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function uniqueSlug(base: string): Promise<string> {
  const existing = await prisma.group.findUnique({ where: { slug: base } });
  if (!existing) return base;
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

async function uniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateInviteCode();
    const existing = await prisma.group.findUnique({ where: { inviteCode: code } });
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique invite code after 10 attempts");
}

export interface CreateGroupInput {
  name: string;
  timezone?: string;
  locale?: string;
}

export async function createGroup(coachId: string, input: CreateGroupInput) {
  const slug = await uniqueSlug(slugify(input.name));
  const inviteCode = await uniqueInviteCode();
  return prisma.group.create({
    data: {
      name: input.name.trim(),
      slug,
      inviteCode,
      timezone: input.timezone ?? "Asia/Jerusalem",
      locale: input.locale ?? "he",
      memberships: {
        create: { userId: coachId, role: "COACH" },
      },
    },
  });
}

export async function getGroupsByCoach(coachId: string) {
  return prisma.group.findMany({
    where: { memberships: { some: { userId: coachId, role: "COACH" } } },
    include: { _count: { select: { memberships: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getGroupWithMembers(groupId: string, coachId: string) {
  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId: coachId, groupId } },
  });
  if (!membership || membership.role !== "COACH") return null;

  return prisma.group.findUnique({
    where: { id: groupId },
    include: {
      memberships: {
        include: {
          user: { select: { id: true, name: true, image: true, email: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
}

export async function joinGroupByCode(userId: string, inviteCode: string) {
  const group = await prisma.group.findUnique({
    where: { inviteCode: inviteCode.toUpperCase().trim() },
  });
  if (!group) return null;

  await prisma.groupMembership.upsert({
    where: { userId_groupId: { userId, groupId: group.id } },
    update: {},
    create: { userId, groupId: group.id, role: "ATHLETE" },
  });
  return group;
}

export async function getUserMemberships(userId: string) {
  return prisma.groupMembership.findMany({
    where: { userId },
    include: { group: { select: { id: true, name: true, inviteCode: true } } },
    orderBy: { joinedAt: "desc" },
  });
}
