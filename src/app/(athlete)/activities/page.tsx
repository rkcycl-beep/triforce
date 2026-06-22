"use client";

import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useActivities } from "@/hooks/useActivities";
import ActivityCard from "@/components/activities/ActivityCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EmptyState from "@/components/ui/EmptyState";
import type { Activity } from "@/types/activity";

// ─── Period helpers ───────────────────────────────────────────────────────────

type PeriodKey = "3m" | "6m" | "1y" | "2y" | "all" | "custom";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "3m",     label: "3 חודשים" },
  { key: "6m",     label: "חצי שנה"  },
  { key: "1y",     label: "שנה"      },
  { key: "2y",     label: "שנתיים"   },
  { key: "all",    label: "הכל"      },
  { key: "custom", label: "בחר..."   },
];

function cutoffDate(key: PeriodKey): Date | null {
  if (key === "all" || key === "custom") return null;
  const months = key === "3m" ? 3 : key === "6m" ? 6 : key === "1y" ? 12 : 24;
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

function applyFilter(
  activities: Activity[],
  period: PeriodKey,
  customFrom: string,
  customTo: string
): Activity[] {
  if (period === "all") return activities;

  if (period === "custom") {
    const from = customFrom ? new Date(customFrom).getTime() : null;
    const to   = customTo   ? new Date(customTo).getTime()   : null;
    return activities.filter(a => {
      const t = new Date(a.startDate).getTime();
      if (from && t < from) return false;
      if (to   && t > to + 86_400_000) return false; // inclusive end day
      return true;
    });
  }

  const cutoff = cutoffDate(period)!.getTime();
  return activities.filter(a => new Date(a.startDate).getTime() >= cutoff);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const [period,     setPeriod]     = useState<PeriodKey>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [syncing,    setSyncing]    = useState(false);
  const [syncMsg,    setSyncMsg]    = useState("");
  const [lastSync,   setLastSync]   = useState<string | null>(null);

  // Fetch the last sync timestamp once on mount
  useEffect(() => {
    fetch("/api/athlete/me")
      .then(r => r.json())
      .then(d => { if (d.lastStravaSync) setLastSync(d.lastStravaSync); })
      .catch(() => {});
  }, []);

  // Fetch ALL activities once — no date filter, no re-fetch on filter change
  const { data, isLoading, error } = useActivities({ page: 1, perPage: 500 });
  const allActivities = data?.activities ?? [];

  // Filter in memory — instant, no network request
  const activities = useMemo(
    () => applyFilter(allActivities, period, customFrom, customTo),
    [allActivities, period, customFrom, customTo]
  );

  async function handleSync() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res  = await fetch("/api/athlete/sync", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setSyncMsg(`סנכרון הצליח — ${json.synced} פעילויות`);
        setLastSync(new Date().toISOString());
        // Invalidate so the full list re-fetches with fresh data
        queryClient.invalidateQueries({ queryKey: ["activities"] });
      } else {
        setSyncMsg("הסנכרון נכשל, נסה שוב");
      }
    } catch {
      setSyncMsg("שגיאת רשת");
    } finally {
      setSyncing(false);
    }
  }

  const lastSyncLabel = lastSync
    ? new Date(lastSync).toLocaleString("he-IL", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-4 pb-24" dir="rtl">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#085041]">היסטוריה</h1>
          {lastSyncLabel && (
            <p className="mt-0.5 text-[11px] text-gray-400">
              סונכרן לאחרונה: {lastSyncLabel}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-50"
          >
            {syncing ? "מסנכרן..." : "🔄 סנכרן"}
          </button>
          <p className="text-[10px] text-gray-400">מוסיף אימונים חדשים מ-Strava</p>
        </div>
      </div>

      {syncMsg && (
        <p className={`rounded-xl px-3 py-2 text-xs font-medium ${
          syncMsg.includes("הצליח") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"
        }`}>
          {syncMsg}
        </p>
      )}

      {/* Info note */}
      <p className="rounded-xl bg-gray-50 px-3 py-2 text-[11px] text-gray-400">
        הפילטר פועל על הנתונים שכבר נשמרו — אין צורך לסנכרן מחדש כדי לסנן לפי תאריך
      </p>

      {/* Period filter — switches instantly, no network call */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              period === p.key
                ? "bg-[#1D9E75] text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {period === "custom" && (
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="mb-1 text-[11px] text-gray-400">מתאריך</p>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1D9E75]"
            />
          </div>
          <div className="flex-1">
            <p className="mb-1 text-[11px] text-gray-400">עד תאריך</p>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1D9E75]"
            />
          </div>
        </div>
      )}

      {/* Count */}
      {!isLoading && allActivities.length > 0 && (
        <p className="text-xs text-gray-400">
          {activities.length} פעילויות
          {activities.length < allActivities.length &&
            ` (מתוך ${allActivities.length} בסה"כ)`}
        </p>
      )}

      {/* List */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {error && <ErrorMessage message="שגיאה בטעינת הפעילויות" />}

      {!isLoading && activities.length === 0 && !error && (
        <EmptyState
          title="אין פעילויות בתקופה זו"
          message={
            period === "all"
              ? "לחץ סנכרן כדי למשוך נתונים מ-Strava"
              : "שנה את טווח התאריכים או בחר תקופה אחרת"
          }
        />
      )}

      {activities.length > 0 && (
        <div className="space-y-3">
          {activities.map(a => (
            <ActivityCard key={a.id} activity={a} />
          ))}
        </div>
      )}
    </div>
  );
}
