"use client";

/**
 * MetricChart — a simple responsive line chart for a single UserMetric type.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useTranslation } from "@/hooks/useTranslation";

interface MetricPoint {
  date: string;
  value: number;
}

interface MetricChartProps {
  data: MetricPoint[];
  unit: string;
  color?: string;
}

export default function MetricChart({ data, unit, color = "#3B82F6" }: MetricChartProps) {
  const { t, locale } = useTranslation();

  const sorted = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const localeString = locale === "he" ? "he-IL" : "en-US";

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={sorted} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) =>
              new Date(value).toLocaleDateString(localeString, { month: "short", day: "numeric" })
            }
            tick={{ fontSize: 12, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value: any) => {
              const formatted = Array.isArray(value) ? value.join(", ") : value ?? "";
              return [`${formatted} ${unit}`, t("metrics.value")];
            }}
            labelFormatter={(label: any) =>
              new Date(label).toLocaleDateString(localeString, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            }
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
              fontSize: "14px",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
