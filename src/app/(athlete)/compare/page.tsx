"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface ChosenFriend {
  id: string;
  name: string;
  kudosCount: number;
  triforceUserId: string | null;
  stravaAthleteId: string | null;
}

const AVATAR_COLORS = ["#D85A30", "#185FA5", "#1D9E75", "#8B5CF6", "#F59E0B", "#EC4899"];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function initials(name: string): string {
  const parts = name.trim().split(" ");
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const SPORTS = [
  { key: "run",  emoji: "🏃", label: "ריצה",    bg: "bg-[#1D9E75]",  shadow: "shadow-[0_4px_12px_rgba(29,158,117,0.3)]" },
  { key: "ride", emoji: "🚴", label: "אופניים", bg: "bg-[#185FA5]",  shadow: "shadow-[0_4px_12px_rgba(24,95,165,0.3)]" },
  { key: "swim", emoji: "🏊", label: "שחייה",   bg: "bg-[#0ea5e9]",  shadow: "shadow-[0_4px_12px_rgba(14,165,233,0.3)]" },
] as const;

export default function CompareHubPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scanResult, setScanResult] = useState<{ total: number; matched: number } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["chosen-friends"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/chosen-friends");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ friends: ChosenFriend[] }>;
    },
  });

  const friends = data?.friends ?? [];
  const comparableCount = friends.filter(f => f.triforceUserId || f.stravaAthleteId).length;

  async function scanFollowing() {
    setScanning(true);
    setScanResult(null);
    setScanError(null);
    try {
      const res = await fetch("/api/athlete/strava-following");
      if (res.ok) {
        const result = await res.json() as { total: number; matched: number };
        setScanResult(result);
        await queryClient.invalidateQueries({ queryKey: ["chosen-friends"] });
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string };
        if (res.status === 429) {
          setScanError("Strava הגביל בקשות — נסה שוב בעוד 15 דקות");
        } else {
          setScanError(body.error ?? "שגיאה בסריקה, נסה שוב");
        }
      }
    } catch {
      setScanError("שגיאת רשת — בדוק חיבור לאינטרנט");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">📊 השוואה</h1>
        {!isLoading && comparableCount > 0 && (
          <p className="mt-0.5 text-xs text-gray-400">
            {comparableCount} {comparableCount === 1 ? "חבר" : "חברים"} זמינים להשוואה
          </p>
        )}
      </div>

      {/* Scan result banner */}
      {/* Invite banner */}
      {session?.user?.id && (() => {
        const inviteUrl = `https://triforce-iota.vercel.app/invite/${session.user.id}`;
        const waMsg = `🏃 TriForce – ספורט חברתי 🚴\n\nהצטרף/י אלי לאפליקציה!\n🏃 ריצה · 🚴 אופניים · 🏊 שחייה · 🏋️ כושר\n\n📊 השווה ביצועים עם חברים\n🏆 אתגרים קבוצתיים\n\n👇\n${inviteUrl}`;
        const waUrl = `https://wa.me/?text=${encodeURIComponent(waMsg)}`;
        return (
          <div className="overflow-hidden rounded-xl border border-[#1D9E75]/20 bg-[#E1F5EE]/60">
            <div className="px-4 pt-3 pb-2">
              <p className="text-sm font-bold text-[#085041]">🔗 הזמן חברים להשוואה</p>
              <p className="text-xs text-gray-500">הם מתחברים → כפתור ההשוואה נדלק אוטומטית</p>
            </div>
            <div className="flex gap-2 px-3 pb-3">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#1da851] active:scale-95"
              >
                📲 שלח בווטסאפ
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(inviteUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); })}
                className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-all active:scale-95 ${copied ? "bg-[#1D9E75] text-white" : "bg-white text-[#1D9E75]"}`}
              >
                {copied ? "✓ הועתק!" : "📋 העתק קישור"}
              </button>
            </div>
          </div>
        );
      })()}

      {scanResult && (
        <div className="rounded-xl bg-[#E1F5EE] px-4 py-2.5 text-sm font-medium text-[#085041]">
          נמצאו {scanResult.total} חברי מועדון ב-Strava
          {scanResult.matched > 0 && ` · ${scanResult.matched} גם על TriForce 🎉`}
        </div>
      )}

      {scanError && (
        <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
          ⚠️ {scanError}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      )}

      {!isLoading && friends.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
          <div className="mb-3 text-4xl">🤝</div>
          <p className="text-sm font-medium text-gray-500">אין חברים נבחרים עדיין</p>
          <p className="mt-1 text-xs text-gray-400">בחר חברים מדף החברים כדי להשוות</p>
          <Link
            href="/members"
            className="mt-4 inline-block rounded-xl bg-[#1D9E75] px-5 py-2.5 text-sm font-bold text-white shadow-md"
          >
            + הוסף חברים
          </Link>
        </div>
      )}

      {friends.map(friend => (
        <div
          key={friend.id}
          className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
        >
          {/* Friend header row */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: avatarColor(friend.name) }}
            >
              {initials(friend.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-gray-900">{friend.name}</p>
              {friend.triforceUserId ? (
                <p className="text-[11px] font-medium text-[#1D9E75]">✓ TriForce</p>
              ) : friend.stravaAthleteId ? (
                <p className="text-[11px] font-medium text-[#FC4C02]">✓ Strava</p>
              ) : (
                <p className="text-[11px] text-gray-400">סרוק מועדונים להשוואה</p>
              )}
            </div>
          </div>

          {/* Sport buttons */}
          {(friend.triforceUserId || friend.stravaAthleteId) ? (
            <div className="grid grid-cols-3 gap-2 border-t border-gray-50 p-3">
              {SPORTS.map(sport => (
                <Link
                  key={sport.key}
                  href={`/compare/${friend.id}?sport=${sport.key}`}
                  className={`flex flex-col items-center gap-1 rounded-xl ${sport.bg} ${sport.shadow} py-3 text-white transition-all active:scale-95`}
                >
                  <span className="text-xl">{sport.emoji}</span>
                  <span className="text-[11px] font-bold">{sport.label}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border-t border-gray-50 px-4 py-3 text-center text-xs text-gray-400">
              לחץ &quot;סרוק עוקבים&quot; למעלה כדי לאפשר השוואה
            </div>
          )}
        </div>
      ))}

      {friends.length > 0 && (
        <Link
          href="/members"
          className="block text-center text-xs font-medium text-[#1D9E75]"
        >
          + הוסף חברים נוספים
        </Link>
      )}
    </div>
  );
}
