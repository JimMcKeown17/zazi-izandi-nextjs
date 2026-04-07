"use client";

import { useState } from "react";
import {
  Copy,
  FastForward,
  Ghost,
  Pause,
  SkipForward,
  Scale,
  Info,
} from "lucide-react";
import type { GroupSummary } from "@/lib/pm/types";

interface Props {
  groups: GroupSummary[];
}

interface FlagType {
  key: keyof GroupSummary["flags"] | "unbalanced_groups";
  label: string;
  description: string;
  tooltip: string;
  icon: React.ReactNode;
  entityLabel: string;
  color: string;
  available: boolean;
}

const FLAG_TYPES: FlagType[] = [
  {
    key: "same_letter_group",
    label: "Same Letter Groups",
    description: "3+ groups at same letter (no differentiation)",
    tooltip: "Triggered when an EA has 3 or more letter-phase groups at the same progress position. This usually means the EA is not differentiating instruction between groups. Action: mentor should work with EA on group-specific pacing.",
    icon: <Copy className="h-4 w-4" />,
    entityLabel: "groups",
    color: "border-l-red-500",
    available: true,
  },
  {
    key: "moving_too_fast",
    label: "Moving Too Fast",
    description: ">70% transitions without letter review",
    tooltip: "Triggered when more than 70% of consecutive sessions introduce entirely new letters with no overlap from the previous session. Children need review/repetition to consolidate. Action: EA needs retraining on the review cycle — each session should revisit at least one letter from the prior session.",
    icon: <FastForward className="h-4 w-4" />,
    entityLabel: "groups",
    color: "border-l-orange-500",
    available: true,
  },
  {
    key: "ghost_group",
    label: "Ghost Groups",
    description: "No session in 5+ weekdays",
    tooltip: "Triggered when a group has not had any session logged in 5 or more weekdays (excluding school holidays). This is an attendance/activity issue. Action: check with EA and school whether the group still exists or if the EA is absent.",
    icon: <Ghost className="h-4 w-4" />,
    entityLabel: "groups",
    color: "border-l-purple-500",
    available: true,
  },
  {
    key: "stagnation",
    label: "Stagnation",
    description: "Same letter for 2+ weeks with 4+ sessions",
    tooltip: "Triggered when the maximum letter taught has not changed for 2+ weeks despite 4+ sessions in the recent period. The EA is running sessions but not progressing through the curriculum. Action: mentor should assess whether children need more time or if the EA is stuck.",
    icon: <Pause className="h-4 w-4" />,
    entityLabel: "groups",
    color: "border-l-amber-500",
    available: true,
  },
  {
    key: "curriculum_gaps",
    label: "Not Following Letter Order",
    description: "Letters skipped in prescribed sequence",
    tooltip: "Triggered when 2+ letters in the language-specific teaching sequence were never taught before the EA moved past them. Skipping letters means children miss foundational building blocks. Action: EA needs retraining on following the letter sequence.",
    icon: <SkipForward className="h-4 w-4" />,
    entityLabel: "groups",
    color: "border-l-blue-500",
    available: true,
  },
  {
    key: "unbalanced_groups",
    label: "Unbalanced Groups",
    description: "Min group sessions < 50% of max group sessions",
    tooltip: "Coming in a future phase. Will flag EAs whose groups have very uneven session counts.",
    icon: <Scale className="h-4 w-4" />,
    entityLabel: "EAs",
    color: "border-l-teal-500",
    available: false,
  },
];

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        onBlur={() => setOpen(false)}
        className="text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="More info"
      >
        <Info className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-800 text-white text-[10px] leading-relaxed rounded-lg shadow-lg">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </span>
  );
}

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
                <p className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                  {f.label} <InfoTooltip text={f.tooltip} />
                </p>
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
