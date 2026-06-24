import { prisma } from "@/lib/prisma";
import { computeScore } from "@/lib/scoring";
import type { ScoringMethod, ChallengeStatus } from "@prisma/client";

export interface CreateChallengeInput {
  groupId: string;
  name: string;
  description?: string;
  sportTypes: string[];
  scoringMethod: ScoringMethod;
  startDate: Date;
  endDate: Date;
  config?: Record<string, unknown>;
}

export async function createChallenge(coachId: string, input: CreateChallengeInput) {
  // Verify coach owns the group
  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId: coachId, groupId: input.groupId } },
  });
  if (!membership || membership.role !== "COACH") throw new Error("Forbidden");

  const cfg = (input.config ?? {}) as Record<string, unknown>;
  const sportType = input.sportTypes[0] ?? "run";
  const distanceKm =
    typeof cfg.distanceKm === "number"
      ? cfg.distanceKm
      : typeof cfg.targetDistance === "number"
        ? cfg.targetDistance / 1000
        : 5;
  const metric = typeof cfg.metric === "string" ? cfg.metric : "pace";

  return prisma.challenge.create({
    data: {
      createdById: coachId,
      groupId: input.groupId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      sportTypes: input.sportTypes,
      sportType,
      distanceKm,
      metric,
      scoringMethod: input.scoringMethod,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "ACTIVE",
      config: (input.config ?? {}) as object,
    },
  });
}

export async function getChallengesByGroup(groupId: string) {
  return prisma.challenge.findMany({
    where: { groupId },
    include: { _count: { select: { entries: true } } },
    orderBy: { startDate: "desc" },
  });
}

