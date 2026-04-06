"use client";

import { useState } from "react";
import {
  Copy,
  FastForward,
  Pause,
  SkipForward,
} from "lucide-react";
import type { GroupSummary } from "@/lib/pm/types";

interface Props {
  groups: GroupSummary[];
  onSelectEA: (eaName: string | null) => void;
  selectedEA: string | null;
}

// Quality flags only (excludes ghost_group — that's an attendance issue)
const QUALITY_FLAGS = ["same_letter_group", "moving_too_fast", "stagnation", "curriculum_gaps"] as const;
type QualityFlagKey = typeof QUALITY_FLAGS[number];

const FLAG_ICONS: Record<QualityFlagKey, React.ReactNode> = {
  same_letter_group: <Copy className="h-3 w-3" />,
  moving_too_fast: <FastForward className="h-3 w-3" />,
  stagnation: <Pause className="h-3 w-3" />,
  curriculum_gaps: <SkipForward className="h-3 w-3" />,
};

const FLAG_COLORS: Record<QualityFlagKey, string> = {
  same_letter_group: "text-red-500",
  moving_too_fast: "text-orange-500",
  stagnation: "text-amber-500",
  curriculum_gaps: "text-blue-500",
};

const FLAG_ABBREVS: Record<QualityFlagKey, string> = {
  same_letter_group: "SL",
  moving_too_fast: "MF",
  stagnation: "ST",
  curriculum_gaps: "CG",
};

interface EASummary {
  eaName: string;
  school: string;
  totalGroups: number;
  flaggedGroups: number;
  pctFlagged: number;
  flagBreakdown: Record<QualityFlagKey, number>;
}

export function EAFlagSummary({ groups, onSelectEA, selectedEA }: Props) {
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");

  // Only consider letter-phase groups for quality flags
  const letterGroups = groups.filter((g) => g.phase === "letters");

  // Build EA summaries
  const eaMap = new Map<string, EASummary>();
  for (const g of letterGroups) {
    if (!g.ea_name) continue;
    let ea = eaMap.get(g.ea_name);
    if (!ea) {
      ea = {
        eaName: g.ea_name,
        school: g.program_name,
        totalGroups: 0,
        flaggedGroups: 0,
        pctFlagged: 0,
        flagBreakdown: { same_letter_group: 0, moving_too_fast: 0, stagnation: 0, curriculum_gaps: 0 },
      };
      eaMap.set(g.ea_name, ea);
    }
    ea.totalGroups += 1;

    let hasQualityFlag = false;
    for (const flag of QUALITY_FLAGS) {
      if (g.flags[flag]) {
        ea.flagBreakdown[flag] += 1;
        hasQualityFlag = true;
      }
    }
    if (hasQualityFlag) {
      ea.flaggedGroups += 1;
    }
  }

  // Compute percentages and sort
  const eaSummaries = Array.from(eaMap.values()).map((ea) => ({
    ...ea,
    pctFlagged: ea.totalGroups > 0 ? Math.round((ea.flaggedGroups / ea.totalGroups) * 100) : 0,
  }));

  // Filter
  const filtered = search
    ? eaSummaries.filter(
        (ea) =>
          ea.eaName.toLowerCase().includes(search.toLowerCase()) ||
          ea.school.toLowerCase().includes(search.toLowerCase())
      )
    : eaSummaries;

  // Sort by % flagged
  const sorted = [...filtered].sort((a, b) =>
    sortAsc ? a.pctFlagged - b.pctFlagged : b.pctFlagged - a.pctFlagged
  );

  // Only show EAs with at least 1 quality flag
  const flaggedEAs = sorted.filter((ea) => ea.flaggedGroups > 0);
  const cleanEAs = sorted.filter((ea) => ea.flaggedGroups === 0);

  function severityColor(pct: number): string {
    if (pct >= 50) return "text-red-600 bg-red-50";
    if (pct >= 25) return "text-amber-600 bg-amber-50";
    return "text-green-600 bg-green-50";
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">EA Quality Flag Summary</p>
          <p className="text-xs text-slate-500">
            {flaggedEAs.length} of {eaSummaries.length} EAs have quality-flagged groups
            {cleanEAs.length > 0 && ` — ${cleanEAs.length} clean`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search EA or school..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1 w-44"
          />
        </div>
      </div>

      {flaggedEAs.length === 0 ? (
        <div className="flex items-center justify-center h-20 text-sm text-green-600">
          No EAs with quality flags — excellent!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <p className="text-[10px] text-slate-400 mb-2">Click an EA to filter the flagged items table below</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                <th className="text-left py-2">EA</th>
                <th className="text-left py-2">School</th>
                <th className="text-center py-2">Groups</th>
                <th className="text-center py-2">Flagged</th>
                <th
                  className="text-center py-2 cursor-pointer select-none"
                  onClick={() => setSortAsc(!sortAsc)}
                >
                  % Flagged {sortAsc ? "↑" : "↓"}
                </th>
                <th className="text-center py-2">Flag Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {flaggedEAs.map((ea) => {
                const isSelected = selectedEA === ea.eaName;
                return (
                  <tr
                    key={ea.eaName}
                    onClick={() => onSelectEA(isSelected ? null : ea.eaName)}
                    className={`border-t border-slate-50 cursor-pointer transition-colors ${
                      isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-1.5 font-medium text-slate-800 max-w-[140px] truncate">
                      {ea.eaName}
                    </td>
                    <td className="py-1.5 text-slate-600 max-w-[140px] truncate">
                      {ea.school}
                    </td>
                    <td className="py-1.5 text-center text-slate-600">{ea.totalGroups}</td>
                    <td className="py-1.5 text-center font-medium text-red-600">
                      {ea.flaggedGroups}
                    </td>
                    <td className="py-1.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${severityColor(ea.pctFlagged)}`}
                      >
                        {ea.pctFlagged}%
                      </span>
                    </td>
                    <td className="py-1.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {QUALITY_FLAGS.map((flag) => {
                          const count = ea.flagBreakdown[flag];
                          if (count === 0) return null;
                          return (
                            <span
                              key={flag}
                              className={`flex items-center gap-0.5 ${FLAG_COLORS[flag]}`}
                              title={`${FLAG_ABBREVS[flag]}: ${count}`}
                            >
                              {FLAG_ICONS[flag]}
                              <span className="text-[10px] font-medium">{count}</span>
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
