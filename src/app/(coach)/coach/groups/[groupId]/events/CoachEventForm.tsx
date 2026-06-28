"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

interface EventData {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  eventDate: string;
}

interface CoachEventFormProps {
  groupId: string;
  event?: EventData | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CoachEventForm({ groupId, event, onSaved, onCancel }: CoachEventFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setName(event.name);
      setDescription(event.description ?? "");
      setLocation(event.location ?? "");
      setEventDate(toDatetimeLocal(event.eventDate));
    }
  }, [event]);

  async function handleSubmit() {
    if (!name.trim() || !eventDate) return;
    setLoading(true);
    setError(null);
    try {
      const url = `/api/coach/groups/${groupId}/events`;
      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        eventDate,
        ...(event ? { eventId: event.id } : {}),
      };
      const res = await fetch(url, {
        method: event ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      setName("");
      setDescription("");
      setLocation("");
      setEventDate("");
      if (onSaved) onSaved();
      else router.refresh();
    } catch {
      setError(t("events.eventError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-gray-900">
        {event ? t("events.edit") : t("events.createEvent")}
      </h2>

      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("events.eventNamePlaceholder")}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-[#1D9E75] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20"
        />

        <input
          type="datetime-local"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-[#1D9E75] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20"
        />

        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t("events.locationPlaceholder")}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-[#1D9E75] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("events.descriptionPlaceholder")}
          rows={3}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-[#1D9E75] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20"
        />
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim() || !eventDate}
          className="rounded-xl bg-[#1D9E75] px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#178c68] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? t("events.creating") : event ? t("events.save") : t("events.create")}
        </button>
        {event && onCancel && (
          <button
            onClick={onCancel}
            className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-600 transition-all hover:bg-gray-200"
          >
            {t("events.cancel")}
          </button>
        )}
      </div>
    </div>
  );
}
