import { prisma } from "@/lib/prisma";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/l
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function uniqueSlug(base: string): Promise<string> {
  const existing = await prisma.group.findUnique({ where: { slug: base } });
  if (!existing) return base;
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

async function uniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateInviteCode();
    if (!(await prisma.group.findUnique({ where: { inviteCode: code } }))) return code;
  }
  throw new Error("Failed to generate unique invite code");
}

// Returns true if userId is the owner/coach of the group.
async function isOwner(groupId: string, userId: string): Promise<boolean> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      creatorId: true,
      memberships: { where: { userId }, select: { role: true } },
    },
  });
  if (!group) return false;
  return group.creatorId === userId || group.memberships[0]?.role === "COACH";
}

// ─── Create ──────────────────────────────────────────────────────────────────

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
      type: "COACH",
      creatorId: coachId,
      timezone: input.timezone ?? "Asia/Jerusalem",
      locale: input.locale ?? "he",
      memberships: { create: { userId: coachId, role: "COACH" } },
    },
  });
}

export async function createPeerGroup(creatorId: string, name: string) {
  const slug = await uniqueSlug(slugify(name));
  const inviteCode = await uniqueInviteCode();
  return prisma.group.create({
    data: {
      name: name.trim(),
      slug,
      inviteCode,
      type: "PEER",
      creatorId,
      memberships: { create: { userId: creatorId, role: "ATHLETE" } },
    },
  });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/** All groups in the system, annotated with the caller's membership status. */
export async function getAllGroups(userId: string) {
  const groups = await prisma.group.findMany({
    include: {
      _count: { select: { memberships: true } },
      memberships: { where: { userId }, select: { role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return groups.map((g) => {
    const myMembership = g.memberships[0] ?? null;
    const isMember = myMembership !== null;
    const owner = g.creatorId === userId || myMembership?.role === "COACH";
    return {
      id: g.id,
      name: g.name,
      type: g.type,
      memberCount: g._count.memberships,
      isMember,
      isOwner: owner,
      inviteCode: owner ? g.inviteCode : null,
    };
  });
}

/** Single group detail. Non-members get basic info; members/owners get full detail. */
export async function getGroupDetail(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { joinedAt: "asc" },
      },
      _count: { select: { messages: true, challenges: true } },
    },
  });
  if (!group) return null;

  const myMembership = group.memberships.find((m) => m.user.id === userId) ?? null;
  const isMember = myMembership !== null;
  const owner = group.creatorId === userId || myMembership?.role === "COACH";

  return {
    id: group.id,
    name: group.name,
    type: group.type,
    creatorId: group.creatorId,
    isMember,
    isOwner: owner,
    inviteCode: owner ? group.inviteCode : null,
    memberCount: group.memberships.length,
    // Full member list only for members
    memberships: isMember
      ? group.memberships.map((m) => ({
          user: m.user,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
        }))
      : [],
    _count: group._count,
  };
}

/** Coach's own groups list (for /coach/groups page). */
export async function getGroupsByCoach(coachId: string) {
  return prisma.group.findMany({
    where: { memberships: { some: { userId: coachId, role: "COACH" } } },
    include: { _count: { select: { memberships: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Coach group detail with members — used by old coach group detail page. */
export async function getGroupWithMembers(groupId: string, coachId: string) {
  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId: coachId, groupId } },
  });
  if (!membership || membership.role !== "COACH") return null;

  return prisma.group.findUnique({
    where: { id: groupId },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, image: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
}

/**
 * Users who can be added to a group by its owner.
 * COACH group → all TriForce users not yet members.
 * PEER group  → caller's chosen friends with a TriForce account, not yet members.
 */
export async function getNonMembers(groupId: string, requesterId: string) {
  if (!(await isOwner(groupId, requesterId))) return null;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { type: true, memberships: { select: { userId: true } } },
  });
  if (!group) return null;

  const memberIds = group.memberships.map((m) => m.userId);

  if (group.type === "COACH") {
    const users = await prisma.user.findMany({
      where: { id: { notIn: memberIds } },
      select: { id: true, name: true, image: true, role: true },
      orderBy: { name: "asc" },
    });
    return users.map((u) => ({ id: u.id, name: u.name, image: u.image, role: u.role }));
  }

  // PEER: only chosen friends that have a TriForce account
  const contacts = await prisma.stravaContact.findMany({
    where: {
      userId: requesterId,
      isChosen: true,
      triforceUserId: { not: null, notIn: memberIds },
    },
    select: { triforceUserId: true, name: true },
  });

  // Resolve their TriForce user records
  const ids = contacts.map((c) => c.triforceUserId as string);
  if (ids.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, image: true, role: true },
  });
  return users.map((u) => ({ id: u.id, name: u.name, image: u.image, role: u.role }));
}

// ─── Membership mutations ─────────────────────────────────────────────────────

export async function joinGroupByCode(userId: string, inviteCode: string) {
  const group = await prisma.group.findUnique({
    where: { inviteCode: inviteCode.toUpperCase().trim() },
    include: { memberships: { select: { userId: true } } },
  });
  if (!group) return null;

  await prisma.groupMembership.upsert({
    where: { userId_groupId: { userId, groupId: group.id } },
    update: {},
    create: { userId, groupId: group.id, role: "ATHLETE" },
  });

  const existingIds = group.memberships.map((m) => m.userId).filter((id) => id !== userId);
  if (existingIds.length > 0) {
    await prisma.follow.createMany({
      data: [
        ...existingIds.map((otherId) => ({ followerId: userId, followingId: otherId })),
        ...existingIds.map((otherId) => ({ followerId: otherId, followingId: userId })),
      ],
      skipDuplicates: true,
    });
  }

  return group;
}

/** Owner directly adds a user to any group type. */
export async function addMemberToGroup(
  groupId: string,
  requesterId: string,
  targetUserId: string
) {
  if (!(await isOwner(groupId, requesterId))) return null;

  return prisma.groupMembership.upsert({
    where: { userId_groupId: { userId: targetUserId, groupId } },
    update: {},
    create: { userId: targetUserId, groupId, role: "ATHLETE" },
  });
}

/** Owner removes a member. Cannot remove yourself. */
export async function removeMemberFromGroup(
  groupId: string,
  requesterId: string,
  targetUserId: string
) {
  if (targetUserId === requesterId) return null;
  if (!(await isOwner(groupId, requesterId))) return null;

  return prisma.groupMembership.delete({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  }).catch(() => null); // already removed — treat as success
}

export async function deleteGroup(groupId: string, requesterId: string) {
  if (!(await isOwner(groupId, requesterId))) return null;

  // Detach any activities that reference this group before deleting,
  // to avoid FK constraint errors regardless of DB-level referential action.
  await prisma.activity.updateMany({
    where: { groupId },
    data: { groupId: null },
  });

  return prisma.group.delete({ where: { id: groupId } });
}

export async function getUserMemberships(userId: string) {
  return prisma.groupMembership.findMany({
    where: { userId },
    include: { group: { select: { id: true, name: true, inviteCode: true, type: true } } },
    orderBy: { joinedAt: "desc" },
  });
}

// Keep for backward compat — old invite endpoint redirects here
export async function inviteFriendToPeerGroup(
  groupId: string,
  inviterId: string,
  inviteeId: string
) {
  return addMemberToGroup(groupId, inviterId, inviteeId);
}
