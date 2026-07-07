"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/useTranslation";
import { MetricType } from "@prisma/client";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import MetricChart from "@/components/metrics/MetricChart";

interface UserMetric {
  id: string;
  type: MetricType;
  date: string;
  value: number;
  unit: string | null;
  notes: string | null;
  source: string;
  createdAt: string;
}

const METRIC_ORDER: MetricType[] = [
  MetricType.VO2MAX,
  MetricType.FTP,
  MetricType.WEIGHT,
  MetricType.BODY_FAT,
  MetricType.RESTING_HEART_RATE,
  MetricType.SLEEP_SCORE,
  MetricType.RECOVERY_SCORE,
];

const METRIC_COLORS: Record<MetricType, string> = {
  [MetricType.VO2MAX]: "#8B5CF6",
  [MetricType.FTP]: "#F59E0B",
  [MetricType.WEIGHT]: "#3B82F6",
  [MetricType.BODY_FAT]: "#EC4899",
  [MetricType.RESTING_HEART_RATE]: "#EF4444",
  [MetricType.SLEEP_SCORE]: "#10B981",
  [MetricType.RECOVERY_SCORE]: "#06B6D4",
};

export default function MetricsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [type, setType] = useState<MetricType>(MetricType.WEIGHT);
  const [graphType, setGraphType] = useState<MetricType>(MetricType.WEIGHT);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: metrics, isLoading } = useQuery<UserMetric[]>({
    queryKey: ["athlete", "metrics"],
    queryFn: async () => {
      const res = await fetch("/api/athlete/metrics");
      if (!res.ok) throw new Error("Failed to load metrics");
      return res.json();
    },
  });

  const saveMetric = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/athlete/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, date, value: Number(value), notes: notes || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save metric");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete", "metrics"] });
      setValue("");
      setNotes("");
      setFormMessage({ type: "success", text: t("metrics.saveSuccess") });
      setTimeout(() => setFormMessage(null), 3000);
    },
    onError: (err: Error) => {
      setFormMessage({ type: "error", text: err.message });
      setTimeout(() => setFormMessage(null), 3000);
    },
  });

  const deleteMetric = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/athlete/metrics/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete metric");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete", "metrics"] });
    },
  });

  const groupedMetrics = useMemo(() => {
    if (!metrics) return [];
    const map = new Map<MetricType, UserMetric[]>();
    for (const metric of metrics) {
      const list = map.get(metric.type) ?? [];
      list.push(metric);
      map.set(metric.type, list);
    }
    return METRIC_ORDER.map((metricType) => ({
      type: metricType,
      items: map.get(metricType) ?? [],
    })).filter((group) => group.items.length > 0);
  }, [metrics]);

  const graphData = useMemo(() => {
    if (!metrics) return [];
    return metrics
      .filter((m) => m.type === graphType)
      .map((m) => ({ date: m.date, value: m.value }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [metrics, graphType]);

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("he-IL");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value || Number.isNaN(Number(value))) return;
    saveMetric.mutate();
  }

  const metricOptions = METRIC_ORDER.map((metricType) => ({
    value: metricType,
    label: t(`metrics.types.${metricType}`),
    unit: t(`metrics.units.${metricType}`),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t("metrics.title")}</h1>
      <p className="text-sm text-gray-500">{t("metrics.subtitle")}</p>

      {/* Trend graph */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t("metrics.trend")}</h2>
          <select
            value={graphType}
            onChange={(e) => setGraphType(e.target.value as MetricType)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {metricOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : graphData.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">{t("metrics.noGraphData")}</p>
        ) : graphData.length === 1 ? (
          <p className="py-6 text-center text-sm text-gray-500">{t("metrics.needMoreData")}</p>
        ) : (
          <MetricChart
            data={graphData}
            unit={t(`metrics.units.${graphType}`)}
            color={METRIC_COLORS[graphType]}
          />
        )}
      </div>

      {/* Entry form */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">{t("metrics.addNew")}</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("metrics.type")}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MetricType)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {metricOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.unit})
                </option>
              ))}
            </select>
          </div>

          <Input
            label={t("metrics.date")}
            name="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <Input
            label={`${t("metrics.value")} (${t(`metrics.units.${type}`)})`}
            name="value"
            type="number"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("metrics.valuePlaceholder")}
            required
          />

          <Input
            label={t("metrics.notes")}
            name="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("metrics.notesPlaceholder")}
          />

          <Button type="submit" loading={saveMetric.isPending} className="w-full">
            {saveMetric.isPending ? t("metrics.saving") : t("metrics.save")}
          </Button>

          {formMessage && (
            <p className={`text-sm ${formMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {formMessage.text}
            </p>
          )}
        </form>
      </div>

      {/* History */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">{t("metrics.history")}</h2>

        {isLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <LoadingSpinner size="sm" />
            <span>{t("common.loading")}</span>
          </div>
        ) : groupedMetrics.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">{t("metrics.empty")}</p>
        ) : (
          <div className="mt-4 space-y-5">
            {groupedMetrics.map((group) => (
              <div key={group.type}>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">
                  {t(`metrics.types.${group.type}`)} ({t(`metrics.units.${group.type}`)})
                </h3>
                <div className="space-y-2">
                  {group.items.map((metric) => (
                    <div
                      key={metric.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {metric.value} {metric.unit ?? t(`metrics.units.${metric.type}`)}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(metric.date)}</p>
                        {metric.notes && <p className="mt-1 text-xs text-gray-600">{metric.notes}</p>}
                      </div>
                      <button
                        onClick={() => deleteMetric.mutate(metric.id)}
                        disabled={deleteMetric.isPending}
                        className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        {t("common.delete")}
                    </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
