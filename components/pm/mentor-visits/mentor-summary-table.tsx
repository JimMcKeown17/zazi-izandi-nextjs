"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { MentorRow } from "@/lib/pm/types";

interface MentorSummaryTableProps {
  data: MentorRow[];
}

type SortKey = "mentor" | "visits" | "schools_visited" | "avg_quality_score";

function qualityLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 3.5) return `${score.toFixed(1)} (Excellent)`;
  if (score >= 2.5) return `${score.toFixed(1)} (Good)`;
  if (score >= 1.5) return `${score.toFixed(1)} (Average)`;
  return `${score.toFixed(1)} (Poor)`;
}

function qualityColor(score: number | null): string {
  if (score === null) return "text-slate-400";
  if (score >= 3.5) return "text-green-600";
  if (score >= 2.5) return "text-blue-600";
  if (score >= 1.5) return "text-amber-600";
  return "text-red-600";
}

export function MentorSummaryTable({ data }: MentorSummaryTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("visits");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortKey] ?? -1;
    const bVal = b[sortKey] ?? -1;
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) { setSortAsc(!sortAsc); }
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <p className="text-sm font-semibold text-slate-800 mb-3">Mentor Summary</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {([
                { key: "mentor" as SortKey, label: "Mentor" },
                { key: "visits" as SortKey, label: "Visits" },
                { key: "schools_visited" as SortKey, label: "Schools" },
                { key: "avg_quality_score" as SortKey, label: "Avg Quality" },
              ]).map(({ key, label }) => (
                <th key={key} onClick={() => toggleSort(key)}
                  className="text-left py-2 px-3 font-semibold text-slate-600 cursor-pointer hover:text-slate-900"
                >
                  {label} <SortIcon col={key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.mentor} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-3 font-medium text-slate-800">{row.mentor}</td>
                <td className="py-2 px-3 text-slate-600">{row.visits}</td>
                <td className="py-2 px-3 text-slate-600">{row.schools_visited}</td>
                <td className={`py-2 px-3 font-medium ${qualityColor(row.avg_quality_score)}`}>
                  {qualityLabel(row.avg_quality_score)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
