"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslation } from "@/hooks/useTranslation";
import { formatSportType } from "@/lib/utils";

interface Group { id: string; name: string; inviteCode: string; }
interface Challenge { id: string; name: string; status: string; sportTypes: string[]; endDate: string; }

function daysLeft(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000));
}

export default function CoachWing() {
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["athlete-groups"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/groups");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ groups: Group[] }>;
    },
  });

  const { data: challenges, isLoading: chalLoading } = useQuery<Challenge[]>({
    queryKey: ["athlete-challenges"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/challenges");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (inviteCode: string) => {
      const res = await fetch("/api/athlete/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });
      if (!res.ok) throw new Error("Invalid code");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete-groups"] });
      queryClient.invalidateQueries({ queryKey: ["athlete-challenges"] });
      setCode("");
      setJoinError("");
    },
    onError: () => setJoinError(t("dashboard.joinError")),
  });

  if (groupsLoading || chalLoading) {
    return <div className="flex justify-center py-6"><LoadingSpinner /></div>;
  }

  const groups = groupsData?.groups ?? [];
  const inGroup = groups.length > 0;
  const activeChallenge = challenges?.find(c => c.status === "ACTIVE");

  if (!inGroup) {
    return (
      <div className="rounded-xl border border-dashed border-[#1D9E75] bg-[#f0faf6] p-4">
        <p className="mb-1 text-sm font-bold text-[#085041]">{t("dashboard.joinGroupCTA")}</p>
        <p className="mb-3 text-xs text-[#1D9E75]">{t("dashboard.joinGroupDesc")}</p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1D9E75]"
            placeholder={t("dashboard.inviteCodePlaceholder")}
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setJoinError(""); }}
            maxLength={6}
          />
          <button
            onClick={() => joinMutation.mutate(code.trim())}
            disabled={code.length < 4 || joinMutation.isPending}
            className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {joinMutation.isPending ? t("dashboard.joining") : t("dashboard.joinGroup")}
          </button>
        </div>
        {joinError && <p className="mt-2 text-xs text-red-500">{joinError}</p>}
        {joinMutation.isSuccess && (
          <p className="mt-2 text-xs text-[#1D9E75]">{t("dashboard.joinSuccess")}</p>
        )}
      </div>
    );
  }

  const groupName = groups[0].name;

  if (!activeChallenge) {
    return (
      <div className="rounded-xl bg-[#f0faf6] p-4">
        <p className="text-xs font-medium text-[#1D9E75]">{groupName}</p>
        <p className="mt-1 text-sm text-gray-500">{t("dashboard.noGroupChallenge")}</p>
        <Link href="/challenges" className="mt-2 block text-xs font-medium text-[#1D9E75]">
          {t("dashboard.viewChallenges")} ←
        </Link>
      </div>
    );
  }

  return (
    <Link href={`/challenges/${activeChallenge.id}`}>
      <div className="rounded-xl bg-[#085041] p-4 text-white">
        <p className="text-[10px] opacity-70">{groupName}</p>
        <p className="mt-0.5 text-sm font-bold">{activeChallenge.name}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(activeChallenge.sportTypes ?? ["run"]).map((s: string) => (
            <span key={s} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
              {formatSportType(s, locale)}
            </span>
          ))}
          <span className="rounded-full bg-[#FAC775]/30 px-2 py-0.5 text-[10px] text-[#ffe066]">
            {t("dashboard.daysLeft", { days: daysLeft(activeChallenge.endDate) })}
          </span>
        </div>
      </div>
    </Link>
  );
}
