import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const WEEKLY_TARGET = 4; // assumed workouts/week per athlete

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.roles?.includes("COACH")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coachId = session.user.id;

  const groups = await prisma.group.findMany({
    where: { memberships: { some: { userId: coachId, role: "COACH" } } },
    select: { id: true, name: true },
  });

  const groupIds = groups.map((g) => g.id);

  const empty = {
    stats: { totalAthletes: 0, workoutsThisWeek: 0, adherencePct: 0, pendingMessages: 0 },
    athletes: [],
    activeChallenge: null,
    weeklyActivity: buildEmptyWeek(),
    groups,
  };

  if (groupIds.length === 0) return NextResponse.json(empty);

  // Unique athletes across all coach groups
  const memberships = await prisma.groupMembership.findMany({
    where: { groupId: { in: groupIds }, role: "ATHLETE" },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  const seen = new Set<string>();
  const athletes: { id: string; name: string | null; image: string | null }[] = [];
  for (const m of memberships) {
    if (!seen.has(m.user.id)) {
      seen.add(m.user.id);
      athletes.push(m.user);
    }
  }
  const athleteIds = athletes.map((a) => a.id);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const weekActivities = await prisma.activity.findMany({
    where: { userId: { in: athleteIds }, startDate: { gte: weekStart }, isDuplicate: false },
    select: { userId: true, startDate: true },
  });

  // Per-athlete count
  const countByAthlete = new Map<string, number>();
  for (const a of weekActivities) {
    countByAthlete.set(a.userId, (countByAthlete.get(a.userId) ?? 0) + 1);
  }

  const athletesWithStatus = athletes
    .map((a) => {
      const done = countByAthlete.get(a.id) ?? 0;
      const status: "OK" | "WATCH" | "ATTENTION" =
        done === 0 ? "ATTENTION" : done === 1 ? "WATCH" : "OK";
      return { id: a.id, name: a.name, image: a.image, workoutsThisWeek: done, weeklyTarget: WEEKLY_TARGET, status };
    })
    .sort((a, b) => {
      const order = { ATTENTION: 0, WATCH: 1, OK: 2 };
      return order[a.status] - order[b.status];
    });

  const adherent = athletesWithStatus.filter((a) => a.workoutsThisWeek >= 3).length;
  const adherencePct = athletes.length > 0 ? Math.round((adherent / athletes.length) * 100) : 0;

  const pendingMessages = await prisma.message.count({
    where: { groupId: { in: groupIds }, createdAt: { gte: weekStart } },
  });

  const activeChallenge = await prisma.challenge.findFirst({
    where: { groupId: { in: groupIds }, status: "ACTIVE" },
    include: { _count: { select: { entries: true } } },
    orderBy: { startDate: "desc" },
  });

  let challengeData = null;
  if (activeChallenge) {
    const totalMs = activeChallenge.endDate.getTime() - activeChallenge.startDate.getTime();
    const elapsedMs = Date.now() - activeChallenge.startDate.getTime();
    const progress = totalMs > 0 ? Math.min(100, Math.round((elapsedMs / totalMs) * 100)) : 0;
    const daysLeft = Math.max(0, Math.ceil((activeChallenge.endDate.getTime() - Date.now()) / 86_400_000));
    challengeData = {
      id: activeChallenge.id,
      groupId: activeChallenge.groupId,
      name: activeChallenge.name,
      progress,
      participantsCount: activeChallenge._count.entries,
      totalAthletes: athletes.length,
      daysLeft,
    };
  }

  // 7-day bar chart
  const dayLabels = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(now);
    dayStart.setDate(now.getDate() - (6 - i));
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const count = weekActivities.filter(
      (a) => a.startDate >= dayStart && a.startDate <= dayEnd
    ).length;
    return { day: dayLabels[dayStart.getDay()], count };
  });

  return NextResponse.json({
    stats: { totalAthletes: athletes.length, workoutsThisWeek: weekActivities.length, adherencePct, pendingMessages },
    athletes: athletesWithStatus,
    activeChallenge: challengeData,
    weeklyActivity,
    groups,
  });
}

function buildEmptyWeek() {
  const labels = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    return { day: labels[d.getDay()], count: 0 };
  });
}
