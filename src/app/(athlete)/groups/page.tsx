"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isCoach } from "@/lib/roles";

interface GroupRow {
  id: string;
  name: string;
  type: "COACH" | "PEER";
  memberCount: number;
  isMember: boolean;
  isOwner: boolean;
  inviteCode: string | null;
}

async function fetchAllGroups(): Promise<GroupRow[]> {
  const res = await fetch("/api/groups");
  if (!res.ok) throw new Error("Failed");
  return (await res.json()).groups;
}

async function createPeerGroup(name: string): Promise<{ groupId: string }> {
  const res = await fetch("/api/athlete/groups/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "שגיאה");
  return data;
}

async function joinByCode(inviteCode: string): Promise<void> {
  const res = await fetch("/api/athlete/groups/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "קוד שגוי");
}

function TypeBadge({ type }: { type: "COACH" | "PEER" }) {
  return type === "COACH" ? (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">מאמן</span>
  ) : (
    <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-700">עמיתים</span>
  );
}

export default function GroupsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userIsCoach = isCoach(session?.user?.roles, session?.user?.role);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const { data: groups = [], isLoading, isError } = useQuery({
    queryKey: ["all-groups"],
    queryFn: fetchAllGroups,
    staleTime: Infinity,
  });

  const createMutation = useMutation({
    mutationFn: createPeerGroup,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-groups"] });
      router.push(`/groups/${data.groupId}`);
    },
  });

  const joinMutation = useMutation({
    mutationFn: joinByCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-groups"] });
      setJoiningId(null);
      setJoinCode("");
      setJoinError("");
    },
    onError: (e: Error) => setJoinError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "שגיאה במחיקה");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-groups"] });
      setConfirmDeleteId(null);
      setDeleteError("");
    },
    onError: (e: Error) => setDeleteError(e.message),
  });

  const myGroups = groups.filter((g) => g.isMember || g.isOwner);
  const otherGroups = groups.filter((g) => !g.isMember && !g.isOwner);

  return (
    <div className="mx-auto max-w-[420px] px-4 py-6" dir="rtl">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-[#085041]">קבוצות</h1>
        {userIsCoach ? (
          <Link
            href="/coach/groups/new"
            className="rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-bold text-white shadow-md"
          >
            + קבוצת מאמן
          </Link>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-bold text-white shadow-md"
          >
            + קבוצת עמיתים
          </button>
        )}
      </div>

      {/* Create peer group form */}
      {showCreateForm && (
        <div className="mb-6 rounded-2xl border border-[#1D9E75]/20 bg-white p-4 shadow-md">
          <p className="mb-3 text-sm font-semibold text-[#085041]">שם הקבוצה</p>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={60}
            placeholder="למשל: חברי הריצה שלי"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#1D9E75]"
            autoFocus
          />
          {createMutation.isError && (
            <p className="mt-1 text-xs text-red-500">{(createMutation.error as Error).message}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => createMutation.mutate(newName.trim())}
              disabled={newName.trim().length === 0 || createMutation.isPending}
              className="flex-1 rounded-xl bg-[#1D9E75] py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {createMutation.isPending ? "יוצר..." : "צור"}
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setNewName(""); }}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="py-8 text-center text-sm text-gray-400">טוען...</p>}
      {isError && <p className="py-8 text-center text-sm text-red-400">שגיאה בטעינת קבוצות</p>}

      {/* My groups */}
      {myGroups.length > 0 && (
        <section className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">הקבוצות שלי</p>
          <div className="flex flex-col gap-3">
            {myGroups.map((g) => (
              <div key={g.id} className="rounded-2xl bg-white shadow-sm">
                <Link
                  href={`/groups/${g.id}`}
                  className="flex items-center gap-3 p-4 active:bg-gray-50"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold text-white ${g.type === "COACH" ? "bg-[#1D9E75]" : "bg-pink-500"}`}>
                    {g.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-800">{g.name}</p>
                      {g.isOwner && (
                        <span className="rounded-full bg-[#1D9E75]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#085041]">מנהל</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <TypeBadge type={g.type} />
                      <span className="text-xs text-gray-400">{g.memberCount} חברים</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-gray-300">‹</span>
                </Link>

                {/* Delete — owner only */}
                {g.isOwner && (
                  <div className="border-t border-gray-100 px-4 py-2">
                    {confirmDeleteId === g.id ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">למחוק את הקבוצה לצמיתות?</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setDeleteError(""); deleteMutation.mutate(g.id); }}
                              disabled={deleteMutation.isPending}
                              className="rounded-lg bg-red-500 px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
                            >
                              {deleteMutation.isPending ? "מוחק..." : "כן, מחק"}
                            </button>
                            <button
                              onClick={() => { setConfirmDeleteId(null); setDeleteError(""); }}
                              className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-500"
                            >
                              ביטול
                            </button>
                          </div>
                        </div>
                        {deleteError && (
                          <p className="mt-1 text-xs text-red-500">{deleteError}</p>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(g.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        מחק קבוצה
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Other groups */}
      {otherGroups.length > 0 && (
        <section className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">קבוצות נוספות</p>
          <div className="flex flex-col gap-3">
            {otherGroups.map((g) => (
              <div key={g.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold text-white ${g.type === "COACH" ? "bg-[#1D9E75]" : "bg-pink-500"}`}>
                    {g.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800">{g.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <TypeBadge type={g.type} />
                      <span className="text-xs text-gray-400">{g.memberCount} חברים</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setJoiningId(g.id); setJoinCode(""); setJoinError(""); }}
                    className="shrink-0 rounded-xl bg-[#1D9E75]/10 px-3 py-1.5 text-xs font-bold text-[#085041]"
                  >
                    הצטרף
                  </button>
                </div>

                {/* Inline join form */}
                {joiningId === g.id && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      placeholder="הזן קוד הזמנה (6 תווים)"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-center font-mono text-sm tracking-widest outline-none focus:border-[#1D9E75]"
                      autoFocus
                    />
                    {joinError && <p className="mt-1 text-xs text-red-500">{joinError}</p>}
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => joinMutation.mutate(joinCode)}
                        disabled={joinCode.length < 6 || joinMutation.isPending}
                        className="flex-1 rounded-xl bg-[#1D9E75] py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {joinMutation.isPending ? "מצטרף..." : "הצטרף"}
                      </button>
                      <button
                        onClick={() => setJoiningId(null)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-400"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {!isLoading && groups.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-4xl">👥</p>
          <p className="mt-3 text-sm font-semibold text-gray-500">אין קבוצות עדיין</p>
          <p className="mt-1 text-xs text-gray-400">צור קבוצה ראשונה</p>
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/athlete" className="text-sm text-slate-400 underline underline-offset-2">חזרה</Link>
      </div>
    </div>
  );
}
