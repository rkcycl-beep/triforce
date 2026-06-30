"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslation } from "@/hooks/useTranslation";

interface Event {
  id: string;
  name: string;
  location: string | null;
  eventDate: string;
}

async function fetchUpcomingEvents(): Promise<Event[]> {
  const res = await fetch("/api/athlete/events");
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return data.events ?? [];
}

export default function UpcomingEventsSection() {
  const { t } = useTranslation();
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["athlete-upcoming-events"],
    queryFn: fetchUpcomingEvents,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#eeeeee] bg-white p-4">
        <div className="flex justify-center py-4"><LoadingSpinner /></div>
      </div>
    );
  }

  if (events.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">{t("dashboard.upcomingEvents")}</h3>
        <Link href="/events" className="text-xs text-[#1D9E75]">{t("dashboard.allEvents")} ←</Link>
      </div>
      <div className="space-y-2">
        {events.slice(0, 3).map((ev) => {
          const date = new Date(ev.eventDate);
          return (
            <div
              key={ev.id}
              className="flex items-center gap-3 rounded-xl border border-[#eeeeee] bg-white px-3 py-2.5"
            >
              <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-[#E6F1FB] text-[#185FA5]">
                <span className="text-[10px] font-bold">{date.toLocaleString("he-IL", { weekday: "short" })}</span>
                <span className="text-xs font-bold">{date.getDate()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-800">{ev.name}</p>
                {ev.location && <p className="text-[10px] text-gray-400">📍 {ev.location}</p>}
              </div>
              <div className="text-[10px] text-gray-400">
                {date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
