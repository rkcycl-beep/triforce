"use client";

import { useActivities } from "@/hooks/useActivities";
import { formatDistance } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface SportConfig {
  label: string;
  icon: string;
  color: string;
  bg: string;
  iconColor: string;
  weeklyBase: number;
}

const SPORTS: Record<string, SportConfig> = {
  run:  { label: "ריצה",    icon: "R", color: "#D85A30", bg: "#FAECE7", iconColor: "#993C1D", weeklyBase: 30000 },
  ride: { label: "אופניים", icon: "B", color: "#185FA5", bg: "#E6F1FB", iconColor: "#0C447C", weeklyBase: 100000 },
  swim: { label: "שחייה",   icon: "S", color: "#1D9E75", bg: "#E1F5EE", iconColor: "#085041", weeklyBase: 3000 },
};

function getWeekStart(): number {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

export default function WeeklyStatsCard() {
  const { data } = useActivities(1, 50);
  const { locale } = useTranslation();

  const weekStart = getWeekStart();
  const activities = data?.activities ?? [];

  const totals: Record<string, number> = {};
  for (const a of activities) {
    if (new Date(a.startDate).getTime() < weekStart) continue;
    const type = (a.sportType ?? "").toLowerCase();
    const key = ["virtualride", "ebikeride"].includes(type) ? "ride" : type;
    if (key in SPORTS) totals[key] = (totals[key] ?? 0) + (a.distance ?? 0);
  }

  const activeSports = Object.keys(SPORTS).filter(k => (totals[k] ?? 0) > 0);
  if (!data || activeSports.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-3">
      <div className="mb-3 text-sm font-semibold text-gray-900">השבוע שלך</div>
      {activeSports.map(key => {
        const cfg = SPORTS[key];
        const dist = totals[key];
        const pct = Math.min(100, Math.round((dist / cfg.weeklyBase) * 100));
        return (
          <div key={key} className="flex items-center gap-2 py-1.5">
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
              style={{ background: cfg.bg, color: cfg.iconColor }}
            >
              {cfg.icon}
            </div>
            <div className="w-12 shrink-0 text-xs text-gray-500">{cfg.label}</div>
            <div className="min-w-0 flex-1">
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: cfg.color }}
                />
              </div>
            </div>
            <div className="w-16 shrink-0 text-end text-xs font-semibold text-gray-700">
              {formatDistance(dist)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
