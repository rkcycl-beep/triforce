"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { useTranslation } from "@/hooks/useTranslation";

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  eventDate: string;
  createdBy: { id: string; name: string | null };
  group: { id: string; name: string };
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function EventCard({ event }: { event: Event }) {
  const { t } = useTranslation();
  const days = daysUntil(event.eventDate);
  const isPast = days < 0;
  const dateStr = new Date(event.eventDate).toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = new Date(event.eventDate).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${isPast ? "border-gray-100 bg-gray-50 opacity-70" : "border-[#9FE1CB]/40 bg-[#E1F5EE]/30"}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-base font-bold text-gray-900">{event.name}</h3>
        {!isPast && days <= 7 && (
          <span className="shrink-0 rounded-full bg-[#1D9E75] px-2 py-0.5 text-[10px] font-bold text-white">
            {days === 0 ? t("events.today") : `${days}d`}
          </span>
        )}
        {isPast && (
          <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            {t("events.past")}
          </span>
        )}
      </div>

      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <span>📅</span>
          <span className="font-medium">{dateStr}</span>
          <span className="text-gray-400">·</span>
          <span>{timeStr}</span>
        </div>
        {event.location && (
          <div className="flex items-center gap-1.5">
            <span>📍</span>
            <span>{event.location}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span>👥</span>
          <span className="text-gray-400">{event.group.name}</span>
        </div>
      </div>

      {event.description && (
        <p className="mt-2 text-xs leading-relaxed text-gray-500">{event.description}</p>
      )}
    </div>
  );
}

export default function EventsPage() {
  const { t } = useTranslation();

  const { data, isLoading, error, refetch } = useQuery<{ events: Event[] }>({
    queryKey: ["athlete-events"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/events");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const upcoming = data?.events.filter((e) => daysUntil(e.eventDate) >= 0) ?? [];
  const past = data?.events.filter((e) => daysUntil(e.eventDate) < 0) ?? [];

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">{t("events.title")}</h1>
          <p className="mt-0.5 text-xs text-gray-400">{t("events.subtitle")}</p>
        </div>
        <Link
          href="/"
          className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
        >
          {t("nav.back")}
        </Link>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <ErrorMessage message={t("events.loadError")} onRetry={() => refetch()} />
      )}

      {data && data.events.length === 0 && (
        <div className="rounded-[20px] border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="text-5xl">📅</div>
          <p className="mt-3 text-sm font-semibold text-gray-700">{t("events.empty")}</p>
          <p className="mt-1 text-xs text-gray-400">{t("events.emptyDesc")}</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{t("events.upcoming")}</p>
          {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{t("events.past")}</p>
          {past.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
}
