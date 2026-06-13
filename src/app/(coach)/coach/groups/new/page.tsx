"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

export default function NewGroupPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        setError(data.error ?? "שגיאה ביצירת הקבוצה");
        setLoading(false);
        return;
      }
      router.push(`/coach/groups/${data.id}`);
    } catch {
      setError("משהו השתבש. נסה שוב.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="-mx-4 -mt-6 bg-gradient-to-br from-[#085041] to-[#1D9E75] px-5 py-6 text-white">
        <Link href="/coach/groups" className="mb-3 inline-flex items-center gap-1 text-xs text-white/60 hover:text-white">
          → קבוצות
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">קבוצה חדשה</h1>
        <p className="mt-1 text-sm text-white/70">
          תן שם לקבוצת האימונים — קוד הזמנה ייווצר אוטומטית
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <label className="block text-xs font-bold uppercase tracking-wide text-gray-400">
            שם הקבוצה
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='למשל: "רצי בוקר תל אביב"'
            required
            maxLength={80}
            autoFocus
            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-[#1D9E75] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20"
          />
          <p className="mt-2 text-xs text-gray-400">
            לאחר היצירה תקבל קוד הזמנה — שתף אותו עם המתאמנים כדי שיצטרפו
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || name.trim().length === 0}
          className="w-full rounded-2xl bg-[#1D9E75] py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#178c68] active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? "יוצר..." : "צור קבוצה"}
        </button>
      </form>

      {/* Info card */}
      <div className="rounded-2xl border border-[#1D9E75]/20 bg-[#E1F5EE]/40 p-4">
        <p className="text-xs font-bold text-[#085041]">איך זה עובד?</p>
        <ol className="mt-2 space-y-1.5 text-xs text-gray-500">
          <li>1. תן שם לקבוצה ולחץ "צור"</li>
          <li>2. תקבל קוד הזמנה בן 6 תווים</li>
          <li>3. שתף את הקוד עם המתאמנים שלך</li>
          <li>4. הם יזינו אותו בהגדרות ← הצטרפות לקבוצה</li>
        </ol>
      </div>
    </div>
  );
}
