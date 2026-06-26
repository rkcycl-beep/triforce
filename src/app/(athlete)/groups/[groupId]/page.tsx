"use client";

import { useState, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/hooks/useTranslation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
}

interface GroupDetail {
  id: string;
  name: string;
  type: "COACH" | "PEER";
  creatorId: string | null;
  isMember: boolean;
  isOwner: boolean;
  inviteCode: string | null;
  memberCount: number;
  memberships: { user: Member; role: string; joinedAt: string }[];
  _count: { messages: number; challenges: number };
}

interface Candidate {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
}

interface GroupMessage {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  user: { name: string | null; image: string | null };
}

interface GroupChallenge {
  id: string;
  name: string;
  sportType: string;
  distanceKm: number;
  status: string;
  startDate: string;
  endDate: string;
  _count: { entries: number };
}

type Tab = "members" | "messages" | "challenges";

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchGroup(groupId: string): Promise<GroupDetail> {
  const res = await fetch(`/api/athlete/groups/${groupId}`);
  if (!res.ok) throw new Error("Failed");
  return (await res.json()).group;
}

async function fetchCandidates(groupId: string): Promise<Candidate[]> {
  const res = await fetch(`/api/athlete/groups/${groupId}/non-members`);
  if (!res.ok) return [];
  return (await res.json()).users ?? [];
}

async function fetchMessages(groupId: string): Promise<GroupMessage[]> {
  const res = await fetch(`/api/athlete/groups/${groupId}/messages`);
  if (!res.ok) throw new Error("Failed");
  return (await res.json()).messages ?? [];
}

async function fetchChallenges(groupId: string): Promise<GroupChallenge[]> {
  const res = await fetch(`/api/athlete/groups/${groupId}/challenges`);
  if (!res.ok) return [];
  return (await res.json()).challenges ?? [];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ user }: { user: { name: string | null; image: string | null } }) {
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

function MemberRow({
  member, role, isOwner, groupId, onRemoved,
}: {
  member: Member;
  role: string;
  isOwner: boolean;
  groupId: string;
  onRemoved: (userId: string) => void;
}) {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    const res = await fetch(`/api/athlete/groups/${groupId}/members/${member.id}`, { method: "DELETE" });
    if (res.ok) onRemoved(member.id);
    setRemoving(false);
  };

  const isSelf = member.id === session?.user?.id;

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar user={member} />
        <div>
          <p className="text-sm font-semibold text-gray-800">{member.name ?? t("dashboard.athleteFallback")}</p>
          {role === "COACH" && <p className="text-xs text-[#1D9E75]">{t("members.coach")}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isSelf && (
          <Link
            href={`/compare/${member.id}`}
            className="rounded-lg bg-[#1D9E75]/10 px-2 py-1 text-xs font-semibold text-[#1D9E75]"
          >
            {t("dashboard.compare")}
          </Link>
        )}
        {isOwner && !isSelf && role !== "COACH" && (
          <button
            onClick={handleRemove}
            disabled={removing}
            className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-500 disabled:opacity-40"
          >
            {removing ? "..." : t("groups.remove")}
          </button>
        )}
      </div>
    </div>
  );
}

