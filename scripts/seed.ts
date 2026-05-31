import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find the athlete user (should be the Strava OAuth user)
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
  });

  console.log("Found users:", users);

  if (users.length === 0) {
    console.log("No users found. Please log in with Strava first.");
    return;
  }

  // Use the first user (the Strava athlete)
  const athlete = users[0];
  console.log(`Using athlete: ${athlete.name} (${athlete.id})`);

  // Create a group
  const group = await prisma.group.create({
    data: {
      name: "קבוצת האימונים שלי",
      slug: "my-training-group",
      inviteCode: "ABC123",
      timezone: "Asia/Jerusalem",
      locale: "he",
    },
  });
  console.log("Created group:", group.name, group.id);

  // Add athlete to group
  const membership = await prisma.groupMembership.create({
    data: {
      userId: athlete.id,
      groupId: group.id,
      role: "ATHLETE",
    },
  });
  console.log("Created membership");

  // Create an active challenge
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 7); // started 7 days ago

  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 21); // ends in 21 days

  const challenge = await prisma.challenge.create({
    data: {
      groupId: group.id,
      name: "אתגר ריצת 40 ק\"מ",
      description: "רוץ 40 קילומטר בשבועיים וקבל פרס!",
      sportTypes: ["run"],
      scoringMethod: "PERSONAL_IMPROVEMENT",
      startDate,
      endDate,
      status: "ACTIVE",
      config: { baselineWeeks: 4 },
    },
  });
  console.log("Created challenge:", challenge.name, challenge.id);

  console.log("\n✅ Seed complete! Refresh the dashboard to see the challenge.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
