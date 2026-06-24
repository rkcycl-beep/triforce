"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface KudosFriend {
  id: string;
  name: string;
  count: number;
  latestDate: string;
  isChosen: boolean;
  triforceUserId: string | null;
  stravaAthleteId: string | null;
}

interface FriendsResponse {
  kudosFriends: KudosFriend[];
  scanned: number | null;
  withKudos: number | null;
  uniquePeople: number;
  errors: number;
  fromCache: boolean;
  lastSync: string | null;
}

export default function FriendsPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<FriendsResponse>({
    queryKey: ["strava-kudos"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/strava-kudos");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: Infinity,
  });

  const [isScanning, setIsScanning] = useState(false);

  const handleRefresh = async () => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/athlete/strava-kudos?refresh=1");
      if (!res.ok) throw new Error("Refresh failed");
      await refetch(); // re-read from DB after scan
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

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
          <p className="text-sm text-gray-400">טוען חברים...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">שגיאה בטעינת החברים</p>
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
            <span className="font-bold text-[#1D9E75]">{data.uniquePeople}</span> חברים נמצאו
            {data.lastSync && (
              <span className="me-1"> · נסרק לאחרונה: {new Date(data.lastSync).toLocaleDateString("he-IL")}</span>
            )}
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isScanning || isFetching}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {isScanning || isFetching ? "טוען..." : "רענן מ-Strava"}
          </button>

          {/* Empty */}
          {data.kudosFriends.length === 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-10 text-center">
              <div className="text-5xl">👍</div>
              <p className="mt-3 text-sm font-semibold text-gray-700">לא נמצאו חברים</p>
              <p className="mt-1 text-xs text-gray-400">
                אף אחד לא נתן לייק לפעילויות האחרונות שלך ב-Strava
              </p>
            </div>
          )}

          {/* Friend list */}
          {data.kudosFriends.length > 0 && (
            <div className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-sm">
              {data.kudosFriends.map((friend, idx) => (
                <div
                  key={friend.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    idx < data.kudosFriends.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-orange-200 text-sm font-bold text-orange-600">
                    {friend.name?.[0] ?? "?"}
                  </div>

                  {/* Name */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{friend.name}</p>
                    {friend.triforceUserId && (
                      <p className="text-xs text-green-600">ב-TriForce</p>
                    )}
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
