import { prisma } from "../src/lib/prisma";

async function main() {
  // Demo users in the database
  const demoCoach = await prisma.user.findUnique({ where: { id: "cmpwzoh0k0000tfvk38b6nhfm" } });
  const demoAthlete = await prisma.user.findUnique({ where: { id: "cmpwzoh6v0001tfvkourmy72b" } });
  const testCoach = await prisma.user.findUnique({ where: { id: "cmpqs97ts0000amnv56cvairb" } });
  const robbie = await prisma.user.findUnique({ where: { id: "cmolthzc90000i8bj8r3hsslb" } });

  const users = [demoCoach, demoAthlete, testCoach, robbie].filter(Boolean) as Awaited<
    ReturnType<typeof prisma.user.findUnique>
  >[];

  if (users.length < 2) {
    console.log("Not enough demo users found. Need at least 2.");
    return;
  }

  console.log(`Setting up demo friendships between ${users.length} users...`);

  // Create mutual follows between all demo users
  for (let i = 0; i < users.length; i++) {
    for (let j = 0; j < users.length; j++) {
      if (i === j) continue;
      await prisma.follow.upsert({
        where: {
          followerId_followingId: {
            followerId: users[i]!.id,
            followingId: users[j]!.id,
          },
        },
        create: {
          followerId: users[i]!.id,
          followingId: users[j]!.id,
        },
        update: {},
      });
    }
  }

  // Create StravaContact records for each user pointing to other demo users
  // Mark some as chosen so they appear in challenge creation
  for (const user of users) {
    for (const other of users) {
      if (user.id === other.id) continue;

      await prisma.stravaContact.upsert({
        where: {
          userId_name: {
            userId: user.id,
            name: other.name ?? "Demo User",
          },
        },
        create: {
          userId: user.id,
          name: other.name ?? "Demo User",
          kudosCount: Math.floor(Math.random() * 10) + 1,
          latestKudosAt: new Date(),
          scannedAt: new Date(),
          isChosen: true,
          triforceUserId: other.id,
        },
        update: {
          isChosen: true,
          triforceUserId: other.id,
        },
      });
    }
  }

  console.log("Demo friendships created:");
  for (const user of users) {
    const followCount = await prisma.follow.count({ where: { followerId: user.id } });
    const chosenCount = await prisma.stravaContact.count({
      where: { userId: user.id, isChosen: true },
    });
    console.log(`- ${user.name}: ${followCount} follows, ${chosenCount} chosen contacts`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