function CandidateRow({
  candidate, groupId, onAdded,
}: {
  candidate: Candidate;
  groupId: string;
  onAdded: (userId: string) => void;
}) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState(false);

  const handleAdd = async () => {
    setAdding(true);
    const res = await fetch(`/api/athlete/groups/${groupId}/members/${candidate.id}`, { method: "POST" });
    if (res.ok) { setDone(true); onAdded(candidate.id); }
    setAdding(false);
  };

  return (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
      <div className="flex items-center gap-2">
        <Avatar user={candidate} />
        <p className="text-sm text-gray-700">{candidate.name ?? t("dashboard.athleteFallback")}</p>
      </div>
      <button
        onClick={handleAdd}
        disabled={adding || done}
        className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${done ? "bg-[#1D9E75]/20 text-[#085041]" : "bg-[#1D9E75] text-white"} disabled:opacity-60`}
      >
        {done ? `✓ ${t("groups.added")}` : adding ? t("groups.adding") : `+ ${t("groups.addMember")}`}
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("members");
  const [msgText, setMsgText] = useState("");
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [hiddenCandidates, setHiddenCandidates] = useState<Set<string>>(new Set());
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const { data: group, isLoading, isError } = useQuery({
    queryKey: ["group-detail", groupId],
    queryFn: () => fetchGroup(groupId),
    staleTime: Infinity,
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["group-candidates", groupId],
    queryFn: () => fetchCandidates(groupId),
    enabled: !!group?.isOwner && showAddPanel,
    staleTime: Infinity,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["group-messages", groupId],
    queryFn: () => fetchMessages(groupId),
    enabled: tab === "messages" && !!group?.isMember,
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ["group-challenges", groupId],
    queryFn: () => fetchChallenges(groupId),
    enabled: tab === "challenges" && !!group?.isMember,
  });

  const sendMsg = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/athlete/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type: "CHAT" }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-messages", groupId] });
      setMsgText("");
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/athlete/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("dashboard.joinError"));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-detail", groupId] });
      queryClient.invalidateQueries({ queryKey: ["all-groups"] });
      setJoinCode("");
      setJoinError("");
    },
    onError: (e: Error) => setJoinError(e.message),
  });

  const handleMemberRemoved = (userId: string) => {
    queryClient.setQueryData(["group-detail", groupId], (old: GroupDetail | undefined) => {
      if (!old) return old;
      return { ...old, memberships: old.memberships.filter((m) => m.user.id !== userId), memberCount: old.memberCount - 1 };
    });
  };

  const handleCandidateAdded = (userId: string) => {
    setHiddenCandidates((prev) => new Set([...prev, userId]));
    queryClient.invalidateQueries({ queryKey: ["group-detail", groupId] });
  };

  // ── Loading / error ────────────────────────────────────────────────────────

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><p className="text-sm text-gray-400">{t("common.loading")}</p></div>;
  }

  if (isError || !group) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-400">{t("members.loadError")}</p>
        <Link href="/groups" className="text-sm text-[#1D9E75] underline">{t("nav.back")}</Link>
      </div>
    );
  }

  const isPeer = group.type === "PEER";
  const visibleCandidates = candidates.filter((c) => !hiddenCandidates.has(c.id));
  const tabs: { key: Tab; label: string }[] = [
    { key: "members", label: t("groups.members") },
    { key: "messages", label: t("groups.messages") },
    { key: "challenges", label: t("groups.challenges") },
  ];

  // ── Non-member view ────────────────────────────────────────────────────────

  if (!group.isMember) {
    return (
      <div className="mx-auto max-w-[420px] px-4 py-6" dir="rtl">
        <Link href="/groups" className="mb-4 flex items-center gap-1 text-sm text-gray-400">‹ {t("groups.title")}</Link>
        <div className="rounded-2xl bg-white p-6 shadow-md text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-extrabold text-white ${isPeer ? "bg-pink-500" : "bg-[#1D9E75]"}`}>
            {group.name[0]}
          </div>
          <h1 className="text-lg font-extrabold text-[#085041]">{group.name}</h1>
          <p className="mt-1 text-xs text-gray-400">
            {isPeer ? t("groups.peer") : t("groups.coach")} · {group.memberCount} {t("groups.members")}
          </p>
          <div className="mt-6">
            <p className="mb-2 text-sm text-gray-500">{t("groups.joinPrompt")}</p>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder={t("groups.joinPlaceholder")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-center font-mono text-sm tracking-widest outline-none focus:border-[#1D9E75]"
            />
            {joinError && <p className="mt-1 text-xs text-red-500">{joinError}</p>}
            <button
              onClick={() => joinMutation.mutate(joinCode)}
              disabled={joinCode.length < 6 || joinMutation.isPending}
              className="mt-3 w-full rounded-xl bg-[#1D9E75] py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {joinMutation.isPending ? t("groups.joining") : t("groups.join")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Member / owner view ────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[420px] px-4 py-6" dir="rtl">

      {/* Header */}
      <div className="mb-5">
        <Link href="/groups" className="mb-4 flex items-center gap-1 text-sm text-gray-400">‹ {t("groups.title")}</Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-[#085041]">{group.name}</h1>
            <p className="mt-0.5 text-xs text-gray-400">
              {isPeer ? t("groups.peer") : t("groups.coach")} · {group.memberCount} {t("groups.members")}
            </p>
          </div>
          {group.inviteCode && (
            <div className="shrink-0 rounded-xl bg-gray-100 px-3 py-1.5 text-center">
              <p className="text-[10px] text-gray-400">{t("groups.inviteCode")}</p>
              <p className="text-sm font-bold tracking-widest text-[#085041]">{group.inviteCode}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex rounded-xl bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${tab === t.key ? "bg-white text-[#085041] shadow-sm" : "text-gray-400"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Members tab */}
      {tab === "members" && (
        <div className="flex flex-col gap-3">

          {/* Current members */}
          {group.memberships.map(({ user, role }) => (
            <MemberRow
              key={user.id}
              member={user}
              role={role}
              isOwner={group.isOwner}
              groupId={groupId}
              onRemoved={handleMemberRemoved}
            />
          ))}

          {/* Add member panel — owner only */}
          {group.isOwner && (
            <div className="mt-2">
              {!showAddPanel ? (
                <button
                  onClick={() => setShowAddPanel(true)}
                  className="w-full rounded-2xl border border-dashed border-[#1D9E75]/40 bg-[#E1F5EE]/40 py-3 text-sm font-bold text-[#1D9E75]"
                >
                  + {t("groups.addMember")}
                </button>
              ) : (
                <div className="rounded-2xl border border-[#1D9E75]/20 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-[#085041]">
                      {isPeer ? t("groups.noCandidatesPeer") : t("groups.noCandidates")}
                    </p>
                    <button onClick={() => setShowAddPanel(false)} className="text-xs text-gray-400">{t("common.close")}</button>
                  </div>
                  {visibleCandidates.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-400">
                      {isPeer ? t("groups.noCandidatesPeer") : t("groups.noCandidates")}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {visibleCandidates.map((c) => (
                        <CandidateRow
                          key={c.id}
                          candidate={c}
                          groupId={groupId}
                          onAdded={handleCandidateAdded}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Messages tab */}
      {tab === "messages" && (
        <div className="flex flex-col gap-3">
          {messages.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">{t("messages.empty")}</p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="rounded-2xl bg-white p-3 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">{msg.user.name ?? t("dashboard.athleteFallback")}</p>
                <p className="text-[10px] text-gray-300">{new Date(msg.createdAt).toLocaleDateString("he-IL")}</p>
              </div>
              <p className="text-sm text-gray-600">{msg.content}</p>
            </div>
          ))}
          {isPeer && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder={t("messages.writeMessage")}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1D9E75]"
                onKeyDown={(e) => { if (e.key === "Enter" && msgText.trim()) sendMsg.mutate(msgText.trim()); }}
              />
              <button
                onClick={() => { if (msgText.trim()) sendMsg.mutate(msgText.trim()); }}
                disabled={!msgText.trim() || sendMsg.isPending}
                className="rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {t("messages.send")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Challenges tab */}
      {tab === "challenges" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t("groups.challenges")} ({challenges.length})
            </p>
            <Link
              href={`/challenges/new?groupId=${groupId}`}
              className="text-xs font-bold text-[#1D9E75]"
            >
              + {t("groups.newChallenge")}
            </Link>
          </div>

          {challenges.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center">
              <p className="text-sm text-gray-400">{t("groups.noChallenges")}</p>
              <Link
                href={`/challenges/new?groupId=${groupId}`}
                className="mt-2 inline-block text-sm font-bold text-[#1D9E75]"
              >
                {t("groups.createFirstChallenge")}
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
                      {ch.distanceKm} {t("activities.km")} · {ch.sportType === "run" ? t("sportTypes.run") : ch.sportType} · {ch._count.entries} {t("coach.participants")}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                    ch.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : ch.status === "COMPLETED"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {ch.status === "ACTIVE" ? t("challenges.active") : ch.status === "COMPLETED" ? t("challenges.completed") : t("challenges.draft")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
