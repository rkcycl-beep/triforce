"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslation } from "@/hooks/useTranslation";

interface ChosenFriend {
  id: string;
  name: string;
  kudosCount: number;
  triforceUserId: string | null;
}

const AVATAR_COLORS = ["#D85A30", "#185FA5", "#1D9E75", "#8B5CF6", "#F59E0B", "#EC4899"];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function Avatar({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ background: avatarColor(name) }}
    >
      {initials}
    </div>
  );
}

export default function FriendsWing() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["chosen-friends"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/chosen-friends");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ friends: ChosenFriend[] }>;
    },
  });

  const friends = data?.friends ?? [];

  if (isLoading) return <div className="flex justify-center py-4"><LoadingSpinner /></div>;

  if (friends.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-4 text-center">
        <p className="text-sm text-gray-400">{t("dashboard.noChosenFriends")}</p>
        <Link
          href="/members"
          className="mt-2 block text-xs font-medium text-[#1D9E75]"
        >
          + {t("dashboard.addFriends")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {friends.map(f => (
        <div key={f.id} className="flex items-center gap-3 rounded-xl border border-[#eeeeee] bg-white px-3 py-2.5">
          <Avatar name={f.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-800">{f.name}</p>
            {f.triforceUserId ? (
              <p className="text-[10px] text-[#1D9E75]">TriForce ✓</p>
            ) : (
              <p className="text-[10px] text-gray-400">{t("dashboard.stravaOnly")}</p>
            )}
          </div>
          <div className="flex gap-1.5">
            {f.triforceUserId ? (
              <Link
                href="/compare"
                className="rounded-lg bg-[#1D9E75]/10 px-2.5 py-1.5 text-[10px] font-semibold text-[#085041]"
              >
                📊 {t("dashboard.compare")}
              </Link>
            ) : (
              <span className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-[10px] text-gray-400">
                {t("dashboard.notOnTriforce")}
              </span>
            )}
          </div>
        </div>
      ))}

      <Link
        href="/members"
        className="block text-center text-xs font-medium text-[#1D9E75]"
      >
        + {t("dashboard.addFriends")}
      </Link>
    </div>
  );
}
