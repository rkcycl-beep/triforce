export type PIMetric = "distance" | "movingTime" | "pace" | "elevationGain";

export interface PIConfig {
  metric: PIMetric;
  baselineWeeks: number;
}

interface ScoredActivity {
  distance: number;
  movingTime: number;
  elevationGain: number;
  averageSpeed: number;
}

function extractMetric(a: ScoredActivity, metric: PIMetric): number {
  switch (metric) {
    case "distance":      return a.distance;
    case "movingTime":    return a.movingTime;
    case "pace":          return a.distance > 0 ? a.movingTime / (a.distance / 1000) : 0;
    case "elevationGain": return a.elevationGain;
  }
}

/** Returns improvement % — positive means improved, negative means regressed. */
export function scorePersonalImprovement(
  baseline: ScoredActivity[],
  challenge: ScoredActivity[],
  config: PIConfig
): number {
  if (baseline.length === 0 || challenge.length === 0) return 0;

  const { metric } = config;
  const higherBetter = metric === "distance" || metric === "elevationGain";

  const baselineVals = baseline.map((a) => extractMetric(a, metric));
  const challengeVals = challenge.map((a) => extractMetric(a, metric));

  const baselineBest = higherBetter ? Math.max(...baselineVals) : Math.min(...baselineVals);
  const challengeBest = higherBetter ? Math.max(...challengeVals) : Math.min(...challengeVals);

  if (baselineBest === 0) return 0;

  return higherBetter
    ? ((challengeBest - baselineBest) / baselineBest) * 100
    : ((baselineBest - challengeBest) / baselineBest) * 100;
}
