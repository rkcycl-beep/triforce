"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Cube {
  emoji: string;
  label: string;
  sub: string;
  href: string;
  gradient: string;
  shadow: string;
}

const cubes: Cube[] = [
  {
    emoji: "🏠",
    label: "הבית שלי",
    sub: "דשבורד אישי",
    href: "/dashboard",
    gradient: "from-[#1D9E75] via-[#158a63] to-[#0d6b4d]",
    shadow: "shadow-[0_12px_28px_rgba(29,158,117,0.3)]",
  },
  {
    emoji: "🤝",
    label: "חברים",
    sub: "חברים ומועדונים",
    href: "/members",
    gradient: "from-[#9b59b6] via-[#8e44ad] to-[#6c3483]",
    shadow: "shadow-[0_12px_28px_rgba(155,89,182,0.25)]",
  },
  {
    emoji: "🏆",
    label: "אתגרים",
    sub: "אתגרי קבוצה",
    href: "/challenges",
    gradient: "from-[#e07b3a] via-[#c45e2b] to-[#a34820]",
    shadow: "shadow-[0_12px_28px_rgba(192,94,43,0.25)]",
  },
  {
    emoji: "🏃",
    label: "היסטוריה",
    sub: "כל האימונים",
    href: "/activities",
    gradient: "from-[#185FA5] via-[#1450a3] to-[#0c3a7a]",
    shadow: "shadow-[0_12px_28px_rgba(24,95,165,0.25)]",
  },
  {
    emoji: "💬",
    label: "הודעות",
    sub: "מהמאמן",
    href: "/messages",
    gradient: "from-[#6366f1] via-[#5558e8] to-[#4338ca]",
    shadow: "shadow-[0_12px_28px_rgba(99,102,241,0.25)]",
  },
  {
    emoji: "📅",
    label: "אירועים",
    sub: "לוח תכנון",
    href: "/events",
    gradient: "from-[#0ea5e9] via-[#0284c7] to-[#0369a1]",
    shadow: "shadow-[0_12px_28px_rgba(14,165,233,0.25)]",
  },
  {
    emoji: "📊",
    label: "השוואה",
    sub: "אני מול חברים",
    href: "/compare",
    gradient: "from-[#f59e0b] via-[#d97706] to-[#b45309]",
    shadow: "shadow-[0_12px_28px_rgba(245,158,11,0.25)]",
  },
];

export default function AthleteHomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const firstName = session?.user?.name?.split(" ")[0] ?? "ספורטאי";

  return (
    <div className="relative flex min-h-[calc(100vh-120px)] flex-col items-center justify-center overflow-hidden px-4 py-8">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 30%, rgba(29,158,117,0.06) 0%, transparent 55%), radial-gradient(circle at 80% 80%, rgba(8,80,65,0.04) 0%, transparent 40%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1D9E75] to-[#085041] shadow-[0_6px_20px_rgba(29,158,117,0.3)]">
              <span className="text-2xl">🏃</span>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#085041]">
            שלום, {firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-400">מה נעשה היום?</p>
        </div>

        {/* Cube Grid — 2×3 */}
        <div className="grid grid-cols-2 gap-4">
          {cubes.map((cube) => (
            <button
              key={cube.label}
              onClick={() => router.push(cube.href)}
              className={`group flex aspect-square flex-col items-center justify-center gap-2 rounded-[20px] border border-white/15 bg-gradient-to-br ${cube.gradient} ${cube.shadow} transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1.5 hover:scale-[1.04] active:translate-y-0.5 active:scale-[0.98]`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-2xl backdrop-blur-sm">
                {cube.emoji}
              </div>
              <span className="text-base font-bold text-white">{cube.label}</span>
              <span className="text-[11px] text-white/60">{cube.sub}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-slate-400 underline underline-offset-2 hover:text-slate-600">
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
