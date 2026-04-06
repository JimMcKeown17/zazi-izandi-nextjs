"use client";

import { useState } from "react";
import type { GroupSummary } from "@/lib/pm/types";

interface Props {
  groups: GroupSummary[];
}

type SortKey =
  | "program_name"
  | "ea_name"
  | "class_name"
  | "grade"
  | "progress_pct"
  | "avg_sessions_per_week"
  | "total_sessions";

export function GroupDetailTable({ groups }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("progress_pct");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = groups.filter((g) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        g.program_name.toLowerCase().includes(q) ||
        g.ea_name.toLowerCase().includes(q) ||
        g.class_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(key === "program_name" || key === "ea_name" || key === "class_name");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-slate-300 ml-0.5">↕</span>;
    return <span className="ml-0.5">{sortAsc ? "↑" : "↓"}</span>;
  }

  const flagCount = (g: GroupSummary) =>
    [g.flags.same_letter_group, g.flags.moving_too_fast, g.flags.ghost_group, g.flags.stagnation, g.flags.curriculum_gaps].filter(Boolean).length;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">Group Detail Table</p>
          <p className="text-xs text-slate-500">
            {filtered.length} of {groups.length} groups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1 w-44"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-100">
              <th className="text-left py-2 cursor-pointer select-none" onClick={() => toggleSort("program_name")}>
                School <SortIcon col="program_name" />
              </th>
              <th className="text-left py-2 cursor-pointer select-none" onClick={() => toggleSort("ea_name")}>
                EA <SortIcon col="ea_name" />
              </th>
              <th className="text-left py-2 cursor-pointer select-none" onClick={() => toggleSort("class_name")}>
                Group <SortIcon col="class_name" />
              </th>
              <th className="text-left py-2 cursor-pointer select-none" onClick={() => toggleSort("grade")}>
                Grade <SortIcon col="grade" />
              </th>
              <th className="text-center py-2">Letter</th>
              <th className="text-right py-2 cursor-pointer select-none" onClick={() => toggleSort("progress_pct")}>
                Progress <SortIcon col="progress_pct" />
              </th>
              <th className="text-right py-2 cursor-pointer select-none" onClick={() => toggleSort("avg_sessions_per_week")}>
                Sess/Wk <SortIcon col="avg_sessions_per_week" />
              </th>
              <th className="text-right py-2 cursor-pointer select-none" onClick={() => toggleSort("total_sessions")}>
                Total <SortIcon col="total_sessions" />
              </th>
              <th className="text-center py-2">Flags</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((g) => {
              const flags = flagCount(g);
              return (
                <tr
                  key={`${g.program_name}-${g.class_name}`}
                  className="border-t border-slate-50 hover:bg-slate-50"
                >
                  <td className="py-1.5 text-slate-800 max-w-[140px] truncate">{g.program_name}</td>
                  <td className="py-1.5 text-slate-600 max-w-[100px] truncate">{g.ea_name}</td>
                  <td className="py-1.5 text-slate-600 max-w-[100px] truncate">{g.class_name}</td>
                  <td className="py-1.5 text-slate-600">{g.grade || "—"}</td>
                  <td className="py-1.5 text-center font-mono font-medium">
                    {g.current_letter ? g.current_letter.toUpperCase() : "—"}
                  </td>
                  <td className="py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <div className="w-16 bg-slate-100 rounded-full h-2">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${g.progress_pct}%` }}
                        />
                      </div>
                      <span className="text-slate-600 w-8 text-right">
                        {Math.round(g.progress_pct)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-1.5 text-right font-medium">
                    <span
                      className={
                        g.avg_sessions_per_week >= 3
                          ? "text-green-600"
                          : g.avg_sessions_per_week >= 2
                          ? "text-amber-600"
                          : "text-red-600"
                      }
                    >
                      {g.avg_sessions_per_week.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-1.5 text-right text-slate-600">{g.total_sessions}</td>
                  <td className="py-1.5 text-center">
                    {flags > 0 ? (
                      <span className="inline-block min-w-[18px] px-1 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">
                        {flags}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
