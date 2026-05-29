import type { Activity, Challenge, User } from "@prisma/client";
import { scoreAgeGrade } from "./age-grade";
import { scorePersonalImprovement } from "./personal-improvement";
import { scoreCategoryActivity, getAgeCategory } from "./category";

export interface ScoreResult {
  score: number;
  metadata: Record<string, unknown>;
}

/**
 * Compute a challenge score for one athlete.
 *
 * @param challenge   The challenge record from the DB.
 * @param user        The athlete (needs dateOfBirth + sex for age-grade / category).
 * @param activities  Activities during the challenge window.
 * @param baseline    Activities during the baseline window (PI only).
 */
export function computeScore(
  challenge: Challenge,
  user: User,
  activities: Activity[],
  baseline: Activity[]
): ScoreResult {
  const cfg = (challenge.config ?? {}) as Record<string, unknown>;

  switch (challenge.scoringMethod) {
    case "PERSONAL_IMPROVEMENT": {
      const metric = (cfg.metric as string) ?? "distance";
      const baselineWeeks = (cfg.baselineWeeks as number) ?? 4;
      const score = scorePersonalImprovement(activities, baseline, {
        metric: metric as "distance" | "movingTime" | "pace" | "elevationGain",
        baselineWeeks,
      });
      return {
        score,
        metadata: { metric, baselineCount: baseline.length, activityCount: activities.length },
      };
    }

    case "AGE_GRADE": {
      const targetDistance = (cfg.targetDistance as number) ?? 5000;
      const tolerance = (cfg.tolerance as number) ?? 0.1;
      const scores = activities
        .map((a) =>
          scoreAgeGrade(a, user, { targetDistance, tolerance }, challenge.startDate)
        )
        .filter((s): s is number => s !== null);
      const score = scores.length > 0 ? Math.max(...scores) : 0;
      return {
        score,
        metadata: {
          targetDistance,
          qualifyingActivities: scores.length,
          bestAgeGrade: score,
        },
      };
    }

    case "CATEGORY": {
      const metric = (cfg.metric as string) ?? "distance";
      const category = getAgeCategory(user, challenge.startDate);
      const score = scoreCategoryActivity(activities, {
        metric: metric as "distance" | "movingTime" | "pace",
      });
      return {
        score,
        metadata: { category, metric, activityCount: activities.length },
      };
    }

    default:
      return { score: 0, metadata: {} };
  }
}
