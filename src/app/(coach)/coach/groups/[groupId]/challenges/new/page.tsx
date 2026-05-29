"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const SPORT_OPTIONS = [
  { value: "run", label: "Run" },
  { value: "ride", label: "Ride" },
  { value: "swim", label: "Swim" },
  { value: "walk", label: "Walk" },
  { value: "hike", label: "Hike" },
];

const SCORING_METHODS = [
  { value: "PERSONAL_IMPROVEMENT", label: "Personal Improvement", desc: "% improvement vs baseline period" },
  { value: "CATEGORY", label: "Category", desc: "Ranked by metric within age/sex groups" },
  { value: "AGE_GRADE", label: "Age Grade", desc: "% of world class for your age and sex" },
];

const METRICS = [
  { value: "distance", label: "Distance (longest activity)" },
  { value: "movingTime", label: "Time (fastest activity)" },
  { value: "pace", label: "Pace (fastest average)" },
];

export default function NewChallengePage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sportTypes, setSportTypes] = useState<string[]>(["run"]);
  const [method, setMethod] = useState("PERSONAL_IMPROVEMENT");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [metric, setMetric] = useState("distance");
  const [baselineWeeks, setBaselineWeeks] = useState(4);
  const [targetDistance, setTargetDistance] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSport(sport: string) {
    setSportTypes((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  }

  function buildConfig(): Record<string, unknown> {
    if (method === "AGE_GRADE") return { targetDistance, tolerance: 0.1 };
    return { metric, baselineWeeks };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sportTypes.length === 0) { setError("Select at least one sport."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/coach/groups/${groupId}/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, sportTypes, scoringMethod: method, startDate, endDate, config: buildConfig() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Failed to create challenge."); setLoading(false); return; }
      router.push(`/coach/groups/${groupId}`);
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Link href={`/coach/groups/${groupId}`} className="text-sm text-gray-500 hover:text-gray-700">← Group</Link>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">New challenge</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <Input label="Challenge name" name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} placeholder="e.g. January 5K Time Trial" />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={400} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>

        {/* Sport types */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Sport types</p>
          <div className="flex flex-wrap gap-2">
            {SPORT_OPTIONS.map((s) => (
              <button key={s.value} type="button" onClick={() => toggleSport(s.value)}
                className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${sportTypes.includes(s.value) ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start date" name="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          <Input label="End date" name="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>

        {/* Scoring method */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Scoring method</p>
          {SCORING_METHODS.map((m) => (
            <label key={m.value} className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${method === m.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
              <input type="radio" name="method" value={m.value} checked={method === m.value} onChange={() => setMethod(m.value)} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">{m.label}</p>
                <p className="text-xs text-gray-500">{m.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Method-specific config */}
        {method !== "AGE_GRADE" && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Metric</label>
            <select value={metric} onChange={(e) => setMetric(e.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        )}
        {method === "PERSONAL_IMPROVEMENT" && (
          <Input label="Baseline period (weeks before start)" name="baselineWeeks" type="number" value={String(baselineWeeks)} onChange={(e) => setBaselineWeeks(Number(e.target.value))} min="1" max="52" />
        )}
        {method === "AGE_GRADE" && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Target distance</label>
            <select value={targetDistance} onChange={(e) => setTargetDistance(Number(e.target.value))} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value={1500}>1.5K</option>
              <option value={3000}>3K</option>
              <option value={5000}>5K</option>
              <option value={10000}>10K</option>
              <option value={21097}>Half Marathon</option>
              <option value={42195}>Marathon</option>
            </select>
            <p className="text-xs text-gray-500">Activities within ±10% of this distance count.</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">Create challenge</Button>
      </form>
    </div>
  );
}
