"use client";

import {
  Copy,
  FastForward,
  Ghost,
  Pause,
  SkipForward,
  Scale,
} from "lucide-react";
import type { GroupSummary } from "@/lib/pm/types";

interface Props {
  groups: GroupSummary[];
}

interface FlagType {
  key: keyof GroupSummary["flags"] | "unbalanced_groups";
  label: string;
  description: string;
  icon: React.ReactNode;
  entityLabel: string; // "groups" or "EAs"
  color: string;
  available: boolean; // whether the API provides this flag
}

const FLAG_TYPES: FlagType[] = [
  {
    key: "same_letter_group",
    label: "Same Letter Groups",
    description: "3+ groups at same letter (no differentiation)",
    icon: <Copy className="h-4 w-4" />,
    entityLabel: "groups",
    color: "border-l-red-500",
    available: true,
  },
  {
    key: "moving_too_fast",
    label: "Moving Too Fast",
    description: ">70% transitions without letter review",
    icon: <FastForward className="h-4 w-4" />,
    entityLabel: "groups",
    color: "border-l-orange-500",
    available: true,
  },
  {
    key: "ghost_group",
    label: "Ghost Groups",
    description: "No session in 5+ weekdays",
    icon: <Ghost className="h-4 w-4" />,
    entityLabel: "groups",
    color: "border-l-purple-500",
    available: true,
  },
  {
    key: "stagnation",
    label: "Stagnation",
    description: "Same letter for 2+ weeks with 4+ sessions",
    icon: <Pause className="h-4 w-4" />,
    entityLabel: "groups",
    color: "border-l-amber-500",
    available: true,
  },
  {
    key: "curriculum_gaps",
    label: "Curriculum Gaps",
    description: "Letters skipped in prescribed sequence",
    icon: <SkipForward className="h-4 w-4" />,
    entityLabel: "groups",
    color: "border-l-blue-500",
    available: true,
  },
  {
    key: "unbalanced_groups",
    label: "Unbalanced Groups",
    description: "Min group sessions < 50% of max group sessions",
    icon: <Scale className="h-4 w-4" />,
    entityLabel: "EAs",
    color: "border-l-teal-500",
    available: false, // Not yet in API — coming in future phase
  },
];

export function FlagSummaryCards({ groups }: Props) {
  // Count flagged groups for each flag type
  const flagCounts = FLAG_TYPES.map((ft) => {
    if (!ft.available) {
      return { ...ft, count: 0, total: groups.length, pct: 0 };
    }
    const flagKey = ft.key as keyof GroupSummary["flags"];
    const count = groups.filter((g) => g.flags[flagKey]).length;
    const total = groups.length;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return { ...ft, count, total, pct };
  });

  const totalFlags = flagCounts.reduce((sum, f) => sum + f.count, 0);

  return (
    <div className="space-y-4">
      {/* Total flags KPI */}
      <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-l-red-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Active Flags</p>
            <p className="text-2xl font-bold text-slate-900">{totalFlags}</p>
            <p className="text-xs text-slate-500">
              across {groups.length} groups
            </p>
          </div>
          <div className="text-xs text-slate-400 text-right">
            <p>Flag lifecycle tracking</p>
            <p className="text-amber-600 font-medium">Coming in Phase 4</p>
          </div>
        </div>
      </div>

      {/* Flag type cards — 2 rows of 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {flagCounts.map((f) => (
          <div
            key={f.key}
            className={`bg-white rounded-lg shadow-sm p-3 border-l-4 ${f.color}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">{f.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800">{f.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{f.description}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className={`text-lg font-bold ${f.count > 0 ? "text-red-600" : "text-green-600"}`}>
                    {f.count}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {f.entityLabel} ({f.pct}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
