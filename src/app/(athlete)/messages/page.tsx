"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { useNotifications, useMarkAllNotificationsRead, type Notification } from "@/hooks/useNotifications";

interface Message {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null; role: string };
  group: { id: string; name: string };
}

function NotificationCard({ notification }: { notification: Notification }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"idle" | "loading" | "accepted" | "declined" | "error">("idle");
  const date = new Date(notification.createdAt).toLocaleString("he-IL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isChallengeInvite = notification.type === "CHALLENGE_INVITED";
  const isGroupInvite = notification.type === "GROUP_INVITED";
  const isInvite = isChallengeInvite || isGroupInvite;
  const challengeId =
    typeof notification.metadata?.challengeId === "string"
      ? notification.metadata.challengeId
      : null;
  const groupId =
    typeof notification.metadata?.groupId === "string"
      ? notification.metadata.groupId
      : null;
  const invitationId =
    typeof notification.metadata?.invitationId === "string"
      ? notification.metadata.invitationId
      : null;
  const inviteTarget = challengeId ?? groupId;

  const respond = useMutation({
    mutationFn: async (action: "accept" | "decline") => {
      if (!invitationId) throw new Error("No invitation id");
      const res = await fetch(`/api/athlete/group-invitations/${invitationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed");
      return action;
    },
    onSuccess: (action) => {
      setStatus(action === "accept" ? "accepted" : "declined");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => setStatus("error"),
  });

  const content = (
    <div className={`rounded-xl p-4 shadow-sm ${isInvite ? "border border-amber-200 bg-amber-50" : "border border-blue-100 bg-blue-50"}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isInvite ? "bg-amber-200 text-amber-800" : "bg-blue-100 text-blue-700"}`}>
            {isChallengeInvite ? "🏆" : isGroupInvite ? "👥" : "🔔"}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{notification.title}</p>
            <p className="text-[10px] text-gray-400">{date}</p>
          </div>
        </div>
        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{t("challenges.notifications.new")}</span>
      </div>
      <p className="text-sm leading-relaxed text-gray-700">{notification.content}</p>

      {isGroupInvite && status === "idle" && invitationId && (
        <div className="mt-3 flex gap-2">
          <Button
            onClick={(e) => { e.preventDefault(); respond.mutate("accept"); }}
            loading={respond.isPending}
            className="flex-1 text-xs"
          >
            {t("challenges.accept")}
          </Button>
          <Button
            variant="secondary"
            onClick={(e) => { e.preventDefault(); respond.mutate("decline"); }}
            disabled={respond.isPending}
            className="flex-1 text-xs"
          >
            {t("challenges.decline")}
          </Button>
        </div>
      )}

      {status === "accepted" && (
        <p className="mt-3 text-sm font-bold text-green-700">{t("groups.inviteAccepted")}</p>
      )}
      {status === "declined" && (
        <p className="mt-3 text-sm font-bold text-gray-500">{t("groups.inviteDeclined")}</p>
      )}
      {status === "error" && (
        <p className="mt-3 text-sm font-bold text-red-600">{t("groups.inviteRespondError")}</p>
      )}
    </div>
  );

  if (isGroupInvite) {
    return content;
  }

  if (inviteTarget) {
    return (
      <Link href={isGroupInvite ? `/groups/${groupId}` : `/challenges/${challengeId}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

function MessageCard({ msg }: { msg: Message }) {
  const { t } = useTranslation();
  const isAnnouncement = msg.type === "ANNOUNCEMENT";
  const date = new Date(msg.createdAt).toLocaleString("he-IL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`rounded-xl p-4 shadow-sm ${isAnnouncement ? "border border-[#FAC775]/40 bg-[#FFFBF0]" : "border border-gray-100 bg-white"}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1D9E75]/10 text-xs font-bold text-[#1D9E75]">
            {msg.user.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{msg.user.name ?? t("members.unknown")}</p>
            <p className="text-[10px] text-gray-400">{msg.group.name}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {isAnnouncement && (
            <span className="rounded-full bg-[#FAC775]/40 px-2 py-0.5 text-[10px] font-bold text-[#a34820]">
              {t("messages.type.announcement")}
            </span>
          )}
          <span className="text-[10px] text-gray-400">{date}</span>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-gray-700">{msg.content}</p>
    </div>
  );
}

export default function MessagesPage() {
  const { t } = useTranslation();

  const { data, isLoading, error, refetch } = useQuery<{ messages: Message[] }>({
    queryKey: ["athlete-messages"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/messages");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: notifications = [] } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (notifications.length > 0) {
      markAllRead.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">{t("messages.title")}</h1>
          <p className="mt-0.5 text-xs text-gray-400">{t("messages.subtitle")}</p>
        </div>
        <Link
          href="/"
          className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
        >
          {t("nav.back")}
        </Link>
      </div>

      {notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((n) => (
            <NotificationCard key={n.id} notification={n} />
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <ErrorMessage message={t("messages.loadError")} onRetry={() => refetch()} />
      )}

      {data && data.messages.length === 0 && notifications.length === 0 && (
        <div className="rounded-[20px] border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="text-5xl">💬</div>
          <p className="mt-3 text-sm font-semibold text-gray-700">{t("messages.empty")}</p>
          <p className="mt-1 text-xs text-gray-400">{t("messages.emptyDesc")}</p>
        </div>
      )}

      {data && data.messages.length > 0 && (
        <div className="space-y-3">
          {data.messages.map((msg) => (
            <MessageCard key={msg.id} msg={msg} />
          ))}
        </div>
      )}
    </div>
  );
}
