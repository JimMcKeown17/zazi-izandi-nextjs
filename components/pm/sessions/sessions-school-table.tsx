"use client";

import { useState } from "react";
import type { SessionSchoolSummary } from "@/lib/pm/types";

interface Props {
  schools: SessionSchoolSummary[];
}

type SortKey = "school_name" | "total_sessions" | "sessions_this_week" | "active_eas" | "avg_sessions_per_day";

export function SessionsSchoolTable({ schools }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("total_sessions");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search
    ? schools.filter((s) =>
        s.school_name.toLowerCase().includes(search.toLowerCase())
      )
    : schools;

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
      setSortAsc(key === "school_name");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-slate-300 ml-0.5">↕</span>;
    return <span className="ml-0.5">{sortAsc ? "↑" : "↓"}</span>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">School Session Summary</p>
          <p className="text-xs text-slate-500">{schools.length} schools</p>
        </div>
        <input
          type="text"
          placeholder="Search school..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-xs border border-slate-200 rounded px-2 py-1 w-48"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-100">
              <th
                className="text-left py-2 cursor-pointer select-none"
                onClick={() => toggleSort("school_name")}
              >
                School <SortIcon col="school_name" />
              </th>
              <th className="text-center py-2">Type</th>
              <th
                className="text-right py-2 cursor-pointer select-none"
                onClick={() => toggleSort("active_eas")}
              >
                Active EAs <SortIcon col="active_eas" />
              </th>
              <th
                className="text-right py-2 cursor-pointer select-none"
                onClick={() => toggleSort("total_sessions")}
              >
                Total <SortIcon col="total_sessions" />
              </th>
              <th
                className="text-right py-2 cursor-pointer select-none"
                onClick={() => toggleSort("sessions_this_week")}
              >
                This Week <SortIcon col="sessions_this_week" />
              </th>
              <th
                className="text-right py-2 cursor-pointer select-none"
                onClick={() => toggleSort("avg_sessions_per_day")}
              >
                Avg/Day <SortIcon col="avg_sessions_per_day" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.school_name} className="border-t border-slate-50 hover:bg-slate-50">
                <td className="py-1.5 font-medium text-slate-800">{s.school_name}</td>
                <td className="py-1.5 text-center">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      s.school_type === "ECD"
                        ? "bg-purple-50 text-purple-600"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {s.school_type === "ECD" ? "ECD" : "Primary"}
                  </span>
                </td>
                <td className="py-1.5 text-right text-slate-600">{s.active_eas}</td>
                <td className="py-1.5 text-right font-medium text-slate-800">
                  {s.total_sessions.toLocaleString()}
                </td>
                <td className="py-1.5 text-right text-slate-600">{s.sessions_this_week}</td>
                <td className="py-1.5 text-right">
                  <span
                    className={`font-medium ${
                      s.avg_sessions_per_day >= 2.5
                        ? "text-green-600"
                        : s.avg_sessions_per_day >= 1.5
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {s.avg_sessions_per_day}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
