"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

interface Group {
  id: string;
  name: string;
  inviteCode: string;
  _count: { memberships: number };
}

export default function CoachGroupsPage() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery<{ groups: Group[] }>({
    queryKey: ["coach-groups"],
    queryFn: async () => {
      const res = await fetch("/api/coach/dashboard");
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      return { groups: d.groups ?? [] };
    },
  });

  const groups = data?.groups ?? [];

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="-mx-4 -mt-6 bg-gradient-to-br from-[#085041] to-[#1D9E75] px-5 py-6 text-white">
        <Link href="/coach" className="mb-3 inline-flex items-center gap-1 text-xs text-white/60 hover:text-white">
          → בית
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">{t("coach.myGroups")}</h1>
        <p className="mt-1 text-sm text-white/70">נהל קבוצות וקודי הזמנה</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#1D9E75] border-t-transparent" />
        </div>
      )}

      {!isLoading && groups.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <p className="text-4xl">🏃</p>
          <p className="mt-3 text-sm font-bold text-gray-700">{t("coach.noGroups")}</p>
          <p className="mt-1 text-xs text-gray-400">{t("coach.noGroupsPrompt")}</p>
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
              <Link
                key={group.id}
                href={`/coach/groups/${group.id}`}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:border-[#1D9E75]/30 hover:shadow-md active:scale-[0.99]"
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
                <span className="text-gray-300">←</span>
              </Link>
            ))}
          </div>

          <Link
            href="/coach/groups/new"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#1D9E75]/40 bg-[#E1F5EE]/40 py-4 text-sm font-bold text-[#1D9E75] transition-colors hover:bg-[#E1F5EE]/70"
          >
            + {t("coach.newGroup")}
          </Link>
        </>
      )}
    </div>
  );
}
