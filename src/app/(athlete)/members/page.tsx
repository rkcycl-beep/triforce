"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { useTranslation } from "@/hooks/useTranslation";
import { useState } from "react";

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
  stravaId: number;
  name: string;
  image: string;
  isOnTriForce: boolean;
  triForceUserId: string | null;
  triForceName: string | null;
  triForceImage: string | null;
  isFollowing: boolean;
}

function Avatar({ src, name, size = 48 }: { src: string | null; name: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[#E1F5EE] text-lg font-bold text-[#1D9E75]"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        name[0] || "?"
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
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        isFollowing
          ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          : "bg-[#1D9E75] text-white hover:bg-[#178c68]"
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

function InviteSection() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const { data } = useQuery<{ groups: { id: string; name: string; inviteCode: string }[] }>({
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
      <p className="text-xs font-medium text-gray-700">{t("friends.inviteTitle")}</p>
      <p className="text-xs text-gray-500">{t("friends.inviteDesc")}</p>
      {group ? (
        <button
          onClick={handleCopy}
          className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[#1D9E75] bg-[#E1F5EE] px-3 py-1.5 text-xs font-medium text-[#1D9E75] hover:bg-[#d4f0e3]"
        >
          {copied ? t("common.copied") : t("common.copy")}
        </button>
      ) : (
        <p className="mt-1 text-xs text-gray-400">{t("friends.noGroup")}</p>
      )}
    </div>
  );
}

function StravaClubsSection({ onFollowToggle }: { onFollowToggle: () => void }) {
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
      <div className="flex justify-center py-6">
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
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center">
        <p className="text-sm text-gray-500">{t("friends.noClubs")}</p>
      </div>
    );
  }

  // Club selection view
  if (selectedClub === null) {
    return (
      <div className="space-y-2">
        {clubsData.clubs.map((club) => (
          <button
            key={club.id}
            onClick={() => setSelectedClub(club.id)}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-start hover:bg-gray-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
              {club.profile ? (
                <img src={club.profile} alt={club.name} className="h-full w-full rounded-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-gray-500">{club.name[0]}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">{club.name}</p>
              <p className="text-xs text-gray-500">
                {club.member_count} {t("friends.clubMembers")}
              </p>
            </div>
            <span className="text-lg text-gray-400">←</span>
          </button>
        ))}
      </div>
    );
  }

  // Members view
  const selectedClubName = clubsData.clubs.find((c) => c.id === selectedClub)?.name || "";
  const onTriForceMembers = clubMembersData?.members.filter((m) => m.isOnTriForce) ?? [];

  return (
    <div>
      <button
        onClick={() => setSelectedClub(null)}
        className="mb-3 text-sm font-medium text-[#1D9E75] hover:underline"
      >
        ← {t("friends.backToClubs")}
      </button>
      <p className="mb-2 text-sm font-semibold text-gray-900">
        {selectedClubName} — {t("friends.onTriForceTitle")}
      </p>

      {membersLoading && (
        <div className="flex justify-center py-6">
          <LoadingSpinner />
        </div>
      )}

      {!membersLoading && onTriForceMembers.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-500">
          {t("friends.noClubFriendsOnTriForce")}
        </p>
      )}

      {onTriForceMembers.length > 0 && (
        <div className="space-y-2">
          {onTriForceMembers.map((member) => (
            <div
              key={member.stravaId}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3"
            >
              <Avatar
                src={member.triForceImage ?? member.image}
                name={member.triForceName ?? member.name}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {member.triForceName ?? member.name}
                </p>
                <p className="text-xs text-[#1D9E75]">{t("friends.onTriForce")}</p>
              </div>
              {member.triForceUserId && (
                <FollowButton
                  memberId={member.triForceUserId}
                  isFollowing={member.isFollowing}
                  onToggle={onFollowToggle}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KudosFriendsSection({ onFollowToggle }: { onFollowToggle: () => void }) {
  const { t } = useTranslation();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<{ kudosFriends: KudosFriend[] }>({
    queryKey: ["strava-kudos"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/strava-kudos");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const onTriForceFriends = data?.kudosFriends.filter((f) => f.isOnTriForce) ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage
        message={t("friends.kudosError")}
        onRetry={() => refetch()}
      />
    );
  }

  if (onTriForceFriends.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center">
        <p className="text-sm text-gray-500">{t("friends.noKudosFriends")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {onTriForceFriends.map((friend) => (
        <div
          key={friend.stravaId}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3"
        >
          <Avatar
            src={friend.triForceImage ?? friend.image}
            name={friend.triForceName ?? friend.name}
            size={40}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {friend.triForceName ?? friend.name}
            </p>
            <p className="text-xs text-[#1D9E75]">{t("friends.likedYourActivity")}</p>
          </div>
          {friend.triForceUserId && (
            <FollowButton
              memberId={friend.triForceUserId}
              isFollowing={friend.isFollowing}
              onToggle={onFollowToggle}
            />
          )}
        </div>
      ))}
    </div>
  );
}

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
      <div className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{t("friends.addTitle")}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <p className="mb-3 text-xs text-gray-500">
          {t("friends.searchHint")}
        </p>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("friends.searchPlaceholder")}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1D9E75] focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
          autoFocus
        />

        <div className="mt-4 max-h-72 overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center py-6">
              <LoadingSpinner />
            </div>
          )}

          {query.length >= 2 && !isLoading && data && data.users.length === 0 && (
            <div className="py-4 text-center">
              <p className="text-sm text-gray-500">{t("friends.noSearchResults")}</p>
              <p className="mt-1 text-xs text-gray-400">{t("friends.inviteHint")}</p>
            </div>
          )}

          {data && data.users.length > 0 && (
            <div className="space-y-2">
              {data.users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3"
                >
                  <Avatar src={user.image} name={user.name || t("members.unknown")} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm">
                      {user.name || t("members.unknown")}
                    </p>
                    {user.role === "COACH" && (
                      <span className="text-[10px] font-medium text-[#a34820]">
                        {t("members.coach")}
                      </span>
                    )}
                  </div>
                  <FollowButton
                    memberId={user.id}
                    isFollowing={user.isFollowing}
                    onToggle={onFollowToggle}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite link */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <InviteSection />
        </div>
      </div>
    </div>
  );
}

export default function MembersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* ── Friends You Follow ── */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("friends.title")}</h1>
            <p className="text-sm text-gray-500">{t("friends.subtitle")}</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="shrink-0 rounded-full bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white hover:bg-[#178c68] active:scale-95 transition-colors"
          >
            {t("friends.addButton")}
          </button>
        </div>

        {friendsLoading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        )}

        {friendsError && (
          <ErrorMessage
            message={t("friends.loadError")}
            onRetry={() => refetchFriends()}
          />
        )}

        {friendsData && friendsData.friends.length === 0 && (
          <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
            <p className="text-sm text-gray-500">{t("friends.empty")}</p>
          </div>
        )}

        {friendsData && friendsData.friends.length > 0 && (
          <div className="mt-3 space-y-3">
            {friendsData.friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center gap-3 rounded-xl border border-[#1D9E75]/20 bg-[#E1F5EE]/30 p-4"
              >
                <Avatar src={friend.image} name={friend.name || t("members.unknown")} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">
                    {friend.name || t("members.unknown")}
                  </p>
                  <p className="text-xs text-[#1D9E75] font-medium">
                    {t("friends.followingYouBack")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Strava Clubs Discovery ── */}
      <section>
        <h2 className="text-lg font-bold text-gray-900">{t("friends.clubsTitle")}</h2>
        <p className="text-sm text-gray-500">{t("friends.clubsSubtitle")}</p>
        <div className="mt-3">
          <StravaClubsSection onFollowToggle={invalidate} />
        </div>
      </section>

      {/* ── Kudos Friends Discovery ── */}
      <section>
        <h2 className="text-lg font-bold text-gray-900">{t("friends.kudosTitle")}</h2>
        <p className="text-sm text-gray-500">{t("friends.kudosSubtitle")}</p>
        <div className="mt-3">
          <KudosFriendsSection onFollowToggle={invalidate} />
        </div>
      </section>

      {/* ── Group Members (discover + follow) ── */}
      <section>
        <h2 className="text-lg font-bold text-gray-900">{t("members.title")}</h2>
        <p className="text-sm text-gray-500">{t("members.discoverSubtitle")}</p>

        {membersLoading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        )}

        {membersError && (
          <ErrorMessage
            message={t("members.loadError")}
            onRetry={() => refetchMembers()}
          />
        )}

        {membersData && membersData.members.length === 0 && (
          <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
            <p className="text-sm text-gray-500">{t("members.empty")}</p>
          </div>
        )}

        {membersData && membersData.members.length > 0 && (
          <div className="mt-3 space-y-3">
            {membersData.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4"
              >
                <Avatar src={member.image} name={member.name || t("members.unknown")} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">
                    {member.name || t("members.unknown")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {member.groupName}
                    {member.role === "COACH" && (
                      <span className="me-1 rounded-full bg-[#FAC775]/30 px-2 py-0.5 text-[10px] font-medium text-[#a34820]">
                        {t("members.coach")}
                      </span>
                    )}
                  </p>
                </div>
                <FollowButton
                  memberId={member.id}
                  isFollowing={member.isFollowing}
                  onToggle={invalidate}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <AddFriendModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onFollowToggle={invalidate}
      />
    </div>
  );
}
