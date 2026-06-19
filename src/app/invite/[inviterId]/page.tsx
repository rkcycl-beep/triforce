"use client";

import { use, useEffect, useState } from "react";

interface InviterInfo {
  name: string | null;
  image: string | null;
}

export default function InvitePage({
  params,
}: {
  params: Promise<{ inviterId: string }>;
}) {
  const { inviterId } = use(params);
  const [inviter, setInviter] = useState<InviterInfo | null>(null);
  const [inviteUrl, setInviteUrl] = useState(`https://triforce-iota.vercel.app/invite/${inviterId}`);

  useEffect(() => {
    setInviteUrl(`${window.location.origin}/invite/${inviterId}`);
    // Try to load inviter's name — if it fails, show generic page (never block the invite)
    fetch(`/api/invite/${inviterId}/info`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setInviter(data); })
      .catch(() => {});
  }, [inviterId]);

  const firstName = inviter?.name?.split(" ")[0] ?? "חבר/ה";
  const callbackUrl = `/invite/${inviterId}/linked`;

  const waMessage = `*TriForce – ספורט חברתי*\n\nהצטרף/י אלי לאפליקציה!\nריצה | אופניים | שחייה | כושר\n\nהשווה ביצועים עם חברים\nאתגרים קבוצתיים\n\n${inviteUrl}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-[#f8faf9] p-6"
      dir="rtl"
    >
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1D9E75] to-[#085041] shadow-lg">
            <span className="text-3xl">🏃</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#085041]">TriForce</h1>
          <p className="text-sm text-gray-400">מעקב אימונים והשוואה עם חברים</p>
        </div>

        {/* Invite card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {inviter?.image && (
            <img
              src={inviter.image}
              alt={inviter.name ?? ""}
              className="mx-auto mb-3 h-16 w-16 rounded-full object-cover"
            />
          )}
          {!inviter && (
            <div className="mx-auto mb-3 h-16 w-16 animate-pulse rounded-full bg-gray-100" />
          )}
          <p className="text-lg font-bold text-gray-900">
            {inviter ? `${firstName} מזמין/ת אותך!` : "טוען..."}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            הצטרף/י ל-TriForce כדי להשוות ביצועים ולעקוב אחר האימונים
          </p>
        </div>

        {/* What you get */}
        <div className="space-y-2 rounded-xl bg-white/60 p-4 text-start text-sm text-gray-600">
          {[
            "📊 השוואת ריצה, אופניים ושחייה מול חברים",
            "🏆 אתגרי קבוצה עם לוח תוצאות",
            "📅 מעקב אחר פעילויות מ-Strava",
          ].map(item => (
            <p key={item}>{item}</p>
          ))}
        </div>

        {/* Primary CTA — Strava */}
        <a
          href={`/api/auth/signin/strava?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="block w-full rounded-2xl bg-[#FC4C02] py-4 text-center text-base font-bold text-white shadow-md transition-colors hover:bg-[#e03d00] active:scale-95"
        >
          🚴 התחבר עם Strava
        </a>

        {/* WhatsApp share (for forwarding to others) */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-2xl border border-[#25D366]/30 bg-[#25D366]/10 py-3 text-center text-sm font-bold text-[#128C7E] transition-colors hover:bg-[#25D366]/20 active:scale-95"
        >
          📲 שתף בווטסאפ עם חבר נוסף
        </a>

        <p className="text-xs text-gray-400">
          בחינם לחלוטין · לא צריך כרטיס אשראי
        </p>
      </div>
    </div>
  );
}
