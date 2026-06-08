/**
 * StatCard.tsx — Displays a single statistic (like heart rate or distance).
 * Server Component — just displays data, no interactivity.
 *
 * Usage:
 *   <StatCard label="Avg Heart Rate" value="142" unit="bpm" trend="up" />
 */

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  trend?: "up" | "down" | "neutral";
}

const trendColors = {
  up: "text-green-600",
  down: "text-red-500",
  neutral: "text-gray-400",
};

const trendArrows = {
  up: "^",
  down: "v",
  neutral: "-",
};

export default function StatCard({
  label,
  value,
  unit,
  trend = "neutral",
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
        <span className={`me-auto text-sm font-medium ${trendColors[trend]}`}>
          {trendArrows[trend]}
        </span>
      </div>
    </div>
  );
}
