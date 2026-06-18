"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { useTranslation } from "@/hooks/useTranslation";
import { useState } from "react";
import { useRouter } from "next/navigation";

/* ─── Types ─── */

interface Member {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
  groupName: string;
  isFollowing: boolean;
}

interface MembersResponse {
  members: Member[];
}

interface Friend {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
  followedAt: string;
}

interface FriendsResponse {
  friends: Friend[];
}

interface SearchUser {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
  isFollowing: boolean;
}

interface StravaClub {
  id: number;
  name: string;
  member_count: number;
  profile: string;
}

interface StravaClubMember {
  stravaId: number;
  name: string;
  image: string;
  isOnTriForce: boolean;
  triForceUserId: string | null;
  triForceName: string | null;
  triForceImage: string | null;
  isFollowing: boolean;
}

interface KudosFriend {
  id: string;
  name: string;
  count: number;
  latestDate: string; // ISO — used for client-side range filtering
  isChosen: boolean;
  triforceUserId: string | null;
  stravaAthleteId: string | null;
}

interface KudosResponse {
  kudosFriends: KudosFriend[];
  scanned: number | null;
  withKudos: number | null;
  uniquePeople: number;
  errors: number;
  fromCache: boolean;
  lastSync: string | null;
}

interface MutualFriend {
  id: string;
  name: string;
  kudosCount: number;
  latestKudosAt: string;
  isChosen: boolean;
  clubs: string[];
  triforceUserId: string | null;
}

interface MutualFriendsResponse {
  mutual: MutualFriend[];
  totalClubMembers: number;
  totalClusters: number;
}

const RANGE_OPTIONS = [
  { key: "1m", label: "חודש" },
  { key: "2m", label: "2 חודשים" },
  { key: "3m", label: "3 חודשים" },
  { key: "1y", label: "שנה" },
];

interface FeedActivity {
  id: string;
  name: string;
  sportType: string;
  startDate: string;
  distance: number;
  movingTime: number;
  elevationGain: number;
  averageHeartrate: number | null;
  user: { id: string; name: string | null; image: string | null };
}

interface FeedResponse {
  activities: FeedActivity[];
  hasMore: boolean;
  total: number;
}

const SPORT_EMOJI: Record<string, string> = {
  run: "🏃", ride: "🚴", swim: "🏊", walk: "🚶", hike: "🥾", other: "🏅",
};

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} ק"מ` : `${m.toFixed(0)} מ'`;
}
function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")} שע'` : `${m} דק'`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

/* ─── Shared Components ─── */

function Avatar({
  src,
  name,
  size = 40,
}: {
  src: string | null;
  name: string;
  size?: number;
}) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-full bg-gray-200 text-xs font-bold text-gray-500"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {name[0] || "?"}
        </div>
      )}
    </div>
  );
}

function FollowButton({
  memberId,
  isFollowing,
  onToggle,
}: {
  memberId: string;
  isFollowing: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/athlete/members/${memberId}/follow`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onMutate: () => setPending(true),
    onSettled: () => setPending(false),
    onSuccess: () => onToggle(),
  });

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={pending}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
        isFollowing
          ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
          : "bg-[#1D9E75] text-white shadow-md hover:bg-[#178c68]"
      } ${pending ? "opacity-60" : ""}`}
    >
      {pending
        ? t("common.loading")
        : isFollowing
        ? t("friends.following")
        : t("friends.follow")}
    </button>
  );
}

/* ─── Invite Section ─── */

