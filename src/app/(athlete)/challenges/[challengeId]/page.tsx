"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useChallengeDetail } from "@/hooks/useChallengeDetail";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Button from "@/components/ui/Button";
import ReferenceTableModal from "@/components/challenges/ReferenceTableModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/useTranslation";

function formatPace(paceMinPerKm: number): string {
  const totalSeconds = Math.round(paceMinPerKm * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function participantStatusLabel(status: string, t: (k: string) => string) {
  if (status === "INVITED") return t("challenges.invited");
  if (status === "ACCEPTED") return t("challenges.accepted");
  if (status === "DECLINED") return t("challenges.declined");
  if (status === "COMPLETED") return t("challenges.completedStatus");
  return status;
}

function statusColor(status: string) {
  if (status === "ACTIVE") return "bg-green-100 text-green-700";
  if (status === "COMPLETED") return "bg-gray-100 text-gray-600";
  if (status === "DRAFT") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-600";
}

const SPORT_GRADIENT: Record<string, string> = {
  run: "from-orange-50 to-orange-100 text-orange-700",
  ride: "from-blue-50 to-blue-100 text-blue-700",
  swim: "from-cyan-50 to-cyan-100 text-cyan-700",
  walk: "from-gray-50 to-gray-100 text-gray-700",
  hike: "from-emerald-50 to-emerald-100 text-emerald-700",
};

const SPORT_ICON: Record<string, string> = {
  run: "🏃", ride: "🚴", swim: "🏊", walk: "🚶", hike: "🥾",
};

interface StatCubeProps {
  icon: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  gradient?: string;
}

function StatCube({ icon, label, value, sub, gradient = "from-gray-50 to-gray-100" }: StatCubeProps) {
  return (
    <div className={`flex shrink-0 flex-col justify-center rounded-2xl bg-gradient-to-br ${gradient} px-4 py-3 shadow-sm`} style={{ minWidth: "7.5rem" }}>
      <p className="text-[9px] uppercase tracking-wide opacity-80">{icon} {label}</p>
      <p className="text-lg font-extrabold leading-tight">{value}</p>
      {sub && <p className="text-[9px] opacity-70">{sub}</p>}
    </div>
  );
}

function computeAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

async function fetchProfile(): Promise<{ sex: string | null; dateOfBirth: string | null }> {
  const res = await fetch("/api/athlete/me");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function fetchReferencePace(
  sportType: string,
  distanceKm: number,
  gender: string,
  age: number
): Promise<{ paceMinPerKm: number } | null> {
  const res = await fetch(
    `/api/challenges/reference-pace?sportType=${sportType}&distanceKm=${distanceKm}&gender=${gender}&age=${age}`
  );
  if (!res.ok) return null;
  return res.json();
}

export default function ChallengeDetailPage() {
  const params = useParams();
  const { challengeId } = params as { challengeId: string };
  const { data: session } = useSession();
  const { data, isLoading, error } = useChallengeDetail(challengeId);
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();
  const [showTable, setShowTable] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["athlete-me"],
    queryFn: fetchProfile,
    staleTime: Infinity,
  });

  const age = computeAge(profile?.dateOfBirth ?? null);

  const { data: refPace } = useQuery({
    queryKey: ["reference-pace", data?.challenge.sportType, data?.challenge.distanceKm, profile?.sex, age],
    queryFn: async () => {
      if (!data?.challenge || !profile?.sex || age === null) return null;
      return fetchReferencePace(data.challenge.sportType, Number(data.challenge.distanceKm), profile.sex, age);
    },
    enabled: !!data?.challenge && !!profile?.sex && age !== null,
    staleTime: Infinity,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ action }: { action: "accept" | "decline" }) => {
      const res = await fetch(`/api/challenges/${challengeId}/${action}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to respond");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-detail", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["my-challenges"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorMessage message={t("activities.loadError")} />;
  }

  const { challenge: c, entries } = data;
  if (!c) notFound();

  const myUserId = session?.user?.id ?? "";
  const myEntry = entries.find((e: { user: { id: string } }) => e.user.id === myUserId);
  const metadata = (myEntry?.metadata ?? {}) as Record<string, unknown>;

  const sportGradient = SPORT_GRADIENT[c.sportType] ?? SPORT_GRADIENT.run;
  const sportIcon = SPORT_ICON[c.sportType] ?? "🏃";

  const startDate = new Date(c.startDate).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { day: "numeric", month: "short" });
  const endDate = new Date(c.endDate).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { day: "numeric", month: "short" });

  return (
    <div className="space-y-4" dir="rtl">
      {/* Title + sport */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">{c.name}</h1>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`rounded-lg bg-gradient-to-br ${sportGradient} px-2 py-0.5 text-[10px] font-bold`}>
              {sportIcon} {t(`sportTypes.${c.sportType}`) ?? c.sportType}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor(c.status)}`}>
              {t(`challenges.status.${c.status.toLowerCase()}`) ?? c.status}
            </span>
          </div>
        </div>
      </div>

      {/* Horizontal cubes row */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          <StatCube
            icon="📏"
            label={t("challenges.distance")}
            value={<>{c.distanceKm} <span className="text-xs font-medium">{t("activities.km")}</span></>}
            gradient="from-orange-50 to-orange-100"
          />
          <StatCube
            icon="🎯"
            label={t("challenges.expectedPace")}
            value={refPace ? formatPace(refPace.paceMinPerKm) : t("challenges.noReference")}
            sub={refPace ? `${t("challenges.perKm")} · ${profile?.sex === "F" ? t("challenges.women") : t("challenges.men")}${age ? ` · ${age}` : ""}` : undefined}
            gradient="from-purple-50 to-purple-100"
          />
          <StatCube
            icon="🗓"
            label={t("challenges.dates")}
            value={<span className="text-base">{startDate}</span>}
            sub={`→ ${endDate}`}
            gradient="from-blue-50 to-blue-100"
          />
        </div>
      </div>

      {/* Result / action box */}
      <div className="rounded-2xl bg-gradient-to-br from-[#f0faf6] to-[#E1F5EE] p-3 shadow-sm ring-1 ring-[#D4EFE6]">
        {myEntry?.status === "INVITED" ? (
          <div>
            <p className="text-xs font-bold text-[#085041]">{t("challenges.invitedPrompt")}</p>
            <div className="mt-2 flex gap-2">
              <Button onClick={() => respondMutation.mutate({ action: "accept" })} loading={respondMutation.isPending} className="flex-1 text-xs">
                {t("challenges.accept")}
              </Button>
              <Button variant="secondary" onClick={() => respondMutation.mutate({ action: "decline" })} loading={respondMutation.isPending} className="flex-1 text-xs">
                {t("challenges.decline")}
              </Button>
            </div>
          </div>
        ) : myEntry && myEntry.status !== "DECLINED" ? (
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wide text-[#1D9E75]">{t("challenges.yourResult")}</p>
              <Button variant="secondary" onClick={() => setShowTable(true)} className="h-6 px-2 text-[10px]">
                {t("challenges.referenceTable")}
              </Button>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#085041]">{myEntry.score.toFixed(1)}</span>
              <span className="text-xs text-[#1D9E75]">{t("challenges.points")}</span>
              <span className="text-[10px] text-gray-500">
                {t("challenges.rankOf").replace("{rank}", String(myEntry.rank ?? "—")).replace("{total}", String(entries.length))}
              </span>
            </div>
            {typeof metadata.actualPace === "number" && (
              <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
                <div className="rounded-lg bg-white p-1.5">
                  <p className="text-gray-400">{t("challenges.myPace")}</p>
                  <p className="font-bold text-gray-900">{formatPace(Number(metadata.actualPace))}</p>
                </div>
                <div className="rounded-lg bg-white p-1.5">
                  <p className="text-gray-400">{t("challenges.expectedPace")}</p>
                  <p className="font-bold text-gray-900">
                    {refPace ? formatPace(refPace.paceMinPerKm) : formatPace(Number(metadata.expectedPace))}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-1.5">
                  <p className="text-gray-400">{t("challenges.fullScoreRange")}</p>
                  <p className="font-bold text-green-700">
                    {refPace
                      ? t("challenges.upTo").replace("{pace}", formatPace(refPace.paceMinPerKm * (1 + (c.tolerancePercent ?? 30) / 100)))
                      : t("challenges.upTo").replace("{pace}", formatPace(Number(metadata.tolerancePace)))}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#085041]">{t("challenges.notParticipating")}</p>
              <p className="text-[10px] text-gray-500">{t("challenges.joinToSeeResult")}</p>
            </div>
            <Button variant="secondary" onClick={() => setShowTable(true)} className="h-7 px-2 text-[10px]">
              {t("challenges.referenceTable")}
            </Button>
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="rounded-xl bg-white p-3 text-xs leading-relaxed text-gray-600 shadow-sm ring-1 ring-gray-100">
        <p><span className="font-bold text-gray-900">{t("challenges.rules")}:</span> {t("challenges.toleranceHint").replace("{percent}", String(c.tolerancePercent))}</p>
        {c.description && <p className="mt-1">{c.description}</p>}
      </div>

      {/* Compact leaderboard */}
      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-700">{t("challenges.leaderboard")}</h2>
          <span className="text-[10px] text-gray-400">{entries.length} {t("challenges.participants")}</span>
        </div>
        {entries.length === 0 ? (
          <p className="text-xs text-gray-400">{t("challenges.noParticipants")}</p>
        ) : (
          <ol className="space-y-1.5">
            {entries.slice(0, 5).map((entry: { id: string; status: string; rank: number; user: { id: string; name: string | null; image: string | null }; score: number }) => {
              const isMe = entry.user.id === myUserId;
              return (
                <li key={entry.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${isMe ? "bg-blue-50" : "bg-gray-50"}`}>
                  <span className={`w-5 text-center text-xs font-bold ${entry.rank === 1 ? "text-yellow-500" : entry.rank === 2 ? "text-gray-400" : entry.rank === 3 ? "text-amber-600" : "text-gray-400"}`}>
                    {entry.rank ?? "—"}
                  </span>
                  {entry.user.image ? (
                    <img src={entry.user.image} alt="" width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-600">
                      {(entry.user.name ?? "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-medium ${isMe ? "text-blue-900" : "text-gray-900"}`}>
                      {entry.user.name ?? "?"}{isMe && ` (${t("challenges.you")})`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-gray-700">
                    {entry.score > 0 ? `${entry.score.toFixed(1)}` : "—"}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <ReferenceTableModal
        sportType={c.sportType}
        distanceKm={Number(c.distanceKm)}
        tolerancePercent={Number(c.tolerancePercent)}
        isOpen={showTable}
        onClose={() => setShowTable(false)}
      />
    </div>
  );
}
