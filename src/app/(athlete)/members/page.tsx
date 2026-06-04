"use client";

import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { useTranslation } from "@/hooks/useTranslation";

interface Member {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
  groupName: string;
}

interface MembersResponse {
  members: Member[];
}

export default function MembersPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery<MembersResponse>({
    queryKey: ["members"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/members");
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{t("members.title")}</h1>

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {error && <ErrorMessage message={t("members.loadError")} />}

      {data && data.members.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">{t("members.empty")}</p>
        </div>
      )}

      {data && data.members.length > 0 && (
        <div className="space-y-3">
          {data.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4"
            >
              {/* Avatar */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E1F5EE] text-lg font-bold text-[#1D9E75]">
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name || ""}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  (member.name?.[0] || "?")
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">{member.name || t("members.unknown")}</p>
                <p className="text-xs text-gray-500">
                  {member.groupName}
                  {member.role === "COACH" && (
                    <span className="me-1 rounded-full bg-[#FAC775]/30 px-2 py-0.5 text-[10px] font-medium text-[#a34820]">
                      {t("members.coach")}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
