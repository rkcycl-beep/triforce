import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Reference paces for recreational runners.
 *
 * Data source:
 *   5K average finish times by age and sex come from RunRepeat / IAAF 2018 data
 *   as summarized by Healthline (https://www.healthline.com/health/exercise-fitness/average-5k-time).
 *
 *   Longer distances are projected from the 5K times using Riegel's formula,
 *   which is well validated for recreational runners:
 *     T2 = T1 × (D2 / D1) ^ 1.06
 *   See marathonhandbook.com discussion of Riegel for recreational runners.
 *
 * These paces represent amateur averages, not elites, so a runner matching the
 * expected pace gets a solid 100-point score in TriForce challenges.
 */

// 5K average finish times in minutes, by age bracket and gender.
// Source: RunRepeat / IAAF 2018 amateur race data (Healthline summary).
const AVERAGE_5K_MINUTES: Record<string, Record<number, number>> = {
  M: {
    15: 31.47, // <20 bracket midpoint
    25: 33.32,
    35: 34.6,
    45: 35.4,
    55: 36.57,
    65: 40.7,
    75: 48.0,
    85: 58.0,
  },
  F: {
    15: 38.63,
    25: 38.73,
    35: 40.22,
    45: 41.67,
    55: 43.95,
    65: 48.68,
    75: 58.0,
    85: 70.0,
  },
};

const DISTANCES_KM = [5, 10, 21.0975, 42.195];

function timeToMinutes(timeStr: string): number {
  const [min, sec] = timeStr.split(":").map(Number);
  return min + sec / 60;
}

function minutesToTime(minutes: number): string {
  const min = Math.floor(minutes);
  const sec = Math.round((minutes - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// Linear interpolation between known age brackets.
function get5KMinutes(gender: "M" | "F", age: number): number {
  const table = AVERAGE_5K_MINUTES[gender];
  const ages = Object.keys(table).map(Number).sort((a, b) => a - b);

  if (age <= ages[0]) return table[ages[0]];
  if (age >= ages[ages.length - 1]) return table[ages[ages.length - 1]];

  let lower = ages[0];
  let upper = ages[ages.length - 1];
  for (const a of ages) {
    if (a <= age) lower = a;
    if (a >= age && upper === ages[ages.length - 1]) upper = a;
  }

  if (lower === upper) return table[lower];

  const ratio = (age - lower) / (upper - lower);
  return table[lower] + (table[upper] - table[lower]) * ratio;
}

// Riegel formula: predict time at distance2 from known time at distance1.
function riegelPredict(
  time1Minutes: number,
  distance1Km: number,
  distance2Km: number,
  exponent = 1.06
): number {
  return time1Minutes * Math.pow(distance2Km / distance1Km, exponent);
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
      const avg5KMin = get5KMinutes(gender, age);

      for (const distanceKm of DISTANCES_KM) {
        const predictedTimeMin = riegelPredict(avg5KMin, 5, distanceKm);
        const paceMinPerKm = parseFloat((predictedTimeMin / distanceKm).toFixed(2));

        rows.push({
          sportType: "run",
          gender,
          age,
          distanceKm,
          paceMinPerKm,
          source:
            "RunRepeat/IAAF 2018 amateur 5K averages + Riegel projection for longer distances",
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

  // Print a sample for sanity checking
  console.log("\nSample paces (age 30, M):");
  for (const distanceKm of DISTANCES_KM) {
    const row = rows.find((r) => r.age === 30 && r.gender === "M" && r.distanceKm === distanceKm);
    if (row) {
      console.log(`  ${distanceKm} km: ${minutesToTime(row.paceMinPerKm)} /km`);
    }
  }
  console.log("Sample paces (age 30, F):");
  for (const distanceKm of DISTANCES_KM) {
    const row = rows.find((r) => r.age === 30 && r.gender === "F" && r.distanceKm === distanceKm);
    if (row) {
      console.log(`  ${distanceKm} km: ${minutesToTime(row.paceMinPerKm)} /km`);
    }
  }

  console.log(`\nSeeded ${rows.length} reference pace rows for running.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
