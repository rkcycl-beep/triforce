import { useQuery } from "@tanstack/react-query";

export function useChallenges() {
  return useQuery({
    queryKey: ["my-challenges"],
    queryFn: async () => {
      const res = await fetch("/api/challenges");
      if (!res.ok) throw new Error("Failed to load challenges");
      return res.json();
    },
  });
}
