"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useActivities } from "@/hooks/useActivities";
import ActivityCard from "@/components/activities/ActivityCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EmptyState from "@/components/ui/EmptyState";

// ─── Period helpers ───────────────────────────────────────────────────────────

type PeriodKey = "3m" | "6m" | "1y" | "2y" | "all" | "custom";

interface Period {
  key: PeriodKey;
  label: string;
}

const PERIODS: Period[] = [
  { key: "3m",  label: "3 חודשים" },
  { key: "6m",  label: "חצי שנה"  },
  { key: "1y",  label: "שנה"      },
  { key: "2y",  label: "שנתיים"   },
  { key: "all", label: "הכל"      },
  { key: "custom", label: "בחר..."   },
];

function periodToDates(key: PeriodKey): { from: Date | null; to: Date | null } {
  if (key === "all" || key === "custom") return { from: null, to: null };
  const now = new Date();
  const months = key === "3m" ? 3 : key === "6m" ? 6 : key === "1y" ? 12 : 24;
  const from = new Date(now);
  from.setMonth(from.getMonth() - months);
  return { from, to: null };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const [period, setPeriod]         = useState<PeriodKey>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [syncing,    setSyncing]    = useState(false);
  const [syncMsg,    setSyncMsg]    = useState("");
  const [lastSync,   setLastSync]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/athlete/me")
      .then(r => r.json())
      .then(d => { if (d.lastStravaSync) setLastSync(d.lastStravaSync); })
      .catch(() => {});
  }, []);

  // Resolve date range
  const isCustom = period === "custom";
  const { from: presetFrom, to: presetTo } = periodToDates(period);
  const from = isCustom ? (customFrom ? new Date(customFrom) : null) : presetFrom;
  const to   = isCustom ? (customTo   ? new Date(customTo)   : null) : presetTo;

  const { data, isLoading, error } = useActivities({ page: 1, perPage: 500, from, to });
  const activities = data?.activities ?? [];

  async function handleSync() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/athlete/sync", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setSyncMsg(`סנכרון הצליח — ${json.synced} פעילויות`);
        setLastSync(new Date().toISOString());
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#085041]">היסטוריה</h1>
          {lastSyncLabel && (
            <p className="mt-0.5 text-[11px] text-gray-400">
              עודכן לאחרונה: {lastSyncLabel}
            </p>
          )}
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-50"
        >
          {syncing ? "מסנכרן..." : "🔄 סנכרן"}
        </button>
      </div>

      {syncMsg && (
        <p className={`rounded-xl px-3 py-2 text-xs font-medium ${syncMsg.includes("הצליח") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"}`}>
          {syncMsg}
        </p>
      )}

      {/* Period filter */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
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

      {/* Custom date inputs */}
      {isCustom && (
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
      {!isLoading && activities.length > 0 && (
        <p className="text-xs text-gray-400">{activities.length} פעילויות</p>
      )}

      {/* List */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {error && <ErrorMessage message="שגיאה בטעינת הפעילויות" />}

      {!isLoading && activities.length === 0 && (
        <EmptyState
          title="אין פעילויות בתקופה זו"
          message="שנה את טווח התאריכים או לחץ סנכרן כדי למשוך נתונים מ-Strava"
        />
      )}

      {activities.length > 0 && (
        <div className="space-y-3">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
}
