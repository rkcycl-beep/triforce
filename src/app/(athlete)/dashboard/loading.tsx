/**
 * loading.tsx — Shown automatically by Next.js while the dashboard page loads.
 * Uses React Suspense under the hood — no extra code needed.
 */

import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
