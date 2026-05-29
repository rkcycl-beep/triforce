export type CategoryMetric = "distance" | "movingTime" | "pace";

export interface CategoryConfig {
  metric: CategoryMetric;
}

interface ScoredActivity {
  distance: number;
  movingTime: number;
  averageSpeed: number;
}

interface ScoredUser {
  dateOfBirth: Date | null;
  sex: string | null;
}

/** Returns an age/sex category label for display on the leaderboard. */
export function getAgeCategory(user: ScoredUser, asOf: Date): string {
  const sex = user.sex === "M" ? "Men" : user.sex === "F" ? "Women" : "Open";
  if (!user.dateOfBirth) return `${sex} (age unknown)`;

  const ageMs = asOf.getTime() - new Date(user.dateOfBirth).getTime();
  const age = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));

  if (age < 30) return `${sex} 18–29`;
  if (age < 40) return `${sex} 30–39`;
  if (age < 50) return `${sex} 40–49`;
  if (age < 60) return `${sex} 50–59`;
  return `${sex} 60+`;
}

/**
 * Returns a score where HIGHER always means better, so the leaderboard
 * can sort DESC uniformly.
 *
 * distance  → best single-activity distance (m)
 * movingTime → negated best time so faster = higher score
 * pace       → best average speed (m/s, higher = faster)
 */
export function scoreCategoryActivity(
  activities: ScoredActivity[],
  config: CategoryConfig
): number {
  if (activities.length === 0) return 0;

  switch (config.metric) {
    case "distance":
      return Math.max(...activities.map((a) => a.distance));
    case "movingTime":
      return -Math.min(...activities.map((a) => a.movingTime));
    case "pace":
      return Math.max(...activities.map((a) => a.averageSpeed));
  }
}