export async function getAthleteChallenges(userId: string) {
  const memberships = await prisma.groupMembership.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = memberships.map((m) => m.groupId);
  return prisma.challenge.findMany({
    where: { groupId: { in: groupIds }, status: { in: ["ACTIVE", "COMPLETED"] } },
    include: {
      group: { select: { name: true } },
      entries: { where: { userId }, select: { score: true, rank: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

/** Recalculate all active/accepted entries for a challenge and return the sorted leaderboard. */
export async function computeLeaderboard(challengeId: string) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      entries: {
        where: { status: { in: ["ACCEPTED", "COMPLETED"] } },
        include: { user: true },
      },
    },
  });
  if (!challenge) return null;

  const cfg = (challenge.config ?? {}) as Record<string, unknown>;
  const baselineWeeks = (cfg.baselineWeeks as number) ?? 4;
  const baselineStart = new Date(challenge.startDate);
  baselineStart.setDate(baselineStart.getDate() - baselineWeeks * 7);

  const sportFilter =
    challenge.sportTypes.length > 0 ? challenge.sportTypes : [challenge.sportType];

  // Compute score for every accepted/completed participant
  await Promise.all(
    challenge.entries.map(async ({ user }) => {
      const [activities, baseline] = await Promise.all([
        prisma.activity.findMany({
          where: {
            userId: user.id,
            sportType: { in: sportFilter },
            startDate: { gte: challenge.startDate, lte: challenge.endDate },
            isDuplicate: false,
          },
        }),
        prisma.activity.findMany({
          where: {
            userId: user.id,
            sportType: { in: sportFilter },
            startDate: { gte: baselineStart, lt: challenge.startDate },
            isDuplicate: false,
          },
        }),
      ]);

      const { score, metadata } = await computeScore(challenge, user, activities, baseline);

      await prisma.challengeEntry.update({
        where: { challengeId_userId: { challengeId, userId: user.id } },
        data: { score, metadata: metadata as object },
      });
    })
  );

  // Assign ranks in DESC score order (only rank accepted/completed entries)
  const rankableEntries = await prisma.challengeEntry.findMany({
    where: { challengeId, status: { in: ["ACCEPTED", "COMPLETED"] } },
    orderBy: { score: "desc" },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  await Promise.all(
    rankableEntries.map((e, i) =>
      prisma.challengeEntry.update({ where: { id: e.id }, data: { rank: i + 1 } })
    )
  );

  // Return all entries (including invited/declined) with user info
  const allEntries = await prisma.challengeEntry.findMany({
    where: { challengeId },
    orderBy: [{ score: "desc" }, { invitedAt: "asc" }],
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  return { challenge, entries: allEntries };
}

export async function getChallengeForCoach(challengeId: string, coachId: string) {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) return null;

  // Creator always has access
  if (challenge.createdById === coachId) return challenge;

  // For group challenges, also allow coaches of the group
  if (challenge.groupId) {
    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: coachId, groupId: challenge.groupId } },
    });
    if (membership?.role === "COACH") return challenge;
  }

  return null;
}

export async function updateChallengeStatus(challengeId: string, status: ChallengeStatus) {
  return prisma.challenge.update({ where: { id: challengeId }, data: { status } });
}

// ─── KIMI Unified Challenge System ───────────────────────────

export interface UnifiedCreateChallengeInput {
  name: string;
  description?: string;
  sportType: "run" | "ride" | "swim";
  distanceKm: number;
  metric?: string;
  targetValue?: number;
  targetUnit?: string;
  tolerancePercent?: number;
  bonusFactor?: number;
  penaltyFactor?: number;
  startDate: Date;
  endDate: Date;
  groupIds?: string[];
  userIds?: string[];
}

function isCoach(user: { role: string }) {
  return user.role === "COACH";
}

/**
 * Create a challenge and send invitations.
 * Coaches can invite groups + individuals.
 * Trainees can only invite individual friends.
 */
export async function createUnifiedChallenge(
  creatorId: string,
  input: UnifiedCreateChallengeInput
) {
  const creator = await prisma.user.findUnique({ where: { id: creatorId } });
  if (!creator) throw new Error("Creator not found");

  const isUserCoach = isCoach(creator);
  const groupIds = input.groupIds ?? [];
  const directUserIds = input.userIds ?? [];

  if (!isUserCoach && groupIds.length > 0) {
    throw new Error("Trainees cannot invite groups");
  }

  // Resolve recipient user IDs
  const recipientUserIds = new Set<string>();

  // Add group members for selected groups
  for (const groupId of groupIds) {
    // Verify creator is a coach of this group
    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: creatorId, groupId } },
    });
    if (!membership || membership.role !== "COACH") {
      throw new Error(`Not authorized to invite group ${groupId}`);
    }

    const members = await prisma.groupMembership.findMany({
      where: { groupId },
      select: { userId: true },
    });
    members.forEach((m) => recipientUserIds.add(m.userId));
  }

  // Add direct users
  for (const userId of directUserIds) {
    if (userId === creatorId) continue;

    if (!isUserCoach) {
      // Trainees can invite TriForce follows OR Strava contacts who joined TriForce
      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: creatorId, followingId: userId } },
      });
      const contact = await prisma.stravaContact.findFirst({
        where: { userId: creatorId, triforceUserId: userId },
      });
      if (!follow && !contact) {
        throw new Error(`User ${userId} is not your friend or Strava contact`);
      }
    }

    recipientUserIds.add(userId);
  }

  if (recipientUserIds.size === 0) {
    throw new Error("No recipients selected");
  }

  // For group-scoped challenges, use the first group
  const primaryGroupId = groupIds.length === 1 ? groupIds[0] : null;

  const challenge = await prisma.challenge.create({
    data: {
      createdById: creatorId,
      groupId: primaryGroupId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      sportTypes: [input.sportType],
      sportType: input.sportType,
      distanceKm: input.distanceKm,
      metric: input.metric ?? "pace",
      targetValue: input.targetValue ?? null,
      targetUnit: input.targetUnit ?? null,
      tolerancePercent: input.tolerancePercent ?? 30,
      bonusFactor: input.bonusFactor ?? 50,
      penaltyFactor: input.penaltyFactor ?? 100,
      scoringMethod: "GOAL_BASED",
      startDate: input.startDate,
      endDate: input.endDate,
      status: "ACTIVE",
    },
  });

  // Create entries and notifications for recipients
  const entryData = Array.from(recipientUserIds).map((userId) => ({
    challengeId: challenge.id,
    userId,
    status: "INVITED" as const,
  }));

  await prisma.challengeEntry.createMany({
    data: entryData,
    skipDuplicates: true,
  });

  await prisma.notification.createMany({
    data: entryData.map((entry) => ({
      userId: entry.userId,
      type: "CHALLENGE_INVITED" as const,
      title: "הוזמנת לאתגר חדש",
      content: `${creator.name ?? "מישהו"} הזמין אותך לאתגר "${challenge.name}"`,
      metadata: { challengeId: challenge.id, senderId: creatorId },
    })),
  });

  return challenge;
}

