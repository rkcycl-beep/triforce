"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useActivities } from "@/hooks/useActivities";
import { useChallenges } from "@/hooks/useChallenges";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatDistance } from "@/lib/utils";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: activities, isLoading: actLoading } = useActivities(1, 10);
  const { data: challenges, isLoading: chalLoading } = useChallenges();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(session?.lastStravaSync ?? null);

  // Fetch fresh lastStravaSync from DB (session token may be stale)
  useEffect(() => {
    fetch("/api/athlete/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.lastStravaSync) {
          setLastSync(data.lastStravaSync);
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const firstName = session?.user?.name?.split(" ")[0] ?? "ספורטאי";
  const hasStrava = Boolean(session?.accessToken);

  // Most recent activity date = last time user uploaded to Strava
  const mostRecentActivity = activities?.activities?.[0];
  const stravaUpdateText = mostRecentActivity?.startDate
    ? new Date(mostRecentActivity.startDate).toLocaleString("he-IL", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const lastSyncText = lastSync
    ? new Date(lastSync).toLocaleString("he-IL", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const activeChallenge = challenges?.find?.((c: { status: string }) => c.status === "ACTIVE");

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/athlete/sync", { method: "POST" });
      if (res.ok) {
        window.location.reload();
      } else {
        alert("סנכרון נכשל. נסה שוב.");
        setSyncing(false);
      }
    } catch {
      alert("סנכרון נכשל. נסה שוב.");
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-3 pb-20">
      {/* Green header bar */}
      <div className="-mx-4 -mt-4 bg-[#1D9E75] px-4 py-4 text-white">
        <div className="text-base font-semibold">שלום, {firstName}</div>
        <div className="text-xs opacity-85">TriForce · קבוצת האימונים</div>
      </div>

      {/* Strava sync card */}
      {hasStrava && (
        <div className="flex items-center justify-between rounded-lg border border-[#9FE1CB] bg-[#E1F5EE] px-3 py-2">
          <div className="text-xs text-[#085041]">
            <span className="block font-bold">Strava מחובר</span>
            <div className="flex flex-wrap gap-x-2 opacity-80">
              {stravaUpdateText && (
                <span>עודכן ב-Strava: {stravaUpdateText}</span>
              )}
              {stravaUpdateText && lastSyncText && (
                <span>·</span>
              )}
              {lastSyncText && (
                <span>סונכרן: {lastSyncText}</span>
              )}
              {!stravaUpdateText && !lastSyncText && (
                <span>אין נתוני סנכרון</span>
              )}
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-md bg-[#1D9E75] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          >
            {syncing ? "מסנכרן..." : "סנכרן"}
          </button>
        </div>
      )}

      {/* Active challenge hero */}
      {activeChallenge ? (
        <Link href={`/challenges/${activeChallenge.id}`}>
          <div className="rounded-xl bg-[#085041] p-4 text-white">
            <div className="text-xs opacity-70">אתגר פעיל</div>
            <div className="text-base font-bold">{activeChallenge.name}</div>
            <div className="mt-2 flex gap-2">
              {(activeChallenge.sportTypes ?? ["run"]).map((s: string) => (
                <span key={s} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                  {sportName(s)}
                </span>
              ))}
              <span className="rounded-full bg-[#FAC775]/30 px-2 py-0.5 text-[10px] text-[#ffe066]">
                {daysLeft(activeChallenge.endDate)} ימים נותרו
              </span>
            </div>
          </div>
        </Link>
      ) : chalLoading ? (
        <div className="flex justify-center py-4">
          <LoadingSpinner />
        </div>
      ) : (
        <Link href="/challenges">
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center transition-colors hover:bg-gray-50">
            <p className="text-sm text-gray-500">אין אתגר פעיל כרגע</p>
            <p className="mt-1 text-xs text-[#1D9E75]">צפה באתגרים ←</p>
          </div>
        </Link>
      )}

      {/* Progress card */}
      <div className="rounded-xl border border-[#eeeeee] bg-white p-3">
        <div className="mb-3 text-sm font-semibold text-gray-900">
          ההתקדמות שלך · Age Grade: <span className="text-[#1D9E75]">74%</span>
        </div>
        <ProgressRow icon="R" iconBg="#FAECE7" iconColor="#993C1D" label="ריצה" pct={80} value="32/40 קמ" color="#D85A30" />
        <ProgressRow icon="B" iconBg="#E6F1FB" iconColor="#0C447C" label="אופניים" pct={60} value="120/200 קמ" color="#185FA5" />
        <ProgressRow icon="S" iconBg="#E1F5EE" iconColor="#085041" label="שחייה" pct={40} value="3.2/8 קמ" color="#1D9E75" />
      </div>

      {/* Recent activity card */}
      <div className="rounded-xl border border-[#eeeeee] bg-white p-3">
        <div className="mb-2 text-sm font-semibold text-gray-900">פעילות אחרונה</div>
        {actLoading ? (
          <div className="flex justify-center py-4"><LoadingSpinner /></div>
        ) : activities?.activities?.length === 0 ? (
          <p className="text-xs text-gray-400">אין פעילויות עדיין</p>
        ) : (
          <div className="space-y-2">
            {activities?.activities?.slice(0, 3).map((a: { id: string; name: string; sportType: string; distance: number; startDate: string }) => (
              <Link key={a.id} href={`/activities/${a.id}`} className="flex items-center gap-2 py-1">
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: dotColor(a.sportType) }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-gray-900">{a.name}</div>
                  <div className="text-[10px] text-gray-400">{formatDistance(a.distance, "he")}</div>
                </div>
                <div className="text-[10px] text-gray-400">{timeAgo(a.startDate)}</div>
              </Link>
            ))}
          </div>
        )}
        <Link href="/activities" className="mt-2 block text-center text-xs font-medium text-[#1D9E75]">
          הצג הכל
        </Link>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-2">
        <Link href="/messages" className="rounded-xl border border-[#eeeeee] bg-white p-3 text-center">
          <div className="text-lg">💬</div>
          <div className="text-xs font-semibold text-gray-900">הודעות</div>
        </Link>
        <Link href="/events" className="rounded-xl border border-[#eeeeee] bg-white p-3 text-center">
          <div className="text-lg">📅</div>
          <div className="text-xs font-semibold text-gray-900">אירועים</div>
        </Link>
      </div>
    </div>
  );
}

function ProgressRow({ icon, iconBg, iconColor, label, pct, value, color }: {
  icon: string; iconBg: string; iconColor: string; label: string; pct: number; value: string; color: string;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="w-10 shrink-0 text-xs text-gray-500">{label}</div>
      <div className="min-w-0 flex-1">
        <div className="h-1.5 w-full rounded-full bg-gray-100">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
      <div className="w-14 shrink-0 text-right text-xs font-semibold text-gray-700">{value}</div>
    </div>
  );
}

function sportName(type: string): string {
  const map: Record<string, string> = { run: "ריצה", ride: "אופניים", swim: "שחייה", walk: "הליכה", hike: "טיול" };
  return map[type] ?? type;
}

function dotColor(type: string): string {
  const map: Record<string, string> = { run: "#D85A30", ride: "#185FA5", swim: "#1D9E75", walk: "#888", hike: "#888" };
  return map[type] ?? "#888";
}

function daysLeft(endDate: string): number {
  const days = Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000));
  return days;
}

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 60) return `לפני ${mins} דק'`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `לפני ${days} ימים`;
  return new Date(dateStr).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}
