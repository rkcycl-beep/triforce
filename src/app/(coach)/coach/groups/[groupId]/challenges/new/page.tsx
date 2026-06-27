"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

/**
 * Redirect to the unified colorful challenge creation page.
 * The main /challenges/new page already handles groupId query param
 * and preselects the group for coaches.
 */
export default function CoachNewChallengeRedirect() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  useEffect(() => {
    if (groupId) {
      router.replace(`/challenges/new?groupId=${groupId}`);
    } else {
      router.replace("/challenges/new");
    }
  }, [router, groupId]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
