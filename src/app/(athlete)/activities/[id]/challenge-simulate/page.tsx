"use client";

import { use } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDistance, formatPace, formatDuration, formatDate } from "@/lib/utils";

interface SimulationResponse {
  activity: {
    id: string;
    name: string;
    sportType: string;
    distanceKm: number;
    movingTime: number;
    paceMinPerKm: number;
    startDate: string;
  };
  challengeParams: {
    name: string;
    sportType: string;
    distanceKm: number;
    metric: string;
    tolerancePercent: number;
    startDate: string;
    endDate: string;
  };
  reference: {
    paceMinPerKm: number;
    gender: string;
    age: number;
  } | null;
  simulation: {
    score: number;
    actualPace: number;
    expectedPace: number;
    tolerancePace: number;
    age: number;
    gender: string;
    distanceKm: number;
    paceRatio: number;
  } | null;
}

async function fetchSimulation(activityId: string): Promise<SimulationResponse> {
  const res = await fetch(`/api/athlete/activities/${activityId}/simulate-challenge`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed");
  }
  return res.json();
}

export default function ActivityChallengeSimulatePage() {
  const params = useParams();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const activityId = params.id as string;

  const { data, isLoading, isError, error } = useQuery<SimulationResponse>({
    queryKey: ["activity-challenge-simulate", activityId],
    queryFn: () => fetchSimulation(activityId),
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !data) {
    const message = error instanceof Error ? error.message : t("activities.loadError");
    const isProfileMissing = message.includes("age or gender");
    return (
      <div className="py-16 text-center">
        <ErrorMessage message={isProfileMissing ? t("activities.profileMissingAgeGender") : message} />
        {isProfileMissing ? (
          <Link
            href="/settings"
            className="mt-3 inline-block rounded-xl bg-[#1D9E75] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#178c68]"
          >
            {t("activities.completeProfile")}
          </Link>
        ) : (
          <button onClick={() => router.back()} className="mt-3 text-sm text-[#1D9E75] underline">{t("nav.back")}</button>
        )}
      </div>
    );
  }

  const { activity, reference, simulation, challengeParams } = data;

  return (
    <div className="space-y-4" dir="rtl">
      <Link href={`/activities/${activityId}`} className="text-sm text-gray-500 hover:text-gray-700">
        ← {t("activities.backToActivities")}
      </Link>

      <div>
        <h1 className="text-xl font-extrabold text-gray-900">{t("activities.activityChallengePreview")}</h1>
        <p className="text-xs text-gray-400">{t("activities.simulateDescription")}</p>
      </div>

      {/* Original activity cube */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 p-3">
        <p className="text-[10px] uppercase tracking-wide text-gray-500">{t("activities.originalActivity")}</p>
        <p className="font-semibold text-gray-900">{activity.name}</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-white p-2">
            <p className="text-gray-400">{t("activities.distance")}</p>
            <p className="font-bold">{formatDistance(activity.distanceKm * 1000, locale)}</p>
          </div>
          <div className="rounded-lg bg-white p-2">
            <p className="text-gray-400">{t("activities.movingTime")}</p>
            <p className="font-bold">{formatDuration(activity.movingTime, locale)}</p>
          </div>
          <div className="rounded-lg bg-white p-2">
            <p className="text-gray-400">{t("activities.avgPace")}</p>
            <p className="font-bold">{formatPace(activity.distanceKm * 1000 / activity.movingTime, locale)}</p>
          </div>
        </div>
      </div>

      {/* Derived params cubes */}
      <div>
        <p className="mb-2 text-xs font-bold text-gray-700">{t("activities.derivedChallengeParams")}</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <div className="flex shrink-0 flex-col justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 px-4 py-3" style={{ minWidth: "7rem" }}>
            <p className="text-[9px] uppercase tracking-wide text-orange-700">📏 {t("challenges.distance")}</p>
            <p className="text-lg font-extrabold text-orange-900">{challengeParams.distanceKm} <span className="text-xs font-medium">{t("activities.km")}</span></p>
          </div>
          <div className="flex shrink-0 flex-col justify-center rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 px-4 py-3" style={{ minWidth: "7rem" }}>
            <p className="text-[9px] uppercase tracking-wide text-purple-700">🎯 {t("challenges.expectedPace")}</p>
            <p className="text-lg font-extrabold text-purple-900">
              {reference ? formatPace(reference.paceMinPerKm, locale) : t("activities.noReference")}
            </p>
          </div>
          <div className="flex shrink-0 flex-col justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-3" style={{ minWidth: "7rem" }}>
            <p className="text-[9px] uppercase tracking-wide text-blue-700">✅ {t("challenges.tolerance")}</p>
            <p className="text-lg font-extrabold text-blue-900">±{challengeParams.tolerancePercent}%</p>
          </div>
        </div>
      </div>

      {/* Calculated score */}
      <div className="rounded-2xl bg-gradient-to-br from-[#f0faf6] to-[#E1F5EE] p-4 text-center shadow-sm">
        <p className="text-[10px] uppercase tracking-wide text-[#1D9E75]">{t("activities.calculatedScore")}</p>
        {simulation ? (
          <>
            <p className="text-4xl font-extrabold text-[#085041]">{simulation.score}</p>
            <p className="text-xs text-[#1D9E75]">{t("challenges.points")}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-white p-2">
                <p className="text-gray-400">{t("challenges.myPace")}</p>
                <p className="font-bold text-gray-900">{formatPace(simulation.actualPace, locale)}</p>
              </div>
              <div className="rounded-lg bg-white p-2">
                <p className="text-gray-400">{t("challenges.expectedPace")}</p>
                <p className="font-bold text-gray-900">{formatPace(simulation.expectedPace, locale)}</p>
              </div>
              <div className="rounded-lg bg-white p-2">
                <p className="text-gray-400">{t("challenges.fullScoreRange")}</p>
                <p className="font-bold text-green-700">{formatPace(simulation.tolerancePace, locale)}</p>
              </div>
            </div>
          </>
        ) : (
          <p className="py-4 text-sm text-gray-500">{t("challenges.noScores")}</p>
        )}
      </div>

      {/* Create real challenge */}
      <Link
        href={`/challenges/new?activityId=${activityId}`}
        className="block rounded-xl bg-[#1D9E75] py-3 text-center text-sm font-bold text-white shadow-md hover:bg-[#178c68]"
      >
        {t("activities.createRealChallenge")}
      </Link>
    </div>
  );
}