function InviteSection() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const { data } = useQuery<{
    groups: { id: string; name: string; inviteCode: string }[];
  }>({
    queryKey: ["my-groups"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/groups");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const group = data?.groups?.[0];
  const inviteUrl = group
    ? `${window.location.origin}/join/${group.inviteCode}`
    : "";

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="text-center">
      <p className="text-xs font-bold text-gray-700">{t("friends.inviteTitle")}</p>
      <p className="mt-1 text-xs text-gray-500">{t("friends.inviteDesc")}</p>
      {group ? (
        <button
          onClick={handleCopy}
          className="mt-3 inline-flex items-center gap-1 rounded-xl bg-[#1D9E75] px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-[#178c68] active:scale-95"
        >
          {copied ? t("common.copied") : t("common.copy")}
        </button>
      ) : (
        <p className="mt-1 text-xs text-gray-400">{t("friends.noGroup")}</p>
      )}
    </div>
  );
}

/* ─── Strava Clubs Content ─── */

function StravaClubsContent({ onFollowToggle }: { onFollowToggle: () => void }) {
  const { t } = useTranslation();
  const [selectedClub, setSelectedClub] = useState<number | null>(null);

  const {
    data: clubsData,
    isLoading: clubsLoading,
    error: clubsError,
  } = useQuery<{ clubs: StravaClub[] }>({
    queryKey: ["strava-clubs"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/strava-clubs");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const {
    data: clubMembersData,
    isLoading: membersLoading,
  } = useQuery<{ members: StravaClubMember[] }>({
    queryKey: ["strava-club-members", selectedClub],
    queryFn: async () => {
      const res = await fetch(`/api/athlete/strava-clubs/${selectedClub}/members`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: selectedClub !== null,
  });

  if (clubsLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (clubsError) {
    return (
      <p className="py-4 text-center text-sm text-gray-500">
        {t("friends.clubsError")}
      </p>
    );
  }

  if (!clubsData || clubsData.clubs.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="text-4xl">🚴</div>
        <p className="mt-2 text-sm text-gray-500">{t("friends.noClubs")}</p>
      </div>
    );
  }

  if (selectedClub === null) {
    return (
      <div className="space-y-2">
        {clubsData.clubs.map((club) => (
          <button
            key={club.id}
            onClick={() => setSelectedClub(club.id)}
            className="flex w-full items-center gap-3 rounded-xl bg-[#FFF3E0] p-3 text-start transition-all hover:bg-[#FFE0B2] active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E65100]/10">
              {club.profile ? (
                <img src={club.profile} alt={club.name} className="h-full w-full rounded-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-[#E65100]">{club.name[0]}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900">{club.name}</p>
              <p className="text-xs text-[#E65100]">{club.member_count} {t("friends.clubMembers")}</p>
            </div>
            <span className="text-sm text-[#E65100]">←</span>
          </button>
        ))}
      </div>
    );
  }

  const selectedClubName = clubsData.clubs.find((c) => c.id === selectedClub)?.name || "";
  const onTriForceMembers = clubMembersData?.members.filter((m) => m.isOnTriForce) ?? [];

  return (
    <div>
      <button
        onClick={() => setSelectedClub(null)}
        className="mb-2 inline-flex items-center gap-1 rounded-lg bg-[#E65100]/10 px-3 py-1 text-xs font-bold text-[#E65100] transition-colors hover:bg-[#E65100]/20"
      >
        → {t("friends.backToClubs")}
      </button>
      <p className="mb-2 text-xs font-bold text-gray-500">
        {selectedClubName} · {t("friends.onTriForceTitle")}
      </p>

      {membersLoading && (
        <div className="flex justify-center py-4"><LoadingSpinner /></div>
      )}

      {!membersLoading && onTriForceMembers.length === 0 && (
        <div className="py-4 text-center">
          <div className="text-2xl">🔍</div>
          <p className="mt-1 text-xs text-gray-400">{t("friends.noClubFriendsOnTriForce")}</p>
        </div>
      )}

      {onTriForceMembers.length > 0 && (
        <div className="space-y-2">
          {onTriForceMembers.map((member) => (
            <div key={member.stravaId} className="flex items-center gap-3 rounded-xl bg-[#E1F5EE]/60 p-3">
              <Avatar src={member.triForceImage ?? member.image} name={member.triForceName ?? member.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">{member.triForceName ?? member.name}</p>
                <p className="text-xs font-bold text-[#1D9E75]">{t("friends.onTriForce")}</p>
              </div>
              {member.triForceUserId && (
                <FollowButton memberId={member.triForceUserId} isFollowing={member.isFollowing} onToggle={onFollowToggle} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Feed Content ─── */

function FeedContent() {
  const router = useRouter();
  const [range, setRange] = useState("1m");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const { data, isLoading, error, refetch } = useQuery<FeedResponse>({
    queryKey: ["feed", range],
    queryFn: async () => {
      const res = await fetch(`/api/athlete/feed?range=${range}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/athlete/sync", { method: "POST" });
      const d = await res.json() as { synced?: number };
      setSyncMsg(`סונכרנו ${d.synced ?? 0} פעילויות`);
      await refetch();
    } catch {
      setSyncMsg("שגיאה בסנכרון");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Range selector */}
      <div className="flex gap-1.5 rounded-xl bg-gray-100 p-1">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setRange(opt.key)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
              range === opt.key
                ? "bg-white text-[#1D9E75] shadow-sm"
                : "text-gray-500 hover:bg-white/50 hover:text-[#1D9E75]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Sync button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {syncMsg || (data ? `${data.total} פעילויות` : "")}
        </p>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-lg bg-[#1D9E75]/10 px-3 py-1.5 text-xs font-bold text-[#1D9E75] transition-all hover:bg-[#1D9E75]/20 disabled:opacity-50"
        >
          {syncing ? "מסנכרן..." : "🔄 סנכרן"}
        </button>
      </div>

      {isLoading && <div className="flex justify-center py-8"><LoadingSpinner /></div>}
      {error && <ErrorMessage message="שגיאה בטעינת הפיד" onRetry={() => refetch()} />}

      {!isLoading && !error && data?.activities.length === 0 && (
        <div className="py-8 text-center">
          <div className="text-4xl">🏃</div>
          <p className="mt-2 text-sm font-bold text-gray-700">הפיד ריק</p>
          <p className="mt-1 text-xs text-gray-500">
            כדי לראות פעילויות של חברים — שני הצעדים:
          </p>
          <div className="mx-auto mt-3 max-w-xs space-y-1 text-start">
            <p className="text-xs text-gray-500">1. לחץ <strong>סנכרן</strong> כדי לשמור את הפעילויות שלך</p>
            <p className="text-xs text-gray-500">2. עקוב אחרי חברים מטאב <strong>חברים</strong> — ברגע שגם הם יסנכרנו, תראה אותם כאן</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="mt-4 rounded-xl bg-[#1D9E75] px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#178c68] disabled:opacity-50"
          >
            {syncing ? "מסנכרן..." : "🔄 סנכרן עכשיו"}
          </button>
        </div>
      )}

      {data && data.activities.length > 0 && (
        <div className="space-y-2">
          {data.activities.map((act) => (
            <button
              key={act.id}
              onClick={() => router.push(`/members/${act.user.id}`)}
              className="flex w-full items-start gap-3 rounded-[16px] border border-gray-100 bg-white p-3 text-start shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:border-[#1D9E75]/20 hover:shadow-md active:scale-[0.98]"
            >
              {act.user.image ? (
                <img src={act.user.image} className="h-9 w-9 shrink-0 rounded-full object-cover" alt="" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1D9E75]/10 text-sm font-bold text-[#1D9E75]">
                  {act.user.name?.[0] ?? "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#1D9E75]">{act.user.name}</p>
                  <p className="shrink-0 text-[10px] text-gray-400">{fmtDate(act.startDate)}</p>
                </div>
                <p className="truncate text-sm font-semibold text-gray-900">
                  {SPORT_EMOJI[act.sportType] ?? "🏅"} {act.name}
                </p>
                <div className="mt-0.5 flex gap-3 text-xs text-gray-500">
                  {act.distance > 0 && <span>{fmtDist(act.distance)}</span>}
                  <span>{fmtTime(act.movingTime)}</span>
                  {act.elevationGain > 0 && <span>↑{act.elevationGain.toFixed(0)}מ'</span>}
                  {act.averageHeartrate && <span>❤️{act.averageHeartrate.toFixed(0)}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Kudos Friend Row ─── */

function KudosFriendRow({
  friend,
  onToggle,
}: {
  friend: KudosFriend;
  onToggle: (updated: { id: string; isChosen: boolean }) => void;
}) {
  const [pending, setPending] = useState(false);

  const handleToggle = async () => {
    setPending(true);
    try {
      const res = await fetch(`/api/athlete/strava-contacts/${friend.id}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json() as { isChosen: boolean };
        onToggle({ id: friend.id, isChosen: data.isChosen });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${friend.isChosen ? "bg-[#E1F5EE]/80" : "bg-[#FFF8E1]/80"}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${friend.isChosen ? "bg-[#1D9E75]/20 text-[#1D9E75]" : "bg-orange-100 text-orange-600"}`}>
        {friend.name[0] || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-900">{friend.name}</p>
        <p className="text-xs text-gray-400">{friend.count}x לייקים</p>
      </div>
      <button
        onClick={handleToggle}
        disabled={pending}
        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
          friend.isChosen
            ? "bg-[#1D9E75] text-white shadow-sm"
            : "bg-gray-100 text-gray-500 hover:bg-[#1D9E75]/10 hover:text-[#1D9E75]"
        }`}
      >
        {pending ? "..." : friend.isChosen ? "✓ חבר שלי" : "+ בחר"}
      </button>
    </div>
  );
}

/* ─── Kudos Friends Content ─── */

const RANGE_MS: Record<string, number> = {
  "1m": 30 * 24 * 60 * 60 * 1000,
  "2m": 60 * 24 * 60 * 60 * 1000,
  "3m": 90 * 24 * 60 * 60 * 1000,
  "1y": 365 * 24 * 60 * 60 * 1000,
};

function KudosFriendsContent() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [range, setRange] = useState("3m");
  const [refreshing, setRefreshing] = useState(false);

  // Reads from DB on initial load; auto-scans Strava if DB is empty.
  const { data, isLoading, error } = useQuery<KudosResponse>({
    queryKey: ["strava-kudos"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/strava-kudos");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    retry: 0,
  });

  const [refreshError, setRefreshError] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError(false);
    try {
      const res = await fetch("/api/athlete/strava-kudos?refresh=1");
      if (res.ok) {
        const fresh = await res.json() as KudosResponse;
        queryClient.setQueryData(["strava-kudos"], fresh);
      } else {
        setRefreshError(true);
      }
    } catch {
      setRefreshError(true);
    } finally {
      setRefreshing(false);
    }
  };

  const cutoff = Date.now() - (RANGE_MS[range] ?? RANGE_MS["3m"]);
  const allFriends = (data?.kudosFriends ?? []).filter(
    (f) => new Date(f.latestDate).getTime() >= cutoff
  );

  const rangeLabel = RANGE_OPTIONS.find((o) => o.key === range)?.label ?? range;

  const ScanButton = ({ label }: { label: string }) => (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className="mt-4 rounded-xl bg-[#1D9E75] px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#178c68] active:scale-95 disabled:opacity-50"
    >
      {refreshing ? "סורק..." : label}
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Range selector */}
      <div className="flex gap-1.5 rounded-xl bg-gray-100 p-1">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setRange(opt.key)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
              range === opt.key
                ? "bg-white text-[#1D9E75] shadow-sm"
                : "text-gray-500 hover:bg-white/50 hover:text-[#1D9E75]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="flex justify-center py-8"><LoadingSpinner /></div>}

      {/* Refresh error banner — shown above friends list so it doesn't replace it */}
      {refreshError && (
        <div className="flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2">
          <p className="text-xs text-orange-600">Strava מגביל בקשות — המתן כמה דקות ונסה שוב</p>
          <button
            onClick={() => setRefreshError(false)}
            className="text-xs text-orange-400 hover:text-orange-600"
          >✕</button>
        </div>
      )}

      {/* Initial load failed — DB was empty and Strava scan failed (rate limit) */}
      {!isLoading && error && !data && (
        <div className="py-8 text-center">
          <div className="text-4xl">⚠️</div>
          <p className="mt-2 text-sm font-bold text-gray-700">לא ניתן לטעון חברים</p>
          <p className="mt-1 text-xs text-gray-500">
            Strava מגביל בקשות — המתן כמה דקות ונסה שוב
          </p>
          <ScanButton label="🔄 סרוק Strava" />
        </div>
      )}

      {/* Loaded but no friends in selected range */}
      {!isLoading && !error && data && allFriends.length === 0 && (
        <div className="py-8 text-center">
          <div className="text-4xl">👍</div>
          {data.uniquePeople === 0 ? (
            <>
              <p className="mt-2 text-sm font-bold text-gray-700">עדיין אין חברים שמורים</p>
              <p className="mt-1 text-xs text-gray-500">לחץ לסרוק את Strava ולמצוא מי נתן לך לייק</p>
              <ScanButton label="🔄 סרוק Strava" />
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-gray-500">
                אין לייקים ב{rangeLabel} האחרון
              </p>
              <p className="mt-1 text-xs text-gray-400">
                יש {data.uniquePeople} חברים בסה״כ — נסה טווח ארוך יותר
              </p>
            </>
          )}
        </div>
      )}

      {/* Friends list */}
      {!isLoading && allFriends.length > 0 && (
        <>
          <div className="space-y-1">
            <p className="text-xs text-gray-400">
              {data!.fromCache
                ? `${data!.uniquePeople} חברים שמורים`
                : `סרקנו ${data!.scanned} פעילויות · ${data!.uniquePeople} חברים`}
              {data!.errors > 0 && <span className="text-red-400"> · {data!.errors} שגיאות</span>}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                🕐 עודכן:{" "}
                {data!.lastSync
                  ? new Date(data!.lastSync).toLocaleString("he-IL", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })
                  : "לא ידוע"}
              </p>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-500 transition-all hover:bg-gray-200 disabled:opacity-50"
              >
                {refreshing ? "סורק..." : "🔄 רענן"}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {allFriends.map((friend) => (
              <KudosFriendRow
                key={friend.id}
                friend={friend}
                onToggle={(updated) => {
                  queryClient.setQueryData(["strava-kudos"], (old: KudosResponse | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      kudosFriends: old.kudosFriends.map((f) =>
                        f.id === updated.id ? { ...f, isChosen: updated.isChosen } : f
                      ),
                    };
                  });
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Add Friend Modal ─── */

function AddFriendModal({
  open,
  onClose,
  onFollowToggle,
}: {
  open: boolean;
  onClose: () => void;
  onFollowToggle: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery<{ users: SearchUser[] }>({
    queryKey: ["user-search", query],
    queryFn: async () => {
      const res = await fetch(`/api/athlete/users/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: query.length >= 2,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{t("friends.addTitle")}</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100">✕</button>
        </div>

        <p className="mb-3 text-xs text-gray-500">{t("friends.searchHint")}</p>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("friends.searchPlaceholder")}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#1D9E75] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20"
          autoFocus
        />

        <div className="mt-4 max-h-72 overflow-y-auto">
          {isLoading && <div className="flex justify-center py-6"><LoadingSpinner /></div>}

          {query.length >= 2 && !isLoading && data && data.users.length === 0 && (
            <div className="py-4 text-center">
              <div className="text-2xl">🔍</div>
              <p className="mt-1 text-sm text-gray-500">{t("friends.noSearchResults")}</p>
              <p className="mt-1 text-xs text-gray-400">{t("friends.inviteHint")}</p>
            </div>
          )}

          {data && data.users.length > 0 && (
            <div className="space-y-2">
              {data.users.map((user) => (
                <div key={user.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                  <Avatar src={user.image} name={user.name || t("members.unknown")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900">{user.name || t("members.unknown")}</p>
                    {user.role === "COACH" && (
                      <span className="text-[10px] font-bold text-[#a34820]">{t("members.coach")}</span>
                    )}
                  </div>
                  <FollowButton memberId={user.id} isFollowing={user.isFollowing} onToggle={onFollowToggle} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <InviteSection />
        </div>
      </div>
    </div>
  );
}

/* ─── Mutual Friends Section ─── */

function MutualFriendsSection({
  onToggle,
}: {
  onToggle: (updated: { id: string; isChosen: boolean }) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<MutualFriendsResponse>({
    queryKey: ["mutual-friends"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/mutual-friends");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // cache 5 min — each scan is ~26 API calls
    retry: 0,
  });

  const handleRescan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/athlete/mutual-friends");
      if (res.ok) {
        const fresh = await res.json() as MutualFriendsResponse;
        queryClient.setQueryData(["mutual-friends"], fresh);
      }
    } finally {
      setScanning(false);
    }
  };

  if (isLoading || scanning) {
    return (
      <div className="rounded-xl border border-[#1D9E75]/20 bg-[#E1F5EE]/40 p-4 text-center">
        <LoadingSpinner />
        <p className="mt-2 text-xs text-[#1D9E75]">סורק מועדונים משותפים...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3 text-center">
        <p className="text-xs text-orange-600">לא ניתן לטעון חברים הדדיים</p>
        <button
          onClick={handleRescan}
          className="mt-2 rounded-lg bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700 hover:bg-orange-200"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (data.mutual.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-center">
        <p className="text-sm font-bold text-gray-600">לא נמצאו חברים הדדיים</p>
        <p className="mt-1 text-xs text-gray-400">
          {data.totalClusters} מועדונים · {data.totalClubMembers} חברים נבדקו
        </p>
        <button
          onClick={handleRescan}
          disabled={scanning}
          className="mt-2 rounded-lg bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500 hover:bg-gray-200 disabled:opacity-50"
        >
          {scanning ? "סורק..." : "🔄 סרוק מחדש"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[#1D9E75]">
          ⭐ חברים הדדיים ({data.mutual.length})
        </p>
        <button
          onClick={handleRescan}
          disabled={scanning}
          className="rounded-lg bg-[#1D9E75]/10 px-2 py-0.5 text-[10px] font-bold text-[#1D9E75] hover:bg-[#1D9E75]/20 disabled:opacity-50"
        >
          {scanning ? "סורק..." : "🔄"}
        </button>
      </div>
      <p className="text-[10px] text-gray-400">
        {data.totalClusters} מועדונים · {data.totalClubMembers.toLocaleString()} חברים
      </p>
      <div className="space-y-1.5">
        {data.mutual.map((f) => (
          <MutualFriendRow key={f.id} friend={f} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

function MutualFriendRow({
  friend,
  onToggle,
}: {
  friend: MutualFriend;
  onToggle: (updated: { id: string; isChosen: boolean }) => void;
}) {
  const [pending, setPending] = useState(false);

  const handleToggle = async () => {
    setPending(true);
    try {
      const res = await fetch(`/api/athlete/strava-contacts/${friend.id}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json() as { isChosen: boolean };
        onToggle({ id: friend.id, isChosen: data.isChosen });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${friend.isChosen ? "bg-[#E1F5EE]/90" : "bg-[#F9FBE7]/80"}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${friend.isChosen ? "bg-[#1D9E75]/20 text-[#1D9E75]" : "bg-[#C8E6C9] text-[#2E7D32]"}`}>
        {friend.name[0] || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-900">{friend.name}</p>
        <p className="truncate text-[10px] text-gray-400">
          {friend.kudosCount}x לייקים · {friend.clubs.slice(0, 2).join(", ")}
          {friend.clubs.length > 2 ? ` +${friend.clubs.length - 2}` : ""}
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={pending}
        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
          friend.isChosen
            ? "bg-[#1D9E75] text-white shadow-sm"
            : "bg-gray-100 text-gray-500 hover:bg-[#1D9E75]/10 hover:text-[#1D9E75]"
        }`}
      >
        {pending ? "..." : friend.isChosen ? "✓ חבר שלי" : "+ בחר"}
      </button>
    </div>
  );
}

/* ─── My Friends Content ─── */

function MyFriendsContent() {
  const queryClient = useQueryClient();

  // useQuery with same key — reactive, updates when KudosFriendRow toggles cache
  const { data: kudosData, isLoading: kudosLoading } = useQuery<KudosResponse>({
    queryKey: ["strava-kudos"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/strava-kudos");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const chosenFriends = kudosData?.kudosFriends.filter((f) => f.isChosen) ?? [];

  const { data: triforceData, isLoading: triforceLoading } = useQuery<FriendsResponse>({
    queryKey: ["friends"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/friends");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const triforceFriends = triforceData?.friends ?? [];

  const handleRemove = async (friend: KudosFriend) => {
    const res = await fetch(`/api/athlete/strava-contacts/${friend.id}`, { method: "POST" });
    if (res.ok) {
      queryClient.setQueryData(["strava-kudos"], (old: KudosResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          kudosFriends: old.kudosFriends.map((f) =>
            f.id === friend.id ? { ...f, isChosen: false } : f
          ),
        };
      });
    }
  };

  const handleStravaIdSaved = (contactId: string, stravaAthleteId: string) => {
    queryClient.setQueryData(["strava-kudos"], (old: KudosResponse | undefined) => {
      if (!old) return old;
      return {
        ...old,
        kudosFriends: old.kudosFriends.map(f =>
          f.id === contactId ? { ...f, stravaAthleteId } : f
        ),
      };
    });
  };

  const handleMutualToggle = (updated: { id: string; isChosen: boolean }) => {
    // sync the toggle into the kudos cache so "חברים שבחרתי" updates instantly
    queryClient.setQueryData(["strava-kudos"], (old: KudosResponse | undefined) => {
      if (!old) return old;
      return {
        ...old,
        kudosFriends: old.kudosFriends.map((f) =>
          f.id === updated.id ? { ...f, isChosen: updated.isChosen } : f
        ),
      };
    });
    // also sync isChosen in mutual-friends cache
    queryClient.setQueryData(["mutual-friends"], (old: MutualFriendsResponse | undefined) => {
      if (!old) return old;
      return {
        ...old,
        mutual: old.mutual.map((f) =>
          f.id === updated.id ? { ...f, isChosen: updated.isChosen } : f
        ),
      };
    });
  };

  if ((kudosLoading || triforceLoading) && !kudosData && !triforceData) {
    return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Mutual friends — always show at top */}
      <MutualFriendsSection onToggle={handleMutualToggle} />

      {chosenFriends.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400">חברים שבחרתי ({chosenFriends.length})</p>
          <div className="space-y-1.5">
            {chosenFriends.map((f) => (
              <ChosenFriendRow key={f.id} friend={f} onRemove={handleRemove} onStravaIdSaved={handleStravaIdSaved} />
            ))}
          </div>
        </div>
      )}

      {triforceFriends.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400">חברים ב-TriForce ({triforceFriends.length})</p>
          <div className="space-y-1.5">
            {triforceFriends.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl bg-[#E8F5E9]/60 p-3">
                <Avatar src={f.image} name={f.name || "?"} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900">{f.name || "?"}</p>
                  <p className="text-xs font-bold text-[#1D9E75]">TriForce</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {chosenFriends.length === 0 && triforceFriends.length === 0 && !kudosLoading && !triforceLoading && (
        <div className="border-t border-gray-100 pt-3 text-center">
          <p className="text-xs text-gray-400">
            לחץ <strong>+ בחר</strong> ליד חבר הדדי כדי להוסיפו לרשימה
          </p>
        </div>
      )}
    </div>
  );
}

function ChosenFriendRow({
  friend,
  onRemove,
  onStravaIdSaved,
}: {
  friend: KudosFriend;
  onRemove: (f: KudosFriend) => void;
  onStravaIdSaved: (id: string, stravaAthleteId: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [inputError, setInputError] = useState(false);

  const canCompare = !!(friend.triforceUserId || friend.stravaAthleteId);

  async function saveStravaId() {
    if (!urlInput.trim()) return;
    setSaving(true);
    setInputError(false);
    const res = await fetch(`/api/athlete/strava-contacts/${friend.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stravaUrl: urlInput }),
    });
    if (res.ok) {
      const data = await res.json() as { stravaAthleteId: string };
      onStravaIdSaved(friend.id, data.stravaAthleteId);
      setShowInput(false);
      setUrlInput("");
    } else {
      setInputError(true);
    }
    setSaving(false);
  }

  return (
    <div className="rounded-xl bg-[#E1F5EE]/70">
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D9E75]/20 text-sm font-bold text-[#1D9E75]">
          {friend.name[0] || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">{friend.name}</p>
          <p className="text-xs text-gray-400">{friend.count}x לייקים</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {canCompare ? (
            <Link
              href={`/compare/${friend.id}`}
              className="rounded-full bg-[#1D9E75] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#178c68] active:scale-95"
            >
              📊 השווה
            </Link>
          ) : (
            <button
              onClick={() => setShowInput(v => !v)}
              className="rounded-full bg-[#FC4C02]/10 px-2.5 py-1.5 text-[10px] font-bold text-[#FC4C02] transition-all hover:bg-[#FC4C02]/20 active:scale-95"
            >
              🔗 Strava
            </button>
          )}
          <button
            disabled={pending}
            onClick={async () => { setPending(true); await onRemove(friend); setPending(false); }}
            className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 active:scale-95 disabled:opacity-50"
          >
            {pending ? "..." : "הסר"}
          </button>
        </div>
      </div>

      {showInput && (
        <div className="border-t border-[#1D9E75]/10 px-3 pb-3 pt-2">
          <p className="mb-1.5 text-[10px] text-gray-500">
            הדבק קישור לפרופיל Strava של החבר/ה:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={e => { setUrlInput(e.target.value); setInputError(false); }}
              placeholder="https://www.strava.com/athletes/12345678"
              className={`min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-xs outline-none ${inputError ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"}`}
              onKeyDown={e => e.key === "Enter" && saveStravaId()}
            />
            <button
              onClick={saveStravaId}
              disabled={saving || !urlInput.trim()}
              className="shrink-0 rounded-lg bg-[#1D9E75] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {saving ? "..." : "שמור"}
            </button>
          </div>
          {inputError && <p className="mt-1 text-[10px] text-red-500">קישור לא תקין — נסה שוב</p>}
        </div>
      )}
    </div>
  );
}

/* ─── Compact Tab Bar ─── */

function TabBar({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  activeTab: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="rounded-xl bg-gray-100 p-1">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                isActive
                  ? "bg-white text-[#1D9E75] shadow-sm"
                  : "text-gray-500 hover:bg-white/50 hover:text-[#1D9E75]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

export default function MembersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("kudos");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["members"] });
    queryClient.invalidateQueries({ queryKey: ["friends"] });
    queryClient.invalidateQueries({ queryKey: ["user-search"] });
    queryClient.invalidateQueries({ queryKey: ["strava-club-members"] });
  };

  const {
    data: membersData,
    isLoading: membersLoading,
    error: membersError,
    refetch: refetchMembers,
  } = useQuery<MembersResponse>({
    queryKey: ["members"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/members");
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const tabs = [
    { key: "kudos", label: "נתנו לי לייק" },
    { key: "friends", label: "חברים שלי" },
    { key: "feed", label: "פיד" },
    { key: "clubs", label: t("friends.clubsTitle") },
    { key: "members", label: t("members.title") },
  ];

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">{t("friends.title")}</h1>
          <p className="mt-0.5 text-xs text-gray-400">{t("friends.subtitle")}</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1D9E75] text-lg text-white shadow-md transition-all hover:scale-105 hover:bg-[#178c68] active:scale-95"
        >
          +
        </button>
      </div>

      {/* Compact Tab Bar */}
      <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Active Section Content */}
      <div className="rounded-[20px] border border-gray-100 bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
        {activeTab === "friends" && (
          <MyFriendsContent />
        )}

        {activeTab === "feed" && <FeedContent />}
        {activeTab === "clubs" && <StravaClubsContent onFollowToggle={invalidate} />}
        {activeTab === "kudos" && <KudosFriendsContent />}

        {activeTab === "members" && (
          <>
            {membersLoading && <div className="flex justify-center py-8"><LoadingSpinner /></div>}
            {membersError && <ErrorMessage message={t("members.loadError")} onRetry={() => refetchMembers()} />}
            {membersData && membersData.members.length === 0 && (
              <div className="py-8 text-center">
                <div className="text-4xl">👥</div>
                <p className="mt-2 text-sm text-gray-500">{t("members.empty")}</p>
              </div>
            )}
            {membersData && membersData.members.length > 0 && (
              <div className="space-y-2">
                {membersData.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 rounded-xl bg-[#F3E5F5]/50 p-3">
                    <Avatar src={member.image} name={member.name || t("members.unknown")} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900">{member.name || t("members.unknown")}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">{member.groupName}</span>
                        {member.role === "COACH" && (
                          <span className="rounded-full bg-[#FAC775]/40 px-2 py-0.5 text-[10px] font-bold text-[#a34820]">{t("members.coach")}</span>
                        )}
                      </div>
                    </div>
                    <FollowButton memberId={member.id} isFollowing={member.isFollowing} onToggle={invalidate} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <AddFriendModal open={modalOpen} onClose={() => setModalOpen(false)} onFollowToggle={invalidate} />
    </div>
  );
}
