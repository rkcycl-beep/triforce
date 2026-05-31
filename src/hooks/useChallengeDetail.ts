import { useQuery } from "@tanstack/react-query";

export function useChallengeDetail(challengeId: string) {
  return useQuery({
    queryKey: ["challenge-detail", challengeId],
    queryFn: async () => {
      const res = await fetch(`/api/athlete/challenges/${challengeId}`);
      if (!res.ok) throw new Error("Failed to load challenge");
      return res.json();
    },
    enabled: Boolean(challengeId),
  });
}
