"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface StavaFriend {
  stravaId: number;
  name: string;
  image: string;
  count: number;
}

interface FriendsResponse {
  friends: StavaFriend[];
  scanned: number;
  withKudos: number;
}

export default function FriendsPage() {
  const { data, isLoading, error, refetch } = useQuery<FriendsResponse>({
    queryKey: ["strava-friends-clean"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/strava-friends");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">חברים ב-Strava</h1>
          <p className="mt-0.5 text-xs text-gray-400">אנשים שנתנו לך לייק על Strava</p>
        </div>
        <Link href="/" className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200">
          חזרה
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <LoadingSpinner />
          <p className="text-sm text-gray-400">טוען מ-Strava, זה יכול לקחת כמה שניות...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">שגיאה בטעינת החברים מ-Strava</p>
          <button
            onClick={() => refetch()}
            className="mt-3 rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            נסה שוב
          </button>
        </div>
      )}

      {/* Results */}
      {data && (
        <>
          {/* Stats bar */}
          <div className="rounded-xl bg-gray-50 px-4 py-2 text-center text-xs text-gray-500">
            סרקנו <span className="font-bold text-gray-700">{data.scanned}</span> פעילויות ·{" "}
            <span className="font-bold text-gray-700">{data.withKudos}</span> עם לייקים ·{" "}
            <span className="font-bold text-[#1D9E75]">{data.friends.length}</span> חברים נמצאו
          </div>

          {/* Empty */}
          {data.friends.length === 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-10 text-center">
              <div className="text-5xl">👍</div>
              <p className="mt-3 text-sm font-semibold text-gray-700">לא נמצאו חברים</p>
              <p className="mt-1 text-xs text-gray-400">
                אף אחד לא נתן לייק לפעילויות האחרונות שלך ב-Strava
              </p>
            </div>
          )}

          {/* Friend list */}
          {data.friends.length > 0 && (
            <div className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-sm">
              {data.friends.map((friend, idx) => (
                <div
                  key={String(friend.stravaId)}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    idx < data.friends.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200">
                    {friend.image ? (
                      <img src={friend.image} alt={friend.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-500">
                        {friend.name?.[0] ?? "?"}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{friend.name}</p>
                  </div>

                  {/* Kudos count */}
                  <div className="flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-3 py-1">
                    <span className="text-sm">👍</span>
                    <span className="text-xs font-bold text-orange-500">{friend.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
