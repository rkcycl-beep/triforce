"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslation } from "@/hooks/useTranslation";
import { isCoach } from "@/lib/roles";

function NewChallengeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const userIsCoach = isCoach(session?.user?.roles, session?.user?.role);
  const preselectedGroupId = searchParams.get("groupId");
  const redirectTo = searchParams.get("redirectTo");

  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [name, setName] = useState("");
  const [distanceKm, setDistanceKm] = useState("5");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextWeek);
  const [tolerance, setTolerance] = useState("30");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  useEffect(() => {
    if (preselectedGroupId && userIsCoach) {
      setSelectedGroupIds((prev) =>
        prev.includes(preselectedGroupId) ? prev : [preselectedGroupId]
      );
    }
  }, [preselectedGroupId, userIsCoach]);

  // Chosen friends (marked by user in /members or /friends)
  const { data: chosenData, isLoading: chosenLoading } = useQuery({
    queryKey: ["chosen-friends"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/chosen-friends");
      if (!res.ok) throw new Error("Failed to load chosen friends");
      return res.json();
    },
  });
  const chosenFriends = chosenData?.friends ?? [];

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["my-coach-groups"],
    queryFn: async () => {
      const res = await fetch("/api/coach/groups");
      if (!res.ok) throw new Error("Failed to load groups");
      return res.json();
    },
    enabled: userIsCoach,
  });
  const groups = groupsData?.groups ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sportType: "run",
          distanceKm: Number(distanceKm),
          metric: "pace",
          tolerancePercent: Number(tolerance),
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          userIds: selectedUserIds,
          groupIds: selectedGroupIds,
        }),
      });
      if (!res.ok) throw new Error("Failed to create challenge");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-challenges"] });
      router.push(redirectTo || "/challenges");
    },
  });

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const canSubmit =
    name.trim() &&
    distanceKm &&
    startDate &&
    endDate &&
    (selectedUserIds.length > 0 || selectedGroupIds.length > 0);

  if (chosenLoading || groupsLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">{t("challenges.new")}</h1>

      <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        {/* Name */}
        <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-3">
          <label className="flex items-center gap-2 text-sm font-bold text-blue-800">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs text-white">🏷️</span>
            {t("challenges.name")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("challenges.namePlaceholder")}
            className="mt-2 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Distance */}
        <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 p-3">
          <label className="flex items-center gap-2 text-sm font-bold text-emerald-800">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">📏</span>
            {t("challenges.distance")}
          </label>
          <select
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            className="mt-2 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm"
          >
            <option value="5">{t("challenges.distances.5k")}</option>
            <option value="10">{t("challenges.distances.10k")}</option>
            <option value="21.0975">{t("challenges.distances.halfMarathon")}</option>
            <option value="42.195">{t("challenges.distances.marathon")}</option>
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 p-3">
            <label className="flex items-center gap-2 text-sm font-bold text-amber-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs text-white">📅</span>
              {t("challenges.startDate")}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 p-3">
            <label className="flex items-center gap-2 text-sm font-bold text-rose-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs text-white">🏁</span>
              {t("challenges.endDate")}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-2 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Tolerance */}
        <div className="rounded-xl bg-gradient-to-r from-green-50 to-lime-50 p-3">
          <label className="flex items-center gap-2 text-sm font-bold text-green-800">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs text-white">✅</span>
            {t("challenges.tolerance")}
          </label>
          <input
            type="number"
            value={tolerance}
            onChange={(e) => setTolerance(e.target.value)}
            min={0}
            max={100}
            className="mt-2 w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm"
          />
          <p className="mt-2 text-xs font-medium text-green-700">
            {t("challenges.toleranceHint").replace("{percent}", tolerance)}
          </p>
        </div>

        {/* Recipients */}
        {userIsCoach && groups && (
          <div className="rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 p-3">
            <label className="flex items-center gap-2 text-sm font-bold text-purple-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs text-white">👥</span>
              {t("challenges.groups")}
            </label>
            <div className="mt-2 space-y-2">
              {groups.map((g: { id: string; name: string }) => (
                <label key={g.id} className="flex items-center gap-2 rounded-lg bg-white/60 p-2 text-sm text-purple-900">
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.includes(g.id)}
                    onChange={() => toggleGroup(g.id)}
                    className="h-4 w-4 rounded border-purple-300 text-purple-600"
                  />
                  {g.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {!userIsCoach && (
          <div className="rounded-xl bg-gradient-to-r from-cyan-50 to-sky-50 p-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-bold text-cyan-800">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-xs text-white">🤝</span>
                {t("challenges.friends")}
              </label>
              <a
                href="/members"
                className="rounded-full bg-white px-2 py-1 text-xs font-medium text-cyan-700 shadow-sm hover:bg-cyan-100"
              >
                {t("challenges.manageFriends")}
              </a>
            </div>
            {chosenFriends.length === 0 ? (
              <div className="mt-2 rounded-lg bg-white/70 p-3 text-center text-sm text-cyan-800">
                <p>{t("challenges.noFriendsChosen")}</p>
                <a href="/members" className="mt-1 inline-block text-cyan-600 underline hover:text-cyan-800">
                  {t("challenges.chooseFriendsHere")}
                </a>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {chosenFriends.map((f: { id: string; name: string; triforceUserId?: string | null; stravaAthleteId?: string | null }) => (
                  <div
                    key={f.id}
                    className={`flex items-center gap-2 rounded-lg bg-white/60 p-2 text-sm ${
                      f.triforceUserId ? "hover:bg-white" : ""
                    }`}
                  >
                    {f.triforceUserId ? (
                      <label className="flex flex-1 cursor-pointer items-center gap-2 text-cyan-900">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(f.triforceUserId)}
                          onChange={() => toggleUser(f.triforceUserId!)}
                          className="h-4 w-4 rounded border-cyan-300 text-cyan-600"
                        />
                        <span className="flex-1">{f.name}</span>
                      </label>
                    ) : (
                      <>
                        <span className="flex-1 text-gray-500">{f.name}</span>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            t("friends.inviteMessage").replace("{name}", f.name).replace("{url}", `https://triforce-iota.vercel.app/invite/${session?.user?.id}`)
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-200"
                        >
                          {t("challenges.inviteOnWhatsApp")}
                        </a>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Button
          onClick={() => {
            if (!canSubmit) {
              // Show validation hint
              return;
            }
            createMutation.mutate();
          }}
          loading={createMutation.isPending}
          className="w-full"
        >
          {t("challenges.create")}
        </Button>

        {!canSubmit && (
          <p className="text-center text-xs text-amber-600">
            {t("challenges.validationHint")}
          </p>
        )}

        {createMutation.isError && (
          <p className="text-center text-sm text-red-600">
            {createMutation.error instanceof Error ? createMutation.error.message : t("challenges.error")}
          </p>
        )}
      </div>
    </div>
  );
}

export default function NewChallengePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      }
    >
      <NewChallengeForm />
    </Suspense>
  );
}
