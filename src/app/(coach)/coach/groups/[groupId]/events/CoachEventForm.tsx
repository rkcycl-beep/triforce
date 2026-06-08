"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CoachEventForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim() || !eventDate) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/coach/groups/${groupId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description, location, eventDate }),
      });
      if (!res.ok) throw new Error("Create failed");
      setName("");
      setDescription("");
      setLocation("");
      setEventDate("");
      router.refresh();
    } catch {
      setError("Failed to create event. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-gray-900">Create an event</h2>

      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Event name *"
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
          placeholder="Location (optional)"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-[#1D9E75] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={3}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-[#1D9E75] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20"
        />
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={creating || !name.trim() || !eventDate}
        className="mt-4 rounded-xl bg-[#1D9E75] px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#178c68] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {creating ? "Creating…" : "Create event"}
      </button>
    </div>
  );
}
