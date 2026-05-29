import tables from "./age-grade-tables.json";

export interface AgeGradeConfig {
  targetDistance: number; // meters
  tolerance: number;      // fraction e.g. 0.10 = ±10%
}

interface ScoredActivity {
  distance: number;
  movingTime: number;
}

interface ScoredUser {
  dateOfBirth: Date | null;
  sex: string | null;
}

function interpolateAgeFactor(sex: "M" | "F", age: number): number {
  const factors = tables.run.ageFactors[sex] as Record<string, number>;
  const ages = Object.keys(factors).map(Number).sort((a, b) => a - b);
  const lower = [...ages].reverse().find((a) => a <= age) ?? ages[0];
  const upper = ages.find((a) => a > age) ?? ages[ages.length - 1];
  if (lower === upper) return factors[String(lower)];
  const t = (age - lower) / (upper - lower);
  return factors[String(lower)] + t * (factors[String(upper)] - factors[String(lower)]);
}

function nearestWorldRecord(sex: "M" | "F", distance: number): { wr: number; refDistance: number } | null {
  const records = tables.run.worldRecords[sex] as Record<string, number>;
  const distances = Object.keys(records).map(Number);
  const closest = distances.reduce((a, b) =>
    Math.abs(b - distance) < Math.abs(a - distance) ? b : a
  );
  if (Math.abs(closest - distance) / distance > 0.20) return null;
  return { wr: records[String(closest)], refDistance: closest };
}

/** Returns age-grade % (0–100+) or null if prerequisites are missing. */
export function scoreAgeGrade(
  activity: ScoredActivity,
  user: ScoredUser,
  config: AgeGradeConfig,
  challengeStartDate: Date
): number | null {
  if (!user.dateOfBirth || (user.sex !== "M" && user.sex !== "F")) return null;

  const withinTolerance =
    Math.abs(activity.distance - config.targetDistance) / config.targetDistance <=
    config.tolerance;
  if (!withinTolerance) return null;

  const ageMs = challengeStartDate.getTime() - new Date(user.dateOfBirth).getTime();
  const age = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));

  const rec = nearestWorldRecord(user.sex, config.targetDistance);
  if (!rec) return null;

  const ageFactor = interpolateAgeFactor(user.sex, age);
  const ageGradedWR = rec.wr * ageFactor;

  return (ageGradedWR / activity.movingTime) * 100;
}
