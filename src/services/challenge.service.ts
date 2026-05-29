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

  return prisma.challenge.create({
    data: {
      groupId: input.groupId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      sportTypes: input.sportTypes,
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

/** Recalculate all entries for a challenge and return the sorted leaderboard. */
export async function computeLeaderboard(challengeId: string) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      group: {
        include: {
          memberships: {
            where: { role: "ATHLETE" },
            include: { user: true },
          },
        },
      },
    },
  });
  if (!challenge) return null;

  const cfg = (challenge.config ?? {}) as Record<string, unknown>;
  const baselineWeeks = (cfg.baselineWeeks as number) ?? 4;
  const baselineStart = new Date(challenge.startDate);
  baselineStart.setDate(baselineStart.getDate() - baselineWeeks * 7);

  // Compute score for every athlete in the group
  await Promise.all(
    challenge.group.memberships.map(async ({ user }) => {
      const [activities, baseline] = await Promise.all([
        prisma.activity.findMany({
          where: {
            userId: user.id,
            sportType: { in: challenge.sportTypes },
            startDate: { gte: challenge.startDate, lte: challenge.endDate },
            isDuplicate: false,
          },
        }),
        prisma.activity.findMany({
          where: {
            userId: user.id,
            sportType: { in: challenge.sportTypes },
            startDate: { gte: baselineStart, lt: challenge.startDate },
            isDuplicate: false,
          },
        }),
      ]);

      const { score, metadata } = computeScore(challenge, user, activities, baseline);

      await prisma.challengeEntry.upsert({
        where: { challengeId_userId: { challengeId, userId: user.id } },
        update: { score, metadata: metadata as object },
        create: { challengeId, userId: user.id, score, metadata: metadata as object },
      });
    })
  );

  // Assign ranks in DESC score order
  const entries = await prisma.challengeEntry.findMany({
    where: { challengeId },
    orderBy: { score: "desc" },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  await Promise.all(
    entries.map((e, i) =>
      prisma.challengeEntry.update({ where: { id: e.id }, data: { rank: i + 1 } })
    )
  );

  return { challenge, entries };
}

export async function getChallengeForCoach(challengeId: string, coachId: string) {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) return null;
  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId: coachId, groupId: challenge.groupId } },
  });
  if (!membership || membership.role !== "COACH") return null;
  return challenge;
}

export async function updateChallengeStatus(challengeId: string, status: ChallengeStatus) {
  return prisma.challenge.update({ where: { id: challengeId }, data: { status } });
}
