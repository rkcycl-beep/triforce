"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface FriendActivity {
  id: string;
  name: string;
  sportType: string;
  startDate: string;
  distance: number;
  movingTime: number;
  elevationGain: number;
  averageHeartrate: number | null;
  averageSpeed: number;
}

interface FriendProfile {
  user: { id: string; name: string | null; image: string | null };
  activities: FriendActivity[];
}

const SPORT_EMOJI: Record<string, string> = {
  run: "🏃", ride: "🚴", swim: "🏊", walk: "🚶", hike: "🥾", other: "🏅",
};

function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} ק"מ` : `${m.toFixed(0)} מ'`;
}

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")} שע'` : `${m} דק'`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

export default function FriendProfilePage({
  params,
}: {
  params: { userId: string };
}) {
  const router = useRouter();

  const { data, isLoading } = useQuery<FriendProfile>({
    queryKey: ["friend-profile", params.userId],
    queryFn: async () => {
      const res = await fetch(`/api/athlete/users/${params.userId}/activities`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
        >
          ←
        </button>
        {data?.user && (
          <div className="flex items-center gap-2">
            {data.user.image ? (
              <img src={data.user.image} className="h-9 w-9 rounded-full object-cover" alt="" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1D9E75]/10 text-sm font-bold text-[#1D9E75]">
                {data.user.name?.[0] ?? "?"}
              </div>
            )}
            <h1 className="text-lg font-extrabold text-gray-900">{data.user.name}</h1>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {!isLoading && data?.activities.length === 0 && (
        <div className="rounded-[20px] border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl">🏅</div>
          <p className="mt-2 text-sm text-gray-500">אין פעילויות שמורות עדיין</p>
          <p className="mt-1 text-xs text-gray-400">החבר צריך לסנכרן את הפעילויות שלו</p>
        </div>
      )}

      {data && data.activities.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">{data.activities.length} פעילויות אחרונות</p>
          {data.activities.map((act) => (
            <div
              key={act.id}
              className="rounded-[16px] border border-gray-100 bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F5EE] text-lg">
                  {SPORT_EMOJI[act.sportType] ?? "🏅"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">{act.name}</p>
                  <p className="text-xs text-gray-400">{formatDate(act.startDate)}</p>
                </div>
              </div>
              <div className="mt-2 flex gap-4 text-xs text-gray-500">
                {act.distance > 0 && <span>{formatDistance(act.distance)}</span>}
                <span>{formatTime(act.movingTime)}</span>
                {act.elevationGain > 0 && <span>↑ {act.elevationGain.toFixed(0)} מ'</span>}
                {act.averageHeartrate && <span>❤️ {act.averageHeartrate.toFixed(0)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
