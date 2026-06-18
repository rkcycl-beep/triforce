"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteLinkedPage({
  params,
}: {
  params: Promise<{ inviterId: string }>;
}) {
  const { inviterId } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<"linking" | "done" | "error">("linking");

  useEffect(() => {
    fetch(`/api/invite/accept/${inviterId}`, { method: "POST" })
      .then(r => {
        setStatus(r.ok ? "done" : "error");
        setTimeout(() => router.push("/dashboard"), 1800);
      })
      .catch(() => {
        setStatus("error");
        setTimeout(() => router.push("/dashboard"), 1800);
      });
  }, [inviterId, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8faf9] gap-4" dir="rtl">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1D9E75] to-[#085041] shadow-lg">
        <span className="text-3xl">{status === "done" ? "✅" : status === "error" ? "⚠️" : "🔗"}</span>
      </div>
      <p className="text-lg font-bold text-gray-800">
        {status === "linking" && "מחבר חשבון..."}
        {status === "done" && "חוברת! מועבר לדשבורד..."}
        {status === "error" && "ההתחברות הצליחה · מועבר..."}
      </p>
      {status !== "linking" && (
        <div className="h-1 w-48 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full animate-pulse rounded-full bg-[#1D9E75]" />
        </div>
      )}
    </div>
  );
}
