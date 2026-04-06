"use client";

import { useState } from "react";
import type { EAHeatmapRow } from "@/lib/pm/types";

interface Props {
  dates: string[];
  eas: EAHeatmapRow[];
}

function cellColor(count: number): string {
  if (count === 0) return "bg-slate-100";
  if (count === 1) return "bg-green-100";
  if (count === 2) return "bg-green-300";
  if (count === 3) return "bg-green-500";
  if (count === 4) return "bg-green-600";
  return "bg-green-700"; // 5+
}

function cellTextColor(count: number): string {
  if (count <= 2) return "text-slate-700";
  return "text-white";
}

function formatDate(dateStr: string): string {
  // Parse as local date to avoid UTC timezone shift (YYYY-MM-DD → wrong day in non-UTC zones)
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric" });
}

export function EAHeatmap({ dates, eas }: Props) {
  const [search, setSearch] = useState("");

  // Reverse dates so most recent is on the left
  const reversedDates = [...dates].reverse();

  const searchFiltered = search
    ? eas.filter(
        (ea) =>
          ea.ea_name.toLowerCase().includes(search.toLowerCase()) ||
          ea.school.toLowerCase().includes(search.toLowerCase())
      )
    : eas;

  // Sort by total sessions descending
  const filtered = [...searchFiltered].sort((a, b) => {
    const totalA = a.cells.reduce((s, c) => s + c, 0);
    const totalB = b.cells.reduce((s, c) => s + c, 0);
    return totalB - totalA;
  });

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">EA Activity Heatmap</p>
          <p className="text-xs text-slate-500">Sessions per day — last 10 weekdays</p>
        </div>
        <input
          type="text"
          placeholder="Search EA or school..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-xs border border-slate-200 rounded px-2 py-1 w-48"
        />
      </div>

      {eas.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-slate-400">
          No EA data available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="text-left py-1 pr-2 font-medium min-w-[140px]">EA</th>
                <th className="text-left py-1 pr-2 font-medium min-w-[120px]">School</th>
                {reversedDates.map((d) => (
                  <th key={d} className="text-center py-1 px-1 font-medium min-w-[40px]">
                    {formatDate(d)}
                  </th>
                ))}
                <th className="text-center py-1 pl-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ea) => {
                const total = ea.cells.reduce((a, b) => a + b, 0);
                const reversedCells = [...ea.cells].reverse();
                return (
                  <tr key={ea.ea_name} className="border-t border-slate-50">
                    <td className="py-1 pr-2 font-medium text-slate-800 truncate max-w-[140px]">
                      {ea.ea_name}
                    </td>
                    <td className="py-1 pr-2 text-slate-500 truncate max-w-[120px]">
                      {ea.school}
                    </td>
                    {reversedCells.map((count, i) => (
                      <td key={i} className="py-1 px-1 text-center">
                        <span
                          className={`inline-block w-7 h-6 rounded text-[10px] leading-6 font-medium ${cellColor(count)} ${cellTextColor(count)}`}
                        >
                          {count}
                        </span>
                      </td>
                    ))}
                    <td className="py-1 pl-2 text-center font-semibold text-slate-800">
                      {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
        <span>Sessions:</span>
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`inline-block w-5 h-4 rounded text-center leading-4 ${cellColor(n)} ${cellTextColor(n)}`}
          >
            {n === 5 ? "5+" : n}
          </span>
        ))}
      </div>
    </div>
  );
}
