"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/Button";

interface ReferenceRow {
  id: string;
  sportType: string;
  gender: string;
  age: number;
  distanceKm: number;
  paceMinPerKm: number;
}

interface ReferenceTableModalProps {
  sportType: string;
  distanceKm: number;
  tolerancePercent: number;
  isOpen: boolean;
  onClose: () => void;
}

function formatPace(paceMinPerKm: number): string {
  const totalSeconds = Math.round(paceMinPerKm * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function ReferenceTableModal({
  sportType,
  distanceKm,
  tolerancePercent,
  isOpen,
  onClose,
}: ReferenceTableModalProps) {
  const [gender, setGender] = useState<"M" | "F">("M");

  const { data: rows, isLoading } = useQuery<ReferenceRow[]>({
    queryKey: ["reference-pace", sportType, distanceKm, gender],
    queryFn: async () => {
      const res = await fetch(
        `/api/challenges/reference-pace?sportType=${sportType}&distanceKm=${distanceKm}&gender=${gender}`
      );
      if (!res.ok) throw new Error("Failed to load reference pace");
      return res.json();
    },
    enabled: isOpen,
    staleTime: Infinity,
  });

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">טבלת ערכים וניקוד</h2>
          <p className="mt-1 text-sm text-gray-600">
            {distanceKm} ק״מ — טווח סבלנות {tolerancePercent}%
          </p>
        </div>

        <div className="px-5 py-4">
          <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm leading-relaxed text-gray-700">
            <p className="font-semibold text-gray-900">איך מחושב הניקוד?</p>
            <p>הריצה שלך נמדדת מול הקצב הממוצע לגיל ולמגדר שלך.</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                🟢 בטווח — 100
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                🔵 מהיר יותר — 100
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                🔴 איטי מדי — פחות
              </span>
            </div>
          </div>

          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setGender("M")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                gender === "M"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              גברים
            </button>
            <button
              onClick={() => setGender("F")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                gender === "F"
                  ? "bg-pink-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              נשים
            </button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-gray-500">טוען...</div>
          ) : (
            <div className="max-h-[45vh] overflow-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 text-xs font-semibold text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-center">גיל</th>
                    <th className="px-3 py-2 text-center">ממוצע</th>
                    <th className="bg-green-50 px-3 py-2 text-center text-green-800">
                      טווח מלא
                    </th>
                    <th className="bg-red-50 px-3 py-2 text-center text-red-800">
                      מתחת
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows?.map((row) => {
                    const tolerancePace =
                      row.paceMinPerKm * (1 + tolerancePercent / 100);
                    return (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-center font-medium text-gray-900">
                          {row.age}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700">
                          {formatPace(row.paceMinPerKm)}
                        </td>
                        <td className="bg-green-50/50 px-3 py-2 text-center text-green-800">
                          עד {formatPace(tolerancePace)}
                        </td>
                        <td className="bg-red-50/50 px-3 py-2 text-center text-red-700">
                          מעל {formatPace(tolerancePace)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-4">
          <Button onClick={onClose} className="w-full">
            סגור
          </Button>
        </div>
      </div>
    </div>
  );
}
