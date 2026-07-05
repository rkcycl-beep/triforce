"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "@/providers/LocaleProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { isCoach } from "@/lib/roles";
import { clearRoleCookie } from "@/lib/roleCookie";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface MeResponse {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  lastStravaSync: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  tolerancePercent: number | null;
}

interface ReferencePaceResponse {
  age: number;
  gender: string;
  paces: {
    labelKey: string;
    distanceKm: number;
    paceMinPerKm: number | null;
  }[];
  missingProfile?: boolean;
  message?: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [inviteCode, setInviteCode] = useState("");
  const [joinStatus, setJoinStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [joinMessage, setJoinMessage] = useState("");
  const [coachStatus, setCoachStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [coachMessage, setCoachMessage] = useState("");
  const [name, setName] = useState("");
  const [sex, setSex] = useState<string>("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [tolerancePercent, setTolerancePercent] = useState<string>("");
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const userIsCoach = isCoach(session?.user?.roles, session?.user?.role);

  const { data: profile, isLoading: profileLoading } = useQuery<MeResponse>({
    queryKey: ["athlete", "me"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/me");
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });

  const { data: referencePace, isLoading: paceLoading } = useQuery<ReferencePaceResponse>({
    queryKey: ["athlete", "me", "reference-pace"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/me/reference-pace");
      if (!res.ok) throw new Error("Failed to load reference pace");
      return res.json();
    },
    enabled: !!profile,
  });

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setSex(profile.sex ?? "");
      setDateOfBirth(profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split("T")[0] : "");
      setTolerancePercent(profile.tolerancePercent != null ? String(profile.tolerancePercent) : "");
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/athlete/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sex, dateOfBirth, tolerancePercent: tolerancePercent === "" ? null : Number(tolerancePercent) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete", "me"] });
      queryClient.invalidateQueries({ queryKey: ["athlete", "me", "reference-pace"] });
      setSaveMessage({ type: "success", text: t("settings.saveSuccess") });
      setTimeout(() => setSaveMessage(null), 3000);
    },
    onError: () => {
      setSaveMessage({ type: "error", text: t("settings.saveError") });
      setTimeout(() => setSaveMessage(null), 3000);
    },
  });

  async function onBecomeCoach() {
    setCoachStatus("loading");
    setCoachMessage("");
    try {
      const res = await fetch("/api/user/become-coach", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCoachStatus("error");
        const detail = data.details ? ` (${data.details})` : "";
        setCoachMessage((data.error ?? t("settings.becomeCoachError")) + detail);
        return;
      }
      setCoachStatus("success");
      setCoachMessage(t("settings.becomeCoachSuccess"));
    } catch {
      setCoachStatus("error");
      setCoachMessage(t("settings.becomeCoachError"));
    }
  }

  async function onJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoinStatus("loading");
    setJoinMessage("");
    try {
      const res = await fetch("/api/athlete/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setJoinStatus("error");
        setJoinMessage(data.error ?? t("settings.joinError"));
        return;
      }
      setJoinStatus("success");
      setJoinMessage(t("settings.joinSuccess", { groupName: data.groupName }));
      setInviteCode("");
    } catch {
      setJoinStatus("error");
      setJoinMessage(t("settings.genericError"));
    }
  }

