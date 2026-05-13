"use client";

/**
 * Settings Page — Manage connected accounts (Strava & Garmin).
 * Placeholder for now. Phase F will add:
 * - StravaConnectionCard (shows status, disconnect button)
 * - GarminConnectionCard (email/password form, connect button)
 */

import { useSession, signOut } from "next-auth/react";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

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
