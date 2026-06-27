"use client";

import { useState, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string | null;
  image: string | null;
  email?: string | null;
}

interface Membership {
  user: Member;
  role: string;
  joinedAt: string;
}

interface GroupDetail {
  id: string;
  name: string;
  inviteCode: string | null;
  memberCount: number;
  memberships: Membership[];
}

interface Candidate {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
}

interface Friend {
  id: string;
  name: string | null;
  image: string | null;
}

interface Invitation {
  id: string;
  invitee: { id: string; name: string | null; image: string | null };
  createdAt: string;
}

interface Challenge {
  id: string;
  name: string;
  scoringMethod: string;
  status: string;
  _count: { entries: number };
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchGroup(groupId: string): Promise<GroupDetail> {
  const res = await fetch(`/api/athlete/groups/${groupId}`);
  if (!res.ok) throw new Error("Failed to load group");
  const data = await res.json();
  const g = data.group;
  return {
    id: g.id,
    name: g.name,
    inviteCode: g.inviteCode,
    memberCount: g.memberCount,
    memberships: g.memberships ?? [],
  };
}

async function fetchCandidates(groupId: string): Promise<Candidate[]> {
  const res = await fetch(`/api/athlete/groups/${groupId}/non-members`);
  if (!res.ok) return [];
  return (await res.json()).users ?? [];
}

async function fetchFriends(): Promise<Friend[]> {
  const res = await fetch("/api/athlete/friends");
  if (!res.ok) return [];
  const data = await res.json();
  return (data.friends ?? []).map((f: { id: string; name?: string | null; image?: string | null }) => ({
    id: f.id,
    name: f.name ?? null,
    image: f.image ?? null,
  }));
}

async function fetchInvitations(groupId: string): Promise<Invitation[]> {
  const res = await fetch(`/api/coach/groups/${groupId}/invitations`);
  if (!res.ok) return [];
  return (await res.json()).invitations ?? [];
}

async function fetchChallenges(groupId: string): Promise<Challenge[]> {
  const res = await fetch(`/api/coach/groups/${groupId}/challenges`);
  if (!res.ok) return [];
  return (await res.json()).challenges ?? [];
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ user }: { user: Member }) {
  const initials = (user.name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (user.image) {
    return <img src={user.image} alt="" className="h-9 w-9 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1D9E75]/20 text-xs font-bold text-[#085041]">
      {initials}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CoachGroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [pendingAdd, setPendingAdd] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [pendingInvite, setPendingInvite] = useState<string | null>(null);
  const [activeAddTab, setActiveAddTab] = useState<"friends" | "users">("friends");
  const { copied, copy } = useCopyToClipboard();

  const { data: group, isLoading, isError } = useQuery({
    queryKey: ["coach-group", groupId],
    queryFn: () => fetchGroup(groupId),
    staleTime: Infinity,
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["coach-group-candidates", groupId],
    queryFn: () => fetchCandidates(groupId),
    staleTime: Infinity,
    enabled: !!group,
  });

  const { data: friends = [] } = useQuery({
    queryKey: ["coach-group-friends"],
    queryFn: fetchFriends,
    staleTime: Infinity,
    enabled: !!group,
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["coach-group-invitations", groupId],
    queryFn: () => fetchInvitations(groupId),
    staleTime: Infinity,
    enabled: !!group,
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ["coach-group-challenges", groupId],
    queryFn: () => fetchChallenges(groupId),
    staleTime: Infinity,
    enabled: !!group,
  });

  const memberIds = new Set(group?.memberships.map((m) => m.user.id) ?? []);
  const invitedIds = new Set(invitations.map((i) => i.invitee.id));

  const availableFriends = friends.filter(
    (f) => !memberIds.has(f.id) && !invitedIds.has(f.id)
  );

  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      setPendingAdd(userId);
      const res = await fetch(`/api/athlete/groups/${groupId}/members/${userId}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return userId;
    },
    onSuccess: (userId) => {
      setAddedIds((prev) => new Set([...prev, userId]));
      queryClient.invalidateQueries({ queryKey: ["coach-group", groupId] });
      setPendingAdd(null);
    },
    onError: () => setPendingAdd(null),
  });

  const inviteFriend = useMutation({
    mutationFn: async (userId: string) => {
      setPendingInvite(userId);
      const res = await fetch(`/api/coach/groups/${groupId}/invite/${userId}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-group-invitations", groupId] });
      setPendingInvite(null);
    },
    onError: () => setPendingInvite(null),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      setPendingRemove(userId);
      const res = await fetch(`/api/athlete/groups/${groupId}/members/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return userId;
    },
    onSuccess: (userId) => {
      queryClient.setQueryData(["coach-group", groupId], (old: GroupDetail | undefined) => {
        if (!old) return old;
        return {
          ...old,
          memberships: old.memberships.filter((m) => m.user.id !== userId),
          memberCount: old.memberCount - 1,
        };
      });
      // Re-enable removed user in candidate list
      setAddedIds((prev) => { const s = new Set(prev); s.delete(userId); return s; });
      queryClient.invalidateQueries({ queryKey: ["coach-group-candidates", groupId] });
      queryClient.invalidateQueries({ queryKey: ["coach-group-invitations", groupId] });
      setPendingRemove(null);
    },
    onError: () => setPendingRemove(null),
  });

  // ── Loading / error ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#1D9E75] border-t-transparent" />
      </div>
    );
  }

  if (isError || !group) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-red-500">הקבוצה לא נמצאה</p>
        <Link href="/coach/groups" className="mt-3 text-sm text-[#1D9E75] underline">חזרה לקבוצות</Link>
      </div>
    );
  }

  const athletes = group.memberships.filter((m) => m.role === "ATHLETE");
  const visibleCandidates = candidates.filter((c) => !addedIds.has(c.id));

  return (
    <div className="space-y-5 pb-10" dir="rtl">

      {/* Header */}
      <div className="-mx-4 -mt-6 bg-gradient-to-br from-[#085041] to-[#1D9E75] px-5 py-6 text-white">
        <Link href="/coach/groups" className="mb-3 inline-flex items-center gap-1 text-xs text-white/60 hover:text-white">
          → הקבוצות שלי
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{group.name}</h1>
            <p className="mt-1 text-sm text-white/70">{group.memberCount} חברים</p>
          </div>
          {group.inviteCode && (
            <div className="shrink-0 rounded-xl bg-white/15 px-3 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] text-white/60">{t("groups.inviteCode")}</p>
              <p className="text-base font-bold tracking-widest">{group.inviteCode}</p>
              <div className="mt-1.5 flex items-center justify-center gap-2">
                <button
                  onClick={() => copy(group.inviteCode!)}
                  className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-white/30"
                >
                  {copied ? t("common.copied") : t("common.copy")}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    t("groups.inviteWhatsAppText").replace("{code}", group.inviteCode!).replace("{url}", `https://triforce-iota.vercel.app`)
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-green-500/90 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-green-500"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Current members ────────────────────────────────────────────────── */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          חברים בקבוצה ({athletes.length})
        </p>

        {athletes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
            אין מתאמנים עדיין — הוסף מתחת
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {athletes.map(({ user, joinedAt }) => (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
              >
                <Avatar user={user} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800">{user.name ?? "ספורטאי"}</p>
                  {user.email && (
                    <p className="truncate text-xs text-gray-400">{user.email}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-xs text-gray-300">
                    {new Date(joinedAt).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}
                  </p>
                  <button
                    onClick={() => removeMember.mutate(user.id)}
                    disabled={pendingRemove === user.id}
                    className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-400 hover:bg-red-100 disabled:opacity-40"
                  >
                    {pendingRemove === user.id ? "..." : "הסר"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Pending invitations ────────────────────────────────────────────── */}
      {invitations.length > 0 && (
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("groups.pendingInvitations")} ({invitations.length})
          </p>
          <div className="flex flex-col gap-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-3"
              >
                <Avatar user={inv.invitee} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-700">{inv.invitee.name ?? t("dashboard.athleteFallback")}</p>
                  <p className="text-xs text-amber-600">{t("groups.waitingForResponse")}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Add members picker ─────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("groups.addMembers")}
          </p>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
            <button
              onClick={() => setActiveAddTab("friends")}
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors ${
                activeAddTab === "friends" ? "bg-white text-[#1D9E75] shadow-sm" : "text-gray-500"
              }`}
            >
              {t("groups.friendsTab")}
            </button>
            <button
              onClick={() => setActiveAddTab("users")}
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors ${
                activeAddTab === "users" ? "bg-white text-[#1D9E75] shadow-sm" : "text-gray-500"
              }`}
            >
              {t("groups.allUsersTab")}
            </button>
          </div>
        </div>

        {activeAddTab === "friends" ? (
          availableFriends.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center text-sm text-gray-400">
              {friends.length === 0 ? t("groups.noFriendsYet") : t("groups.allFriendsAdded")}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {availableFriends.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
                >
                  <Avatar user={f} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-700">{f.name ?? t("dashboard.athleteFallback")}</p>
                    <p className="text-xs text-gray-400">{t("groups.friend")}</p>
                  </div>
                  <button
                    onClick={() => inviteFriend.mutate(f.id)}
                    disabled={pendingInvite === f.id}
                    className="shrink-0 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    {pendingInvite === f.id ? t("common.sending") : t("groups.sendInvite")}
                  </button>
                </div>
              ))}
            </div>
          )
        ) : visibleCandidates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center text-sm text-gray-400">
            {t("groups.allUsersInGroup")}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleCandidates.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
              >
                <Avatar user={c} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-700">{c.name ?? t("dashboard.athleteFallback")}</p>
                  <p className="text-xs text-gray-400">{c.role === "COACH" ? t("members.coach") : t("dashboard.athleteFallback")}</p>
                </div>
                <button
                  onClick={() => addMember.mutate(c.id)}
                  disabled={pendingAdd === c.id}
                  className="shrink-0 rounded-xl bg-[#1D9E75] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#178c68] disabled:opacity-50"
                >
                  {pendingAdd === c.id ? t("groups.adding") : t("groups.addMember")}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Quick links ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/coach/groups/${groupId}/messages`}
          className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <span>💬</span> הודעות
        </Link>
        <Link
          href={`/coach/groups/${groupId}/events`}
          className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <span>📅</span> אירועים
        </Link>
      </div>

      {/* ── Challenges ─────────────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            אתגרים ({challenges.length})
          </p>
          <Link
            href={`/challenges/new?groupId=${groupId}`}
            className="text-xs font-bold text-[#1D9E75]"
          >
            + חדש
          </Link>
        </div>

        {challenges.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center">
            <p className="text-sm text-gray-400">אין אתגרים עדיין</p>
            <Link
              href={`/challenges/new?groupId=${groupId}`}
              className="mt-2 inline-block text-sm font-bold text-[#1D9E75]"
            >
              צור אתגר ראשון
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {challenges.map((ch) => (
              <Link
                key={ch.id}
                href={`/challenges/${ch.id}`}
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-800">{ch.name}</p>
                  <p className="text-xs text-gray-400">
                    {ch.scoringMethod === "GOAL_BASED" ? t("challenges.goalBased") : ch.scoringMethod.replace(/_/g, " ").toLowerCase()} · {ch._count.entries} {t("coach.participants")}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                  ch.status === "ACTIVE"
                    ? "bg-green-100 text-green-700"
                    : ch.status === "COMPLETED"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {ch.status === "ACTIVE" ? "פעיל" : ch.status === "COMPLETED" ? "הסתיים" : "טיוטה"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
