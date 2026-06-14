"use client";

import Link from "next/link";
import { useActivities } from "@/hooks/useActivities";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatDistance, formatRelativeTime, formatSportType } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

const DOT_COLORS: Record<string, string> = {
  run: "#D85A30", ride: "#185FA5", swim: "#1D9E75", walk: "#888", hike: "#888",
};

export default function RecentActivityCard() {
  const { data, isLoading } = useActivities(1, 3);
  const { locale } = useTranslation();

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-3">
      <div className="mb-2 text-sm font-semibold text-gray-900">פעילות אחרונה</div>
      {isLoading ? (
        <div className="flex justify-center py-4"><LoadingSpinner /></div>
      ) : !data?.activities?.length ? (
        <p className="text-xs text-gray-400">אין פעילויות עדיין</p>
      ) : (
        <div className="space-y-2">
          {data.activities.map((a: { id: string; name: string; sportType: string; distance: number; startDate: string }) => (
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
      <Link href="/activities" className="mt-2 block text-center text-xs font-medium text-[#1D9E75]">
        הצג הכל
      </Link>
    </div>
  );
}
