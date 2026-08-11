"use client";

import { useState } from "react";
import { getSchoolTypeDisplay } from "@/lib/mobile/presentation";

export interface SessionSchoolTableRow {
  row_id?: string;
  school_name: string;
  school_type: string | null;
  total_sessions: number;
  sessions_this_week: number;
  active_eas: number;
  active_days: number;
  avg_sessions_per_day_per_ea: number;
}

interface Props {
  schools: SessionSchoolTableRow[];
  title?: string;
  subtitle?: string;
  schoolColumnLabel?: string;
  activeEasLabel?: string;
}

type SortKey = "school_name" | "total_sessions" | "sessions_this_week" | "active_eas" | "avg_sessions_per_day_per_ea";

function SortIndicator({ active, sortAsc }: { active: boolean; sortAsc: boolean }) {
  if (!active) return <span className="text-slate-300 ml-0.5">↕</span>;
  return <span className="ml-0.5">{sortAsc ? "↑" : "↓"}</span>;
}

export function SessionsSchoolTable({
  schools,
  title = "School Session Summary",
  subtitle = `${schools.length} schools`,
  schoolColumnLabel = "School",
  activeEasLabel = "Active EAs",
}: Props) {
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

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
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
                {schoolColumnLabel}{" "}
                <SortIndicator active={sortKey === "school_name"} sortAsc={sortAsc} />
              </th>
              <th className="text-center py-2">Type</th>
              <th
                className="text-right py-2 cursor-pointer select-none"
                onClick={() => toggleSort("active_eas")}
              >
                {activeEasLabel}{" "}
                <SortIndicator active={sortKey === "active_eas"} sortAsc={sortAsc} />
              </th>
              <th
                className="text-right py-2 cursor-pointer select-none"
                onClick={() => toggleSort("total_sessions")}
              >
                Total <SortIndicator active={sortKey === "total_sessions"} sortAsc={sortAsc} />
              </th>
              <th
                className="text-right py-2 cursor-pointer select-none"
                onClick={() => toggleSort("sessions_this_week")}
              >
                This Week <SortIndicator active={sortKey === "sessions_this_week"} sortAsc={sortAsc} />
              </th>
              <th
                className="text-right py-2 cursor-pointer select-none"
                onClick={() => toggleSort("avg_sessions_per_day_per_ea")}
              >
                Avg/Day/EA <SortIndicator active={sortKey === "avg_sessions_per_day_per_ea"} sortAsc={sortAsc} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => {
              const schoolType = getSchoolTypeDisplay(s.school_type);
              const schoolTypeClass =
                schoolType.kind === "ecd"
                  ? "bg-purple-50 text-purple-600"
                  : schoolType.kind === "primary"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-slate-100 text-slate-600";

              return (
              <tr
                key={s.row_id ?? s.school_name}
                className="border-t border-slate-50 hover:bg-slate-50"
              >
                <td className="py-1.5 font-medium text-slate-800">{s.school_name}</td>
                <td className="py-1.5 text-center">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${schoolTypeClass}`}
                  >
                    {schoolType.label}
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
                      s.avg_sessions_per_day_per_ea >= 2.5
                        ? "text-green-600"
                        : s.avg_sessions_per_day_per_ea >= 1.5
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {s.avg_sessions_per_day_per_ea}
                  </span>
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
