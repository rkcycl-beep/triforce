"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import CoachEventForm from "./CoachEventForm";

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  eventDate: string;
}

interface Group {
  id: string;
  name: string;
}

async function fetchGroup(groupId: string): Promise<Group> {
  const res = await fetch(`/api/athlete/groups/${groupId}`);
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return data.group;
}

async function fetchEvents(groupId: string): Promise<Event[]> {
  const res = await fetch(`/api/coach/groups/${groupId}/events`);
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return data.events ?? [];
}

export default function CoachEventsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const { data: group } = useQuery({
    queryKey: ["coach-group", groupId],
    queryFn: () => fetchGroup(groupId),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["coach-group-events", groupId],
    queryFn: () => fetchEvents(groupId),
  });

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/coach/groups/${groupId}/events`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-group-events", groupId] });
    },
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <Link href={`/coach/groups/${groupId}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← {group?.name ?? t("coach.myGroups")}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{t("events.title")}</h1>
      </div>

      <CoachEventForm
        groupId={groupId}
        event={editingEvent}
        onSaved={() => {
          setEditingEvent(null);
          queryClient.invalidateQueries({ queryKey: ["coach-group-events", groupId] });
        }}
        onCancel={() => setEditingEvent(null)}
      />

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            {t("events.allEvents")}
            <span className="me-2 ms-2 text-sm font-normal text-gray-500">({events.length})</span>
          </h2>
        </div>

        {events.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500">{t("events.noEventsYet")}</p>
            <p className="mt-1 text-xs text-gray-400">{t("events.useFormToCreate")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {events.map((ev) => {
              const isPast = new Date(ev.eventDate) < new Date();
              return (
                <li key={ev.id} className={`px-5 py-4 ${isPast ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{ev.name}</p>
                      {ev.description && (
                        <p className="mt-0.5 text-sm text-gray-500">{ev.description}</p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                        <span>
                          📅{" "}
                          {new Date(ev.eventDate).toLocaleString("he-IL", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {ev.location && <span>📍 {ev.location}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => setEditingEvent(ev)}
                        className="rounded px-2 py-1 text-xs font-bold text-[#1D9E75] hover:bg-[#E1F5EE]"
                      >
                        {t("events.edit")}
                      </button>
                      <button
                        onClick={() => deleteEvent.mutate(ev.id)}
                        disabled={deleteEvent.isPending}
                        className="rounded px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50 disabled:opacity-50"
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
