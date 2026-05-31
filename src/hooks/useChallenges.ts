import { useQuery } from "@tanstack/react-query";

export function useChallenges() {
  return useQuery({
    queryKey: ["athlete-challenges"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/challenges");
      if (!res.ok) throw new Error("Failed to load challenges");
      return res.json();
    },
  });
}
