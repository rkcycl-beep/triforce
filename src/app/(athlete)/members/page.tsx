"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  name: string;
  count: number;
  latestDate: string; // ISO — used for client-side range filtering
}

interface KudosResponse {
  kudosFriends: KudosFriend[];
  scanned: number;
  withKudos: number;
  uniquePeople: number;
  errors: number;
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

/* ─── Kudos Friends Content ─── */

const RANGE_MS: Record<string, number> = {
  "1m": 30 * 24 * 60 * 60 * 1000,
  "2m": 60 * 24 * 60 * 60 * 1000,
  "3m": 90 * 24 * 60 * 60 * 1000,
  "1y": 365 * 24 * 60 * 60 * 1000,
};

function KudosFriendsContent() {
  const { t } = useTranslation();
  const [range, setRange] = useState("3m");

  // Single fetch covers 3 months. Range selector filters client-side — no extra Strava calls.
  const { data, isLoading, error, refetch } = useQuery<KudosResponse>({
    queryKey: ["strava-kudos"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/strava-kudos");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const cutoff = Date.now() - (RANGE_MS[range] ?? RANGE_MS["3m"]);
  const allFriends = (data?.kudosFriends ?? []).filter(
    (f) => new Date(f.latestDate).getTime() >= cutoff
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

      {error && (
        <div className="rounded-xl bg-orange-50 p-4 text-center">
          <p className="text-sm font-bold text-orange-700">לא ניתן לטעון כרגע</p>
          <p className="mt-1 text-xs text-orange-500">Strava מגביל בקשות — המתן כמה דקות ולחץ נסה שוב</p>
          <button
            onClick={() => refetch()}
            className="mt-2 rounded-lg bg-orange-100 px-4 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-200"
          >
            נסה שוב
          </button>
        </div>
      )}

      {!isLoading && !error && allFriends.length === 0 && (
        <div className="py-8 text-center">
          <div className="text-4xl">👍</div>
          <p className="mt-2 text-sm text-gray-500">{t("friends.noKudosFriends")}</p>
          {data && (
            <p className="mt-1 text-xs text-gray-400">
              סרקנו {data.scanned} פעילויות · {data.withKudos} עם לייקים
            </p>
          )}
        </div>
      )}

      {!isLoading && allFriends.length > 0 && (
        <>
          <p className="text-center text-xs text-gray-400">
            סרקנו {data!.scanned} פעילויות · {data!.withKudos} עם לייקים · {data!.uniquePeople} חברים
            {data!.errors > 0 && <span className="text-red-400"> · {data!.errors} שגיאות</span>}
          </p>
          <div className="space-y-2">
            {allFriends.map((friend) => (
              <div key={friend.name} className="flex items-center gap-3 rounded-xl bg-[#FFF8E1]/80 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
                  {friend.name[0] || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900">{friend.name}</p>
                  <p className="text-xs text-[#B7892B]">{t("friends.likedYourActivity")}</p>
                </div>
                <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-500">
                  {friend.count}x
                </span>
              </div>
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
    data: friendsData,
    isLoading: friendsLoading,
    error: friendsError,
    refetch: refetchFriends,
  } = useQuery<FriendsResponse>({
    queryKey: ["friends"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/friends");
      if (!res.ok) throw new Error("Failed to fetch friends");
      return res.json();
    },
  });

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
    { key: "feed", label: "פיד" },
    { key: "friends", label: t("friends.title") },
    { key: "kudos", label: t("friends.kudosTitle") },
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
          <>
            {friendsLoading && <div className="flex justify-center py-8"><LoadingSpinner /></div>}
            {friendsError && <ErrorMessage message={t("friends.loadError")} onRetry={() => refetchFriends()} />}
            {friendsData && friendsData.friends.length === 0 && (
              <div className="py-8 text-center">
                <div className="text-4xl">🤝</div>
                <p className="mt-2 text-sm text-gray-500">{t("friends.empty")}</p>
              </div>
            )}
            {friendsData && friendsData.friends.length > 0 && (
              <div className="space-y-2">
                {friendsData.friends.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-3 rounded-xl bg-[#E1F5EE]/60 p-3">
                    <Avatar src={friend.image} name={friend.name || t("members.unknown")} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900">{friend.name || t("members.unknown")}</p>
                      <p className="text-xs font-bold text-[#1D9E75]">{t("friends.followingYouBack")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
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
