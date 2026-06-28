"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

interface Group {
  id: string;
  name: string;
  inviteCode: string;
  _count: { memberships: number };
}

export default function CoachGroupsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const { data, isLoading } = useQuery<{ groups: Group[] }>({
    queryKey: ["coach-groups"],
    queryFn: async () => {
      const res = await fetch("/api/coach/groups");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ groupId, name }: { groupId: string; name: string }) => {
      const res = await fetch("/api/coach/groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, name }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["coach-groups"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await fetch("/api/coach/groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-groups"] });
    },
  });

  const groups = data?.groups ?? [];

  return (
    <div className="space-y-5 pb-10">
      <div className="-mx-4 -mt-6 bg-gradient-to-br from-[#085041] to-[#1D9E75] px-5 py-6 text-white">
        <Link href="/coach" className="mb-3 inline-flex items-center gap-1 text-xs text-white/60 hover:text-white">
          → {t("nav.back")}
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">{t("coach.myGroups")}</h1>
        <p className="mt-1 text-sm text-white/70">{t("coach.manageGroupsAndCodes")}</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#1D9E75] border-t-transparent" />
        </div>
      )}

      {!isLoading && groups.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <p className="text-4xl">🏃</p>
          <p className="mt-3 text-sm font-bold text-gray-700">{t("coach.noGroupsYet")}</p>
          <p className="mt-1 text-xs text-gray-400">{t("coach.createFirstGroupPrompt")}</p>
          <Link
            href="/coach/groups/new"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#1D9E75] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#178c68]"
          >
            + {t("coach.createFirstGroup")}
          </Link>
        </div>
      )}

      {!isLoading && groups.length > 0 && (
        <>
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              >
                <button
                  onClick={() => router.push(`/coach/groups/${group.id}`)}
                  className="flex flex-1 items-center gap-3 text-start"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1D9E75] to-[#085041] text-xl font-extrabold text-white shadow-sm">
                    {group.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-gray-900">{group.name}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                      <span>{group._count?.memberships ?? 0} {t("coach.members")}</span>
                      <span>·</span>
                      <span className="font-mono font-semibold tracking-widest text-[#1D9E75]">{group.inviteCode}</span>
                    </div>
                  </div>
                </button>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    onClick={() => router.push(`/coach/groups/${group.id}?invite=1`)}
                    className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-600 active:scale-95"
                  >
                    {t("coach.inviteMembers")}
                  </button>
                  <div className="flex gap-1">
                    {editingId === group.id ? (
                      <>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                          autoFocus
                        />
                        <button
                          onClick={() => renameMutation.mutate({ groupId: group.id, name: editName })}
                          disabled={renameMutation.isPending || !editName.trim()}
                          className="rounded-lg bg-[#1D9E75] px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingId(group.id); setEditName(group.name); }}
                          className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600 hover:bg-gray-200"
                        >
                          {t("coach.renameGroup")}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(t("coach.deleteGroupConfirm"))) {
                              deleteMutation.mutate(group.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-100 disabled:opacity-50"
                        >
                          {t("common.delete")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/coach/groups/new"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#1D9E75]/40 bg-[#E1F5EE]/40 py-4 text-sm font-bold text-[#1D9E75] transition-colors hover:bg-[#E1F5EE]/70"
          >
            + {t("coach.newGroupShort")}
          </Link>
        </>
      )}
    </div>
  );
}
