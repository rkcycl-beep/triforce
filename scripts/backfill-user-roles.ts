import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Backfilling user roles...");

  // Coaches get both roles; athletes keep ATHLETE (already default)
  const coaches = await prisma.user.updateMany({
    where: { role: "COACH" },
    data: { roles: ["ATHLETE", "COACH"] },
  });

  // Ensure all remaining users have at least ATHLETE
  const athletes = await prisma.user.updateMany({
    where: { role: "ATHLETE" },
    data: { roles: ["ATHLETE"] },
  });

  console.log(`Updated ${coaches.count} coaches and ${athletes.count} athletes.`);

  // Sanity check
  const samples = await prisma.user.findMany({
    take: 10,
    select: { id: true, name: true, role: true, roles: true },
  });
  console.log("Sample users:");
  for (const u of samples) {
    console.log(`  ${u.name ?? u.id}: role=${u.role}, roles=[${u.roles.join(", ")}]`);
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
