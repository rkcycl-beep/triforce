"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch("/api/notifications");
  if (!res.ok) throw new Error("Failed to load notifications");
  return res.json();
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 60 * 1000,
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark notifications read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
