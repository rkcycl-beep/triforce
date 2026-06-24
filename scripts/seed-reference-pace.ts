import { prisma } from "../src/lib/prisma";

// Base paces (min/km) at peak age (30) for each gender/distance.
// These represent an "average" recreational runner, not an elite runner.
const BASE_PACES: Record<string, Record<number, number>> = {
  M: {
    5: 4.5,       // 5K
    10: 4.75,     // 10K
    21.0975: 5.0, // Half marathon
    42.195: 5.5,  // Marathon
  },
  F: {
    5: 5.0,
    10: 5.25,
    21.0975: 5.55,
    42.195: 6.1,
  },
};

// Age factor: how much slower the average pace is compared to peak age 30.
function getAgeFactor(age: number): number {
  if (age < 20) {
    // Teenagers are slightly slower on average than peak
    return 1.0 + (20 - age) * 0.01;
  }
  if (age < 30) {
    // Approaching peak
    return 1.0 + (30 - age) * 0.005;
  }
  if (age === 30) {
    return 1.0;
  }
  if (age <= 50) {
    // ~1% per year slowdown
    return 1.0 + (age - 30) * 0.01;
  }
  if (age <= 60) {
    // ~1.5% per year slowdown
    return 1.2 + (age - 50) * 0.015;
  }
  if (age <= 70) {
    // ~2% per year slowdown
    return 1.35 + (age - 60) * 0.02;
  }
  // 70+ ~2.5% per year slowdown
  return 1.55 + (age - 70) * 0.025;
}

async function main() {
  console.log("Seeding SportReferencePace data for running...");

  // Clear existing running data to avoid duplicates
  await prisma.sportReferencePace.deleteMany({
    where: { sportType: "run" },
  });

  const rows: {
    sportType: string;
    gender: string;
    age: number;
    distanceKm: number;
    paceMinPerKm: number;
    source: string;
  }[] = [];

  for (const gender of ["M", "F"] as const) {
    for (let age = 10; age <= 85; age++) {
      for (const distanceKm of [5, 10, 21.0975, 42.195]) {
        const basePace = BASE_PACES[gender][distanceKm];
        const ageFactor = getAgeFactor(age);
        const paceMinPerKm = parseFloat((basePace * ageFactor).toFixed(2));

        rows.push({
          sportType: "run",
          gender,
          age,
          distanceKm,
          paceMinPerKm,
          source: "KIMI-derived recreational average",
        });
      }
    }
  }

  // Bulk insert in batches to avoid huge transactions
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await prisma.sportReferencePace.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`Inserted batch ${i / batchSize + 1}/${Math.ceil(rows.length / batchSize)}`);
  }

  console.log(`Seeded ${rows.length} reference pace rows for running.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
