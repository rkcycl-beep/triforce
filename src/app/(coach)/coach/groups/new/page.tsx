"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/hooks/useTranslation";
import { isCoach } from "@/lib/roles";

export default function NewGroupPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const userIsCoach = isCoach(session?.user?.roles, session?.user?.role);

  if (status === "loading") {
    return <div className="p-6 text-center text-sm text-gray-400">{t("common.loading")}</div>;
  }

  if (!userIsCoach) {
    return (
      <div className="space-y-5 pb-10">
        <div className="-mx-4 -mt-6 bg-gradient-to-br from-[#085041] to-[#1D9E75] px-5 py-6 text-white">
          <h1 className="text-2xl font-extrabold tracking-tight">{t("groups.newCoachGroup")}</h1>
        </div>
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {t("coach.forbidden")}
        </div>
        <Link href="/coach" className="inline-block text-sm text-[#1D9E75] underline">
          {t("nav.back")}
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/coach/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("groups.createError"));
        setLoading(false);
        return;
      }
      router.push(`/coach/groups/${data.id}`);
    } catch {
      setError(t("common.somethingWentWrong"));
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="-mx-4 -mt-6 bg-gradient-to-br from-[#085041] to-[#1D9E75] px-5 py-6 text-white">
        <Link href="/coach/groups" className="mb-3 inline-flex items-center gap-1 text-xs text-white/60 hover:text-white">
          → {t("groups.title")}
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">{t("groups.newCoachGroup")}</h1>
        <p className="mt-1 text-sm text-white/70">
          {t("groups.newCoachGroupHint")}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <label className="block text-xs font-bold uppercase tracking-wide text-gray-400">
            {t("groups.groupName")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("groups.groupNamePlaceholder")}
            required
            maxLength={80}
            autoFocus
            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-[#1D9E75] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20"
          />
          <p className="mt-2 text-xs text-gray-400">
            {t("groups.newCoachGroupHelp")}
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error === "Forbidden." ? t("coach.forbidden") : error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || name.trim().length === 0}
          className="w-full rounded-2xl bg-[#1D9E75] py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#178c68] active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? t("common.creating") : t("groups.createCoachGroup")}
        </button>
      </form>

      {/* Info card */}
      <div className="rounded-2xl border border-[#1D9E75]/20 bg-[#E1F5EE]/40 p-4">
        <p className="text-xs font-bold text-[#085041]">{t("groups.howItWorks")}</p>
        <ol className="mt-2 space-y-1.5 text-xs text-gray-500">
          <li>{t("groups.step1")}</li>
          <li>{t("groups.step2")}</li>
          <li>{t("groups.step3")}</li>
          <li>{t("groups.step4")}</li>
        </ol>
      </div>
    </div>
  );
}
