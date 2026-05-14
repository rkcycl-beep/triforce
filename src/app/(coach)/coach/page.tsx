/**
 * Coach dashboard placeholder for 1B.1.
 * 1B.2 will turn this into the real overview (groups + invite codes + members).
 */

import Link from "next/link";

export default function CoachDashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Coach dashboard</h1>
      <p className="text-sm text-gray-600">
        Group management lands in the next commit. Until then, this is just the
        landing screen for coach accounts.
      </p>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">
          You&apos;ll be able to{" "}
          <Link href="/coach/groups/new" className="text-blue-600 hover:underline">
            create your first group
          </Link>{" "}
          here once 1B.2 ships.
        </p>
      </div>
    </div>
  );
}
