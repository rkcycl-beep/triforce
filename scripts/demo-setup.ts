import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeLeaderboard } from "@/services/challenge.service";

const prisma = new PrismaClient();

async function main() {
  // Clean old demo data
  await prisma.challengeActivityLink.deleteMany({});
  await prisma.challengeEntry.deleteMany({});
  await prisma.challenge.deleteMany({ where: { name: { contains: "דמו" } } });
  await prisma.activity.deleteMany({ where: { name: { contains: "דמו" } } });
  await prisma.groupMembership.deleteMany({});
  await prisma.group.deleteMany({ where: { slug: { contains: "demo" } } });
  await prisma.user.deleteMany({ where: { email: { in: ["demo@triforce.app", "athlete@triforce.app"] } } });

  // Create demo coach
  const coach = await prisma.user.create({
    data: {
      name: "מאמן דמו",
      email: "demo@triforce.app",
      passwordHash: await bcrypt.hash("demo1234", 10),
      role: "COACH",
    },
  });
  console.log("Coach:", coach.id, coach.email);

  // Create demo athlete
  const athlete = await prisma.user.create({
    data: {
      name: "אתלט דמו",
      email: "athlete@triforce.app",
      passwordHash: await bcrypt.hash("demo1234", 10),
      role: "ATHLETE",
      sex: "M",
      dateOfBirth: new Date("1985-06-15"),
    },
  });
  console.log("Athlete:", athlete.id, athlete.email);

  // Create group
  const group = await prisma.group.create({
    data: {
      name: "קבוצת דמו",
      slug: "demo-group",
      inviteCode: "DEMO01",
      timezone: "Asia/Jerusalem",
      locale: "he",
    },
  });

  // Add members
  await prisma.groupMembership.create({ data: { userId: coach.id, groupId: group.id, role: "COACH" } });
  await prisma.groupMembership.create({ data: { userId: athlete.id, groupId: group.id, role: "ATHLETE" } });

  // Create challenges
  const now = new Date();
  const challenge1 = await prisma.challenge.create({
    data: {
      groupId: group.id,
      name: "אתגר ריצת 40 ק\"מ — דמו",
      description: "רוץ 40 קילומטר בשבועיים!",
      sportTypes: ["run"],
      scoringMethod: "PERSONAL_IMPROVEMENT",
      startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
      config: { baselineWeeks: 4, metric: "distance" },
    },
  });

  const challenge2 = await prisma.challenge.create({
    data: {
      groupId: group.id,
      name: "אתגר אופניים — דמו",
      description: "100 ק\"מ באופניים",
      sportTypes: ["ride"],
      scoringMethod: "CATEGORY",
      startDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
      config: { metric: "distance" },
    },
  });

  // Create demo activities for athlete
  const activities = [
    { name: "ריצת בוקר דמו", sportType: "run", distance: 5200, movingTime: 1800, elapsedTime: 1950, elevationGain: 45, avgSpeed: 2.89, maxSpeed: 4.1 },
    { name: "ריצת ערב דמו", sportType: "run", distance: 8100, movingTime: 2700, elapsedTime: 2800, elevationGain: 60, avgSpeed: 3.0, maxSpeed: 4.5 },
    { name: "טיול אופניים דמו", sportType: "ride", distance: 25000, movingTime: 3600, elapsedTime: 4000, elevationGain: 120, avgSpeed: 6.94, maxSpeed: 12.0 },
  ];

  for (const a of activities) {
    await prisma.activity.create({
      data: {
        userId: athlete.id,
        groupId: group.id,
        provider: "strava",
        providerActivityId: `demo_${Math.random().toString(36).slice(2)}`,
        name: a.name,
        sportType: a.sportType,
        rawSportType: a.sportType === "run" ? "Run" : "Ride",
        startDate: new Date(now.getTime() - Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000),
        distance: a.distance,
        movingTime: a.movingTime,
        elapsedTime: a.elapsedTime,
        elevationGain: a.elevationGain,
        averageSpeed: a.avgSpeed,
        maxSpeed: a.maxSpeed,
        hasHeartrate: false,
      },
    });
  }

  // Compute leaderboard
  await computeLeaderboard(challenge1.id);
  await computeLeaderboard(challenge2.id);

  console.log("\n✅ Demo data ready!");
  console.log("Coach login: demo@triforce.app / demo1234");
  console.log("Athlete login: athlete@triforce.app / demo1234");
}

main().catch(console.error).finally(() => prisma.$disconnect());
