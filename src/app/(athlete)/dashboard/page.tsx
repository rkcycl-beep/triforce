"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import CoachWing from "@/components/dashboard/CoachWing";
import FriendsWing from "@/components/dashboard/FriendsWing";
import WeeklyStatsCard from "@/components/dashboard/WeeklyStatsCard";
import RecentActivityCard from "@/components/dashboard/RecentActivityCard";
import UpcomingEventsSection from "@/components/dashboard/UpcomingEventsSection";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/athlete/me")
      .then(r => r.json())
      .then(data => { if (data.lastStravaSync) setLastSync(data.lastStravaSync); })
      .catch(() => {});
  }, []);

  const firstName = session?.user?.name?.split(" ")[0] ?? t("dashboard.athleteFallback");

  const lastSyncText = lastSync
    ? new Date(lastSync).toLocaleString("he-IL", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : null;

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/athlete/sync", { method: "POST" });
      if (res.ok) window.location.reload();
      else { alert(t("dashboard.syncFailed")); setSyncing(false); }
    } catch {
      alert(t("dashboard.syncFailed"));
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="-mx-4 -mt-4 bg-[#1D9E75] px-4 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">{t("dashboard.greeting", { name: firstName })}</div>
            {lastSyncText && (
              <div className="mt-0.5 text-[10px] opacity-75">
                {t("dashboard.synced")} {lastSyncText}
              </div>
            )}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-md bg-white/20 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          >
            {syncing ? t("dashboard.syncing") : t("dashboard.sync")}
          </button>
        </div>
      </div>

      {/* Trainings first */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-700">{t("dashboard.myTrainings")}</h2>
        <div className="space-y-3">
          <UpcomingEventsSection />
          <RecentActivityCard />
        </div>
      </section>

      {/* Coach group — compact */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-700">{t("dashboard.withMyCoach")}</h2>
        <CoachWing />
      </section>

      {/* Friends — compact strip */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">{t("dashboard.withMyFriends")}</h2>
          <Link href="/members" className="text-xs text-[#1D9E75]">{t("dashboard.allFriends")} ←</Link>
        </div>
        <FriendsWing compact />
      </section>

      {/* Weekly stats */}
      <WeeklyStatsCard />

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-2">
        <Link href="/activities" className="rounded-xl border border-[#eeeeee] bg-white p-3 text-center">
          <div className="text-lg">🏃</div>
          <div className="text-xs font-semibold text-gray-700">{t("dashboard.history")}</div>
        </Link>
        <Link href="/events" className="rounded-xl border border-[#eeeeee] bg-white p-3 text-center">
          <div className="text-lg">📅</div>
          <div className="text-xs font-semibold text-gray-700">{t("dashboard.events")}</div>
        </Link>
        <Link href="/settings" className="rounded-xl border border-[#eeeeee] bg-white p-3 text-center">
          <div className="text-lg">⚙️</div>
          <div className="text-xs font-semibold text-gray-700">{t("dashboard.settings")}</div>
        </Link>
      </div>
    </div>
  );
}
