"use client";

import { useState, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

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

  const { data: challenges = [] } = useQuery({
    queryKey: ["coach-group-challenges", groupId],
    queryFn: () => fetchChallenges(groupId),
    staleTime: Infinity,
    enabled: !!group,
  });

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
              <p className="text-[10px] text-white/60">קוד הזמנה</p>
              <p className="text-base font-bold tracking-widest">{group.inviteCode}</p>
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

      {/* ── Add members picker ─────────────────────────────────────────────── */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          הוסף מתאמנים ({visibleCandidates.length})
        </p>

        {visibleCandidates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center text-sm text-gray-400">
            כל המשתמשים הרשומים כבר בקבוצה
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
                  <p className="truncate text-sm font-semibold text-gray-700">{c.name ?? "ספורטאי"}</p>
                  <p className="text-xs text-gray-400">{c.role === "COACH" ? "מאמן" : "מתאמן"}</p>
                </div>
                <button
                  onClick={() => addMember.mutate(c.id)}
                  disabled={pendingAdd === c.id}
                  className="shrink-0 rounded-xl bg-[#1D9E75] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#178c68] disabled:opacity-50"
                >
                  {pendingAdd === c.id ? "מוסיף..." : "+ הוסף"}
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
