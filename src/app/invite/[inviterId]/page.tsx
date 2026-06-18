import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ inviterId: string }>;
}) {
  const { inviterId } = await params;

  const inviter = await prisma.user.findUnique({
    where: { id: inviterId },
    select: { name: true, image: true },
  });

  if (!inviter) notFound();

  const firstName = inviter.name?.split(" ")[0] ?? "חבר/ה";
  const callbackUrl = `/invite/${inviterId}/linked`;

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
          {inviter.image && (
            <img
              src={inviter.image}
              alt={inviter.name ?? ""}
              className="mx-auto mb-3 h-16 w-16 rounded-full object-cover"
            />
          )}
          <p className="text-lg font-bold text-gray-900">
            {firstName} מזמין/ת אותך!
          </p>
          <p className="mt-1 text-sm text-gray-500">
            הצטרף/י ל-TriForce כדי להשוות ביצועים ולעקוב אחר האימונים
          </p>
        </div>

        {/* What you get */}
        <div className="space-y-2 rounded-xl bg-white/60 p-4 text-start text-sm text-gray-600">
          {["📊 השוואת ריצה, אופניים ושחייה מול חברים",
            "🏆 אתגרי קבוצה עם לוח תוצאות",
            "📅 מעקב אחר פעילויות מ-Strava"].map(item => (
            <p key={item}>{item}</p>
          ))}
        </div>

        {/* CTA */}
        <a
          href={`/api/auth/signin/strava?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="block w-full rounded-2xl bg-[#FC4C02] py-4 text-center text-base font-bold text-white shadow-md transition-colors hover:bg-[#e03d00] active:scale-95"
        >
          🚴 התחבר עם Strava
        </a>

        <p className="text-xs text-gray-400">
          בחינם לחלוטין · לא צריך כרטיס אשראי
        </p>
      </div>
    </div>
  );
}
