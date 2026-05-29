"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [inviteCode, setInviteCode] = useState("");
  const [joinStatus, setJoinStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [joinMessage, setJoinMessage] = useState("");

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
        setJoinMessage(data.error ?? "Failed to join group.");
        return;
      }
      setJoinStatus("success");
      setJoinMessage(`Joined "${data.groupName}" successfully!`);
      setInviteCode("");
    } catch {
      setJoinStatus("error");
      setJoinMessage("Something went wrong. Try again.");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Join a group */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="font-semibold text-gray-900">Join a group</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter the 6-character invite code your coach shared with you.
        </p>
        <form onSubmit={onJoin} className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <Input
              label=""
              name="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
              maxLength={6}
              className="font-mono uppercase tracking-widest"
            />
          </div>
          <Button
            type="submit"
            loading={joinStatus === "loading"}
            disabled={inviteCode.trim().length !== 6}
          >
            Join
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
        <h2 className="font-semibold text-gray-900">Strava</h2>
        {session?.accessToken ? (
          <p className="mt-2 text-sm text-green-600">Connected</p>
        ) : (
          <p className="mt-2 text-sm text-gray-500">Not connected</p>
        )}
      </div>

      {/* Account actions */}
      {session && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="font-semibold text-gray-900">Account</h2>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Sign out of TriForce.</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 active:scale-95"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Garmin placeholder */}
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4">
        <h2 className="font-semibold text-gray-900">Garmin</h2>
        <p className="mt-2 text-sm text-gray-500">
          Garmin connection will be available in Phase C.
        </p>
      </div>
    </div>
  );
}
