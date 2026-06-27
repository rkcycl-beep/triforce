"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useLocale } from "@/providers/LocaleProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { isCoach } from "@/lib/roles";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();

  const [inviteCode, setInviteCode] = useState("");
  const [joinStatus, setJoinStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [joinMessage, setJoinMessage] = useState("");
  const [coachStatus, setCoachStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [coachMessage, setCoachMessage] = useState("");
  const userIsCoach = isCoach(session?.user?.roles, session?.user?.role);

  async function onBecomeCoach() {
    setCoachStatus("loading");
    setCoachMessage("");
    try {
      const res = await fetch("/api/user/become-coach", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCoachStatus("error");
        setCoachMessage(data.error ?? t("settings.becomeCoachError"));
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t("settings.title")}</h1>

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
        <p className="mt-1 text-sm text-gray-500">
          {t("settings.joinPrompt")}
        </p>
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
          <Button
            type="submit"
            loading={joinStatus === "loading"}
            disabled={inviteCode.trim().length !== 6}
          >
            {t("settings.join")}
          </Button>
        </form>
        {joinMessage && (
          <p
            className={`mt-2 text-sm ${
              joinStatus === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
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
          <p className="mt-1 text-sm text-amber-700">
            {t("settings.becomeCoachDesc")}
          </p>
          <Button
            onClick={onBecomeCoach}
            loading={coachStatus === "loading"}
            className="mt-3 w-full"
          >
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
              onClick={() => signOut({ callbackUrl: "/" })}
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
        <p className="mt-2 text-sm text-gray-500">
          {t("settings.garminNote")}
        </p>
      </div>
    </div>
  );
}
