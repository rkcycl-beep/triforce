"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useActivities } from "@/hooks/useActivities";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatDistance, formatRelativeTime, formatSportType } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

const DOT_COLORS: Record<string, string> = {
  run: "#D85A30", ride: "#185FA5", swim: "#1D9E75", walk: "#888", hike: "#888",
};

const SPORT_FILTERS = ["all", "run", "ride", "swim", "other"] as const;
const RANGE_FILTERS = [
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "all", days: 365 * 10 },
] as const;

export default function RecentActivityCard() {
  const { t, locale } = useTranslation();
  const [sportFilter, setSportFilter] = useState<(typeof SPORT_FILTERS)[number]>("all");
  const [rangeFilter, setRangeFilter] = useState<(typeof RANGE_FILTERS)[number]["key"]>("30d");
  const [visibleCount, setVisibleCount] = useState(5);

  const days = RANGE_FILTERS.find((r) => r.key === rangeFilter)?.days ?? 30;
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - days);

  const { data, isLoading } = useActivities({ page: 1, perPage: 50, from, to });

  const filtered = useMemo(() => {
    const list = data?.activities ?? [];
    if (sportFilter === "all") return list;
    if (sportFilter === "other") {
      return list.filter((a) => !["run", "ride", "swim"].includes(a.sportType?.toLowerCase()));
    }
    return list.filter((a) => a.sportType?.toLowerCase() === sportFilter);
  }, [data, sportFilter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">{t("dashboard.recentActivity")}</div>
        <Link href="/activities" className="text-xs text-[#1D9E75]">{t("dashboard.viewAll")} ←</Link>
      </div>

      {/* Filters */}
      <div className="mb-3 space-y-2">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
          {SPORT_FILTERS.map((key) => (
            <button
              key={key}
              onClick={() => { setSportFilter(key); setVisibleCount(5); }}
              className={`flex-1 rounded-md py-1 text-[10px] font-bold transition-colors ${
                sportFilter === key ? "bg-white text-[#1D9E75] shadow-sm" : "text-gray-500"
              }`}
            >
              {t(`dashboard.sport.${key}`)}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
          {RANGE_FILTERS.map((r) => (
            <button
              key={r.key}
              onClick={() => { setRangeFilter(r.key); setVisibleCount(5); }}
              className={`flex-1 rounded-md py-1 text-[10px] font-bold transition-colors ${
                rangeFilter === r.key ? "bg-white text-[#1D9E75] shadow-sm" : "text-gray-500"
              }`}
            >
              {t(`dashboard.range.${r.key}`)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><LoadingSpinner /></div>
      ) : visible.length === 0 ? (
        <p className="py-4 text-center text-xs text-gray-400">{t("dashboard.noActivitiesInRange")}</p>
      ) : (
        <div className="space-y-2">
          {visible.map((a) => (
            <Link key={a.id} href={`/activities/${a.id}`} className="flex items-center gap-2 py-1">
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: DOT_COLORS[a.sportType?.toLowerCase()] ?? "#888" }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-gray-900">{a.name}</div>
                <div className="text-[10px] text-gray-400">
                  {formatSportType(a.sportType, locale)} · {formatDistance(a.distance, locale)}
                </div>
              </div>
              <div className="text-[10px] text-gray-400">{formatRelativeTime(a.startDate, locale)}</div>
            </Link>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + 5)}
          className="mt-2 block w-full text-center text-xs font-medium text-[#1D9E75]"
        >
          {t("dashboard.loadMore")}
        </button>
      )}

      <p className="mt-3 border-t border-gray-100 pt-2 text-[10px] leading-relaxed text-gray-400">
        ℹ️ {t("dashboard.localDataNote")}
      </p>
    </div>
  );
}
