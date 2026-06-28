"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

export default function CoachMessageCompose({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [type, setType] = useState<"ANNOUNCEMENT" | "CHAT">("ANNOUNCEMENT");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!content.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/coach/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), type }),
      });
      if (!res.ok) throw new Error("Send failed");
      setContent("");
      router.refresh();
    } catch {
      setError(t("common.somethingWentWrong"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-gray-900">{t("messages.sendMessage")}</h2>

      <div className="mb-3 flex gap-2">
        {(["ANNOUNCEMENT", "CHAT"] as const).map((tKey) => (
          <button
            key={tKey}
            onClick={() => setType(tKey)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
              type === tKey
                ? "bg-[#1D9E75] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t(`messages.type.${tKey.toLowerCase()}`)}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t("messages.messageContentPlaceholder")}
        rows={4}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#1D9E75] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20"
      />

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <button
        onClick={handleSend}
        disabled={sending || !content.trim()}
        className="mt-3 rounded-xl bg-[#1D9E75] px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#178c68] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? t("common.sending") : t("messages.send")}
      </button>
    </div>
  );
}
