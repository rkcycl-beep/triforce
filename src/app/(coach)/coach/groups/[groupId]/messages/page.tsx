"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import CoachMessageCompose from "./CoachMessageCompose";

interface Message {
  id: string;
  content: string;
  type: "ANNOUNCEMENT" | "CHAT" | "SYSTEM";
  createdAt: string;
}

interface Group {
  id: string;
  name: string;
}

async function fetchGroup(groupId: string): Promise<Group> {
  const res = await fetch(`/api/athlete/groups/${groupId}`);
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return data.group;
}

async function fetchMessages(groupId: string): Promise<Message[]> {
  const res = await fetch(`/api/coach/groups/${groupId}/messages`);
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return data.messages ?? [];
}

export default function CoachMessagesPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: group } = useQuery({
    queryKey: ["coach-group", groupId],
    queryFn: () => fetchGroup(groupId),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["coach-group-messages", groupId],
    queryFn: () => fetchMessages(groupId),
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch(`/api/coach/groups/${groupId}/messages?messageId=${messageId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-group-messages", groupId] });
    },
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/coach/groups/${groupId}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← {group?.name ?? t("coach.myGroups")}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{t("messages.title")}</h1>
        </div>
      </div>

      <CoachMessageCompose groupId={groupId} />

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            {t("messages.sentMessages")}
            <span className="me-2 ms-2 text-sm font-normal text-gray-500">({messages.length})</span>
          </h2>
        </div>

        {messages.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500">{t("messages.noMessagesYet")}</p>
            <p className="mt-1 text-xs text-gray-400">{t("messages.useFormToBroadcast")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {messages.map((msg) => (
              <li key={msg.id} className="px-5 py-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      msg.type === "ANNOUNCEMENT"
                        ? "bg-amber-100 text-amber-700"
                        : msg.type === "SYSTEM"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {t(`messages.type.${msg.type.toLowerCase()}`)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {new Date(msg.createdAt).toLocaleString("he-IL", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <button
                      onClick={() => deleteMessage.mutate(msg.id)}
                      disabled={deleteMessage.isPending}
                      className="rounded px-2 py-0.5 text-[10px] font-bold text-red-500 hover:bg-red-50 disabled:opacity-50"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-gray-700">{msg.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
