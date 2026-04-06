"use client";

import { useState } from "react";
import type { GroupSummary } from "@/lib/pm/types";

interface Props {
  groups: GroupSummary[];
}

type FlagKey = keyof GroupSummary["flags"];

const FLAG_LABELS: Record<FlagKey, string> = {
  same_letter_group: "Same Letter Groups",
  moving_too_fast: "Moving Too Fast",
  ghost_group: "Ghost Groups",
  stagnation: "Stagnation",
  curriculum_gaps: "Curriculum Gaps",
};

const FLAG_COLORS: Record<FlagKey, string> = {
  same_letter_group: "bg-red-100 text-red-700",
  moving_too_fast: "bg-orange-100 text-orange-700",
  ghost_group: "bg-purple-100 text-purple-700",
  stagnation: "bg-amber-100 text-amber-700",
  curriculum_gaps: "bg-blue-100 text-blue-700",
};

interface FlaggedItem {
  group: GroupSummary;
  flagType: FlagKey;
}

export function FlaggedItemsTable({ groups }: Props) {
  const [filterType, setFilterType] = useState<FlagKey | "all">("all");
  const [search, setSearch] = useState("");

  // Build flat list of flagged items
  const flaggedItems: FlaggedItem[] = [];
  for (const g of groups) {
    for (const [key, value] of Object.entries(g.flags)) {
      if (value && key in FLAG_LABELS) {
        flaggedItems.push({ group: g, flagType: key as FlagKey });
      }
    }
  }

  const filtered = flaggedItems.filter((item) => {
    if (filterType !== "all" && item.flagType !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.group.program_name.toLowerCase().includes(q) ||
        item.group.ea_name.toLowerCase().includes(q) ||
        item.group.class_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const flagTypes: (FlagKey | "all")[] = ["all", ...Object.keys(FLAG_LABELS) as FlagKey[]];

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">Flagged Items</p>
          <p className="text-xs text-slate-500">
            {filtered.length} flags across {new Set(filtered.map((i) => `${i.group.program_name}-${i.group.class_name}`)).size} groups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FlagKey | "all")}
            className="text-xs border border-slate-200 rounded px-2 py-1"
          >
            {flagTypes.map((ft) => (
              <option key={ft} value={ft}>
                {ft === "all" ? "All Flag Types" : FLAG_LABELS[ft]}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1 w-44"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-slate-400">
          {flaggedItems.length === 0 ? "No active flags — great news!" : "No flags match your filter"}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                <th className="text-left py-2">Flag Type</th>
                <th className="text-left py-2">School</th>
                <th className="text-left py-2">EA</th>
                <th className="text-left py-2">Group</th>
                <th className="text-left py-2">Grade</th>
                <th className="text-center py-2">Letter</th>
                <th className="text-right py-2">Sess/Wk</th>
                <th className="text-left py-2">Last Session</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                  <td className="py-1.5">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${FLAG_COLORS[item.flagType]}`}
                    >
                      {FLAG_LABELS[item.flagType]}
                    </span>
                  </td>
                  <td className="py-1.5 text-slate-800 max-w-[140px] truncate">
                    {item.group.program_name}
                  </td>
                  <td className="py-1.5 text-slate-600 max-w-[100px] truncate">
                    {item.group.ea_name}
                  </td>
                  <td className="py-1.5 text-slate-600 max-w-[100px] truncate">
                    {item.group.class_name}
                  </td>
                  <td className="py-1.5 text-slate-600">{item.group.grade || "—"}</td>
                  <td className="py-1.5 text-center font-mono font-medium">
                    {item.group.current_letter ? item.group.current_letter.toUpperCase() : "—"}
                  </td>
                  <td className="py-1.5 text-right">
                    <span
                      className={`font-medium ${
                        item.group.avg_sessions_per_week >= 3
                          ? "text-green-600"
                          : item.group.avg_sessions_per_week >= 2
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}
                    >
                      {item.group.avg_sessions_per_week.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-1.5 text-slate-500">
                    {item.group.last_session_date
                      ? new Date(item.group.last_session_date).toLocaleDateString("en-ZA", {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