/**
 * Accept a challenge invitation.
 */
export async function acceptChallengeInvitation(challengeId: string, userId: string) {
  const entry = await prisma.challengeEntry.findUnique({
    where: { challengeId_userId: { challengeId, userId } },
    include: { challenge: { include: { createdBy: true } }, user: true },
  });

  if (!entry || entry.status !== "INVITED") {
    throw new Error("Invitation not found or already responded");
  }

  const [updated] = await prisma.$transaction([
    prisma.challengeEntry.update({
      where: { challengeId_userId: { challengeId, userId } },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    }),
    prisma.notification.create({
      data: {
        userId: entry.challenge.createdById,
        type: "CHALLENGE_ACCEPTED",
        title: "אישור השתתפות",
        content: `${entry.user.name ?? "משתתף"} אישר/ה השתתפות באתגר "${entry.challenge.name}"`,
        metadata: { challengeId, responderId: userId },
      },
    }),
  ]);

  return updated;
}

/**
 * Decline a challenge invitation.
 */
export async function declineChallengeInvitation(challengeId: string, userId: string) {
  const entry = await prisma.challengeEntry.findUnique({
    where: { challengeId_userId: { challengeId, userId } },
    include: { challenge: true, user: true },
  });

  if (!entry || entry.status !== "INVITED") {
    throw new Error("Invitation not found or already responded");
  }

  const [updated] = await prisma.$transaction([
    prisma.challengeEntry.update({
      where: { challengeId_userId: { challengeId, userId } },
      data: { status: "DECLINED", respondedAt: new Date() },
    }),
    prisma.notification.create({
      data: {
        userId: entry.challenge.createdById,
        type: "CHALLENGE_DECLINED",
        title: "דחיית השתתפות",
        content: `${entry.user.name ?? "משתתף"} דחה/ה את ההזמנה לאתגר "${entry.challenge.name}"`,
        metadata: { challengeId, responderId: userId },
      },
    }),
  ]);

  return updated;
}

/**
 * Get all challenges relevant to a user: created by them, or where they are invited/accepted/declined.
 */
export async function getMyChallenges(userId: string) {
  return prisma.challenge.findMany({
    where: {
      OR: [{ createdById: userId }, { entries: { some: { userId } } }],
    },
    include: {
      group: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, image: true } },
      entries: {
        where: { userId },
        select: { status: true, score: true, rank: true },
      },
      _count: { select: { entries: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

/**
 * Check if a user can view a challenge.
 */
export async function getUnreadNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId, isRead: false },
    orderBy: { createdAt: "desc" },
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (!notification || notification.userId !== userId) {
    throw new Error("Notification not found");
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function canViewChallenge(challengeId: string, userId: string) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { createdById: true, groupId: true },
  });
  if (!challenge) return false;

  if (challenge.createdById === userId) return true;

  const entry = await prisma.challengeEntry.findUnique({
    where: { challengeId_userId: { challengeId, userId } },
  });
  if (entry) return true;

  if (challenge.groupId) {
    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId: challenge.groupId } },
    });
    if (membership) return true;
  }

  return false;
}