  function formatPace(minPerKm: number | null): string {
    if (minPerKm === null || minPerKm === undefined || minPerKm <= 0) return "—";
    const minutes = Math.floor(minPerKm);
    const seconds = Math.round((minPerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  const hasProfileChanges = profile && (
    name !== (profile.name ?? "") ||
    sex !== (profile.sex ?? "") ||
    dateOfBirth !== (profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split("T")[0] : "") ||
    tolerancePercent !== (profile.tolerancePercent != null ? String(profile.tolerancePercent) : "")
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t("settings.title")}</h1>

      {/* Profile section */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">{t("settings.profile")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("settings.profileDesc")}</p>

        {profileLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <LoadingSpinner size="sm" />
            <span>טוען פרופיל...</span>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <Input
              label={t("settings.name")}
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("settings.name")}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("settings.gender")}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSex("M")}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    sex === "M"
                      ? "bg-blue-600 text-white"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {t("settings.male")}
                </button>
                <button
                  type="button"
                  onClick={() => setSex("F")}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    sex === "F"
                      ? "bg-pink-600 text-white"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {t("settings.female")}
                </button>
              </div>
            </div>

            <Input
              label={t("settings.dateOfBirth")}
              name="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />

            <Input
              label={t("settings.tolerancePercent")}
              name="tolerancePercent"
              type="number"
              min="1"
              max="100"
              value={tolerancePercent}
              onChange={(e) => setTolerancePercent(e.target.value)}
              placeholder="30"
              helperText={t("settings.tolerancePercentHint")}
            />

            <Button
              onClick={() => updateProfile.mutate()}
              loading={updateProfile.isPending}
              disabled={!hasProfileChanges}
              className="w-full"
            >
              {updateProfile.isPending ? t("settings.saving") : t("settings.save")}
            </Button>

            {saveMessage && (
              <p className={`text-sm ${saveMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {saveMessage.text}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Reference pace section */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">{t("settings.referencePace")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("settings.referencePaceDesc")}</p>

        {paceLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <LoadingSpinner size="sm" />
            <span>טוען נתוני ייחוס...</span>
          </div>
        ) : referencePace?.missingProfile ? (
          <p className="mt-4 text-sm text-amber-600">{t("settings.referencePaceMissing")}</p>
        ) : referencePace ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
            <div className="flex items-center justify-between bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500">
              <span>{t("settings.distance")}</span>
              <span>{t("settings.expectedPace")}</span>
            </div>
            {referencePace.paces.map((pace) => (
              <div
                key={pace.labelKey}
                className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm"
              >
                <span className="font-medium text-gray-900">{t(pace.labelKey)}</span>
                <span className="font-semibold text-[#1D9E75]">
                  {formatPace(pace.paceMinPerKm)} {t("settings.perKm")}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-500">
              {t("settings.age")}: {referencePace.age} · {t("settings.gender")}: {referencePace.gender === "M" ? t("settings.male") : t("settings.female")}
            </div>
          </div>
        ) : null}
      </div>

      {/* Language switcher */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="font-semibold text-gray-900">{t("settings.language")}</h2>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setLocale("he")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              locale === "he"
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t("settings.hebrew")}
          </button>
          <button
            onClick={() => setLocale("en")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              locale === "en"
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t("settings.english")}
          </button>
        </div>
      </div>

      {/* Join a group */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="font-semibold text-gray-900">{t("settings.joinGroup")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("settings.joinPrompt")}</p>
        <form onSubmit={onJoin} className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <Input
              label=""
              name="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder={t("settings.invitePlaceholder")}
              maxLength={6}
              className="font-mono uppercase tracking-widest"
            />
          </div>
          <Button type="submit" loading={joinStatus === "loading"} disabled={inviteCode.trim().length !== 6}>
            {t("settings.join")}
          </Button>
        </form>
        {joinMessage && (
          <p className={`mt-2 text-sm ${joinStatus === "success" ? "text-green-600" : "text-red-600"}`}>
            {joinMessage}
          </p>
        )}
      </div>

      {/* Strava connection status */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="font-semibold text-gray-900">{t("settings.strava")}</h2>
        {session?.accessToken ? (
          <p className="mt-2 text-sm text-green-600">{t("settings.connected")}</p>
        ) : (
          <p className="mt-2 text-sm text-gray-500">{t("settings.notConnected")}</p>
        )}
      </div>

      {/* Become a coach */}
      {session && !userIsCoach && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-900">{t("settings.becomeCoachTitle")}</h2>
          <p className="mt-1 text-sm text-amber-700">{t("settings.becomeCoachDesc")}</p>
          <Button onClick={onBecomeCoach} loading={coachStatus === "loading"} className="mt-3 w-full">
            {t("settings.becomeCoach")}
          </Button>
          {coachMessage && (
            <p className={`mt-2 text-sm ${coachStatus === "success" ? "text-green-700" : "text-red-600"}`}>
              {coachMessage}
            </p>
          )}
        </div>
      )}

      {/* Account actions */}
      {session && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="font-semibold text-gray-900">{t("settings.account")}</h2>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">{t("settings.signOutDesc")}</span>
            <button
              onClick={() => { clearRoleCookie(); signOut({ callbackUrl: "/" }); }}
              className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 active:scale-95"
            >
              {t("settings.signOut")}
            </button>
          </div>
        </div>
      )}

      {/* Garmin placeholder */}
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4">
        <h2 className="font-semibold text-gray-900">{t("settings.garmin")}</h2>
        <p className="mt-2 text-sm text-gray-500">{t("settings.garminNote")}</p>
      </div>
    </div>
  );
}
